package com.example.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * One-shot cleanup of legacy chatbot tables left in the persistent H2 dev database
 * by a previous (now deleted) version of the chatbot. Hibernate's ddl-auto=update
 * cannot reconcile those old schemas with the new {@link com.example.backend.model.ChatMessage}
 * entity, so we drop them outright. Safe: these tables are unused by the rest of the app.
 */
@Configuration
public class ChatbotSchemaCleanup {

    private static final Logger log = LoggerFactory.getLogger(ChatbotSchemaCleanup.class);

    private static final String[] LEGACY_TABLES = {
            "chat_messages",          // older single-table chatbot history
            "chatbot_interactions",   // previous Gemini conversation rows
            "chatbot_conversations"   // previous Gemini conversation headers
    };

    @Bean
    CommandLineRunner dropLegacyChatbotTables(JdbcTemplate jdbc) {
        return args -> {
            for (String table : LEGACY_TABLES) {
                try {
                    jdbc.execute("DROP TABLE IF EXISTS " + table);
                    log.info("Dropped legacy chatbot table (if existed): {}", table);
                } catch (Exception e) {
                    log.warn("Could not drop legacy table {}: {}", table, e.getMessage());
                }
            }
        };
    }
}
