import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import {
  Video, Users, Brain, ArrowRight, ArrowDown,
  BarChart3, MessageSquare, GraduationCap,
  Menu, X, Monitor, BookOpen, ChevronRight
} from 'lucide-react';
import './LandingPage.css';

/* ── Scroll reveal ─────────────────────────────────────────────────────── */
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.querySelectorAll('.lp-reveal').forEach((child, i) => {
            setTimeout(() => child.classList.add('revealed'), i * 120);
          });
          obs.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ══════════════════════════════════════════════════════════════════════════
   LandingPage
   ══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const scrollTo = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  }, []);

  const videoRef    = useReveal();
  const stepsRef    = useReveal();
  const featuresRef = useReveal();
  const ctaRef      = useReveal();

  return (
    <div className="lp-root" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>

      {/* ═══ 1. NAVBAR ════════════════════════════════════════════════════ */}
      <nav className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <Link to="/welcome" style={{ textDecoration: 'none' }}>
            <Logo variant="full" size={30} />
          </Link>

          <div className="lp-desktop-actions">
            <Link to="/login" className="lp-btn-nav-login"
              style={{
                color: scrolled ? '#1B4F72' : '#fff',
                border: `1.5px solid ${scrolled ? '#1B4F72' : 'rgba(255,255,255,0.4)'}`,
              }}>
              Se connecter
            </Link>
            <Link to="/register" className="lp-btn-nav-signup">
              S'inscrire
            </Link>
          </div>

          <button className="lp-mobile-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ color: scrolled ? '#1B4F72' : '#fff' }}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <div className="lp-mobile-dropdown">
            <Link to="/login" style={{ color: '#1B4F72', fontWeight: 600, textDecoration: 'none', padding: '8px 0' }}>
              Se connecter
            </Link>
            <Link to="/register" className="lp-btn-nav-signup" style={{ textAlign: 'center' }}>
              S'inscrire
            </Link>
          </div>
        )}
      </nav>

      {/* ═══ 2. HERO ══════════════════════════════════════════════════════ */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-hero-text">
            <h1>
              Inversez votre façon{' '}
              <span className="accent">d'apprendre</span>
            </h1>
            <p>
              Avec FlipLearn, vous regardez les cours chez vous à votre rythme,
              puis vous pratiquez activement en classe avec votre professeur.
              C'est la pédagogie inversée.
            </p>
            <div className="lp-hero-ctas">
              <Link to="/register" className="lp-btn-accent">
                Commencer gratuitement <ArrowRight size={18} />
              </Link>
              <button onClick={() => scrollTo('video')} className="lp-btn-link">
                Voir la vidéo <ArrowDown size={16} />
              </button>
            </div>
          </div>

          {/* Schéma interactif classe inversée */}
          <div className="lp-hero-illustration">
            <div className="lp-flow">
              <div className="lp-flow-step">
                <div className="lp-flow-icon" style={{ background: 'rgba(232,168,56,0.2)' }}>
                  <Monitor size={22} color="#E8A838" />
                </div>
                <div>
                  <h3>{'1. Chez vous'}</h3>
                  <p>Regardez les vidéos du cours</p>
                </div>
              </div>

              <div className="lp-flow-arrow">↓</div>

              <div className="lp-flow-step">
                <div className="lp-flow-icon" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <Brain size={22} color="#fff" />
                </div>
                <div>
                  <h3>{'2. Avant le cours'}</h3>
                  <p>Testez-vous avec les QCM</p>
                </div>
              </div>

              <div className="lp-flow-arrow">↓</div>

              <div className="lp-flow-step">
                <div className="lp-flow-icon" style={{ background: 'rgba(40,116,166,0.3)' }}>
                  <Users size={22} color="#fff" />
                </div>
                <div>
                  <h3>{'3. En classe'}</h3>
                  <p>Pratiquez et collaborez</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 3. VIDEO ═════════════════════════════════════════════════════ */}
      <section id="video" className="lp-section" style={{ background: 'var(--lp-bg-alt)' }}>
        <div className="lp-section-inner" ref={videoRef}>
          <div className="lp-section-header lp-reveal">
            <h2>Comprendre la classe inversée en quelques minutes</h2>
            <p>
              Cette courte vidéo explique le principe de la pédagogie inversée
              et pourquoi elle améliore l'apprentissage.
            </p>
          </div>

          <div className="lp-video-embed lp-reveal">
            <div className="lp-video-embed-inner">
              <iframe
                src="https://www.youtube.com/embed/qdKzSq_t8k8"
                title="La classe inversée expliquée"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>

          <p className="lp-video-caption lp-reveal">
            Dans la classe inversée, l'étudiant découvre le contenu avant la séance.
            Le temps en classe est alors consacré à la pratique, aux échanges et à
            l'approfondissement — là où le professeur est le plus utile.
          </p>
        </div>
      </section>

      {/* ═══ 4. COMMENT ÇA MARCHE ════════════════════════════════════════ */}
      <section className="lp-section" style={{ background: 'var(--lp-surface)' }}>
        <div className="lp-section-inner" ref={stepsRef}>
          <div className="lp-section-header lp-reveal">
            <h2>Comment fonctionne FlipLearn ?</h2>
            <p>
              Trois étapes simples pour un apprentissage plus efficace.
            </p>
          </div>

          <div className="lp-steps-with-arrows lp-reveal">
            <div className="lp-step">
              <div className="lp-step-num">1</div>
              <div className="lp-step-icon">
                <Video size={24} />
              </div>
              <h3>Regardez les cours chez vous</h3>
              <p>
                Votre professeur met en ligne des vidéos et des ressources.
                Vous les consultez chez vous, à votre rythme, autant de fois que nécessaire.
              </p>
            </div>

            <div className="lp-step-arrow"><ChevronRight size={28} /></div>

            <div className="lp-step">
              <div className="lp-step-num">2</div>
              <div className="lp-step-icon" style={{ background: 'linear-gradient(135deg, #E8A838, #D4952A)' }}>
                <Brain size={24} />
              </div>
              <h3>Testez vos connaissances</h3>
              <p>
                Des QCM générés automatiquement vous aident à vérifier
                que vous avez bien compris avant d'aller en cours.
              </p>
            </div>

            <div className="lp-step-arrow"><ChevronRight size={28} /></div>

            <div className="lp-step">
              <div className="lp-step-num">3</div>
              <div className="lp-step-icon">
                <Users size={24} />
              </div>
              <h3>Pratiquez en classe</h3>
              <p>
                En présentiel, vous travaillez sur des exercices, des projets et
                des débats. Le professeur vous accompagne là où vous en avez besoin.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 5. FONCTIONNALITÉS ═══════════════════════════════════════════ */}
      <section className="lp-section" style={{ background: 'var(--lp-primary-bg)' }}>
        <div className="lp-section-inner" ref={featuresRef}>
          <div className="lp-section-header lp-reveal">
            <h2>Ce que FlipLearn vous apporte</h2>
            <p>
              Des outils concrets pour accompagner la pédagogie inversée,
              du visionnage à la pratique en classe.
            </p>
          </div>

          <div className="lp-features-grid lp-reveal">
            <div className="lp-feature">
              <div className="lp-feature-icon" style={{ background: 'linear-gradient(135deg, #1B4F72, #2874A6)' }}>
                <Brain size={22} color="#fff" />
              </div>
              <div>
                <h3>QCM générés par IA</h3>
                <p>
                  Après chaque vidéo, des quiz sont créés automatiquement pour
                  tester votre compréhension du cours.
                </p>
              </div>
            </div>

            <div className="lp-feature">
              <div className="lp-feature-icon" style={{ background: 'linear-gradient(135deg, #E8A838, #D4952A)' }}>
                <MessageSquare size={22} color="#fff" />
              </div>
              <div>
                <h3>Chat entre étudiants</h3>
                <p>
                  Discutez avec vos camarades et votre professeur
                  directement dans l'application, par cours.
                </p>
              </div>
            </div>

            <div className="lp-feature">
              <div className="lp-feature-icon" style={{ background: 'linear-gradient(135deg, #276749, #38a169)' }}>
                <BarChart3 size={22} color="#fff" />
              </div>
              <div>
                <h3>Suivi de progression</h3>
                <p>
                  Suivez vos points, vos badges et votre classement.
                  Voyez où vous en êtes par rapport au groupe.
                </p>
              </div>
            </div>

            <div className="lp-feature">
              <div className="lp-feature-icon" style={{ background: 'linear-gradient(135deg, #1B4F72, #2874A6)' }}>
                <GraduationCap size={22} color="#fff" />
              </div>
              <div>
                <h3>Projets collaboratifs</h3>
                <p>
                  Travaillez en équipe sur des prosits et des projets
                  avec des rôles et des livrables définis.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 6. CTA ═══════════════════════════════════════════════════════ */}
      <section className="lp-cta" ref={ctaRef}>
        <div className="lp-reveal">
          <h2>Prêt à essayer la classe inversée ?</h2>
          <p>Créez votre compte en quelques secondes. C'est gratuit.</p>
          <Link to="/register" className="lp-btn-accent">
            Créer un compte gratuitement <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ═══ 7. FOOTER ════════════════════════════════════════════════════ */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div>
            <Logo variant="full" size={26} />
            <p>
              Plateforme de classe inversée pour les étudiants universitaires.
            </p>
          </div>
          <div>
            <h4>Accès</h4>
            <Link to="/login">Se connecter</Link>
            <Link to="/register">Créer un compte</Link>
          </div>
          <div>
            <h4>À propos</h4>
            <p style={{ margin: 0 }}>
              Projet de Fin d'Études — Licence Informatique ISIL.
            </p>
          </div>
        </div>
        <div className="lp-footer-bottom">
          {'© '}{new Date().getFullYear()}{' FlipLearn — PFE Licence Informatique ISIL'}
        </div>
      </footer>
    </div>
  );
}
