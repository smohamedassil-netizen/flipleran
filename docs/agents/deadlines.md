# Deadlines & calendrier — PFE FlipLearn

**Auteur** : Mohamed Assil SERAY
**Établissement** : EM Alger Business School
**Filière** : Licence 3 ISIL (Informatique et Systèmes d'Information)
**Année universitaire** : 2025-2026

---

## Dates clés

| Événement | Date | Statut |
|---|---|---|
| **Rendu mémoire écrit** | **20 mai 2026** | en cours |
| **Soutenance orale** | **15 juin 2026** | à venir |

## Encadrement

- **Encadrante actuelle** : Mme Sana KOUCHI (changement intervenu en avril 2026)
- **Ancienne encadrante** : Mme Amira RAHAL (mentionnée en page de garde + remerciements du mémoire — à mettre à jour avant rendu)

## Phases de travail

### Avant le 20 mai 2026 — Finalisation mémoire
- Mémoire déjà bien avancé (chapitres 1 à 7 dans `docs/memoire/`)
- Reste à compléter : screenshots du chap 5 (résultats), relecture, mise à jour des remerciements (changement encadrante), bibliographie.
- L'auteur priorise la doc et la cohérence du code sur les nouvelles features.

### Entre 20 mai et 15 juin 2026 — Apprentissage code + simulation soutenance
L'auteur n'a pas codé manuellement la majorité du projet (piloté par Claude Code). Cette phase sert à :
- **Comprendre son propre code** fonctionnalité par fonctionnalité
- **Pouvoir l'expliquer** techniquement à l'encadrante et au jury
- **Simuler des questions de jury** et préparer les réponses

Méthode validée :
- Lire le code RÉEL ensemble (pas une explication abstraite)
- Modifier de petites choses (renommer une variable, changer une couleur) pour engager le cerveau actif
- Simuler des questions/réponses à voix haute

**Fonctionnalités prioritaires à maîtriser** (pour le jury) :
1. Auth JWT (refresh token httpOnly cookie)
2. Génération QCM IA (Groq → Llama 3.3)
3. Quiz Battle (Socket.io rooms, scoring serveur, BattleResult)
4. Chatbot Module Assistant (Groq + persona + RAG)
5. Auto-prep complet (Whisper → GPT-4o → Groq, parallèle × 5)
6. SM-2 flashcards (Wozniak 1990, calcul intervalle/easeFactor)

### Après le 15 juin — post-soutenance
Hors scope de ce repo.

---

## Pour un agent IA

Si tu travailles sur ce projet **avant le 20 mai 2026** :
- **Priorité** : ce qui sert le mémoire écrit (cohérence, screenshots, doc, relecture).
- **Pas de nouvelle feature majeure** sauf demande explicite.
- **Polish > nouveauté** : un détail UX raffiné > 3 features brouillonnes.

Si tu travailles **entre le 20 mai et le 15 juin 2026** :
- **Priorité** : ce qui aide l'auteur à comprendre son propre code.
- Bienvenu : commentaires explicatifs, refactor lisible, simplifications.
- Bienvenu : exemples de code accompagnés d'explications pédagogiques.
- À éviter : nouvelles dépendances, refactors massifs qui rendent le code méconnaissable.
