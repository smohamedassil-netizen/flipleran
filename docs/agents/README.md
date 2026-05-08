# `docs/agents/` — Point d'entrée pour les agents IA

> Tu es un agent IA (Claude Code, Claude Code dispatch, Claude.ai mobile/web, autre) qui vient bosser sur FlipLearn ? **Commence ici.**

## C'est quoi ce dossier ?

`docs/agents/` est un **point d'entrée stable** pour les agents IA distants. Il rassemble tout ce qu'un agent doit savoir avant de toucher au projet, sans dépendre de la mémoire locale du PC de l'auteur.

Le reste de `docs/` (architecture, modèle de données, ADRs, mémoire, diagrammes) est destiné au **jury de soutenance**. Tu peux y aller pour les détails techniques, mais pour comprendre *comment travailler ici*, lis d'abord ce dossier.

## Carte des fichiers

```
docs/agents/
├── README.md              ← tu es ici
├── conventions.md         ← règles à respecter (commits, code, doc, pédagogie)
├── pedagogie.md           ← vision IA + règle "pas de vs IA dans peer features"
├── deadlines.md           ← rendu mémoire 20/05/2026, soutenance 15/06/2026
├── status.md              ← état actuel : déployé, features livrées, ce qui reste
├── repo-structure.md      ← une seule branche main + tags d'archive
└── sessions/              ← recaps datés des sessions Claude Code passées
    ├── 2026-04-28.md
    ├── 2026-04-30.md
    └── 2026-05-08.md
```

## Si on te demande d'ajouter / corriger une feature

1. Lis [`conventions.md`](conventions.md) — résumé en 5 sections : commits, code style, doc auto, pédagogie, no AI peer.
2. Lis [`pedagogie.md`](pedagogie.md) — la vision éditoriale du PFE. Indispensable avant toute nouvelle feature ou refonte UX.
3. Lis [`status.md`](status.md) — pour savoir ce qui est déjà livré (ne pas réimplémenter).
4. Lis le dernier fichier de [`sessions/`](sessions/) — pour reprendre dans la continuité.
5. Lis [`../../CLAUDE.md`](../../CLAUDE.md) — commandes (`npm run dev`, comptes test, env vars).

## Si on te parle de branches / structure du repo

Lis [`repo-structure.md`](repo-structure.md). Une seule branche active (`main`), 7 tags d'archive pour les snapshots historiques. Convention pour gérer les branches `claude/...` créées par d'autres agents externes.

## Si on te demande "explique-moi l'app"

Tutoriels existants (longs, détaillés, par rôle) :
- [`../TUTO-COMPLET-DEMAIN-L3ISIL.md`](../TUTO-COMPLET-DEMAIN-L3ISIL.md) — parcours complet étudiant L3 ISIL
- [`../TUTO-COMPLET-PROF.md`](../TUTO-COMPLET-PROF.md) — parcours professeur
- [`../tutoriel-tests-complet.md`](../tutoriel-tests-complet.md) — protocole de tests
- [`../guide-defense-pfe.md`](../guide-defense-pfe.md) — guide soutenance

Vue d'ensemble (court) :
- [`../README.md`](../README.md) — index académique du dossier `docs/`
- [`status.md`](status.md) — résumé fonctionnel à jour

## Si on te demande de faire la démo de soutenance

Tout est dans [`../script-soutenance.md`](../script-soutenance.md) : scénario minute par minute, comptes de démo, ordre de passage. Aussi [`deadlines.md`](deadlines.md) pour le contexte calendaire.

## Règles de travail clés

- **Tu peux committer et pusher directement** sur `main`. L'auteur a explicitement autorisé les commits autonomes (voir `conventions.md`).
- **Pas de fichiers `_v2`, `_v3`, `_FINAL`** — écraser les livrables existants.
- **Pas de mode "vs IA"** dans les features pair-à-pair (Quiz Battle, Prosits, projets PBL, peer-assessment) — voir `pedagogie.md`.
- **Doc auto** : après une modification utilisateur-visible, idéalement appeler `scripts/doc_updater.py` (mais ce script vit hors du repo, donc si tu es un agent distant sans accès local, mentionne-le et l'auteur le fera).

## Auteur & contexte

- **Mohamed Assil SERAY** — L3 ISIL, EM Alger Business School, 2025-2026.
- **Repo** : <https://github.com/smohamedassil-netizen/flipleran> (public).
- **Prod** : <https://fliplearn-5lsz.onrender.com>.
- **Calendrier** : voir [`deadlines.md`](deadlines.md).
