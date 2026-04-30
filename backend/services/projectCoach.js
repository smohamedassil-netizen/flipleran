import Groq from 'groq-sdk';
import Prosit from '../models/Prosit.js';
import Project from '../models/Project.js';
import User from '../models/User.js';

/**
 * projectCoach — Coach IA anti-blocage pour Prosits (méthode CESI/APP) et
 * Projets (PBL).
 *
 * Cadre théorique :
 * @see Vygotsky (1978). *Mind in Society*. Zone Proximale de Développement —
 *      le coach intervient au bon moment, ni trop tôt (l'étudiant n'a pas
 *      buté), ni trop tard (l'étudiant a abandonné).
 * @see Bandura (1977). *Social Learning Theory*. Sentiment d'auto-efficacité
 *      — les suggestions sont actionnables et réalistes en 30 min, pour
 *      restaurer la confiance plutôt que d'écraser.
 * @see Mazur (1997). *Peer Instruction*. Méthode socratique : on guide par
 *      questions, on ne donne JAMAIS la réponse directe.
 * @see Schön (1983). *The Reflective Practitioner*. La review constructive
 *      (1 force / 1 faiblesse / 1 amélioration) est un prompt à la réflexion
 *      sur sa propre pratique.
 *
 * Décisions de design :
 *  - API agnostique : fonctions acceptent `{ kind: 'prosit'|'project', id, userId }`
 *    pour éviter la duplication entre prositCoachController et projectCoachController.
 *  - Détection de blockage SANS Groq (heuristiques pures) — gratuit, instantané.
 *    Les fonctions de génération (suggestions/review/sources) appellent Groq.
 *  - Pas de stockage du blockage en DB : c'est une lecture en live à chaque
 *    appel. Évite la dérive entre état réel et état caché.
 */

const MODEL = 'llama-3.3-70b-versatile';

let groqClient;
function getGroq() {
  if (!groqClient) groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groqClient;
}

async function callGroqJSON(systemPrompt, userPrompt, { temperature = 0.6, maxTokens = 1500 } = {}) {
  const completion = await getGroq().chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
    temperature,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
  });
  const content = completion.choices?.[0]?.message?.content || '{}';
  return JSON.parse(content);
}

/* ─────────────────────────────────────────────────────────────────────────
   HELPERS — récupération du contexte unifié
───────────────────────────────────────────────────────────────────────── */

/**
 * Charge l'entité (Prosit ou Project), vérifie que l'utilisateur en est
 * bien membre, et retourne un objet contexte uniforme :
 * { kind, entity, member, contributionText, contributionAt, deadline, isActive }
 */
async function loadContext({ kind, id, userId }) {
  if (kind === 'prosit') {
    const prosit = await Prosit.findById(id).lean();
    if (!prosit) return { error: 'prosit-not-found' };

    let member = null;
    let groupe = null;
    for (const g of prosit.groupes || []) {
      const m = (g.membres || []).find((mm) => String(mm.userId) === String(userId));
      if (m) { member = m; groupe = g; break; }
    }
    if (!member) return { error: 'not-a-member' };

    return {
      kind: 'prosit',
      entity: prosit,
      groupe,
      member,
      contributionText: member.contributionTexte || '',
      contributionAt: member.contributionAt,
      role: member.role,
      deadline: prosit.dateRetour,
      startDate: prosit.dateAller,
      isActive: ['recherche', 'aller'].includes(prosit.status),
      titre: prosit.titre,
      enonce: prosit.enonce,
      motsCles: prosit.motsCles,
      filiere: prosit.filiere,
      promotion: prosit.promotion,
    };
  }

  if (kind === 'project') {
    const project = await Project.findById(id).lean();
    if (!project) return { error: 'project-not-found' };

    let member = null;
    let groupe = null;
    for (const g of project.groupes || []) {
      const m = (g.membres || []).find((mm) => String(mm.userId) === String(userId));
      if (m) { member = m; groupe = g; break; }
    }
    if (!member) return { error: 'not-a-member' };

    // Pour un projet, la "contribution" = livrable(s) déposé(s) par l'étudiant
    const myLivrables = (project.livrables || []).filter((l) => String(l.uploadedBy) === String(userId));
    const lastLivrable = myLivrables.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];

    // Phase active = phase 'en_cours' ou prochaine phase 'a_faire' avec dateDebut <= now
    const now = new Date();
    const activePhase = (project.phases || []).find((p) =>
      p.statut === 'en_cours' || (p.statut === 'a_faire' && p.dateDebut && new Date(p.dateDebut) <= now)
    );

    return {
      kind: 'project',
      entity: project,
      groupe,
      member,
      myLivrables,
      lastLivrable,
      activePhase,
      contributionText: '', // pas applicable, mais on garde le champ pour l'API uniforme
      contributionAt: lastLivrable?.uploadedAt || null,
      role: member.role,
      deadline: project.dateFin,
      startDate: project.dateDebut,
      isActive: project.status === 'actif',
      titre: project.titre,
      enonce: project.enonce || '',
      motsCles: project.motsCles || [],
      filiere: '',
      promotion: '',
    };
  }

  return { error: 'invalid-kind' };
}

/* ─────────────────────────────────────────────────────────────────────────
   1) detectBlockage — heuristiques sans appel IA (gratuit, instantané)
───────────────────────────────────────────────────────────────────────── */

const BLOCKAGE_THRESHOLD_HOURS_INACTIVE = 48;
const BLOCKAGE_THRESHOLD_HOURS_BLANK_PAGE = 24;
const MIN_WORDS_CONTRIBUTION = 50;

function countWords(s) {
  return String(s || '').trim().split(/\s+/).filter(Boolean).length;
}

function hoursBetween(a, b) {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 36e5;
}

/**
 * Détecte le blockage d'un membre sur un Prosit / Projet.
 * Symptoms possibles :
 *  - 'fear-blank-page' : 0 caractère après 24h d'activation
 *  - 'no-contribution' : aucune contribution / livrable du tout (Prosit/Projet)
 *  - 'short-contribution' : contribution < 50 mots (Prosit)
 *  - 'inactivity-48h' : pas de save dans les 48h (Prosit), pas de livrable
 *    dans les 48h alors que la phase active s'achève bientôt (Project)
 *  - 'phase-deadline-near' : phase active expire dans <48h sans livrable (Project)
 *
 * Severity :
 *  - low    : 1 symptôme léger (short-contribution sans inactivité)
 *  - medium : 2 symptômes OU inactivité 48h
 *  - high   : 3+ symptômes OU phase-deadline-near + no-contribution
 */
export async function detectBlockage({ kind, id, userId }) {
  const ctx = await loadContext({ kind, id, userId });
  if (ctx.error) return { error: ctx.error, isBlocked: false };

  if (!ctx.isActive) {
    return {
      isBlocked: false,
      severity: 'none',
      symptoms: [],
      note: ctx.kind === 'prosit'
        ? `Prosit en statut "${ctx.entity.status}" — coach inactif hors phase aller/recherche.`
        : `Projet en statut "${ctx.entity.status}" — coach inactif.`,
    };
  }

  const symptoms = [];
  const now = new Date();

  if (ctx.kind === 'prosit') {
    const wc = countWords(ctx.contributionText);
    const startedAt = ctx.startDate ? new Date(ctx.startDate) : null;

    if (wc === 0) {
      symptoms.push('no-contribution');
      if (startedAt && hoursBetween(now, startedAt) >= BLOCKAGE_THRESHOLD_HOURS_BLANK_PAGE) {
        symptoms.push('fear-blank-page');
      }
    } else if (wc < MIN_WORDS_CONTRIBUTION) {
      symptoms.push('short-contribution');
    }

    if (ctx.contributionAt) {
      if (hoursBetween(now, ctx.contributionAt) >= BLOCKAGE_THRESHOLD_HOURS_INACTIVE) {
        symptoms.push('inactivity-48h');
      }
    }
  }

  if (ctx.kind === 'project') {
    const livCount = ctx.myLivrables.length;
    const startedAt = ctx.startDate ? new Date(ctx.startDate) : null;

    if (livCount === 0) {
      symptoms.push('no-contribution');
      if (startedAt && hoursBetween(now, startedAt) >= BLOCKAGE_THRESHOLD_HOURS_BLANK_PAGE) {
        symptoms.push('fear-blank-page');
      }
    } else if (ctx.lastLivrable && hoursBetween(now, ctx.lastLivrable.uploadedAt) >= BLOCKAGE_THRESHOLD_HOURS_INACTIVE) {
      symptoms.push('inactivity-48h');
    }

    // Phase active dont la deadline arrive dans <48h sans livrable
    if (ctx.activePhase?.dateFin) {
      const hoursLeft = (new Date(ctx.activePhase.dateFin).getTime() - now.getTime()) / 36e5;
      if (hoursLeft >= 0 && hoursLeft <= 48 && livCount === 0) {
        symptoms.push('phase-deadline-near');
      }
    }
  }

  // Calcul de la severity
  let severity = 'none';
  if (symptoms.length >= 3 || (symptoms.includes('phase-deadline-near') && symptoms.includes('no-contribution'))) {
    severity = 'high';
  } else if (symptoms.includes('inactivity-48h') || symptoms.length === 2) {
    severity = 'medium';
  } else if (symptoms.length === 1) {
    severity = symptoms[0] === 'short-contribution' ? 'low' : 'medium';
  }

  return {
    isBlocked: severity !== 'none',
    severity,
    symptoms,
    contextSummary: {
      role: ctx.role,
      wordsInContribution: ctx.kind === 'prosit' ? countWords(ctx.contributionText) : null,
      livrablesCount: ctx.kind === 'project' ? ctx.myLivrables.length : null,
      lastActivityAt: ctx.contributionAt,
      deadline: ctx.deadline,
    },
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   2) suggestNextStep — 3 prochaines étapes concrètes via Groq (socratique)
───────────────────────────────────────────────────────────────────────── */

/**
 * Génère 3 micro-tâches actionnables en ~30 min chacune. Méthode socratique :
 * jamais de réponse directe, des questions qui débloquent.
 */
export async function suggestNextStep({ kind, id, userId, userPrenom }) {
  const ctx = await loadContext({ kind, id, userId });
  if (ctx.error) return { error: ctx.error };

  const sys = `Tu es un coach pédagogique pour étudiants L3 en Algérie. Tu appliques :
- Vygotsky (Zone Proximale de Développement) : suggestions juste au-dessus du niveau actuel.
- Bandura (auto-efficacité) : actions réalisables en 30 min, restaurer la confiance.
- Mazur (peer instruction) : guide par questions ouvertes, JAMAIS de solution clé en main.

RÈGLES STRICTES :
- 3 prochaines étapes, pas plus.
- Chaque action commence par un VERBE D'ACTION CONCRET ("Identifie", "Liste", "Reformule"...).
- expectedTime entre 15 et 45 minutes.
- hint = une QUESTION qui débloque, pas une réponse.
- En français, ton bienveillant.
- Format JSON strict : { "steps": [{ "action": "...", "expectedTime": 30, "hint": "...?" }] }`;

  const ctxBlock = ctx.kind === 'prosit'
    ? `Prosit : "${ctx.titre}"
Énoncé : "${(ctx.enonce || '').slice(0, 800)}"
Mots-clés : ${(ctx.motsCles || []).join(', ')}
Rôle de l'étudiant dans le groupe : ${ctx.role}
Sa contribution actuelle (extrait) : "${(ctx.contributionText || '').slice(0, 500) || '— rien encore écrit —'}"
Phase actuelle : ${ctx.entity.status}`
    : `Projet : "${ctx.titre}"
Énoncé : "${(ctx.enonce || '').slice(0, 800)}"
Mots-clés : ${(ctx.motsCles || []).join(', ')}
Rôle de l'étudiant : ${ctx.role}
Phase active : ${ctx.activePhase?.titre || '—'} (${ctx.activePhase?.statut || '—'})
Livrables déjà déposés par lui : ${ctx.myLivrables.length}`;

  const usr = `Étudiant : ${userPrenom || 'cet étudiant'}.
${ctxBlock}

Suggère 3 prochaines étapes concrètes pour avancer maintenant.`;

  const data = await callGroqJSON(sys, usr, { temperature: 0.7, maxTokens: 1200 });
  const raw = Array.isArray(data?.steps) ? data.steps : [];

  return {
    steps: raw
      .filter((s) => s && typeof s.action === 'string')
      .map((s) => ({
        action: String(s.action).trim().slice(0, 300),
        expectedTime: Math.max(5, Math.min(60, Math.round(Number(s.expectedTime) || 30))),
        hint: String(s.hint || '').trim().slice(0, 400),
      }))
      .slice(0, 3),
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   3) reviewContribution — coaching constructif (1 force, 1 faiblesse, 1 amélio)
───────────────────────────────────────────────────────────────────────── */

/**
 * Donne 3 retours constructifs en mode coaching. Pas de note, pas de jugement.
 * Inspiré du modèle "Sandwich" (positive → critique → positive).
 *
 * Rejette si la contribution est < 50 mots (rien à reviewer sérieusement).
 */
export async function reviewContribution({ kind, id, userId, userPrenom }) {
  const ctx = await loadContext({ kind, id, userId });
  if (ctx.error) return { error: ctx.error };

  // Pour un projet, on ne review pas — pas de texte contributif individuel
  if (ctx.kind !== 'prosit') {
    return { error: 'review-only-for-prosit', message: 'La review est uniquement disponible pour les contributions Prosit.' };
  }

  const wc = countWords(ctx.contributionText);
  if (wc < MIN_WORDS_CONTRIBUTION) {
    return {
      error: 'too-short',
      message: `Ta contribution fait ${wc} mots — il faut au moins ${MIN_WORDS_CONTRIBUTION} mots pour une review utile. Continue à écrire et reviens !`,
      wordsCount: wc,
      minWords: MIN_WORDS_CONTRIBUTION,
    };
  }

  const sys = `Tu es un coach pédagogique bienveillant. Tu donnes 3 retours sur la contribution d'un étudiant L3 :
- 1 FORCE : ce qui est bien (sois précis, pas générique).
- 1 FAIBLESSE : ce qui mérite d'être renforcé (factuel, jamais personnel).
- 1 AMÉLIORATION concrète : action précise, faisable en 20 min.

RÈGLES STRICTES :
- En français, ton bienveillant, JAMAIS jugeant.
- AUCUNE note, AUCUN score, AUCUN classement.
- Pas de paraphrase de la contribution.
- Reste sur le contenu (pas la forme grammaticale, sauf si vraiment problématique).
- Format JSON strict : { "force": "...", "faiblesse": "...", "amelioration": "..." }`;

  const usr = `Étudiant : ${userPrenom || 'l\'étudiant'}.
Sujet du Prosit : "${ctx.titre}"
Énoncé : "${(ctx.enonce || '').slice(0, 600)}"
Sa contribution :
"""
${(ctx.contributionText || '').slice(0, 4000)}
"""

Donne 3 retours constructifs.`;

  const data = await callGroqJSON(sys, usr, { temperature: 0.5, maxTokens: 1000 });

  return {
    force:        String(data?.force || '').trim().slice(0, 800),
    faiblesse:    String(data?.faiblesse || '').trim().slice(0, 800),
    amelioration: String(data?.amelioration || '').trim().slice(0, 800),
    wordsCount:   wc,
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   4) suggestSources — 3 sources fiables (livre / article / doc officielle)
───────────────────────────────────────────────────────────────────────── */

/**
 * Suggère 3 types de sources fiables sur le sujet du Prosit/Projet. Pas de
 * lien direct (l'IA hallucine les URLs), mais des références CRÉDIBLES qu'un
 * étudiant peut chercher : titre + auteur + raison de pertinence.
 */
export async function suggestSources({ kind, id, userId }) {
  const ctx = await loadContext({ kind, id, userId });
  if (ctx.error) return { error: ctx.error };

  const sys = `Tu es un bibliothécaire universitaire. Suggère 3 sources fiables pour un étudiant L3 ISIL en Algérie :
1. UN LIVRE académique de référence (auteur reconnu, idéalement traduit en français ou anglais accessible).
2. UN ARTICLE scientifique récent (2020-2025), revue à comité de lecture.
3. UNE DOCUMENTATION officielle (W3C, RFC, OWASP, MDN, vendor docs, etc.) — privilégie les sources gratuites accessibles depuis l'Algérie.

RÈGLES STRICTES :
- AUCUN URL inventé : pas de http://... dans la réponse.
- Mentionne titre + auteur(s) + année + raison de pertinence (1 phrase).
- En français.
- Format JSON strict : { "sources": [{ "type": "livre|article|documentation", "titre": "...", "auteur": "...", "annee": "...", "why": "..." }] }`;

  const usr = `Sujet : "${ctx.titre}"
Énoncé : "${(ctx.enonce || '').slice(0, 600)}"
Mots-clés : ${(ctx.motsCles || []).join(', ')}
Niveau : L3 ${ctx.filiere || ''} ${ctx.promotion || ''}, contexte algérien.

Suggère 3 sources de qualité.`;

  const data = await callGroqJSON(sys, usr, { temperature: 0.4, maxTokens: 1200 });
  const raw = Array.isArray(data?.sources) ? data.sources : [];

  return {
    sources: raw
      .filter((s) => s && typeof s.titre === 'string')
      .map((s) => ({
        type:   ['livre', 'article', 'documentation'].includes(s.type) ? s.type : 'documentation',
        titre:  String(s.titre).trim().slice(0, 300),
        auteur: String(s.auteur || '').trim().slice(0, 200),
        annee:  String(s.annee || '').trim().slice(0, 10),
        why:    String(s.why || '').trim().slice(0, 400),
      }))
      .slice(0, 3),
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   5) Cron helper — détecte tous les blockages high pour notif proactive
───────────────────────────────────────────────────────────────────────── */

/**
 * Pour chaque Prosit en phase 'aller'/'recherche' et chaque Projet 'actif',
 * détecte les membres en blockage severity 'high'. Retourne la liste des
 * { userId, kind, id, titre, severity, symptoms } pour notification.
 *
 * Utilisé par notificationScheduler — cron quotidien 18h.
 */
export async function getStudentsBlockedHigh() {
  const result = [];

  // Prosits actifs
  const prosits = await Prosit.find({ status: { $in: ['aller', 'recherche'] } })
    .select('_id titre groupes status dateAller dateRetour')
    .lean();
  for (const p of prosits) {
    const memberIds = new Set();
    for (const g of p.groupes || []) {
      for (const m of g.membres || []) memberIds.add(String(m.userId));
    }
    for (const uid of memberIds) {
      const detection = await detectBlockage({ kind: 'prosit', id: p._id, userId: uid });
      if (detection.severity === 'high') {
        result.push({
          userId: uid, kind: 'prosit', id: p._id, titre: p.titre,
          severity: detection.severity, symptoms: detection.symptoms,
          link: `/prosits/${p._id}`,
        });
      }
    }
  }

  // Projets actifs
  const projects = await Project.find({ status: 'actif' })
    .select('_id titre groupes status dateDebut dateFin phases livrables')
    .lean();
  for (const proj of projects) {
    const memberIds = new Set();
    for (const g of proj.groupes || []) {
      for (const m of g.membres || []) memberIds.add(String(m.userId));
    }
    for (const uid of memberIds) {
      const detection = await detectBlockage({ kind: 'project', id: proj._id, userId: uid });
      if (detection.severity === 'high') {
        result.push({
          userId: uid, kind: 'project', id: proj._id, titre: proj.titre,
          severity: detection.severity, symptoms: detection.symptoms,
          link: `/projects/${proj._id}`,
        });
      }
    }
  }

  return result;
}

export default {
  detectBlockage,
  suggestNextStep,
  reviewContribution,
  suggestSources,
  getStudentsBlockedHigh,
};
