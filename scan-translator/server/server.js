import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

const PORT = process.env.PORT || 5055;
const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY;
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEEPL_API_URL = process.env.DEEPL_API_URL || 'https://api-free.deepl.com/v2/translate';
const TARGET_LANG = process.env.TARGET_LANG || 'FR';

// Reconstruit le texte d'un bloc Vision en parcourant paragraphes/mots/symboles,
// en respectant les sauts de ligne/espaces détectés par l'API.
function blockText(block) {
  let text = '';
  for (const paragraph of block.paragraphs || []) {
    for (const word of paragraph.words || []) {
      for (const symbol of word.symbols || []) {
        text += symbol.text;
        const breakType = symbol.property?.detectedBreak?.type;
        if (breakType === 'SPACE' || breakType === 'EOL_SURE_SPACE') text += ' ';
        if (breakType === 'LINE_BREAK') text += '\n';
      }
    }
  }
  return text.trim();
}

function boundingRect(boundingBox) {
  const vertices = boundingBox?.vertices || [];
  const xs = vertices.map((v) => v.x || 0);
  const ys = vertices.map((v) => v.y || 0);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

async function ocrImage(imageBase64) {
  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBase64 },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          },
        ],
      }),
    }
  );
  if (!res.ok) throw new Error(`Google Vision a répondu ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const annotation = data.responses?.[0]?.fullTextAnnotation;
  if (!annotation) return [];

  const blocks = [];
  for (const page of annotation.pages || []) {
    for (const block of page.blocks || []) {
      const text = blockText(block);
      if (text) blocks.push({ text, ...boundingRect(block.boundingBox) });
    }
  }
  return blocks;
}

async function translateTexts(texts) {
  if (texts.length === 0) return [];
  const params = new URLSearchParams();
  for (const t of texts) params.append('text', t);
  params.append('target_lang', TARGET_LANG);

  const res = await fetch(DEEPL_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  if (!res.ok) throw new Error(`DeepL a répondu ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.translations.map((t) => t.text);
}

app.post('/api/translate-image', async (req, res) => {
  try {
    if (!GOOGLE_VISION_API_KEY || !DEEPL_API_KEY) {
      return res.status(500).json({
        error: 'GOOGLE_VISION_API_KEY et/ou DEEPL_API_KEY manquants côté serveur (voir .env.example).',
      });
    }
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'imageBase64 manquant' });

    const blocks = await ocrImage(imageBase64);
    const translations = await translateTexts(blocks.map((b) => b.text));

    res.json({
      blocks: blocks.map((b, i) => ({
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        original: b.text,
        translated: translations[i] || '',
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Scan Translator server listening on http://localhost:${PORT}`);
});
