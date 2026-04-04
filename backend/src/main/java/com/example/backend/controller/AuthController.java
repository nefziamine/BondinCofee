package com.example.backend.controller;

import com.example.backend.model.User;
import com.example.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody Map<String, String> creds) {
        String email = creds.get("email");
        String password = creds.get("password");
        
        Optional<User> userOpt = userRepository.findByEmail(email);
        Map<String, String> response = new HashMap<>();

        if (userOpt.isPresent() && userOpt.get().getPassword().equals(password)) {
            User user = userOpt.get();
            response.put("token", "dummy-jwt-token-for-" + email);
            response.put("role", user.getRole());
            response.put("message", "Logged in successfully");
            return response;
        } else {
            // Fallback for mock roles if user not in DB (Optional)
            String role = "EMPLOYE";
            if (email != null) {
                if (email.contains("admin")) role = "ADMIN";
                else if (email.contains("it")) role = "SERVICE_IT";
                else if (email.contains("rh")) role = "RH";
            }
            response.put("token", "dummy-jwt-token-for-" + email);
            response.put("role", role);
            response.put("message", "Logged in successfully (Mock)");
            return response;
        }
    }

    @PostMapping("/register")
    public Map<String, String> register(@RequestBody Map<String, String> data) {
        Map<String, String> response = new HashMap<>();
        try {
            User user = new User();
            user.setEmail(data.get("email"));
            user.setPassword(data.get("motDePasse"));
            user.setNomUtilisateur(data.get("nomUtlisateur"));
            user.setRole(data.get("role"));
            
            userRepository.save(user);
            
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
}
