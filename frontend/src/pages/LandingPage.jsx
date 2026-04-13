import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import {
  BookOpen, Video, Users, Brain, ArrowRight, CheckCircle,
  GraduationCap, PlayCircle, BarChart3, MessageSquare,
  Lightbulb, ChevronDown, Monitor, Layers, Menu, X,
  Clock, Sparkles, Target, Send, Globe,
  Linkedin, Github, Star, Award, Zap, TrendingUp,
  Headphones, Shield
} from 'lucide-react';
import './LandingPage.css';

/* ══════════════════════════════════════════════════════════════════════════
   Hooks
   ══════════════════════════════════════════════════════════════════════════ */

function useScrollReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add('revealed'); obs.unobserve(el); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function useScrollRevealAll() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          c.querySelectorAll('.lp-reveal-child').forEach((ch, i) => {
            ch.style.transitionDelay = `${i * 100}ms`;
            ch.classList.add('revealed');
          });
          obs.unobserve(c);
        }
      },
      { threshold: 0.08 }
    );
    obs.observe(c);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function useCountUp(target, duration = 2000) {
  const ref = useRef(null);
  const [value, setValue] = useState(0);
  const hasRun = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !hasRun.current) {
          hasRun.current = true;
          obs.unobserve(el);
          const start = performance.now();
          const step = (now) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            setValue(Math.round(eased * target));
            if (t < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration]);

  return [ref, value];
}

/* ══════════════════════════════════════════════════════════════════════════
   Data
   ══════════════════════════════════════════════════════════════════════════ */

const FEATURES = [
  { icon: Video, title: 'Vidéos pédagogiques', desc: 'Cours structurés avec transcription automatique et analyse IA. Apprenez à votre rythme, où que vous soyez.', gradient: 'linear-gradient(135deg, #f0f7ff, #fff)', glow: 'rgba(27,79,114,0.12)', iconBg: 'linear-gradient(135deg, #1B4F72, #2874A6)', wide: true },
  { icon: Brain, title: 'QCM intelligents', desc: 'Quiz générés par IA pour tester votre compréhension en temps réel après chaque leçon.', gradient: 'linear-gradient(135deg, #fff9ef, #fff)', glow: 'rgba(232,168,56,0.12)', iconBg: 'linear-gradient(135deg, #E8A838, #D4952A)', wide: false },
  { icon: Users, title: 'Apprentissage collaboratif', desc: 'Chat temps réel, forums et projets de groupe pour apprendre ensemble.', gradient: 'linear-gradient(135deg, #f0fff4, #fff)', glow: 'rgba(39,103,73,0.1)', iconBg: 'linear-gradient(135deg, #276749, #38a169)', wide: false },
  { icon: BarChart3, title: 'Suivi de progression', desc: 'Dashboards, classements et badges pour visualiser vos progrès et rester motivé.', gradient: 'linear-gradient(135deg, #fef6e7, #fff)', glow: 'rgba(232,168,56,0.1)', iconBg: 'linear-gradient(135deg, #E8A838, #D4952A)', wide: true },
  { icon: GraduationCap, title: 'Projets PBL', desc: 'Apprentissage par problèmes avec des projets concrets et des rôles collaboratifs.', gradient: 'linear-gradient(135deg, #f5f0ff, #fff)', glow: 'rgba(107,70,193,0.1)', iconBg: 'linear-gradient(135deg, #6b46c1, #805ad5)', wide: false },
  { icon: MessageSquare, title: 'Assistant IA', desc: 'Chatbot intelligent disponible 24h/24 pour répondre à toutes vos questions.', gradient: 'linear-gradient(135deg, #fff0f0, #fff)', glow: 'rgba(155,35,53,0.08)', iconBg: 'linear-gradient(135deg, #1B4F72, #2874A6)', wide: false },
];

const STEPS = [
  { icon: PlayCircle, title: 'Regardez les cours', desc: 'Visionnez les vidéos et ressources à votre rythme, chez vous, avant la séance.' },
  { icon: Target, title: 'Testez vos connaissances', desc: 'Répondez aux QCM interactifs pour vérifier votre compréhension.' },
  { icon: Users, title: 'Participez en classe', desc: 'Échangez, débattez et travaillez sur des activités pratiques avec votre professeur.' },
  { icon: Sparkles, title: 'Progressez ensemble', desc: 'Gagnez des points, débloquez des badges et montez dans le classement.' },
];

const MARQUEE_1 = [
  'Informatique', 'Mathématiques', 'Physique', 'Biologie', 'Chimie',
  'Génie Civil', 'Génie Électrique', 'Sciences de l\'éducation',
  'Licence ISIL', 'Master IA', 'Classe Inversée', 'E-Learning',
];
const MARQUEE_2 = [
  'Pédagogie active', 'QCM automatisés', 'Vidéos interactives', 'Projets collaboratifs',
  'Gamification', 'Chat en temps réel', 'Intelligence Artificielle', 'Apprentissage adaptatif',
  'Évaluation continue', 'Support 24/7', 'Badges & Récompenses', 'Tableau de bord',
];

const STATS = [
  { value: 2500, suffix: '+', label: 'Étudiants actifs' },
  { value: 50, suffix: '+', label: 'Cours disponibles' },
  { value: 95, suffix: '%', label: 'Taux de satisfaction' },
  { value: 24, suffix: '/7', label: 'Support disponible' },
];

const BEFORE = [
  { icon: Clock, text: 'Cours magistraux passifs et monotones' },
  { icon: BookOpen, text: 'Exercices seul à la maison, sans aide' },
  { icon: TrendingUp, text: 'Progression difficile à mesurer' },
];
const AFTER = [
  { icon: Video, text: 'Vidéos interactives à votre rythme' },
  { icon: Users, text: 'Collaboration active en classe' },
  { icon: BarChart3, text: 'Suivi en temps réel de vos progrès' },
];

const PARTICLES = [
  { top: '10%', left: '15%', dx: '80px', dy: '-120px', dur: '12s', delay: '0s' },
  { top: '20%', left: '80%', dx: '-60px', dy: '-100px', dur: '10s', delay: '2s' },
  { top: '70%', left: '10%', dx: '100px', dy: '-80px', dur: '14s', delay: '4s' },
  { top: '60%', left: '75%', dx: '-90px', dy: '-110px', dur: '11s', delay: '1s' },
  { top: '40%', left: '50%', dx: '70px', dy: '-90px', dur: '13s', delay: '3s' },
  { top: '80%', left: '40%', dx: '-50px', dy: '-130px', dur: '9s', delay: '5s' },
];

/* ══════════════════════════════════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const scrollTo = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  }, []);

  const videoRef      = useScrollReveal();
  const compRef       = useScrollRevealAll();
  const dividerRef    = useScrollReveal();
  const bentoRef      = useScrollRevealAll();
  const timelineRef   = useScrollRevealAll();
  const tlLineRef     = useScrollReveal();
  const statsRef      = useScrollRevealAll();
  const ctaRef        = useScrollReveal();

  const [s1Ref, s1Val] = useCountUp(STATS[0].value);
  const [s2Ref, s2Val] = useCountUp(STATS[1].value);
  const [s3Ref, s3Val] = useCountUp(STATS[2].value);
  const [s4Ref, s4Val] = useCountUp(STATS[3].value, 1500);
  const statVals = [s1Val, s2Val, s3Val, s4Val];
  const statRefs = [s1Ref, s2Ref, s3Ref, s4Ref];

  return (
    <div className="lp-root" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" }}>

      {/* ═══ 1. NAVBAR ═════════════════════════════════════════════════════ */}
      <nav className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <Link to="/welcome" style={{ textDecoration: 'none' }}>
            <Logo variant="full" size={32} />
          </Link>

          <div className="lp-nav-links">
            <button onClick={() => scrollTo('methode')} className="lp-nav-link"
              style={{ color: scrolled ? '#1B4F72' : 'rgba(255,255,255,0.9)' }}>
              La méthode
            </button>
            <button onClick={() => scrollTo('features')} className="lp-nav-link"
              style={{ color: scrolled ? '#1B4F72' : 'rgba(255,255,255,0.9)' }}>
              Fonctionnalités
            </button>
            <button onClick={() => scrollTo('timeline')} className="lp-nav-link"
              style={{ color: scrolled ? '#1B4F72' : 'rgba(255,255,255,0.9)' }}>
              Comment ça marche
            </button>
            <Link to="/login" className="lp-btn-login"
              style={{
                color: scrolled ? '#1B4F72' : '#fff',
                border: `2px solid ${scrolled ? '#1B4F72' : 'rgba(255,255,255,0.35)'}`,
                background: 'transparent',
              }}>
              Se connecter
            </Link>
            <Link to="/register" className="lp-btn-signup">S'inscrire</Link>
          </div>

          <button className="lp-hamburger" onClick={() => setMenuOpen(!menuOpen)}
            style={{ color: scrolled ? '#1B4F72' : '#fff' }}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {menuOpen && (
          <div className="lp-mobile-menu">
            <button onClick={() => scrollTo('methode')} className="lp-nav-link" style={{ color: '#1B4F72', textAlign: 'left', padding: '8px 0' }}>La méthode</button>
            <button onClick={() => scrollTo('features')} className="lp-nav-link" style={{ color: '#1B4F72', textAlign: 'left', padding: '8px 0' }}>Fonctionnalités</button>
            <Link to="/login" style={{ color: '#1B4F72', fontWeight: 600, fontSize: 15, textDecoration: 'none', padding: '8px 0' }}>Se connecter</Link>
            <Link to="/register" className="lp-btn-signup" style={{ textAlign: 'center', marginTop: 4 }}>S'inscrire</Link>
          </div>
        )}
      </nav>

      {/* ═══ 2. HERO ═══════════════════════════════════════════════════════ */}
      <section className="lp-hero">
        <div className="lp-hero-blob lp-hero-blob-1" />
        <div className="lp-hero-blob lp-hero-blob-2" />
        <div className="lp-hero-blob lp-hero-blob-3" />

        {PARTICLES.map((p, i) => (
          <div key={i} className="lp-particle" style={{
            top: p.top, left: p.left,
            '--dx': p.dx, '--dy': p.dy, '--dur': p.dur, '--delay': p.delay,
            animationDuration: p.dur, animationDelay: p.delay,
          }} />
        ))}

        <div className="lp-hero-content">
          <div className="lp-hero-text">
            <div className="lp-hero-badge">
              <Lightbulb size={16} />
              Plateforme de Classe Inversée
            </div>

            <h1 className="lp-hero-title">
              Apprenez autrement{' '}
              <br />
              avec <span className="accent">la classe inversée</span>
            </h1>

            <p className="lp-hero-subtitle">
              FlipLearn transforme l'apprentissage : regardez les cours chez vous,
              puis participez activement en classe. Une méthode prouvée pour mieux
              comprendre et retenir.
            </p>

            <div className="lp-hero-ctas">
              <Link to="/register" className="lp-btn-primary">
                Commencer gratuitement <ArrowRight size={18} />
              </Link>
              <button onClick={() => scrollTo('methode')} className="lp-btn-ghost">
                Découvrir la méthode
              </button>
            </div>
          </div>

          {/* Illustration */}
          <div className="lp-hero-illustration">
            <div className="lp-hero-orb" />
            <div className="lp-orbit-card lp-orbit-1"><BookOpen size={24} /></div>
            <div className="lp-orbit-card lp-orbit-2"><Video size={24} /></div>
            <div className="lp-orbit-card lp-orbit-3"><Brain size={24} /></div>
            <div className="lp-orbit-card lp-orbit-4"><Users size={24} /></div>

            <div className="lp-glass-stat lp-stat-pos-1">
              <div className="lp-glass-stat-value">2 500+</div>
              <div className="lp-glass-stat-label">Étudiants actifs</div>
            </div>
            <div className="lp-glass-stat lp-stat-pos-2">
              <div className="lp-glass-stat-value">95%</div>
              <div className="lp-glass-stat-label">Satisfaction</div>
            </div>
            <div className="lp-glass-stat lp-stat-pos-3">
              <div className="lp-glass-stat-value">50+</div>
              <div className="lp-glass-stat-label">Cours</div>
            </div>
          </div>
        </div>

        <div className="lp-scroll-indicator" onClick={() => scrollTo('marquee')}>
          <ChevronDown size={28} />
        </div>
      </section>

      {/* ═══ 3. MARQUEE ════════════════════════════════════════════════════ */}
      <section id="marquee" className="lp-marquee-section">
        <div className="lp-marquee-row">
          <div className="lp-marquee-track">
            {[...MARQUEE_1, ...MARQUEE_1].map((t, i) => (
              <span key={i} className="lp-marquee-item"><Star size={14} color="#E8A838" />{t}</span>
            ))}
          </div>
        </div>
        <div className="lp-marquee-row">
          <div className="lp-marquee-track lp-marquee-reverse">
            {[...MARQUEE_2, ...MARQUEE_2].map((t, i) => (
              <span key={i} className="lp-marquee-item"><Award size={14} color="#1B4F72" />{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 4. VIDEO ══════════════════════════════════════════════════════ */}
      <section className="lp-section" style={{ background: 'var(--lp-surface)' }}>
        <div className="lp-section-inner" ref={videoRef}>
          <div className="lp-section-header-center lp-reveal">
            <div className="lp-section-label">Vidéo explicative</div>
            <h2 className="lp-section-title">Découvrez la classe inversée en vidéo</h2>
            <p className="lp-section-subtitle">
              Comprenez en quelques minutes le principe de la pédagogie inversée
              et pourquoi elle révolutionne l'apprentissage.
            </p>
          </div>

          <div className="lp-video-wrapper lp-reveal">
            <div className="lp-video-blob" />

            <div className="lp-video-float lp-vf-1">
              <PlayCircle size={18} color="#E8A838" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1B4F72' }}>Lecture interactive</span>
            </div>
            <div className="lp-video-float lp-vf-2">
              <MessageSquare size={18} color="#1B4F72" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1B4F72' }}>Chat intégré</span>
            </div>
            <div className="lp-video-float lp-vf-3">
              <Brain size={18} color="#E8A838" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1B4F72' }}>QCM auto</span>
            </div>

            <div className="lp-device-frame">
              <div className="lp-device-dots">
                <div className="lp-device-dot" style={{ background: '#ff5f57' }} />
                <div className="lp-device-dot" style={{ background: '#febc2e' }} />
                <div className="lp-device-dot" style={{ background: '#28c840' }} />
              </div>
              <div className="lp-video-container">
                <iframe
                  src="https://www.youtube.com/embed/qdKzSq_t8k8"
                  title="La classe inversée"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            </div>
            <div className="lp-device-base" />
          </div>
        </div>
      </section>

      {/* ═══ 5. COMPARAISON ════════════════════════════════════════════════ */}
      <section id="methode" className="lp-section" style={{ background: 'var(--lp-bg-alt)' }}>
        <div className="lp-section-inner">
          <div className="lp-section-header-center">
            <div className="lp-section-label">La méthode</div>
            <h2 className="lp-section-title">Avant / Avec FlipLearn</h2>
            <p className="lp-section-subtitle">
              La classe inversée renverse l'ordre traditionnel pour un apprentissage
              plus actif, plus engageant et plus efficace.
            </p>
          </div>

          <div className="lp-comparison-grid" ref={compRef}>
            {/* Before */}
            <div className="lp-comparison-side">
              <div className="lp-comparison-label" style={{ color: 'var(--lp-text-light)' }}>
                <Clock size={20} /> Avant
              </div>
              {BEFORE.map(({ icon: Icon, text }, i) => (
                <div key={i} className="lp-comparison-item lp-before-item lp-reveal-child">
                  <div className="lp-ci-icon"><Icon size={20} color="#94a3b8" /></div>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>{text}</span>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="lp-comparison-divider">
              <div ref={dividerRef} className="lp-divider-line lp-reveal" />
              <div className="lp-divider-dot"><Zap size={20} /></div>
              <div ref={dividerRef} className="lp-divider-line lp-reveal" />
            </div>

            {/* After */}
            <div className="lp-comparison-side">
              <div className="lp-comparison-label" style={{ color: 'var(--lp-primary)' }}>
                <Sparkles size={20} color="#E8A838" /> Avec FlipLearn
              </div>
              {AFTER.map(({ icon: Icon, text }, i) => (
                <div key={i} className="lp-comparison-item lp-after-item lp-reveal-child">
                  <div className="lp-ci-icon"><Icon size={20} /></div>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 6. BENTO FEATURES ═════════════════════════════════════════════ */}
      <section id="features" className="lp-section" style={{ background: 'var(--lp-surface)' }}>
        <div className="lp-section-inner">
          <div className="lp-section-header-center">
            <div className="lp-section-label">Fonctionnalités</div>
            <h2 className="lp-section-title">Pourquoi choisir FlipLearn ?</h2>
            <p className="lp-section-subtitle">
              Tous les outils dont vous avez besoin pour réussir,
              réunis dans une seule plateforme intelligente.
            </p>
          </div>

          <div className="lp-bento-grid" ref={bentoRef}>
            {FEATURES.map(({ icon: Icon, title, desc, gradient, glow, iconBg, wide }, i) => (
              <div
                key={i}
                className={`lp-bento-card lp-reveal-child ${wide ? 'lp-bento-wide' : ''}`}
                style={{ '--card-bg': gradient, '--card-glow': glow }}
              >
                <div className="lp-bento-icon" style={{ background: iconBg }}>
                  <Icon size={26} color="#fff" />
                </div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 7. TIMELINE ═══════════════════════════════════════════════════ */}
      <section id="timeline" className="lp-section" style={{ background: 'var(--lp-bg-alt)' }}>
        <div className="lp-section-inner">
          <div className="lp-section-header-center">
            <div className="lp-section-label">Comment ça marche</div>
            <h2 className="lp-section-title">4 étapes pour transformer votre apprentissage</h2>
          </div>

          <div className="lp-timeline" ref={timelineRef}>
            <div className="lp-timeline-line lp-reveal" ref={tlLineRef} />

            {STEPS.map(({ icon: Icon, title, desc }, i) => (
              <div key={i} className="lp-timeline-step lp-reveal-child">
                <div className="lp-tl-node">{i + 1}</div>
                <div className="lp-tl-content">
                  <div className="lp-tl-icon"><Icon size={20} /></div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
                <div className="lp-tl-empty" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 8. STATS ══════════════════════════════════════════════════════ */}
      <section className="lp-stats" ref={statsRef}>
        <div className="lp-stats-grid">
          {STATS.map((stat, i) => (
            <div key={i} className="lp-reveal-child" ref={statRefs[i]}>
              <div className="lp-stat-number">
                {statVals[i].toLocaleString('fr-FR')}{stat.suffix}
              </div>
              <div className="lp-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ 9. CTA ════════════════════════════════════════════════════════ */}
      <section className="lp-cta" ref={ctaRef}>
        {[
          { Icon: BookOpen, top: '15%', left: '8%', size: 32 },
          { Icon: Video, top: '20%', right: '12%', size: 28 },
          { Icon: Brain, bottom: '25%', left: '5%', size: 24 },
          { Icon: GraduationCap, bottom: '15%', right: '8%', size: 30 },
          { Icon: Sparkles, top: '50%', left: '3%', size: 20 },
          { Icon: Target, top: '40%', right: '5%', size: 22 },
        ].map(({ Icon, size, ...pos }, i) => (
          <div key={i} className="lp-cta-float" style={{ ...pos, animationDelay: `${i * 0.5}s` }}>
            <Icon size={size} />
          </div>
        ))}

        <h2 className="lp-cta-title lp-reveal">
          Prêt à transformer votre apprentissage ?
        </h2>
        <p className="lp-cta-subtitle lp-reveal">
          Rejoignez FlipLearn gratuitement et découvrez une nouvelle façon d'apprendre,
          plus efficace et plus engageante.
        </p>
        <div className="lp-cta-buttons lp-reveal">
          <Link to="/register" className="lp-btn-primary">
            Créer un compte gratuitement <ArrowRight size={20} />
          </Link>
          <button onClick={() => scrollTo('methode')} className="lp-btn-ghost">
            En savoir plus
          </button>
        </div>
      </section>

      {/* ═══ 10. FOOTER ════════════════════════════════════════════════════ */}
      <footer className="lp-footer">
        <div className="lp-footer-grid">
          {/* Col 1 */}
          <div>
            <Logo variant="full" size={28} />
            <p className="lp-footer-desc">
              FlipLearn est une plateforme éducative basée sur la pédagogie inversée,
              conçue pour améliorer l'expérience d'apprentissage des étudiants universitaires.
            </p>
            <div className="lp-footer-social">
              <button className="lp-social-icon" aria-label="GitHub"><Github size={18} /></button>
              <button className="lp-social-icon" aria-label="LinkedIn"><Linkedin size={18} /></button>
              <button className="lp-social-icon" aria-label="Globe"><Globe size={18} /></button>
            </div>
          </div>

          {/* Col 2 */}
          <div>
            <h4>Liens utiles</h4>
            <div className="lp-footer-links">
              <Link to="/login">Se connecter</Link>
              <Link to="/register">Créer un compte</Link>
              <button onClick={() => scrollTo('methode')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', fontSize: 14, textAlign: 'left', padding: 0 }}>La classe inversée</button>
              <button onClick={() => scrollTo('features')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', fontSize: 14, textAlign: 'left', padding: 0 }}>Fonctionnalités</button>
            </div>
          </div>

          {/* Col 3 */}
          <div>
            <h4>À propos</h4>
            <p style={{ fontSize: 14, lineHeight: 1.7 }}>
              Projet de Fin d'Études réalisé dans le cadre de la Licence en Informatique,
              spécialité ISIL.
            </p>
          </div>

          {/* Col 4 */}
          <div>
            <h4>Newsletter</h4>
            <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
              Restez informé des nouvelles fonctionnalités.
            </p>
            <form className="lp-newsletter" onSubmit={e => e.preventDefault()}>
              <input type="email" placeholder="votre@email.com" />
              <button type="submit"><Send size={16} /></button>
            </form>
          </div>
        </div>

        <div className="lp-footer-bottom">
          {'© '}{new Date().getFullYear()}{' FlipLearn — Projet de Fin d\'Études — Licence Informatique ISIL'}
        </div>
      </footer>
    </div>
  );
}
