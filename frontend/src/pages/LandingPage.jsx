import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import {
  ArrowRight, Sparkles, Users, Video, Bot, Layers, Trophy, Gift,
  BarChart3, Lightbulb, FileText, Award, Target,
  Brain, Briefcase, Calculator, Quote, Wifi, MapPin, Clock,
  BookOpen, GraduationCap, Compass, Repeat, ChevronRight,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   LandingPage — Page publique (route /welcome).
   Refonte 12/05/2026 : structure pédagogique inspirée de Marcel Lebrun.
   Pourquoi pédagogique avant comment technologique.
   Référentiels : Bergmann & Sams 2012, Lebrun 2014, Mazur 1997, Wozniak 1990.
   ───────────────────────────────────────────────────────────────────────── */

/* ── Palette resserrée ── */
const C = {
  ink: '#0F172A',
  inkSoft: '#1E293B',
  primary: '#1B4F72',
  primaryDark: '#0F3A5E',
  primarySoft: '#EBF3FA',
  accent: '#B45309',
  accentSoft: '#FEF3C7',
  muted: '#475569',
  mutedLight: '#64748B',
  border: '#E2E8F0',
  borderSoft: '#F1F5F9',
  surface: '#FFFFFF',
  bg: '#FAFBFC',
};

/* ── Citations en bandeau rotatif (chercheurs référents) ── */
const QUOTES = [
  {
    text: "Inverser la classe, ce n'est pas regarder une vidéo à la maison. C'est libérer le temps de présentiel pour ce qui requiert l'enseignant : l'accompagnement, le débat, la construction de sens.",
    author: 'Marcel Lebrun',
    role: 'Professeur en sciences de l\'éducation, UCLouvain',
  },
  {
    text: "Le temps de classe est trop précieux pour être consacré à la seule transmission de contenu. Faisons-le à la maison, et utilisons le présentiel pour ce que la machine ne peut pas faire.",
    author: 'Jonathan Bergmann & Aaron Sams',
    role: 'Pionniers de la classe inversée, 2012',
  },
  {
    text: "N'attendez pas que les étudiants disent qu'ils ont compris : faites-leur démontrer qu'ils ont compris.",
    author: 'Eric Mazur',
    role: 'Harvard, Peer Instruction, 1997',
  },
  {
    text: "Apprendre est un acte personnel qui se construit en interaction avec les autres. La technologie n'est utile que si elle sert ce projet.",
    author: 'Marcel Lebrun',
    role: 'Classes inversées : enseigner et apprendre à l\'endroit, 2016',
  },
];

/* ── §1 Pourquoi inverser ? (fondements) ── */
const FONDEMENTS = [
  {
    n: 'I',
    title: 'Libérer le présentiel',
    text: "La transmission de contenu se fait avant la séance. Le temps avec l'enseignant est dédié à ce qui exige sa présence : pratique, débat, accompagnement.",
    ref: 'Bergmann & Sams, 2012',
  },
  {
    n: 'II',
    title: 'Engager l\'apprenant',
    text: "L'étudiant n'est plus spectateur. Il prépare, questionne, applique, produit, consolide. La pédagogie active double le rendement d'apprentissage.",
    ref: 'Freeman et al., PNAS, 2014',
  },
  {
    n: 'III',
    title: 'Personnaliser le rythme',
    text: "Chaque étudiant apprend à son rythme à la maison, peut réécouter, pauser, revenir en arrière. La standardisation pédagogique laisse place à l'adaptation.",
    ref: 'Khan, TED 2011',
  },
  {
    n: 'IV',
    title: 'Mémoriser durablement',
    text: "La révision espacée — démontrée scientifiquement depuis Ebbinghaus — multiplie la rétention à long terme. La répétition au bon moment, pas le bachotage.",
    ref: 'Wozniak & Gorzelańczyk, 1994',
  },
];

/* ── §2 Niveaux de classe inversée (Lebrun) ── */
const NIVEAUX = [
  {
    label: 'FLIP 1',
    title: 'Inverser le temps',
    text: 'La transmission migre à la maison via des capsules. Le présentiel devient atelier d\'application. C\'est l\'entrée la plus connue dans la classe inversée.',
    bullet: 'Capsule vidéo + QCM auto-correction',
    color: C.primary,
  },
  {
    label: 'FLIP 2',
    title: 'Inverser les rôles',
    text: 'L\'étudiant ne consomme plus, il cherche, analyse, produit du contenu. Il devient acteur de sa propre construction du savoir.',
    bullet: 'Prosit CESI + flashcards générées',
    color: C.accent,
  },
  {
    label: 'FLIP 3',
    title: 'Inverser la posture',
    text: 'Au-delà de l\'organisation : c\'est le projet pédagogique qui change. L\'enseignant accompagne, l\'évaluation devient formative, l\'erreur devient ressource.',
    bullet: 'Projet original + tuteur IA socratique',
    color: '#7C3AED',
  },
];

/* ── §3 Le Cycle FlipLearn (5 étapes alignées sur l'app) ── */
const CYCLE = [
  { n: 1, title: 'Préparation',   text: 'Capsules courtes hébergées Cloudinary + QCM auto-corrigés. L\'étudiant arrive en classe avec les concepts en tête.', tool: 'Capsules + QCM auto' },
  { n: 2, title: 'Rendez-vous',   text: 'Le présentiel est ciblé : l\'enseignant voit en amont qui est prêt et sur quels concepts insister.', tool: 'Dashboard prof + tracking' },
  { n: 3, title: 'Application',   text: 'Prosit en groupe selon la méthode CESI : phases Aller, Recherche, Retour. Cinq rôles tournants. Cas algériens.', tool: 'Module Prosit + 5 rôles' },
  { n: 4, title: 'Production',    text: 'Projet mono ou pluri-modules. L\'étudiant ne consomme plus, il crée. Évaluation par les pairs et livrables réels.', tool: 'Projets + peer-assessment' },
  { n: 5, title: 'Consolidation', text: 'Flashcards à révision espacée (algorithme SM-2, Wozniak 1990) + tuteur IA personnel à méthode socratique.', tool: 'Flashcards SM-2 + Tuteur IA' },
];

/* ── §4 Nos choix pédagogiques fondateurs ── */
const POSTURE = [
  {
    title: 'Le pourquoi avant le comment',
    text: 'La technologie ne fonde pas la pédagogie : elle la sert. Chaque outil de FlipLearn répond à un besoin d\'apprentissage identifié, jamais l\'inverse.',
    ref: 'Lebrun, 2016',
  },
  {
    title: 'L\'apprenant acteur',
    text: 'On ne fait pas comprendre, on amène à comprendre. La méthode socratique guide le tuteur IA : pas de réponse directe, mais des questions qui font émerger le sens.',
    ref: 'Mazur, 1997',
  },
  {
    title: 'L\'évaluation pour apprendre',
    text: 'Le QCM, le Prosit, le projet sont d\'abord des miroirs de progression. Les erreurs alimentent la révision espacée, elles ne sanctionnent pas.',
    ref: 'Black & Wiliam, 1998',
  },
  {
    title: 'Le présentiel sacré',
    text: 'Si la séance peut se faire en ligne, elle n\'a pas sa place en présentiel. Le temps en classe est réservé à ce qui requiert l\'humain.',
    ref: 'Bergmann & Sams, 2012',
  },
];

/* ── §5 et §6 — Outils étudiant / enseignant ── */
const STUDENT_FEATURES = [
  { Icon: Target,    title: 'Mon parcours',            text: 'Vue unifiée des 5 étapes du cycle pour chaque module, progression en temps réel.' },
  { Icon: Bot,       title: 'Tuteur IA personnel',     text: 'Disponible 24/7, connaît tes modules, tes QCM ratés, tes Prosits. Méthode socratique.' },
  { Icon: Video,     title: 'Capsules + analyse IA',   text: 'Transcription Whisper + résumé GPT-4o + concepts clés. Tu vas droit à l\'essentiel.' },
  { Icon: Layers,    title: 'Flashcards SM-2',         text: 'Révision espacée auto-générée à partir des capsules vues. Mémoire longue durée.' },
  { Icon: Trophy,    title: 'Quiz Battle',             text: 'Duels temps réel avec power-ups. Gamification au service de l\'engagement.' },
  { Icon: Gift,      title: 'Récompenses concrètes',   text: 'Points XP échangeables contre des mois Premium FlipLearn et des certifications.' },
];

const PROF_FEATURES = [
  { Icon: BarChart3, title: 'Préparation de séance',     text: 'Avant chaque cours : qui est prêt, quels concepts ont fait obstacle, où concentrer l\'attention.' },
  { Icon: Sparkles,  title: 'Auto-prépa en un clic',     text: 'L\'IA analyse votre capsule et propose résumé, QCM, questions in-vidéo, idées de Prosit.' },
  { Icon: Lightbulb, title: 'Insights pédagogiques',     text: 'Recommandations actionnables basées sur les métriques réelles de votre classe.' },
  { Icon: Users,     title: 'Méthode CESI / APP',        text: 'Prosits en trois phases (Aller, Recherche, Retour), cinq rôles tournants, évaluation par les pairs.' },
  { Icon: FileText,  title: 'Génération de QCM',         text: 'Questions générées depuis le transcript de la capsule. Validation enseignant en 30 secondes.' },
  { Icon: Award,     title: 'Suivi individuel',          text: 'Rappel groupé ou ciblé, vue complète par étudiant : capsules, QCM, Prosits, projets.' },
];

/* ── §7 Filières ── */
const FILIERES = [
  { id: 'ISIL',       name: 'Informatique (ISIL)',       subtitle: 'Ingénierie Système & Logiciel', color: '#1B4F72', Icon: Brain,      modules: ['Algorithmique', 'Web & Mobile', 'IA & Data', 'Cybersécurité', 'Bases de données'] },
  { id: 'Management', name: 'Management',                 subtitle: 'Stratégie & Organisation',       color: '#B45309', Icon: Briefcase,  modules: ['Stratégie', 'RH', 'Marketing', 'Leadership', 'Entrepreneuriat'] },
  { id: 'Finance',    name: 'Finance & Comptabilité',     subtitle: 'Analyse & Audit',                color: '#0F766E', Icon: Calculator, modules: ['Comptabilité', 'Analyse financière', 'Audit', 'IFRS', 'Marchés'] },
];

/* ── §8 Adaptation Algérie ── */
const ALGERIA_FEATURES = [
  { Icon: Wifi,    title: 'Marche en 3G/4G',              text: 'Capsules optimisées Cloudinary, vidéos courtes (5–10 min), aucun matériel requis en classe.' },
  { Icon: Users,   title: 'Classes 50+ supportées',       text: 'Dashboards agrégés. L\'enseignant lit l\'état d\'une promo entière en cinq minutes.' },
  { Icon: MapPin,  title: 'Cas algériens contextualisés', text: 'Prosits sur OWASP e-commerce algérien, FinTech locale, conformité numérique nationale.' },
  { Icon: Clock,   title: 'Régularité valorisée',         text: 'Streaks, niveaux, quêtes hebdomadaires. Système de mérite culturellement aligné.' },
];

/* ── §9 Voix d'usage ── */
const TESTIMONIALS = [
  { name: 'Yasmine B.', role: 'L3 ISIL · EM Alger',     text: 'L\'assistant IA m\'a sauvé pendant les exams. Il connaît mes cours mieux que moi.' },
  { name: 'Mehdi S.',   role: 'L2 Management',           text: 'Les capsules courtes, c\'est génial. Je révise dix minutes dans le bus puis je fais le QCM.' },
  { name: 'Amira H.',   role: 'L3 Finance',              text: 'J\'ai gagné ma première certification gratuite grâce aux points. Ça motive vraiment.' },
];

/* ── Bibliographie footer ── */
const REFERENCES = [
  'Bergmann, J. & Sams, A. (2012). Flip Your Classroom : Reach Every Student in Every Class Every Day. ISTE.',
  'Lebrun, M. & Lecoq, J. (2016). Classes inversées : enseigner et apprendre à l\'endroit. Réseau Canopé.',
  'Mazur, E. (1997). Peer Instruction : A User\'s Manual. Prentice Hall.',
  'Freeman, S. et al. (2014). Active learning increases student performance in science, engineering, and mathematics. PNAS, 111(23).',
  'Wozniak, P. A. & Gorzelańczyk, E. J. (1994). Optimization of repetition spacing in the practice of learning. Acta Neurobiologiae Experimentalis, 54.',
  'Black, P. & Wiliam, D. (1998). Assessment and Classroom Learning. Assessment in Education, 5(1).',
];

/* ─────────────────────────────────────────────────────────────────────────
   Composants helpers
   ───────────────────────────────────────────────────────────────────────── */

function SectionLabel({ num, title }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span style={{
        fontFamily: '"Georgia", "Times New Roman", serif',
        fontSize: 14, fontWeight: 700, fontStyle: 'italic',
        color: C.accent, letterSpacing: '0.04em',
      }}>
        § {num}
      </span>
      <span style={{
        width: 32, height: 1, background: C.border,
      }} />
      <span style={{
        fontSize: 11, fontWeight: 700, color: C.mutedLight,
        textTransform: 'uppercase', letterSpacing: '0.18em',
      }}>
        {title}
      </span>
    </div>
  );
}

function SectionTitle({ children, color = C.ink }) {
  return (
    <h2 style={{
      fontSize: 'clamp(1.8rem, 3.6vw, 2.4rem)',
      fontWeight: 800, color, margin: 0, marginBottom: 14,
      letterSpacing: '-0.025em', lineHeight: 1.15,
    }}>
      {children}
    </h2>
  );
}

function SectionLead({ children, color = C.muted }) {
  return (
    <p style={{
      fontSize: 17, color, lineHeight: 1.65,
      maxWidth: 680, margin: 0,
    }}>
      {children}
    </p>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const [currentQuote, setCurrentQuote] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const i = setInterval(() => setCurrentQuote((q) => (q + 1) % QUOTES.length), 8000);
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { clearInterval(i); window.removeEventListener('scroll', onScroll); };
  }, []);

  return (
    <div style={{
      minHeight: '100vh', background: C.bg, color: C.ink,
      fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
      fontFeatureSettings: '"cv02", "cv03", "cv04", "cv11"',
      overflowX: 'hidden',
    }}>
      {/* ─── NAV ─────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        padding: '14px 32px',
        background: scrolled ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${scrolled ? C.border : 'transparent'}`,
        transition: 'background 200ms, border-color 200ms',
      }}>
        <div style={{
          maxWidth: 1180, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <Logo variant="full" />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link to="/login" className="lp-nav-login" style={{
              padding: '9px 16px', textDecoration: 'none',
              color: C.primary, fontWeight: 600, fontSize: 14,
            }}>
              Se connecter
            </Link>
            <Link to="/register" style={{
              padding: '10px 18px', textDecoration: 'none',
              background: C.primary, color: 'white',
              borderRadius: 8, fontWeight: 700, fontSize: 14,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              transition: 'background 150ms, transform 150ms',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.primaryDark; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = C.primary; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              Créer un compte <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO ────────────────────────────────────────────────── */}
      <section style={{
        padding: '88px 32px 72px',
        background: `
          radial-gradient(ellipse 900px 600px at 70% -10%, ${C.primarySoft} 0%, transparent 55%),
          radial-gradient(ellipse 700px 500px at 0% 110%, ${C.accentSoft}80 0%, transparent 50%),
          ${C.surface}
        `,
        borderBottom: `1px solid ${C.borderSoft}`,
      }}>
        <div style={{
          maxWidth: 1180, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 64, alignItems: 'center',
        }}>
          <div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px',
              background: C.surface, border: `1px solid ${C.border}`,
              color: C.muted, borderRadius: 999,
              fontSize: 11, fontWeight: 600, marginBottom: 24,
              letterSpacing: '0.04em',
            }}>
              <GraduationCap size={13} color={C.accent} />
              PROJET DE FIN D'ÉTUDES · EM ALGER BUSINESS SCHOOL
            </span>

            <h1 style={{
              fontSize: 'clamp(2.4rem, 5.2vw, 3.8rem)',
              fontWeight: 800, color: C.ink,
              lineHeight: 1.05, margin: 0, marginBottom: 22,
              letterSpacing: '-0.035em',
            }}>
              Et si le temps de classe<br />
              <span style={{ fontStyle: 'italic', fontWeight: 700, color: C.accent }}>servait à apprendre,</span><br />
              pas seulement à écouter ?
            </h1>

            <p style={{
              fontSize: 18, color: C.muted, lineHeight: 1.65,
              maxWidth: 540, margin: 0, marginBottom: 32,
            }}>
              <strong style={{ color: C.ink, fontWeight: 600 }}>FlipLearn</strong> est une plateforme
              de classe inversée pensée pour l'université algérienne. Pas seulement un outil :
              une démarche pédagogique en cinq étapes, fondée sur trente ans de recherche en
              sciences de l'éducation.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 36 }}>
              <Link to="/register" style={{
                padding: '14px 26px',
                background: C.primary, color: 'white',
                borderRadius: 10, textDecoration: 'none',
                fontWeight: 700, fontSize: 15,
                display: 'inline-flex', alignItems: 'center', gap: 8,
                boxShadow: `0 8px 24px ${C.primary}40`,
                transition: 'transform 150ms, box-shadow 150ms, background 150ms',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = C.primaryDark; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = C.primary; }}
              >
                Créer mon compte <ArrowRight size={16} />
              </Link>
              <a href="#cycle" style={{
                padding: '14px 22px', background: C.surface, color: C.primary,
                border: `1.5px solid ${C.border}`, borderRadius: 10, textDecoration: 'none',
                fontWeight: 600, fontSize: 15,
                display: 'inline-flex', alignItems: 'center', gap: 8,
                transition: 'border-color 150ms',
              }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = C.primary}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = C.border}
              >
                Découvrir la démarche <ChevronRight size={16} />
              </a>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
              gap: 24, paddingTop: 24, borderTop: `1px solid ${C.borderSoft}`,
            }}>
              {[
                { num: '5', label: 'Étapes du cycle' },
                { num: '3', label: 'Filières · 9 promos' },
                { num: '24/7', label: 'Tuteur IA' },
                { num: '6', label: 'Références scientifiques' },
              ].map((s) => (
                <div key={s.label}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: C.primary, letterSpacing: '-0.02em' }}>{s.num}</div>
                  <div style={{ fontSize: 12, color: C.mutedLight, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Carte hero : citation pédagogique de référence */}
          <div style={{
            position: 'relative',
            background: C.surface,
            borderRadius: 16,
            padding: 36,
            border: `1px solid ${C.border}`,
            boxShadow: '0 30px 60px -20px rgba(15, 58, 94, 0.12), 0 8px 16px -8px rgba(15, 58, 94, 0.06)',
          }}>
            <div style={{
              position: 'absolute', top: -12, left: 24,
              padding: '4px 12px',
              background: C.accent, color: 'white',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              borderRadius: 4,
            }}>
              FIL PÉDAGOGIQUE
            </div>
            <Quote size={32} color={C.primary} style={{ opacity: 0.2, marginBottom: 12 }} />
            <blockquote style={{
              margin: 0,
              fontSize: 18, lineHeight: 1.55, color: C.ink,
              fontStyle: 'italic', fontWeight: 500,
              minHeight: 160, transition: 'opacity 400ms',
              letterSpacing: '-0.01em',
            }}>
              « {QUOTES[currentQuote].text} »
            </blockquote>
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.borderSoft}` }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.ink }}>
                — {QUOTES[currentQuote].author}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: C.mutedLight }}>
                {QUOTES[currentQuote].role}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 18 }}>
              {QUOTES.map((_, i) => (
                <button
                  key={i} type="button"
                  onClick={() => setCurrentQuote(i)}
                  aria-label={`Citation ${i + 1}`}
                  style={{
                    flex: i === currentQuote ? '0 0 24px' : '0 0 8px',
                    height: 4, borderRadius: 2,
                    background: i === currentQuote ? C.primary : C.border,
                    border: 'none', cursor: 'pointer',
                    transition: 'flex 300ms, background 300ms',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── §1 POURQUOI INVERSER ? ───────────────────────────────── */}
      <section style={{ padding: '88px 32px 72px', background: C.bg }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 48, maxWidth: 720 }}>
            <SectionLabel num="1" title="Les fondements" />
            <SectionTitle>Pourquoi inverser la classe ?</SectionTitle>
            <SectionLead>
              La classe inversée n'est pas une mode pédagogique : c'est la conséquence logique
              d'un siècle de recherche sur l'apprentissage. Quatre constats fondent FlipLearn.
            </SectionLead>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 0,
            borderTop: `1px solid ${C.border}`,
            borderLeft: `1px solid ${C.border}`,
          }}>
            {FONDEMENTS.map((f) => (
              <div key={f.n} style={{
                padding: 28,
                background: C.surface,
                borderRight: `1px solid ${C.border}`,
                borderBottom: `1px solid ${C.border}`,
                transition: 'background 200ms',
              }}
                onMouseEnter={(e) => e.currentTarget.style.background = C.primarySoft}
                onMouseLeave={(e) => e.currentTarget.style.background = C.surface}
              >
                <div style={{
                  fontFamily: '"Georgia", serif',
                  fontSize: 32, fontStyle: 'italic',
                  color: C.accent, fontWeight: 600, lineHeight: 1,
                  marginBottom: 12,
                }}>
                  {f.n}.
                </div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.ink, marginBottom: 8 }}>
                  {f.title}
                </h3>
                <p style={{ margin: 0, fontSize: 14, color: C.muted, lineHeight: 1.55 }}>
                  {f.text}
                </p>
                <p style={{
                  margin: '14px 0 0', fontSize: 11, color: C.mutedLight,
                  fontStyle: 'italic', letterSpacing: '0.02em',
                }}>
                  {f.ref}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── §2 LES TROIS NIVEAUX (LEBRUN) ───────────────────────── */}
      <section style={{ padding: '88px 32px', background: C.surface }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 48, maxWidth: 720 }}>
            <SectionLabel num="2" title="Le modèle Lebrun" />
            <SectionTitle>Trois niveaux pour inverser</SectionTitle>
            <SectionLead>
              Marcel Lebrun (UCLouvain) a montré que la classe inversée n'est pas binaire.
              Elle se décline en trois niveaux progressifs, du plus simple au plus profond.
              FlipLearn implémente les trois.
            </SectionLead>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
          }}>
            {NIVEAUX.map((n, i) => (
              <div key={n.label} style={{
                position: 'relative',
                background: C.surface,
                border: `1.5px solid ${C.border}`,
                borderRadius: 14,
                padding: 28,
                paddingTop: 32,
                transition: 'border-color 200ms, transform 200ms',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = n.color; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{
                  position: 'absolute', top: -1, left: 28,
                  padding: '6px 12px',
                  background: n.color, color: 'white',
                  fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
                  borderRadius: '0 0 6px 6px',
                }}>
                  {n.label}
                </div>
                <h3 style={{
                  margin: 0, fontSize: 20, fontWeight: 700, color: C.ink,
                  marginBottom: 10, letterSpacing: '-0.015em',
                }}>
                  {n.title}
                </h3>
                <p style={{ margin: 0, fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
                  {n.text}
                </p>
                <div style={{
                  marginTop: 18, paddingTop: 14,
                  borderTop: `1px solid ${C.borderSoft}`,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Compass size={14} color={n.color} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: n.color }}>
                    {n.bullet}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p style={{
            marginTop: 28, fontSize: 13, color: C.mutedLight,
            fontStyle: 'italic', textAlign: 'center',
          }}>
            Lebrun, M. (2014). « Classes inversées, Flipped Classrooms… ça flippe quoi au juste ? »
          </p>
        </div>
      </section>

      {/* ─── §3 LE CYCLE FLIPLEARN ───────────────────────────────── */}
      <section id="cycle" style={{ padding: '88px 32px', background: C.bg }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 48, maxWidth: 720 }}>
            <SectionLabel num="3" title="Notre démarche" />
            <SectionTitle>Le cycle FlipLearn, en cinq temps</SectionTitle>
            <SectionLead>
              Chaque module suit le même cycle. Cinq étapes qui s'enchaînent, chacune avec ses
              outils et sa fonction pédagogique. Le rythme est explicite, l'étudiant sait où il
              en est, l'enseignant sait où il agit.
            </SectionLead>
          </div>

          <div style={{ position: 'relative' }}>
            {/* Ligne verticale connectant les étapes */}
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: 31,
              width: 2, background: `linear-gradient(to bottom, ${C.primary}33 0%, ${C.accent}33 100%)`,
              zIndex: 0,
            }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, position: 'relative' }}>
              {CYCLE.map((s) => (
                <div key={s.n} style={{
                  display: 'grid', gridTemplateColumns: '64px 1fr',
                  gap: 20, alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: C.surface, border: `2px solid ${C.primary}`,
                    color: C.primary,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em',
                    zIndex: 1, flexShrink: 0,
                  }}>
                    {s.n}
                  </div>
                  <div style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    padding: '20px 24px',
                    transition: 'border-color 200ms, transform 200ms',
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.transform = 'translateX(4px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'translateX(0)'; }}
                  >
                    <div style={{
                      display: 'flex', alignItems: 'baseline',
                      justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
                      marginBottom: 6,
                    }}>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.ink, letterSpacing: '-0.015em' }}>
                        {s.title}
                      </h3>
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: C.accent,
                        background: C.accentSoft,
                        padding: '3px 10px', borderRadius: 999,
                      }}>
                        {s.tool}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
                      {s.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── §4 NOTRE POSTURE ────────────────────────────────────── */}
      <section style={{ padding: '88px 32px', background: C.primaryDark, color: 'white' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 48, maxWidth: 720 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{
                fontFamily: '"Georgia", serif', fontSize: 14, fontWeight: 700, fontStyle: 'italic',
                color: '#FBBF24',
              }}>
                § 4
              </span>
              <span style={{ width: 32, height: 1, background: 'rgba(255,255,255,0.3)' }} />
              <span style={{
                fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
                textTransform: 'uppercase', letterSpacing: '0.18em',
              }}>
                Nos partis pris
              </span>
            </div>
            <h2 style={{
              fontSize: 'clamp(1.8rem, 3.6vw, 2.4rem)',
              fontWeight: 800, margin: 0, marginBottom: 14,
              letterSpacing: '-0.025em', lineHeight: 1.15,
            }}>
              Quatre choix qui fondent la plateforme
            </h2>
            <p style={{
              fontSize: 17, color: 'rgba(255,255,255,0.78)', lineHeight: 1.65,
              maxWidth: 680, margin: 0,
            }}>
              FlipLearn n'est pas neutre. Chaque écran, chaque interaction, chaque ligne de code
              répond à une conviction pédagogique référencée.
            </p>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
          }}>
            {POSTURE.map((p, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12, padding: 24,
                backdropFilter: 'blur(6px)',
              }}>
                <div style={{
                  fontFamily: '"Georgia", serif',
                  fontSize: 14, fontWeight: 700, fontStyle: 'italic',
                  color: '#FBBF24', marginBottom: 8,
                }}>
                  Choix {i + 1}.
                </div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'white', marginBottom: 8 }}>
                  {p.title}
                </h3>
                <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.78)', lineHeight: 1.6 }}>
                  {p.text}
                </p>
                <p style={{
                  margin: '14px 0 0', fontSize: 11,
                  color: 'rgba(251,191,36,0.85)',
                  fontStyle: 'italic', letterSpacing: '0.02em',
                }}>
                  {p.ref}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── §5 POUR LES ÉTUDIANTS ─────────────────────────────── */}
      <section style={{ padding: '88px 32px', background: C.bg }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 48, maxWidth: 720 }}>
            <SectionLabel num="5" title="L'étudiant acteur" />
            <SectionTitle>Pour apprendre activement</SectionTitle>
            <SectionLead>
              L'étudiant n'est plus dans une posture de réception. Il prépare, questionne, joue,
              révise. Six outils pour soutenir cette posture active.
            </SectionLead>
          </div>
          <FeatureGrid items={STUDENT_FEATURES} color={C.primary} bg={C.surface} />
        </div>
      </section>

      {/* ─── §6 POUR LES ENSEIGNANTS ───────────────────────────── */}
      <section style={{ padding: '88px 32px', background: C.surface }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 48, maxWidth: 720 }}>
            <SectionLabel num="6" title="L'enseignant accompagnateur" />
            <SectionTitle>Pour piloter sans subir</SectionTitle>
            <SectionLead>
              Préparer un cours en classe inversée prendrait plus de temps qu'un cours magistral.
              Sauf si la plateforme fait le travail répétitif à votre place. Six outils pour
              préparer en trente minutes au lieu de trois heures.
            </SectionLead>
          </div>
          <FeatureGrid items={PROF_FEATURES} color={C.accent} bg={C.bg} />
        </div>
      </section>

      {/* ─── §7 LES FILIÈRES ───────────────────────────────────── */}
      <section style={{ padding: '88px 32px', background: C.bg }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 40, maxWidth: 720 }}>
            <SectionLabel num="7" title="EM Alger Business School" />
            <SectionTitle>Trois filières, neuf promotions, une seule plateforme</SectionTitle>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 20,
          }}>
            {FILIERES.map((f) => {
              const Icon = f.Icon;
              return (
                <div key={f.id} style={{
                  background: C.surface,
                  borderRadius: 14, padding: 28,
                  border: `1.5px solid ${C.border}`,
                  transition: 'border-color 200ms, transform 200ms',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = f.color; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 10,
                    background: `${f.color}12`, color: f.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 16,
                  }}>
                    <Icon size={24} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.ink }}>{f.name}</h3>
                  <p style={{ margin: '4px 0 16px', fontSize: 13, color: f.color, fontWeight: 600 }}>{f.subtitle}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {f.modules.map((m) => (
                      <span key={m} style={{
                        padding: '4px 10px',
                        background: C.bg, color: C.muted,
                        border: `1px solid ${C.border}`,
                        borderRadius: 999, fontSize: 11, fontWeight: 500,
                      }}>{m}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── §8 ADAPTATION ALGÉRIE ─────────────────────────────── */}
      <section style={{
        padding: '88px 32px',
        background: `linear-gradient(135deg, ${C.accentSoft} 0%, #FDE68A40 100%)`,
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 48, maxWidth: 720 }}>
            <SectionLabel num="8" title="Contexte local" />
            <SectionTitle color="#78350F">Pensé pour l'université algérienne</SectionTitle>
            <SectionLead color="#92400E">
              La classe inversée a été conçue dans des contextes occidentaux bien équipés.
              L'adapter à l'Algérie suppose d'admettre des contraintes réelles : connexion,
              taille de classe, matériel. FlipLearn les intègre par défaut.
            </SectionLead>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 18,
          }}>
            {ALGERIA_FEATURES.map((f, i) => {
              const Icon = f.Icon;
              return (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.75)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: 12, padding: 22,
                  border: '1px solid rgba(180,83,9,0.18)',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: C.accent, color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 12,
                  }}>
                    <Icon size={20} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#78350F' }}>{f.title}</h3>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: '#92400E', lineHeight: 1.55 }}>{f.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── §9 VOIX D'USAGE ───────────────────────────────────── */}
      <section style={{ padding: '88px 32px', background: C.surface }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 48, maxWidth: 720 }}>
            <SectionLabel num="9" title="Sur le terrain" />
            <SectionTitle>Voix d'usage</SectionTitle>
            <SectionLead>
              Retours des premières promotions ayant basculé sur le cycle.
            </SectionLead>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
          }}>
            {TESTIMONIALS.map((t, i) => (
              <figure key={i} style={{
                margin: 0,
                background: C.bg,
                borderRadius: 12, padding: 26,
                border: `1px solid ${C.border}`,
              }}>
                <Quote size={20} color={C.primary} style={{ opacity: 0.25, marginBottom: 10 }} />
                <blockquote style={{
                  margin: 0, fontSize: 15, lineHeight: 1.6,
                  color: C.ink, fontStyle: 'italic',
                }}>
                  « {t.text} »
                </blockquote>
                <figcaption style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.borderSoft}` }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: C.ink }}>{t.name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: C.mutedLight }}>{t.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ─────────────────────────────────────────── */}
      <section style={{
        padding: '96px 32px',
        background: `linear-gradient(135deg, ${C.ink} 0%, ${C.primaryDark} 100%)`,
        color: 'white', textAlign: 'center',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <BookOpen size={48} style={{ opacity: 0.4, marginBottom: 20 }} />
          <h2 style={{
            fontSize: 'clamp(2rem, 4.4vw, 2.8rem)',
            fontWeight: 800, margin: '0 0 14px',
            letterSpacing: '-0.025em', lineHeight: 1.12,
          }}>
            Rejoindre une promotion<br />
            <span style={{ fontStyle: 'italic', color: '#FBBF24', fontWeight: 700 }}>en classe inversée.</span>
          </h2>
          <p style={{
            fontSize: 16, opacity: 0.78, lineHeight: 1.65,
            margin: '0 0 32px', maxWidth: 540, marginInline: 'auto',
          }}>
            Création de compte gratuite, validation par l'administration sous 24h.
            Aucun matériel particulier requis : un téléphone, une connexion 3G, c'est tout.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" style={{
              padding: '16px 32px',
              background: '#FBBF24', color: C.ink,
              borderRadius: 10, textDecoration: 'none',
              fontWeight: 700, fontSize: 16,
              display: 'inline-flex', alignItems: 'center', gap: 8,
              boxShadow: '0 8px 24px rgba(251,191,36,0.3)',
              transition: 'transform 150ms',
            }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Créer mon compte <ArrowRight size={16} />
            </Link>
            <Link to="/login" style={{
              padding: '16px 28px', background: 'rgba(255,255,255,0.08)',
              color: 'white', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 10, textDecoration: 'none',
              fontWeight: 600, fontSize: 15,
              display: 'inline-flex', alignItems: 'center', gap: 8,
              backdropFilter: 'blur(8px)',
            }}>
              J'ai déjà un compte
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ACADÉMIQUE + BIBLIOGRAPHIE ─────────────────── */}
      <style>{`
        @media (max-width: 640px) {
          .lp-nav-login { display: none !important; }
          .lp-section-pad { padding-left: 20px !important; padding-right: 20px !important; }
        }
      `}</style>
      <footer style={{
        padding: '56px 32px 28px',
        background: C.ink, color: '#94A3B8', fontSize: 12,
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 40, marginBottom: 36,
        }}>
          <div>
            <div style={{ marginBottom: 14 }}>
              <Logo variant="full" />
            </div>
            <p style={{ margin: 0, lineHeight: 1.6, color: '#94A3B8' }}>
              Plateforme de classe inversée pour l'enseignement supérieur algérien.
              Projet de Fin d'Études — Mohamed Assil SERAY, L3 ISIL, EM Alger Business School,
              promotion 2025–2026.
            </p>
          </div>
          <div>
            <h4 style={{
              margin: 0, marginBottom: 14, fontSize: 11, color: 'white',
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
            }}>
              Références scientifiques
            </h4>
            <ol style={{
              margin: 0, paddingLeft: 18,
              fontSize: 11.5, lineHeight: 1.65, color: '#94A3B8',
            }}>
              {REFERENCES.map((r, i) => (
                <li key={i} style={{ marginBottom: 6 }}>{r}</li>
              ))}
            </ol>
          </div>
        </div>

        <div style={{
          maxWidth: 1100, margin: '0 auto',
          paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
          fontSize: 11, color: '#64748B',
        }}>
          <span>FlipLearn © 2026 — Plateforme de Classe Inversée</span>
          <span>Encadré par EM Alger Business School · Soutenance juin 2026</span>
        </div>
      </footer>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   FeatureGrid — Grille réutilisée par §5 et §6
   ───────────────────────────────────────────────────────────────────────── */
function FeatureGrid({ items, color, bg }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: 16,
    }}>
      {items.map((f, i) => {
        const Icon = f.Icon;
        return (
          <div key={i} style={{
            background: bg,
            borderRadius: 12, padding: 22,
            border: `1px solid ${C.border}`,
            transition: 'border-color 200ms, transform 200ms',
            display: 'flex', gap: 14, alignItems: 'flex-start',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `${color}12`, color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.ink, letterSpacing: '-0.01em' }}>
                {f.title}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: C.muted, lineHeight: 1.55 }}>
                {f.text}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
