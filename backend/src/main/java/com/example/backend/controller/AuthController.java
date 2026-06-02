package com.example.backend.controller;

import com.example.backend.model.User;
import com.example.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import com.example.backend.model.ProfileUser;
import com.example.backend.repository.ProfileRepository;

import com.example.backend.util.JwtUserIdExtractor;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProfileRepository profileRepository;

    @PostMapping("/login")
    public org.springframework.http.ResponseEntity<?> login(@RequestBody Map<String, String> creds) {
        String email = creds.get("email");
        String password = creds.get("password");

        User user = userRepository.findByEmail(email).orElse(null);
        Map<String, String> response = new HashMap<>();

        if (user != null && user.getPassword().equals(password)) {
            user.setLastLogin(java.time.LocalDateTime.now());
            userRepository.save(user);
            response.put("token", generateToken(user.getEmail(), user.getRole(), user.getId()));
            response.put("role", user.getRole());
            response.put("userId", user.getId().toString());
            response.put("message", "Login successful");
            return org.springframework.http.ResponseEntity.ok(response);
        } else {
            response.put("message", "Identifiants invalides");
            return org.springframework.http.ResponseEntity.status(401).body(response);
        }
    }

    private String generateToken(String email, String role, Long userId) {
        // structural JWT: header.payload.signature
        String header = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
        String payload = String.format("{\"sub\":\"%s\",\"role\":\"%s\",\"userId\":%d,\"exp\":%d}", 
            email, role, userId, (System.currentTimeMillis() / 1000) + 36000);
        
        return java.util.Base64.getEncoder().encodeToString(header.getBytes()) + "." +
               java.util.Base64.getEncoder().encodeToString(payload.getBytes()) + ".signature";
    }

    @PostMapping("/register")
    public Map<String, String> register(@RequestBody Map<String, String> data) {
        Map<String, String> response = new HashMap<>();
        try {
            String role = data.get("role");
            if ("ADMIN".equals(role)) {
                // Count existing admins to enforce single admin rule
                long adminCount = userRepository.findAll().stream()
                        .filter(u -> "ADMIN".equals(u.getRole()))
                        .count();
                if (adminCount >= 1) {
                    response.put("message", "Accès refusé. La Maison Bondin ne peut avoir qu'un seul Administrateur.");
                    return response;
                }
            }

            User user = new User();
            user.setEmail(data.get("email"));
            user.setPassword(data.get("password"));
            user.setNomUtilisateur(data.get("nomUtilisateur"));
            user.setRole(role != null ? role : "EMPLOYE");
            
            userRepository.save(user);
            
            ProfileUser profile = new ProfileUser();
            profile.setUserId(user.getId());
            profile.setNomComplet(user.getNomUtilisateur());
            profile.setEmail(user.getEmail());
            profile.setPoste(user.getRole());
            profileRepository.save(profile);
            
            response.put("message", "Registered successfully");
            return response;
        } catch (Exception e) {
            response.put("message", "Erreur d'inscription: " + e.getMessage());
            return response;
        }
    }
    @PostMapping("/forgot-password")
    public Map<String, String> forgotPassword(@RequestBody Map<String, String> data) {
        String email = data.get("email");
        Optional<User> userOpt = userRepository.findByEmail(email);
        Map<String, String> response = new HashMap<>();
        
        if (userOpt.isPresent()) {
            // In a real app, you'd generate a token and send an email
            response.put("message", "Un lien de réinitialisation a été envoyé à " + email);
        } else {
            response.put("message", "Aucun utilisateur trouvé avec cet email");
        }
        return response;
    }

    @PostMapping("/reset-password")
    public Map<String, String> resetPassword(@RequestBody Map<String, String> data) {
        String email = data.get("email");
        String newPassword = data.get("password");
        Optional<User> userOpt = userRepository.findByEmail(email);
        Map<String, String> response = new HashMap<>();

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setPassword(newPassword);
            userRepository.save(user);
            response.put("message", "Mot de passe réinitialisé avec succès");
        } else {
            response.put("message", "Erreur lors de la réinitialisation");
        }
        return response;
    }

    @PostMapping("/change-password")
    public org.springframework.http.ResponseEntity<?> changePassword(@RequestBody Map<String, String> data, HttpServletRequest request) {
        Long userId = JwtUserIdExtractor.extractUserId(request.getHeader("Authorization"));
        if (userId == null) {
            return org.springframework.http.ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }

        String oldPassword = data.get("oldPassword");
        String newPassword = data.get("newPassword");

        if (oldPassword == null || newPassword == null || newPassword.isBlank()) {
            return org.springframework.http.ResponseEntity.badRequest().body(Map.of("message", "Invalid payload"));
        }

        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return org.springframework.http.ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }

        User user = userOpt.get();
        if (user.getPassword() == null || !user.getPassword().equals(oldPassword)) {
            return org.springframework.http.ResponseEntity.status(400).body(Map.of("message", "Current password is incorrect"));
        }

        user.setPassword(newPassword);
        userRepository.save(user);
        return org.springframework.http.ResponseEntity.ok(Map.of("message", "Password updated successfully"));
    }
}
