package com.example.backend.controller;

import com.example.backend.model.Message;
import com.example.backend.repository.MessageRepository;
import com.example.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/messages")
@CrossOrigin(origins = "*")
public class MessageController {

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Message>> getUserMessages(@PathVariable Long userId) {
        List<Message> messages = messageRepository.findBySenderIdOrReceiverIdOrIsBroadcastTrueOrderByTimestampAsc(userId, userId);
        messages.forEach(this::enrichMessage);
        return ResponseEntity.ok(messages);
    }

    @GetMapping("/admin")
    public ResponseEntity<List<Message>> getAllAdminMessages() {
        List<Message> messages = messageRepository.findAll();
        messages.forEach(this::enrichMessage);
        messages.sort((m1, m2) -> m1.getTimestamp().compareTo(m2.getTimestamp()));
        return ResponseEntity.ok(messages);
    }

    @PostMapping("/send")
    public ResponseEntity<Message> sendMessage(@RequestBody Message message) {
        message.setTimestamp(LocalDateTime.now());
        Message saved = messageRepository.save(message);
        enrichMessage(saved);
        return ResponseEntity.ok(saved);
    }

    private void enrichMessage(Message m) {
        if (m.getSenderId() != null) {
            userRepository.findById(m.getSenderId()).ifPresent(user -> {
                m.setSenderName(user.getNomUtilisateur());
            });
        }
        if (m.getSenderName() == null || m.getSenderName().isEmpty()) {
            m.setSenderName("Admin (Ladin)");
        }
    }
}
