package com.example.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Fuzzy/keyword-based knowledge base search engine for chatbot.
 * Matches user questions to predefined Q&A entries.
 */
public class KnowledgeBaseMatcher {
    private static final Logger log = LoggerFactory.getLogger(KnowledgeBaseMatcher.class);
    private final List<KnowledgeBaseEntry> entries;

    public static class KnowledgeBaseEntry {
        public int id;
        public String category;
        public List<String> keywords;
        public List<String> questions;
        public String answer;
    }

    public static class SearchResult {
        public int entryId;
        public double score;
        public String answer;
        public String category;

        public SearchResult(int entryId, double score, String answer, String category) {
            this.entryId = entryId;
            this.score = score;
            this.answer = answer;
            this.category = category;
        }
    }

    public KnowledgeBaseMatcher() {
        this.entries = new ArrayList<>();
        loadKnowledgeBase();
    }

    /**
     * Loads the knowledge base from JSON resource.
     */
    @SuppressWarnings("unchecked")
    private void loadKnowledgeBase() {
        try {
            ClassLoader classLoader = getClass().getClassLoader();
            InputStream is = classLoader.getResourceAsStream("chatbot-knowledge-base.json");
            if (is == null) {
                log.warn("Knowledge base file not found. Chatbot will fall back to generic responses.");
                return;
            }

            ObjectMapper mapper = new ObjectMapper();
            Map<String, List<Map<String, Object>>> data = mapper.readValue(is, new TypeReference<>() {
            });

            List<Map<String, Object>> kbList = data.get("knowledge_base");
            if (kbList != null) {
                for (Map<String, Object> entryMap : kbList) {
                    KnowledgeBaseEntry entry = new KnowledgeBaseEntry();
                    entry.id = ((Number) entryMap.get("id")).intValue();
                    entry.category = (String) entryMap.get("category");
                    entry.keywords = (List<String>) entryMap.getOrDefault("keywords", new ArrayList<>());
                    entry.questions = (List<String>) entryMap.getOrDefault("questions", new ArrayList<>());
                    entry.answer = (String) entryMap.get("answer");
                    entries.add(entry);
                }
                log.info("Loaded {} knowledge base entries", entries.size());
            }
        } catch (Exception e) {
            log.error("Failed to load knowledge base: {}", e.getMessage(), e);
        }
    }

    /**
     * Searches the knowledge base for the best match to the user's question.
     * 
     * @param userQuestion The question asked by the user
     * @return The best matching SearchResult, or null if no good match found
     */
    public SearchResult search(String userQuestion) {
        if (userQuestion == null || userQuestion.isBlank()) {
            return null;
        }

        String normalized = normalizeText(userQuestion);
        List<SearchResult> results = new ArrayList<>();

        for (KnowledgeBaseEntry entry : entries) {
            double score = calculateScore(normalized, entry);
            if (score > 0) {
                results.add(new SearchResult(entry.id, score, entry.answer, entry.category));
            }
        }

        if (results.isEmpty()) {
            return null;
        }

        // Sort by score descending and return the best match
        results.sort(Comparator.comparingDouble((SearchResult r) -> r.score).reversed());
        return results.get(0);
    }

    /**
     * Calculates relevance score between user input and knowledge base entry (0-100).
     */
    private double calculateScore(String normalized, KnowledgeBaseEntry entry) {
        double keywordScore = calculateKeywordScore(normalized, entry.keywords);
        double questionScore = calculateQuestionScore(normalized, entry.questions);

        // Weighted average: keywords 40%, questions 60%
        return (keywordScore * 0.4) + (questionScore * 0.6);
    }

    /**
     * Scores based on keyword matches with partial matching support.
     */
    private double calculateKeywordScore(String normalized, List<String> keywords) {
        if (keywords == null || keywords.isEmpty()) {
            return 0;
        }

        long matches = 0;
        for (String kw : keywords) {
            String normKw = normalizeText(kw);
            // Exact match
            if (normalized.contains(normKw)) {
                matches++;
            }
            // Partial match (keyword is at least 3 chars and user input contains part of it)
            else if (normKw.length() >= 3 && normalized.length() >= 3) {
                // Check if any 3+ char substring of keyword exists in user input
                for (int i = 0; i <= normKw.length() - 3; i++) {
                    String substring = normKw.substring(i, Math.min(i + 4, normKw.length()));
                    if (normalized.contains(substring)) {
                        matches += 0.5; // Partial match gives half credit
                        break;
                    }
                }
            }
        }

        return Math.min(100, (matches / (double) keywords.size()) * 100);
    }

    /**
     * Scores based on fuzzy matching against predefined questions.
     * Uses improved token-based matching with lower threshold.
     */
    private double calculateQuestionScore(String normalized, List<String> questions) {
        if (questions == null || questions.isEmpty()) {
            return 0;
        }

        double maxScore = 0;
        for (String question : questions) {
            double similarity = calculateSimilarity(normalized, normalizeText(question));
            maxScore = Math.max(maxScore, similarity);
        }

        // Lowered threshold from 50% to 30% to catch more matches
        return maxScore > 0.30 ? maxScore * 100 : 0;
    }

    /**
     * Calculates similarity between two strings using improved token-based matching.
     * Returns value between 0 and 1.
     */
    private double calculateSimilarity(String s1, String s2) {
        String[] tokens1 = s1.split("\\s+");
        String[] tokens2 = s2.split("\\s+");

        double commonTokens = 0;
        for (String token1 : tokens1) {
            for (String token2 : tokens2) {
                // Exact match
                if (token1.equals(token2)) {
                    commonTokens++;
                    break;
                }
                // Fuzzy match for tokens of 3+ chars using Levenshtein-like approach
                else if (token1.length() >= 3 && token2.length() >= 3) {
                    double tokenSimilarity = calculateTokenSimilarity(token1, token2);
                    if (tokenSimilarity >= 0.6) {
                        commonTokens += tokenSimilarity; // Partial credit for fuzzy match
                        break;
                    }
                }
            }
        }

        int totalTokens = Math.max(tokens1.length, tokens2.length);
        return totalTokens > 0 ? commonTokens / (double) totalTokens : 0;
    }

    /**
     * Calculates similarity between two individual tokens using character overlap.
     * Returns value between 0 and 1.
     */
    private double calculateTokenSimilarity(String t1, String t2) {
        int maxLen = Math.max(t1.length(), t2.length());
        if (maxLen == 0) return 0;

        // Count matching characters
        int matches = 0;
        for (int i = 0; i < Math.min(t1.length(), t2.length()); i++) {
            if (t1.charAt(i) == t2.charAt(i)) {
                matches++;
            }
        }

        // Also check if one is a substring of the other
        if (t1.contains(t2) || t2.contains(t1)) {
            return Math.min(1.0, (double) Math.min(t1.length(), t2.length()) / maxLen);
        }

        return (double) matches / maxLen;
    }

    /**
     * Normalizes text for matching:
     * - lowercase
     * - remove accents
     * - remove punctuation
     * - trim
     */
    private String normalizeText(String text) {
        if (text == null) return "";
        String normalized = text.toLowerCase(Locale.ROOT);
        normalized = java.text.Normalizer.normalize(normalized, java.text.Normalizer.Form.NFD);
        normalized = normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        normalized = normalized.replaceAll("[^a-z0-9\\u0600-\\u06FF\\s]", "");
        normalized = normalized.replaceAll("\\s+", " ");
        return normalized.trim();
    }

    /**
     * Replaces placeholders in the answer template with actual user data.
     */
    public String populateAnswer(String template, Map<String, String> data) {
        if (template == null) return "";
        String result = template;
        if (data != null) {
            for (Map.Entry<String, String> entry : data.entrySet()) {
                result = result.replace("{" + entry.getKey() + "}", entry.getValue());
            }
        }
        return result;
    }
}
