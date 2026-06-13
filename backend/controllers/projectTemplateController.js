import Groq from 'groq-sdk';
import { getLLM } from '../services/llm.js';
import ProjectTemplate from '../models/ProjectTemplate.js';
import { seedOfficialTemplates } from '../services/projectTemplatesSeed.js';
import { getRubricTemplate } from '../services/projectTemplates.js';

/**
 * projectTemplateController — Bibliothèque de templates de projets (F10).
 *
 * Auto-seed paresseux : à la première lecture de la liste, si la DB ne
 * contient aucun template officiel, on déclenche le seed (14 templates).
 * Évite la nécessité d'un script de seed séparé en prod sur Render — la
 * lib se peuple toute seule au premier accès prof.
 */

const MODEL = 'llama-3.3-70b-versatile';
let groqClient;
function getGroq() {
  if (!groqClient) groqClient = getLLM();
  return groqClient;
}

/* ─── GET /api/project-templates ───────────────────────────────────────── */
/**
 * Liste les templates avec filtres optionnels : ?filiere=ISIL&type=pfe&level=L3&source=official
 * Auto-seed : si aucun template officiel en DB, déclenche seedOfficialTemplates.
 */
export const listTemplates = async (req, res) => {
  try {
    // Auto-seed paresseux (n'arrive qu'une fois)
    const officialCount = await ProjectTemplate.countDocuments({ source: 'official' });
    if (officialCount === 0) {
      try { await seedOfficialTemplates(); }
      catch (err) { console.error('[templates auto-seed]', err.message); }
    }

    const { filiere, type, level, source, q } = req.query;
    const filter = { isPublic: true };
    if (filiere) filter.filiere = filiere;
    if (type) filter.type = type;
    if (level) filter.level = level;
    if (source) filter.source = source;
    if (q) filter.$text = { $search: String(q).slice(0, 100) };

    const templates = await ProjectTemplate.find(filter)
      .sort({ source: 1, usageCount: -1, createdAt: -1 })
      .limit(100)
      .lean();

    res.json({ templates, count: templates.length });
  } catch (err) {
    console.error('listTemplates error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/* ─── GET /api/project-templates/:id ───────────────────────────────────── */
export const getTemplate = async (req, res) => {
  try {
    const tpl = await ProjectTemplate.findById(req.params.id).lean();
    if (!tpl) return res.status(404).json({ message: 'Template introuvable.' });
    if (!tpl.isPublic && String(tpl.createdBy) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Template privé.' });
    }
    res.json(tpl);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── POST /api/project-templates/:id/use ──────────────────────────────── */
/**
 * Marque un template comme utilisé (incrémente usageCount). Le frontend
 * appelle cet endpoint juste avant de naviguer vers ProjectCreate avec
 * le payload pré-rempli.
 */
export const markTemplateUsed = async (req, res) => {
  try {
    const tpl = await ProjectTemplate.findByIdAndUpdate(
      req.params.id,
      { $inc: { usageCount: 1 } },
      { new: true }
    ).lean();
    if (!tpl) return res.status(404).json({ message: 'Template introuvable.' });
    res.json({ usageCount: tpl.usageCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ─── POST /api/project-templates/generate (prof+admin) ────────────────── */
/**
 * Génère un template complet via Groq selon les paramètres passés.
 * Body : { filiere, type, level, theme }
 * Retourne le template structuré PRÊT à être inséré (option save=true) ou
 * juste prévisualisé.
 */
export const generateTemplate = async (req, res) => {
  try {
    if (!['professeur', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Réservé aux profs.' });
    }
    const { filiere, type, level = 'L3', theme, save = false } = req.body || {};
    if (!filiere || !type || !theme) {
      return res.status(400).json({ message: 'filiere, type et theme requis.' });
    }
    if (!['ISIL', 'Management', 'Finance', 'transverse'].includes(filiere)) {
      return res.status(400).json({ message: 'filiere invalide.' });
    }
    if (!['mono', 'groupe', 'pfe'].includes(type)) {
      return res.status(400).json({ message: 'type invalide.' });
    }

    const phaseCount = type === 'mono' ? 3 : type === 'groupe' ? 5 : 7;

    const sys = `Tu es un concepteur pédagogique expert (méthode PBL, Helle-Tynjälä-Olkinuora 2006).
Tu génères un template de projet COMPLET pour étudiants ${level} en ${filiere} dans le contexte universitaire algérien.
RÈGLES STRICTES :
- title : court et accrocheur (max 100 chars).
- description : 1 phrase qui résume le projet.
- enonce : un cas concret, 200-300 mots, ancré dans le contexte algérien si pertinent.
- motsCles : 5-8 termes-clés.
- ${phaseCount} phases avec titre / description / weight (somme = 100) / livrableSpec.
- 5 critères de rubric avec descriptors par niveau 1, 3 et 5.
- 3 suggestedOutcomes (verbes d'action observables).
- En français.
- Format JSON strict : { "title", "description", "enonce", "motsCles": [...], "phases": [{"titre","description","weight","livrableSpec":{"type","isRequired","consigne"}}], "rubric": [{"criterion","maxPoints","descriptors":[{"level","text"}]}], "suggestedOutcomes": [...] }`;

    const usr = `Génère un template de projet ${type} de niveau ${level} en ${filiere} sur le thème : "${theme}".`;

    const completion = await getGroq().chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: sys },
        { role: 'user',   content: usr },
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices?.[0]?.message?.content || '{}';
    let data;
    try { data = JSON.parse(content); }
    catch (e) { return res.status(502).json({ message: 'JSON malformé en sortie IA.' }); }

    // Validation/sanitisation minimale
    const sanitized = {
      title:                  String(data.title || '').slice(0, 200) || `Template ${theme}`,
      description:            String(data.description || '').slice(0, 2000),
      enonce:                 String(data.enonce || '').slice(0, 5000),
      motsCles:               Array.isArray(data.motsCles) ? data.motsCles.map((m) => String(m).slice(0, 50)).filter(Boolean).slice(0, 10) : [],
      filiere, type, level,
      estimatedDurationWeeks: type === 'pfe' ? 16 : type === 'groupe' ? 8 : 6,
      phases: Array.isArray(data.phases)
        ? data.phases.map((p) => ({
            titre:        String(p.titre || '').slice(0, 200),
            description:  String(p.description || '').slice(0, 1000),
            weight:       Math.max(0, Math.min(100, Math.round(Number(p.weight) || 0))),
            livrableSpec: p.livrableSpec ? {
              type:       ['document', 'video', 'presentation', 'demo', 'libre'].includes(p.livrableSpec.type) ? p.livrableSpec.type : 'libre',
              isRequired: !!p.livrableSpec.isRequired,
              consigne:   String(p.livrableSpec.consigne || '').slice(0, 1000),
            } : null,
          })).filter((p) => p.titre)
        : [],
      rubric: Array.isArray(data.rubric)
        ? data.rubric.map((c) => ({
            criterion:   String(c.criterion || '').slice(0, 200),
            maxPoints:   Math.max(1, Math.min(20, Number(c.maxPoints) || 4)),
            descriptors: Array.isArray(c.descriptors)
              ? c.descriptors.map((d) => ({
                  level: Math.max(1, Math.min(5, Math.round(Number(d.level)))),
                  text:  String(d.text || '').slice(0, 500),
                })).filter((d) => Number.isFinite(d.level))
              : [],
          })).filter((c) => c.criterion).slice(0, 8)
        : getRubricTemplate(),
      suggestedOutcomes: Array.isArray(data.suggestedOutcomes) ? data.suggestedOutcomes.map((o) => String(o).slice(0, 300)).filter(Boolean).slice(0, 5) : [],
      source:    'ai-generated',
      createdBy: req.user.id,
      isPublic:  false,
    };

    // Persistance optionnelle
    if (save) {
      const created = await ProjectTemplate.create(sanitized);
      return res.status(201).json(created.toObject());
    }
    res.json(sanitized);
  } catch (err) {
    console.error('generateTemplate error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

export default { listTemplates, getTemplate, markTemplateUsed, generateTemplate };
