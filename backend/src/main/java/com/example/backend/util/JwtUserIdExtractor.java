package com.example.backend.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Base64;

/**
 * Extracts userId from the app's login token (second Base64 segment is JSON with userId).
 */
public final class JwtUserIdExtractor {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private JwtUserIdExtractor() {}

    public static Long extractUserId(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return null;
        }
        String token = authorizationHeader.substring(7).trim();
        String[] parts = token.split("\\.");
        if (parts.length < 2) {
            return null;
        }
        try {
            byte[] decoded = Base64.getDecoder().decode(parts[1]);
            JsonNode root = MAPPER.readTree(decoded);
            if (root.has("userId") && root.get("userId").canConvertToLong()) {
                return root.get("userId").asLong();
            }
        } catch (Exception ignored) {
            // malformed token
        }
        return null;
    }
}
