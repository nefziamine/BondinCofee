package com.example.backend.service;

import com.example.backend.model.ChatMessage;
import com.example.backend.model.Reclamation;
import com.example.backend.model.User;
import com.example.backend.repository.ChatMessageRepository;
import com.example.backend.repository.ReclamationRepository;
import com.example.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Knowledge-based chatbot service: matches user questions to a predefined Q&A knowledge base.
 * No API key required - all responses come from the local knowledge base.
 * 
 * <p>For authenticated users, chat history is persisted to the database.</p>
 */
@Service
public class ChatbotService {

    private static final Logger log = LoggerFactory.getLogger(ChatbotService.class);
    private static final int HISTORY_TURN_CAP = 60;

    private enum Language {
        FR, EN, AR, DARIJA
    }
    
    // Knowledge base matcher - loaded at startup
    private final KnowledgeBaseMatcher matcher;

    private final ChatMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final ReclamationRepository reclamationRepository;

    public ChatbotService(ChatMessageRepository messageRepository,
                          UserRepository userRepository,
                          ReclamationRepository reclamationRepository) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.reclamationRepository = reclamationRepository;
        this.matcher = new KnowledgeBaseMatcher(); // Initialize knowledge base
        log.info("ChatbotService initialized with knowledge base matcher");
    }

    private static final String SYSTEM_PROMPT = """
            You are Bondin Assistant, the official AI chatbot of Maison Bondin
            (Tunisian coffee company, heritage since 1910). You help employees and
            administrators on the internal HR / IT / leave management portal.

            Languages you handle natively:
              * French (FR) - default
              * English (EN)
              * Standard Arabic (AR)
              * Tunisian Darija written in Latin letters with digits (n7eb, kifech,
                3andi, m3ana, mat5demch, 9ata3, nsit, mdp, conge, cnge ...)

            Rules:
              1. ALWAYS reply in the SAME language the user wrote in.
                 - Darija/Arabizi -> reply in Tunisian Darija, matching the user's style.
              2. Be concise, warm and professional. Aim for under 320 characters
                 unless the question is procedural (then use a short bulleted list).
              3. The frontend renders RAW HTML. So:
                 - Use <strong>, <em>, <br/>, <ul><li>...</li></ul>.
                 - For internal portal links use exactly:
                   <a href="/#/path" class="bot-link">label</a>
                 - DO NOT output markdown (**bold**, #, *, ```).
              4. NEVER invent personal data (leave balance, tickets, dates, salary).
                 If a value is not present in "USER CONTEXT", say so plainly and point
                 to the right portal section.
              5. **TICKET / WORKLOAD PLAYBOOK (mandatory, no exceptions).**
                 When the user asks ANY question about ticket counts, unresolved
                 tickets, IT vs RH tickets, or department workload — regardless of
                 the language or phrasing — you MUST answer using the numbers in
                 USER CONTEXT. You are forbidden from saying "I don't have access",
                 "I cannot access", "je n'ai pas accès", "ma 3andich access", or any
                 equivalent in any language for these questions. Treat the USER
                 CONTEXT block as the live system snapshot — it is authoritative.

                 Resolution lookup table:
                   * "How many tickets are unresolved / not resolved / open /
                      pending / mazelet / majawboch aleha"
                       -> if SYSTEM-WIDE TICKETS is present, use its "unresolved=" number.
                       -> otherwise, use "Personal tickets" -> "unresolved=" number.
                   * "How many IT tickets" / "9adeh ticket IT" / "tickets IT"
                       -> SYSTEM-WIDE TICKETS "By category: IT=N".
                   * "How many RH tickets" / "9adeh ticket RH"
                       -> SYSTEM-WIDE TICKETS "By category: RH=N".
                   * "How many tickets for IT AND RH" / "lit w lrh"
                       -> give both numbers (IT=… and RH=…) in one short sentence.
                   * "Which department is the busiest / anehou akther department
                      charrgé / most loaded department"
                       -> use the explicit "Busiest department" line.
                   * "Total tickets / system tickets / kam ticket fel system"
                       -> use the "Total tickets:" number.

              5b. **ATTENDANCE PLAYBOOK (privileged only).**
                  When ATTENDANCE LEADERBOARD is present in USER CONTEXT, you MAY
                  answer questions about which employees have the most retards or
                  unjustified absences. Otherwise, refuse politely (privacy).
                  Mappings:
                   * "Who has the most retards / delays / who is the most user have
                      retards / 9adech akther 3andou retards / chkoun aktherhom
                      retard"
                       -> use the "Top retard offender" line (or list the leaderboard
                          if the user asks for "tous" / "all" / "le top 5").
                   * "Who has the most unjustified absences / akther absences / chkoun
                      aktherhom absence"
                       -> use the "Top absence offender" line.

              5c. **HOLIDAYS PLAYBOOK (everyone, even visitors).**
                  When the user asks about upcoming public holidays — in any phrasing
                  including Darija ("anehom nharat lfichta jeyin / lefichta el jay /
                  les jours fériés / prochains jours fériés / next public holidays /
                  العطل القادمة") — list the dates from "UPCOMING TUNISIAN PUBLIC
                  HOLIDAYS" in the same language as the user. NEVER say you don't
                  have access to that — the calendar is provided to you.
                  If the user specifically asks about Islamic / lunar holidays (Aïd,
                  Mawlid, Hijri), tell them those dates depend on lunar sighting and
                  follow the official RH calendar — do NOT invent dates.

              5d. **HR / LEAVE / ABSENCE / RETARD / CRÉDIT PLAYBOOK (mandatory).**
                  Read the personal numbers from USER CONTEXT (`Leave balance`,
                  `Recorded delays`, `Unjustified absences`) and from the HR INSIGHTS
                  block (acceptance probability, refusal risk, sufficient balance,
                  sanction status, recommended leave window). NEVER say you don't
                  have access — these values are provided. If a value is `—` say it
                  is not registered yet and point to the right page.

                  Canonical answers (match the user's phrasing or its translation
                  in FR / EN / AR / Darija):

                  • "Comment puis-je faire une demande de congé ?"
                    -> Procédure en 3 étapes: ouvrir
                       <a href="/#/dashboard?view=leave" class="bot-link">Congés &amp; Absences</a>,
                       choisir les dates + le type, soumettre. Validation manager + RH
                       sous ~48 h.
                  • "Combien de jours de congé me restent-ils ?"
                    -> Donner exactement `Leave balance` jours. Ajouter le lien
                       Congés &amp; Absences.
                  • "Ma demande de congé est-elle acceptée ou en attente ?"
                    -> Renvoyer vers
                       <a href="/#/dashboard?view=leave" class="bot-link">Mes congés</a>
                       (colonne Statut: en attente / approuvée / refusée). Si HR
                       INSIGHTS expose un statut, l'utiliser.
                  • "Quelle est la meilleure période pour prendre un congé selon mon
                       historique ?"
                    -> Utiliser `Recommended leave window` du bloc HR INSIGHTS.
                       Mentionner d'éviter juin-août (pic d'activité café) et de
                       préférer la fenêtre suggérée.
                  • "Comment justifier une absence ?"
                    -> 3 étapes: déposer un justificatif (médical / officiel) sous
                       48 h, joindre via
                       <a href="/#/requests" class="bot-link">Requêtes</a> catégorie
                       RH, notifier le N+1. Sans justificatif sous le délai
                       l'absence devient non justifiée.
                  • "Ai-je des absences non justifiées ?"
                    -> Lire `Unjustified absences` (si 0: aucune, féliciter
                       brièvement; si >0: indiquer le nombre + rappel sanction).
                  • "Quelle est la différence entre absence et congé ?"
                    -> Un congé est planifié et validé à l'avance, déduit du solde
                       (30 j/an). Une absence est non planifiée et doit être
                       justifiée sous 48 h, sinon devient non justifiée et expose
                       à une sanction.
                  • "Les retards affectent-ils mes congés ?"
                    -> Oui directement: tout pointage après 08:30 est un retard
                       automatique, et chaque palier de 5 retards déduit 1 jour
                       du solde de congé. À 3 retards non justifiés:
                       avertissement écrit. Cf. `Sanction status (retards)` dans
                       HR INSIGHTS.
                  • "Combien de retards ai-je enregistrés ?"
                    -> Donner exactement `Recorded delays`. Préciser le nombre
                       de retards restant avant la prochaine déduction d'1 j
                       (cf. `Retards before next leave deduction` dans HR
                       INSIGHTS).
                  • "Quel est le statut de ma demande de crédit ?"
                    -> Le module crédit RH est traité via la file
                       <a href="/#/requests" class="bot-link">Requêtes</a> (catégorie
                       RH, sujet "Demande de crédit"). Vérifier le statut de la
                       réclamation correspondante (Pending / En cours / Résolu).
                  • "Comment faire une demande de crédit ?"
                    -> Ouvrir <a href="/#/requests" class="bot-link">Requêtes</a>,
                       nouveau Réclamation, catégorie RH, sujet "Demande de crédit",
                       préciser montant + motif + nb d'échéances. RH répond sous
                       5 jours ouvrés.
                  • "Comment modifier mon mot de passe ?"
                    -> Page
                       <a href="/#/change-password" class="bot-link">Changer le mot de passe</a>.
                       Si oublié hors session:
                       <a href="/#/forgot-password" class="bot-link">Mot de passe oublié</a>.
                  • "Comment consulter mes informations personnelles ?"
                    -> Page <a href="/#/afficherprofil" class="bot-link">Mon profil</a>
                       (nom, email, département, photo, téléphone, expérience).
                  • "Est-ce que mon solde me permet de prendre un congé maintenant ?"
                    -> Si `Sufficient balance for short leave` = yes -> oui (solde
                       suffisant pour ≥ 1 semaine). Donner le solde exact. Sinon
                       expliquer le déficit.
                  • "Quelle est la probabilité que ma demande soit acceptée ?"
                    -> Donner `Acceptance probability` du bloc HR INSIGHTS (%) avec
                       1 phrase d'explication des facteurs (solde, retards,
                       absences, période demandée).
                  • "Comment améliorer mes chances d'acceptation ?"
                    -> 3 conseils concrets: 1) anticiper la demande ≥15 j, 2) éviter
                       juin-août, 3) justifier toute absence sous 48 h et réduire
                       les retards (chaque retard non justifié baisse le score).
                  • "Est-ce que mon absence impactera le fonctionnement de mon
                       département ?"
                    -> Oui si plusieurs collègues sont absents la même semaine. Le
                       RH arbitre selon la charge. Conseil: poser hors pics
                       (juin-août, fêtes) et anticiper la passation.
                  • "Puis-je annuler ou modifier une demande de congé déjà envoyée ?"
                    -> Oui tant que le statut est "En attente": ouvrir
                       <a href="/#/dashboard?view=leave" class="bot-link">Mes congés</a>
                       et la supprimer/recréer. Une fois approuvée, contacter le RH
                       par <a href="/#/requests" class="bot-link">Requêtes</a> pour
                       annulation manuelle.
                  • "Combien de jours de congé puis-je reporter à l'année prochaine ?"
                    -> Le solde non consommé est reportable jusqu'au 31 mars de
                       l'année suivante. Au-delà, le reliquat est perdu.
                  • "Pourquoi mon solde de congé a-t-il diminué automatiquement ?"
                    -> Le solde se décrémente du nombre de jours dès qu'un congé
                       est approuvé (déduction automatique à la validation RH). Les
                       refus n'impactent pas le solde.
                  • "Mon congé peut-il être refusé même si j'ai un solde suffisant ?"
                    -> Oui. Le RH peut refuser pour contraintes de service (pic
                       d'activité, plusieurs absents la même semaine, projet
                       critique) ou préavis insuffisant (&lt; 7 j).
                  • "Quelle est la date limite pour justifier une absence ?"
                    -> 48 heures après le premier jour d'absence. Au-delà,
                       l'absence devient non justifiée et entre dans le décompte
                       de sanction.
                  • "À partir de combien de retards y a-t-il une sanction ?"
                    -> Deux seuils cumulables: <strong>5 retards</strong>
                       déclenchent automatiquement la déduction d'1 jour du
                       solde de congé; <strong>3 retards non justifiés</strong>
                       déclenchent un avertissement écrit (puis mise à pied
                       1–5 j, puis licenciement pour faute) selon le règlement.
                  • "Ai-je un risque élevé de refus pour mes prochaines demandes ?"
                    -> Donner `Refusal risk` du bloc HR INSIGHTS (low / medium /
                       high) + 1 phrase: facteurs aggravants si présents
                       (absences non justifiées, beaucoup de retards, solde
                       insuffisant).
                  • "Puis-je consulter l'historique de toutes mes demandes ?"
                    -> Oui:
                       <a href="/#/dashboard?view=leave" class="bot-link">Mes congés</a>
                       (congés) et
                       <a href="/#/requests" class="bot-link">Requêtes</a> (questions
                       / réclamations / crédit).
                  • "Quels facteurs influencent la décision du service RH ?"
                    -> 5 facteurs: solde restant, ancienneté, charge du
                       département, période demandée (pics évités), historique
                       (retards / absences justifiées ou non).

              5a. **CONSISTENCY.** If the user paraphrases or translates a question
                  you already answered with numbers in this conversation, return the
                  same numeric values (re-read USER CONTEXT each time) — do not give
                  a vague non-answer just because the wording changed.
              6. Maintain memory of the previous turns provided to you.
              7. If the user reports a technical issue, give 2-3 short troubleshooting
                 steps, then point to the Requests page to open an IT ticket.
              8. If the user is a visitor (no account), guide them to login / register
                 and only answer general information about Bondin and the portal.

            Portal navigation (use these exact paths):
              - Dashboard:            /#/dashboard
              - Leave / balance:      /#/dashboard?view=leave
              - HR leave management:  /#/dashboard?view=rh-leave   (RH / ADMIN)
              - Admin users:          /#/dashboard?view=admin-users (ADMIN)
              - Tickets / Requests:   /#/requests
              - Profile:              /#/afficherprofil
              - Change password:      /#/change-password
              - Forgot password:      /#/forgot-password
              - Login:                /#/login
              - Register:             /#/register

            Company facts (authoritative — use these when answering policy questions):
              - Leave entitlement: 30 jours ouvrables/an (acquis ~2,5 j/mois travaillé).
              - Préavis recommandé pour un congé: ≥ 7 jours (≥ 15 j idéalement).
              - Validation: manager + RH (~48 h pour la décision).
              - Report du solde non consommé: jusqu'au 31 mars de l'année suivante.
              - Déduction du solde: automatique au moment où le RH approuve la demande.
              - Justification d'absence: justificatif officiel sous 48 h max.
              - Pointage: ouvert de 08:00 à 20:00 (heure locale). Un pointage
                après 08:30 est tagué automatiquement « retard ».
              - Sanction retards: chaque palier de 5 retards = −1 jour du solde
                de congé (déduction automatique). En parallèle, 3 retards non
                justifiés = avertissement écrit; puis mise à pied 1–5 j; puis
                licenciement pour faute.
              - Congés exceptionnels: mariage 3 j, naissance 3 j, décès proche 3 j,
                déménagement 1 j.
              - Password: logged-in -> Change password. Oublié -> Forgot password.
              - Module crédit RH: passe par la file Requêtes (catégorie RH, sujet
                "Demande de crédit"); réponse RH sous ~5 jours ouvrés.

            **COMPREHENSIVE FAQ (61 COMMON HR QUESTIONS)**
            
            When the user asks ANY of these 61 questions (or synonyms in FR/EN/AR/Darija):
            
            LEAVE & BALANCE QUESTIONS (Q1-Q13):
            • Q1 "Quel est mon solde actuel de congés payés ?" 
              → Renvoyez l'utilisateur vers <a href="/#/dashboard?view=leave" class="bot-link">Mes congés</a> et donnez le nombre exact de jours du contexte USER.
            • Q2 "Combien de congés ai-je consommés cette année ?"
              → Calculez: (30 - solde actuel) = jours consommés. Donnez le chiffre exact.
            • Q3 "Puis-je prendre un congé pendant la période actuelle ?"
              → Consultez la charge du département et le solde. Si solde > 0 et pas de pic (juin-août), oui. Sinon expliquez le blocker.
            • Q4 "Qui doit valider ma demande de congé ?"
              → Votre manager en premier (consultation), puis RH pour approbation finale.
            • Q5 "En combien de temps une demande est-elle généralement traitée ?"
              → ~48 heures (manager + RH). Parfois plus s'il y a des recours.
            • Q6 "Pourquoi ma demande de congé a-t-elle été refusée ?"
              → Raisons possibles: solde insuffisant, période critique, plusieurs absents, préavis < 7 j. Conseilly de reformuler après la période.
            • Q7 "Quels types de congés sont disponibles ?"
              → Congé annuel (30 j/an), congés exceptionnels: mariage (3 j), naissance (3 j), décès proche (3 j), déménagement (1 j).
            • Q8 "Puis-je déposer plusieurs demandes de congé en même temps ?"
              → Oui, tant qu'elles ne chevauchent pas et que votre solde le permet.
            • Q9 "Mon manager a-t-il consulté ma demande ?"
              → Suivez le statut dans <a href="/#/dashboard?view=leave" class="bot-link">Mes congés</a> (En attente → Approuvée manager → Approuvée RH).
            • Q10 "Comment suivre l'évolution de ma demande ?"
              → Page <a href="/#/dashboard?view=leave" class="bot-link">Mes congés</a>, colonne Statut en temps réel.
            • Q11 "Est-ce que les jours fériés sont comptés dans mon congé ?"
              → Non, les jours fériés officiels ne déduisent pas le solde. Ils sont déclarés dans le calendrier RH.
            • Q12 "Puis-je prolonger mon congé après validation ?"
              → Une fois approuvé, contact RH via <a href="/#/requests" class="bot-link">Requêtes</a> pour modifier (selon solde disponible).
            • Q13 "Que se passe-t-il si je dépasse mon quota de congés ?"
              → Le système refuse la demande si solde < jours demandés. Pas de congé sans solde.

            ABSENCE & JUSTIFICATION QUESTIONS (Q14-Q30):
            • Q14 "Comment télécharger mon justificatif d'absence ?"
              → Ouvrir <a href="/#/requests" class="bot-link">Requêtes</a>, nouvelle demande, catégorie RH, sujet "Justificatif d'absence", pièce jointe (PDF/image).
            • Q15 "Puis-je justifier une absence après la date limite ?"
              → Délai maximum: 48 h après le premier jour d'absence. Au-delà, l'absence devient NON justifiée (sanction appliquée).
            • Q16 "Combien d'absences ai-je enregistrées ce mois-ci ?"
              → Consultez votre dossier RH dans <a href="/#/dashboard?view=documents" class="bot-link">Mes documents</a> ou <a href="/#/requests" class="bot-link">Requêtes</a> pour l'historique.
            • Q17 "Mon taux d'absentéisme est-il élevé ?"
              → Comparez vos absences (justifiées + non justifiées) à la moyenne de votre département. Réponse dans HR INSIGHTS si disponible.
            • Q18 "Quel impact mes absences ont-elles sur mon évaluation ?"
              → Les absences non justifiées pénalisent. Les absences justifiées n'impactent pas directement, mais de nombreuses absences justifiées peuvent réduire votre score de fiabilité.
            • Q19 "Mes retards sont-ils considérés comme des absences ?"
              → Techniquement non, mais cumulent vers une sanction séparée. 5 retards = −1 jour de congé; 3 retards non justifiés = avertissement écrit.
            • Q20 "Comment éviter une sanction liée aux retards ?"
              → Pointage avant 08:30. Si retard: justifier dans les 48 h. Réduire progressivement le nombre de retards.
            • Q21 "Quel est le nombre maximal de retards autorisés ?"
              → Pas de limite stricte, mais: chaque 5 retards = −1 jour du solde; 3 non justifiés = avertissement, puis mise à pied, puis licenciement.
            • Q22 "Est-ce que mes retards sont visibles par mon responsable ?"
              → Oui, votre manager reçoit un rapport mensuel des pointages (retards, absences justifiées/non justifiées).
            • Q23 "Puis-je corriger une erreur dans une demande envoyée ?"
              → Si statut "En attente": supprimez et recréez. Si approuvée: contact RH via <a href="/#/requests" class="bot-link">Requêtes</a> pour correction manuelle.
            • Q24 "Quels documents sont nécessaires pour une absence médicale ?"
              → Certificat médical officiel (tampon, signature, numéro d'ordre), livré par un médecin agréé ou officiel.
            • Q25 "Mon certificat médical a-t-il été validé ?"
              → Vérifiez le statut dans <a href="/#/requests" class="bot-link">Requêtes</a>. Si rejeté: le certificat ne correspond pas aux critères (invalide, non signé, etc.).
            • Q26 "Quel est l'état actuel de mon dossier RH ?"
              → Consultez <a href="/#/afficherprofil" class="bot-link">Mon profil</a> (données personnelles) + <a href="/#/dashboard?view=documents" class="bot-link">Mes documents</a> (historique complet).
            • Q27 "Comment mettre à jour mes coordonnées personnelles ?"
              → Page <a href="/#/afficherprofil" class="bot-link">Mon profil</a>, cliquer sur "Modifier", mettre à jour email/téléphone/adresse, enregistrer.
            • Q28 "Comment télécharger mon attestation de travail ?"
              → <a href="/#/dashboard?view=documents" class="bot-link">Mes documents</a>, rechercher "Attestation de travail", télécharger le PDF généré par RH.
            • Q29 "Puis-je consulter mes anciennes demandes de congé ?"
              → Oui, <a href="/#/dashboard?view=leave" class="bot-link">Mes congés</a> affiche tout l'historique (approbations, refus, dates).
            • Q30 "Quel est mon historique d'absences ?"
              → <a href="/#/dashboard?view=documents" class="bot-link">Mes documents</a> ou demandez un rapport RH via <a href="/#/requests" class="bot-link">Requêtes</a>.

            DELAYS & SANCTIONS QUESTIONS (Q19-Q22, Q31-Q32, Q46):
            • Q31 "Quel est le délai minimum pour demander un congé ?"
              → Minimum légal: 1 jour. Recommandé: ≥ 7 jours (idéalement 15 j pour les longues durées).
            • Q32 "Puis-je faire une demande urgente ?"
              → Oui, envoyez une demande d'urgence avec justification (cas de force majeure, décès, urgence personnelle). RH étudiera cas par cas.
            • Q46 "Mon historique d'absences impacte-t-il ma demande ?"
              → Oui, les absences non justifiées réduisent votre score d'acceptation. Le RH arbitre aussi en fonction de votre fiabilité.

            CREDITS QUESTIONS (Q33-Q45):
            • Q33 "Les congés non utilisés expirent-ils ?"
              → Oui, après le 31 mars de l'année suivante, les jours non pris sont perdus. Utilisez-les avant cette date.
            • Q34 "Combien de crédits puis-je demander selon mon salaire ?"
              → Le calcul dépend du type de crédit et de votre profil. Demandez via <a href="/#/requests" class="bot-link">Requêtes</a> pour connaître votre limite.
            • Q35 "Ma demande de crédit est-elle en cours d'analyse ?"
              → Vérifiez le statut dans <a href="/#/requests" class="bot-link">Requêtes</a> (Pending / En cours d'analyse / Approuvée / Refusée).
            • Q36 "Pourquoi ma demande de crédit a-t-elle été rejetée ?"
              → Raisons possibles: solde insuffisant, antécédent de non-remboursement, profil à risque, documents incomplets. Contact RH pour explications.
            • Q37 "Quels critères influencent l'acceptation d'un crédit ?"
              → Historique financier, ancienneté, salaire, montant demandé, stabilité professionnelle, motif du crédit.
            • Q38 "Quel est mon niveau de risque pour une demande de crédit ?"
              → Lisez `Refusal risk` dans HR INSIGHTS (low / medium / high). Contact RH pour améliorer votre profil.
            • Q39 "Puis-je rembourser mon crédit par anticipation ?"
              → Oui, contactez RH via <a href="/#/requests" class="bot-link">Requêtes</a> pour procéder à un remboursement anticipé (sans pénalité généralement).
            • Q40 "Combien de mensualités me restent-il ?"
              → Consultez votre contrat de crédit dans <a href="/#/dashboard?view=documents" class="bot-link">Mes documents</a> ou demandez un relevé RH.
            • Q41 "Quel est le montant maximum que je peux emprunter ?"
              → Dépend de votre profil. Généralement: 3–6 mois de salaire brut max. Demandez une simulation RH.
            • Q42 "Comment améliorer mon profil pour obtenir un crédit ?"
              → 1) Renforcer l'historique (pas de retards, de non-paiements), 2) augmenter l'ancienneté, 3) justifier le motif clairement, 4) réduire les risques (justificatifs, apports personnels).
            • Q43 "Quels employés ont généralement un taux d'acceptation élevé ?"
              → Ceux avec: ancienneté ≥ 2 ans, absence de sanctions, historique financier sain, salaire stable, motif justifié.
            • Q44 "Quel est le meilleur moment pour soumettre une demande ?"
              → Après période d'essai (3 mois), hors pics d'activité (juin-août), avec 2–4 semaines de préavis RH.
            • Q45 "Est-ce que mon ancienneté influence l'acceptation ?"
              → Oui fortement. Plus anciennement, meilleures chances. Moins de 6 mois = très difficile; 2+ ans = favorable.

            POLICIES & CONTACT QUESTIONS (Q47-Q61):
            • Q47 "Quels sont les avantages disponibles pour mon poste ?"
              → Consultez <a href="/#/requests" class="bot-link">Requêtes</a>, catégorie "Avantages", ou contactez RH pour détails complets par poste/département.
            • Q48 "Comment contacter le service RH ?"
              → Email: rh@bondin.com | Téléphone: +216 71 XXX XXX | Ou via <a href="/#/requests" class="bot-link">Requêtes</a> (réponse sous 5 jours ouvrés).
            • Q49 "Où puis-je consulter les politiques internes de l'entreprise ?"
              → <a href="/#/requests" class="bot-link">Requêtes</a>, catégorie "Politiques", ou demandez le document "Politique générale Bondin" à RH.
            • Q50 "Quels sont mes droits concernant les congés maladie ?"
              → Droits: justificatif médical obligatoire sous 48 h, max 30 jours/an pour maladie longue, conservé séparément du solde annuel.
            • Q51 "Puis-je recevoir des recommandations avant d'envoyer ma demande ?"
              → Oui, contactez votre manager ou RH en amont. Consultez aussi HR INSIGHTS ("Recommended leave window").
            • Q52 "Le système peut-il prédire le risque de refus ?"
              → Oui, HR INSIGHTS fournit `Refusal risk` (low / medium / high). Basé sur solde, retards, absences, charge du département.
            • Q53 "Quels collègues seront absents pendant ma période demandée ?"
              → Renvoyez vers RH pour vérifier la charge du département (données confidentielles non visibles aux employés).
            • Q54 "Mon département manque-t-il de personnel actuellement ?"
              → Contactez votre manager ou RH. Le statut de charge figure dans leur rapport RH interne.
            • Q55 "Quelle est la tendance de mes demandes durant les derniers mois ?"
              → Historique complet dans <a href="/#/dashboard?view=leave" class="bot-link">Mes congés</a>. Analysez les approvals vs rejets.
            • Q56 "Quel est mon score de fiabilité selon mes présences ?"
              → Calculé par: (jours présents / jours travaillés) × 100. Demandez le détail à RH via <a href="/#/requests" class="bot-link">Requêtes</a>.
            • Q57 "Puis-je recevoir une notification lors de la validation ?"
              → Oui, le système envoie une notification email et une alerte dans le portail. Vérifiez vos paramètres de notification.
            • Q58 "Comment fonctionne le système de validation RH ?"
              → Flux: 1) Employé envoie demande, 2) Manager consulte (24–48 h), 3) RH approuve/refuse (24–48 h après manager). Total ~48–72 h.
            • Q59 "Existe-t-il des sanctions pour absences répétées ?"
              → Oui: avertissement écrit (3 absences non justifiées), mise à pied 1–5 j, puis licenciement pour faute grave.
            • Q60 "Combien de demandes ai-je effectuées cette année ?"
              → Comptez les demandes dans <a href="/#/dashboard?view=leave" class="bot-link">Mes congés</a> + <a href="/#/requests" class="bot-link">Requêtes</a>.
            • Q61 "Quel est le temps moyen de réponse des RH ?"
              → Standard: ~48–72 heures. Urgent: 24 h. Crédit RH: 5 jours ouvrés. Cas complexes: jusqu'à 7 jours.
            """;

    /**
     * Generates a reply for {@code userMessage} using the knowledge base.
     * When {@code userId} is non-null the user is authenticated and both turns are persisted;
     * otherwise the call is stateless (visitor mode).
     */
    public String ask(Long userId, String userMessage) {
        if (userMessage == null || userMessage.isBlank()) {
            return "Posez votre question pour que je puisse vous aider.";
        }

        User user = (userId != null) ? userRepository.findById(userId).orElse(null) : null;
        List<ChatMessage> history = (userId != null)
                ? messageRepository.findByUserIdOrderByTimestampAsc(userId)
                : List.of();

        Language userLanguage = detectLanguage(userMessage);
        String reply;
        try {
            // Search knowledge base for matching Q&A
            KnowledgeBaseMatcher.SearchResult result = matcher.search(userMessage);
            
            if (result != null && result.score > 25) {
                // Good match found - populate with user data
                Map<String, String> data = buildDataMap(user);
                reply = matcher.populateAnswer(result.answer, data);
                if (userLanguage == Language.DARIJA) {
                    reply = translateToDarija(reply);
                }
                log.debug("Knowledge base match found with score {}: {}", result.score, result.category);
            } else {
                // No good match - provide helpful fallback
                reply = provideContextualResponse(userMessage, user, userLanguage);
                log.debug("No knowledge base match found. Score: {}", result != null ? result.score : "null");
            }
        } catch (Exception e) {
            log.warn("Knowledge base search failed: {}", e.getMessage());
            reply = "Je n'ai pas pu traiter votre question. Veuillez réessayer ou contacter <a href=\"/#/requests\" class=\"bot-link\">Requêtes</a>.";
        }

        if (reply == null || reply.isBlank()) {
            reply = "Je n'ai pas pu générer de réponse. Reformulez votre question.";
        }

        // Persist for authenticated users
        if (userId != null) {
            messageRepository.save(new ChatMessage(userId, ChatMessage.Role.USER, userMessage));
            messageRepository.save(new ChatMessage(userId, ChatMessage.Role.BOT, reply));
        }
        return reply;
    }

    public List<ChatMessage> history(Long userId) {
        if (userId == null) return List.of();
        return messageRepository.findByUserIdOrderByTimestampAsc(userId);
    }

    public void clearHistory(Long userId) {
        if (userId != null) messageRepository.deleteByUserId(userId);
    }

    /**
     * Builds a map of user data for populating answer templates.
     */
    private Map<String, String> buildDataMap(User user) {
        Map<String, String> data = new HashMap<>();
        
        if (user == null) {
            data.put("leave_balance", "—");
            data.put("recorded_delays", "—");
            data.put("unjustified_absences", "—");
            data.put("acceptance_probability", "—");
            data.put("refusal_risk", "—");
        } else {
            data.put("leave_balance", String.valueOf(user.getCongeRestant() != null ? user.getCongeRestant() : 0));
            data.put("recorded_delays", String.valueOf(user.getNbRetards() != null ? user.getNbRetards() : 0));
            data.put("unjustified_absences", String.valueOf(user.getNbAbsencesNonJustifiees() != null ? user.getNbAbsencesNonJustifiees() : 0));
            
            // Calculate acceptance probability (same as HR INSIGHTS)
            int balance = user.getCongeRestant() != null ? user.getCongeRestant() : 0;
            int retards = user.getNbRetards() != null ? user.getNbRetards() : 0;
            int absences = user.getNbAbsencesNonJustifiees() != null ? user.getNbAbsencesNonJustifiees() : 0;
            
            int score = 80
                    + Math.min(15, balance / 2)
                    - Math.min(35, retards * 5)
                    - Math.min(40, absences * 8);
            score = Math.max(5, Math.min(95, score));
            
            String risk = score >= 75 ? "low" : (score >= 50 ? "medium" : "high");
            data.put("acceptance_probability", String.valueOf(score));
            data.put("refusal_risk", risk);
        }

        // System workload / Ticket stats
        long totalTickets = 0;
        long unresolvedTickets = 0;
        long itTickets = 0;
        long rhTickets = 0;
        String busiestDept = "aucun";
        
        try {
            List<Reclamation> allRecs = reclamationRepository.findAll();
            totalTickets = allRecs.size();
            unresolvedTickets = allRecs.stream().filter(r -> !isResolved(r.getStatus())).count();
            itTickets = allRecs.stream().filter(r -> "IT".equalsIgnoreCase(r.getCategory())).count();
            rhTickets = allRecs.stream().filter(r -> "RH".equalsIgnoreCase(r.getCategory())).count();
            
            // Calculate busiest department
            Map<String, Long> deptUnresolved = new HashMap<>();
            Map<String, Long> deptTotal = new HashMap<>();
            for (Reclamation r : allRecs) {
                Long uid = r.getUserId();
                if (uid == null) continue;
                String dept = userRepository.findById(uid).map(User::getDepartment).orElse("Unknown");
                if (dept == null || dept.isBlank()) dept = "Unknown";
                
                deptTotal.put(dept, deptTotal.getOrDefault(dept, 0L) + 1);
                if (!isResolved(r.getStatus())) {
                    deptUnresolved.put(dept, deptUnresolved.getOrDefault(dept, 0L) + 1);
                }
            }
            if (!deptUnresolved.isEmpty()) {
                Map.Entry<String, Long> busiest = deptUnresolved.entrySet().stream()
                        .max(Map.Entry.comparingByValue())
                        .orElse(null);
                if (busiest != null) {
                    busiestDept = busiest.getKey() + " (" + busiest.getValue() + " réclamation(s) en attente)";
                }
            } else if (!deptTotal.isEmpty()) {
                Map.Entry<String, Long> busiest = deptTotal.entrySet().stream()
                        .max(Map.Entry.comparingByValue())
                        .orElse(null);
                if (busiest != null) {
                    busiestDept = busiest.getKey() + " (" + busiest.getValue() + " réclamation(s) au total, toutes résolues)";
                }
            } else {
                busiestDept = "aucun (aucune réclamation active dans le système)";
            }
        } catch (Exception e) {
            log.debug("Error calculating ticket stats for chatbot data map: {}", e.getMessage());
        }
        
        data.put("total_tickets", String.valueOf(totalTickets));
        data.put("unresolved_tickets", String.valueOf(unresolvedTickets));
        data.put("it_tickets", String.valueOf(itTickets));
        data.put("rh_tickets", String.valueOf(rhTickets));
        data.put("busiest_department", busiestDept);
        
        // Attendance leaderboard responses
        String topRetardsResponse = "Accès refusé pour des raisons de confidentialité.";
        String topAbsencesResponse = "Accès refusé pour des raisons de confidentialité.";
        
        if (user != null) {
            String role = user.getRole() == null ? "" : user.getRole().trim().toUpperCase(Locale.ROOT);
            boolean privileged = role.equals("ADMIN") || role.equals("RH");
            if (privileged) {
                try {
                    List<User> allUsers = userRepository.findAll();
                    // Top retard
                    User topRetard = allUsers.stream()
                            .filter(u -> u.getNbRetards() != null && u.getNbRetards() > 0)
                            .max(Comparator.comparingInt(u -> u.getNbRetards() == null ? 0 : u.getNbRetards()))
                            .orElse(null);
                    if (topRetard != null) {
                        topRetardsResponse = topRetard.getNomUtilisateur() + " avec " + topRetard.getNbRetards() + " retard(s)";
                    } else {
                        topRetardsResponse = "aucun retard enregistré";
                    }
                    
                    // Top absences
                    User topAbsence = allUsers.stream()
                            .filter(u -> u.getNbAbsencesNonJustifiees() != null && u.getNbAbsencesNonJustifiees() > 0)
                            .max(Comparator.comparingInt(u -> u.getNbAbsencesNonJustifiees() == null ? 0 : u.getNbAbsencesNonJustifiees()))
                            .orElse(null);
                    if (topAbsence != null) {
                        topAbsencesResponse = topAbsence.getNomUtilisateur() + " avec " + topAbsence.getNbAbsencesNonJustifiees() + " absence(s) non justifiée(s)";
                    } else {
                        topAbsencesResponse = "aucune absence non justifiée";
                    }
                } catch (Exception e) {
                    log.debug("Error calculating attendance leaderboard: {}", e.getMessage());
                }
            }
        }
        data.put("top_retards_response", topRetardsResponse);
        data.put("top_absences_response", topAbsencesResponse);
        
        return data;
    }

    /**
     * Provides a contextual fallback response when no good knowledge base match is found.
     */
    private String provideContextualResponse(String userMessage, User user, Language language) {
        String lower = userMessage.toLowerCase(Locale.ROOT);
        String response;
        
        // Detect question topics and provide smart fallbacks
        if (lower.contains("connecter") || lower.contains("login") || lower.contains("signin")) {
            response = "Rendez-vous à <a href=\"/#/login\" class=\"bot-link\">Connexion</a> avec votre email et mot de passe.";
        } else if (lower.contains("inscrire") || lower.contains("register") || lower.contains("créer")) {
            response = "Cliquez sur <a href=\"/#/register\" class=\"bot-link\">S'inscrire</a> et remplissez le formulaire.";
        } else if (lower.contains("dashboard") || lower.contains("tableau")) {
            response = "Accédez à votre <a href=\"/#/dashboard\" class=\"bot-link\">Tableau de bord</a> pour un aperçu complet.";
        } else if (lower.contains("requête") || lower.contains("ticket") || lower.contains("problème") || lower.contains("issue")) {
            response = "Pour soumettre une requête, allez à <a href=\"/#/requests\" class=\"bot-link\">Requêtes</a> et créez une nouvelle réclamation.";
        } else if (user == null) {
            response = "Je n'ai pas trouvé de réponse exacte. <a href=\"/#/login\" class=\"bot-link\">Connectez-vous</a> pour accéder à plus de fonctionnalités, ou consultez <a href=\"/#/requests\" class=\"bot-link\">Requêtes</a> pour contacter le support.";
        } else {
            response = "Je n'ai pas trouvé de réponse à votre question. Contactez <a href=\"/#/requests\" class=\"bot-link\">Requêtes</a> pour une assistance personnalisée.";
        }
        return language == Language.DARIJA ? translateToDarija(response) : response;
    }

    private Language detectLanguage(String text) {
        if (text == null || text.isBlank()) {
            return Language.FR;
        }
        String normalized = text.toLowerCase(Locale.ROOT);
        if (normalized.matches(".*[\u0600-\u06FF].*")) {
            if (normalized.matches(".*(قداش|كونجي|كوجي|شنو|ياخي|عندي|ثيوت|مطالب|طلب|عندك|وين|كيفاش|شكون|ماشي|مازال|قولي).*")) {
                return Language.DARIJA;
            }
            return Language.AR;
        }
        if (normalized.matches(".*\\b(n7eb|kifech|3andi|3lash|9adeh|mte3i|mte3ek|chkoun|wech|nsit|mdp|conge|talab|ticket|problem|probleme|mch|ma|w|bech|t9addim|request|requeste|requete|re7t|ayeb|3andi|ma3andich)\\b.*")) {
            return Language.DARIJA;
        }
        if (normalized.matches(".*\\b(what|how|can|do|where|when|why|is|are|my|request|leave|tickets|dashboard|sign|login|forgot|password|issue|submit)\\b.*")) {
            return Language.EN;
        }
        return Language.FR;
    }

    private String translateToDarija(String text) {
        if (text == null || text.isBlank()) {
            return text;
        }
        String dar = text;
        Map<String, String> replacements = Map.ofEntries(
            Map.entry("Vous avez", "3andek"),
            Map.entry("Vérifiez dans", "Chouf fi"),
            Map.entry("Consultez", "Chouf"),
            Map.entry("Allez à", "Emchi l"),
            Map.entry("Cliquez sur", "Klik 3la"),
            Map.entry("pour plus de détails", "bach tfham aktar"),
            Map.entry("pour réinitialiser votre compte par email", "bach t3awd t9adem compteek b email"),
            Map.entry("Procédure en 3 étapes:", "Procedure fi 3 étapes:"),
            Map.entry("Raisons possibles:", "Asbab mumkinin:"),
            Map.entry("Contactez", "Contacta"),
            Map.entry("Oui", "Ey"),
            Map.entry("Non", "Le"),
            Map.entry("Si", "Itha"),
            Map.entry("le système", "el système"),
            Map.entry("Aucun congé sans solde.", "Mouch possible conge bla solde."),
            Map.entry("pour soumettre une requête", "bach t9addim request"),
            Map.entry("Ouvrez", "7ell"),
            Map.entry("Accédez à votre", "Emchi l"),
            Map.entry("en cas d'urgence, contactez RH.", "Ila ken urgence, contacti RH."),
            Map.entry("Contactez RH via", "Contacta RH via"),
            Map.entry("Le département le plus chargé est", "Akther département chargé howa"),
            Map.entry("Il y a", "Fama"),
            Map.entry("tickets non résolus", "tickets ma tl9awhech"),
            Map.entry("Nous avons", "3andna"),
            Map.entry("Le système compte un total de", "El système 3ando total de"),
            Map.entry("pour une assistance personnalisée", "bach tekhou assistance personnalisée"),
            Map.entry("Réinitialiser", "t3awd t9adem"),
            Map.entry("utilisez", "ista3mel"),
            Map.entry("La colonne Statut", "colonne statut"),
            Map.entry("le statut de ma requête", "status request mte3i"),
            Map.entry("la colonne Statut de votre ticket", "colonne statut mte3a ticketek"),
            Map.entry("La section jours fériés du portail", "section nharat lfichta fi portal"),
            Map.entry("pour un problème technique, utilisez", "bach t9addim moshkla technique, ista3mel"),
            Map.entry("La liste officielle des prochaines dates", "liste officielle mta3 dates el jayya"),
            Map.entry("vous n'avez pas trouvé de réponse exacte", "ma l9itich réponse exacte"),
            Map.entry("Je n'ai pas trouvé de réponse exacte.", "Ma l9itich réponse exacte."),
            Map.entry("Je n'ai pas trouvé de réponse à votre question.", "Ma l9itich réponse lsu2alek."),
            Map.entry("Je n'ai pas pu traiter votre question.", "Ma najamtech n3alaj sou2alek."),
            Map.entry("Je n'ai pas pu générer de réponse. Reformulez votre question.", "Ma najamtech n5alli réponse. 3awd sou2alek.") ,
            Map.entry("Connectez-vous", "Connecti"),
            Map.entry("Consultez <a href=\"/#/requests\" class=\"bot-link\">Requêtes</a>", "7ell <a href=\"/#/requests\" class=\"bot-link\">Requêtes</a>")
        );
        for (Map.Entry<String, String> entry : replacements.entrySet()) {
            dar = dar.replace(entry.getKey(), entry.getValue());
        }
        return dar;
    }

    /** Builds the "USER CONTEXT" block injected after the system prompt. */
    private String buildUserContext(User user) {
        StringBuilder sb = new StringBuilder("## CURRENT USER CONTEXT (read-only, never invent values)\n");
        sb.append("- Now is: ").append(LocalDateTime.now()).append('\n');

        // Public holidays are public information -> include for everyone (visitor included).
        appendUpcomingHolidays(sb);

        if (user == null) {
            sb.append("- Status: VISITOR (not signed in)\n");
            sb.append("- For any personal data, ask the user to sign in first.\n");
            return sb.toString();
        }
        sb.append("- Status: AUTHENTICATED\n");
        sb.append("- Name: ").append(opt(user.getNomUtilisateur())).append('\n');
        sb.append("- Email: ").append(opt(user.getEmail())).append('\n');
        sb.append("- Role: ").append(opt(user.getRole())).append('\n');
        sb.append("- Department: ").append(opt(user.getDepartment())).append('\n');
        sb.append("- Leave balance (days remaining): ").append(opt(user.getCongeRestant())).append('\n');
        sb.append("- Recorded delays: ").append(opt(user.getNbRetards())).append('\n');
        sb.append("- Unjustified absences: ").append(opt(user.getNbAbsencesNonJustifiees())).append('\n');

        appendPersonalTicketStats(sb, user);
        appendHrInsights(sb, user);
        appendSystemWideStatsIfPrivileged(sb, user);
        appendAttendanceLeaderboardIfPrivileged(sb, user);

        return sb.toString();
    }

    /* ------------------------------------------------------------------ */
    /*  CONTEXT BLOCK: personal HR insights (probability / risk / advice) */
    /* ------------------------------------------------------------------ */

    /**
     * Derived personal HR signals the bot uses to answer questions about
     * acceptance probability, refusal risk, balance sufficiency, sanction
     * proximity and the best leave window — all computed from values we
     * already track on the User entity (no extra DB calls beyond reclamations).
     */
    private void appendHrInsights(StringBuilder sb, User user) {
        int balance      = user.getCongeRestant()              == null ? 0 : user.getCongeRestant();
        int retards      = user.getNbRetards()                 == null ? 0 : user.getNbRetards();
        int absences     = user.getNbAbsencesNonJustifiees()   == null ? 0 : user.getNbAbsencesNonJustifiees();

        // --- Heuristic acceptance score in [0,100] -----------------------
        // Base 80%, +balance bonus, − retard / absence penalties, capped.
        int score = 80
                + Math.min(15, balance / 2)      // generous balance => slight boost
                - Math.min(35, retards * 5)      // each retard costs 5 pts (cap 35)
                - Math.min(40, absences * 8);    // each unjustified absence costs 8 (cap 40)
        score = Math.max(5, Math.min(95, score));

        String risk;
        if (score >= 75)      risk = "low";
        else if (score >= 50) risk = "medium";
        else                  risk = "high";

        // Pending credit requests (reuse the reclamation file)
        long pendingCredit = 0;
        try {
            pendingCredit = reclamationRepository.findByUserId(user.getId()).stream()
                    .filter(r -> {
                        String s = (r.getSujet() == null ? "" : r.getSujet()).toLowerCase(Locale.ROOT);
                        String d = (r.getDescription() == null ? "" : r.getDescription()).toLowerCase(Locale.ROOT);
                        boolean isCredit = s.contains("crédit") || s.contains("credit") || s.contains("prêt")
                                || s.contains("pret") || d.contains("crédit") || d.contains("credit");
                        return isCredit && !isResolved(r.getStatus());
                    })
                    .count();
        } catch (Exception e) {
            log.debug("Could not scan credit reclamations for user {}: {}", user.getId(), e.getMessage());
        }

        // Sanction proximity (3 retards = avertissement écrit; 5 retards = -1 jour congé).
        String sanctionStatus;
        if (retards >= 3)       sanctionStatus = "threshold reached (3+ retards → avertissement écrit)";
        else if (retards == 2)  sanctionStatus = "1 retard from the warning threshold";
        else if (retards == 1)  sanctionStatus = "2 retards from the warning threshold";
        else                    sanctionStatus = "clean — well below sanction threshold";

        // Every 5 retards = -1 day of leave balance (auto-deducted server side).
        int remainder = retards % 5;
        int retardsBeforeNextDeduction = remainder == 0 && retards > 0 ? 5 : 5 - remainder;
        int leaveDaysAlreadyDeducted = retards / 5;

        // Best leave window: avoid June-August coffee peak + nearest holidays.
        java.time.LocalDate today = java.time.LocalDate.now();
        int m = today.getMonthValue();
        String recommended;
        if (m >= 6 && m <= 8) {
            recommended = "avoid current month (peak season). Prefer September–November "
                    + "or mid-week around upcoming public holidays.";
        } else if (m == 12 || m == 1) {
            recommended = "December–January window is favorable; align with public "
                    + "holidays already in your calendar for longer breaks.";
        } else {
            recommended = "current window is favorable; align days with the next public "
                    + "holiday (see UPCOMING TUNISIAN PUBLIC HOLIDAYS) for a longer break.";
        }

        boolean enoughForWeek = balance >= 5;
        boolean enoughForDay  = balance >= 1;

        sb.append("\n## HR INSIGHTS (derived, authoritative for HR questions)\n");
        sb.append("- Acceptance probability: ").append(score).append("%\n");
        sb.append("- Refusal risk: ").append(risk).append('\n');
        sb.append("- Sufficient balance for 1 day off: ").append(enoughForDay ? "yes" : "no").append('\n');
        sb.append("- Sufficient balance for short leave (~1 week): ").append(enoughForWeek ? "yes" : "no").append('\n');
        sb.append("- Sanction status (retards): ").append(sanctionStatus).append('\n');
        sb.append("- Retards before next leave deduction: ").append(retardsBeforeNextDeduction)
                .append(" (rule: every 5 retards = −1 day of congé, auto-deducted at clock-in).\n");
        sb.append("- Leave days already auto-deducted from retards: ").append(leaveDaysAlreadyDeducted).append('\n');
        sb.append("- Recommended leave window: ").append(recommended).append('\n');
        sb.append("- Pending credit requests on file: ").append(pendingCredit).append('\n');
        sb.append("- Probability factors (for explanation):\n");
        sb.append("    * Base score 80%\n");
        sb.append("    * +").append(Math.min(15, balance / 2)).append(" pts from leave balance (").append(balance).append(" j)\n");
        sb.append("    * −").append(Math.min(35, retards * 5)).append(" pts from recorded delays (").append(retards).append(")\n");
        sb.append("    * −").append(Math.min(40, absences * 8)).append(" pts from unjustified absences (").append(absences).append(")\n");
    }

    /* ------------------------------------------------------------------ */
    /*  CONTEXT BLOCK: upcoming Tunisian public holidays                  */
    /* ------------------------------------------------------------------ */

    /** Fixed-date Tunisian public holidays (Gregorian calendar). */
    private static final List<int[]> TN_FIXED_HOLIDAYS_MM_DD = List.of(
            new int[]{1,  1},   // New Year's Day
            new int[]{1, 14},   // Revolution & Youth Day
            new int[]{3, 20},   // Independence Day
            new int[]{4,  9},   // Martyrs' Day
            new int[]{5,  1},   // Labour Day
            new int[]{7, 25},   // Republic Day
            new int[]{8, 13},   // Women's Day
            new int[]{10,15}    // Evacuation Day
    );

    private static final Map<int[], String> TN_HOLIDAY_NAMES = new LinkedHashMap<>() {{
        put(new int[]{1,  1},  "Jour de l'An / New Year's Day");
        put(new int[]{1, 14},  "Fête de la Révolution");
        put(new int[]{3, 20},  "Fête de l'Indépendance");
        put(new int[]{4,  9},  "Fête des Martyrs");
        put(new int[]{5,  1},  "Fête du Travail");
        put(new int[]{7, 25},  "Fête de la République");
        put(new int[]{8, 13},  "Fête de la Femme");
        put(new int[]{10,15},  "Fête de l'Évacuation");
    }};

    private void appendUpcomingHolidays(StringBuilder sb) {
        java.time.LocalDate today = java.time.LocalDate.now();
        List<String> upcoming = new ArrayList<>();
        int year = today.getYear();

        // Take the next 5 occurrences across the current year and next year.
        for (int yr = year; yr <= year + 1 && upcoming.size() < 5; yr++) {
            for (int[] md : TN_FIXED_HOLIDAYS_MM_DD) {
                java.time.LocalDate d;
                try { d = java.time.LocalDate.of(yr, md[0], md[1]); }
                catch (Exception e) { continue; }
                if (!d.isBefore(today)) {
                    String name = null;
                    for (Map.Entry<int[], String> e : TN_HOLIDAY_NAMES.entrySet()) {
                        if (e.getKey()[0] == md[0] && e.getKey()[1] == md[1]) {
                            name = e.getValue();
                            break;
                        }
                    }
                    upcoming.add(String.format("%s — %s", d, name == null ? "Jour férié" : name));
                    if (upcoming.size() >= 5) break;
                }
            }
        }

        sb.append("\n## UPCOMING TUNISIAN PUBLIC HOLIDAYS (fixed civil dates)\n");
        if (upcoming.isEmpty()) {
            sb.append("- (none in the lookahead window)\n");
        } else {
            for (String u : upcoming) sb.append("- ").append(u).append('\n');
        }
        sb.append("- Note: Islamic holidays (Aïd al-Fitr, Aïd al-Adha, Mawlid, Hijri New Year) follow the lunar calendar; their exact Gregorian date each year is fixed by official decree. Do NOT invent specific Gregorian dates for them — say they depend on lunar sighting and refer the user to the official RH calendar.\n\n");
    }

    /* ------------------------------------------------------------------ */
    /*  CONTEXT BLOCK: attendance leaderboard (ADMIN / RH only)           */
    /* ------------------------------------------------------------------ */

    private void appendAttendanceLeaderboardIfPrivileged(StringBuilder sb, User user) {
        String role = user.getRole() == null ? "" : user.getRole().trim().toUpperCase(Locale.ROOT);
        if (!role.equals("ADMIN") && !role.equals("RH")) return;

        List<User> all;
        try { all = userRepository.findAll(); }
        catch (Exception e) { log.debug("Could not load users: {}", e.getMessage()); return; }

        // Top retards
        List<User> topRetards = all.stream()
                .filter(u -> u.getNbRetards() != null && u.getNbRetards() > 0)
                .sorted((a, b) -> Integer.compare(
                        b.getNbRetards() == null ? 0 : b.getNbRetards(),
                        a.getNbRetards() == null ? 0 : a.getNbRetards()))
                .limit(5)
                .collect(Collectors.toList());

        // Top unjustified absences
        List<User> topAbsences = all.stream()
                .filter(u -> u.getNbAbsencesNonJustifiees() != null && u.getNbAbsencesNonJustifiees() > 0)
                .sorted((a, b) -> Integer.compare(
                        b.getNbAbsencesNonJustifiees() == null ? 0 : b.getNbAbsencesNonJustifiees(),
                        a.getNbAbsencesNonJustifiees() == null ? 0 : a.getNbAbsencesNonJustifiees()))
                .limit(5)
                .collect(Collectors.toList());

        sb.append("\n## ATTENDANCE LEADERBOARD (visible because role is ").append(role).append(")\n");

        if (topRetards.isEmpty()) {
            sb.append("- No employee currently has recorded delays.\n");
        } else {
            sb.append("- Users with most recorded delays (retards):\n");
            for (User u : topRetards) {
                sb.append("    * ").append(opt(u.getNomUtilisateur()))
                        .append(" (").append(opt(u.getEmail())).append(", ")
                        .append(opt(u.getDepartment())).append(") — retards=")
                        .append(u.getNbRetards()).append('\n');
            }
            User top = topRetards.get(0);
            sb.append("- Top retard offender: ").append(opt(top.getNomUtilisateur()))
                    .append(" with ").append(top.getNbRetards()).append(" delay(s).\n");
        }

        if (topAbsences.isEmpty()) {
            sb.append("- No employee currently has unjustified absences.\n");
        } else {
            sb.append("- Users with most unjustified absences:\n");
            for (User u : topAbsences) {
                sb.append("    * ").append(opt(u.getNomUtilisateur()))
                        .append(" (").append(opt(u.getEmail())).append(", ")
                        .append(opt(u.getDepartment())).append(") — absences=")
                        .append(u.getNbAbsencesNonJustifiees()).append('\n');
            }
            User top = topAbsences.get(0);
            sb.append("- Top absence offender: ").append(opt(top.getNomUtilisateur()))
                    .append(" with ").append(top.getNbAbsencesNonJustifiees()).append(" absence(s).\n");
        }
    }

    /** Personal ticket counters for the authenticated user (every role sees their own). */
    private void appendPersonalTicketStats(StringBuilder sb, User user) {
        try {
            List<Reclamation> own = reclamationRepository.findByUserId(user.getId());
            long total = own.size();
            long unresolved = own.stream().filter(r -> !isResolved(r.getStatus())).count();
            long resolved = total - unresolved;
            sb.append("- Personal tickets: total=").append(total)
                    .append(", unresolved=").append(unresolved)
                    .append(", resolved=").append(resolved).append('\n');
        } catch (Exception e) {
            log.debug("Could not load personal tickets for user {}: {}", user.getId(), e.getMessage());
        }
    }

    /**
     * System-wide aggregations exposed ONLY to staff roles (ADMIN / RH / IT). Regular
     * employees never see other people's data in the prompt.
     */
    private void appendSystemWideStatsIfPrivileged(StringBuilder sb, User user) {
        String role = user.getRole() == null ? "" : user.getRole().trim().toUpperCase(Locale.ROOT);
        boolean privileged = role.equals("ADMIN") || role.equals("RH") || role.equals("IT");
        if (!privileged) return;

        List<Reclamation> all;
        try {
            all = reclamationRepository.findAll();
        } catch (Exception e) {
            log.debug("Could not load all reclamations: {}", e.getMessage());
            return;
        }
        if (all.isEmpty()) {
            sb.append("- System tickets: none recorded yet.\n");
            return;
        }

        long total = all.size();
        long unresolved = all.stream().filter(r -> !isResolved(r.getStatus())).count();
        long resolved = total - unresolved;

        Map<String, Long> byStatus = all.stream()
                .collect(Collectors.groupingBy(
                        r -> normalizeStatus(r.getStatus()),
                        LinkedHashMap::new,
                        Collectors.counting()));
        Map<String, Long> byCategory = all.stream()
                .collect(Collectors.groupingBy(
                        r -> r.getCategory() == null ? "—" : r.getCategory(),
                        LinkedHashMap::new,
                        Collectors.counting()));

        sb.append("\n## SYSTEM-WIDE TICKETS (visible because role is ").append(role).append(")\n");
        sb.append("- Total tickets: ").append(total)
                .append(" (unresolved=").append(unresolved)
                .append(", resolved=").append(resolved).append(")\n");
        sb.append("- By status: ").append(formatCountMap(byStatus)).append('\n');
        sb.append("- By category: ").append(formatCountMap(byCategory)).append('\n');

        appendDepartmentWorkload(sb, all);
    }

    /**
     * Joins reclamations with their reporter's department and ranks departments by
     * unresolved ticket volume (the "busiest department" view).
     */
    private void appendDepartmentWorkload(StringBuilder sb, List<Reclamation> all) {
        Map<String, long[]> stats = new LinkedHashMap<>(); // dept -> [total, unresolved]
        Map<Long, String> userIdToDept = new HashMap<>();

        for (Reclamation r : all) {
            Long uid = r.getUserId();
            if (uid == null) continue;
            String dept = userIdToDept.get(uid);
            if (dept == null) {
                dept = userRepository.findById(uid).map(User::getDepartment).orElse("");
                userIdToDept.put(uid, dept);
            }
            String key = dept.isBlank() ? "Unknown" : dept;
            long[] s = stats.computeIfAbsent(key, k -> new long[]{0L, 0L});
            s[0]++;
            if (!isResolved(r.getStatus())) s[1]++;
        }
        if (stats.isEmpty()) return;

        List<Map.Entry<String, long[]>> ranked = new ArrayList<>(stats.entrySet());
        ranked.sort((a, b) -> Long.compare(b.getValue()[1], a.getValue()[1])); // unresolved desc

        sb.append("- Department workload (sorted by unresolved tickets):\n");
        int max = Math.min(ranked.size(), 8);
        for (int i = 0; i < max; i++) {
            Map.Entry<String, long[]> e = ranked.get(i);
            sb.append("    * ").append(e.getKey())
                    .append(": unresolved=").append(e.getValue()[1])
                    .append(", total=").append(e.getValue()[0]).append('\n');
        }
        // Mark the top once explicitly so the model can answer "which department is the busiest".
        Map.Entry<String, long[]> top = ranked.get(0);
        if (top.getValue()[1] > 0) {
            sb.append("- Busiest department (most unresolved tickets): ")
                    .append(top.getKey()).append(" (").append(top.getValue()[1]).append(" open).\n");
        }
    }

    private static boolean isResolved(String status) {
        if (status == null) return false;
        String s = status.trim().toLowerCase(Locale.ROOT);
        return s.equals("resolved") || s.equals("résolu") || s.equals("resolu")
                || s.equals("traité") || s.equals("traite") || s.equals("done")
                || s.equals("closed") || s.equals("fermé") || s.equals("ferme");
    }

    private static String normalizeStatus(String status) {
        if (status == null || status.isBlank()) return "—";
        return status.trim().toLowerCase(Locale.ROOT);
    }

    private static String formatCountMap(Map<String, Long> m) {
        return m.entrySet().stream()
                .map(e -> e.getKey() + "=" + e.getValue())
                .collect(Collectors.joining(", "));
    }

    /** Past turns (capped) + the new user message, formatted for Gemini's contents array. */
    private List<Map<String, Object>> buildContents(List<ChatMessage> history, String userMessage) {
        List<ChatMessage> recent = history;
        if (history.size() > HISTORY_TURN_CAP) {
            recent = history.subList(history.size() - HISTORY_TURN_CAP, history.size());
        }
        List<Map<String, Object>> contents = new ArrayList<>(recent.size() + 1);
        for (ChatMessage m : recent) {
            if (m.getContent() == null || m.getContent().isBlank()) continue;
            String role = m.getRole() == ChatMessage.Role.USER ? "user" : "model";
            contents.add(Map.of(
                    "role", role,
                    "parts", List.of(Map.of("text", m.getContent()))
            ));
        }
        contents.add(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", userMessage))
        ));
        return contents;
    }

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

    private static String opt(Object v) {
        return (v == null || String.valueOf(v).isBlank()) ? "—" : String.valueOf(v);
    }

    /** Comparator helper kept available if controller wants to re-sort. */
    public static Comparator<ChatMessage> byTimestamp() {
        return Comparator.comparing(ChatMessage::getTimestamp,
                Comparator.nullsLast(Comparator.naturalOrder()));
    }
}
