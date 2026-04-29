package com.example.backend.controller;

import com.example.backend.model.Reclamation;
import com.example.backend.model.User;
import com.example.backend.model.ChatMessage;
import com.example.backend.repository.ReclamationRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.repository.ChatMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chatbot")
@CrossOrigin
public class ChatbotController {

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ReclamationRepository reclamationRepository;

    @GetMapping("/history/{userId}")
    public List<ChatMessage> getHistory(@PathVariable Long userId) {
        return chatMessageRepository.findByUserIdOrderByTimestampAsc(userId);
    }

    @PostMapping("/ask")
    public Map<String, String> ask(@RequestBody Map<String, Object> request) {
        Map<String, String> res = new HashMap<>();
        try {
            String messageText = request.get("message").toString().toLowerCase().trim();
            Object userIdObj = request.get("userId");
            Long userId = (userIdObj instanceof Number) ? ((Number) userIdObj).longValue() : Long.valueOf(userIdObj.toString());
            String role = request.get("role") != null ? request.get("role").toString() : "EMPLOYE";

            // Save User Message
            ChatMessage userMsg = new ChatMessage();
            userMsg.setUserId(userId);
            userMsg.setRole(role);
            userMsg.setText(request.get("message").toString());
            userMsg.setUser(true);
            chatMessageRepository.save(userMsg);

            String responseText = processRequest(messageText, userId, role);
            
            // Save Bot Response
            ChatMessage botMsg = new ChatMessage();
            botMsg.setUserId(userId);
            botMsg.setRole(role);
            botMsg.setText(responseText);
            botMsg.setUser(false);
            chatMessageRepository.save(botMsg);

            res.put("response", responseText);
        } catch (Exception e) {
            res.put("response", "Désolé, j'ai rencontré une erreur technique. Pouvez-vous réessayer ?");
            System.err.println("Chatbot Error: " + e.getMessage());
        }
        return res;
    }

    private String processRequest(String msg, Long userId, String role) {
        // --- 0. TUNISIAN DERJA / ARABIC SUPPORT ---
        if (msg.contains("asslema") || msg.contains("ahla") || msg.contains("salam")) {
            return "Asslema! Marhba bik f'Maison Bondin. Kifech najem n3awnek l'youm?";
        }
        if (msg.contains("9adech") || msg.contains("3andi") || msg.contains("mezel") || msg.contains("b9ali") || msg.contains("vacance") || msg.contains("conge")) {
             return handleConge(userId);
        }
        if (msg.contains("moshkel") || msg.contains("mochkila") || msg.contains("ticketeti") || msg.contains("reclamationeti")) {
             return handleUserTickets(userId);
        }
        if (msg.contains("flouss") || msg.contains("chahria") || msg.contains("virement")) {
             return "Virement el chahria yet3ada bin 25 w 30 f'chahar. Taw kol chay en cours.";
        }
        if (msg.contains("loura9") || msg.contains("wra9") || msg.contains("attestation")) {
             return "L'attestation de travail tal9aha louta f'onglet 'Documents' ba3d ma t'validiha l'RH.";
        }

        // --- 1. GLOBAL PRIORITY PHRASES (For everyone) ---
        if (msg.contains("comment soumettre") || msg.contains("comment créer") || msg.contains("comment faire une réclamation")) {
            return "Pour soumettre une réclamation, allez dans votre tableau de bord, cliquez sur le bouton '+ Nouvelle Requête' ou utilisez la section 'Questions Fréquentes' pour transformer une question en ticket officiel.";
        }
        if (msg.contains("résoudre") && msg.contains("directement")) {
            return "En tant qu'assistant IA local, je ne peux pas manipuler votre configuration VPN directement. Cependant, je peux analyser l'état de vos tickets ou vous donner la procédure de dépannage standard.";
        }

        // --- 2. MANAGER LEVEL (IT, RH, ADMIN) ---
        if (role.equals("IT") || role.equals("RH") || role.equals("ADMIN")) {
            // IT Specific
            if (role.equals("IT") || role.equals("ADMIN")) {
                if (msg.contains("combien") && msg.contains("attente") && msg.contains("catégorie")) return handleItTicketStats();
                if (msg.contains("clôturer") || msg.contains("cloturer")) return "Pour clôturer un ticket IT : fournissez la solution détaillée en commentaire, puis changez le statut en 'RESOLVED'.";
            }
            
            // RH Specific
            if (role.equals("RH") || role.equals("ADMIN")) {
                if (msg.contains("filtrer") && msg.contains("RH")) return "Utilisez le menu 'Catégories' sur votre dashboard et sélectionnez 'RH'.";
                if (msg.contains("attestation") && msg.contains("mois")) return handleAttestationCount();
            }

            // General Management (Shared by IT/RH/ADMIN)
            if (msg.contains("urgentes") || msg.contains("priorité")) {
                return "Les réclamations les plus urgentes sont celles marquées avec un badge 'Urgente' ou les plus anciennes en statut 'Pending'.";
            }
            if (msg.contains("résolu") || msg.contains("traité") || msg.contains("clôturer")) {
                return "Une fois traitée, ouvrez le ticket et passez le statut à 'RESOLVED' pour notifier l'employé.";
            }
            if (msg.contains("statistiques") || msg.contains("kpi")) return handleGlobalStats();
        }

        // --- 3. EMPLOYEE & GENERAL QUESTIONS (Visible to All) ---
        if (msg.contains("différence") && (msg.contains("question") || msg.contains("réclamation"))) {
            return "Une **Question** est une demande d'info simple. Une **Réclamation** signale un problème nécessitant une intervention.";
        }
        if (msg.contains("modifier") && (msg.contains("photo") || msg.contains("poste") || msg.contains("pdp"))) {
            return "Modifiez votre profil ici : [Mon Profil](/profile)";
        }
        if (msg.contains("pending") || (msg.contains("attente") && msg.contains("24h"))) {
            return "Le délai standard est de 48h. Un statut 'Pending' signifie que le ticket est en attente d'assignation.";
        }
        if (msg.contains("mot de passe") || msg.contains("password") || msg.contains("mdp")) {
            return "Pour réinitialiser ou changer votre mot de passe (nheb nbaddel mdp), déconnectez-vous et utilisez le lien 'Mot de passe oublié' sur la page de connexion.";
        }

        // --- 4. COMMON UTILITIES ---
        if (msg.contains("suivre") || (msg.contains("avancement") && msg.contains("ticket"))) {
            return handleUserTickets(userId);
        }
        if (msg.contains("attestation") || msg.contains("papier")) return "L'attestation est disponible dans 'Documents' après validation RH.";
        if (msg.contains("maladie") || msg.contains("repos")) return "Le certificat doit être déposé dans les 48h via 'Mes Requêtes'.";

        // DEFAULT
        return "Je suis l'assistant de la Maison Bondin. Je peux vous renseigner sur vos congés ("+getUserName(userId)+"), vos tickets, ou la politique de la maison. Que puis-je faire pour vous ?";
    }

    private String getUserName(Long userId) {
        return userRepository.findById(userId).map(User::getNomUtilisateur).orElse("Collaborateur");
    }

    private String handleConge(Long userId) {
        return userRepository.findById(userId)
            .map(u -> "Bonjour " + u.getNomUtilisateur() + ", il vous reste " + u.getCongeRestant() + " jours de congé.")
            .orElse("Compte non trouvé.");
    }

    private String handleUserTickets(Long userId) {
        List<Reclamation> tickets = reclamationRepository.findAll().stream()
            .filter(t -> t.getUserId() != null && t.getUserId().equals(userId))
            .collect(Collectors.toList());
        if (tickets.isEmpty()) return "Vous n'avez pas de tickets en cours.";
        long open = tickets.stream().filter(t -> "Pending".equals(t.getStatus())).count();
        return "Vous avez " + tickets.size() + " tickets (" + open + " en attente).";
    }

    private String handleItTicketStats() {
        List<Reclamation> tickets = reclamationRepository.findAll();
        long wifi = tickets.stream().filter(t -> "IT".equals(t.getCategory()) && "WiFi".equals(t.getSubCategory())).count();
        long vpn = tickets.stream().filter(t -> "IT".equals(t.getCategory()) && "VPN".equals(t.getSubCategory())).count();
        long mat = tickets.stream().filter(t -> "IT".equals(t.getCategory()) && "Matériel".equals(t.getSubCategory())).count();
        return "Tickets IT en attente : WiFi (" + wifi + "), VPN (" + vpn + "), Matériel (" + mat + ").";
    }

    private String handleAttestationCount() {
        long count = reclamationRepository.findAll().stream()
            .filter(t -> t.getSujet() != null && t.getSujet().toLowerCase().contains("attestation"))
            .count();
        return "Ce mois-ci, " + count + " employés ont soumis des demandes d'attestation de travail.";
    }

    private String handleGlobalStats() {
        return "Tableau de bord : " + userRepository.count() + " employés, " + reclamationRepository.count() + " réclamations au total.";
    }
}
