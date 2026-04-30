# Diagramme 3 — Modèle de classes (UML)

## Description

Ce diagramme de classes décrit les huit entités centrales du domaine FlipLearn, leurs attributs essentiels et leurs relations. La modélisation suit fidèlement les schémas Mongoose du backend (un document MongoDB par classe principale, sous-documents pour les structures imbriquées comme les groupes Prosit ou les évaluations). Les cardinalités sont notées en notation UML standard (`1`, `0..1`, `*`, `1..*`).

```mermaid
classDiagram
    direction LR

    class User {
        +ObjectId _id
        +string nom
        +string prenom
        +string email
        +string passwordHash
        +string role
        +string filiere
        +string promotion
        +int points
        +ObjectId[] badges
        +int prositRolesCycle
        +login(email, pwd)
        +addPoints(amount)
    }

    class Course {
        +ObjectId _id
        +string titre
        +string description
        +ObjectId professorId
        +string filiere
        +string promotion
        +bool isActive
        +AiPersona aiPersona
        +LearningOutcome[] learningOutcomes
        +string pedagogicalContract
    }

    class Video {
        +ObjectId _id
        +string titre
        +string url
        +int duration
        +int order
        +Chapter[] chapters
        +ObjectId courseId
        +ObjectId[] coversOutcomes
        +WatchedEntry[] watchedBy
        +recordWatch(userId, pct)
    }

    class QCM {
        +ObjectId _id
        +string titre
        +ObjectId videoId
        +Question[] questions
        +int pointsPerQuestion
        +int timerSeconds
        +Resultat[] resultats
        +submit(userId, answers)
    }

    class Prosit {
        +ObjectId _id
        +string titre
        +string enonce
        +string status
        +ObjectId courseId
        +Date dateAller
        +Date dateRetour
        +Groupe[] groupes
        +bool peerAssessmentEnabled
        +Date peerAssessmentDeadline
        +transition(next)
        +finalize()
    }

    class Progress {
        +ObjectId _id
        +ObjectId userId
        +ObjectId courseId
        +ObjectId[] videosCompleted
        +QcmScore[] qcmScores
        +Date lastActivity
    }

    class Badge {
        +ObjectId _id
        +string key
        +string nom
        +string description
        +string icon
        +string rarity
        +string condition
    }

    class LearningPath {
        +ObjectId _id
        +ObjectId courseId
        +string title
        +Step[] steps
        +Date publishedAt
        +ObjectId createdBy
    }

    %% Relations
    User "1" -- "*" Course : enseigne
    Course "1" -- "*" Video : contient
    Video "1" -- "0..1" QCM : associé à
    Course "0..1" -- "0..1" Prosit : ancré dans
    User "*" -- "*" Prosit : participe
    User "1" -- "*" Progress : suit
    Course "1" -- "*" Progress : sur
    User "*" -- "*" Badge : obtenus
    Course "1" -- "0..1" LearningPath : scénarisé par
    LearningPath ..> Video : référence
    LearningPath ..> QCM : référence
    LearningPath ..> Prosit : référence
    Video ..> Course : couvre outcomes
```

## Légende

- **Classe** : rectangle à 3 compartiments — nom, attributs, méthodes.
- **`+`** : visibilité publique (toutes les méthodes exposées par les controllers).
- **Trait plein** : association directe (référence persistée en base).
- **Trait pointillé** (`..>`) : dépendance polymorphe ou logique non matérialisée par une foreign-key stricte.
- **Cardinalités** : `1` (un et un seul), `0..1` (optionnel), `*` (plusieurs), `1..*` (au moins un).

## Notes

Les attributs montrés sont volontairement simplifiés : les sous-documents (`Question`, `Resultat`, `Groupe`, `WatchedEntry`, `Step`, `LearningOutcome`) regroupent eux-mêmes plusieurs champs détaillés dans le code source (`backend/models/`). Le `LearningPath` est polymorphe : chaque `Step` référence l'un des modèles `Video`, `QCM`, `Prosit` ou `Resource` via `resourceModel` + `resourceId`, ce qui n'est pas exprimable en notation classique — d'où les flèches pointillées. La gamification (points, badges, leaderboard) traverse les entités via le service `points.js`.
