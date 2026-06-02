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
