package com.example.backend.controller;

import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "http://localhost:4200")
public class NotificationController {

    private static List<Map<String, Object>> mockNotifs = new ArrayList<>();

    static {
        Map<String, Object> n1 = new HashMap<>();
        n1.put("id", 1);
        n1.put("message", "Nouveau message RH disponible.");
        n1.put("timestamp", new Date());
        n1.put("read", false);
        n1.put("icon", "📋");
        mockNotifs.add(n1);
    }

    @GetMapping
    public List<Map<String, Object>> getNotifications() {
        return mockNotifs;
    }

    @PatchMapping("/{id}/read")
    public void markAsRead(@PathVariable int id) {
        for (Map<String, Object> n : mockNotifs) {
            if ((int) n.get("id") == id) {
                n.put("read", true);
            }
        }
    }

    @PatchMapping("/read-all")
    public void markAllAsRead() {
        for (Map<String, Object> n : mockNotifs) {
            n.put("read", true);
        }
    }
}
