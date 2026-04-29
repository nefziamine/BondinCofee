package com.example.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.example.backend.model.Reclamation;
import com.example.backend.repository.ReclamationRepository;
import java.util.List;

@RestController
@RequestMapping("/reclamation")
public class ReclamationController {

    @Autowired
    private ReclamationRepository repository;

    @Autowired
    private com.example.backend.repository.UserRepository userRepository;

    @GetMapping("/all")
    public List<Reclamation> getAll() {
        List<Reclamation> recs = repository.findAll();
        recs.forEach(this::populateEmail);
        return recs;
    }

    private void populateEmail(Reclamation r) {
        if (r.getUserId() != null) {
            userRepository.findById(r.getUserId()).ifPresent(u -> r.setUserEmail(u.getEmail()));
        }
    }

    @PostMapping("/add")
    public Reclamation add(@RequestBody Reclamation reclamation) {
        if (reclamation.getStatus() == null) {
            reclamation.setStatus("Pending");
        }
        
        // Only apply automated filtering if no category was selected by the user
        if (reclamation.getCategory() == null || reclamation.getCategory().isEmpty()) {
            String content = (reclamation.getSujet() + " " + reclamation.getDescription()).toLowerCase();
            if (content.contains("network") || content.contains("computer") || content.contains("password") || 
                content.contains("software") || content.contains("it") || content.contains("wifi") || 
                content.contains("imprimante") || content.contains("ecran")) {
                reclamation.setCategory("IT");
            } else {
                reclamation.setCategory("RH");
            }
        }
        
        populateEmail(reclamation);
        return repository.save(reclamation);
    }

    @GetMapping("/category/{cat}")
    public List<Reclamation> getByCategory(@PathVariable String cat) {
        List<Reclamation> recs = repository.findAll().stream()
                .filter(r -> cat.equalsIgnoreCase(r.getCategory()))
                .toList();
        recs.forEach(this::populateEmail);
        return recs;
    }

    @GetMapping("/user/{userId}")
    public List<Reclamation> getByUserId(@PathVariable Long userId) {
        List<Reclamation> recs = repository.findAll().stream()
                .filter(r -> userId.equals(r.getUserId()))
                .toList();
        recs.forEach(this::populateEmail);
        return recs;
    }

    @PostMapping("/answer/{id}")
    public Reclamation answer(@PathVariable Long id, @RequestBody String reponse) {
        return repository.findById(id).map(r -> {
            r.setReponse(reponse);
            r.setStatus("Resolved");
            return repository.save(r);
        }).orElse(null);
    }

    @PutMapping("/update/{id}")
    public Reclamation update(@PathVariable Long id, @RequestBody Reclamation reclamation) {
        return repository.findById(id).map(r -> {
            r.setSujet(reclamation.getSujet());
            r.setDescription(reclamation.getDescription());
            r.setStatus(reclamation.getStatus());
            return repository.save(r);
        }).orElse(null);
    }

    @DeleteMapping("/delete/{id}")
    public void delete(@PathVariable Long id) {
        repository.deleteById(id);
    }
}
