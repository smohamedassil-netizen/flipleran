/**
 * ⚠️  DEPRECATED — NE PAS RÉIMPORTER, NE PAS RÉACTIVER ⚠️
 * =====================================================================
 *
 * Ce fichier est conservé en mémoire institutionnelle uniquement.
 * Il est exclu du runtime : aucun import ne pointe vers lui, aucune route
 * ne le sollicite. Le suffixe .deprecated.js empêche une résolution
 * accidentelle par les imports d'origine (videoMigration.js).
 *
 * BUG HISTORIQUE (28/04/2026) :
 *   La fonction migrateBrokenVideos() était appelée au démarrage du serveur
 *   et écrasait silencieusement TOUTES les vidéos jugées "non-Cloudinary"
 *   (incluant les uploads YouTube légitimes faits par les professeurs) par
 *   des MP4 samples du pool Google Cloud.
 *
 *   Conséquence : à chaque redémarrage de Render (free tier, mise en veille
 *   après 15 min d'inactivité), les vidéos pédagogiques étaient remplacées
 *   par BigBuckBunny / ElephantsDream / Sintel / etc.
 *
 * MITIGATION APPLIQUÉE :
 *   1. Désactivation immédiate de l'appel dans server.js
 *      (commentaire de l'invocation, conservation temporaire de l'import)
 *   2. Création de backend/scripts/audit-videos.js pour identifier les
 *      vidéos déjà corrompues et les marquer corruptedByMigration: true
 *   3. (Présent commit) Suppression définitive de l'import et renommage
 *      du fichier en .deprecated.js pour empêcher toute réintroduction
 *      accidentelle par auto-import ou copier-coller
 *
 * LEÇONS RETENUES :
 *   - Une "migration" qui tourne à chaque démarrage n'est PAS une migration,
 *     c'est un job. Et un job qui modifie des données utilisateur sans
 *     consentement explicite est une bombe à retardement.
 *   - Les véritables migrations doivent être versionnées, idempotentes,
 *     traçables et exécutées une seule fois par environnement
 *     (voir backend/migrations/ pour la convention adoptée à la suite
 *     de cet incident).
 *   - Pour les seeds nécessaires en prod (badges, rewards), voir le script
 *     dédié backend/scripts/seed-prod.js.
 *
 * =====================================================================
 * Description originale conservée pour archive :
 *
 * videoMigration.js — Répare les vidéos cassées dans la DB.
 * Au boot, scanne toutes les vidéos et remplace celles qui :
 *   - ont provider='youtube' (les iframes YouTube avec des IDs approximatifs
 *     ne chargent pas)
 *   - ont une URL vide, invalide, ou inaccessible (pas cloudinary ni sample
 *     Google)
 * Par un mp4 du pool Google Cloud samples (stable, public).
 * Idempotent : ne touche pas aux vidéos déjà réparées (sample Google ou
 * Cloudinary).
 */

import Video from '../models/Video.js';

const SAMPLES = [
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',        duration: 596, thumb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg' },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',      duration: 653, thumb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg' },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',              duration: 888, thumb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg' },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',        duration: 734, thumb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/TearsOfSteel.jpg' },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',     duration: 15,  thumb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg' },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',        duration: 60,  thumb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerFun.jpg' },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',   duration: 15,  thumb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerJoyrides.jpg' },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',    duration: 15,  thumb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerEscapes.jpg' },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',  duration: 15,  thumb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerMeltdowns.jpg' },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4', duration: 594, thumb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/SubaruOutbackOnStreetAndDirt.jpg' },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4', duration: 15,  thumb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/VolkswagenGTIReview.jpg' },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4', duration: 47,  thumb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/WeAreGoingOnBullrun.jpg' },
  { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4', duration: 15, thumb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/WhatCarCanYouGetForAGrand.jpg' },
];

/**
 * Détermine si une URL de vidéo est considérée comme "qui marche".
 * - Cloudinary (res.cloudinary.com) : upload prof légitime → laisser
 * - commondatastorage.googleapis.com : sample déjà migré → laisser
 * - Tout le reste (YouTube, vide, autre) : à remplacer
 */
function isWorkingUrl(url) {
  if (!url) return false;
  if (url.includes('commondatastorage.googleapis.com')) return true;
  if (url.includes('res.cloudinary.com')) return true;
  return false;
}

export async function migrateBrokenVideos() {
  // On récupère toutes les vidéos — pas de filtrage MongoDB sur URL qui demanderait un regex complexe.
  const videos = await Video.find({}).select('provider url titre youtubeId');

  let fixed = 0;
  let kept = 0;

  for (let i = 0; i < videos.length; i++) {
    const v = videos[i];
    const needsFix = v.provider === 'youtube' || !isWorkingUrl(v.url);

    if (!needsFix) {
      kept++;
      continue;
    }

    const sample = SAMPLES[i % SAMPLES.length];
    await Video.updateOne(
      { _id: v._id },
      {
        $set: {
          provider:     'cloudinary',
          url:          sample.url,
          thumbnailUrl: sample.thumb,
          duration:     sample.duration,
          youtubeId:    '',
        },
      }
    );
    fixed++;
  }

  if (fixed > 0) {
    console.log(`[videoMigration] ${fixed} vidéos cassées réparées (mp4 samples), ${kept} conservées.`);
  }
  return { fixed, kept };
}
