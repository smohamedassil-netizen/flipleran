# Diagrammes Mermaid — Mémoire PFE FlipLearn

Ce dossier rassemble les diagrammes structuraux et comportementaux de la
plateforme **FlipLearn**, prêts à être copiés-collés dans le mémoire PFE
(Licence ISIL Informatique, EM Alger Business School).

## Sommaire

| # | Fichier | Type Mermaid | Sujet |
|---|---------|-------------|-------|
| 1 | [01-architecture-globale.md](./01-architecture-globale.md) | `graph LR` | Architecture trois-tiers + services externes |
| 2 | [02-cas-utilisation.md](./02-cas-utilisation.md) | `flowchart TD` | Cas d'utilisation (Étudiant / Prof / Admin) |
| 3 | [03-modele-classes.md](./03-modele-classes.md) | `classDiagram` | Modèle de classes UML (8 entités principales) |
| 4 | [04-sequence-prosit.md](./04-sequence-prosit.md) | `sequenceDiagram` | Cycle complet d'un Prosit (création → finalisation) |
| 5 | [05-flux-classe-inversee.md](./05-flux-classe-inversee.md) | `graph LR` | Flux pédagogique avant / pendant / après |

Chaque fichier `.md` est auto-suffisant : un titre, une description (2-3
phrases prêtes à coller dans le mémoire), le code Mermaid dans un bloc
```` ```mermaid ... ``` ````, une légende et une note explicative finale.

## Comment ouvrir les diagrammes

### Option 1 — VS Code (recommandée pour éditer)

1. Installer l'extension **Markdown Preview Mermaid Support** (auteur : Matt Bierner).
2. Ouvrir un fichier `.md` du dossier.
3. Lancer la preview : `Ctrl + Shift + V` (Windows / Linux) ou `Cmd + Shift + V` (macOS).
4. Le diagramme s'affiche directement dans la prévisualisation.

Alternative : extension **Mermaid Preview** (auteur : Vstirbu) si vous préférez
un panneau dédié rafraîchi à la frappe.

### Option 2 — Mermaid Live Editor (en ligne, sans installation)

1. Ouvrir <https://mermaid.live/>.
2. Coller uniquement le contenu **entre** les balises ```` ```mermaid ```` et ```` ``` ````
   (sans les balises elles-mêmes).
3. Le rendu apparaît à droite. L'éditeur permet d'ajuster le thème, la taille,
   et d'exporter directement.

### Option 3 — GitHub

GitHub rend nativement les blocs Mermaid dans les fichiers `.md` depuis 2022.
Ouvrir simplement le fichier dans l'interface web du dépôt et le diagramme
s'affiche.

## Comment exporter en PNG / SVG (pour le .docx)

### Depuis Mermaid Live Editor

1. Charger le diagramme sur <https://mermaid.live/>.
2. Cliquer sur le bouton **« Actions »** en haut à droite.
3. Choisir **PNG (image)** ou **SVG (image)** selon le besoin :
   - **SVG** : qualité vectorielle, redimensionnable sans perte → préféré pour le mémoire imprimé.
   - **PNG** : trame fixe, plus simple si l'éditeur Word ne gère pas bien le SVG.
4. Importer le fichier dans le `.docx` via *Insertion → Image*.

### Depuis VS Code

L'extension **Mermaid Preview** propose une option d'export. Avec
*Markdown Preview Mermaid Support*, il faut d'abord ouvrir le diagramme dans
la preview puis faire un clic droit → *Save image as…* sur le rendu.

### Depuis la CLI (pour automatiser la production de figures)

```bash
npm install -g @mermaid-js/mermaid-cli

# Générer un PNG depuis un fichier source isolé (sans frontmatter md)
mmdc -i diagramme.mmd -o diagramme.png -w 1600

# SVG vectoriel
mmdc -i diagramme.mmd -o diagramme.svg
```

> Si vous extrayez le bloc `mermaid` d'un `.md` vers un `.mmd`, n'incluez
> que le code (entre les balises ` ``` `, sans le markdown environnant).

## Conventions de style

- Couleurs sobres et cohérentes entre diagrammes :
  - **Bleu** (`#1B4F72`, fond `#EBF3FA`) → couche cliente / acteurs.
  - **Vert** (`#15803D`, fond `#DCFCE7`) → données / phase « avant ».
  - **Jaune** (`#D97706`, fond `#FEF3C7`) → backend / phase « pendant » / prof.
  - **Violet** (`#9333EA`, fond `#F3E8FF`) → IA / phase « après » / admin.
  - **Rouge** (`#DC2626`, fond `#FEE2E2`) → emails / alertes.
- Texte en français, références bibliographiques au format APA simplifié.
- Cardinalités UML standard (`1`, `0..1`, `*`, `1..*`).

## Ressources

- **Documentation officielle Mermaid** : <https://mermaid.js.org/>
- **Référence des syntaxes** : <https://mermaid.js.org/syntax/flowchart.html>
- **Live editor** : <https://mermaid.live/>
- **Extension VS Code** : <https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid>

## Maintenance

Si la modélisation évolue (nouveau champ Mongoose, nouveau rôle, nouveau cas
d'utilisation), mettre à jour le `.md` correspondant et regénérer les exports
PNG/SVG à coller dans le `.docx`. Le commit qui modifie un diagramme doit
suivre la convention `docs(memoire): <description>`.
