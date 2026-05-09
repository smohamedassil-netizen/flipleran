import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import {
  Play, ArrowRight, Sparkles, BookOpen, Users, Trophy,
  Video, FileText, MessageSquare, Gift, Bot, CheckCircle, Zap, Target,
  Brain, GraduationCap, Briefcase, Calculator, Quote, Layers, Eye,
  Lightbulb, BarChart3, Clock, Wifi, MapPin, Repeat, Award,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────
   LandingPage — Page d'accueil publique de FlipLearn (route /welcome).
   Présente le Cycle d'Apprentissage Inversé (CAI) en 5 étapes, les features
   IA, l'adaptation au contexte universitaire algérien, et invite à
   s'inscrire. Intentionnellement riche pour servir aussi de support démo.
   ───────────────────────────────────────────────────────────────────────── */

const FILIERES = [
  { id: 'ISIL',       name: 'Informatique (ISIL)',     subtitle: 'Ingénierie Système & Logiciel', color: '#1B4F72', gradient: 'linear-gradient(135deg, #1B4F72 0%, #2874A6 100%)', bg: '#EFF6FF', Icon: Brain,      modules: ['Algorithmique', 'Web & Mobile', 'IA & Data', 'Cybersécurité', 'Bases de données'] },
  { id: 'Management', name: 'Management',              subtitle: 'Stratégie & Organisation',      color: '#D97706', gradient: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)', bg: '#FFFBEB', Icon: Briefcase,  modules: ['Stratégie', 'RH', 'Marketing', 'Leadership', 'Entrepreneuriat'] },
  { id: 'Finance',    name: 'Finance & Comptabilité', subtitle: 'Analyse & Audit',               color: '#059669', gradient: 'linear-gradient(135deg, #059669 0%, #10B981 100%)', bg: '#F0FDF4', Icon: Calculator, modules: ['Comptabilité', 'Analyse financière', 'Audit', 'IFRS', 'Marchés'] },
];

const CAI_STEPS = [
  { num: 1, icon: '📚', title: 'Préparation',   color: '#7C3AED', desc: 'Capsules courtes + QCM auto-correction. L\'étudiant arrive en classe préparé.' },
  { num: 2, icon: '👥', title: 'Rendez-vous',   color: '#0EA5E9', desc: 'Le présentiel devient interactif : le prof voit qui est prêt et adapte son cours.' },
  { num: 3, icon: '🧩', title: 'Application',   color: '#D97706', desc: 'Prosit en groupe (méthode CESI), 5 rôles tournants, cas concrets algériens.' },
  { num: 4, icon: '🚀', title: 'Production',    color: '#DC2626', desc: 'Projet original mono ou multi-modules. L\'étudiant crée, ne consomme plus.' },
  { num: 5, icon: '🔁', title: 'Consolidation', color: '#059669', desc: 'Flashcards SM-2 (Wozniak 1990) + Tuteur IA personnel. Mémoire longue durée.' },
];

const QUOTES = [
  { author: 'Jonathan Bergmann & Aaron Sams', role: 'Pionniers de la classe inversée (2012)', text: 'Le temps de classe est trop précieux pour être consacré à transmettre du contenu. Faisons-le à la maison, et utilisons le présentiel pour ce que la machine ne peut pas faire : pratiquer, débattre, créer.' },
  { author: 'Eric Mazur', role: 'Harvard, Peer Instruction (1997)', text: 'Don\'t ask if students understand, make them prove it.' },
  { author: 'Salman Khan', role: 'Fondateur Khan Academy (TED 2011)', text: 'Utilisons la vidéo pour réinventer l\'éducation : permettons à chaque élève d\'apprendre à son rythme, et redonnons du temps humain au présentiel.' },
];

const STUDENT_FEATURES = [
  { Icon: Target,        title: 'Mon Parcours',          desc: 'Vue unifiée des 5 étapes du CAI pour chaque cours, avec progression en temps réel.', color: '#7C3AED' },
  { Icon: Bot,           title: 'Tuteur IA personnel',   desc: 'Ton assistant 24/7 connaît tes modules, tes QCM ratés, tes Prosits. Méthode socratique.', color: '#1B4F72' },
  { Icon: Video,         title: 'Capsules + analyse IA',   desc: 'Whisper transcrit + GPT-4o résume + concepts clés. Tu vas droit à l\'essentiel.', color: '#EC4899' },
  { Icon: Layers,        title: 'Flashcards SM-2',       desc: 'Révision espacée (Wozniak 1990) auto-générée depuis tes capsules vues.', color: '#059669' },
  { Icon: Trophy,        title: 'Quiz Battle',           desc: 'Duels temps réel avec power-ups. Gamification sérieuse.', color: '#F59E0B' },
  { Icon: Gift,          title: 'Récompenses concrètes', desc: 'Points XP échangeables contre des mois Premium FlipLearn.', color: '#DC2626' },
];

const PROF_FEATURES = [
  { Icon: BarChart3,     title: 'Préparation classe',    desc: 'Avant chaque séance : qui est prêt, qui ne l\'est pas, quels concepts ont posé problème.', color: '#1B4F72' },
  { Icon: Sparkles,      title: 'Auto-prépa cours en 1 clic', desc: 'L\'IA analyse ta capsule et propose résumé, QCM, questions in-vidéo, idées de Prosit.', color: '#7C3AED' },
  { Icon: Lightbulb,     title: 'Insights IA pédagogiques', desc: 'Recommandations actionnables basées sur les métriques réelles de ta classe.', color: '#F59E0B' },
  { Icon: Users,         title: 'Méthode CESI/APP',      desc: 'Prosits en 3 phases (Aller / Recherche / Retour), 5 rôles tournants, évaluation par les pairs.', color: '#D97706' },
  { Icon: FileText,      title: 'Génération QCM IA',     desc: 'Questions générées depuis le transcript de ta capsule. Tu valides en 30 secondes.', color: '#0EA5E9' },
  { Icon: Award,         title: 'Tracking individualisé', desc: 'Rappel groupé ou ciblé. Vue complète par étudiant : capsules, QCM, Prosits, projets.', color: '#059669' },
];

const ALGERIA_FEATURES = [
  { Icon: Wifi,    title: 'Marche en 3G/4G',           desc: 'Capsules hébergées Cloudinary, optimisées. Aucun matériel nécessaire en classe.' },
  { Icon: Users,   title: 'Adapté aux classes 50+',    desc: 'Dashboards agrégés. Le prof voit l\'ensemble en 5 minutes.' },
  { Icon: MapPin,  title: 'Cas algériens contextualisés', desc: 'Prosits sur OWASP e-commerce algérien, FinTech locale, RGPD.' },
  { Icon: Clock,   title: 'Régularité valorisée',      desc: 'Streaks, niveaux, quêtes hebdo. Système de mérite culturellement aligné.' },
];

const TESTIMONIALS = [
  { name: 'Yasmine B.', role: 'L3 ISIL · EM Alger',   avatar: '🎓', color: '#1B4F72', text: 'L\'assistant IA m\'a sauvé pendant les exams. Il connaît mes modules mieux que moi.' },
  { name: 'Mehdi S.',   role: 'L2 Management',         avatar: '📈', color: '#D97706', text: 'Les capsules courtes c\'est génial. Je révise 10 min dans le bus puis je fais le QCM.' },
  { name: 'Amira H.',   role: 'L3 Finance',            avatar: '💼', color: '#059669', text: 'J\'ai gagné ma 1ère certif gratuite grâce aux points. Ça motive vraiment.' },
];

export default function LandingPage() {
  const [currentQuote, setCurrentQuote] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setCurrentQuote((q) => (q + 1) % QUOTES.length), 6500);
    return () => clearInterval(i);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#FAFBFC', overflow: 'hidden', color: '#0F172A' }}>
      {/* ─── NAV STICKY ─────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        padding: '14px 32px',
        background: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(226,232,240,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Logo variant="full" />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link to="/login" style={{ padding: '9px 16px', textDecoration: 'none', color: '#1B4F72', fontWeight: 600, fontSize: 14 }}>Se connecter</Link>
          <Link to="/register" style={{
            padding: '10px 20px', textDecoration: 'none',
            background: 'linear-gradient(135deg, #1B4F72, #2874A6)',
            color: 'white', borderRadius: 10, fontWeight: 700, fontSize: 14,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            boxShadow: '0 4px 14px rgba(27,79,114,.3)',
            transition: 'transform .15s, box-shadow .15s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(27,79,114,.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(27,79,114,.3)'; }}
          >
            Commencer <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* ─── HERO ───────────────────────────────────────────────────── */}
      <section style={{
        padding: '80px 32px 64px',
        background: 'radial-gradient(ellipse 800px 600px at 70% 0%, rgba(124,58,237,0.08) 0%, transparent 50%), radial-gradient(ellipse 800px 600px at 0% 100%, rgba(27,79,114,0.06) 0%, transparent 50%), white',
        position: 'relative',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 56, alignItems: 'center' }}>
          <div>
            <span className="fade-in" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px',
              background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
              color: '#92400E', borderRadius: 999,
              fontSize: 12, fontWeight: 700, marginBottom: 24,
            }}>
              <Sparkles size={12} /> Plateforme PFE · EM Alger Business School
            </span>

            <h1 style={{
              fontSize: 'clamp(2.4rem, 5vw, 3.6rem)',
              fontWeight: 900, color: '#0F172A',
              lineHeight: 1.05, margin: 0, marginBottom: 20,
              letterSpacing: '-0.03em',
            }}>
              La classe inversée,<br />
              <span style={{ background: 'linear-gradient(135deg, #1B4F72 0%, #7C3AED 50%, #D97706 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                repensée pour l'Algérie.
              </span>
            </h1>

            <p style={{ fontSize: 17, color: '#475569', lineHeight: 1.6, maxWidth: 540, margin: 0, marginBottom: 32 }}>
              FlipLearn implémente le <strong>Cycle d'Apprentissage Inversé</strong> en 5 étapes :
              préparation à la maison → rendez-vous présentiel ciblé → application en groupe (CESI) →
              production originale → consolidation par révision espacée.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 36 }}>
              <Link to="/register" style={{
                padding: '14px 28px',
                background: 'linear-gradient(135deg, #1B4F72, #2874A6)',
                color: 'white', borderRadius: 12, textDecoration: 'none',
                fontWeight: 700, fontSize: 15,
                display: 'inline-flex', alignItems: 'center', gap: 8,
                boxShadow: '0 8px 24px rgba(27,79,114,.3)', transition: 'transform .15s',
              }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Créer mon compte <ArrowRight size={16} />
              </Link>
              <a href="#cycle" style={{
                padding: '14px 22px', background: 'white', color: '#1B4F72',
                border: '2px solid #E5E7EB', borderRadius: 12, textDecoration: 'none',
                fontWeight: 700, fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>
                <Play size={14} fill="#1B4F72" /> Voir le Cycle CAI
              </a>
            </div>

            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              {[
                { num: '5', label: 'Étapes du cycle' },
                { num: '3', label: 'Filières · 9 promos' },
                { num: '24/7', label: 'Tuteur IA' },
                { num: '0', label: 'Matériel en classe' },
              ].map((s) => (
                <div key={s.label}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#1B4F72' }}>{s.num}</div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual hero — Cycle CAI animé en mini */}
          <div style={{
            position: 'relative',
            background: 'white',
            borderRadius: 20,
            padding: 28,
            boxShadow: '0 20px 60px rgba(0,0,0,0.08), 0 8px 16px rgba(0,0,0,0.04)',
            border: '1px solid rgba(226,232,240,0.6)',
          }}>
            <p style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.6, textAlign: 'center' }}>
              Cycle d'Apprentissage Inversé
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {CAI_STEPS.map((s, i) => (
                <div key={s.num} className="cycle-fade" style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: 12, borderRadius: 10,
                  background: `${s.color}10`,
                  borderLeft: `3px solid ${s.color}`,
                  animation: `slideIn 0.5s ease both`,
                  animationDelay: `${i * 0.1}s`,
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: s.color, color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, flexShrink: 0,
                  }}>{s.icon}</div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: s.color }}>{s.num}. {s.title}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748B', lineHeight: 1.3 }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CITATIONS PÉDAGOGIQUES ROTATIVES ───────────────────────── */}
      <section style={{
        padding: '64px 32px',
        background: 'linear-gradient(135deg, #1B4F72 0%, #2874A6 100%)',
        color: 'white',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <Quote size={40} style={{ opacity: 0.3, marginBottom: 16 }} />
          <p style={{ fontSize: 'clamp(1.1rem, 2.4vw, 1.5rem)', lineHeight: 1.55, fontStyle: 'italic', margin: 0, marginBottom: 20, minHeight: 100, transition: 'opacity 600ms' }}>
            « {QUOTES[currentQuote].text} »
          </p>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>
            — {QUOTES[currentQuote].author}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.7 }}>
            {QUOTES[currentQuote].role}
          </p>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 20 }}>
            {QUOTES.map((_, i) => (
              <button
                key={i} type="button"
                onClick={() => setCurrentQuote(i)}
                aria-label={`Citation ${i + 1}`}
                style={{
                  width: i === currentQuote ? 24 : 8, height: 8,
                  borderRadius: 4,
                  background: i === currentQuote ? 'white' : 'rgba(255,255,255,0.3)',
                  border: 'none', cursor: 'pointer', transition: 'width 300ms, background 300ms',
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ─── LE CYCLE CAI EN 5 ÉTAPES ───────────────────────────────── */}
      <section id="cycle" style={{ padding: '80px 32px', background: '#FAFBFC' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: 0.6 }}>
              La méthode FlipLearn
            </p>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, margin: '8px 0 12px', color: '#0F172A', letterSpacing: '-0.02em' }}>
              Le Cycle d'Apprentissage Inversé
            </h2>
            <p style={{ margin: 0, fontSize: 16, color: '#64748B', maxWidth: 720, marginInline: 'auto', lineHeight: 1.6 }}>
              5 étapes obligatoires pour chaque module. Chaque étape utilise les bons outils,
              au bon moment, dans la bonne séquence.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {CAI_STEPS.map((s) => (
              <div key={s.num} style={{
                background: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: 14,
                padding: 22,
                position: 'relative',
                transition: 'transform 200ms, box-shadow 200ms',
                cursor: 'default',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 12px 24px ${s.color}22`; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: `${s.color}15`, color: s.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, marginBottom: 12,
                }}>{s.icon}</div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: s.color, letterSpacing: 0.5 }}>
                  ÉTAPE {s.num}
                </p>
                <h3 style={{ margin: '4px 0 8px', fontSize: 18, fontWeight: 700, color: '#0F172A' }}>{s.title}</h3>
                <p style={{ margin: 0, fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3 FILIÈRES ─────────────────────────────────────────────── */}
      <section style={{ padding: '64px 32px', background: 'white' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1B4F72', textTransform: 'uppercase', letterSpacing: 0.6 }}>
              EM Alger Business School
            </p>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', fontWeight: 800, margin: '8px 0 0', color: '#0F172A' }}>
              3 filières, 9 promotions, 1 plateforme
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {FILIERES.map((f) => {
              const Icon = f.Icon;
              return (
                <div key={f.id} style={{
                  background: f.bg, borderRadius: 18, padding: 28,
                  border: `1px solid ${f.color}22`,
                  transition: 'transform 200ms',
                }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ width: 52, height: 52, borderRadius: 12, background: f.gradient, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                    <Icon size={26} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{f.name}</h3>
                  <p style={{ margin: '4px 0 14px', fontSize: 13, color: f.color, fontWeight: 600 }}>{f.subtitle}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {f.modules.map((m) => (
                      <span key={m} style={{ padding: '4px 10px', background: 'white', color: f.color, borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{m}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── POUR LES ÉTUDIANTS ─────────────────────────────────────── */}
      <section style={{ padding: '80px 32px', background: '#FAFBFC' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: 0.6 }}>
              Pour les étudiants
            </p>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', fontWeight: 800, margin: '8px 0 0', color: '#0F172A' }}>
              Tout ce qu'il te faut pour apprendre activement
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
            {STUDENT_FEATURES.map((f, i) => {
              const Icon = f.Icon;
              return (
                <div key={i} style={{
                  background: 'white', borderRadius: 14, padding: 22,
                  border: '1px solid #E5E7EB',
                  transition: 'transform 200ms, box-shadow 200ms',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${f.color}1A`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: `${f.color}15`, color: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <Icon size={22} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{f.title}</h3>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── POUR LES PROFS ─────────────────────────────────────────── */}
      <section style={{ padding: '80px 32px', background: 'white' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: 0.6 }}>
              Pour les professeurs
            </p>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', fontWeight: 800, margin: '8px 0 0', color: '#0F172A' }}>
              Préparez vos modules en 30 minutes au lieu de 3 heures
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
            {PROF_FEATURES.map((f, i) => {
              const Icon = f.Icon;
              return (
                <div key={i} style={{
                  background: 'white', borderRadius: 14, padding: 22,
                  border: '1px solid #E5E7EB',
                  transition: 'transform 200ms, box-shadow 200ms',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${f.color}1A`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: `${f.color}15`, color: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <Icon size={22} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{f.title}</h3>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── ADAPTÉ À L'ALGÉRIE ─────────────────────────────────────── */}
      <section style={{ padding: '80px 32px', background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#B45309', textTransform: 'uppercase', letterSpacing: 0.6 }}>
              🇩🇿 Conçu pour le contexte local
            </p>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', fontWeight: 800, margin: '8px 0 0', color: '#92400E' }}>
              Adapté à l'université algérienne
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
            {ALGERIA_FEATURES.map((f, i) => {
              const Icon = f.Icon;
              return (
                <div key={i} style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', borderRadius: 14, padding: 20, border: '1px solid rgba(180,83,9,0.15)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#B45309', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <Icon size={20} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#92400E' }}>{f.title}</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#78350F', lineHeight: 1.5 }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ───────────────────────────────────────────── */}
      <section style={{ padding: '80px 32px', background: '#FAFBFC' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1B4F72', textTransform: 'uppercase', letterSpacing: 0.6 }}>
              Ils l'utilisent
            </p>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', fontWeight: 800, margin: '8px 0 0', color: '#0F172A' }}>
              Ce que disent les premiers utilisateurs
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 14, padding: 22, border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <Quote size={20} color={t.color} style={{ opacity: 0.3, marginBottom: 8 }} />
                <p style={{ margin: 0, fontSize: 14, color: '#1E293B', lineHeight: 1.6, fontStyle: 'italic' }}>{t.text}</p>
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: `${t.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{t.avatar}</div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#0F172A' }}>{t.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#64748B' }}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ──────────────────────────────────────────────── */}
      <section style={{
        padding: '80px 32px',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #1B4F72 100%)',
        color: 'white', textAlign: 'center',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, margin: '0 0 14px', letterSpacing: '-0.02em' }}>
            Prêt à apprendre <span style={{ background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>autrement</span> ?
          </h2>
          <p style={{ fontSize: 16, opacity: 0.85, lineHeight: 1.6, margin: '0 0 28px', maxWidth: 540, marginInline: 'auto' }}>
            Rejoins les premières promos de l'EM Alger qui ont basculé sur le Cycle d'Apprentissage Inversé.
            Création de compte gratuite, validation par un admin sous 24h.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" style={{
              padding: '16px 32px',
              background: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
              color: '#0F172A', borderRadius: 12, textDecoration: 'none',
              fontWeight: 800, fontSize: 16,
              display: 'inline-flex', alignItems: 'center', gap: 8,
              boxShadow: '0 8px 24px rgba(245,158,11,.4)', transition: 'transform .15s',
            }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Créer mon compte <ArrowRight size={16} />
            </Link>
            <Link to="/login" style={{
              padding: '16px 28px', background: 'rgba(255,255,255,0.1)',
              color: 'white', border: '1.5px solid rgba(255,255,255,0.3)',
              borderRadius: 12, textDecoration: 'none',
              fontWeight: 700, fontSize: 15,
              display: 'inline-flex', alignItems: 'center', gap: 8,
              backdropFilter: 'blur(8px)',
            }}>
              J'ai déjà un compte
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────────────── */}
      <footer style={{ padding: '32px 32px 24px', background: '#0F172A', color: '#94A3B8', textAlign: 'center', fontSize: 12 }}>
        <p style={{ margin: 0 }}>FlipLearn © 2026 — Plateforme de Classe Inversée</p>
        <p style={{ margin: '4px 0 0' }}>Projet de Fin d'Études — Mohamed Assil SERAY · L3 ISIL · EM Alger Business School</p>
      </footer>

      {/* ─── ANIMATIONS CSS GLOBALES ───────────────────────────────── */}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeIn 0.6s ease both; }
      `}</style>
    </div>
  );
}
