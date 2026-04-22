"""
Entraînement du modèle de DÉTECTION DE DÉCROCHAGE.

Tâche : classification binaire (0 = engagé, 1 = à risque).
On utilise les mêmes features que le modèle de réussite — la cible est
dropout_risk calculée dans extract_data.py (score moyen faible OU inactivité
prolongée).

Architecture : MLP compact avec sortie sigmoïde. La loss est la binary
cross-entropy pondérée pour compenser le déséquilibre de classes s'il existe.

Métriques reportées :
- Accuracy, Precision, Recall, F1
- ROC-AUC (qualité globale du classifieur)
"""
from __future__ import annotations

import joblib
import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.utils.class_weight import compute_class_weight
from tensorflow.keras import Input, Model, callbacks, layers

from .config import (
    BATCH_SIZE,
    DATASET_PATH,
    DROPOUT_META_PATH,
    DROPOUT_MODEL_PATH,
    DROPOUT_SCALER_PATH,
    EPOCHS,
    RANDOM_SEED,
    TRAIN_TEST_SPLIT,
)
from .extract_data import FEATURE_COLUMNS, TARGET_DROPOUT, build_dataset

tf.random.set_seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)


def _build_model(input_dim: int) -> Model:
    inp = Input(shape=(input_dim,), name="features")
    x = layers.Dense(48, activation="relu")(inp)
    x = layers.Dropout(0.3)(x)
    x = layers.Dense(24, activation="relu")(x)
    x = layers.Dropout(0.2)(x)
    out = layers.Dense(1, activation="sigmoid", name="dropout_proba")(x)

    model = Model(inp, out, name="dropout_detector")
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="binary_crossentropy",
        metrics=["accuracy", tf.keras.metrics.AUC(name="auc")],
    )
    return model


def train() -> dict:
    df = pd.read_csv(DATASET_PATH) if DATASET_PATH.exists() else build_dataset()

    X = df[FEATURE_COLUMNS].values.astype(np.float32)
    y = df[TARGET_DROPOUT].values.astype(np.float32)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TRAIN_TEST_SPLIT, random_state=RANDOM_SEED, stratify=y
    )

    scaler = StandardScaler().fit(X_train)
    X_train_s = scaler.transform(X_train)
    X_test_s = scaler.transform(X_test)

    # Pondération pour classes déséquilibrées
    classes = np.unique(y_train.astype(int))
    weights = compute_class_weight("balanced", classes=classes, y=y_train.astype(int))
    class_weight = {int(c): float(w) for c, w in zip(classes, weights)}

    model = _build_model(input_dim=X_train_s.shape[1])

    cb = [
        callbacks.EarlyStopping(patience=12, restore_best_weights=True, monitor="val_auc", mode="max"),
        callbacks.ReduceLROnPlateau(patience=5, factor=0.5, min_lr=1e-5, monitor="val_loss"),
    ]

    history = model.fit(
        X_train_s, y_train,
        validation_split=0.15,
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        class_weight=class_weight,
        callbacks=cb,
        verbose=2,
    )

    # Évaluation
    y_proba = model.predict(X_test_s, verbose=0).flatten()
    y_pred = (y_proba >= 0.5).astype(int)

    metrics = {
        "accuracy": round(float(accuracy_score(y_test, y_pred)), 3),
        "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 3),
        "recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 3),
        "f1": round(float(f1_score(y_test, y_pred, zero_division=0)), 3),
        "roc_auc": round(float(roc_auc_score(y_test, y_proba)), 3),
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "positive_rate_test": round(float(np.mean(y_test)), 3),
        "epochs_ran": len(history.history["loss"]),
    }

    model.save(DROPOUT_MODEL_PATH)
    joblib.dump(scaler, DROPOUT_SCALER_PATH)
    joblib.dump({"features": FEATURE_COLUMNS, "metrics": metrics}, DROPOUT_META_PATH)

    print("\n[train_dropout] Métriques sur test set :")
    for k, v in metrics.items():
        print(f"  {k:>20} : {v}")
    print(f"[train_dropout] Modèle sauvegardé → {DROPOUT_MODEL_PATH}")

    return metrics


if __name__ == "__main__":
    train()
