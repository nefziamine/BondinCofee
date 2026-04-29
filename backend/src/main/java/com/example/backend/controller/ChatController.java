package com.example.backend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.beans.factory.annotation.Autowired;
import com.example.backend.repository.UserRepository;
import com.example.backend.repository.ProfileRepository;
import com.example.backend.repository.ReclamationRepository;
import com.example.backend.model.User;
import com.example.backend.model.ProfileUser;
import com.example.backend.model.Reclamation;
import java.util.*;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "http://localhost:4200")
public class ChatController {

    @Value("${bondin.ai.key:}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProfileRepository profileRepository;

    @Autowired
    private ReclamationRepository reclamationRepository;

    @Autowired
    private com.example.backend.repository.ChatHistoryRepository chatHistoryRepository;

    @GetMapping("/history/{userId}")
    public List<com.example.backend.model.ChatHistory> getHistory(@PathVariable String userId) {
        return chatHistoryRepository.findTop20ByUserIdOrderByTimestampAsc(userId);
    }

    @PostMapping
    public Map<String, String> getChatReply(@RequestBody Map<String, Object> payload) {
        Map<String, String> response = new HashMap<>();
        try {
            String role = payload.get("role") instanceof String ? (String) payload.get("role") : "GUEST";
            String userId = payload.get("userId") instanceof String ? (String) payload.get("userId") : "GUEST_" + UUID.randomUUID().toString().substring(0,8);
            String message = payload.get("message") instanceof String ? ((String) payload.get("message")).trim() : "";
            
            if (message.isEmpty()) {
                response.put("reply", "Veuillez saisir un message avant d'envoyer votre demande.");
                return response;
            }

            // Handle password reset
            if (isPasswordResetQuestion(message)) {
                response.put("reply", buildPasswordResetReply(message));
                return response;
            }

            String systemPrompt = getSystemPrompt(role);
            String internalContext = getInternalContext();
            
            // Refined system instructions
            String finalSystemPrompt = systemPrompt + "\n\n--- INTERNAL REAL-TIME DATABASE ---\n" + internalContext + 
                                       "\n-----------------------------------\n" +
                                       "CRITICAL INSTRUCTIONS:\n" +
                                       "1. NEVER mention the 'Internal Database' or 'Context block' to the user.\n" +
                                       "2. Your responses must be visually pleasing with bolding and bullet points.\n" +
                                       "3. Match the user's language.\n" +
                                       "4. Be context-aware using the provided message history.\n" +
                                       "5. If VISITOR: Do NOT reveal any specific employee data or internal stats.";

            // Load History
            List<com.example.backend.model.ChatHistory> history = chatHistoryRepository.findTop20ByUserIdOrderByTimestampAsc(userId);
            
            // Replaced Gemini API call with Local Simulated AI logic
            String aiReply = callLocalAI(finalSystemPrompt, message, history);
            
            // Persist Conversation (Only for Authenticated Roles)
            if (!"GUEST".equalsIgnoreCase(role) && !"VISITOR".equalsIgnoreCase(role)) {
                com.example.backend.model.ChatHistory entry = new com.example.backend.model.ChatHistory();
                entry.setUserId(userId);
                entry.setRole(role);
                entry.setUserMessage(message);
                entry.setAiResponse(aiReply);
                chatHistoryRepository.save(entry);
            }

            response.put("reply", aiReply);
        } catch (Exception e) {
            System.err.println("Chat endpoint error: " + e.getMessage());
            e.printStackTrace();
            response.put("reply", "Service chatbot temporairement indisponible. Veuillez reessayer.");
        }
        return response;
    }

    private String getSystemPrompt(String role) {
        String basePrompt = "SYSTEM PROMPT — Multi-Role Intelligent Assistant\n" +
            "Identity: You are an intelligent virtual assistant embedded in an enterprise HR & management platform. " +
            "Your behavior, tone, knowledge scope, and available actions adapt dynamically based on the authenticated role of the user you are serving. " +
            "You are professional, concise, and proactive.\n\n" +
            "General Rules (All Roles):\n" +
            "- Always respond in the same language the user writes in (French, Arabic, English, or Darija).\n" +
            "- Never fabricate data. If you don't know something, say so clearly and suggest where to find the answer.\n" +
            "- Never expose data belonging to another role.\n" +
            "- Keep responses concise but complete. Use bullet points or numbered steps for clarity when appropriate.\n" +
            "- If the user's intent is ambiguous, ask one clarifying question before proceeding.\n" +
            "- Always maintain a professional, courteous, and solution-oriented tone.\n" +
            "- Data Access: You have access to a set of backend functions that query the live database. You MUST call the appropriate function instead of guessing or fabricating data. Only call functions permitted for the active user role.\n\n";

        if ("ADMIN".equals(role)) {
            return basePrompt + "ROLE: ADMIN\n" +
                   "Context: The user is an authenticated platform administrator with elevated privileges.\n" +
                   "Behavior: Answer all administrative questions, including: User account management, Role and permission configuration, Platform settings, Viewing employees/HR/IT, Generating reports, Monitoring logs, Organizational structure, Workflows.\n" +
                   "Be precise, technical when necessary, and action-oriented. You may reference specific system features, settings panels, and data.";
        }
        if ("RH".equals(role)) {
            return basePrompt + "ROLE: HR\n" +
                   "Context: The user is an authenticated Human Resources staff member.\n" +
                   "Behavior: Answer all HR-related questions, including: Managing leave requests, Tracking absences/attendance, Onboarding/offboarding, Contracts/documents, Payroll, Performance reviews, HR policies, HR reports, Handling grievances.\n" +
                   "Be thorough, professional, and compliant in tone. When relevant, proactively suggest actions.";
        }
        if ("IT".equals(role)) {
            return basePrompt + "ROLE: IT\n" +
                   "Context: The user is an authenticated IT staff member responsible for technical support and infrastructure.\n" +
                   "Behavior: Answer all IT-related questions, including: User account troubleshooting, Software installation, Network issues, Bug reporting, Security policies, Hardware inventory, Integrations, Maintenance schedules.\n" +
                   "Be technical, precise, and solution-focused. When appropriate, escalate or document tickets.";
        }
        if ("EMPLOYE".equals(role)) {
            return basePrompt + "ROLE: EMPLOYEE\n" +
                   "Context: The user is an authenticated company employee. They interact with the platform for daily work tasks and personal HR matters.\n" +
                   "Behavior: Answer all employee-relevant questions, including: Leave requests, Leave balance, Status of requests, Policies, Profile and payslips, Internal announcements.\n" +
                   "Leave & Calendar feature: Proactively display or reference the integrated calendar showing public holidays, celebration days, and personal leave.\n" +
                   "Guide them step by step through leave requests. Maintain a helpful, supportive, and empathetic tone.";
        }
        
        return basePrompt + "ROLE: VISITOR\n" +
               "Context: The user is visiting the platform for the first time or is not yet authenticated.\n" +
               "Behavior: Welcome them warmly. Answer only general, public-facing questions (What is this platform, How to create account, Features, Registration, Security, Intended audience).\n" +
               "Guide them toward registration or login. Do NOT reveal internal data, admin features, or privileged information. Keep answers simple, friendly, and encouraging.";
    }

    private String getInternalContext() {
        StringBuilder sb = new StringBuilder();
        sb.append("Current Users Snapshot:\n");
        // Limit context for performance
        List<User> users = userRepository.findAll();
        for (int i = 0; i < Math.min(users.size(), 20); i++) {
            User u = users.get(i);
            sb.append(String.format("- %s (%s) | Email: %s\n", u.getNomUtilisateur(), u.getRole(), u.getEmail()));
        }
        sb.append("\nRecent Tickets Snapshot:\n");
        List<Reclamation> recs = reclamationRepository.findAll();
        for (int i = 0; i < Math.min(recs.size(), 10); i++) {
            Reclamation r = recs.get(i);
            sb.append(String.format("- ID: %d | Subj: %s | Status: %s\n", r.getId(), r.getSujet(), r.getStatus()));
        }
        return sb.toString();
    }

    private String callLocalAI(String systemPrompt, String userMsg, List<com.example.backend.model.ChatHistory> history) {
        String msgLower = userMsg.toLowerCase(Locale.ROOT).trim();
        boolean isArabic = msgLower.matches(".*[\\u0600-\\u06FF].*");

        // Quick unified greeting for all roles
        // Quick unified greeting for all roles
        if (msgLower.equals("hi") || msgLower.equals("hello") || msgLower.equals("bonjour") || msgLower.equals("salut") || msgLower.equals("coucou")) {
            if (systemPrompt.contains("ROLE: VISITOR")) {
                return "Bonjour et bienvenue ! Je suis là pour vous guider. Que souhaitez-vous savoir ?";
            }
            return "Bonjour ! Comment puis-je vous aider aujourd'hui ?";
        }

        // Visitor Role Logic
        if (systemPrompt.contains("ROLE: VISITOR")) {
            if (msgLower.contains("platform") || msgLower.contains("plateforme") || msgLower.contains("feature") || msgLower.contains("fonctionnalité") || msgLower.contains("what is")) {
                return "**🌍 À propos de la plateforme :**\n\n" +
                       "• Cette plateforme est un système complet de gestion RH et d'entreprise.\n" +
                       "• Elle offre des fonctionnalités telles que la gestion des congés, des fiches de paie, le support IT, et un tableau de bord administratif.\n" +
                       "• Elle est conçue pour simplifier les processus internes de l'entreprise.";
            } else if (msgLower.contains("register") || msgLower.contains("inscription") || msgLower.contains("create") || msgLower.contains("créer") || msgLower.contains("account") || msgLower.contains("compte")) {
                return "**📝 Création de compte :**\n\n" +
                       "• L'inscription est généralement réservée aux employés et gérée en interne.\n" +
                       "• Si vous êtes un nouvel employé, vos identifiants vous seront fournis par le département RH lors de votre intégration.\n" +
                       "• Vous pouvez accéder à la page d'inscription ici : <a href=\"/register\">Créer un compte</a>";
            } else if (msgLower.contains("secure") || msgLower.contains("sécurité") || msgLower.contains("data") || msgLower.contains("données")) {
                return "**🔒 Sécurité et Confidentialité :**\n\n" +
                       "• Oui, notre plateforme est hautement sécurisée.\n" +
                       "• L'accès est strictement limité au personnel autorisé avec des rôles bien définis.\n" +
                       "• Toutes les communications et les données personnelles sont protégées.";
            }
        }

        // Admin Role Logic
        if (systemPrompt.contains("ROLE: ADMIN")) {
            if (msgLower.contains("stat") || msgLower.contains("ticket") || msgLower.contains("réclamation") || msgLower.contains("combien") || msgLower.contains("rapport")) {
                return "**📊 Tableau de Bord Administrateur :**\n\n" +
                       "• Consultez l'interface pour les statistiques détaillées.\n" +
                       "• Vous avez un accès complet à la gestion des utilisateurs et des rôles.\n" +
                       "• Suivez l'activité du système et des workflows depuis votre espace.";
            }
            return "Bonjour Administrateur. Que souhaitez-vous faire ?";
        }
        
        // HR Role Logic
        if (systemPrompt.contains("ROLE: HR")) {
            if (msgLower.contains("salaire") || msgLower.contains("paie") || msgLower.contains("prime")) {
                return "**💼 Assistance RH - Paie et Salaires**\n\n" +
                       "• Le traitement des fiches de paie est généralement finalisé vers le 25 du mois.\n" +
                       "• Vous pouvez consulter le rapport de paie complet dans le tableau de bord RH.";
            } else if (msgLower.contains("congé") || msgLower.contains("vacances") || msgLower.contains("absence")) {
                return "**🌴 Assistance RH - Gestion des Congés**\n\n" +
                       "• Il y a des demandes de congés en attente de votre approbation.\n" +
                       "• Allez dans la section 'Demandes de Congés' pour vérifier les soldes et valider ou rejeter les demandes.";
            } else if (msgLower.contains("attestation") || msgLower.contains("document") || msgLower.contains("recrutement")) {
                return "**📄 Assistance RH - Gestion Documentaire**\n\n" +
                       "• Pour l'intégration, assurez-vous que tous les documents (Contrat, ID) sont ajoutés au profil de l'employé.\n" +
                       "• Vous pouvez générer les attestations depuis l'annuaire.";
            }
            return "Bonjour RH. En quoi puis-je vous aider ?";
        }
        
        // IT Role Logic
        if (systemPrompt.contains("ROLE: IT")) {
            if (msgLower.contains("vpn") || msgLower.contains("réseau") || msgLower.contains("wifi") || msgLower.contains("acces") || msgLower.contains("accès")) {
                return "**💻 Support IT - Réseau & VPN**\n\n" +
                       "• Pour gérer l'accès VPN des employés, consultez le panneau 'Configuration Réseau'.\n" +
                       "• Assurez-vous que l'authentification double facteur (2FA) est activée.";
            } else if (msgLower.contains("ticket") || msgLower.contains("bug") || msgLower.contains("problème") || msgLower.contains("pc") || msgLower.contains("ordinateur")) {
                return "**🛠️ Support IT - Gestion des Tickets**\n\n" +
                       "• Vous pouvez suivre et résoudre les bugs dans le Helpdesk IT.\n" +
                       "• N'oubliez pas de documenter la solution et de passer le statut à 'Résolu'.";
            } else if (msgLower.contains("mot de passe") || msgLower.contains("compte") || msgLower.contains("email") || msgLower.contains("mail")) {
                return "**🔐 Support IT - Dépannage de Compte**\n\n" +
                       "• Vous avez les droits pour réinitialiser manuellement les mots de passe ou débloquer les comptes suspendus.";
            }
            return "Bonjour Support IT. Quel est le problème technique ?";
        }

        // Employee Role Logic
        if (systemPrompt.contains("ROLE: EMPLOYEE")) {
            if (msgLower.contains("congé") || msgLower.contains("vacances") || msgLower.contains("solde")) {
                return "**👥 Espace Employé - Congés**\n\n" +
                       "• Pour soumettre une demande, allez dans la section 'Mes Congés' et remplissez le formulaire pas à pas.\n" +
                       "• **Calendrier** : N'oubliez pas de consulter le calendrier intégré pour voir les jours fériés et les événements d'entreprise !\n" +
                       "• Votre solde de congé est visible sur votre profil.";
            } else if (msgLower.contains("salaire") || msgLower.contains("paie") || msgLower.contains("fiche")) {
                return "**👥 Espace Employé - Fiches de Paie**\n\n" +
                       "• Vous pouvez consulter et télécharger vos fiches de paie directement depuis votre profil.";
            } else if (msgLower.contains("politique") || msgLower.contains("annonce") || msgLower.contains("absence")) {
                return "**👥 Espace Employé - Informations Internes**\n\n" +
                       "• Veuillez consulter l'espace d'annonces pour les politiques de l'entreprise concernant les présences et les absences.";
            }
            return "Bonjour ! Comment puis-je vous aider aujourd'hui ?";
        }

        // Arabic default fallback
        if (isArabic) {
            return "مرحباً بكم! كيف يمكنني مساعدتكم اليوم؟";
        }

        // Generic Catch-all
        if (msgLower.contains("merci") || msgLower.contains("super")) {
            return "Je vous en prie ! N'hésitez pas si vous avez d'autres questions.";
        } else if (msgLower.contains("qui es-tu") || msgLower.contains("tu es qui") || msgLower.contains("nom")) {
            return "Je suis l'assistant virtuel de cette plateforme. Mon objectif est de vous assister selon votre rôle.";
        }
        
        // Catch-all response for Visitor
        if (systemPrompt.contains("ROLE: VISITOR")) {
            return "Je suis l'assistant virtuel. Posez-moi vos questions générales sur la plateforme ou l'inscription !";
        }

        // Catch-all response
        return "Je suis l'assistant système. Utilisez des mots-clés simples (ex: 'congé', 'mot de passe', 'rapport') pour que je puisse mieux vous orienter.";
    }

    private boolean isPasswordResetQuestion(String message) {
        String m = message.toLowerCase(Locale.ROOT);
        return m.contains("forgot password")
            || m.contains("forget password")
            || m.contains("forgot my password")
            || m.contains("reset password")
            || m.contains("mot de passe")
            || m.contains("mdp")
            || m.contains("j'ai oublie")
            || m.contains("j ai oublie")
            || m.contains("نسيت")
            || m.contains("كلمة المرور")
            || m.contains("password");
    }

    private String buildPasswordResetReply(String message) {
        String m = message.toLowerCase(Locale.ROOT);
        boolean arabic = m.matches(".*[\\u0600-\\u06FF].*");
        boolean french = m.contains("mot de passe") || m.contains("mdp") || m.contains("oublie");

        if (arabic) {
            return "لاسترجاع كلمة المرور:\n"
                + "1) افتح صفحة تسجيل الدخول.\n"
                + "2) اضغط على \"نسيت كلمة المرور\".\n"
                + "3) أدخل بريدك الإلكتروني.\n"
                + "4) تحقق من بريدك واتبع رابط إعادة التعيين.\n"
                + "أو انقر هنا: <a href=\"/forgot-password\">إعادة تعيين كلمة المرور</a>";
        }

        if (french) {
            return "Pour récupérer votre mot de passe :\n"
                + "1) Ouvrez la page de connexion.\n"
                + "2) Cliquez sur \"Mot de passe oublié\".\n"
                + "3) Saisissez votre email.\n"
                + "4) Vérifiez votre boîte mail puis suivez le lien de réinitialisation.\n"
                + "Ou cliquez directement ici : <a href=\"/forgot-password\">Réinitialiser le mot de passe</a>";
        }

        return "To recover your password:\n"
            + "1) Open the login page.\n"
            + "2) Click \"Forgot password\".\n"
            + "3) Enter your email address.\n"
            + "4) Check your email and follow the reset link.\n"
            + "Or click here: <a href=\"/forgot-password\">Reset Password</a>";
    }
}
