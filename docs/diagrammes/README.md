# Diagrammes UML — FlipLearn

Diagrammes PlantUML versionnés pour le mémoire académique. Sources `.puml` éditables, rendus PNG/SVG générés à la demande.

## Génération des images

### Option 1 — PlantUML local (recommandé)

```bash
# Installer plantuml (Windows : choco install plantuml ; macOS : brew install plantuml)
plantuml -tpng *.puml      # génère .png à côté de chaque .puml
plantuml -tsvg *.puml      # génère .svg (zoomable)
```

### Option 2 — Serveur PlantUML public

Coller le contenu d'un `.puml` sur https://www.plantuml.com/plantuml/uml puis télécharger l'image.

### Option 3 — Extension VS Code

Installer l'extension `PlantUML` (jebbs.plantuml), preview live avec `Alt+D`.

## Diagrammes disponibles

| # | Fichier | Type | Section mémoire |
|---|---|---|---|
| 1 | `01-cas-utilisation.puml` | Use Case | § 4.4.1 |
| 2 | `02-classes-prosit.puml` | Classes | § 4.4.3 |
| 3 | `03-classes-project-articulation.puml` | Classes (refonte 2026-05) | § 4.4.4 |
| 4 | `04-sequence-autoprep-ia.puml` | Séquence | § 4.4.2 |
| 5 | `05-sequence-import-livrable.puml` | Séquence (refonte 2026-05) | § 4.4.5 |
| 6 | `06-deploiement.puml` | **Déploiement** | § 4.4.6 (NOUVEAU) |

## Convention de style

- **Packages colorés** par couche (front en bleu, back en vert, données en jaune, IA en violet).
- **Couleurs distinctes par participant** dans les séquences (assil en bleu, prof en orange, services en gris).
- Pas de `<<include>>` spaghetti — relations explicites uniquement.
- Toutes les classes/séquences citent les noms de fichiers/services réels du code (`progressService.js`, etc.) pour traçabilité.
