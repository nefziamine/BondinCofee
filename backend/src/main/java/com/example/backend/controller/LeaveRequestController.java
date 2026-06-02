package com.example.backend.controller;

import com.example.backend.model.LeaveRequest;
import com.example.backend.model.Message;
import com.example.backend.model.User;
import com.example.backend.repository.LeaveRequestRepository;
import com.example.backend.repository.MessageRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.util.JwtUserIdExtractor;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/leave")
@CrossOrigin(origins = "*")
public class LeaveRequestController {

    private final LeaveRequestRepository leaveRequestRepository;
    private final UserRepository userRepository;
    private final MessageRepository messageRepository;

    public LeaveRequestController(LeaveRequestRepository leaveRequestRepository, 
                                  UserRepository userRepository,
                                  MessageRepository messageRepository) {
        this.leaveRequestRepository = leaveRequestRepository;
        this.userRepository = userRepository;
        this.messageRepository = messageRepository;
    }

    @PostMapping("/request")
    public ResponseEntity<?> requestLeave(@RequestBody LeaveRequest leaveRequest, HttpServletRequest request) {
        Long userId = JwtUserIdExtractor.extractUserId(request.getHeader("Authorization"));
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return ResponseEntity.status(404).body(Map.of("message", "User not found"));

        leaveRequest.setUserId(userId);
        leaveRequest.setUserName(user.getNomUtilisateur());
        leaveRequest.setStatus("pending");
        
        return ResponseEntity.ok(leaveRequestRepository.save(leaveRequest));
    }

    @GetMapping("/my")
    public ResponseEntity<?> getMyLeaves(HttpServletRequest request) {
        Long userId = JwtUserIdExtractor.extractUserId(request.getHeader("Authorization"));
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        return ResponseEntity.ok(leaveRequestRepository.findByUserId(userId));
    }

    @GetMapping("/all")
    public ResponseEntity<?> getAllLeaves(HttpServletRequest request) {
        Long userId = JwtUserIdExtractor.extractUserId(request.getHeader("Authorization"));
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || (!"RH".equalsIgnoreCase(user.getRole()) && !"ADMIN".equalsIgnoreCase(user.getRole()))) {
            return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));
        }

        return ResponseEntity.ok(leaveRequestRepository.findAll());
    }

    @PostMapping("/approve/{id}")
    public ResponseEntity<?> approveLeave(@PathVariable Long id, HttpServletRequest request) {
        Long adminId = JwtUserIdExtractor.extractUserId(request.getHeader("Authorization"));
        if (adminId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        
        User admin = userRepository.findById(adminId).orElse(null);
        if (admin == null || (!"RH".equalsIgnoreCase(admin.getRole()) && !"ADMIN".equalsIgnoreCase(admin.getRole()))) {
            return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));
        }

        return leaveRequestRepository.findById(id).map(leave -> {
            if (!"pending".equals(leave.getStatus())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Leave is already " + leave.getStatus()));
            }

            User employee = userRepository.findById(leave.getUserId()).orElse(null);
            if (employee != null) {
                long days = ChronoUnit.DAYS.between(leave.getStartDate(), leave.getEndDate()) + 1;
                int currentBalance = employee.getCongeRestant() == null ? 0 : employee.getCongeRestant();
                employee.setCongeRestant(Math.max(0, (int) (currentBalance - days)));
                userRepository.save(employee);
            }

            leave.setStatus("approved");
            leaveRequestRepository.save(leave);

            return ResponseEntity.ok(Map.of("message", "Approved", "leave", leave));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/reject/{id}")
    public ResponseEntity<?> rejectLeave(@PathVariable Long id, HttpServletRequest request) {
        Long adminId = JwtUserIdExtractor.extractUserId(request.getHeader("Authorization"));
        if (adminId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        
        User admin = userRepository.findById(adminId).orElse(null);
        if (admin == null || (!"RH".equalsIgnoreCase(admin.getRole()) && !"ADMIN".equalsIgnoreCase(admin.getRole()))) {
            return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));
        }

        return leaveRequestRepository.findById(id).map(leave -> {
            leave.setStatus("rejected");
            leaveRequestRepository.save(leave);
            return ResponseEntity.ok(Map.of("message", "Rejected", "leave", leave));
        }).orElse(ResponseEntity.notFound().build());
    }
}
