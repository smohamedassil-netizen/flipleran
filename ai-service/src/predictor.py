"""
Inférence : charge les modèles entraînés et calcule les prédictions.

Fournit deux types d'appel :
1. `predict_from_features(features)` — features déjà calculées (JSON du backend Node).
2. `predict_for_student(user_id, course_id)` — calcule les features en direct
   depuis MongoDB, puis prédit. Pratique pour le dashboard prof.
"""
from __future__ import annotations

from datetime import datetime, timezone
from threading import Lock
from typing import Optional

import joblib
import numpy as np
import tensorflow as tf
from bson import ObjectId
from pymongo import MongoClient
from pymongo.errors import PyMongoError

from .config import (
    DB_NAME,
    DROPOUT_META_PATH,
    DROPOUT_MODEL_PATH,
    DROPOUT_SCALER_PATH,
    MONGODB_URI,
    SUCCESS_META_PATH,
    SUCCESS_MODEL_PATH,
    SUCCESS_SCALER_PATH,
)
from .extract_data import FEATURE_COLUMNS

_lock = Lock()
_cache: dict = {"success": None, "dropout": None, "db": None}


# ────────────────────────────────────────────────────────────────────────────
# Chargement paresseux (thread-safe)
# ────────────────────────────────────────────────────────────────────────────
def _load_success():
    if _cache["success"] is None:
        with _lock:
            if _cache["success"] is None:
                _cache["success"] = {
                    "model": tf.keras.models.load_model(SUCCESS_MODEL_PATH, compile=False),
                    "scaler": joblib.load(SUCCESS_SCALER_PATH),
                    "meta": joblib.load(SUCCESS_META_PATH),
                }
    return _cache["success"]


def _load_dropout():
    if _cache["dropout"] is None:
        with _lock:
            if _cache["dropout"] is None:
                _cache["dropout"] = {
                    "model": tf.keras.models.load_model(DROPOUT_MODEL_PATH, compile=False),
                    "scaler": joblib.load(DROPOUT_SCALER_PATH),
                    "meta": joblib.load(DROPOUT_META_PATH),
                }
    return _cache["dropout"]


def _get_db():
    if _cache["db"] is None:
        try:
            client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=3000)
            client.admin.command("ping")
            _cache["db"] = client[DB_NAME]
        except PyMongoError:
            _cache["db"] = None
    return _cache["db"]


def models_status() -> dict:
    return {
        "success_model_ready": SUCCESS_MODEL_PATH.exists(),
        "dropout_model_ready": DROPOUT_MODEL_PATH.exists(),
        "success_metrics": (joblib.load(SUCCESS_META_PATH).get("metrics")
                            if SUCCESS_META_PATH.exists() else None),
        "dropout_metrics": (joblib.load(DROPOUT_META_PATH).get("metrics")
                            if DROPOUT_META_PATH.exists() else None),
    }


# ────────────────────────────────────────────────────────────────────────────
# Utilitaires features
# ────────────────────────────────────────────────────────────────────────────
def _features_to_array(features: dict) -> np.ndarray:
    row = [float(features.get(col, 0)) for col in FEATURE_COLUMNS]
    return np.array(row, dtype=np.float32).reshape(1, -1)


def _risk_level(proba: float) -> str:
    if proba >= 0.75:
        return "critique"
    if proba >= 0.5:
        return "élevé"
    if proba >= 0.25:
        return "modéré"
    return "faible"


def _score_category(score: float) -> str:
    if score >= 75:
        return "excellent"
    if score >= 60:
        return "bon"
    if score >= 45:
        return "moyen"
    return "à risque"


# ────────────────────────────────────────────────────────────────────────────
# API publique
# ────────────────────────────────────────────────────────────────────────────
def predict_from_features(features: dict) -> dict:
    X = _features_to_array(features)

    success = _load_success()
    dropout = _load_dropout()

    X_succ = success["scaler"].transform(X)
    X_drop = dropout["scaler"].transform(X)

    pred_score = float(success["model"].predict(X_succ, verbose=0).flatten()[0])
    pred_proba = float(dropout["model"].predict(X_drop, verbose=0).flatten()[0])

    pred_score = max(0.0, min(100.0, pred_score))

    return {
        "predicted_score": round(pred_score, 1),
        "score_category": _score_category(pred_score),
        "dropout_probability": round(pred_proba, 3),
        "dropout_risk_level": _risk_level(pred_proba),
        "features_used": {col: features.get(col, 0) for col in FEATURE_COLUMNS},
    }


def compute_features(user_id: str, course_id: str) -> Optional[dict]:
    """Lit MongoDB et calcule les features pour (user, cours)."""
    db = _get_db()
    if db is None:
        return None

    try:
        user_oid = ObjectId(user_id)
        course_oid = ObjectId(course_id)
    except Exception:
        return None

    user = db.users.find_one({"_id": user_oid})
    if not user:
        return None

    prog = db.progresses.find_one({"userId": user_oid, "courseId": course_oid}) or {}

    # Historique : autres cours de cet étudiant
    other_scores = []
    other_courses_completed = 0
    for other in db.progresses.find({"userId": user_oid, "courseId": {"$ne": course_oid}}):
        s = [float(x.get("score", 0)) for x in other.get("qcmScores", [])]
        if s:
            other_scores.extend(s)
            if len(s) >= 2 and np.mean(s) >= 50:
                other_courses_completed += 1

    avg_past = float(np.mean(other_scores)) if other_scores else 50.0

    last = prog.get("lastActivity")
    days_since = 0
    if isinstance(last, datetime):
        now = datetime.now(timezone.utc)
        last_aware = last if last.tzinfo else last.replace(tzinfo=timezone.utc)
        days_since = max(0, (now - last_aware).days)

    videos_completed = len(prog.get("videosCompleted", []))
    total_videos = db.videos.count_documents({"courseId": course_oid}) or 1
    completion = min(1.0, videos_completed / total_videos)

    # Difficulté cours : moyenne des scores de tous les étudiants sur ce cours
    course_videos_ids = [v["_id"] for v in db.videos.find({"courseId": course_oid}, {"_id": 1})]
    all_scores = []
    for qcm in db.qcms.find({"videoId": {"$in": course_videos_ids}}, {"resultats": 1}):
        for res in qcm.get("resultats", []):
            all_scores.append(float(res.get("score", 0)))
    course_avg = float(np.mean(all_scores)) if all_scores else 50.0
    difficulty = max(0.0, min(1.0, 1.0 - course_avg / 100.0))

    flashcards = db.decks.count_documents({"createdBy": user_oid})

    active_days_30 = min(30, max(1, 30 - days_since))

    filiere_raw = (user.get("filiere") or "unknown").lower()
    filiere_idx = abs(hash(filiere_raw)) % 10  # bucket hash stable

    return {
        "avg_past_score": avg_past,
        "past_qcm_count": len(other_scores),
        "video_completion_rate": completion,
        "flashcards_studied": flashcards,
        "days_since_last_activity": days_since,
        "active_days_last_30": active_days_30,
        "courses_completed": other_courses_completed,
        "filiere_idx": filiere_idx,
        "course_difficulty": difficulty,
    }


def predict_for_student(user_id: str, course_id: str) -> Optional[dict]:
    features = compute_features(user_id, course_id)
    if features is None:
        return None
    result = predict_from_features(features)
    result["user_id"] = user_id
    result["course_id"] = course_id
    return result


def list_at_risk_students(course_id: Optional[str] = None, limit: int = 50) -> list[dict]:
    """Retourne tous les étudiants dont la proba de décrochage >= 0.5."""
    db = _get_db()
    if db is None:
        return []

    query = {"role": "etudiant"}
    students = list(db.users.find(query, {"nom": 1, "prenom": 1, "email": 1, "filiere": 1}))

    at_risk: list[dict] = []
    for student in students:
        sid = str(student["_id"])
        if course_id:
            res = predict_for_student(sid, course_id)
            if res and res["dropout_probability"] >= 0.5:
                at_risk.append({
                    **res,
                    "nom": student.get("nom", ""),
                    "prenom": student.get("prenom", ""),
                    "email": student.get("email", ""),
                    "filiere": student.get("filiere", ""),
                })
        else:
            # Sans cours ciblé : on agrège sur tous les cours de l'étudiant
            progresses = list(db.progresses.find({"userId": student["_id"]}))
            probas = []
            for p in progresses:
                res = predict_for_student(sid, str(p["courseId"]))
                if res:
                    probas.append(res["dropout_probability"])
            if probas and max(probas) >= 0.5:
                at_risk.append({
                    "user_id": sid,
                    "nom": student.get("nom", ""),
                    "prenom": student.get("prenom", ""),
                    "email": student.get("email", ""),
                    "filiere": student.get("filiere", ""),
                    "dropout_probability": round(float(max(probas)), 3),
                    "dropout_risk_level": _risk_level(max(probas)),
                })

    at_risk.sort(key=lambda r: r["dropout_probability"], reverse=True)
    return at_risk[:limit]
