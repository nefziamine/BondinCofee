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

    @Value("${bondin.ai.key}")
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
                                       "3. Match the user's language (Arabic -> Arabic, French -> French).\n" +
                                       "4. Be context-aware using the provided message history.\n" +
                                       "5. If GUEST: Focus on brand storytelling, heritage, and coffee expertise. Do NOT reveal specific employee data.";

            // Load History
            List<com.example.backend.model.ChatHistory> history = chatHistoryRepository.findTop20ByUserIdOrderByTimestampAsc(userId);

            String aiReply = callGeminiApi(finalSystemPrompt, message, history);
            
            // Persist Conversation
            com.example.backend.model.ChatHistory entry = new com.example.backend.model.ChatHistory();
            entry.setUserId(userId);
            entry.setRole(role);
            entry.setUserMessage(message);
            entry.setAiResponse(aiReply);
            chatHistoryRepository.save(entry);

            response.put("reply", aiReply);
        } catch (Exception e) {
            System.err.println("Chat endpoint error: " + e.getMessage());
            e.printStackTrace();
            response.put("reply", "Service chatbot temporairement indisponible. Veuillez reessayer.");
        }
        return response;
    }

    private String getSystemPrompt(String role) {
        String brevityRule = "\n━━ RÈGLE DE CONCISION ━━\nRéponds en 3 phrases maximum. Sois direct et évite les longues introductions.";
        
        if ("ADMIN".equals(role)) {
            return "Tu es YES2L - Administration (Maison Bondin). " +
                   "Fournis des stats et statuts de réclamations de façon structurée (listes). " +
                   "Filtre par département et volume." + brevityRule;
        }
        if ("RH".equals(role)) {
            return "Tu es YES2L - Assistant RH (Maison Bondin). " +
                   "Collecte ID (Email, Nom, Dép) puis aide pour Salaire, Congés, Attestations. " +
                   "Redirige vers le portail RH pour le reste." + brevityRule;
        }
        if ("IT".equals(role)) {
            return "Tu es YES2L - Support IT (Maison Bondin). " +
                   "Collecte ID (Email, Nom, Dép) puis aide pour VPN, WiFi, PC, Mails. " +
                   "Indique la création de ticket si non résolu." + brevityRule;
        }
        if ("EMPLOYE".equals(role)) {
            return "Tu es YES2L, l'assistant interne de la Maison Bondin. " +
                   "Support RH et IT. Collecte info ID avant d'aider." + brevityRule;
        }
        return "Tu es YES2L, guide Maison Bondin (1910). " +
               "Présente brièvement le café et invite à se connecter pour les services internes." + brevityRule;
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

    private String callGeminiApi(String systemPrompt, String userMsg, List<com.example.backend.model.ChatHistory> history) {
        String[] models = {"gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"};
        String lastError = "";

        for (String modelName : models) {
            try {
                if (apiKey == null || apiKey.isBlank()) return "Configuration IA absente.";
                String url = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + apiKey;
                
                Map<String, Object> body = new HashMap<>();
                List<Map<String, Object>> contents = new ArrayList<>();

                for (com.example.backend.model.ChatHistory h : history) {
                    contents.add(Map.of("role", "user", "parts", List.of(Map.of("text", h.getUserMessage()))));
                    contents.add(Map.of("role", "model", "parts", List.of(Map.of("text", h.getAiResponse()))));
                }
                contents.add(Map.of("role", "user", "parts", List.of(Map.of("text", systemPrompt + "\n\nUser Question: " + userMsg))));
                body.put("contents", contents);

                Map<String, Object> response = restTemplate.postForObject(url, body, Map.class);
                if (response != null && response.containsKey("candidates")) {
                    List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
                    Map<String, Object> contentRes = (Map<String, Object>) candidates.get(0).get("content");
                    List<Map<String, String>> partsRes = (List<Map<String, String>>) contentRes.get("parts");
                    return partsRes.get(0).get("text");
                }
            } catch (HttpStatusCodeException e) {
                lastError = "HTTP " + e.getStatusCode().value() + " (" + modelName + "): " + e.getResponseBodyAsString();
                System.err.println("Gemini Error (" + modelName + "): " + lastError);
                // If it's a 404 (model not found) or 400 (bad request/model name), try next one
                if (e.getStatusCode().value() == 404 || e.getStatusCode().value() == 400) continue;
                break; // Stop for 403 (Invalid Key) or 429 (Quota)
            } catch (Exception e) {
                lastError = e.getMessage();
                System.err.println("Technical Error: " + lastError);
            }
        }
        return "Le service IA a répondu par une erreur : " + lastError;
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
                + "المسار المباشر داخل التطبيق: /forgot-password";
        }

        if (french) {
            return "Pour recuperer votre mot de passe :\n"
                + "1) Ouvrez la page de connexion.\n"
                + "2) Cliquez sur \"Mot de passe oublie\".\n"
                + "3) Saisissez votre email.\n"
                + "4) Verifiez votre boite mail puis suivez le lien de reinitialisation.\n"
                + "Acces direct dans l'application : /forgot-password";
        }

        return "To recover your password:\n"
            + "1) Open the login page.\n"
            + "2) Click \"Forgot password\".\n"
            + "3) Enter your email address.\n"
            + "4) Check your email and follow the reset link.\n"
            + "Direct app route: /forgot-password";
    }
}
