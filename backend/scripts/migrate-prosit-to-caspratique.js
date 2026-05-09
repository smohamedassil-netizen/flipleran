#!/usr/bin/env node
/**
 * migrate-prosit-to-caspratique.js — Migration des Prosits vers la structure
 * "Cas pratique" simplifiée (refonte 2026-05-09).
 *
 * Mapping :
 *   status (legacy)        → statut (new)
 *   ─────────────────────────────────────────────
 *   brouillon              → planifie
 *   aller                  → cadrage_en_cours
 *   recherche              → travail_individuel
 *   retour                 → bilan_en_cours
 *   evalue                 → evalue
 *   archive                → evalue
 *
 *   role legacy            → role new (3 rôles)
 *   ─────────────────────────────────────────────
 *   animateur              → animateur
 *   scribe                 → scribe
 *   secretaire             → scribe
 *   gestionnaire           → membre
 *   membre                 → membre
 *
 *   groupes[0].motsClesIdentifies, problematiqueReformulee, planAction (string),
 *   hypotheses              → cadrageDocument
 *   groupes[0].membres[*].contributionTexte/Fichier  → livrables[]
 *   groupes[0].solutionTexte/Fichier                 → bilanDocument
 *   groupes[0].evaluation + finalIndividualScores    → notes[]
 *   ressources             → resources (avec mapping type)
 *   dateAller              → phaseCadrageDate
 *   dateRetour             → phaseBilanDate
 *
 * ⚠ Si un Prosit a plusieurs groupes, on prend le premier et on log un warning.
 * Idempotent : skippe les Prosits déjà migrés (statut + groupMembers déjà set).
 *
 * Usage : node backend/scripts/migrate-prosit-to-caspratique.js (depuis fliplearn/)
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Prosit from '../models/Prosit.js';

const STATUS_MAP = {
  brouillon: 'planifie',
  aller:     'cadrage_en_cours',
  recherche: 'travail_individuel',
  retour:    'bilan_en_cours',
  evalue:    'evalue',
  archive:   'evalue',
};

const ROLE_MAP = {
  animateur:    'animateur',
  scribe:       'scribe',
  secretaire:   'scribe',
  gestionnaire: 'membre',
  membre:       'membre',
};

const RESOURCE_TYPE_MAP = {
  document: 'pdf',
  video:    'link',
  lien:     'link',
};

function splitPlanAction(planActionStr) {
  if (!planActionStr) return [];
  return planActionStr
    .split(/\r?\n|;|•|·/)
    .map((s) => s.trim())
    .filter(Boolean);
}

(async () => {
  await connectDB();
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Migration Prosit → Cas pratique (3 rôles, 5 statuts simplifiés)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const prosits = await Prosit.find({});
  console.log(`Trouvé ${prosits.length} Prosits à examiner\n`);

  const stats = { migrated: 0, skipped: 0, multiGroupWarnings: 0, errors: 0 };

  for (const p of prosits) {
    try {
      // ─── Idempotency : skippe si déjà migré ─────────────────────────
      const alreadyMigrated =
        p.statut && p.statut !== 'planifie' &&
        Array.isArray(p.groupMembers) && p.groupMembers.length > 0;
      // Cas spécial : Prosit en brouillon sans groupe — on migre quand même
      // (initialise statut + champs vides, c'est un no-op visible)
      const isPlanifieEmpty =
        p.statut === 'planifie' && (!p.groupMembers || p.groupMembers.length === 0)
        && (!p.groupes || p.groupes.length === 0);

      if (alreadyMigrated && !isPlanifieEmpty) {
        stats.skipped++;
        console.log(`  ⊘ Skip "${p.titre}" (déjà migré)`);
        continue;
      }

      // ─── Statut ──────────────────────────────────────────────────────
      const oldStatus = p.status || 'brouillon';
      p.statut = STATUS_MAP[oldStatus] || 'planifie';

      // ─── Dates ───────────────────────────────────────────────────────
      if (p.dateAller && !p.phaseCadrageDate) p.phaseCadrageDate = p.dateAller;
      if (p.dateRetour && !p.phaseBilanDate)  p.phaseBilanDate = p.dateRetour;

      // ─── Énoncé : enonce → contexte (si vide) ────────────────────────
      if (p.enonce && !p.contexte) p.contexte = p.enonce;
      // problematique reste vide si pas définie (le prof la complétera ou pas)

      // ─── Ressources : ressources → resources ─────────────────────────
      if ((p.ressources || []).length > 0 && (p.resources || []).length === 0) {
        p.resources = p.ressources.map((r) => ({
          type:        RESOURCE_TYPE_MAP[r.type] || 'link',
          title:       r.titre || '',
          url:         r.url || '',
          description: '',
        }));
      }

      // ─── Groupe principal (premier groupe legacy) ────────────────────
      if ((p.groupes || []).length > 1) {
        stats.multiGroupWarnings++;
        console.log(`  ⚠ "${p.titre}" : ${p.groupes.length} groupes legacy → on prend le 1er`);
      }
      const firstGroup = (p.groupes || [])[0];

      if (firstGroup) {
        // groupMembers
        if (!p.groupMembers || p.groupMembers.length === 0) {
          p.groupMembers = (firstGroup.membres || []).map((m) => ({
            studentId: m.userId,
            role:      ROLE_MAP[m.role] || 'membre',
          }));
        }

        // Trouver le scribe (rédacteur des documents collectifs)
        const scribeMember = (firstGroup.membres || []).find(
          (m) => m.role === 'scribe' || m.role === 'secretaire'
        );
        const scribeId = scribeMember ? scribeMember.userId : null;

        // cadrageDocument : seulement si du contenu existe
        const hasCadrage =
          (firstGroup.motsClesIdentifies || []).length > 0
          || firstGroup.problematiqueReformulee
          || firstGroup.planAction
          || (firstGroup.hypotheses || []).length > 0;

        const cadrageEmpty =
          !p.cadrageDocument
          || (!p.cadrageDocument.completedAt && !p.cadrageDocument.problematiqueReformulee);

        if (hasCadrage && cadrageEmpty) {
          p.cadrageDocument = {
            motsCles:                firstGroup.motsClesIdentifies || [],
            problematiqueReformulee: firstGroup.problematiqueReformulee || '',
            planAction:              splitPlanAction(firstGroup.planAction),
            questionsOuvertes:       firstGroup.hypotheses || [],
            redigePar:               scribeId,
            validatedBy:             [],
            valideParGroupe:         oldStatus !== 'aller' && oldStatus !== 'brouillon',
            completedAt:             oldStatus !== 'aller' && oldStatus !== 'brouillon'
                                       ? (p.dateAller || p.createdAt) : null,
          };
        }

        // livrables : un par membre ayant contribué
        if (!p.livrables || p.livrables.length === 0) {
          p.livrables = (firstGroup.membres || [])
            .filter((m) => m.contributionTexte || (m.contributionFichier && m.contributionFichier.url))
            .map((m) => ({
              studentId:       m.userId,
              contenu:         m.contributionTexte || '',
              fichierUrl:      m.contributionFichier?.url || '',
              fichierPublicId: m.contributionFichier?.publicId || '',
              submittedAt:     m.contributionAt || p.createdAt,
              aiDetection:     m.aiDetection || null,
            }));
        }

        // bilanDocument
        const hasBilan = firstGroup.solutionTexte || firstGroup.solutionFichier?.url;
        const bilanEmpty =
          !p.bilanDocument
          || (!p.bilanDocument.completedAt && !p.bilanDocument.syntheseSolutions);

        if (hasBilan && bilanEmpty) {
          p.bilanDocument = {
            syntheseSolutions:  firstGroup.solutionTexte || '',
            pointsAccomplis:    [],
            pointsNonAccomplis: [],
            apprentissages:     [],
            redigePar:          scribeId,
            validatedBy:        [],
            completedAt:        firstGroup.presenteAt || null,
          };
        }

        // notes : depuis evaluation + finalIndividualScores
        const hasEvaluation = firstGroup.evaluation && firstGroup.evaluation.noteGlobale != null;
        if (hasEvaluation && (!p.notes || p.notes.length === 0)) {
          const groupNote = firstGroup.evaluation.noteGlobale;
          const finalScores = firstGroup.finalIndividualScores || [];
          p.notes = (firstGroup.membres || []).map((m) => {
            const finalScore = finalScores.find(
              (fs) => String(fs.userId) === String(m.userId)
            );
            return {
              studentId:        m.userId,
              noteIndividuelle: finalScore?.finalScore ?? groupNote,
              noteCollective:   groupNote,
              feedback:         firstGroup.evaluation.commentaire || '',
              notedAt:          firstGroup.evaluation.evalueAt || p.updatedAt,
            };
          });
        }
      }

      await p.save();
      stats.migrated++;
      console.log(`  ✓ "${p.titre}" → statut=${p.statut}, groupMembers=${p.groupMembers.length}, livrables=${p.livrables.length}`);
    } catch (err) {
      stats.errors++;
      console.error(`  ✗ Erreur sur "${p.titre || p._id}" :`, err.message);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`✓ Migration terminée :`);
  console.log(`    Migrés       : ${stats.migrated}`);
  console.log(`    Skippés      : ${stats.skipped}`);
  console.log(`    Multi-groupe : ${stats.multiGroupWarnings}`);
  console.log(`    Erreurs      : ${stats.errors}`);
  console.log('═══════════════════════════════════════════════════════════');

  await mongoose.disconnect();
  process.exit(stats.errors > 0 ? 1 : 0);
})().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
