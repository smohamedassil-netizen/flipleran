"""
Configuration centrale du microservice IA FlipLearn.
Charge les variables d'environnement et définit les chemins des modèles/datasets.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Racine du projet ai-service (le parent de src/)
ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

# --- Connexion base de données ---
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/fliplearn")
DB_NAME = MONGODB_URI.rstrip("/").split("/")[-1].split("?")[0] or "fliplearn"

# --- Serveur Flask ---
AI_SERVICE_PORT = int(os.getenv("AI_SERVICE_PORT", "5001"))
AI_SERVICE_TOKEN = os.getenv("AI_SERVICE_TOKEN", "change-me")

# --- Chemins fichiers ---
DATA_DIR = ROOT_DIR / "data"
MODELS_DIR = ROOT_DIR / "models"
DATA_DIR.mkdir(exist_ok=True)
MODELS_DIR.mkdir(exist_ok=True)

DATASET_PATH = DATA_DIR / "dataset.csv"

SUCCESS_MODEL_PATH = MODELS_DIR / "success_predictor.keras"
SUCCESS_SCALER_PATH = MODELS_DIR / "success_scaler.pkl"
SUCCESS_META_PATH = MODELS_DIR / "success_meta.pkl"

DROPOUT_MODEL_PATH = MODELS_DIR / "dropout_detector.keras"
DROPOUT_SCALER_PATH = MODELS_DIR / "dropout_scaler.pkl"
DROPOUT_META_PATH = MODELS_DIR / "dropout_meta.pkl"

# --- Hyperparamètres par défaut ---
RANDOM_SEED = 42
TRAIN_TEST_SPLIT = 0.2
BATCH_SIZE = 32
EPOCHS = 80

# Seuil de décrochage : un étudiant est considéré "à risque" si son score moyen
# est sous ce seuil OU s'il est inactif depuis DROPOUT_INACTIVITY_DAYS jours.
DROPOUT_SCORE_THRESHOLD = 40.0
DROPOUT_INACTIVITY_DAYS = 14
