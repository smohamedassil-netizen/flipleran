# Scan Translator FR

Extension de navigateur qui traduit automatiquement en français les bulles de texte
des scans (manga, comics, webtoons...) affichées dans une page web, en superposant
le texte traduit par-dessus l'image d'origine.

Projet indépendant de FlipLearn — deux dossiers :

- `server/` — petit serveur Node local qui garde les clés API et fait le travail
  OCR (Google Cloud Vision) + traduction (DeepL)
- `extension/` — extension Chrome/Firefox (Manifest V3) qui détecte les images
  de la page, les envoie au serveur et affiche la traduction par-dessus

## Comment ça marche

1. Tu cliques sur l'icône de l'extension sur une page de lecture → elle scanne
   les images de la page (et celles qui apparaissent ensuite, scroll infini compris)
2. Chaque image assez grande (> 250×250px, pour ignorer icônes/pubs) est envoyée
   au serveur local
3. Le serveur détecte le texte avec Google Vision, le traduit avec DeepL, et
   renvoie la position + le texte traduit de chaque bloc
4. L'extension pose des petits encadrés blancs avec le texte français par-dessus
   les bulles d'origine

**Limite connue** : l'overlay est un simple rectangle blanc, pas un vrai
"inpainting" — ça marche bien sur les bulles blanches classiques, moins bien
sur des bulles colorées/texturées ou du texte incrusté directement dans le
dessin (onomatopées, etc.).

## Mise en place

### 1. Clés API

- **Google Cloud Vision** : créer un projet GCP, activer "Cloud Vision API",
  générer une clé API (idéalement restreinte à cette seule API)
- **DeepL** : créer un compte sur deepl.com/pro-api (le plan Free suffit pour
  un usage perso), récupérer la clé (se termine par `:fx`)

### 2. Serveur

```bash
cd scan-translator/server
npm install
cp .env.example .env
# remplir GOOGLE_VISION_API_KEY et DEEPL_API_KEY dans .env
npm start
```

Le serveur tourne sur `http://localhost:5055`. Il doit rester lancé pendant que
tu utilises l'extension.

### 3. Extension

1. Ouvrir `chrome://extensions` (ou `about:debugging#/runtime/this-firefox` sur Firefox)
2. Activer le "Mode développeur"
3. "Charger l'extension non empaquetée" → sélectionner le dossier `scan-translator/extension`
4. Sur un site de scan, cliquer sur l'icône de l'extension puis "Activer / désactiver
   sur cette page"

## Note

L'outil traite uniquement les images déjà affichées dans ton navigateur (comme
la traduction d'image intégrée à Google Translate) — il ne télécharge ni ne
redistribue rien. À utiliser sur du contenu auquel tu as légitimement accès.
