"""
Entraînement du modèle de PRÉDICTION DE RÉUSSITE.

Tâche : régression. On prédit le score final (0-100) qu'un étudiant obtiendra
sur un cours, à partir de son historique et du profil du cours.

Architecture : MLP (Multi-Layer Perceptron) 3 couches denses avec dropout pour
limiter le sur-apprentissage. L'output est une sigmoïde × 100 pour garantir
une sortie dans [0, 100].

Métriques reportées :
- MAE (Mean Absolute Error) : erreur moyenne en points
- RMSE (Root Mean Squared Error) : pénalise plus fortement les grosses erreurs
- R² : qualité d'ajustement (1.0 = parfait, 0 = baseline moyenne)
"""
from __future__ import annotations

import joblib
import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from tensorflow.keras import Input, Model, callbacks, layers

from .config import (
    BATCH_SIZE,
    DATASET_PATH,
    EPOCHS,
    RANDOM_SEED,
    SUCCESS_META_PATH,
    SUCCESS_MODEL_PATH,
    SUCCESS_SCALER_PATH,
    TRAIN_TEST_SPLIT,
)
from .extract_data import FEATURE_COLUMNS, TARGET_SUCCESS, build_dataset

tf.random.set_seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)


def _build_model(input_dim: int) -> Model:
    inp = Input(shape=(input_dim,), name="features")
    x = layers.Dense(64, activation="relu")(inp)
    x = layers.Dropout(0.25)(x)
    x = layers.Dense(32, activation="relu")(x)
    x = layers.Dropout(0.15)(x)
    x = layers.Dense(16, activation="relu")(x)
    # Sortie dans [0, 1] puis rescale ×100 pour représenter un score sur 100.
    raw = layers.Dense(1, activation="sigmoid")(x)
    out = layers.Lambda(lambda t: t * 100.0, name="score_0_100")(raw)

    model = Model(inp, out, name="success_predictor")
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="mean_squared_error",
        metrics=["mae"],
    )
    return model


def train() -> dict:
    df = pd.read_csv(DATASET_PATH) if DATASET_PATH.exists() else build_dataset()

    X = df[FEATURE_COLUMNS].values.astype(np.float32)
    y = df[TARGET_SUCCESS].values.astype(np.float32)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TRAIN_TEST_SPLIT, random_state=RANDOM_SEED
    )

    scaler = StandardScaler().fit(X_train)
    X_train_s = scaler.transform(X_train)
    X_test_s = scaler.transform(X_test)

    model = _build_model(input_dim=X_train_s.shape[1])

    cb = [
        callbacks.EarlyStopping(patience=12, restore_best_weights=True, monitor="val_loss"),
        callbacks.ReduceLROnPlateau(patience=5, factor=0.5, min_lr=1e-5, monitor="val_loss"),
    ]

    history = model.fit(
        X_train_s, y_train,
        validation_split=0.15,
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        callbacks=cb,
        verbose=2,
    )

    # Évaluation
    y_pred = model.predict(X_test_s, verbose=0).flatten()
    mae = float(mean_absolute_error(y_test, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    r2 = float(r2_score(y_test, y_pred))

    metrics = {
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "r2": round(r2, 3),
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "epochs_ran": len(history.history["loss"]),
    }

    # Persistance
    model.save(SUCCESS_MODEL_PATH)
    joblib.dump(scaler, SUCCESS_SCALER_PATH)
    joblib.dump({"features": FEATURE_COLUMNS, "metrics": metrics}, SUCCESS_META_PATH)

    print("\n[train_success] Métriques sur test set :")
    for k, v in metrics.items():
        print(f"  {k:>10} : {v}")
    print(f"[train_success] Modèle sauvegardé → {SUCCESS_MODEL_PATH}")

    return metrics


if __name__ == "__main__":
    train()
