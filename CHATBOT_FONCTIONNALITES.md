# Assistant Bondin — Chnou y9der ydir el chatbot

Hadhaya documentation kamlé 3la chatbot li mدمج f portail interne **Maison Bondin** (RH / IT / congés / requêtes).

---

## 1. Chnou hiya bessah

| 7aja | Tafsil |
|------|--------|
| **Essem** | Bondin Assistant |
| **Dour** | Assistant IA dakhli — l-employés, RH, IT w l-administrateurs |
| **Moteur IA** | Google Gemini (`bondin.ai.model`, par défaut `gemini-2.5-flash`) |
| **T7fadh el conversation** | Kol utilisateur mconnecté — l'historique yt7fed f base (`bondin_chat_messages`) |
| **Visiteur** | Ey, bla JWT — ma famaach historique 3la serveur |

El chatbot yjaweb b **prompt système** kbir + bloc **USER CONTEXT** (données réelles mte3ek w, selon rôle, statistiques globales).

---

## 2. Interface (frontend)

Widget flottant f kol l'application (`app-chatbot`).

### Chnou tchouf f UI

- **Bouton** 💬 bach tfata7 / tsakker el chat
- **Messages mte3ek** : texte 3adi
- **Messages bot** : HTML (gras, italique, listes, liens dakhli l-portail)
- **Typing** (3 points) wa9t ma t9ol message
- **Scroll automatique** l-a5er message
- **Nouvelle conversation** (↻) : ymsa7 l'historique local + `DELETE /api/chatbot/history` ila mconnecté
- **Traduction UI** : FR / EN / AR (`CHATBOT.*` f fichiers i18n)

### Modes

| Mode | Chnou y7ot | Message d'accueil |
|------|------------|-------------------|
| **Employé mconnecté** | JWT mawjoud | Données personnelles (congés, demandes…) |
| **Visiteur** | Ma famaach token | Infos générales Bondin + connecte-toi |

Wa9t tconnecti / tdeconnecti, l'historique **ytzammem** automatiquement m3a serveur.

---

## 3. API REST (backend)

Base : `http://localhost:8080/api/chatbot`

| Méthode | Endpoint | Auth | Chnou ydir |
|---------|----------|------|------------|
| `POST` | `/ask` | Ikhtiyari (Bearer JWT) | Tib3ath message, tjib `{ reply, timestamp, authenticated }` |
| `GET` | `/history` | **Lazem** | Kol el messages mte3ek (USER + BOT) |
| `DELETE` | `/history` | **Lazem** | Ymsa7 kol l'historique |

**Corps `/ask` :**
```json
{ "message": "9adeh 3andi congé ba9i ?" }
```

---

## 4. Lougouet li yfhémhom

El bot **yraj3lek b nefs lougouet** li ktebt biha :

- **Français** (par défaut)
- **Anglais**
- **Arabe standard**
- **Darija tunisienne** b lettres latin/arabeizi (`n7eb`, `kifech`, `3andi`, `conge`, `mdp`, `9adeh`, `chkoun`…)

Ila ktebt b darija, yemken yjawbek b français wala y7afed 3la style tunisien selon el contexte.

---

## 5. Données li ytبعثو l-Gemini (USER CONTEXT)

Kol marra ts2el, serveur ybni contexte **9ra bark** — el bot **mamnou3** yخترع chiffres personnels.

### 5.1 Kol wa7ed (même visiteur)

- Date w heure daba
- **A5er ayam fériés tunisiens** (calendrier civil : 1 janvier, 14 janvier, 20 mars…)
- Fêtes islamiques (Aïd, Mawlid…) : dates lunaires — **ma yخترعch** dates grégoriennes

### 5.2 Mconnecté (kol rôles)

| Donnée | Menin |
|--------|-------|
| Essem, email, rôle, département | `User` |
| Solde congé ba9i | `congeRestant` |
| 9adeh retard 3andek | `nbRetards` |
| Absences ma justifietch | `nbAbsencesNonJustifiees` |
| Tickets mte3ek (total / mazal / résolus) | `Reclamation` |

#### HR INSIGHTS (yt7seb automatiquement)

- **Probabilité** demande congé tett9bel (0–100 %)
- **Risque refus** : `low` / `medium` / `high`
- Solde kafi l-youm wa7ed / ~semaine
- **Statut sanction retards** (3 retards = avertissement)
- 9adeh retard 9bal ma ytna9es 1 jour congé (**5 retards = −1 jour**)
- Ayam déjà tn9asou men retards
- **A7sen wa9t** bach t5od congé (y7eb yjannib juin–août, pic café)
- Demandes **crédit RH** mazal f Requêtes

### 5.3 ADMIN / RH / IT — stats système

**Tickets kol el système** (`SYSTEM-WIDE TICKETS`) :

- Total, mazal ma résolus, résolus
- B statut w b catégorie (IT, RH…)
- **Charge par département**
- **Ana akther département charjé**

El bot **lézem** yjib chiffres m3a stats — **ma y9olch** « ma 3andich access ».

### 5.4 ADMIN / RH bark — classement présence

**Leaderboard** (`ATTENDANCE LEADERBOARD`) :

- Top 5 b akther **retards**
- Top 5 b akther **absences ma justifietch**
- « Chkoun akther retard » / « chkoun akther absence »

Employé 3adi **ma ychoufch** hadhouma (confidentialité).

---

## 6. Chnou y9der yjaweb 3lih

### 6.1 Congés w absences

- Solde ba9i, ch7al khellit cette année (30 j/an)
- Kifech t3mel demande, statut (en attente / approuvé / refusé)
- Anw3 : annuel, zouaj (3 j), weld (3 j), wafa (3 j), déménagement (1 j)
- Préavis (≥ 7 j, a7sen 15 j)
- Report solde **31 mars** année jeya
- Tannuli / tbeddel tant ma « en attente »
- Retards w impact 3la solde (kol 5 retards)
- Probabilité acceptation w conseils

### 6.2 Retards w sanctions

- Pointage : 08:00–20:00, retard automatique ba3d **08:30**
- **5 retards** → −1 jour congé (auto)
- **3 retards ma justifietch** → avertissement, puis mise à pied, puis licenciement
- Justification **48 h**

### 6.3 Crédit RH

- Demande men **Requêtes** (catégorie RH, sujet « Demande de crédit »)
- Statut (Pending / En cours / Résolu)
- RH yraj3lek ~**5 jours ouvrés**

### 6.4 Tickets / requêtes IT w RH

- 9adeh tickets 3andek
- Staff : stats globales, IT vs RH, département charjé
- Mochkla technique → 2–3 étapes + lien ticket

### 6.5 Liens f portail (ycliqui 3lihom f réponse)

| Page | Route |
|------|-------|
| Dashboard | `/#/dashboard` |
| Congés | `/#/dashboard?view=leave` |
| Gestion congés RH | `/#/dashboard?view=rh-leave` |
| Users admin | `/#/dashboard?view=admin-users` |
| Requêtes / tickets | `/#/requests` |
| Profil | `/#/afficherprofil` |
| Beddel mot de passe | `/#/change-password` |
| Nsit mot de passe | `/#/forgot-password` |
| Login / register | `/#/login`, `/#/register` |

Format lien : `<a href="/#/path" class="bot-link">label</a>`

### 6.6 Compte w profil

- Beddel mot de passe
- Chouf / beddel profil
- Visiteur : login / register bark

### 6.7 FAQ — 61 questions RH

El prompt fih réponses l-**61 questions** :

1. **Congés w solde** (Q1–Q13)
2. **Absences w justificatifs** (Q14–Q30)
3. **Délais w sanctions** (Q19–Q22, Q31–Q32, Q46)
4. **Crédits** (Q33–Q45)
5. **Politiques w contact RH** (Q47–Q61)

Exemples li yfhémhom (FR / EN / AR / Darija) :

- « Combien de jours de congé me restent-ils ? »
- « 9adeh ticket IT mazlet ? »
- « anehom nharat lfichta jeyin ? »
- « chkoun aktherhom retard ? » (ADMIN/RH)
- « Quelle est la probabilité que ma demande soit acceptée ? »

---

## 7. Mémoire w limites techniques

| Paramètre | Valeur |
|-----------|--------|
| Historique l-Gemini | **60 derniers messages** max |
| Tokens sortie | `bondin.ai.maxOutputTokens` (défaut 512) |
| Température | `bondin.ai.temperature` (défaut 0.25) |
| Timeout Gemini | connexion 8 s, lecture 25 s |
| Tawil réponse | ~320 caractères (procédures → liste courte) |

### Ila fama mochkla

| Situation | Chnou ygoul |
|-----------|-------------|
| Clé Gemini ma mawjoudach | « L'assistant n'est pas configuré… » |
| API / réseau | « Le service IA est momentanément indisponible… » |
| Réponse vide | « Je n'ai pas pu générer de réponse… » |
| Erreur frontend | `CHATBOT.ERROR_GENERIC` |

**Ma famaach FAQ hors-ligne** — ila IA maw9f, tchouf erreur wada7a.

---

## 8. Configuration serveur

Fichier : `backend/src/main/resources/application.properties`

```properties
bondin.ai.key=${BONDIN_AI_KEY:...}
bondin.ai.model=${BONDIN_AI_MODEL:gemini-2.5-flash}
bondin.ai.temperature=${BONDIN_AI_TEMPERATURE:0.25}
bondin.ai.maxOutputTokens=${BONDIN_AI_MAX_OUTPUT_TOKENS:512}
```

F production : **`BONDIN_AI_KEY`** f variable d'environnement.

---

## 9. Qawanin Bondin (référence sari7a)

El bot ysta3mel hadhouma — **ma ybeddelch** :

- **30 jours/an** congé (~2,5 j/chhar)
- Validation manager + RH (~**48 h**)
- Justificatif absence **48 h**
- Report solde : **31 mars** année jeya
- Déduction solde : wa9t **RH y9bel**
- Sanctions retards : **5** (tn9es congé) w **3** (avertissement)
- Exceptionnels : zouaj / weld / wafa **3 j**, déménagement **1 j**

---

## 10. Chkoun ychouf chnou (selon rôle)

| Fonctionnalité | EMPLOYEE | IT | RH | ADMIN | Visiteur |
|----------------|:--------:|:--:|:--:|:-----:|:--------:|
| FAQ générale w fériés | ✅ | ✅ | ✅ | ✅ | ✅ |
| Données personnelles (congés, retards…) | ✅ | ✅ | ✅ | ✅ | ❌ |
| HR Insights (score, risque…) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Tickets personnels | ✅ | ✅ | ✅ | ✅ | ❌ |
| Stats tickets **système** | ❌ | ✅ | ✅ | ✅ | ❌ |
| Classement retards/absences | ❌ | ❌ | ✅ | ✅ | ❌ |
| Historique m7fed | ✅ | ✅ | ✅ | ✅ | ❌ |

---

## 11. Fichiers source

| Couche | Fichier |
|--------|---------|
| Logique IA + contexte | `backend/.../service/ChatbotService.java` |
| API REST | `backend/.../controller/ChatbotController.java` |
| Modèle message | `backend/.../model/ChatMessage.java` |
| Client Angular | `frontend/src/app/services/chatbot-service.ts` |
| Composant UI | `frontend/src/app/components/chatbot/` |

---

## 12. Exemples bach ttesti

**Kol employé :**
```
9adeh 3andi congé ba9i ?
Kifech n3mel demande congé ?
9adeh retard 3andi ?
3andi absences ma justifietch ?
Anehom nharat lfichta jeyin ?
Kifech nbaddel mot de passe ?
Statut demande crédit mte3i chnou ?
```

**IT / RH / ADMIN :**
```
9adeh ticket IT mazal ma résolus ?
Ana département akther charjé ?
```

**RH / ADMIN bark :**
```
Chkoun 3andou akther retards f l'entreprise ?
```

---

*Men code source mte3 projet `stage-finale`. A5er mise à jour : mai 2026.*
