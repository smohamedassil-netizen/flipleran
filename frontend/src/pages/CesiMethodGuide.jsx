import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import {
  Lightbulb, Users, Search, Trophy, Mic, FileText, PenTool, ClipboardList,
  AlertTriangle, Quote, ArrowRight, Clock, BookOpen, GraduationCap,
} from 'lucide-react';

/**
 * CesiMethodGuide — Fiche pédagogique sur la méthodologie APP/CESI (Prosit).
 *
 * Page de référence à lire avant de réaliser son premier Prosit. Couvre :
 * définition, 3 phases (Aller / Recherche / Retour), 5 rôles tournants,
 * pièges courants, modalités d'évaluation (70% prof + 30% pairs), citations
 * académiques et appel à l'action.
 *
 * Accessible via la sidebar (étudiant et prof) et via un toast d'onboarding
 * lors de l'ouverture du premier Prosit.
 *
 * @see Lebrun, M. (2007). *Théories et méthodes pédagogiques pour
 *      enseigner et apprendre*. De Boeck.
 * @see Falchikov, N. (2005). *Improving Assessment through Student
 *      Involvement*. RoutledgeFalmer.
 */

/* ─── Couleurs sobres réutilisables ───────────────────────────────────────── */
const C = {
  primary:    '#1B4F72',
  primaryBg:  '#EBF3FA',
  accent:     '#D97706',
  accentBg:   '#FFFBEB',
  research:   '#9333EA',
  researchBg: '#F3E8FF',
  retour:     '#0F766E',
  retourBg:   '#CCFBF1',
  text:       '#1E293B',
  muted:      '#64748B',
  border:     '#E5E7EB',
  surface:    '#FFFFFF',
};

/* ─── Phase card ──────────────────────────────────────────────────────────── */
function PhaseCard({ Icon, color, bg, label, duration, body }) {
  return (
    <div style={{
      background: C.surface, borderRadius: 12,
      border: `1px solid ${C.border}`,
      borderTop: `4px solid ${color}`,
      padding: 18, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: bg, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={20} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.text }}>{label}</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Clock size={11} /> {duration}
        </p>
      </div>
      <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.6 }}>
        {body}
      </p>
    </div>
  );
}

/* ─── Role tile ───────────────────────────────────────────────────────────── */
function RoleTile({ Icon, name, body }) {
  return (
    <div style={{
      background: C.surface, borderRadius: 10,
      border: `1px solid ${C.border}`,
      padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 999,
        background: C.primaryBg, color: C.primary,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={16} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>{name}</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
          {body}
        </p>
      </div>
    </div>
  );
}

/* ─── Pitfall row ─────────────────────────────────────────────────────────── */
function Pitfall({ title, body }) {
  return (
    <div style={{
      padding: '10px 14px',
      background: '#FEF2F2',
      borderLeft: `3px solid #EF4444`,
      borderRadius: 6,
      marginBottom: 8,
    }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#991B1B' }}>
        🚫 {title}
      </p>
      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#7F1D1D', lineHeight: 1.5 }}>
        {body}
      </p>
    </div>
  );
}

/* ─── Citation ────────────────────────────────────────────────────────────── */
function Citation({ text, source }) {
  return (
    <div style={{
      padding: '12px 16px',
      background: C.primaryBg,
      borderLeft: `3px solid ${C.primary}`,
      borderRadius: 6,
      marginBottom: 10,
    }}>
      <p style={{ margin: 0, fontSize: 13, fontStyle: 'italic', color: C.text, lineHeight: 1.6 }}>
        <Quote size={13} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle', color: C.primary }} />
        « {text} »
      </p>
      <p style={{ margin: '6px 0 0', fontSize: 11, color: C.muted, fontWeight: 600 }}>
        — {source}
      </p>
    </div>
  );
}

/* ─── Section heading ─────────────────────────────────────────────────────── */
function SectionTitle({ children, subtitle }) {
  return (
    <div style={{ marginBottom: 14, marginTop: 28 }}>
      <h2 style={{
        margin: 0, fontSize: 18, fontWeight: 800, color: C.primary,
      }}>
        {children}
      </h2>
      {subtitle && (
        <p style={{ margin: '4px 0 0', fontSize: 13, color: C.muted }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* ─── Schéma SVG : rotation des rôles ─────────────────────────────────────── */
function RolesRotationSVG() {
  const roles = ['Animateur', 'Secrétaire', 'Scribe', 'Gestionnaire', 'Membre'];
  const cx = 110, cy = 110, r = 78;
  return (
    <svg
      viewBox="0 0 220 220"
      style={{ width: 220, height: 220, flexShrink: 0 }}
      role="img"
      aria-label="Rotation des 5 rôles CESI"
    >
      {/* Cercle de rotation */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.primary} strokeOpacity="0.15" strokeWidth="2" strokeDasharray="4 6" />

      {/* 5 rôles répartis sur le cercle */}
      {roles.map((label, i) => {
        const angle = (i * 2 * Math.PI) / roles.length - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        return (
          <g key={label}>
            <circle cx={x} cy={y} r={20} fill={C.primaryBg} stroke={C.primary} strokeWidth="1.5" />
            <text
              x={x} y={y + 3}
              textAnchor="middle"
              fontSize="9"
              fontWeight="700"
              fill={C.primary}
              fontFamily="inherit"
            >
              {label.slice(0, 6)}
            </text>
          </g>
        );
      })}

      {/* Flèches de rotation (petits arcs) */}
      {roles.map((_, i) => {
        const a1 = (i * 2 * Math.PI) / roles.length - Math.PI / 2 + 0.18;
        const a2 = ((i + 1) * 2 * Math.PI) / roles.length - Math.PI / 2 - 0.18;
        const x1 = cx + r * Math.cos(a1);
        const y1 = cy + r * Math.sin(a1);
        const x2 = cx + r * Math.cos(a2);
        const y2 = cy + r * Math.sin(a2);
        return (
          <path
            key={`arc-${i}`}
            d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
            fill="none"
            stroke={C.accent}
            strokeWidth="1.5"
            markerEnd="url(#arrow)"
            opacity="0.7"
          />
        );
      })}

      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 Z" fill={C.accent} />
        </marker>
      </defs>

      {/* Étoile centrale */}
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="22" fill={C.accent}>★</text>
    </svg>
  );
}

/* ─── Page principale ─────────────────────────────────────────────────────── */
export default function CesiMethodGuide() {
  const navigate = useNavigate();

  return (
    <Layout title="Méthode Prosit (APP/CESI)">
      <article style={{ maxWidth: 800, margin: '0 auto', padding: '4px 0 32px', color: C.text, fontSize: 14, lineHeight: 1.6 }}>

        {/* Header */}
        <header style={{ marginBottom: 18 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: C.primaryBg, color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GraduationCap size={22} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.primary }}>
                La méthode des Prosits
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: C.muted }}>
                Pédagogie APP/CESI · Apprentissage Par Problème · Méthode active · Travail collaboratif
              </p>
            </div>
          </div>
        </header>

        {/* 1. Qu'est-ce qu'un Prosit ? */}
        <SectionTitle subtitle="Comprendre la philosophie avant de se lancer">
          Qu'est-ce qu'un Prosit ?
        </SectionTitle>
        <p style={{ margin: 0 }}>
          Un <strong>Prosit</strong> est une situation problème ancrée dans un cas réel d'entreprise.
          Vous travaillez en groupe pour <strong>analyser</strong>, <strong>rechercher</strong>, et
          <strong> présenter</strong> une solution. C'est l'opposé du cours magistral : ce n'est pas
          le tuteur qui transmet du savoir, c'est vous qui le construisez ensemble en partant d'un
          problème concret.
        </p>

        {/* 2. Les 3 phases */}
        <SectionTitle subtitle="Le déroulé d'un Prosit, du jour J au passage devant le tuteur">
          Les 3 phases
        </SectionTitle>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12,
        }}>
          <PhaseCard
            Icon={Users}
            color={C.primary} bg={C.primaryBg}
            label="Phase Aller"
            duration="1 séance · 2 h"
            body="En groupe, vous découvrez l'énoncé. Vous identifiez les mots-clés, reformulez la problématique, posez vos hypothèses et planifiez vos recherches."
          />
          <PhaseCard
            Icon={Search}
            color={C.research} bg={C.researchBg}
            label="Phase Recherche"
            duration="5 à 7 jours · autonome"
            body="Chacun travaille seul. Vous documentez votre rôle, consultez des sources fiables, soumettez votre contribution écrite."
          />
          <PhaseCard
            Icon={Trophy}
            color={C.retour} bg={C.retourBg}
            label="Phase Retour"
            duration="1 séance · 2 h"
            body="Le groupe synthétise les contributions individuelles. Vous présentez votre solution au tuteur et défendez vos choix."
          />
        </div>

        {/* 3. Les 5 rôles tournants */}
        <SectionTitle subtitle="Chaque membre joue un rôle distinct, qui change à chaque Prosit">
          Les 5 rôles tournants
        </SectionTitle>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginBottom: 14 }}>
          <RolesRotationSVG />
          <div style={{ flex: 1, minWidth: 280, display: 'grid', gap: 8 }}>
            <RoleTile Icon={Mic}            name="Animateur"     body="Distribue la parole, garde le rythme, fait la synthèse en fin de séance." />
            <RoleTile Icon={FileText}       name="Secrétaire"    body="Prend le compte-rendu écrit (mots-clés, hypothèses, plan d'action)." />
            <RoleTile Icon={PenTool}        name="Scribe"        body="Met en forme la solution finale (mise en page, schémas, présentation)." />
            <RoleTile Icon={ClipboardList}  name="Gestionnaire"  body="Surveille les délais, vérifie que chacun a remis sa contribution, alerte sur les retards." />
            <RoleTile Icon={Lightbulb}      name="Membre"        body="Contribue à la recherche pure et au débat collectif (rôle ouvert)." />
          </div>
        </div>
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: C.accentBg, borderLeft: `3px solid ${C.accent}`,
          fontSize: 12, color: '#78350F', lineHeight: 1.6,
        }}>
          <strong>Rotation obligatoire.</strong> Les rôles tournent à chaque Prosit. Vous jouerez
          chacun des 5 rôles avant qu'un cycle ne recommence.
        </div>

        {/* 4. Pièges à éviter */}
        <SectionTitle subtitle="Les comportements qui plombent un groupe">
          Pièges à éviter
        </SectionTitle>
        <Pitfall
          title="Le passager clandestin"
          body="Si tu ne contribues pas, tes pairs te le rendront dans l'évaluation. Pas d'XP."
        />
        <Pitfall
          title="L'animateur dominant"
          body="Anime, ne décide pas à la place du groupe."
        />
        <Pitfall
          title="La recherche superficielle"
          body="Wikipédia ne suffit pas. Cherche des sources académiques, officielles, primaires."
        />
        <Pitfall
          title="Le bachotage final"
          body="La phase Retour ne s'improvise pas. Préparez-vous."
        />

        {/* 5. L'évaluation */}
        <SectionTitle subtitle="Comment ta note finale est calculée">
          L'évaluation
        </SectionTitle>
        <div style={{
          background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`,
          padding: 16, marginBottom: 12,
        }}>
          <div style={{ display: 'flex', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: C.muted }}>
                Note du tuteur
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 800, color: C.primary }}>70%</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted }}>Sur le travail du groupe</p>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: C.muted }}>
                Évaluation par les pairs
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 800, color: C.accent }}>30%</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted }}>Tes coéquipiers te notent (anonyme)</p>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: C.muted, fontWeight: 600 }}>
            Critères évalués par tes pairs :
          </p>
          <ul style={{ margin: '6px 0 8px 18px', padding: 0, fontSize: 13, color: C.text, lineHeight: 1.7 }}>
            <li>Participation aux séances</li>
            <li>Qualité de ta contribution écrite</li>
            <li>Esprit d'équipe et coopération</li>
            <li>Respect des délais internes</li>
            <li>Écoute des idées des autres</li>
          </ul>
          <p style={{ margin: 0, fontSize: 12, fontStyle: 'italic', color: C.muted }}>
            Tu noteras tes coéquipiers à la fin du Prosit. Sois honnête : c'est anonyme.
          </p>
        </div>

        {/* 6. Pourquoi ça marche */}
        <SectionTitle subtitle="Les fondements théoriques de la méthode">
          Pourquoi ça marche
        </SectionTitle>
        <Citation
          text="L'apprentissage actif n'est pas une option, c'est la seule manière d'apprendre durablement."
          source="Marcel Lebrun (2007), Théories et méthodes pédagogiques"
        />
        <Citation
          text="L'étudiant apprend en faisant, pas en écoutant."
          source="Méthodologie pédagogique CESI"
        />
        <Citation
          text="L'évaluation par les pairs, conduite avec rigueur, augmente la fiabilité de l'évaluation collaborative et constitue un puissant levier d'apprentissage métacognitif."
          source="Falchikov, N. (2005), Improving Assessment through Student Involvement"
        />

        {/* 7. CTA */}
        <div style={{
          marginTop: 32,
          padding: 20,
          background: `linear-gradient(135deg, ${C.primaryBg}, #FFFBEB)`,
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          textAlign: 'center',
        }}>
          <p style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: C.primary }}>
            Prêt à passer à la pratique ?
          </p>
          <button
            type="button"
            onClick={() => navigate('/prosits')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 22px', borderRadius: 10,
              background: `linear-gradient(135deg, ${C.primary}, #2874A6)`,
              color: 'white', border: 'none',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(27,79,114,0.25)',
            }}
          >
            <BookOpen size={15} /> Je suis prêt, lancer mon premier Prosit
            <ArrowRight size={15} />
          </button>
        </div>

      </article>
    </Layout>
  );
}
