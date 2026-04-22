"""
Script pratique : entraîne les deux modèles en séquence.
Usage :
    python train_all.py
"""
from src.extract_data import build_dataset
from src.train_dropout import train as train_dropout
from src.train_success import train as train_success


def main():
    print("=" * 60)
    print("FlipLearn AI — Entraînement complet des modèles")
    print("=" * 60)

    print("\n[1/3] Construction du dataset...")
    df = build_dataset()
    print(f"Dataset : {len(df)} lignes, {df.shape[1]} colonnes")

    print("\n[2/3] Entraînement du prédicteur de réussite...")
    success_metrics = train_success()

    print("\n[3/3] Entraînement du détecteur de décrochage...")
    dropout_metrics = train_dropout()

    print("\n" + "=" * 60)
    print("Résumé final")
    print("=" * 60)
    print(f"  Réussite  : MAE={success_metrics['mae']}  RMSE={success_metrics['rmse']}  R²={success_metrics['r2']}")
    print(f"  Décrochage: Acc={dropout_metrics['accuracy']}  AUC={dropout_metrics['roc_auc']}  F1={dropout_metrics['f1']}")
    print("=" * 60)


if __name__ == "__main__":
    main()
