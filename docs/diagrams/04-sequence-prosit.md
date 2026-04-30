# Diagramme 4 — Séquence : cycle complet d'un Prosit

## Description

Ce diagramme de séquence retrace un cycle de Prosit complet, depuis sa création par le professeur jusqu'au calcul des notes finales individualisées. Il met en évidence les transitions de phase (`brouillon` → `aller` → `recherche` → `retour` → `evalue`), les contributions individuelles, l'évaluation par les pairs et le calcul de la note pondérée 70% prof + 30% pairs (Falchikov, 2005).

```mermaid
sequenceDiagram
    autonumber
    actor P as Prof
    actor E1 as Étudiant 1
    actor E2 as Étudiant 2
    participant API as Backend (Express)
    participant DB as MongoDB

    Note over P,DB: Création & publication
    P->>API: POST /api/prosits (titre, énoncé, dates, grille)
    API->>DB: insert prosit (status: brouillon)
    DB-->>API: prositId
    P->>API: POST /:id/groupes/auto (studentIds[])
    API->>API: buildRandomGroups + assignRolesWithRotation
    API->>DB: update groupes
    P->>API: POST /:id/transition (→ aller)
    API->>DB: status: aller
    API-->>E1: notification temps réel
    API-->>E2: notification temps réel

    Note over E1,DB: Phase Aller (en classe)
    E1->>API: PUT /:id/groupes/0 (mots-clés, problématique, hypothèses)
    API->>DB: update groupes[0]
    P->>API: POST /:id/transition (→ recherche)
    API->>DB: status: recherche

    Note over E1,DB: Phase Recherche (autonome)
    E1->>API: POST /:id/groupes/0/contribution (texte + sources)
    API->>DB: update membre.contribution
    E2->>API: POST /:id/groupes/0/contribution
    API->>DB: update membre.contribution
    P->>API: POST /:id/transition (→ retour)
    API->>DB: status: retour
    Note over API: deadline peer = dateRetour + 3j

    Note over E1,DB: Phase Retour (en classe)
    E1->>API: PUT /:id/groupes/0 (solution finale)
    P->>API: PUT /:id/groupes/0/evaluation (note 16/20, commentaire)
    API->>DB: groupe.evaluation
    Note over API: rotation rôles ✓ (pas encore d'XP)

    Note over E1,DB: Évaluation par les pairs
    E1->>API: POST /:id/groupes/0/self-assessment
    E1->>API: POST /:id/groupes/0/peer-assessment (target: E2)
    E2->>API: POST /:id/groupes/0/self-assessment
    E2->>API: POST /:id/groupes/0/peer-assessment (target: E1)
    API->>DB: peerAssessments[], selfAssessments[]

    Note over P,DB: Finalisation (auto si peer complets ou deadline passée)
    API->>API: canTransitionToEvalue() = OK
    API->>API: computeFinalScores (70% prof + 30% pairs)
    API->>API: awardPrositXP (coef individualisé, MVC, free-rider)
    API->>DB: groupe.finalIndividualScores + status: evalue
    API-->>E1: notification "Note finale: 16.6/20, +180 XP"
    API-->>E2: notification "Note finale: 14.2/20, +120 XP"
    API-->>P: notification "Prosit clôturé"
```

## Légende

- **Acteurs** (`actor`) : utilisateurs humains qui interagissent avec le système.
- **Participants** (`participant`) : composants techniques (backend, base de données).
- **Flèches pleines** (`->>`) : appel synchrone (HTTP request).
- **Flèches pointillées** (`-->>`) : réponse ou notification asynchrone (Socket.io).
- **`Note over`** : annotation contextuelle, regroupement logique des étapes par phase.

## Notes

Le diagramme insiste sur la dissociation entre l'évaluation prof (étape 18, qui ne crédite plus d'XP en flat) et la finalisation (étape 25), gardée derrière deux conditions : tous les groupes notés et tous les peer-assessments collectés (ou deadline dépassée). Cette séparation matérialise le principe de Falchikov (2005) : la note doit refléter à la fois l'expertise enseignante et la dynamique intra-groupe, observable seulement par les pairs. Les rotations de rôles CESI sont enregistrées dès l'évaluation prof ; les XP individualisées et les badges (MVC, free-rider) attendent la finalisation.
