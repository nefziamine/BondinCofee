package com.example.backend.controller;

import com.example.backend.model.User;
import com.example.backend.repository.UserRepository;
import com.example.backend.util.JwtUserIdExtractor;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Authoritative server-side pointage flow.
 *
 * <p>The frontend keeps a localStorage view of the per-day record for visual
 * history, but the canonical counters that drive HR decisions —
 * {@link User#getNbRetards()} and {@link User#getCongeRestant()} — live in the
 * database and are mutated here.</p>
 *
 * <p>Rules enforced:</p>
 * <ul>
 *     <li>Clock-in / clock-out are only accepted between 08:00 and 20:00 local.</li>
 *     <li>Any clock-in after 08:30 is automatically tagged as a "retard" and
 *         increments {@code nbRetards} by one.</li>
 *     <li>Every {@value #RETARDS_PER_LEAVE_DEDUCTION} retards costs the employee
 *         one day of leave balance (deducted atomically the moment the
 *         counter reaches a multiple of the threshold).</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/pointage")
@CrossOrigin(origins = "*")
public class PointageController {

    private static final LocalTime WINDOW_START   = LocalTime.of(8, 0);
    private static final LocalTime WINDOW_END     = LocalTime.of(20, 0);
    private static final LocalTime RETARD_AFTER   = LocalTime.of(8, 30);
    private static final int RETARDS_PER_LEAVE_DEDUCTION = 5;

    private final UserRepository userRepository;

    public PointageController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @PostMapping("/clock-in")
    public ResponseEntity<?> clockIn(HttpServletRequest request) {
        Long userId = JwtUserIdExtractor.extractUserId(request.getHeader("Authorization"));
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }
        return registerClockIn(user);
    }

    /**
     * Returns the canonical pointage counters for the calling user. The
     * frontend uses this on dashboard load to align its sidebar with the DB.
     */
    @GetMapping("/state")
    public ResponseEntity<?> state(HttpServletRequest request) {
        Long userId = JwtUserIdExtractor.extractUserId(request.getHeader("Authorization"));
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }
        int retards = user.getNbRetards() == null ? 0 : user.getNbRetards();
        int conge = user.getCongeRestant() == null ? 0 : user.getCongeRestant();
        int remainder = retards % RETARDS_PER_LEAVE_DEDUCTION;
        int before = remainder == 0 && retards > 0 ? RETARDS_PER_LEAVE_DEDUCTION : RETARDS_PER_LEAVE_DEDUCTION - remainder;
        Map<String, Object> body = new HashMap<>();
        body.put("nbRetards", retards);
        body.put("congeRestant", conge);
        body.put("retardsBeforeNextDeduction", before);
        body.put("retardsPerDeduction", RETARDS_PER_LEAVE_DEDUCTION);
        body.put("leaveDaysAlreadyDeducted", retards / RETARDS_PER_LEAVE_DEDUCTION);
        return ResponseEntity.ok(body);
    }

    /**
     * Backfills the canonical counters when the frontend has more retards in
     * its local pointage history than the DB has on file (typical case: retards
     * that were captured before the server-side flow existed). Only ever
     * increases {@code nbRetards}; never lowers it — the DB is authoritative
     * for the lower bound.
     */
    @PostMapping("/reconcile")
    public ResponseEntity<?> reconcile(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        Long userId = JwtUserIdExtractor.extractUserId(request.getHeader("Authorization"));
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }
        Object raw = payload == null ? null : payload.get("totalRetards");
        int reportedTotal;
        try { reportedTotal = raw == null ? 0 : Integer.parseInt(String.valueOf(raw)); }
        catch (NumberFormatException ex) { reportedTotal = 0; }
        if (reportedTotal < 0) reportedTotal = 0;

        int prevRetards = user.getNbRetards()    == null ? 0 : user.getNbRetards();
        int conge       = user.getCongeRestant() == null ? 0 : user.getCongeRestant();
        int daysDeducted = 0;

        if (reportedTotal > prevRetards) {
            for (int r = prevRetards + 1; r <= reportedTotal; r++) {
                if (r % RETARDS_PER_LEAVE_DEDUCTION == 0 && conge > 0) {
                    conge--;
                    daysDeducted++;
                }
            }
            user.setNbRetards(reportedTotal);
            user.setCongeRestant(conge);
            userRepository.save(user);
        }

        int currentRetards = user.getNbRetards() == null ? 0 : user.getNbRetards();
        int remainder = currentRetards % RETARDS_PER_LEAVE_DEDUCTION;
        int before = remainder == 0 && currentRetards > 0
                ? RETARDS_PER_LEAVE_DEDUCTION : RETARDS_PER_LEAVE_DEDUCTION - remainder;

        Map<String, Object> body = new HashMap<>();
        body.put("nbRetards", currentRetards);
        body.put("congeRestant", conge);
        body.put("leaveDaysDeducted", daysDeducted);
        body.put("retardsBeforeNextDeduction", before);
        body.put("retardsPerDeduction", RETARDS_PER_LEAVE_DEDUCTION);
        return ResponseEntity.ok(body);
    }

    @PostMapping("/clock-out")
    public ResponseEntity<?> clockOut(HttpServletRequest request) {
        Long userId = JwtUserIdExtractor.extractUserId(request.getHeader("Authorization"));
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        // Clock-out doesn't move counters but must respect the same window.
        LocalTime nowTime = LocalDateTime.now().toLocalTime();
        if (!isWithinWindow(nowTime)) {
            return ResponseEntity.status(422).body(Map.of(
                    "message", "Pointage closed (allowed 08:00–20:00).",
                    "windowOpen", false
            ));
        }
        return ResponseEntity.ok(Map.of(
                "time", String.format("%02d:%02d", nowTime.getHour(), nowTime.getMinute()),
                "windowOpen", true
        ));
    }

    /** Returns the live thresholds so the frontend can stay aligned without duplication. */
    @GetMapping("/policy")
    public Map<String, Object> policy() {
        return Map.of(
                "windowStart", WINDOW_START.toString(),
                "windowEnd",   WINDOW_END.toString(),
                "retardAfter", RETARD_AFTER.toString(),
                "retardsPerLeaveDeduction", RETARDS_PER_LEAVE_DEDUCTION
        );
    }

    /* ------------------------------------------------------------------ */

    private ResponseEntity<?> registerClockIn(User user) {
        LocalDateTime now = LocalDateTime.now();
        LocalTime nowTime = now.toLocalTime();

        if (!isWithinWindow(nowTime)) {
            return ResponseEntity.status(422).body(Map.of(
                    "message", "Pointage closed (allowed 08:00–20:00).",
                    "windowOpen", false
            ));
        }

        boolean late = nowTime.isAfter(RETARD_AFTER);
        int previousRetards = user.getNbRetards() == null ? 0 : user.getNbRetards();
        int currentRetards  = previousRetards;
        int congeRestant    = user.getCongeRestant() == null ? 0 : user.getCongeRestant();
        boolean leaveDeducted = false;

        if (late) {
            currentRetards = previousRetards + 1;
            user.setNbRetards(currentRetards);
            if (currentRetards % RETARDS_PER_LEAVE_DEDUCTION == 0) {
                congeRestant = Math.max(0, congeRestant - 1);
                user.setCongeRestant(congeRestant);
                leaveDeducted = true;
            }
            userRepository.save(user);
        }

        int remainder = currentRetards % RETARDS_PER_LEAVE_DEDUCTION;
        int retardsUntilDeduction = remainder == 0 && currentRetards > 0
                ? RETARDS_PER_LEAVE_DEDUCTION
                : RETARDS_PER_LEAVE_DEDUCTION - remainder;

        Map<String, Object> body = new HashMap<>();
        body.put("status", late ? "retard" : "present");
        body.put("time", String.format("%02d:%02d", now.getHour(), now.getMinute()));
        body.put("late", late);
        body.put("nbRetards", currentRetards);
        body.put("congeRestant", congeRestant);
        body.put("leaveDeducted", leaveDeducted);
        body.put("retardsUntilDeduction", retardsUntilDeduction);
        body.put("retardsPerDeduction", RETARDS_PER_LEAVE_DEDUCTION);
        body.put("windowOpen", true);
        return ResponseEntity.ok(body);
    }

    private static boolean isWithinWindow(LocalTime t) {
        return !t.isBefore(WINDOW_START) && t.isBefore(WINDOW_END);
    }
}
