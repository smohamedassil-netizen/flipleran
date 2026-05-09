import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import JourneyStepCard from '../components/JourneyStepCard.jsx';
import { Target, RefreshCw, BookOpen } from 'lucide-react';

/**
 * MyJourney — Page hub étudiant qui matérialise le Cycle d'Apprentissage
 * Inversé (CAI) en 5 étapes pour chacun de ses cours.
 *
 * Données : agrège GET /api/courses + GET /api/journey/me/:courseId pour
 * chaque cours. Aucun nouveau modèle, aucun nouvel appel IA.
 */

const PROGRESS_COLOR = (pct) => {
  if (pct >= 80) return { bar: '#22C55E', bg: '#F0FDF4' };
  if (pct >= 40) return { bar: '#F59E0B', bg: '#FEF3C7' };
  return { bar: '#EF4444', bg: '#FEE2E2' };
};

function CourseCardSkeleton() {
  return (
    <div className="card" style={{ padding: 18, marginBottom: 16 }}>
      <div className="skeleton" style={{ height: 24, width: '60%', marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 12, width: '30%', marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 8, width: '100%', marginBottom: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        {[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton" style={{ height: 180 }} />)}
      </div>
    </div>
  );
}

function CourseJourney({ course, onError }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api.get(`/journey/me/${course._id}`)
      .then(({ data }) => { if (!cancelled) setData(data); })
      .catch((err) => {
        if (cancelled) return;
        const msg = err.response?.data?.message || 'Impossible de charger le parcours pour ce cours.';
        setError(msg);
        onError?.(course._id, msg);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [course._id]);

  if (loading) return <CourseCardSkeleton />;

  if (error) {
    return (
      <div className="card" style={{ padding: 16, marginBottom: 16, borderLeft: '4px solid #EF4444' }}>
        <p style={{ margin: 0, fontWeight: 700 }}>{course.titre}</p>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#B91C1C' }}>{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { steps, cycleProgress } = data;
  const colors = PROGRESS_COLOR(cycleProgress);

  return (
    <div className="card" style={{ padding: 18, marginBottom: 18 }}>
      {/* Header cours */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>
            <BookOpen size={18} style={{ verticalAlign: 'middle', marginRight: 6, color: '#1B4F72' }} />
            {course.titre}
          </h2>
          <div style={{ marginTop: 4, display: 'flex', gap: 6, alignItems: 'center' }}>
            <span className="badge badge-primary" style={{ fontSize: 11 }}>{course.filiere}</span>
            <span style={{ fontSize: 11, color: '#64748B' }}>{course.promotion}</span>
          </div>
        </div>
        <div style={{ minWidth: 200, textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 11, color: '#64748B', fontWeight: 700, letterSpacing: 0.5 }}>
            PROGRESSION DU CYCLE
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 800, color: colors.bar }}>
            {cycleProgress}%
          </p>
        </div>
      </div>

      {/* Barre de progression */}
      <div style={{ height: 8, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden', marginBottom: 16 }}>
        <div
          style={{
            width: `${cycleProgress}%`,
            height: '100%',
            background: colors.bar,
            transition: 'width 400ms ease',
          }}
        />
      </div>

      {/* 5 étapes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
      }}>
        <JourneyStepCard
          icon="📚"
          title="1. PRÉPARATION"
          subtitle="Avant le module : capsules + QCM"
          status={steps.preparation.status}
          detail={`Capsules : ${steps.preparation.details.videosWatched}/${steps.preparation.details.videosTotal} · QCM : ${steps.preparation.details.quizzesPassed}/${steps.preparation.details.quizzesTotal}`}
          actionLabel="Continuer"
          actionTo={`/courses/${course._id}`}
        />

        <JourneyStepCard
          icon="👥"
          title="2. RENDEZ-VOUS"
          subtitle="En classe : activité ciblée"
          status={steps.rendezvous.status}
          detail={
            steps.rendezvous.nextClassDate
              ? `Prochain cours : ${new Date(steps.rendezvous.nextClassDate).toLocaleString('fr-FR', {
                  weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                })}`
              : 'Date non communiquée par le prof'
          }
        />

        <JourneyStepCard
          icon="🧩"
          title="3. APPLICATION"
          subtitle="Apprendre en faisant : Prosit groupe"
          status={steps.application.status}
          detail={`Prosit : ${steps.application.details.prositsCompleted}/${steps.application.details.prositsTotal} complété${steps.application.details.prositsCompleted > 1 ? 's' : ''}`}
          actionLabel="Voir les Prosits"
          actionTo={`/prosits?courseId=${course._id}`}
          lockedReason="Termine la préparation pour débloquer"
        />

        <JourneyStepCard
          icon="🚀"
          title="4. PRODUCTION"
          subtitle="Crée quelque chose d'original"
          status={steps.production.status}
          detail={
            steps.production.details.projectsTotal === 0
              ? 'Aucun projet'
              : `Projet : ${steps.production.details.projectsSubmitted > 0 ? 'livré' : 'en cours'}`
          }
          actionLabel="Voir le projet"
          actionTo={`/projects?courseId=${course._id}`}
          lockedReason={
            steps.preparation.status !== 'completed'
              ? 'Termine la préparation puis 1 Prosit pour débloquer'
              : 'Termine au moins 1 Prosit pour débloquer'
          }
        />

        <JourneyStepCard
          icon="🔁"
          title="5. CONSOLIDATION"
          subtitle="Révision espacée (SM-2)"
          status={steps.consolidation.status}
          detail={`${steps.consolidation.details.cardsDue} carte${steps.consolidation.details.cardsDue !== 1 ? 's' : ''} à réviser`}
          actionLabel="Réviser maintenant"
          actionTo="/decks"
          lockedReason="Commence une capsule pour débloquer"
        />
      </div>
    </div>
  );
}

export default function MyJourney() {
  const [courses, setCourses]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const loadCourses = () => {
    setLoading(true);
    setError('');
    api.get('/courses')
      .then(({ data }) => setCourses(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.response?.data?.message || 'Impossible de charger tes modules.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCourses(); }, []);

  return (
    <Layout title="Mon Parcours">
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--color-text)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Target size={22} color="#1B4F72" />
          Mon Parcours
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
          Suis ta progression dans chaque module selon le Cycle d'Apprentissage Inversé.
        </p>
      </div>

      {loading && (
        <>
          <CourseCardSkeleton />
          <CourseCardSkeleton />
        </>
      )}

      {!loading && error && (
        <div className="alert alert-error" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span>{error}</span>
          <button className="btn btn-ghost btn-sm" onClick={loadCourses}>
            <RefreshCw size={14} /> Réessayer
          </button>
        </div>
      )}

      {!loading && !error && courses.length === 0 && (
        <div className="empty-state" style={{ padding: 40 }}>
          <BookOpen size={32} className="empty-state-icon" />
          <p className="empty-state-title">Aucun module</p>
          <p className="empty-state-desc">Tu n'es inscrit à aucun cours pour l'instant.</p>
        </div>
      )}

      {!loading && !error && courses.map((c) => (
        <CourseJourney key={c._id} course={c} />
      ))}
    </Layout>
  );
}
