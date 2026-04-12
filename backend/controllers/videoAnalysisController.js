import VideoAnalysis from '../models/VideoAnalysis.js';
import Video from '../models/Video.js';
import { analyzeVideo } from '../services/videoAnalyzer.js';

/* ─── POST /api/videos/:id/analyze ───────────────────────────────────────── */
/**
 * Lance l'analyse IA d'une vidéo (transcription + résumé + carte mentale).
 * Retourne 202 immédiatement — le traitement est asynchrone.
 */
export const startAnalysis = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Vidéo introuvable.' });

    // Vérifier si déjà analysée
    const existing = await VideoAnalysis.findOne({ videoId: video._id });
    if (existing?.status === 'completed') {
      return res.json({ message: 'Analyse déjà disponible.', analysis: existing });
    }

    // Vérifier si en cours
    if (existing?.status === 'transcribing' || existing?.status === 'analyzing') {
      return res.json({ message: 'Analyse en cours...', status: existing.status });
    }

    // Lancer l'analyse en arrière-plan
    res.status(202).json({ message: 'Analyse lancée.', status: 'pending' });

    // Fire-and-forget — le status est suivi en DB
    analyzeVideo(video._id, req.user.id).catch((err) => {
      console.error(`[VideoAnalysis] Échec pour ${video._id}:`, err.message);
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── GET /api/videos/:id/analysis ───────────────────────────────────────── */
/**
 * Récupère l'analyse complète d'une vidéo.
 */
export const getAnalysis = async (req, res) => {
  try {
    const analysis = await VideoAnalysis.findOne({ videoId: req.params.id });
    if (!analysis) {
      return res.status(404).json({ message: 'Aucune analyse disponible pour cette vidéo.' });
    }

    res.json(analysis);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── GET /api/videos/:id/analysis/status ────────────────────────────────── */
/**
 * Retourne uniquement le status de l'analyse (pour polling léger).
 */
export const getAnalysisStatus = async (req, res) => {
  try {
    const analysis = await VideoAnalysis.findOne({ videoId: req.params.id })
      .select('status error updatedAt');

    if (!analysis) {
      return res.json({ status: 'none' });
    }

    res.json({
      status:    analysis.status,
      error:     analysis.error,
      updatedAt: analysis.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── DELETE /api/videos/:id/analysis ────────────────────────────────────── */
/**
 * Supprime l'analyse pour relancer une nouvelle.
 */
export const deleteAnalysis = async (req, res) => {
  try {
    const result = await VideoAnalysis.findOneAndDelete({ videoId: req.params.id });
    if (!result) {
      return res.status(404).json({ message: 'Aucune analyse à supprimer.' });
    }
    res.json({ message: 'Analyse supprimée.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
