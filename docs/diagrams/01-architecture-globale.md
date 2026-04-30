# Diagramme 1 — Architecture globale

## Description

Ce diagramme présente l'architecture trois-tiers de la plateforme FlipLearn. Le client React (Vite) communique avec le backend Node.js / Express via une API REST sur HTTPS et un canal temps réel WebSocket (Socket.io) pour le chat, les notifications et le Quiz Battle. Le backend orchestre quatre services externes : MongoDB Atlas pour la persistance, Cloudinary pour le stockage des vidéos et fichiers, Groq (Llama 3.3) pour les assistants IA et la génération de QCM, et OpenAI (Whisper + GPT-4o) pour l'analyse de transcripts vidéo.

```mermaid
graph LR
    subgraph Client["Client — Navigateur"]
        UI["React 18 + Vite<br/>(SPA)"]
        WS["Socket.io client<br/>(temps réel)"]
    end

    subgraph Server["Backend — Render.com"]
        API["Node.js + Express<br/>API REST /api"]
        IO["Socket.io server<br/>(chat, notifs, quiz)"]
        Auth["JWT Middleware<br/>authMiddleware.js"]
        API --> Auth
        IO --> Auth
    end

    subgraph Data["Couche de données"]
        Mongo[("MongoDB Atlas<br/>Mongoose ODM")]
        Cloud[("Cloudinary<br/>vidéos + fichiers")]
    end

    subgraph AI["Services IA"]
        Groq["Groq API<br/>Llama 3.3 70B<br/>(QCM, chatbot)"]
        OpenAI["OpenAI API<br/>Whisper + GPT-4o<br/>(transcripts vidéo)"]
    end

    subgraph Mail["Service email"]
        Brevo["Brevo (primary)<br/>Resend / Gmail (fallback)"]
    end

    UI -- "HTTPS / JSON" --> API
    WS <-- "WebSocket" --> IO
    Auth -- "verify token" --> Mongo
    API -- "CRUD" --> Mongo
    API -- "upload / fetch" --> Cloud
    API -- "completions" --> Groq
    API -- "transcribe / analyze" --> OpenAI
    API -- "send mail" --> Brevo

    classDef client fill:#EBF3FA,stroke:#1B4F72,stroke-width:1.5px,color:#1B4F72
    classDef server fill:#FEF3C7,stroke:#D97706,stroke-width:1.5px,color:#78350F
    classDef data fill:#DCFCE7,stroke:#15803D,stroke-width:1.5px,color:#14532D
    classDef ai fill:#F3E8FF,stroke:#9333EA,stroke-width:1.5px,color:#581C87
    classDef mail fill:#FEE2E2,stroke:#DC2626,stroke-width:1.5px,color:#7F1D1D

    class UI,WS client
    class API,IO,Auth server
    class Mongo,Cloud data
    class Groq,OpenAI ai
    class Brevo mail
```

## Légende

- **Bleu** : couche cliente — SPA React rendue dans le navigateur de l'utilisateur.
- **Jaune** : backend hébergé sur Render.com (free tier), seul composant actif côté serveur.
- **Vert** : couche de persistance et stockage de fichiers, externalisée sur des SaaS managés.
- **Violet** : services d'intelligence artificielle, utilisés à la demande pour la génération de contenu et l'assistance.
- **Rouge** : service transactionnel d'envoi d'emails de notification.

## Notes

L'architecture suit le découplage strict frontend / backend. En production, le backend sert également les fichiers statiques du build Vite (`frontend/dist/`) sous le même domaine, ce qui simplifie le déploiement (un seul service Render). Le rate limiting (`express-rate-limit`) protège les endpoints sensibles, et les quotas mensuels (`aiQuota`) limitent les appels à Groq pour préserver le free tier.
