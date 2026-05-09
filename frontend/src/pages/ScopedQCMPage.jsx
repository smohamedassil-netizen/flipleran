import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import QCMPlayer from '../components/QCMPlayer.jsx';
import api from '../utils/api.js';
import { ArrowLeft, AlertCircle, Clock, BookOpen, Award } from 'lucide-react';
import { useGamification } from '../context/GamificationContext.jsx';

/**
 * ScopedQCMPage — Page étudiant pour passer un QCM de chapitre ou de module.
 *
 * Routes :
 *   /qcm/chapter/:chapterId  → scope=chapter
 *   /qcm/module/:courseId    → scope=module
 *
 * Le QCM par capsule (scope=video) reste sur QCMPage.jsx (avec gate vidéo).
 * Ici, pas de prérequis vidéo : on suppose que l'étudiant a déjà fait les
 * capsules en amont (filtrage côté Dashboard / MyJourney).
 */
export default function ScopedQCMPage() {
  const params   = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { notify } = useGamification();

  const isChapter = location.pathname.includes('/chapter/');
  const scope     = isChapter ? 'chapter' : 'module';
  const refId     = isChapter ? params.chapterId : params.courseId;

  const [qcm,       setQCM]       = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [errorCode, setErrorCode] = useState(null);

  useEffect(() => {
    if (!refId) return;
    const url = scope === 'chapter' ? `/qcm/chapter/${refId}` : `/qcm/module/${refId}`;
    api.get(url)
      .then(({ data }) => setQCM(data))
      .catch((err) => {
        setErrorCode(err.response?.status);
        setError(err.response?.data?.message ?? 'Erreur de chargement du QCM.');
      })
      .finally(() => setLoading(false));
  }, [refId, scope]);

  const handleFinish = (result) => {
    if (result?.points) {
      notify({ earned: result.points.earned, newBadges: result.points.newBadges ?? [] });
    }
    setTimeout(() => navigate(-1), 4000);
  };

  const scopeLabel = scope === 'chapter' ? 'QCM de chapitre' : 'QCM final de module';
  const scopeIcon  = scope === 'chapter' ? <BookOpen size={18} color="#1B4F72" /> : <Award size={18} color="#E8A838" />;

  if (loading) {
    return <Layout title={scopeLabel}><p className="text-small">Chargement…</p></Layout>;
  }

  if (error) {
    const isNotCreated = errorCode === 404;
    return (
      <Layout title={scopeLabel}>
        <div style={{ maxWidth: 520, margin: '40px auto 0', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, margin: '0 auto 16px',
            background: isNotCreated ? 'var(--color-primary-light)' : 'var(--color-error-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isNotCreated
              ? <Clock size={28} color="var(--color-primary)" />
              : <AlertCircle size={28} color="var(--color-error)" />}
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
            {isNotCreated
              ? `Pas encore de ${scopeLabel.toLowerCase()}`
              : 'Impossible de charger le QCM'}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '8px 0 20px', lineHeight: 1.5 }}>
            {isNotCreated
              ? scope === 'chapter'
                ? "Votre professeur n'a pas encore créé de QCM pour ce chapitre. Continuez avec les capsules ou revenez plus tard."
                : "Votre professeur n'a pas encore créé de QCM final pour ce module. Continuez avec les chapitres ou revenez plus tard."
              : error}
          </p>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} /> Retour
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={qcm.titre}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} />
        </button>
        <h1 className="page-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {scopeIcon} {qcm.titre}
        </h1>
      </div>

      <div className="card" style={{ padding: 12, marginBottom: 16, background: '#F0F9FF', borderLeft: `4px solid ${scope === 'chapter' ? '#1B4F72' : '#E8A838'}` }}>
        <p style={{ margin: 0, fontSize: 13, color: '#0C4A6E' }}>
          {scope === 'chapter'
            ? <>Ce <strong>QCM de chapitre</strong> évalue ta maîtrise de l'ensemble du chapitre. Score minimum pour réussir : <strong>{qcm.passingScore ?? 60}%</strong>.</>
            : <>Ce <strong>QCM final de module</strong> est l'examen sommatif du module entier. Score minimum pour réussir : <strong>{qcm.passingScore ?? 60}%</strong>.</>
          }
        </p>
      </div>

      <QCMPlayer qcm={qcm} onFinish={handleFinish} />
    </Layout>
  );
}
