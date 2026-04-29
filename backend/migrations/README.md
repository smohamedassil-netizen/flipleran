# Migrations

Migrations de schéma et de données versionnées, exécutées une seule fois
par environnement et tracées en base dans la collection `_migrations`.

## Pourquoi ce dossier existe

Une fois (28/04/2026), une "migration" appelée à chaque démarrage du serveur
([videoMigration.deprecated.js](../services/videoMigration.deprecated.js))
a écrasé en silence les vidéos pédagogiques des professeurs par des MP4
samples Google. Le fichier est conservé en mémoire institutionnelle.

À partir de ce dossier, toute modification structurelle ou correctrice de
la base passe par un fichier de migration **versionné, idempotent et tracé**.

## Convention de nommage

```
NNN-description-courte.js
```

- `NNN` : numéro à trois chiffres, séquentiel global, pas de saut.
  - `001` est la première migration.
  - Les numéros ne sont jamais réutilisés, même si une migration est
    annulée — on crée alors une nouvelle migration `NNN+1` qui inverse
    l'effet.
- `description-courte` : 2 à 5 mots en kebab-case, à l'impératif ou au
  participe passé. Ex : `add-outcomes`, `qcm-multi`, `index-courseId`.

Exemples valides :
- `001-add-outcomes.js`
- `002-qcm-multi.js`
- `003-index-courseId.js`
- `042-cleanup-orphan-progress.js`

## Anatomie d'un fichier de migration

```js
// backend/migrations/001-add-outcomes.js

export const id = '001-add-outcomes';

export const description = 'Ajoute le champ outcomes[] aux cours existants';

/**
 * Migration up : applique la modification.
 * DOIT être idempotente : si elle a déjà tourné (même partiellement),
 * elle doit pouvoir être relancée sans dégât.
 */
export async function up() {
  const Course = (await import('../models/Course.js')).default;
  await Course.updateMany(
    { outcomes: { $exists: false } },
    { $set: { outcomes: [] } }
  );
}

/**
 * Migration down : annule la modification (optionnel mais recommandé).
 * Si non implémentée, lever une erreur explicite.
 */
export async function down() {
  throw new Error('Migration 001 non réversible : champ outcomes conservé');
}
```

## Exécution

```bash
npm run migrate                # joue toutes les migrations non encore appliquées
npm run migrate -- --dry-run    # liste ce qui serait appliqué, sans toucher la base
```

Les migrations déjà appliquées sont enregistrées dans la collection
`_migrations` avec leur identifiant et la date d'exécution. Le runner
saute automatiquement celles qui sont déjà présentes.

## Règles d'or

1. **Une migration ne tourne JAMAIS automatiquement au démarrage du serveur.**
   Elle est exécutée explicitement via `npm run migrate`, hors du cycle de
   redéploiement applicatif.
2. **Les fichiers de migration sont immuables une fois mergés sur `main`.**
   On ne corrige jamais un fichier déjà appliqué : on crée une migration
   suivante qui rectifie.
3. **Pas de logique métier dans une migration.** Une migration manipule
   des documents existants, pas de la logique applicative.
4. **Tester sur une copie de la base de prod avant d'exécuter** sur la
   production. La collection `_migrations` permet d'auditer ce qui a été
   joué.
