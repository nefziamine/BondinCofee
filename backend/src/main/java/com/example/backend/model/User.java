package com.example.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String email;
    
    private String password;
    private String nomUtilisateur;
    private String role;

    private String status = "ACTIVE";
    private java.time.LocalDateTime createdAt = java.time.LocalDateTime.now();
    private java.time.LocalDateTime lastLogin;
    private Integer congeRestant = 21; // Default to 21 days
    private String department = "Bondin Heritage";
    private Integer nbRetards = 0;
    private Integer nbAbsencesNonJustifiees = 0;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getNomUtilisateur() { return nomUtilisateur; }
    public void setNomUtilisateur(String nomUtilisateur) { this.nomUtilisateur = nomUtilisateur; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public java.time.LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(java.time.LocalDateTime createdAt) { this.createdAt = createdAt; }

    public java.time.LocalDateTime getLastLogin() { return lastLogin; }
    public void setLastLogin(java.time.LocalDateTime lastLogin) { this.lastLogin = lastLogin; }

    public Integer getCongeRestant() { return congeRestant; }
    public void setCongeRestant(Integer congeRestant) { this.congeRestant = congeRestant; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public Integer getNbRetards() { return nbRetards; }
    public void setNbRetards(Integer nbRetards) { this.nbRetards = nbRetards; }

    public Integer getNbAbsencesNonJustifiees() { return nbAbsencesNonJustifiees; }
    public void setNbAbsencesNonJustifiees(Integer nbAbsencesNonJustifiees) { this.nbAbsencesNonJustifiees = nbAbsencesNonJustifiees; }
}
