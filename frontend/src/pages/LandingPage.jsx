import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import {
  Play, ArrowRight, ChevronRight, Sparkles, BookOpen, Users, Trophy,
  Video, FileText, MessageSquare, Gift, Bot, CheckCircle, Zap, Target,
  Brain, GraduationCap, Briefcase, Calculator, Star, TrendingUp, Clock,
  Shield, Award, Layers, Quote,
} from 'lucide-react';

const FILIERES = [
  {
    id: 'ISIL',
    name: 'Informatique (ISIL)',
    subtitle: 'Ingénierie Système & Logiciel',
    color: '#1B4F72',
    gradient: 'linear-gradient(135deg, #1B4F72 0%, #2874A6 100%)',
    bg: '#EFF6FF',
    Icon: Brain,
    modules: ['Algorithmique', 'Web & Mobile', 'IA & Data', 'Cybersécurité', 'Base de données'],
    description: 'Maîtrise la programmation, l\'IA et le développement full-stack.',
  },
  {
    id: 'Management',
    name: 'Management',
    subtitle: 'Stratégie & Organisation',
    color: '#D97706',
    gradient: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
    bg: '#FFFBEB',
    Icon: Briefcase,
    modules: ['Stratégie d\'entreprise', 'Ressources humaines', 'Marketing', 'Leadership', 'Entrepreneuriat'],
    description: 'Forme-toi aux meilleurs outils du management moderne.',
  },
  {
    id: 'Finance',
    name: 'Finance & Comptabilité',
    subtitle: 'Analyse & Audit',
    color: '#059669',
    gradient: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
    bg: '#F0FDF4',
    Icon: Calculator,
    modules: ['Comptabilité', 'Analyse financière', 'Audit', 'IFRS', 'Finance de marché'],
    description: 'Deviens expert en finance d\'entreprise et comptabilité.',
  },
];

const FEATURES = [
  { Icon: Video,        title: 'Vidéos courtes découpées',   desc: 'Chapitres de 5-10 min, tu apprends à ton rythme.', color: '#7C3AED' },
  { Icon: Bot,          title: 'IA spécialisée par module',  desc: 'Un assistant dédié par cours qui connaît ton contenu.', color: '#1B4F72' },
  { Icon: FileText,     title: 'QCM auto-corrigés',          desc: 'Teste tes connaissances et débloque des badges.', color: '#059669' },
  { Icon: Users,        title: 'Projets collaboratifs',      desc: 'Prosits CESI, groupes avec rôles, livrables.', color: '#D97706' },
  { Icon: MessageSquare,title: 'Chat temps réel',           desc: 'Discute avec ta promo et tes profs.', color: '#6366F1' },
  { Icon: Gift,         title: 'Récompenses réelles',        desc: 'Certifs, réductions, cadeaux — pas juste des points.', color: '#EC4899' },
];

const STEPS = [
  { num: '01', title: 'Regarde la vidéo', desc: 'Chez toi, à ton rythme, chapitres courts et transcrit par IA.', Icon: Video },
  { num: '02', title: 'Teste-toi (QCM)',  desc: 'Auto-évaluation instantanée, gagne des points.', Icon: FileText },
  { num: '03', title: 'En cours/prosit',  desc: 'Tu arrives préparé, le prof anime, tu pratiques en projet.', Icon: Users },
  { num: '04', title: 'Échange tes points', desc: 'Contre des certifs, des réductions, des cadeaux réels.', Icon: Gift },
];

const TESTIMONIALS = [
  {
    name: 'Yasmine B.',
    role: 'L3 ISIL · EM Alger',
    avatar: '🎓',
    text: 'L\'assistant IA m\'a sauvé pendant la période d\'examens. Il connaît mes cours mieux que moi.',
    color: '#1B4F72',
  },
  {
    name: 'Mehdi S.',
    role: 'L2 Management',
    avatar: '📈',
    text: 'Les vidéos courtes c\'est génial. Je peux réviser 10 min dans le bus et faire un QCM.',
    color: '#D97706',
  },
  {
    name: 'Amira H.',
    role: 'L3 Finance',
    avatar: '💼',
    text: 'J\'ai gagné ma première certif gratuite grâce aux points. Ça motive vraiment à bosser.',
    color: '#059669',
  },
];

const STATS = [
  { num: '27+',  label: 'Cours disponibles' },
  { num: '500+', label: 'Étudiants actifs' },
  { num: '3',    label: 'Spécialités' },
  { num: '24/7', label: 'Assistant IA' },
];

const DEMO_CHAT = [
  { from: 'user', text: 'Explique-moi les pointeurs en C, je galère.' },
  { from: 'bot',  text: 'Bien sûr ! Un pointeur est une variable qui contient l\'adresse mémoire d\'une autre variable. Dans ton cours "Programmation C - chapitre 4", regarde la vidéo à 12:30 où c\'est expliqué avec un schéma. Veux-tu un exemple concret ?' },
];

export default function LandingPage() {
  const [demoIndex, setDemoIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDemoIndex(i => (i + 1) % (DEMO_CHAT.length + 1));
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'white', overflow: 'hidden' }}>
      {/* Navigation */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        padding: '14px 32px',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Logo variant="full" />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link to="/login" style={{ padding: '9px 16px', textDecoration: 'none', color: '#1B4F72', fontWeight: 600, fontSize: 14 }}>
            Se connecter
          </Link>
          <Link to="/register" style={{
            padding: '9px 18px', textDecoration: 'none',
            background: 'linear-gradient(135deg, #1B4F72, #2874A6)',
            color: 'white', borderRadius: 10, fontWeight: 700, fontSize: 14,
            display: 'inline-flex', alignItems: 'center', gap: 5,
            boxShadow: '0 2px 10px rgba(27,79,114,.25)',
          }}>
            Commencer <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ padding: '64px 32px 48px', background: 'radial-gradient(ellipse at top, #EFF6FF 0%, white 50%)', position: 'relative' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 48, alignItems: 'center' }}>
          <div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)', color: '#92400E', borderRadius: 999, fontSize: 12, fontWeight: 700, marginBottom: 20 }}>
              <Sparkles size={12} /> Nouvelle plateforme · EM Alger Business School
            </span>

            <h1 style={{ fontSize: '3.25rem', fontWeight: 900, color: '#0F172A', lineHeight: 1.1, margin: 0, marginBottom: 18, letterSpacing: '-0.03em' }}>
              La classe inversée, <br />
              <span style={{ background: 'linear-gradient(135deg, #1B4F72 0%, #2874A6 60%, #D97706 120%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                boostée par l'IA.
              </span>
            </h1>
            <p style={{ fontSize: 17, color: '#475569', lineHeight: 1.6, maxWidth: 540, margin: 0, marginBottom: 28 }}>
              FlipLearn est la plateforme de l'EM Alger qui transforme ton apprentissage : vidéos courtes, assistant IA dédié à chaque module, projets collaboratifs et vraies récompenses pour te motiver.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
              <Link to="/register" style={{
                padding: '14px 28px', background: 'linear-gradient(135deg, #1B4F72, #2874A6)',
                color: 'white', borderRadius: 12, textDecoration: 'none',
                fontWeight: 700, fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8,
                boxShadow: '0 8px 24px rgba(27,79,114,.25)', transition: 'transform .15s',
              }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Créer mon compte <ArrowRight size={16} />
              </Link>
              <a href="#how-it-works" style={{
                padding: '14px 22px', background: 'white', color: '#1B4F72',
                border: '2px solid #E5E7EB', borderRadius: 12, textDecoration: 'none',
                fontWeight: 700, fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>
                <Play size={14} fill="#1B4F72" /> Comment ça marche ?
              </a>
            </div>

            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              {STATS.map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#1B4F72' }}>{s.num}</div>
                  <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Demo chatbot visual */}
          <div style={{ position: 'relative' }}>
            <div style={{
              background: 'white', borderRadius: 20, padding: 22,
              boxShadow: '0 25px 60px rgba(27,79,114,.18), 0 8px 20px rgba(0,0,0,.06)',
              transform: 'rotate(-1.5deg)', border: '1px solid #E5E7EB',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #F1F5F9' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #1B4F72, #2874A6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🤖</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>Assistant Algo-Bot</div>
                  <div style={{ fontSize: 11, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} /> En ligne · Module Algorithmique
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 180 }}>
                {DEMO_CHAT.slice(0, demoIndex + 1).map((msg, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 8,
                    flexDirection: msg.from === 'bot' ? 'row' : 'row-reverse',
                    animation: 'fade-in-up 0.4s ease both',
                  }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: msg.from === 'bot' ? '#1B4F72' : '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, color: 'white' }}>
                      {msg.from === 'bot' ? '🤖' : '👤'}
                    </div>
                    <div style={{
                      maxWidth: '80%', padding: '9px 13px',
                      background: msg.from === 'bot' ? '#F1F5F9' : '#1B4F72',
                      color: msg.from === 'bot' ? '#1E293B' : 'white',
                      borderRadius: msg.from === 'bot' ? '12px 12px 12px 2px' : '12px 12px 2px 12px',
                      fontSize: 13, lineHeight: 1.4,
                    }}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {demoIndex >= DEMO_CHAT.length && (
                  <div style={{ textAlign: 'center', fontSize: 11, color: '#94A3B8', fontStyle: 'italic', padding: 8 }}>
                    ↻ Démo — relance dans quelques secondes
                  </div>
                )}
              </div>
            </div>

            <div style={{ position: 'absolute', top: -18, right: -10, padding: '8px 14px', background: 'white', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.08)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#059669', border: '1px solid #D1FAE5', transform: 'rotate(3deg)' }}>
              <Zap size={13} /> +50 pts gagnés
            </div>
            <div style={{ position: 'absolute', bottom: -14, left: -8, padding: '6px 12px', background: 'white', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.08)', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#D97706', border: '1px solid #FDE68A', transform: 'rotate(-2deg)' }}>
              🔥 3 combos
            </div>
          </div>
        </div>
      </section>

      {/* FILIÈRES */}
      <section style={{ padding: '64px 32px', background: '#F8FAFC' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span style={{ display: 'inline-block', padding: '5px 12px', background: '#EFF6FF', color: '#1B4F72', borderRadius: 999, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>3 SPÉCIALITÉS</span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0F172A', margin: 0, marginBottom: 10, letterSpacing: '-0.02em' }}>
              Conçu pour ta filière
            </h2>
            <p style={{ color: '#64748B', fontSize: 16, maxWidth: 560, margin: '0 auto' }}>
              Chaque filière a son propre parcours, ses modules et son assistant IA spécialisé.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {FILIERES.map(f => {
              const Icon = f.Icon;
              return (
                <div key={f.id} style={{
                  padding: 28, borderRadius: 20, background: 'white',
                  border: '1px solid #E5E7EB',
                  transition: 'transform .2s, box-shadow .2s',
                  position: 'relative', overflow: 'hidden',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 20px 40px ${f.color}20`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: f.bg, opacity: 0.5 }} />
                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'inline-flex', width: 56, height: 56, borderRadius: 14, background: f.gradient, alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: `0 8px 20px ${f.color}33` }}>
                      <Icon size={26} color="white" />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: f.color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                      {f.subtitle}
                    </div>
                    <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: 0, marginBottom: 10 }}>{f.name}</h3>
                    <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.5, marginBottom: 14 }}>{f.description}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {f.modules.map(m => (
                        <span key={m} style={{ padding: '3px 10px', background: f.bg, color: f.color, borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
                          {m}
                        </span>
                      ))}
                    </div>
                    <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #F1F5F9', fontSize: 12, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <GraduationCap size={13} /> L1 · L2 · L3
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section id="how-it-works" style={{ padding: '72px 32px', background: 'white' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ display: 'inline-block', padding: '5px 12px', background: '#F0FDF4', color: '#059669', borderRadius: 999, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>LA MÉTHODE</span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0F172A', margin: 0, marginBottom: 10, letterSpacing: '-0.02em' }}>
              La classe inversée, simplement
            </h2>
            <p style={{ color: '#64748B', fontSize: 16, maxWidth: 560, margin: '0 auto' }}>
              Tu prépares à la maison, tu pratiques en classe. Plus efficace, plus engageant.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            {STEPS.map((s) => {
              const Icon = s.Icon;
              return (
                <div key={s.num} style={{
                  padding: 24, borderRadius: 16, background: 'white',
                  border: '1px solid #E5E7EB', height: '100%',
                }}>
                  <div style={{ display: 'inline-flex', width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #1B4F72, #2874A6)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                    <Icon size={20} color="white" />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#1B4F72', marginBottom: 4, letterSpacing: 2 }}>
                    ÉTAPE {s.num}
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0, marginBottom: 6 }}>{s.title}</h3>
                  <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '64px 32px', background: 'linear-gradient(180deg, #F8FAFC 0%, white 100%)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span style={{ display: 'inline-block', padding: '5px 12px', background: '#F5F3FF', color: '#7C3AED', borderRadius: 999, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>FONCTIONNALITÉS</span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0F172A', margin: 0, marginBottom: 10, letterSpacing: '-0.02em' }}>
              Tout ce qu'il te faut pour réussir
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {FEATURES.map((f) => {
              const Icon = f.Icon;
              return (
                <div key={f.title} style={{
                  padding: 22, borderRadius: 14, background: 'white', border: '1px solid #E5E7EB',
                  display: 'flex', gap: 14,
                  transition: 'transform .2s, border-color .2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = f.color; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
                >
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: f.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={20} color={f.color} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0, marginBottom: 4 }}>{f.title}</h3>
                    <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5, margin: 0 }}>{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* TÉMOIGNAGES */}
      <section style={{ padding: '64px 32px', background: 'white' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span style={{ display: 'inline-block', padding: '5px 12px', background: '#FFF7ED', color: '#D97706', borderRadius: 999, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>TÉMOIGNAGES</span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
              Ils apprennent avec FlipLearn
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
            {TESTIMONIALS.map(t => (
              <div key={t.name} style={{ padding: 24, borderRadius: 16, background: 'white', border: '1px solid #E5E7EB', position: 'relative' }}>
                <Quote size={28} color={t.color} style={{ opacity: 0.15, position: 'absolute', top: 16, right: 16 }} />
                <p style={{ fontSize: 14, color: '#1E293B', lineHeight: 1.6, margin: 0, marginBottom: 14, fontStyle: 'italic' }}>
                  "{t.text}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: t.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>{t.role}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 2, marginTop: 10 }}>
                  {[1,2,3,4,5].map(i => <Star key={i} size={12} color="#F59E0B" fill="#F59E0B" />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ padding: '72px 32px', background: 'linear-gradient(135deg, #1B4F72 0%, #2874A6 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />

        <div style={{ maxWidth: 820, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <Sparkles size={38} color="#FCD34D" style={{ marginBottom: 14 }} />
          <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: 'white', margin: 0, marginBottom: 12, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Prêt à booster ton apprentissage ?
          </h2>
          <p style={{ color: 'rgba(255,255,255,.85)', fontSize: 16, lineHeight: 1.6, margin: 0, marginBottom: 28, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
            Rejoins FlipLearn gratuitement, ton compte est validé par ton école en 24h.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" style={{
              padding: '14px 32px', background: 'white', color: '#1B4F72',
              borderRadius: 12, textDecoration: 'none', fontWeight: 700, fontSize: 15,
              display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 24px rgba(0,0,0,.15)',
            }}>
              Créer mon compte gratuit <ArrowRight size={16} />
            </Link>
            <Link to="/login" style={{
              padding: '14px 28px', background: 'rgba(255,255,255,.15)',
              color: 'white', borderRadius: 12, textDecoration: 'none',
              fontWeight: 700, fontSize: 15, border: '1px solid rgba(255,255,255,.3)',
            }}>
              J'ai déjà un compte
            </Link>
          </div>

          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', fontSize: 13, color: 'rgba(255,255,255,.75)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><CheckCircle size={14} /> 100% gratuit pour les étudiants</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Shield size={14} /> Validé par EM Alger</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Clock size={14} /> Activation sous 24h</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '32px', background: '#0F172A', color: '#94A3B8', textAlign: 'center', fontSize: 13 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 14 }}><Logo variant="full" /></div>
          <p style={{ margin: 0, marginBottom: 4 }}>Plateforme de Classe Inversée · EM Alger Business School</p>
          <p style={{ margin: 0, fontSize: 12 }}>Projet de Fin d'Études — Licence ISIL 2026 · © FlipLearn</p>
        </div>
      </footer>
    </div>
  );
}
