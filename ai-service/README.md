# FlipLearn AI Service

Microservice Python/Flask qui héberge les modèles **TensorFlow** de la plateforme FlipLearn.

## Rôle dans l'architecture

```
React (frontend) ──► Node.js (backend) ──► ai-service (Python + TensorFlow)
                                                      │
                                                      ├─ extract_data.py  (MongoDB → dataset)
                                                      ├─ train_success.py (modèle régression)
                                                      ├─ train_dropout.py (modèle classification)
                                                      └─ predictor.py     (inférence)
```

Le backend Node.js n'appelle JAMAIS directement MongoDB pour l'IA — il passe par ce service via HTTP.

## Modèles fournis

| Modèle | Type | Prédit | Métriques suivies |
|--------|------|--------|-------------------|
| `success_predictor` | Régression (MLP Keras) | Score final d'un étudiant sur un cours (0-100) | MAE, RMSE, R² |
| `dropout_detector` | Classification binaire (MLP Keras) | Probabilité de décrochage | Accuracy, Precision, Recall, F1, ROC-AUC |

Features utilisées (9 dimensions) :
- `avg_past_score` — moyenne des QCM antérieurs
- `past_qcm_count` — nb de QCM déjà tentés
- `video_completion_rate` — taux de vidéos terminées sur le cours cible
- `flashcards_studied` — nb de decks créés/suivis
- `days_since_last_activity`
- `active_days_last_30`
- `courses_completed` — historique de cours complétés
- `filiere_idx` — filière encodée
- `course_difficulty` — difficulté estimée du cours (1 - moyenne des scores de la promo)

## Installation

```bash
cd ai-service
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux/Mac
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Editer .env : MONGODB_URI + AI_SERVICE_TOKEN (mettre le même token côté backend Node)
```

## Utilisation

### 1. Entraîner les modèles (une fois avant premier usage)

```bash
# Depuis ai-service/
python -m src.extract_data     # (optionnel, sera appelé automatiquement)
python -m src.train_success
python -m src.train_dropout
```

Si MongoDB contient peu de données, un **dataset synthétique réaliste** est généré automatiquement pour permettre l'entraînement.

Les fichiers produits (dans `models/`) :
- `success_predictor.keras` + `success_scaler.pkl` + `success_meta.pkl`
- `dropout_detector.keras` + `dropout_scaler.pkl` + `dropout_meta.pkl`

### 2. Démarrer l'API Flask

```bash
python app.py
# → écoute sur http://localhost:5001
```

Pour la production :
```bash
gunicorn -w 2 -b 0.0.0.0:5001 app:app
```

### 3. Tester

```bash
curl http://localhost:5001/health
```

## Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET  | `/health` | Ping + statut des modèles (public) |
| POST | `/train` | Re-entraîne tous les modèles |
| POST | `/predict/features` | Prédit à partir de features brutes |
| GET  | `/predict/student/<uid>/<cid>` | Prédit pour (étudiant, cours) via Mongo |
| GET  | `/students/at-risk` | Liste les étudiants à risque |

Toutes les routes (hors `/health`) exigent le header :
```
X-AI-Service-Token: <AI_SERVICE_TOKEN>
```

## Intégration avec le backend Node.js

Ajouter dans `backend/.env` :
```
AI_SERVICE_URL=http://localhost:5001
AI_SERVICE_TOKEN=<même token que ai-service/.env>
```

Le backend expose ensuite les routes suivantes (prefix `/api/ai`, JWT requis) :
- `GET  /api/ai/health`
- `POST /api/ai/train` (prof/admin)
- `POST /api/ai/predict` (body : `features` ou `userId+courseId`)
- `GET  /api/ai/me/:courseId` (étudiant : sa propre prédiction)
- `GET  /api/ai/at-risk?courseId=...` (prof/admin)
- `GET  /api/ai/overview` (prof/admin — vue dashboard)

## Workflow complet recommandé

1. Démarrer MongoDB
2. Démarrer ai-service : `python app.py`
3. Démarrer le backend Node : `npm run dev:backend`
4. Démarrer le frontend : `npm run dev:frontend`
5. Se connecter en tant que **professeur**, aller dans **IA pédagogique**
6. Cliquer sur **Entraîner les modèles** (première fois)
7. Consulter les prédictions et la liste des étudiants à risque

## Re-entraînement périodique

En production, programmer un cron job qui appelle `POST /train` chaque semaine pour que les modèles apprennent des nouvelles données accumulées.

## Limitations connues

- Le modèle utilise `filiere_idx` via un hash — pour un usage production il faudrait un encoder persisté.
- Les features sont calculées en direct à chaque appel `/predict/student/...` (peut être lent sur une grosse base). À optimiser avec un cache Redis si nécessaire.
- Le fallback synthétique est utile en phase de développement mais les métriques affichées ne reflètent la réalité qu'à mesure que des données vraies s'accumulent.

## Pour la soutenance PFE

Points à mettre en avant :
- Vraie architecture microservices (Node + Python découplés)
- Vrais modèles ML entraînés avec TensorFlow (pas juste des appels API LLM)
- Métriques d'évaluation rigoureuses (train/test split, scaler persisté)
- Gestion du déséquilibre de classes (class_weight)
- Early stopping + reduce learning rate on plateau
- Sécurité inter-services via token partagé
- Interface prof qui consomme les prédictions
