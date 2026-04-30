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

## seed-soutenance.js

Prépare une **scène de démo cohérente pour la soutenance PFE** : prof
« Mme Lebrun », cours « Sécurité Web — L3 ISIL » avec 5 outcomes Bloom et
contrat pédagogique, 3 vidéos avec chapters, 3 questions in-video, 3 QCM,
LearningPath publié de 7 steps, Prosit OWASP Top 10 en phase Retour avec
2 groupes de 4 étudiants, peer-assessments partiels, et notes finales déjà
calculées pour le groupe Alpha.

```bash
# Idempotent : ne fait rien si la scène existe déjà
node backend/scripts/seed-soutenance.js
npm run seed:soutenance

# Réinitialise tout puis recrée la scène de démo
node backend/scripts/seed-soutenance.js --reset

# Aperçu sans écriture
node backend/scripts/seed-soutenance.js --dry-run
```

### Comptes démo créés

Tous avec mot de passe `demo1234` (à utiliser uniquement pour la démo).

| Rôle | Email | Profil |
|------|-------|--------|
| Professeure | `lebrun@fliplearn.dz` | Marie Lebrun, ISIL L3 |
| Étudiant excellent | `sara.demo@fliplearn.dz` | Sara, MVP du Groupe Alpha |
| Étudiant excellent | `yanis.demo@fliplearn.dz` | Yanis, engagement 90% |
| Étudiant moyen | `lina.demo@fliplearn.dz` | Lina, engagement 65% |
| Étudiant moyen | `walid.demo@fliplearn.dz` | Walid, engagement 60% |
| Étudiant moyen | `rania.demo@fliplearn.dz` | Rania, engagement 55% |
| Étudiant moyen | `samir.demo@fliplearn.dz` | Samir, engagement 62% |
| Étudiant en difficulté | `imane.demo@fliplearn.dz` | Imane, engagement 38% |
| Étudiant en difficulté | `mehdi.demo@fliplearn.dz` | Mehdi, engagement 30%, free-rider candidat |

### Fonctionnalités à montrer (script de démo détaillé)

Voir [docs/script-soutenance.md](../../docs/script-soutenance.md) pour le
déroulé minute par minute (7 minutes au total) :

1. **Étudiant moyen** (Lina) consomme une vidéo, répond à une question
   in-video, passe le QCM, voit son LearningPath se débloquer.
2. **Étudiant** (Lina ou Sara) ouvre le Prosit en phase Retour, soumet son
   évaluation par les pairs et son auto-évaluation.
3. **Professeure Lebrun** consulte le tableau de bord du cours, voit la
   répartition des engagements, ouvre le Prosit pour voir les notes
   individuelles finales du Groupe Alpha (déjà calculées).
4. **Édition pédagogique** : la prof crée un nouvel outcome Bloom et
   réordonne le LearningPath en direct.
5. **Onboarding** : un étudiant qui n'a jamais ouvert de Prosit voit le
   modal d'invitation à lire la **fiche méthode CESI**.

### Reset rapide entre 2 répétitions de la démo

Si vous testez la démo plusieurs fois et que vous voulez repartir d'un
état propre (peer-assessment ré-ouvert, scores recalculés à neuf) :

```bash
node backend/scripts/seed-soutenance.js --reset
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
