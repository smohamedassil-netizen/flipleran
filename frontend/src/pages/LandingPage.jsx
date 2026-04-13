import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import {
  BookOpen, Video, Users, Brain, ArrowRight, CheckCircle,
  GraduationCap, PlayCircle, BarChart3, MessageSquare,
  Lightbulb, ChevronDown, Monitor, Layers, Menu, X,
  Clock, Home, Sparkles, Target
} from 'lucide-react';
import './LandingPage.css';

/* ── Scroll Reveal Hooks ──────────────────────────────────────────────── */

function useScrollReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('revealed'); obs.unobserve(el); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function useScrollRevealAll() {
  const ref = useRef(null);
  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          container.querySelectorAll('.reveal-child').forEach((child, i) => {
            child.style.transitionDelay = `${i * 120}ms`;
            child.classList.add('revealed');
          });
          obs.unobserve(container);
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(container);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ── Data ──────────────────────────────────────────────────────────────── */

const FEATURES = [
  { icon: Video,          title: 'Vidéos pédagogiques',      desc: 'Regardez des cours structurés à votre rythme, avec transcription automatique et analyse IA.' },
  { icon: Brain,          title: 'QCM intelligents',          desc: 'Des quiz générés par intelligence artificielle pour tester votre compréhension en temps réel.' },
  { icon: Users,          title: 'Apprentissage collaboratif', desc: 'Chat en temps réel, forums de discussion et projets de groupe entre étudiants.' },
  { icon: BarChart3,      title: 'Suivi de progression',      desc: 'Tableaux de bord, classements et badges pour visualiser vos progrès.' },
  { icon: GraduationCap,  title: 'Projets PBL',              desc: 'Apprentissage par problèmes avec des projets concrets et des rôles collaboratifs.' },
  { icon: MessageSquare,  title: 'Assistant IA',              desc: 'Un chatbot intelligent disponible 24h/24 pour répondre à vos questions.' },
];

const STEPS = [
  { icon: PlayCircle, num: '1', title: 'Regardez les cours',        desc: 'Visionnez les vidéos et ressources mises en ligne par votre professeur, chez vous, à votre rythme.' },
  { icon: Target,     num: '2', title: 'Testez vos connaissances',  desc: 'Répondez aux QCM et exercices interactifs pour vérifier votre compréhension avant le cours.' },
  { icon: Users,      num: '3', title: 'Participez en classe',      desc: 'En présentiel, échangez, débattez et travaillez sur des activités pratiques avec votre professeur.' },
  { icon: Sparkles,   num: '4', title: 'Progressez ensemble',       desc: 'Gagnez des points, débloquez des badges et montez dans le classement avec vos camarades.' },
];

/* ══════════════════════════════════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  /* refs for reveal */
  const videoRef     = useScrollReveal();
  const methodeRef   = useScrollReveal();
  const featuresRef  = useScrollRevealAll();
  const stepsRef     = useScrollRevealAll();
  const ctaRef       = useScrollReveal();

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" }}>

      {/* ═══ A. NAVBAR ═══════════════════════════════════════════════════════ */}
      <nav
        className={`landing-nav fixed top-0 left-0 right-0 z-50 ${scrolled ? 'scrolled' : ''}`}
        style={{ padding: '0 24px' }}
      >
        <div className="flex items-center justify-between" style={{ maxWidth: 1200, margin: '0 auto', height: 72 }}>
          <Link to="/welcome" style={{ textDecoration: 'none' }}>
            <Logo variant="full" size={32} />
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center" style={{ gap: 12 }}>
            <button
              onClick={() => scrollToSection('methode')}
              className="btn-landing"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: scrolled ? '#1B4F72' : '#fff', fontWeight: 600, fontSize: 14,
                padding: '8px 16px', borderRadius: 8,
              }}
            >
              La méthode
            </button>
            <button
              onClick={() => scrollToSection('fonctionnalites')}
              className="btn-landing"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: scrolled ? '#1B4F72' : '#fff', fontWeight: 600, fontSize: 14,
                padding: '8px 16px', borderRadius: 8,
              }}
            >
              Fonctionnalités
            </button>
            <Link
              to="/login"
              className="btn-landing"
              style={{
                textDecoration: 'none', fontWeight: 600, fontSize: 14,
                padding: '10px 20px', borderRadius: 8,
                color: scrolled ? '#1B4F72' : '#fff',
                border: `2px solid ${scrolled ? '#1B4F72' : 'rgba(255,255,255,0.5)'}`,
                background: 'transparent',
              }}
            >
              Se connecter
            </Link>
            <Link
              to="/register"
              className="btn-landing"
              style={{
                textDecoration: 'none', fontWeight: 700, fontSize: 14,
                padding: '10px 20px', borderRadius: 8,
                color: '#fff', backgroundColor: '#E8A838',
                boxShadow: '0 2px 8px rgba(232,168,56,0.3)',
              }}
            >
              S'inscrire
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: scrolled ? '#1B4F72' : '#fff', padding: 8,
            }}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div
            className="md:hidden"
            style={{
              background: '#fff', padding: '16px 24px', borderTop: '1px solid #e5e7eb',
              display: 'flex', flexDirection: 'column', gap: 12,
            }}
          >
            <button onClick={() => scrollToSection('methode')} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '8px 0', color: '#1B4F72', fontWeight: 600, fontSize: 15 }}>
              La méthode
            </button>
            <button onClick={() => scrollToSection('fonctionnalites')} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '8px 0', color: '#1B4F72', fontWeight: 600, fontSize: 15 }}>
              Fonctionnalités
            </button>
            <Link to="/login" style={{ padding: '10px 0', color: '#1B4F72', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
              Se connecter
            </Link>
            <Link to="/register" style={{ display: 'inline-block', padding: '12px 24px', borderRadius: 8, backgroundColor: '#E8A838', color: '#fff', fontWeight: 700, fontSize: 15, textDecoration: 'none', textAlign: 'center' }}>
              S'inscrire
            </Link>
          </div>
        )}
      </nav>

      {/* ═══ B. HERO ═════════════════════════════════════════════════════════ */}
      <section className="hero-gradient" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 24px 80px' }}>
        {/* Floating shapes */}
        <div className="float-shape float-shape-1" />
        <div className="float-shape float-shape-2" />
        <div className="float-shape float-shape-3" />
        <div className="float-shape float-shape-4" />

        <div style={{ maxWidth: 800, textAlign: 'center', position: 'relative', zIndex: 1 }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 20px', borderRadius: 100,
            backgroundColor: 'rgba(232, 168, 56, 0.15)',
            color: '#E8A838', fontWeight: 600, fontSize: 13,
            marginBottom: 28, letterSpacing: '0.02em',
          }}>
            <Lightbulb size={16} />
            Plateforme de Classe Inversée
          </div>

          <h1 style={{
            color: '#fff', fontWeight: 800, lineHeight: 1.15,
            fontSize: 'clamp(32px, 6vw, 56px)',
            marginBottom: 20, letterSpacing: '-0.02em',
          }}>
            Apprenez autrement avec{' '}
            <span style={{ color: '#E8A838' }}>la classe inversée</span>
          </h1>

          <p style={{
            color: 'rgba(255,255,255,0.8)', fontSize: 'clamp(16px, 2.5vw, 20px)',
            lineHeight: 1.6, maxWidth: 600, margin: '0 auto 36px',
          }}>
            FlipLearn transforme l'apprentissage : regardez les cours chez vous,
            puis participez activement en classe. Une méthode prouvée pour mieux
            comprendre et retenir.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/register"
              className="btn-landing"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 32px', borderRadius: 10,
                backgroundColor: '#E8A838', color: '#fff',
                fontWeight: 700, fontSize: 16, textDecoration: 'none',
                boxShadow: '0 4px 15px rgba(232,168,56,0.35)',
              }}
            >
              Commencer maintenant <ArrowRight size={18} />
            </Link>
            <button
              onClick={() => scrollToSection('methode')}
              className="btn-landing"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 32px', borderRadius: 10,
                backgroundColor: 'transparent', color: '#fff',
                fontWeight: 600, fontSize: 16, cursor: 'pointer',
                border: '2px solid rgba(255,255,255,0.4)',
              }}
            >
              Découvrir la méthode
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="scroll-indicator"
          style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
          onClick={() => scrollToSection('video')}
        >
          <ChevronDown size={28} />
        </div>
      </section>

      {/* ═══ C. VIDEO ════════════════════════════════════════════════════════ */}
      <section id="video" ref={videoRef} className="reveal-on-scroll" style={{ padding: '80px 24px', backgroundColor: '#fff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <span style={{ color: '#E8A838', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Vidéo explicative
          </span>
          <h2 style={{ color: '#1B4F72', fontWeight: 800, fontSize: 'clamp(24px, 4vw, 36px)', marginTop: 8, marginBottom: 12 }}>
            Découvrez la classe inversée en vidéo
          </h2>
          <p style={{ color: '#64748b', fontSize: 16, maxWidth: 550, margin: '0 auto 40px', lineHeight: 1.6 }}>
            Comprenez en quelques minutes le principe de la pédagogie inversée
            et pourquoi elle révolutionne l'apprentissage.
          </p>

          <div className="video-container">
            <iframe
              src="https://www.youtube.com/embed/qdKzSq_t8k8"
              title="La classe inversée - Vidéo explicative"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      {/* ═══ D. QU'EST-CE QUE LA CLASSE INVERSÉE ? ═════════════════════════ */}
      <section id="methode" ref={methodeRef} className="reveal-on-scroll section-alt" style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ color: '#E8A838', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              La méthode
            </span>
            <h2 style={{ color: '#1B4F72', fontWeight: 800, fontSize: 'clamp(24px, 4vw, 36px)', marginTop: 8, marginBottom: 12 }}>
              Qu'est-ce que la classe inversée ?
            </h2>
            <p style={{ color: '#64748b', fontSize: 16, maxWidth: 650, margin: '0 auto', lineHeight: 1.6 }}>
              La classe inversée renverse l'ordre traditionnel : les étudiants découvrent le cours
              avant la séance, puis utilisent le temps en classe pour pratiquer et approfondir.
            </p>
          </div>

          {/* Comparison Cards */}
          <div className="flex flex-col md:flex-row" style={{ gap: 24, justifyContent: 'center' }}>
            {/* Traditional */}
            <div
              className="comparison-card"
              style={{
                flex: 1, maxWidth: 480, padding: 32, borderRadius: 16,
                backgroundColor: '#fff', border: '2px solid #e5e7eb',
                textAlign: 'center',
              }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <BookOpen size={28} color="#94a3b8" />
              </div>
              <h3 style={{ fontWeight: 700, fontSize: 20, color: '#64748b', marginBottom: 16 }}>
                Méthode traditionnelle
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 10, backgroundColor: '#f8fafc' }}>
                  <Home size={18} color="#94a3b8" />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14, color: '#64748b' }}>En classe</p>
                    <p style={{ fontSize: 13, color: '#94a3b8' }}>Écouter le cours magistral</p>
                  </div>
                </div>
                <div style={{ textAlign: 'center', color: '#d1d5db', fontSize: 20 }}>{'↓'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 10, backgroundColor: '#f8fafc' }}>
                  <Clock size={18} color="#94a3b8" />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14, color: '#64748b' }}>À la maison</p>
                    <p style={{ fontSize: 13, color: '#94a3b8' }}>Faire les exercices seul</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Flipped */}
            <div
              className="comparison-card"
              style={{
                flex: 1, maxWidth: 480, padding: 32, borderRadius: 16,
                backgroundColor: '#fff', border: '2px solid #E8A838',
                textAlign: 'center', boxShadow: '0 4px 20px rgba(232,168,56,0.1)',
              }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1B4F72, #2874A6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <Layers size={28} color="#fff" />
              </div>
              <h3 style={{ fontWeight: 700, fontSize: 20, color: '#1B4F72', marginBottom: 16 }}>
                Classe inversée
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 10, backgroundColor: '#EBF3FA' }}>
                  <Monitor size={18} color="#1B4F72" />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14, color: '#1B4F72' }}>À la maison</p>
                    <p style={{ fontSize: 13, color: '#2874A6' }}>Regarder les vidéos du cours</p>
                  </div>
                </div>
                <div style={{ textAlign: 'center', color: '#E8A838', fontSize: 20 }}>{'↓'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 10, backgroundColor: '#EBF3FA' }}>
                  <Users size={18} color="#1B4F72" />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14, color: '#1B4F72' }}>En classe</p>
                    <p style={{ fontSize: 13, color: '#2874A6' }}>Pratiquer et collaborer activement</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key benefits */}
          <div style={{ marginTop: 48, display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
            {[
              'Apprentissage à votre rythme',
              'Plus de temps pour la pratique',
              'Meilleure rétention des connaissances',
              'Interaction renforcée avec le professeur',
            ].map((text, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 100,
                  backgroundColor: '#EBF3FA', color: '#1B4F72',
                  fontWeight: 600, fontSize: 14,
                }}
              >
                <CheckCircle size={16} color="#E8A838" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ E. FONCTIONNALITÉS ══════════════════════════════════════════════ */}
      <section id="fonctionnalites" ref={featuresRef} style={{ padding: '80px 24px', backgroundColor: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ color: '#E8A838', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Fonctionnalités
            </span>
            <h2 style={{ color: '#1B4F72', fontWeight: 800, fontSize: 'clamp(24px, 4vw, 36px)', marginTop: 8, marginBottom: 12 }}>
              Pourquoi FlipLearn ?
            </h2>
            <p style={{ color: '#64748b', fontSize: 16, maxWidth: 550, margin: '0 auto', lineHeight: 1.6 }}>
              Tous les outils dont vous avez besoin pour réussir votre apprentissage,
              réunis dans une seule plateforme.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 20 }}>
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <div
                key={i}
                className="feature-card reveal-child"
                style={{
                  padding: 28, borderRadius: 16,
                  backgroundColor: '#fff', border: '1px solid #e5e7eb',
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: i % 2 === 0
                    ? 'linear-gradient(135deg, #1B4F72, #2874A6)'
                    : 'linear-gradient(135deg, #E8A838, #D4952A)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16,
                }}>
                  <Icon size={22} color="#fff" />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 17, color: '#1B4F72', marginBottom: 8 }}>
                  {title}
                </h3>
                <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ F. COMMENT ÇA MARCHE ════════════════════════════════════════════ */}
      <section ref={stepsRef} className="section-alt" style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span style={{ color: '#E8A838', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Comment ça marche
            </span>
            <h2 style={{ color: '#1B4F72', fontWeight: 800, fontSize: 'clamp(24px, 4vw, 36px)', marginTop: 8, marginBottom: 12 }}>
              4 étapes pour transformer votre apprentissage
            </h2>
          </div>

          <div className="steps-container">
            <div className="step-connector" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style={{ gap: 24, position: 'relative', zIndex: 1 }}>
              {STEPS.map(({ icon: Icon, num, title, desc }, i) => (
                <div
                  key={i}
                  className="reveal-child"
                  style={{ textAlign: 'center', padding: '0 8px' }}
                >
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #E8A838, #D4952A)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px', boxShadow: '0 4px 15px rgba(232,168,56,0.25)',
                    position: 'relative',
                  }}>
                    <span style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>{num}</span>
                  </div>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    backgroundColor: '#EBF3FA', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '-8px auto 12px',
                  }}>
                    <Icon size={20} color="#1B4F72" />
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: 16, color: '#1B4F72', marginBottom: 8 }}>
                    {title}
                  </h3>
                  <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.5 }}>
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ G. CTA BANNER ═══════════════════════════════════════════════════ */}
      <section ref={ctaRef} className="reveal-on-scroll cta-gradient" style={{ padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 650, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 'clamp(24px, 4vw, 36px)', marginBottom: 16 }}>
            Prêt à transformer votre apprentissage ?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 17, lineHeight: 1.6, marginBottom: 32 }}>
            Rejoignez FlipLearn gratuitement et découvrez une nouvelle façon d'apprendre,
            plus efficace et plus engageante.
          </p>
          <Link
            to="/register"
            className="btn-landing"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '16px 36px', borderRadius: 10,
              backgroundColor: '#E8A838', color: '#fff',
              fontWeight: 700, fontSize: 17, textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(232,168,56,0.35)',
            }}
          >
            Créer un compte gratuitement <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* ═══ H. FOOTER ═══════════════════════════════════════════════════════ */}
      <footer className="landing-footer" style={{ borderTop: '1px solid #e5e7eb', padding: '48px 24px 32px', backgroundColor: '#f8fafc' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 40 }}>
            {/* Col 1 */}
            <div>
              <Logo variant="full" size={28} />
              <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, marginTop: 12 }}>
                FlipLearn est une plateforme éducative basée sur la pédagogie inversée,
                conçue pour améliorer l'expérience d'apprentissage des étudiants universitaires.
              </p>
            </div>

            {/* Col 2 */}
            <div>
              <h4 style={{ fontWeight: 700, fontSize: 15, color: '#1B4F72', marginBottom: 12 }}>
                Liens utiles
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link to="/login" style={{ color: '#64748b', fontSize: 14, textDecoration: 'none' }}>Se connecter</Link>
                <Link to="/register" style={{ color: '#64748b', fontSize: 14, textDecoration: 'none' }}>Créer un compte</Link>
                <button onClick={() => scrollToSection('methode')} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#64748b', fontSize: 14, padding: 0 }}>
                  La classe inversée
                </button>
                <button onClick={() => scrollToSection('fonctionnalites')} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#64748b', fontSize: 14, padding: 0 }}>
                  Fonctionnalités
                </button>
              </div>
            </div>

            {/* Col 3 */}
            <div>
              <h4 style={{ fontWeight: 700, fontSize: 15, color: '#1B4F72', marginBottom: 12 }}>
                À propos
              </h4>
              <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
                Projet de Fin d'Études réalisé dans le cadre de la Licence en Informatique,
                spécialité Ingénierie des Systèmes d'Information et du Logiciel (ISIL).
              </p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 32, paddingTop: 20, textAlign: 'center' }}>
            <p style={{ color: '#94a3b8', fontSize: 13 }}>
              {'© '}
              {new Date().getFullYear()}
              {' FlipLearn — Projet de Fin d\'Études — Licence Informatique ISIL'}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
