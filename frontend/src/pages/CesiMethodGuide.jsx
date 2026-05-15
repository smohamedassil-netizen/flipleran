import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import {
  Users, FileText, PenTool, Mic, User as UserIcon, FlaskConical,
  Quote, ArrowRight, Clock, BookOpen, GraduationCap, CheckCircle, Award,
} from 'lucide-react';

/**
 * CesiMethodGuide — Fiche pédagogique sur la méthode des Cas pratiques.
 *
 * Décrit l'implémentation FlipLearn (post-refonte mai 2026) :
 *   - 3 phases : Cadrage / Travail individuel / Bilan
 *   - 3 rôles tournants : Animateur / Scribe / Membre
 *   - 1 cas pratique = 1 groupe
 *   - Énoncé + ressources fournis par le professeur
 *   - Notation : individuelle (livrable) + collective (documents du groupe)
 *
 * Inspiré de la méthodologie APP/CESI traditionnelle (5 rôles, phases Aller/Recherche/Retour)
 * mais simplifié pour usage en université algérienne, où les promotions sont plus grandes
 * et l'encadrement par tuteur n'est pas toujours disponible.
 *
 * @see Lebrun, M. (2007). *Théories et méthodes pédagogiques pour enseigner et apprendre*.
 * @see Falchikov, N. (2005). *Improving Assessment through Student Involvement*.
 */

/* ─── Couleurs sobres ─────────────────────────────────────────────────────── */
const C = {
  primary:    '#1B4F72',
  primaryBg:  '#EBF3FA',
  accent:     '#D97706',
  accentBg:   '#FFFBEB',
  phase1:     '#1B4F72',
  phase1Bg:   '#DBEAFE',
  phase2:     '#9333EA',
  phase2Bg:   '#F3E8FF',
  phase3:     '#D97706',
  phase3Bg:   '#FEF3C7',
  text:       '#1E293B',
  muted:      '#64748B',
  border:     '#E5E7EB',
  surface:    '#FFFFFF',
};

/* ─── Phase card ──────────────────────────────────────────────────────────── */
function PhaseCard({ step, Icon, color, bg, label, duration, body }) {
  return (
    <div style={{
      background: C.surface, borderRadius: 12,
      border: `1px solid ${C.border}`,
      borderTop: `4px solid ${color}`,
      padding: 18, display: 'flex', flexDirection: 'column', gap: 10,
      position: 'relative',
    }}>
      <span style={{
        position: 'absolute', top: 12, right: 14,
        fontSize: 11, fontWeight: 700, color: C.muted,
        background: '#F8FAFC', padding: '2px 8px', borderRadius: 999,
      }}>Étape {step}</span>
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
function RoleTile({ Icon, name, color, body }) {
  return (
    <div style={{
      background: C.surface, borderRadius: 10,
      border: `1px solid ${C.border}`,
      padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 999,
        background: `${color}15`, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={18} />
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
        {title}
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

/* ─── Workflow horizontal SVG ─────────────────────────────────────────────── */
function WorkflowSVG() {
  return (
    <svg
      viewBox="0 0 720 80"
      style={{ width: '100%', maxWidth: 720, height: 'auto' }}
      role="img"
      aria-label="Workflow des 3 phases du Cas pratique"
    >
      {/* Étape 1 : Cadrage */}
      <circle cx="80" cy="40" r="26" fill={C.phase1Bg} stroke={C.phase1} strokeWidth="2" />
      <text x="80" y="46" textAnchor="middle" fontSize="13" fontWeight="800" fill={C.phase1}>1</text>
      <text x="80" y="78" textAnchor="middle" fontSize="11" fontWeight="600" fill={C.text}>Cadrage</text>

      {/* Flèche 1 -> 2 */}
      <line x1="115" y1="40" x2="305" y2="40" stroke={C.muted} strokeWidth="1.5" strokeDasharray="4 4" />
      <polygon points="305,36 313,40 305,44" fill={C.muted} />

      {/* Étape 2 : Travail individuel */}
      <circle cx="360" cy="40" r="26" fill={C.phase2Bg} stroke={C.phase2} strokeWidth="2" />
      <text x="360" y="46" textAnchor="middle" fontSize="13" fontWeight="800" fill={C.phase2}>2</text>
      <text x="360" y="78" textAnchor="middle" fontSize="11" fontWeight="600" fill={C.text}>Travail individuel</text>

      {/* Flèche 2 -> 3 */}
      <line x1="395" y1="40" x2="585" y2="40" stroke={C.muted} strokeWidth="1.5" strokeDasharray="4 4" />
      <polygon points="585,36 593,40 585,44" fill={C.muted} />

      {/* Étape 3 : Bilan */}
      <circle cx="640" cy="40" r="26" fill={C.phase3Bg} stroke={C.phase3} strokeWidth="2" />
      <text x="640" y="46" textAnchor="middle" fontSize="13" fontWeight="800" fill={C.phase3}>3</text>
      <text x="640" y="78" textAnchor="middle" fontSize="11" fontWeight="600" fill={C.text}>Bilan</text>
    </svg>
  );
}

/* ─── Page principale ─────────────────────────────────────────────────────── */
export default function CesiMethodGuide() {
  const navigate = useNavigate();

  return (
    <Layout title="Méthode Cas pratique">
      <article style={{ maxWidth: 800, margin: '0 auto', padding: '4px 0 32px', color: C.text, fontSize: 14, lineHeight: 1.6 }}>

        {/* Header */}
        <header style={{ marginBottom: 18 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: C.primaryBg, color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FlaskConical size={22} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.primary }}>
                La méthode des Cas pratiques
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: C.muted }}>
                Pédagogie active · Apprentissage Par Problème · Travail collaboratif structuré
              </p>
            </div>
          </div>
        </header>

        {/* Lignée pédagogique */}
        <aside style={{
          padding: '14px 16px', marginBottom: 18,
          background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 10,
          fontSize: 13, color: '#0C4A6E', lineHeight: 1.6,
        }}>
          <strong>D'où vient cette méthode ?</strong> Le Cas pratique FlipLearn s'inspire de
          la méthodologie <em>Apprentissage Par Problème</em> (APP) développée à l'école CESI,
          elle-même fondée sur les travaux de Marcel Lebrun sur la pédagogie active. La version
          FlipLearn est <strong>simplifiée pour les promotions universitaires algériennes</strong> :
          3 rôles au lieu de 5, 3 phases compactes, et un encadrement par le professeur (qui valide
          chaque étape) plutôt que par un tuteur dédié.
        </aside>

        {/* 1. Qu'est-ce qu'un Cas pratique ? */}
        <SectionTitle subtitle="Comprendre la philosophie avant de se lancer">
          Qu'est-ce qu'un Cas pratique ?
        </SectionTitle>
        <p style={{ margin: 0 }}>
          Un <strong>Cas pratique</strong> est une situation-problème ancrée dans un cas réel
          (entreprise, projet, contexte algérien). Vous travaillez <strong>en groupe</strong> pour
          analyser l'énoncé, exploiter les ressources documentaires fournies par le professeur,
          et produire <strong>un livrable individuel chacun</strong> + <strong>des documents
          collectifs</strong> de synthèse.
        </p>
        <p style={{ margin: '10px 0 0' }}>
          C'est l'opposé du cours magistral : ce n'est pas le professeur qui transmet du savoir,
          c'est vous qui le construisez à partir d'un problème concret. Le professeur valide chaque
          phase et note à la fin.
        </p>

        {/* 2. Workflow en 3 phases */}
        <SectionTitle subtitle="Le déroulé d'un Cas pratique, du jour J au passage devant le professeur">
          Les 3 phases
        </SectionTitle>

        <div style={{ margin: '0 0 18px', display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
          <WorkflowSVG />
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12,
        }}>
          <PhaseCard
            step={1}
            Icon={Users}
            color={C.phase1} bg={C.phase1Bg}
            label="Cadrage"
            duration="1 séance · ~1 h"
            body="En groupe, vous découvrez l'énoncé et les ressources fournies. Vous identifiez le problème, vous répartissez les sous-questions, et chaque membre prend son rôle pour cette session."
          />
          <PhaseCard
            step={2}
            Icon={PenTool}
            color={C.phase2} bg={C.phase2Bg}
            label="Travail individuel"
            duration="3 à 7 jours · autonome"
            body="Chacun produit SON livrable personnel (analyse, proposition, document écrit) en exploitant les ressources et en allant chercher d'autres sources. Le scribe consolide les notes du groupe en parallèle."
          />
          <PhaseCard
            step={3}
            Icon={CheckCircle}
            color={C.phase3} bg={C.phase3Bg}
            label="Bilan"
            duration="1 séance · ~1 h"
            body="Le groupe se réunit pour comparer les livrables, identifier les convergences et défendre les choix divergents. Vous présentez la synthèse au professeur, qui évalue."
          />
        </div>

        {/* 3. Les 3 rôles */}
        <SectionTitle subtitle="Chaque membre joue un rôle distinct, qui change au prochain Cas pratique">
          Les 3 rôles tournants
        </SectionTitle>
        <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
          <RoleTile
            Icon={Mic}
            name="Animateur"
            color="#9333EA"
            body="Lance la séance de cadrage et de bilan, distribue la parole, garde le rythme, synthétise les décisions du groupe."
          />
          <RoleTile
            Icon={PenTool}
            name="Scribe"
            color="#10B981"
            body="Tient le compte-rendu écrit pendant les séances, consolide les documents collectifs (mots-clés, plan d'action, conclusions)."
          />
          <RoleTile
            Icon={UserIcon}
            name="Membre"
            color="#64748B"
            body="Participe pleinement aux discussions, produit son livrable individuel, contribue aux documents collectifs."
          />
        </div>
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: C.accentBg, borderLeft: `3px solid ${C.accent}`,
          fontSize: 12, color: '#78350F', lineHeight: 1.6,
        }}>
          <strong>Rotation entre cas pratiques.</strong> Tu joueras chaque rôle au cours de l'année.
          Tous les membres produisent leur propre livrable individuel — le rôle change la responsabilité
          d'animation, pas la quantité de travail.
        </div>

        {/* 4. Ce que tu produis */}
        <SectionTitle subtitle="Les deux types de production demandés">
          Ce que tu rends
        </SectionTitle>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12,
        }}>
          <div style={{
            padding: 14, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
          }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>
              📄 Livrable individuel <span style={{ color: C.muted, fontWeight: 400 }}>(obligatoire)</span>
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
              Ta production personnelle : un document (PDF ou texte) qui répond à la problématique.
              <strong style={{ color: C.text }}> Chaque membre rend le sien.</strong> C'est ce qui pèse
              le plus dans ta note finale.
            </p>
          </div>
          <div style={{
            padding: 14, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
          }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>
              📚 Documents collectifs <span style={{ color: C.muted, fontWeight: 400 }}>(groupe)</span>
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
              Compte-rendu de cadrage, synthèse de bilan, schémas partagés. Consolidés par le scribe.
              Note collective qui s'applique à tout le groupe.
            </p>
          </div>
        </div>

        {/* 5. Évaluation */}
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
                Note individuelle
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 800, color: C.primary }}>Ton livrable</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted }}>Notée par le professeur</p>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: C.muted }}>
                Note collective
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 800, color: C.accent }}>Documents du groupe</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted }}>Identique pour tous les membres</p>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: C.muted, fontStyle: 'italic' }}>
            Le professeur attribue les deux notes en fin de phase Bilan. Le poids exact dépend du cours.
          </p>
        </div>

        {/* 6. Pièges */}
        <SectionTitle subtitle="Les comportements qui plombent un groupe">
          Pièges à éviter
        </SectionTitle>
        <Pitfall
          title="Le passager clandestin"
          body="Compter sur les autres pour produire ton livrable. Tu seras noté individuellement — pas d'esquive possible."
        />
        <Pitfall
          title="L'animateur dominant"
          body="Anime, mais ne décide pas à la place du groupe. Ton rôle est de distribuer la parole, pas de monopoliser."
        />
        <Pitfall
          title="La recherche superficielle"
          body="Wikipédia ne suffit pas. Les ressources fournies sont un point de départ — cherche des sources académiques, officielles, ou primaires."
        />
        <Pitfall
          title="Le bilan improvisé"
          body="Si chacun découvre le livrable des autres pendant la phase Bilan, ça part dans tous les sens. Coordonnez-vous avant."
        />
        <Pitfall
          title="Le scribe fantôme"
          body="Si le scribe ne consolide pas les documents collectifs, toute la note collective en souffre. Le scribe doit livrer."
        />

        {/* 7. Pourquoi ça marche */}
        <SectionTitle subtitle="Les fondements théoriques de la méthode">
          Pourquoi ça marche
        </SectionTitle>
        <Citation
          text="L'apprentissage actif n'est pas une option, c'est la seule manière d'apprendre durablement."
          source="Marcel Lebrun (2007), Théories et méthodes pédagogiques"
        />
        <Citation
          text="N'attendez pas que les étudiants disent qu'ils ont compris : faites-leur démontrer qu'ils ont compris."
          source="Eric Mazur (1997), Peer Instruction, Harvard"
        />
        <Citation
          text="L'étudiant apprend en faisant, pas en écoutant."
          source="Méthodologie pédagogique APP/CESI"
        />

        {/* 8. CTA */}
        <div style={{
          marginTop: 32,
          padding: 20,
          background: `linear-gradient(135deg, ${C.primaryBg}, ${C.accentBg})`,
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          textAlign: 'center',
        }}>
          <p style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: C.primary }}>
            Prêt à passer à la pratique ?
          </p>
          <button
            type="button"
            onClick={() => navigate('/cas-pratiques')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 22px', borderRadius: 10,
              background: `linear-gradient(135deg, ${C.primary}, #2874A6)`,
              color: 'white', border: 'none',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(27,79,114,0.25)',
            }}
          >
            <FlaskConical size={15} /> Voir mes Cas pratiques
            <ArrowRight size={15} />
          </button>
        </div>

      </article>
    </Layout>
  );
}
