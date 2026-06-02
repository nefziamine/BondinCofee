package com.example.backend.controller;

import com.example.backend.model.ChatMessage;
import com.example.backend.service.ChatbotService;
import com.example.backend.util.JwtUserIdExtractor;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST endpoints for the Bondin chatbot.
 *
 *  - POST   /api/chatbot/ask      : send a message, returns the AI reply
 *  - GET    /api/chatbot/history  : authenticated user's transcript (chronological)
 *  - DELETE /api/chatbot/history  : clears the authenticated user's transcript
 */
@RestController
@RequestMapping("/api/chatbot")
@CrossOrigin(origins = "*")
public class ChatbotController {

    private final ChatbotService chatbotService;

    public ChatbotController(ChatbotService chatbotService) {
        this.chatbotService = chatbotService;
    }

    @PostMapping("/ask")
    public ResponseEntity<Map<String, Object>> ask(@RequestBody Map<String, Object> payload,
                                                   HttpServletRequest request) {
        Object raw = payload != null ? payload.get("message") : null;
        String message = raw != null ? String.valueOf(raw).trim() : "";

        Long userId = JwtUserIdExtractor.extractUserId(request.getHeader("Authorization"));
        String reply = chatbotService.ask(userId, message);

        Map<String, Object> response = new HashMap<>();
        response.put("reply", reply);
        response.put("timestamp", LocalDateTime.now().toString());
        response.put("authenticated", userId != null);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/history")
    public ResponseEntity<?> history(HttpServletRequest request) {
        Long userId = JwtUserIdExtractor.extractUserId(request.getHeader("Authorization"));
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        List<ChatMessage> rows = chatbotService.history(userId);
        return ResponseEntity.ok(rows);
    }

    @DeleteMapping("/history")
    public ResponseEntity<?> clear(HttpServletRequest request) {
        Long userId = JwtUserIdExtractor.extractUserId(request.getHeader("Authorization"));
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        chatbotService.clearHistory(userId);
        return ResponseEntity.noContent().build();
    }
}
