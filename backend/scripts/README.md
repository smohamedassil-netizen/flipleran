# backend/scripts/

Scripts CLI de maintenance et de bootstrap pour FlipLearn. À exécuter
manuellement, jamais en cron applicatif.

## seed-prod.js

Seeds idempotents essentiels (badges + rewards) à passer une fois après
le premier déploiement, ou après tout ajout de nouveaux badges/rewards
dans le code.

```bash
npm run seed:prod
```

## migrate.js

Runner de migrations versionnées (`backend/migrations/`). Voir le
[README dédié](../migrations/README.md) pour la convention de nommage et
l'anatomie d'un fichier de migration.

```bash
npm run migrate                # applique les migrations en attente
npm run migrate -- --dry-run    # liste sans appliquer
```

## audit-videos.js

**Contexte** : La fonction `migrateBrokenVideos()` (anciennement dans
`services/videoMigration.js`, fichier renommé `videoMigration.deprecated.js`
pour empêcher toute réintroduction accidentelle) remplaçait silencieusement
les URLs de vidéos YouTube par des MP4 de demo (BigBuckBunny, ElephantsDream,
etc.) au démarrage du serveur. Désactivée le 28/04/2026, supprimée définitivement
de `server.js` lors du sprint-0/P0.4.

**But** : Identifier et marquer les videos corrompues par cette migration.

### Criteres de detection

- URL contient `sample`, `BigBuckBunny`, ou `ElephantsDream` (insensible a la casse)
- `provider` est `youtube` mais l'URL se termine par `.mp4`

### Usage

```bash
# 1. Audit seul (rapport console + CSV)
node backend/scripts/audit-videos.js

# 2. Audit + marquage des videos corrompues
node backend/scripts/audit-videos.js --fix
```

### Mode audit (defaut)

- Affiche les videos suspectes dans la console
- Genere `backend/scripts/audit-videos-report.csv` avec les colonnes :
  `_id, titre, courseId, provider, url, createdAt, createdBy`

### Mode --fix

En plus du rapport, marque chaque video suspecte avec `corruptedByMigration: true` dans MongoDB. Ce champ (ajoute au modele `Video.js`) permet au frontend d'afficher ces videos en mode "a re-uploader" sans les supprimer.

### Pre-requis

- Variable d'environnement `MONGODB_URI` definie (fichier `.env` ou export shell)
- Le modele `Video.js` doit inclure le champ `corruptedByMigration` (deja ajoute)

### Workflow recommande

1. Lancer l'audit en lecture seule : `node backend/scripts/audit-videos.js`
2. Examiner le CSV genere
3. Si les resultats sont coherents, lancer avec `--fix`
4. Implementer le frontend pour afficher le bandeau "video corrompue, veuillez re-uploader"
