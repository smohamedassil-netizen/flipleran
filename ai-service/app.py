"""
Microservice Flask IA FlipLearn — point d'entrée HTTP.

Expose les endpoints :
  GET  /health                       — ping + statut des modèles
  POST /train                        — re-lance l'entraînement des 2 modèles
  POST /predict/features             — prédit à partir de features brutes (JSON)
  GET  /predict/student/<uid>/<cid>  — prédit pour un (étudiant, cours)
  GET  /students/at-risk             — liste des étudiants à risque

Sécurité : chaque requête (hors /health) doit contenir un header
  X-AI-Service-Token: <AI_SERVICE_TOKEN>
Le backend Node.js joint ce header à ses appels internes.
"""
from __future__ import annotations

from functools import wraps

from flask import Flask, jsonify, request
from flask_cors import CORS

from src.config import AI_SERVICE_PORT, AI_SERVICE_TOKEN
from src.extract_data import build_dataset
from src.predictor import (
    list_at_risk_students,
    models_status,
    predict_for_student,
    predict_from_features,
)
from src.train_dropout import train as train_dropout
from src.train_success import train as train_success

app = Flask(__name__)
CORS(app)


def require_token(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = request.headers.get("X-AI-Service-Token", "")
        if not AI_SERVICE_TOKEN or token != AI_SERVICE_TOKEN:
            return jsonify({"error": "unauthorized"}), 401
        return fn(*args, **kwargs)
    return wrapper


@app.get("/health")
def health():
    return jsonify({"status": "ok", **models_status()})


@app.post("/train")
@require_token
def train_endpoint():
    payload = request.get_json(silent=True) or {}
    rebuild = bool(payload.get("rebuild_dataset", True))

    dataset_info = {}
    if rebuild:
        df = build_dataset()
        dataset_info = {"rows": int(len(df))}

    success_metrics = train_success()
    dropout_metrics = train_dropout()

    return jsonify({
        "dataset": dataset_info,
        "success_model": success_metrics,
        "dropout_model": dropout_metrics,
    })


@app.post("/predict/features")
@require_token
def predict_features_endpoint():
    features = request.get_json(silent=True)
    if not isinstance(features, dict):
        return jsonify({"error": "body must be a JSON object of features"}), 400
    try:
        return jsonify(predict_from_features(features))
    except FileNotFoundError:
        return jsonify({"error": "models not trained yet — call POST /train first"}), 503
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.get("/predict/student/<user_id>/<course_id>")
@require_token
def predict_student_endpoint(user_id: str, course_id: str):
    try:
        result = predict_for_student(user_id, course_id)
    except FileNotFoundError:
        return jsonify({"error": "models not trained yet — call POST /train first"}), 503

    if result is None:
        return jsonify({"error": "user/course introuvable ou Mongo indisponible"}), 404
    return jsonify(result)


@app.get("/students/at-risk")
@require_token
def at_risk_endpoint():
    course_id = request.args.get("courseId")
    limit = int(request.args.get("limit", "50"))
    try:
        return jsonify({"students": list_at_risk_students(course_id, limit)})
    except FileNotFoundError:
        return jsonify({"error": "models not trained yet — call POST /train first"}), 503


@app.errorhandler(404)
def not_found(_):
    return jsonify({"error": "not found"}), 404


if __name__ == "__main__":
    print(f"[ai-service] Démarrage sur le port {AI_SERVICE_PORT}")
    app.run(host="0.0.0.0", port=AI_SERVICE_PORT, debug=False)
