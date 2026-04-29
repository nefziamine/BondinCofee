package com.example.backend.controller;

import com.example.backend.dto.AdminStatsDTO;
import com.example.backend.model.User;
import com.example.backend.repository.ReclamationRepository;
import com.example.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.example.backend.repository.ProfileRepository profileRepository;

    @Autowired
    private ReclamationRepository reclamationRepository;

    @GetMapping("/stats")
    public AdminStatsDTO getAdminStats() {
        AdminStatsDTO dto = new AdminStatsDTO();
        List<User> allUsers = userRepository.findAll();
        List<com.example.backend.model.Reclamation> allReclamations = reclamationRepository.findAll();
        
        long totalActive = allUsers.stream().filter(u -> "ACTIVE".equals(u.getStatus())).count();
        long openTickets = allReclamations.stream().filter(r -> !"Resolved".equalsIgnoreCase(r.getStatus())).count();
        long resolvedTickets = allReclamations.stream().filter(r -> "Resolved".equalsIgnoreCase(r.getStatus())).count();
        
        // Calculate new users this month
        java.time.LocalDateTime startOfMonth = java.time.LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0);
        long newUsersThisMonth = allUsers.stream()
            .filter(u -> u.getCreatedAt() != null && u.getCreatedAt().isAfter(startOfMonth))
            .count();

        // Calculate load by department
        long rhLoad = allReclamations.stream().filter(r -> "RH".equalsIgnoreCase(r.getCategory())).count();
        long itLoad = allReclamations.stream().filter(r -> "IT".equalsIgnoreCase(r.getCategory())).count();
        long totalLoad = (rhLoad + itLoad) == 0 ? 1 : (rhLoad + itLoad);

        // Calculate by type
        long questions = allReclamations.stream().filter(r -> "QUESTION".equalsIgnoreCase(r.getType())).count();
        long complaints = allReclamations.stream().filter(r -> "RECLAMATION".equalsIgnoreCase(r.getType())).count();
        long totalTypes = (questions + complaints) == 0 ? 1 : (questions + complaints);

        // FAQ Rankings (Group by subject roughly)
        Map<String, Long> faq = new java.util.HashMap<>();
        for (com.example.backend.model.Reclamation r : allReclamations) {
            String sujet = r.getSujet() != null && !r.getSujet().isEmpty() ? r.getSujet() : "Non spécifié";
            faq.put(sujet, faq.getOrDefault(sujet, 0L) + 1);
        }
        // Get top 3
        Map<String, Long> topFaq = faq.entrySet().stream()
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
            .limit(3)
            .collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, (e1, e2) -> e1, java.util.LinkedHashMap::new));

        dto.setTotalActiveUsers(totalActive);
        dto.setOpenTickets(openTickets);
        dto.setTicketsResolvedThisWeek(resolvedTickets); // Using total resolved
        dto.setAverageResponseTime(1.5); // Average AI response time in seconds
        dto.setFaqRankings(topFaq.isEmpty() ? Map.of("Aucune donnée", 0L) : topFaq);
        int rhPercent = (int) Math.round((rhLoad * 100.0) / totalLoad);
        int itPercent = (int) Math.round((itLoad * 100.0) / totalLoad);
        dto.setDepartmentLoad(Map.of("RH", rhPercent, "IT", itPercent));
        dto.setReclamationTypes(Map.of("Questions", (questions * 100.0) / totalTypes, "Réclamations", (complaints * 100.0) / totalTypes));
        dto.setNewUsersThisMonth(newUsersThisMonth);
        
        dto.setActiveUserList(allUsers.stream().filter(u -> "ACTIVE".equals(u.getStatus())).collect(java.util.stream.Collectors.toList()));
        dto.setOpenTicketList(allReclamations.stream().filter(r -> !"Resolved".equalsIgnoreCase(r.getStatus())).collect(java.util.stream.Collectors.toList()));
        dto.setResolvedTicketList(allReclamations.stream().filter(r -> "Resolved".equalsIgnoreCase(r.getStatus())).collect(java.util.stream.Collectors.toList()));
        
        // Populate photos map: Email -> ImageUrl
        Map<String, String> photos = new java.util.HashMap<>();
        profileRepository.findAll().forEach(p -> {
            if (p.getEmail() != null && p.getImageurl() != null) {
                photos.put(p.getEmail(), p.getImageurl());
            }
        });
        dto.setUserPhotos(photos);
        
        return dto;
    }

    @GetMapping
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @PostMapping
    public User createUser(@RequestBody User user) {
        // Enforce single admin rule for new creations too
        if ("ADMIN".equals(user.getRole())) {
            long adminCount = userRepository.findAll().stream()
                    .filter(u -> "ADMIN".equals(u.getRole()))
                    .count();
            if (adminCount >= 1) {
                throw new RuntimeException("Accès refusé. La Maison Bondin ne peut avoir qu'un seul Administrateur.");
            }
        }
        return userRepository.save(user);
    }

    @PutMapping("/{id}")
    public User updateUser(@PathVariable Long id, @RequestBody User payload) {
        Long safeId = java.util.Objects.requireNonNull(id, "id is required");
        User user = userRepository.findById(safeId)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable."));

        String nextRole = payload.getRole() != null ? payload.getRole().trim().toUpperCase() : user.getRole();
        if ("ADMIN".equals(nextRole) && !"ADMIN".equals(user.getRole())) {
            long adminCount = userRepository.findAll().stream()
                    .filter(u -> "ADMIN".equals(u.getRole()) && !u.getId().equals(safeId))
                    .count();
            if (adminCount >= 1) {
                throw new RuntimeException("Accès refusé. La Maison Bondin ne peut avoir qu'un seul Administrateur.");
            }
        }

        if (payload.getNomUtilisateur() != null && !payload.getNomUtilisateur().isBlank()) {
            user.setNomUtilisateur(payload.getNomUtilisateur().trim());
        }
        if (payload.getEmail() != null && !payload.getEmail().isBlank()) {
            user.setEmail(payload.getEmail().trim());
        }
        user.setRole(nextRole);

        return userRepository.save(user);
    }

    @DeleteMapping("/{id}")
    public void revokeUser(@PathVariable Long id) {
        Long safeId = java.util.Objects.requireNonNull(id, "id is required");
        userRepository.findById(safeId).ifPresent(user -> {
            user.setStatus("REVOKED");
            userRepository.save(user);
        });
    }

    @PutMapping("/{id}/reactivate")
    public void reactivateUser(@PathVariable Long id) {
        Long safeId = java.util.Objects.requireNonNull(id, "id is required");
        userRepository.findById(safeId).ifPresent(user -> {
            user.setStatus("ACTIVE");
            userRepository.save(user);
        });
    }
}
