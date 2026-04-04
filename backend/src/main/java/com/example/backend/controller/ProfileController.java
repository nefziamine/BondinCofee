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

    @GetMapping("/me")
    public ProfileUser getProfile() {
        // Return latest or specific profile depending on logic
        return repository.findAll().stream().findFirst().orElse(null);
    }

    @PostMapping("/save")
    public ProfileUser saveProfile(@RequestBody ProfileUser profile) {
        return repository.save(profile);
    }

    @PostMapping("/upload-image")
    public String uploadImage(@RequestParam("file") MultipartFile file) {
        // Mock image upload
        return "https://via.placeholder.com/150";
    }
}
