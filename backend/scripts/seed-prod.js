#!/usr/bin/env node
/**
 * seed-prod.js — Seeds idempotents essentiels pour la production.
 *
 * Crée ou complète les badges et les rewards (récompenses gamification).
 * Ces seeds sont idempotents : ils peuvent être exécutés plusieurs fois
 * sans dupliquer ni écraser de données existantes — chaque service vérifie
 * la présence de chaque entrée par sa clé naturelle (code badge, slug
 * reward) avant insertion.
 *
 * À exécuter manuellement après le premier déploiement, ou après une
 * mise à jour qui ajoute de nouveaux badges/rewards :
 *
 *   npm run seed:prod
 *
 * Ne contient PAS de contenu de démo (utilisateurs fictifs, cours,
 * vidéos, Prosits) — voir la fonction runDemoSeedsIfEnabled() dans
 * server.js, gardée derrière SEED_CONTENT='true' et bloquée en prod.
 *
 * Sécurité : ne dépend pas de NODE_ENV. Le développeur qui lance ce
 * script connaît son environnement et assume l'effet sur la base ciblée
 * par MONGODB_URI.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import { seedBadges } from '../services/points.js';
import { seedRewards } from '../services/rewardsSeed.js';
import { seedProsits } from '../services/prositsSeed.js';

async function main() {
  console.log('[seed:prod] Connexion à la base…');
  await connectDB();

  console.log('[seed:prod] seedBadges()…');
  await seedBadges();

  console.log('[seed:prod] seedRewards()…');
  await seedRewards();

  /**
   * Cas pratiques algériens — 1 par filière (ISIL, Management, Finance).
   * Idempotents (skip si titre existe), production-safe. Référencés sur la
   * landing page §8 ("Cas algériens contextualisés"). Voir prositsSeed.js.
   */
  console.log('[seed:prod] seedProsits() — cas pratiques algériens…');
  await seedProsits();

  console.log('[seed:prod] Terminé. Fermeture de la connexion.');
  await mongoose.connection.close();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[seed:prod] Erreur :', err);
    process.exit(1);
  });
