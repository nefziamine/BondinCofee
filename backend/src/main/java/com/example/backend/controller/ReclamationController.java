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

    @GetMapping("/all")
    public List<Reclamation> getAll() {
        return repository.findAll();
    }

    @PostMapping("/add")
    public Reclamation add(@RequestBody Reclamation reclamation) {
        if (reclamation.getStatus() == null) {
            reclamation.setStatus("Pending");
        }
        return repository.save(reclamation);
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
