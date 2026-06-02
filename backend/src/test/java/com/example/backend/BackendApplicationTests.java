package com.example.backend;

import com.example.backend.service.KnowledgeBaseMatcher;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class BackendApplicationTests {

	@Test
	void testMatcher() {
		KnowledgeBaseMatcher matcher = new KnowledgeBaseMatcher();
		
		// Test 1: "9adeh 3andi mn jours congé" -> should match Leave Balance (Entry 1)
		KnowledgeBaseMatcher.SearchResult r1 = matcher.search("9adeh 3andi mn jours congé");
		assertNotNull(r1, "Should find a match for r1");
		assertEquals(1, r1.entryId, "Should match ID 1 (Leave Balance)");
		assertTrue(r1.score > 25, "Score should be > 25: " + r1.score);

		// Test 2: "Kifech t3mel demande, statut (en attente / approuvé / refusé)" -> should match Leave Request (Entry 2) or Status (Entry 3)
		KnowledgeBaseMatcher.SearchResult r2 = matcher.search("Kifech t3mel demande, statut (en attente / approuvé / refusé)");
		assertNotNull(r2, "Should find a match for r2");
		assertTrue(r2.entryId == 2 || r2.entryId == 3, "Should match ID 2 or 3");
		assertTrue(r2.score > 25, "Score should be > 25: " + r2.score);

		// Test 3: "كيف أقدم طلب إجازة؟" -> should match Leave Request (Entry 2)
		KnowledgeBaseMatcher.SearchResult r3 = matcher.search("كيف أقدم طلب إجازة؟");
		assertNotNull(r3, "Should find a match for r3");
		assertEquals(2, r3.entryId, "Should match ID 2 (Leave Request)");
		assertTrue(r3.score > 25, "Score should be > 25: " + r3.score);

		// Test 4: "Which department is the busiest?" -> should match Entry 49
		KnowledgeBaseMatcher.SearchResult r4 = matcher.search("Which department is the busiest?");
		assertNotNull(r4, "Should find a match for r4");
		assertEquals(49, r4.entryId, "Should match ID 49");
		assertTrue(r4.score > 25, "Score should be > 25: " + r4.score);

		// Test 5: "9adeh ticket majawboch aleha?" -> should match Entry 50
		KnowledgeBaseMatcher.SearchResult r5 = matcher.search("9adeh ticket majawboch aleha?");
		assertNotNull(r5, "Should find a match for r5");
		assertEquals(50, r5.entryId, "Should match ID 50");
		assertTrue(r5.score > 25, "Score should be > 25: " + r5.score);

		// Test 6: "9adeh ticket IT w RH?" -> should match Entry 51
		KnowledgeBaseMatcher.SearchResult r6 = matcher.search("9adeh ticket IT w RH?");
		assertNotNull(r6, "Should find a match for r6");
		assertEquals(51, r6.entryId, "Should match ID 51");
		assertTrue(r6.score > 25, "Score should be > 25: " + r6.score);

		// Test 7: "total tickets" -> should match Entry 52
		KnowledgeBaseMatcher.SearchResult r7 = matcher.search("total tickets");
		assertNotNull(r7, "Should find a match for r7");
		assertEquals(52, r7.entryId, "Should match ID 52");
		assertTrue(r7.score > 25, "Score should be > 25: " + r7.score);

		// Test 8: "chkoun aktherhom retard?" -> should match Entry 53
		KnowledgeBaseMatcher.SearchResult r8 = matcher.search("chkoun aktherhom retard?");
		assertNotNull(r8, "Should find a match for r8");
		assertEquals(53, r8.entryId, "Should match ID 53");
		assertTrue(r8.score > 25, "Score should be > 25: " + r8.score);
		
		System.out.println("ALL CHATBOT MATCHING TESTS PASSED SUCCESSFULLY!");
		System.out.println("Score 1: " + r1.score);
		System.out.println("Score 2: " + r2.score);
		System.out.println("Score 3: " + r3.score);
		System.out.println("Score 4: " + r4.score);
		System.out.println("Score 5: " + r5.score);
		System.out.println("Score 6: " + r6.score);
		System.out.println("Score 7: " + r7.score);
		System.out.println("Score 8: " + r8.score);
	}

}
