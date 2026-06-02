# Guide de Conception UML : Portail RH & IT Maison Bondin

Ce document est un guide d'ingénierie et de conception UML conçu spécifiquement pour le portail interne de la **Maison Bondin**. Il récapitule les acteurs du système, leurs rôles respectifs et fournit des spécifications de modélisation prêtes à l'emploi (aux formats **PlantUML** et **Mermaid**).

---

## 1. Analyse des Acteurs et Rôles

Le système repose sur quatre rôles d'utilisateurs authentifiés, un profil de visiteur et un agent intelligent (IA) de premier niveau.

### **A. Employé (Utilisateur Final)**
*   **Rôle :** Acteur principal qui interagit avec le portail pour son quotidien administratif et ses requêtes.
*   **Actions principales :**
    *   S'inscrire et se connecter à son espace personnel via authentification JWT.
    *   Consulter son profil de carrière, ses informations personnelles et mettre à jour ses coordonnées.
    *   Réaliser son **Pointage quotidien** (Clock-In / Clock-Out) entre 08:00 et 20:00.
    *   Suivre son solde de congés restants et soumettre des **Demandes de congé** (annuel, exceptionnel, maladie).
    *   Soumettre des **Réclamations** ou des **Questions** catégorisées, et joindre des justificatifs d'absence sous 48h.
    *   Interagir avec le chatbot intelligent **YES2L (Bondin Assistant)** pour des requêtes contextuelles (solde de congés, score de probabilité d'acceptation, calendrier de jours fériés).

### **B. Responsable RH (Rôle Métier)**
*   **Rôle :** Gère la gestion administrative, les effectifs et les congés de la Maison Bondin.
*   **Actions principales :**
    *   Visualiser, approuver ou refuser les demandes de congé soumises par les employés.
    *   Consulter et répondre aux requêtes de catégorie "RH" (ex: demandes de crédit, justificatifs d'absence).
    *   Consulter le tableau de bord RH contenant les charges de personnel et le **Leaderboard de présence** (Top 5 des retards et absences injustifiées).

### **C. Responsable IT (Rôle Technique)**
*   **Rôle :** Assure le support technique et la résolution des incidents technologiques internes.
*   **Actions principales :**
    *   Visualiser et traiter les réclamations de catégorie "IT" (problèmes de WiFi, VPN, matériel ou logiciels).
    *   Apporter des réponses de dépannage technique et clore les incidents résolus.
    *   Consulter le tableau de bord technique (statistiques globales de résolution des tickets).

### **D. Administrateur (Superviseur Système)**
*   **Rôle :** Supervision globale de l'intégrité opérationnelle de la plateforme (Règle métier : un seul administrateur autorisé dans le système).
*   **Actions principales :**
    *   Gérer les comptes utilisateurs (création, activation, révocation, modification de rôles).
    *   Visualiser tous les tickets de la plateforme (IT & RH) et l'intégralité des congés.
    *   Consulter les statistiques globales d'activité système.

### **E. Système / Chatbot YES2L (Acteur Secondaire / IA)**
*   **Rôle :** L'intelligence artificielle contextuelle (moteur Google Gemini) intégrée en temps réel.
*   **Fonctions automatisées :**
    *   Trier et catégoriser automatiquement les requêtes en "IT" ou "RH" lors de la soumission selon les mots-clés du contenu.
    *   Fournir des réponses et des simulations personnalisées basées sur le contexte utilisateur réel (sans jamais inventer de données).
    *   Stocker l'historique d'échange sécurisé (limité aux 60 derniers messages pour optimiser la mémoire).

---

## 2. Diagrammes de Cas d'Utilisation (Use Case)

### Version A : PlantUML (Pour outils traditionnels)

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle

actor "Visiteur / Public" as V
actor "Employé" as E
actor "Responsable RH" as RH
actor "Responsable IT" as IT
actor "Administrateur" as Admin

rectangle "Portail Interne Maison Bondin" {
  usecase "S'authentifier (Login / Register)" as UC_Auth
  usecase "Consulter Profil & Modifier MDP" as UC_Profile
  usecase "Effectuer son Pointage (Clock-in/out)" as UC_Pointage
  usecase "Gérer ses demandes de congé" as UC_Leave
  usecase "Soumettre une Réclamation (RH/IT)" as UC_Recl
  usecase "Discuter avec le Chatbot YES2L" as UC_Chat
  
  usecase "Traiter les tickets RH & Crédits" as UC_ManageRH
  usecase "Consulter Leaderboard Présence" as UC_Leaderboard
  
  usecase "Traiter les tickets IT & Incidents" as UC_ManageIT
  usecase "Consulter Stats Globales Système" as UC_Stats
  
  usecase "Gérer les Utilisateurs (Habilitations)" as UC_AdminUsers
}

V --> UC_Auth

E --|> V
E --> UC_Profile
E --> UC_Pointage
E --> UC_Leave
E --> UC_Recl
E --> UC_Chat

RH --|> E
RH --> UC_ManageRH
RH --> UC_Leaderboard
RH --> UC_Stats

IT --|> E
IT --> UC_ManageIT
IT --> UC_Stats

Admin --|> RH
Admin --|> IT
Admin --> UC_AdminUsers

UC_Leave ..> UC_Auth : <<include>>
UC_Recl ..> UC_Auth : <<include>>
UC_Chat ..> UC_Auth : <<include>>
UC_AdminUsers ..> UC_Auth : <<include>>
@enduml
```

### Version B : Mermaid (Rendu natif en Markdown)

```mermaid
flowchart TD
    subgraph Acteurs
        V[Visiteur]
        E[Employé]
        RH[Responsable RH]
        IT[Responsable IT]
        Admin[Administrateur]
    end

    subgraph Portail [Portail Interne Maison Bondin]
        UC_Auth(S'authentifier)
        UC_Profile(Consulter Profil & MDP)
        UC_Pointage(Effectuer son Pointage)
        UC_Leave(Gérer ses demandes de congé)
        UC_Recl(Soumettre une Réclamation)
        UC_Chat(Discuter avec YES2L)
        UC_ManageRH(Traiter les requêtes RH & Crédits)
        UC_Leaderboard(Consulter Leaderboard de Présence)
        UC_ManageIT(Traiter les incidents IT)
        UC_Stats(Consulter Stats Globales Système)
        UC_AdminUsers(Gérer les Utilisateurs)
    end

    %% Relations
    V --> UC_Auth
    E --> UC_Profile
    E --> UC_Pointage
    E --> UC_Leave
    E --> UC_Recl
    E --> UC_Chat
    
    RH --> UC_ManageRH
    RH --> UC_Leaderboard
    RH --> UC_Stats
    
    IT --> UC_ManageIT
    IT --> UC_Stats
    
    Admin --> UC_AdminUsers

    %% Héritages de Rôles
    E -.->|hérite| V
    RH -.->|hérite| E
    IT -.->|hérite| E
    Admin -.->|hérite| RH
    Admin -.->|hérite| IT
```

---

## 3. Diagrammes de Séquence (Flux Réels du Projet)

### Flux 1 : Soumission d'une Réclamation avec Catégorisation Automatique

Ce flux montre comment l'application catégorise automatiquement un ticket selon des mots-clés si aucune catégorie n'est choisie par l'utilisateur.

#### Option A : Code PlantUML
```plantuml
@startuml
autonumber
actor Employé
participant "Interface Angular (RequestsComponent)" as UI
participant "ReclamationController" as API
database "Base de Données (H2)" as DB

Employé -> UI: Saisir sujet, description (sans catégorie) et soumettre
UI -> API: POST /reclamation/add (Payload JSON)
Note over API: Analyse du contenu en minuscules :\nrecherche de "wifi", "vpn", "computer", "it"...
alt Contenu contient un mot-clé technique
    Note over API: Set Category = "IT"
else Autre contenu
    Note over API: Set Category = "RH"
end
API -> DB: Enregistrer la Réclamation (status="Pending", dateCreation=now)
DB --> API: OK (Objet sauvegardé avec ID)
API --> UI: Retourne la Réclamation enregistrée (JSON)
UI --> Employé: Affiche un message de succès avec la catégorie attribuée
@enduml
```

#### Option B : Code Mermaid
```mermaid
sequenceDiagram
    autonumber
    actor Employé
    participant UI as Interface Angular
    participant API as ReclamationController
    participant DB as Base de Données (H2)

    Employé->>UI: Saisir sujet & description et valider
    UI->>API: POST /reclamation/add (JSON)
    Note over API: Analyse automatique du texte :<br/>recherche de "wifi", "vpn", "imprimante", "it", etc.
    alt Présence de mots-clés techniques
        Note over API: Category = IT
    else Autres termes
        Note over API: Category = RH
    end
    API->>DB: Sauvegarder Reclamation (status="Pending")
    DB-->>API: OK (ID généré)
    API-->>UI: Retourne l'objet sauvegardé (JSON)
    UI-->>Employé: Notification de succès et affichage dans la liste
```

---

### Flux 2 : Processus de Pointage et Sanction Automatique de Retard

Ce flux modélise l'algorithme critique du projet : si un employé effectue son pointage d'entrée après 08h30, le système incrémente son compteur de retards. Tous les 5 retards, un jour de congé annuel est déduit de son solde.

#### Option A : Code PlantUML
```plantuml
@startuml
autonumber
actor Employé
participant "Interface Angular (Dashboard)" as UI
participant "PointageController" as API
database "Base de Données" as DB

Employé -> UI: Clique sur "Clock-In" (Pointage Entrée)
UI -> API: POST /api/pointage/clock-in (Authorization: Bearer JWT)
Note over API: Valide si l'heure est dans la plage autorisée (08:00 - 20:00)
API -> DB: findById(userId)
DB --> API: Entité User (nbRetards, congeRestant)

alt Heure Actuelle > 08:30 (Retard avéré)
    Note over API: nbRetards = nbRetards + 1
    alt nbRetards % 5 == 0 (Seuil de déduction atteint)
        Note over API: congeRestant = Math.max(0, congeRestant - 1)
        Note over API: leaveDeducted = true
    else
        Note over API: leaveDeducted = false
    end
    API -> DB: Mettre à jour l'entité User (save)
    DB --> API: Succès
    API --> UI: Retourne { status: "retard", congeRestant, nbRetards, leaveDeducted: true/false }
else Heure Actuelle <= 08:30 (À l'heure)
    API --> UI: Retourne { status: "present", congeRestant, nbRetards, leaveDeducted: false }
end

UI --> Employé: Met à jour les compteurs du tableau de bord et affiche une alerte contextuelle
@enduml
```

#### Option B : Code Mermaid
```mermaid
sequenceDiagram
    autonumber
    actor Employé
    participant UI as Interface Angular
    participant API as PointageController
    participant DB as Base de Données

    Employé->>UI: Clique sur "Clock-In"
    UI->>API: POST /api/pointage/clock-in (Header JWT)
    Note over API: Vérifie la plage horaire valide (08:00 - 20:00)
    API->>DB: findById(userId)
    DB-->>API: Retourne User (nbRetards, congeRestant)
    
    alt Heure actuelle > 08:30 (En retard)
        Note over API: nbRetards = nbRetards + 1
        alt nbRetards est un multiple de 5
            Note over API: congeRestant = congeRestant - 1
            Note over API: Déduction effectuée (leaveDeducted = true)
        else
            Note over API: Pas de déduction (leaveDeducted = false)
        end
        API->>DB: Sauvegarder l'entité User
        DB-->>API: OK
        API-->>UI: JSON { status: 'retard', nbRetards, congeRestant, leaveDeducted }
    else À l'heure
        API-->>UI: JSON { status: 'present', nbRetards, congeRestant, leaveDeducted: false }
    end
    UI-->>Employé: Affiche le statut du pointage et actualise les Widgets
```

---

## 4. Diagramme de Classes (Entités Core Réelles)

Ce diagramme montre les classes réelles implémentées dans le backend Java avec leurs attributs exacts et types correspondants.

### Version A : Code PlantUML
```plantuml
@startuml
skinparam classAttributeIconSize 0

class User {
  +Long id
  +String email
  +String password
  +String nomUtilisateur
  +String role
  +String status
  +LocalDateTime createdAt
  +LocalDateTime lastLogin
  +Integer congeRestant
  +String department
  +Integer nbRetards
  +Integer nbAbsencesNonJustifiees
}

class ProfileUser {
  +Long id
  +Long userId
  +String nomComplet
  +String email
  +String department
  +String poste
  +String telephone
  +String experience
  +String imageurl
}

class LeaveRequest {
  +Long id
  +Long userId
  +String userName
  +LocalDate startDate
  +LocalDate endDate
  +String type
  +String reason
  +String status
  +LocalDateTime createdAt
}

class Reclamation {
  +Long id
  +Long userId
  +String sujet
  +String description
  +String status
  +String category
  +String subCategory
  +String reponse
  +String type
  +String userEmail
  +LocalDateTime dateCreation
  +LocalDateTime dateModification
}

class ChatMessage {
  +Long id
  +Long userId
  +Role role
  +String content
  +LocalDateTime timestamp
}

class Message {
  +Long id
  +Long senderId
  +Long receiverId
  +boolean isBroadcast
  +String content
  +String attachmentUrl
  +String attachmentName
  +String attachmentType
  +LocalDateTime timestamp
}

User "1" -- "1" ProfileUser : possède >
User "1" -- "0..*" LeaveRequest : demande >
User "1" -- "0..*" Reclamation : dépose >
User "1" -- "0..*" ChatMessage : échange >
User "1" -- "0..*" Message : envoie/reçoit >
@enduml
```

### Version B : Code Mermaid
```mermaid
classDiagram
    class User {
        +Long id
        +String email
        +String password
        +String nomUtilisateur
        +String role
        +String status
        +LocalDateTime createdAt
        +LocalDateTime lastLogin
        +Integer congeRestant
        +String department
        +Integer nbRetards
        +Integer nbAbsencesNonJustifiees
    }

    class ProfileUser {
        +Long id
        +Long userId
        +String nomComplet
        +String email
        +String department
        +String poste
        +String telephone
        +String experience
        +String imageurl
    }

    class LeaveRequest {
        +Long id
        +Long userId
        +String userName
        +LocalDate startDate
        +LocalDate endDate
        +String type
        +String reason
        +String status
        +LocalDateTime createdAt
    }

    class Reclamation {
        +Long id
        +Long userId
        +String sujet
        +String description
        +String status
        +String category
        +String subCategory
        +String reponse
        +String type
        +String userEmail
        +LocalDateTime dateCreation
        +LocalDateTime dateModification
    }

    class ChatMessage {
        +Long id
        +Long userId
        +Role role
        +String content
        +LocalDateTime timestamp
    }

    class Message {
        +Long id
        +Long senderId
        +Long receiverId
        +boolean isBroadcast
        +String content
        +String attachmentUrl
        +String attachmentName
        +String attachmentType
        +LocalDateTime timestamp
    }

    User "1" -- "1" ProfileUser : possède
    User "1" -- "0..*" LeaveRequest : demande
    User "1" -- "0..*" Reclamation : dépose
    User "1" -- "0..*" ChatMessage : échange
    User "1" -- "0..*" Message : envoie/reçoit
```

---

> [!TIP]
> **Comment compiler ces diagrammes en images ?**
> 
> * **Pour PlantUML** :
>   1. Installez l'extension **PlantUML** dans VS Code.
>   2. Installez **Graphviz** sur votre système d'exploitation si nécessaire pour les rendus complexes.
>   3. Appuyez sur `Alt + D` dans votre éditeur pour prévisualiser le diagramme actif en temps réel.
> 
> * **Pour Mermaid** :
>   1. Installez l'extension **Markdown Preview Mermaid Support** dans VS Code.
>   2. Ouvrez l'aperçu standard du fichier Markdown (`Ctrl + Shift + V`), les graphiques se dessineront automatiquement en couleur.
>   3. Vous pouvez également copier le code et le coller dans [Mermaid Live Editor](https://mermaid.live/) pour l'exporter en PNG/SVG.
> 
> * **Export en PDF** :
>   Faites un clic droit sur ce fichier ouvert dans VS Code et sélectionnez **Markdown PDF: Export (pdf)** pour générer votre document de stage formaté de façon professionnelle.

---
*Document technique validé pour la plateforme de communication et de gestion RH de la Maison Bondin — Promotion Mai 2026.*
