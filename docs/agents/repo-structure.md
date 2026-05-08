# Structure du dépôt GitHub — FlipLearn

> **Une seule branche active : `main`.** L'historique complet est conservé via des tags d'archive.

## Branches

| Branche | Rôle |
|---|---|
| **`main`** | La seule branche active. Tout le travail courant se fait ici. Push direct autorisé. |

C'est tout. Pas de branches `feature/...`, `sprint-...`, `backup-...` qui pourrissent le repo. Si un agent IA externe (Claude Code dispatch, Cloud Code) crée une branche `claude/...` pour expérimenter, on l'absorbe (merge sélectif sur main + tag d'archive + suppression de la branche) à la prochaine session.

## Tags d'archive

Chaque tag `archive/...` est un **snapshot historique récupérable**. Un tag = un commit pointé en lecture seule. Pour récupérer le code d'un snapshot :

```bash
git checkout archive/sprint-final-completed   # se positionne en lecture sur le snapshot
git checkout main                              # revenir à la branche active
```

| Tag | Date | Contenu |
|---|---|---|
| `archive/snapshot-pre-refonte` | avant le 28/04/2026 | État avant la grosse refonte UX du 28/04 |
| `archive/snapshot-2026-04-30` | 30/04/2026 | Backup complet fin de session 30/04 |
| `archive/sprint-0-security-completed` | mergé fin avril 2026 | Sprint pédagogie P2-P7 (mergé sur main) |
| `archive/sprint-final-completed` | mergé fin avril 2026 | Sprint final F1-F5 (mergé sur main) |
| `archive/mvp-soutenance-simplifie` | début mai 2026 | Version MVP avec F2-F7 désactivés. **5 commits uniques** non sur main : audit étudiant 16 bugs + tuto complet. À récupérer si on veut une version épurée pour la soutenance. |
| `archive/agent-chapter-conception` | 08/05/2026 | Branche d'un agent IA externe qui a généré le `.docx` du chapitre conception. Le `.docx` a été extrait sur main, le reste est archivé. |
| `archive/agent-rebuild-experiment` | 08/05/2026 | Branche d'un agent IA externe qui a tenté un rebuild complet de l'app (-59 167 lignes, supprime des pages + utils critiques). **NE JAMAIS MERGER** — gardée pour référence uniquement. |

## Pourquoi cette structure

**Avant** (compliqué) : 8 branches actives sur le repo (main + sprint-final + sprint-0-security + mvp-soutenance + 2 backups + 2 claude/...). Difficile de savoir laquelle est la version courante, risque de merger par erreur du code expérimental, complexité visuelle dans GitHub.

**Après** (pro) : 1 branche active + 7 tags. La version courante est immédiatement identifiable (c'est `main`), l'historique est préservé via des tags étiquetés clairement, on retrouve un snapshot historique en une commande. C'est la convention d'un repo de production.

## Convention pour les agents IA

Si un agent IA externe (Claude Code dispatch, Cloud Code, autre) crée une branche `claude/...` pour expérimenter :

1. **Évaluer le contenu** : faire `git diff main origin/claude/<branch>` pour voir ce qui change.
2. **Décider** :
   - Si utile (ex : nouveau fichier, fix correct) → merge sélectif sur main avec un commit propre (`git checkout origin/claude/<branch> -- <fichier>` puis commit).
   - Si destructif ou expérimental (ex : suppression massive de code, rebuild) → **ne pas merger**.
3. **Archiver** : `git tag -a archive/agent-<description> origin/claude/<branch> -m "..."` puis `git push origin archive/agent-<description>`.
4. **Supprimer la branche** : `git push origin --delete claude/<branch>`.

Cette convention évite que le repo se transforme en cimetière de branches expérimentales.

## Fichiers livrables (Word)

Les `.docx` du mémoire vivent dans `docs/memoire/` du repo (en plus des `.md` qui sont la source de vérité). Cela permet de les télécharger directement depuis GitHub sans avoir besoin d'un PC où le `.docx` est stocké en local.

| Fichier | Format |
|---|---|
| `docs/memoire/04-chapitre-conception.md` | Source markdown (modifiable) |
| `docs/memoire/04-chapitre-conception.docx` | Version Word imprimable |
| `docs/memoire/01-chapitre-introduction.md` | (à compléter — voir `docs/memoire/`) |
| ... | Idem pour les autres chapitres |

Les `.docx` peuvent être regénérés à partir des `.md` via `scripts/doc_updater.py` (hors repo, sur le PC de l'auteur).

## Commit de cette restructuration

Voir le commit `9d4f99c` (08/05/2026) qui a ajouté `04-chapitre-conception.docx` sur main, et les 7 tags `archive/*` créés simultanément. Les 7 branches obsolètes (sprint-final, sprint-0-security, backup-30-avril-complete, backup-avant-refonte, mvp-soutenance, claude/...×2) ont été supprimées du remote après archivage.
