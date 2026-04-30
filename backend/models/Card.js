import mongoose from 'mongoose';

/**
 * Card — flashcard SM-2 (Wozniak, 1990 ; courbe d'oubli Ebbinghaus, 1885).
 *
 * Champs ajoutés en F6 (sprint-final) :
 *  - source : provenance de la carte. 'auto-ai' = générée par IA depuis le
 *    transcript d'une vidéo vue par l'étudiant. 'prof' = poussée par le prof
 *    via l'auto-prep d'un cours. 'manual' = créée à la main par l'étudiant.
 *    Permet de filtrer "decks IA" sur la page Decks.jsx et d'afficher un
 *    badge "Auto".
 *  - sourceVideo : référence vers la vidéo source (uniquement si auto-ai),
 *    utile pour traçabilité et pour éviter de regénérer indéfiniment.
 *  - frontHash : SHA-1 court de `front` normalisé (lowercase + trim) ;
 *    sert UNIQUEMENT à la déduplication automatique côté autoFlashcards
 *    (skip si une carte avec le même front existe déjà dans le deck).
 */
const cardSchema = new mongoose.Schema(
  {
    deck: { type: mongoose.Schema.Types.ObjectId, ref: 'Deck', required: true },
    front: { type: String, required: true },
    back: { type: String, required: true },
    image: { type: String, default: '' },
    audio: { type: String, default: '' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    nextReview: { type: Date, default: Date.now },
    interval: { type: Number, default: 1 },
    easeFactor: { type: Number, default: 2.5 },
    repetitions: { type: Number, default: 0 },
    source: { type: String, enum: ['manual', 'auto-ai', 'prof'], default: 'manual' },
    sourceVideo: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', default: null },
    frontHash: { type: String, default: '', index: true },
  },
  { timestamps: true }
);

cardSchema.index({ deck: 1, frontHash: 1 });

export default mongoose.model('Card', cardSchema);
