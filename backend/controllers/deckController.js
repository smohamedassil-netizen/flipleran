import Deck from '../models/Deck.js';
import Video from '../models/Video.js';
import Card from '../models/Card.js';
import Groq from 'groq-sdk';
import { getLLM } from '../services/llm.js';

export const getDecks = async (req, res) => {
  try {
    const decks = await Deck.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.json(decks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createDeck = async (req, res) => {
  try {
    const { title, description, category, isPublic, tags } = req.body;
    const deck = await Deck.create({
      title,
      description,
      category,
      isPublic,
      tags,
      owner: req.user.id,
    });
    res.status(201).json(deck);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDeckById = async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id).populate('owner', 'name avatar');
    if (!deck) return res.status(404).json({ message: 'Deck not found' });
    res.json(deck);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateDeck = async (req, res) => {
  try {
    const deck = await Deck.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      req.body,
      { new: true }
    );
    if (!deck) return res.status(404).json({ message: 'Deck not found' });
    res.json(deck);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteDeck = async (req, res) => {
  try {
    const deck = await Deck.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!deck) return res.status(404).json({ message: 'Deck not found' });
    res.json({ message: 'Deck deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const generateFlashcardsAI = async (req, res) => {
  try {
    const { videoId, deckTitle } = req.body;
    if (!videoId) return res.status(400).json({ message: 'videoId requis' });

    // Fetch video info
    const video = await Video.findById(videoId).populate('courseId', 'titre');
    if (!video) return res.status(404).json({ message: 'Vidéo introuvable' });

    // Initialize Groq
    const groq = getLLM();

    // Récupérer le transcript IA si disponible
    let transcript = '';
    try {
      const { getTranscript } = await import('../services/videoAnalyzer.js');
      transcript = await getTranscript(videoId) || '';
    } catch { /* pas grave si pas dispo */ }

    const transcriptContext = transcript
      ? `\n\nTranscription du cours :\n"""${transcript.slice(0, 12000)}"""\n\nBase tes flashcards UNIQUEMENT sur le contenu de cette transcription.`
      : '';

    const prompt = `Tu es un expert pédagogique. Génère 10 flashcards (question/réponse) pour réviser le sujet suivant :

Titre de la vidéo : "${video.titre}"
Cours : "${video.courseId?.titre || 'Informatique'}"
Description : "${video.description || 'Cours universitaire'}"${transcriptContext}

RÈGLES STRICTES :
- Réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après
- Format exact : { "flashcards": [{ "question": "...", "reponse": "..." }, ...] }
- 10 flashcards maximum
- Questions courtes et précises
- Réponses concises (1-3 phrases)
- Tout en français
- Couvre les concepts clés du sujet`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    });

    let flashcards = [];
    try {
      const text = completion.choices[0].message.content.trim();
      const json = JSON.parse(text.replace(/^```json?\n?/, '').replace(/\n?```$/, ''));
      flashcards = json.flashcards || [];
    } catch {
      return res.status(500).json({ message: 'Erreur lors de la génération IA' });
    }

    if (flashcards.length === 0) {
      return res.status(500).json({ message: 'Aucune flashcard générée' });
    }

    // Create deck
    const title = deckTitle || `Révision — ${video.titre}`;
    const deck = await Deck.create({
      title,
      description: `Généré par IA depuis : ${video.titre}`,
      category: video.courseId?.titre || 'Général',
      owner: req.user.id,
    });

    // Create cards
    const cards = await Card.insertMany(
      flashcards.map(f => ({
        deck: deck._id,
        front: f.question,
        back: f.reponse,
      }))
    );

    res.status(201).json({ deck, cards, count: cards.length });
  } catch (error) {
    console.error('generateFlashcardsAI error:', error);
    res.status(500).json({ message: error.message });
  }
};
