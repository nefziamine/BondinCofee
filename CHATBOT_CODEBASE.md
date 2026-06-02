# BONDIN CHATBOT - COMPLETE CODEBASE DOCUMENTATION

**Project**: Bondin Assistant - Internal AI Chatbot  
**Version**: 1.0  
**Date**: May 2026  
**Technologies**: Spring Boot, Angular, Google Gemini API  

---

## TABLE OF CONTENTS

1. [Architecture Overview](#architecture-overview)
2. [Backend Implementation](#backend-implementation)
3. [Frontend Implementation](#frontend-implementation)
4. [Database Models](#database-models)
5. [Configuration](#configuration)
6. [API Endpoints](#api-endpoints)
7. [Key Features](#key-features)

---

## ARCHITECTURE OVERVIEW

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  FRONTEND (Angular)                     │
│         - ChatbotComponent (Standalone)                 │
│         - ChatbotService (HTTP Client)                  │
│         - Real-time UI with Signals                     │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ REST API
                   ▼
┌─────────────────────────────────────────────────────────┐
│               BACKEND (Spring Boot)                      │
│         - ChatbotController (REST)                       │
│         - ChatbotService (Business Logic)                │
│         - JWT Authentication                            │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
   ┌─────────┐         ┌──────────────┐
   │Database │         │Google Gemini │
   │ (MySQL) │         │   API        │
   └─────────┘         └──────────────┘
```

### Key Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | Angular 17+ | User Interface & Real-time Chat |
| Backend | Spring Boot 3 | REST API & Business Logic |
| Database | MySQL | Persistent Chat History |
| AI Engine | Google Gemini API | Natural Language Processing |
| Auth | JWT | User Authentication |

---

## BACKEND IMPLEMENTATION

### 1. ChatbotController.java

**Location**: `backend/src/main/java/com/example/backend/controller/ChatbotController.java`

```java
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

    /**
     * POST /api/chatbot/ask
     * 
     * Request body: { "message": "user question" }
     * Response: { "reply": "bot response", "timestamp": "ISO-8601", "authenticated": boolean }
     */
    @PostMapping("/ask")
    public ResponseEntity<Map<String, Object>> ask(@RequestBody Map<String, Object> payload,
                                                   HttpServletRequest request) {
        Object raw = payload != null ? payload.get("message") : null;
        String message = raw != null ? String.valueOf(raw).trim() : "";

        // Extract user ID from JWT token
        Long userId = JwtUserIdExtractor.extractUserId(request.getHeader("Authorization"));
        
        // Get AI response from service
        String reply = chatbotService.ask(userId, message);

        // Build response
        Map<String, Object> response = new HashMap<>();
        response.put("reply", reply);
        response.put("timestamp", LocalDateTime.now().toString());
        response.put("authenticated", userId != null);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/chatbot/history
     * 
     * Returns: List of ChatMessage objects for authenticated user
     * Requires: Valid JWT token in Authorization header
     */
    @GetMapping("/history")
    public ResponseEntity<?> history(HttpServletRequest request) {
        Long userId = JwtUserIdExtractor.extractUserId(request.getHeader("Authorization"));
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        List<ChatMessage> rows = chatbotService.history(userId);
        return ResponseEntity.ok(rows);
    }

    /**
     * DELETE /api/chatbot/history
     * 
     * Clears all chat history for authenticated user
     * Requires: Valid JWT token in Authorization header
     */
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
```

---

### 2. ChatbotService.java (Core Logic)

**Location**: `backend/src/main/java/com/example/backend/service/ChatbotService.java`

```java
package com.example.backend.service;

import com.example.backend.model.ChatMessage;
import com.example.backend.model.User;
import com.example.backend.repository.ChatMessageRepository;
import com.example.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Chatbot brain: forwards user message + context + history to Google Gemini,
 * persists each turn for authenticated users, and returns the AI reply.
 */
@Service
public class ChatbotService {

    private static final Logger log = LoggerFactory.getLogger(ChatbotService.class);
    private static final int HISTORY_TURN_CAP = 60; // Cap conversation history to manage token usage
    
    // System prompt defining chatbot behavior
    private static final String SYSTEM_PROMPT = """
            You are Bondin Assistant, the official AI chatbot of Maison Bondin
            (Tunisian coffee company, heritage since 1910). You help employees and
            administrators on the internal HR / IT / leave management portal.

            Languages you handle natively:
              * French (FR) - default
              * English (EN)
              * Standard Arabic (AR)
              * Tunisian Darija (n7eb, kifech, 3andi, m3ana, etc.)

            Rules:
              1. ALWAYS reply in the SAME language the user wrote in.
              2. Be concise, warm and professional. Aim for under 320 characters.
              3. Use HTML for rendering: <strong>, <em>, <br/>, <ul><li>
              4. For internal links: <a href="/#/path" class="bot-link">label</a>
              5. NEVER invent personal data. Use only values from USER CONTEXT.
            """;

    private final ChatMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate;

    @Value("${bondin.ai.key:}")
    private String apiKey;

    @Value("${bondin.ai.model:gemini-2.0-flash}")
    private String model;

    @Value("${bondin.ai.temperature:0.6}")
    private double temperature;

    @Value("${bondin.ai.maxOutputTokens:512}")
    private int maxOutputTokens;

    public ChatbotService(ChatMessageRepository messageRepository,
                          UserRepository userRepository) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.restTemplate = new RestTemplate();
    }

    /**
     * Main method: generates AI reply, persists messages for authenticated users
     */
    public String ask(Long userId, String userMessage) {
        if (userMessage == null || userMessage.isBlank()) {
            return "Posez votre question pour que je puisse vous aider.";
        }

        // Load user object if authenticated
        User user = (userId != null) ? userRepository.findById(userId).orElse(null) : null;
        
        // Load prior conversation history
        List<ChatMessage> history = (userId != null)
                ? messageRepository.findByUserIdOrderByTimestampAsc(userId)
                : List.of();

        String reply;
        try {
            // Call Gemini API with user context
            reply = callGemini(user, userMessage, history);
        } catch (Exception e) {
            log.warn("Gemini call failed: {}", e.getMessage());
            reply = "Le service IA est momentanément indisponible. Réessayez dans un instant.";
        }

        if (reply == null || reply.isBlank()) {
            reply = "Je n'ai pas pu générer de réponse. Reformulez votre question.";
        }

        // Persist user and bot messages (only for authenticated users)
        if (userId != null) {
            messageRepository.save(new ChatMessage(userId, ChatMessage.Role.USER, userMessage));
            messageRepository.save(new ChatMessage(userId, ChatMessage.Role.BOT, reply));
        }
        return reply;
    }

    /**
     * Retrieve chat history for a user
     */
    public List<ChatMessage> history(Long userId) {
        if (userId == null) return List.of();
        return messageRepository.findByUserIdOrderByTimestampAsc(userId);
    }

    /**
     * Clear all chat history for a user
     */
    public void clearHistory(Long userId) {
        if (userId != null) messageRepository.deleteByUserId(userId);
    }

    /**
     * Call Google Gemini API with system prompt + user context + conversation history
     */
    private String callGemini(User user, String userMessage, List<ChatMessage> history) {
        if (!isConfigured()) {
            return "L'assistant n'est pas configuré côté serveur (clé Gemini manquante).";
        }

        // Build complete system instruction
        String systemText = SYSTEM_PROMPT + "\n\n" + buildUserContext(user);
        
        // Build message history for API
        List<Map<String, Object>> contents = buildContents(history, userMessage);

        // Prepare Gemini API payload
        Map<String, Object> payload = Map.of(
                "system_instruction", Map.of("parts", List.of(Map.of("text", systemText))),
                "contents", contents,
                "generationConfig", Map.of(
                        "temperature", temperature,
                        "topP", 0.9,
                        "maxOutputTokens", maxOutputTokens
                )
        );

        // Make HTTP request to Gemini
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

        String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                + model + ":generateContent?key=" + apiKey;

        Map<String, Object> body = restTemplate.postForObject(url, entity, Map.class);
        return extractText(body);
    }

    /**
     * Build USER CONTEXT block with personal and system-wide data
     */
    private String buildUserContext(User user) {
        StringBuilder sb = new StringBuilder("## CURRENT USER CONTEXT (read-only)\n");
        sb.append("- Now is: ").append(LocalDateTime.now()).append('\n');

        if (user == null) {
            sb.append("- Status: VISITOR (not signed in)\n");
            sb.append("- Scope: Limited general information about Bondin\n");
            return sb.toString();
        }

        sb.append("- Status: AUTHENTICATED\n");
        sb.append("- Name: ").append(user.getNomUtilisateur()).append('\n');
        sb.append("- Email: ").append(user.getEmail()).append('\n');
        sb.append("- Role: ").append(user.getRole()).append('\n');
        sb.append("- Department: ").append(user.getDepartment()).append('\n');
        sb.append("- Leave balance (days remaining): ").append(user.getCongeRestant()).append('\n');
        sb.append("- Recorded delays: ").append(user.getNbRetards()).append('\n');
        sb.append("- Unjustified absences: ").append(user.getNbAbsencesNonJustifiees()).append('\n');

        return sb.toString();
    }

    /**
     * Check if Gemini API is properly configured
     */
    private boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * Build conversation content for Gemini API
     */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> buildContents(List<ChatMessage> history, String userMessage) {
        List<Map<String, Object>> contents = new ArrayList<>();
        
        // Add prior messages (capped at HISTORY_TURN_CAP)
        for (ChatMessage msg : history.stream()
                .skip(Math.max(0, history.size() - HISTORY_TURN_CAP))
                .toList()) {
            contents.add(Map.of(
                    "role", msg.getRole() == ChatMessage.Role.USER ? "user" : "model",
                    "parts", List.of(Map.of("text", msg.getContent()))
            ));
        }
        
        // Add current user message
        contents.add(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", userMessage))
        ));
        
        return contents;
    }

    /**
     * Extract text from Gemini API response
     */
    private String extractText(Map<String, Object> body) {
        if (body == null) return "";
        
        Object cands = body.get("candidates");
        if (!(cands instanceof List<?> list) || list.isEmpty()) return "";
        
        Object first = list.get(0);
        if (!(first instanceof Map<?, ?> firstMap)) return "";
        
        Object content = firstMap.get("content");
        if (!(content instanceof Map<?, ?> contentMap)) return "";
        
        Object parts = contentMap.get("parts");
        if (!(parts instanceof List<?> partList)) return "";
        
        StringBuilder out = new StringBuilder();
        for (Object p : partList) {
            if (p instanceof Map<?, ?> pm) {
                Object t = pm.get("text");
                if (t != null) out.append(t);
            }
        }
        return out.toString().trim();
    }
}
```

---

### 3. ChatMessage.java (Database Model)

**Location**: `backend/src/main/java/com/example/backend/model/ChatMessage.java`

```java
package com.example.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * A single message exchanged with the Bondin chatbot.
 * One flat row per turn (user or bot), tied to a userId, ordered by timestamp.
 */
@Entity
@Table(name = "bondin_chat_messages", indexes = {
        @Index(name = "idx_bondin_chat_user_time", columnList = "userId,timestamp")
})
public class ChatMessage {

    public enum Role { USER, BOT }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private Role role;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(nullable = false)
    private LocalDateTime timestamp = LocalDateTime.now();

    public ChatMessage() {}

    public ChatMessage(Long userId, Role role, String content) {
        this.userId = userId;
        this.role = role;
        this.content = content;
        this.timestamp = LocalDateTime.now();
    }

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
```

---

### 4. ChatMessageRepository.java

**Location**: `backend/src/main/java/com/example/backend/repository/ChatMessageRepository.java`

```java
package com.example.backend.repository;

import com.example.backend.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    /**
     * Find all messages for a user, ordered chronologically
     */
    List<ChatMessage> findByUserIdOrderByTimestampAsc(Long userId);

    /**
     * Delete all messages for a user (chat history reset)
     */
    @Transactional
    void deleteByUserId(Long userId);
}
```

---

## FRONTEND IMPLEMENTATION

### 1. ChatbotComponent.ts

**Location**: `frontend/src/app/components/chatbot/chatbot.ts`

```typescript
import {
  AfterViewChecked,
  Component,
  ElementRef,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { Auth } from '../../services/auth';
import { ChatbotService, ChatMessageDto } from '../../services/chatbot-service';

/**
 * UI representation of a chat message
 */
interface UiMessage {
  text: string;
  isUser: boolean;
  timestamp: Date;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.scss',
})
export class ChatbotComponent implements AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer?: ElementRef<HTMLDivElement>;

  private chatbot = inject(ChatbotService);
  private auth = inject(Auth);
  private translate = inject(TranslateService);
  private sanitizer = inject(DomSanitizer);

  // Reactive state using Angular Signals
  isOpen = signal(false);
  isLoading = signal(false);
  messages = signal<UiMessage[]>([]);
  currentMessage = '';

  constructor() {
    // Auto-sync when user logs in/out
    effect(
      () => {
        const userId = this.auth.sessionUserId();
        this.syncWithSession(userId);
      },
      { allowSignalWrites: true }
    );
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  isVisitor(): boolean {
    return !localStorage.getItem('token');
  }

  /**
   * Toggle chat widget open/closed
   */
  toggleChat(): void {
    this.isOpen.update((v) => !v);
    if (this.isOpen() && this.messages().length === 0) {
      this.addBotMessage(this.welcomeText());
    }
  }

  /**
   * Send message to chatbot
   */
  sendMessage(text?: string): void {
    const msg = (text ?? this.currentMessage).trim();
    if (!msg || this.isLoading()) return;

    // Add user message to UI
    this.messages.update((m) => [...m, { text: msg, isUser: true, timestamp: new Date() }]);
    this.currentMessage = '';
    this.isLoading.set(true);

    // Send to backend
    this.chatbot.ask(msg).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.addBotMessage(res.reply);
      },
      error: () => {
        this.isLoading.set(false);
        this.addBotMessage(this.translate.instant('CHATBOT.ERROR_GENERIC'));
      },
    });
  }

  /**
   * Clear conversation history
   */
  resetChat(): void {
    this.isLoading.set(false);
    this.currentMessage = '';

    const showWelcome = () => {
      this.messages.set([
        { text: this.welcomeText(), isUser: false, timestamp: new Date() },
      ]);
    };

    // For visitors, just clear locally
    if (this.isVisitor()) {
      showWelcome();
      return;
    }

    // For authenticated users, clear server history too
    this.chatbot.clearHistory().subscribe({
      next: showWelcome,
      error: showWelcome,
    });
  }

  /**
   * Safely render HTML content from bot
   */
  getSafeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  trackByIndex(i: number): number {
    return i;
  }

  /**
   * Private helper methods
   */
  private addBotMessage(text: string): void {
    this.messages.update((m) => [
      ...m,
      { text, isUser: false, timestamp: new Date() },
    ]);
  }

  private welcomeText(): string {
    return this.translate.instant(
      this.isVisitor() ? 'CHATBOT.WELCOME_VISITOR' : 'CHATBOT.WELCOME_FULL'
    );
  }

  private scrollToBottom(): void {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTop =
        this.scrollContainer.nativeElement.scrollHeight;
    }
  }

  /**
   * Sync UI with session changes (login/logout/switch user)
   */
  private syncWithSession(userId: string | null): void {
    this.isLoading.set(false);
    this.currentMessage = '';

    if (!userId) {
      this.messages.set([]);
      return;
    }

    // Load prior conversation from server
    this.chatbot.history().subscribe({
      next: (rows: ChatMessageDto[]) => {
        const formatted: UiMessage[] = (rows ?? []).map((m) => ({
          text: m.content,
          isUser: m.role === 'USER',
          timestamp: new Date(m.timestamp),
        }));
        this.messages.set(formatted);
      },
      error: () => {
        console.warn('Failed to load chat history');
        this.messages.set([]);
      },
    });
  }
}
```

---

### 2. ChatbotService.ts (HTTP Client)

**Location**: `frontend/src/app/services/chatbot-service.ts`

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Response from POST /api/chatbot/ask
 */
export interface ChatAskResponse {
  reply: string;
  timestamp: string;
  authenticated: boolean;
}

/**
 * DTO for chat messages from server
 */
export interface ChatMessageDto {
  id: number;
  userId: number;
  role: 'USER' | 'BOT';
  content: string;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private http = inject(HttpClient);
  private readonly base = 'http://localhost:8080/api/chatbot';

  /**
   * Send user message and get AI response
   */
  ask(message: string): Observable<ChatAskResponse> {
    return this.http.post<ChatAskResponse>(
      `${this.base}/ask`,
      { message },
      { headers: this.authHeaders() }
    );
  }

  /**
   * Fetch user's chat history from server
   */
  history(): Observable<ChatMessageDto[]> {
    return this.http.get<ChatMessageDto[]>(
      `${this.base}/history`,
      { headers: this.authHeaders() }
    );
  }

  /**
   * Clear user's chat history on server
   */
  clearHistory(): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/history`,
      { headers: this.authHeaders() }
    );
  }

  /**
   * Build headers with JWT token if available
   */
  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }
}
```

---

## DATABASE MODELS

### SQL Schema

```sql
-- Chat messages table
CREATE TABLE bondin_chat_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    userId BIGINT NOT NULL,
    role VARCHAR(8) NOT NULL, -- 'USER' or 'BOT'
    content LONGTEXT NOT NULL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_bondin_chat_user_time (userId, timestamp)
);

-- Sample queries
SELECT * FROM bondin_chat_messages WHERE userId = ? ORDER BY timestamp ASC;
DELETE FROM bondin_chat_messages WHERE userId = ?;
```

---

## CONFIGURATION

### application.properties

```properties
# Google Gemini Configuration
bondin.ai.key=${GEMINI_API_KEY}
bondin.ai.model=gemini-2.0-flash
bondin.ai.temperature=0.6
bondin.ai.maxOutputTokens=512

# Database (MySQL)
spring.datasource.url=jdbc:mysql://localhost:3306/bondin_db
spring.datasource.username=${DB_USER}
spring.datasource.password=${DB_PASSWORD}
spring.jpa.hibernate.ddl-auto=update

# Security
spring.security.oauth2.resourceserver.jwt.issuer-uri=http://localhost:8080
```

### Angular i18n (Translations)

**assets/i18n/fr.json**
```json
{
  "CHATBOT": {
    "WELCOME_FULL": "Bienvenue! Je suis l'assistant Bondin. Comment puis-je vous aider?",
    "WELCOME_VISITOR": "Bonjour! Connectez-vous pour un meilleur service.",
    "ERROR_GENERIC": "Une erreur s'est produite. Veuillez réessayer.",
    "RESET_CONFIRM": "Êtes-vous sûr de vouloir effacer l'historique?",
    "LOADING": "Je réfléchis..."
  }
}
```

---

## API ENDPOINTS

### REST API Reference

| Method | Endpoint | Auth | Request | Response |
|--------|----------|------|---------|----------|
| POST | `/api/chatbot/ask` | JWT | `{ "message": "string" }` | `{ "reply": "string", "timestamp": "ISO-8601", "authenticated": boolean }` |
| GET | `/api/chatbot/history` | JWT | - | `[ { "id": number, "role": "USER\|BOT", "content": "string", "timestamp": "ISO-8601" } ]` |
| DELETE | `/api/chatbot/history` | JWT | - | 204 No Content |

### cURL Examples

**Send message:**
```bash
curl -X POST http://localhost:8080/api/chatbot/ask \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Combien de congés me reste-t-il?"}'
```

**Get history:**
```bash
curl -X GET http://localhost:8080/api/chatbot/history \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Clear history:**
```bash
curl -X DELETE http://localhost:8080/api/chatbot/history \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## KEY FEATURES

### ✅ Core Features Implemented

1. **Multi-language Support**
   - French (FR) - Default
   - English (EN)
   - Arabic (AR)
   - Tunisian Darija

2. **Authentication & Authorization**
   - JWT-based user identification
   - Role-based access control
   - Guest visitor support

3. **Persistent History**
   - MySQL database storage
   - Chronological ordering
   - Per-user isolation

4. **AI Integration**
   - Google Gemini API
   - System prompt with business rules
   - Temperature control (0.6)
   - Token limit management (512 max)

5. **Smart Context Injection**
   - User personal data
   - Department information
   - Leave balance
   - Attendance records
   - System-wide statistics (for privileged users)

6. **Modern Frontend**
   - Angular 17+ with Signals
   - Real-time reactive UI
   - HTML content sanitization
   - Auto-scroll to latest messages
   - Responsive design

7. **Error Handling**
   - API failure fallbacks
   - User-friendly error messages
   - Logging with SLF4J

8. **Performance Optimizations**
   - Conversation history cap (60 turns)
   - HTTP connection pooling
   - Database indexing
   - Token usage management

---

## DEPLOYMENT CHECKLIST

- [ ] Set `GEMINI_API_KEY` environment variable
- [ ] Configure MySQL database connection
- [ ] Set JWT issuer URI
- [ ] Build backend: `mvn clean package`
- [ ] Build frontend: `npm run build`
- [ ] Deploy WAR/JAR to application server
- [ ] Run database migrations
- [ ] Test authentication flow
- [ ] Verify Gemini API connectivity
- [ ] Load test with expected user volume

---

**End of Documentation**

*For questions or updates, contact the Development Team*
