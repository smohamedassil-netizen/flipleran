"""
Extraction des données depuis MongoDB et construction d'un dataset pour l'entraînement.

Stratégie :
- On parcourt toutes les entrées Progress (une par couple user/course).
- Pour chaque entrée, on calcule des FEATURES agrégées représentant le comportement
  de l'étudiant AVANT ce cours (historique).
- La CIBLE (label) est le score moyen obtenu sur les QCM de ce cours.

Si la base MongoDB est vide ou inaccessible, on génère un dataset SYNTHÉTIQUE
avec des patterns réalistes pour permettre l'entraînement (fallback).

Chaque ligne du dataset final représente une opportunité de prédiction :
« Étant donné le profil d'un étudiant, quel score aura-t-il sur ce cours ? »
"""
from __future__ import annotations

import random
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta, timezone
from typing import Iterable

import numpy as np
import pandas as pd
from pymongo import MongoClient
from pymongo.errors import PyMongoError

from .config import (
    MONGODB_URI,
    DB_NAME,
    DATASET_PATH,
    RANDOM_SEED,
    DROPOUT_SCORE_THRESHOLD,
    DROPOUT_INACTIVITY_DAYS,
)

random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)


# ────────────────────────────────────────────────────────────────────────────
# Schéma des features
# ────────────────────────────────────────────────────────────────────────────
FEATURE_COLUMNS = [
    "avg_past_score",          # moyenne des QCM déjà passés (0-100)
    "past_qcm_count",          # nb total de QCM tentés
    "video_completion_rate",   # % vidéos terminées sur ce cours (0-1)
    "flashcards_studied",      # nb de flashcards étudiées
    "days_since_last_activity",
    "active_days_last_30",     # nb de jours actifs sur les 30 derniers
    "courses_completed",       # nb de cours déjà terminés (>=50% QCM)
    "filiere_idx",             # filière encodée en entier
    "course_difficulty",       # difficulté estimée du cours (1 - moyenne promo)
]

TARGET_SUCCESS = "final_score"    # régression 0-100
TARGET_DROPOUT = "dropout_risk"   # classification 0/1


@dataclass
class StudentSample:
    """Un échantillon d'entraînement = un (étudiant, cours)."""
    avg_past_score: float
    past_qcm_count: int
    video_completion_rate: float
    flashcards_studied: int
    days_since_last_activity: int
    active_days_last_30: int
    courses_completed: int
    filiere_idx: int
    course_difficulty: float
    final_score: float
    dropout_risk: int


# ────────────────────────────────────────────────────────────────────────────
# Extraction depuis MongoDB
# ────────────────────────────────────────────────────────────────────────────
def _connect():
    try:
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=3000)
        client.admin.command("ping")
        return client[DB_NAME]
    except PyMongoError as exc:
        print(f"[extract] MongoDB indisponible ({exc}). Fallback synthétique.")
        return None


def _filiere_encoder(filieres: Iterable[str]) -> dict[str, int]:
    unique = sorted({(f or "unknown").lower() for f in filieres})
    return {f: i for i, f in enumerate(unique)}


def _extract_from_mongo(db) -> list[StudentSample]:
    """
    Lit Progress + User + QCM + Course et calcule les features pour chaque
    couple (user, course) qui a au moins un résultat QCM.
    """
    users_by_id = {str(u["_id"]): u for u in db.users.find({"role": "etudiant"})}
    if not users_by_id:
        return []

    filiere_enc = _filiere_encoder(u.get("filiere", "") for u in users_by_id.values())

    # Moyenne de score par cours (= difficulté inverse) et par étudiant
    qcm_docs = list(db.qcms.find({}, {"videoId": 1, "resultats": 1}))
    video_to_qcms: dict[str, list] = {}
    for qcm in qcm_docs:
        video_to_qcms.setdefault(str(qcm.get("videoId")), []).append(qcm)

    # Lookup courses par videoId via Video.courseId
    videos = {str(v["_id"]): v for v in db.videos.find({}, {"courseId": 1})}

    # Map course_id -> liste des scores (tous étudiants confondus)
    course_scores: dict[str, list[float]] = {}
    for qcm in qcm_docs:
        video_id = str(qcm.get("videoId"))
        course_id = str(videos.get(video_id, {}).get("courseId", "")) or ""
        for res in qcm.get("resultats", []):
            course_scores.setdefault(course_id, []).append(float(res.get("score", 0)))

    # Flashcards étudiées par user (approximation : toutes les cartes des decks suivis)
    # Ici on compte les cartes dans les decks créés ou consultés — approximation suffisante.
    cards_by_user: dict[str, int] = {}
    for deck in db.decks.find({}, {"createdBy": 1}):
        uid = str(deck.get("createdBy"))
        cards_by_user[uid] = cards_by_user.get(uid, 0) + 1

    now = datetime.now(timezone.utc)
    samples: list[StudentSample] = []

    for prog in db.progresses.find({}):
        user_id = str(prog.get("userId"))
        course_id = str(prog.get("courseId"))
        user = users_by_id.get(user_id)
        if not user:
            continue

        qcm_scores = [float(s.get("score", 0)) for s in prog.get("qcmScores", [])]
        if not qcm_scores:
            continue

        # Historique : tous les autres progress du même user (autres cours)
        other_scores: list[float] = []
        other_courses_completed = 0
        for other in db.progresses.find({"userId": prog["userId"], "courseId": {"$ne": prog["courseId"]}}):
            s = [float(x.get("score", 0)) for x in other.get("qcmScores", [])]
            if s:
                other_scores.extend(s)
                if len(s) >= 2 and np.mean(s) >= 50:
                    other_courses_completed += 1

        avg_past = float(np.mean(other_scores)) if other_scores else 50.0
        last_activity = prog.get("lastActivity", now)
        if isinstance(last_activity, datetime):
            days_since = max(0, (now - last_activity.replace(tzinfo=timezone.utc)).days)
        else:
            days_since = 0

        # Vidéos complétées sur ce cours (taux)
        videos_completed = len(prog.get("videosCompleted", []))
        total_course_videos = db.videos.count_documents({"courseId": prog["courseId"]}) or 1
        completion_rate = min(1.0, videos_completed / total_course_videos)

        # Difficulté du cours = 1 - (moyenne normalisée)
        course_avg = float(np.mean(course_scores.get(course_id, [50.0])))
        difficulty = max(0.0, min(1.0, 1.0 - course_avg / 100.0))

        # Jours actifs sur les 30 derniers (approximation via lastActivity)
        active_days_30 = min(30, max(1, 30 - days_since))

        final_score = float(np.mean(qcm_scores))
        dropout = int(final_score < DROPOUT_SCORE_THRESHOLD or days_since > DROPOUT_INACTIVITY_DAYS)

        samples.append(StudentSample(
            avg_past_score=avg_past,
            past_qcm_count=len(other_scores),
            video_completion_rate=completion_rate,
            flashcards_studied=cards_by_user.get(user_id, 0),
            days_since_last_activity=days_since,
            active_days_last_30=active_days_30,
            courses_completed=other_courses_completed,
            filiere_idx=filiere_enc.get((user.get("filiere") or "unknown").lower(), 0),
            course_difficulty=difficulty,
            final_score=final_score,
            dropout_risk=dropout,
        ))

    return samples


# ────────────────────────────────────────────────────────────────────────────
# Fallback : données synthétiques réalistes
# ────────────────────────────────────────────────────────────────────────────
def _generate_synthetic(n: int = 2000) -> list[StudentSample]:
    """
    Génère n échantillons synthétiques où le score final est corrélé aux features
    via un modèle causal réaliste. Utile quand la base MongoDB n'a pas assez de
    données pour entraîner un vrai modèle.
    """
    samples = []
    for _ in range(n):
        avg_past = np.clip(np.random.normal(60, 18), 0, 100)
        past_qcm = int(np.clip(np.random.poisson(12), 0, 60))
        completion = np.clip(np.random.beta(2.5, 2.0), 0, 1)
        flashcards = int(np.clip(np.random.poisson(15), 0, 80))
        days_inactive = int(np.clip(np.random.exponential(4), 0, 45))
        active_days = int(np.clip(30 - days_inactive + np.random.normal(0, 3), 1, 30))
        courses_done = int(np.clip(np.random.poisson(3), 0, 12))
        filiere = np.random.randint(0, 4)
        difficulty = np.clip(np.random.beta(2.0, 2.5), 0, 1)

        # Modèle causal : le score dépend principalement de l'historique,
        # de la complétion vidéo et de l'inactivité, modulé par la difficulté.
        base = (
            0.55 * avg_past
            + 25 * completion
            + 0.6 * flashcards / 10
            + 0.8 * active_days
            - 1.2 * days_inactive
            + 2.0 * courses_done
            - 30 * difficulty
            + np.random.normal(0, 7)
        )
        final = float(np.clip(base, 0, 100))
        dropout = int(final < DROPOUT_SCORE_THRESHOLD or days_inactive > DROPOUT_INACTIVITY_DAYS)

        samples.append(StudentSample(
            avg_past_score=float(avg_past),
            past_qcm_count=past_qcm,
            video_completion_rate=float(completion),
            flashcards_studied=flashcards,
            days_since_last_activity=days_inactive,
            active_days_last_30=active_days,
            courses_completed=courses_done,
            filiere_idx=int(filiere),
            course_difficulty=float(difficulty),
            final_score=final,
            dropout_risk=dropout,
        ))
    return samples


# ────────────────────────────────────────────────────────────────────────────
# Point d'entrée
# ────────────────────────────────────────────────────────────────────────────
def build_dataset(min_real_samples: int = 50, synthetic_size: int = 2000) -> pd.DataFrame:
    """
    Construit le dataset final et l'écrit en CSV.
    Si Mongo a trop peu d'échantillons, on complète avec du synthétique.
    """
    real: list[StudentSample] = []
    db = _connect()
    if db is not None:
        try:
            real = _extract_from_mongo(db)
            print(f"[extract] {len(real)} échantillons extraits de MongoDB")
        except Exception as exc:
            print(f"[extract] Erreur Mongo ({exc}), fallback synthétique")

    if len(real) < min_real_samples:
        needed = synthetic_size - len(real)
        synthetic = _generate_synthetic(needed)
        print(f"[extract] Ajout de {needed} échantillons synthétiques")
        samples = real + synthetic
    else:
        samples = real

    df = pd.DataFrame([asdict(s) for s in samples])
    df.to_csv(DATASET_PATH, index=False)
    print(f"[extract] Dataset écrit : {DATASET_PATH} ({len(df)} lignes)")
    return df


if __name__ == "__main__":
    build_dataset()
