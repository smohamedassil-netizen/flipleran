# Conventions de travail — FlipLearn

Règles à respecter quand tu modifies le code, la doc, ou que tu commites.

---

## 1. Commits & push

**Format des messages de commit** (Conventional Commits) :

| Préfixe | Quand l'utiliser |
|---|---|
| `feat:` | nouvelle fonctionnalité utilisateur |
| `fix:` | correction de bug |
| `docs:` | documentation seule |
| `style:` | CSS, mise en forme, sans changement de logique |
| `refactor:` | restructuration sans changement de comportement |
| `chore:` | maintenance, deps, scripts internes |
| `revert:` | annulation d'un commit précédent |

Exemples du repo :
- `fix(quiz-battle): mode démo solo + 50/50 sécurisé côté serveur`
- `revert(quiz-battle): retire le mode "vs IA"`
- `docs(livrables): refonte exhaustive Tutoriel + Guide de compréhension`

**Co-Author** : tous les commits faits par un agent IA doivent inclure une ligne `Co-Authored-By:` à la fin du message :

```
Co-Authored-By: Claude <noreply@anthropic.com>
```

**Push direct sur `main` autorisé.** Pas de PR / review nécessaire pour le travail courant. C'est un PFE solo, l'auteur a explicitement accordé sa confiance.

**Branches features** : si tu fais un sprint multi-features, OK pour brancher (`sprint-final`, `sprint-pedagogy/foo`) puis merger. Sinon push direct sur `main`.

---

## 2. Pas de fichiers versionnés

**Jamais** créer de fichiers `_v2`, `_v3`, `_FINAL`, `_old`, `_backup`. **Écrase** les livrables existants. Git fait l'historique, pas le nom de fichier.

**Vrais cas d'usage** :
- Le mémoire `.docx` change → écrase l'ancien
- Le tutoriel se met à jour → écrase
- Un script `doc_updater.py` génère une nouvelle version → écrase

---

## 3. Documentation automatique

Quand tu fais une modification visible côté utilisateur (UI, nouvelle feature, correction de bug observable), appelle `scripts/doc_updater.py` du dossier PFE racine (pas dans le repo) avec un payload JSON contenant :

```json
{
  "title": "...",
  "demande_par": "...",
  "fichiers": ["..."],
  "avant": "...",
  "apres": "...",
  "pourquoi": "...",
  "outils": ["..."],
  "langages": ["..."],
  "anomalies": ["..."],
  "tuto_update": {
    "section": "...",
    "contenu": "...",
    "etapes": ["..."],
    "conseil": "..."
  }
}
```

Cela met à jour 2 documents Word :
- `livrables/Documentation_PFE.docx` — journal technique
- `livrables/Tutoriel_FlipLearn.docx` — guide utilisateur

**Si tu es un agent distant qui n'a pas accès au script Python local** : mentionne que la modif doit être journalisée, et l'auteur lancera `doc_updater.py` localement.

---

## 4. Code style — patterns du projet

### Backend (Node.js / Express / Mongoose)

- ES Modules (`import`/`export`), pas de CommonJS — `package.json` a `"type": "module"`.
- **Rôles utilisateurs en français** dans la DB : `etudiant`, `professeur`, `admin` (pas `student`/`teacher`).
- JWT vérifié dans `middleware/authMiddleware.js`, attache `req.user`.
- Socket.io : auth via JWT dans `socket.handshake.auth.token`, ACL par room dans `canJoinRoom()` de `server.js`.
- Quotas IA : `aiLimiter` dans `server.js` (30 requêtes / heure / user).
- Idempotence des XP : utiliser `dedupKey` dans `addPoints()` pour éviter les doublons.

### Frontend (React 18 / Vite / Tailwind)

- Lazy loading sur toutes les pages sauf `Login`, `Register`, `LandingPage`, `DashboardRouter` — voir `App.jsx`.
- Token JWT stocké dans `sessionStorage` sous la clé `fliplearn_user`.
- Toutes les routes protégées par `<ProtectedRoute>` avec `roles={[...]}`.
- Layout commun dans `components/Layout.jsx`, sidebar adaptée par rôle.
- **Texte UI en français** avec accents UTF-8 directs dans le JSX (utiliser `{'é'}` si besoin d'expression JS, sinon écrire `é` directement).
- CSS : variables custom dans `index.css` (`--color-primary`, etc.), alias `--primary` → `--color-primary`.

### Filière / promotion

- **Filières** : `ISIL` (Informatique), `Management`, `Finance`.
- **Promotions** : `L1`, `L2`, `L3`.
- Codes filière dans les emails seed : `prenom.filiere.promo@fliplearn.dz` (ex : `assil.isil.l3@fliplearn.dz`).

---

## 5. Vision pédagogique

Voir [`pedagogie.md`](pedagogie.md) pour le détail. Trois règles à retenir :

1. **L'IA est un outil d'encadrement adaptatif personnalisé**, pas un prédicteur d'échec ou un substitut au professeur.
2. **Pas de "mode vs IA"** dans les features pair-à-pair (Quiz Battle, Prosits, projets PBL, peer-assessment). Ces features tirent leur valeur de l'émulation entre étudiants.
3. **Cadre éducatif**, pas farming/jeu : XP & badges accompagnent la pédagogie, ne la remplacent pas.

---

## 6. Tests rapides avant push

Avant un commit qui touche au code :

```bash
# Backend démarre sans erreur
cd backend && npm run dev   # vérifie pas de crash au démarrage

# Frontend compile
cd frontend && npm run build
```

Pour les tests Jest (existants mais pas exhaustifs) :
```bash
cd backend && npm test
```

**Tests visuels** via Claude Preview ou navigation manuelle si la modif est UI : vérifier au minimum login → dashboard → la page modifiée → console sans erreur.
