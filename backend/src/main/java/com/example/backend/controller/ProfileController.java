package com.example.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.example.backend.model.ProfileUser;
import com.example.backend.repository.ProfileRepository;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    @Autowired
    private ProfileRepository repository;

    @GetMapping("/all")
    public java.util.List<ProfileUser> getAll() {
        return repository.findAll();
    }

    @GetMapping("/me")
    public ProfileUser getProfile(@RequestParam("userId") Long userId) {
        return repository.findByUserId(userId).orElse(null);
    }

    @PostMapping("/save")
    public ProfileUser saveProfile(@RequestBody ProfileUser profile) {
        // Enforce user mapping if already exists or update
        ProfileUser existing = repository.findByUserId(profile.getUserId()).orElse(null);
        if (existing != null) {
            profile.setId(existing.getId());
        }
        return repository.save(profile);
    }

    @PostMapping("/upload-image")
    public java.util.Map<String, String> uploadImage(@RequestParam("file") MultipartFile file, @RequestParam("userId") Long userId) {
        ProfileUser profile = repository.findByUserId(userId).orElse(null);
        
        try {
            String base64Content = java.util.Base64.getEncoder().encodeToString(file.getBytes());
            String dataUrl = "data:" + file.getContentType() + ";base64," + base64Content;
            
            if (profile != null) {
                profile.setImageurl(dataUrl);
                repository.save(profile);
            }
            
            java.util.Map<String, String> res = new java.util.HashMap<>();
            res.put("url", dataUrl);
            return res;
        } catch (java.io.IOException e) {
            throw new RuntimeException("Erreur de conversion de l'image");
        }
    }
}
