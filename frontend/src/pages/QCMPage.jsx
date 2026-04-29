import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import QCMPlayer from '../components/QCMPlayer.jsx';
import api from '../utils/api.js';
import { ArrowLeft, AlertCircle, AlertTriangle, BookOpen, Clock, Play, X } from 'lucide-react';
import { useGamification } from '../context/GamificationContext.jsx';

export default function QCMPage() {
  const { videoId } = useParams();
  const navigate    = useNavigate();
  const { notify }  = useGamification();

  const [qcm,        setQCM]        = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [errorCode,  setErrorCode]  = useState(null);
  const [videoWarningDismissed, setVideoWarningDismissed] = useState(false);

  useEffect(() => {
    api.get(`/qcm/video/${videoId}`)
      .then(({ data }) => setQCM(data))
      .catch((err) => {
        setErrorCode(err.response?.status);
        setError(err.response?.data?.message ?? 'Erreur de chargement du QCM.');
      })
      .finally(() => setLoading(false));
  }, [videoId]);

  const handleFinish = (result) => {
    if (result?.points) {
      notify({ earned: result.points.earned, newBadges: result.points.newBadges ?? [] });
    }
    setTimeout(() => navigate(-2), 4000);
  };

  if (loading) return <Layout title="QCM"><p className="text-small">Chargement...</p></Layout>;

  if (error) {
    // 404 = pas de QCM cree pour cette video : message specifique, pas alarmiste
    const isNotCreated = errorCode === 404;
    return (
      <Layout title="QCM">
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
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            {isNotCreated
              ? "Pas encore de QCM pour cette vidéo"
              : "Impossible de charger le QCM"}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '8px 0 20px', lineHeight: 1.5 }}>
            {isNotCreated
              ? "Votre professeur n'a pas encore créé de QCM associé. Continuez avec la vidéo suivante ou revenez plus tard."
              : error}
          </p>
          <button className="btn btn-secondary" onClick={() => navigate(-1)} aria-label="Retour à la page précédente">
            <ArrowLeft size={14} /> Retour
          </button>
        </div>
      </Layout>
    );
  }

  // Prérequis vidéo (classe inversée) : recommandation visible, dismissable
  const showVideoWarning = qcm.videoWatched === false && !videoWarningDismissed;

  return (
    <Layout title={qcm.titre}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={15} />
        </button>
        <BookOpen size={15} color="var(--color-text-secondary)" />
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
          {qcm.titre}
        </span>
      </div>

      {/* Bandeau prérequis vidéo */}
      {showVideoWarning && (
        <div style={{
          maxWidth: 640,
          margin: '0 auto 16px',
          padding: '14px 16px',
          backgroundColor: '#FFFBEB',
          border: '1px solid #D4952A55',
          borderRadius: 12,
          position: 'relative',
        }}>
          <button
            type="button"
            aria-label="Fermer l'avertissement"
            onClick={() => setVideoWarningDismissed(true)}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 24,
              height: 24,
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#92400E',
            }}
          >
            <X size={14} />
          </button>

          <div style={{ display: 'flex', gap: 12, paddingRight: 24 }}>
            <AlertTriangle size={18} color="#D4952A" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 700, color: '#92400E' }}>
                Vous n'avez pas encore regardé cette vidéo.
              </p>
              <p style={{ margin: '4px 0 12px', fontSize: 'var(--font-size-xs)', color: '#78350F', lineHeight: 1.5 }}>
                Pour une meilleure préparation, regardez la vidéo avant de commencer le QCM.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate(`/watch/${videoId}`)}
                >
                  <Play size={13} /> Regarder la vidéo d'abord
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setVideoWarningDismissed(true)}
                >
                  Continuer quand même
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Header card */}
        <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
                {qcm.titre}
              </h1>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                {qcm.questions.length} questions · {qcm.timerSeconds}s par question · {qcm.pointsPerQuestion} pts / bonne reponse
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-primary)', lineHeight: 1 }}>
                {qcm.questions.length * qcm.pointsPerQuestion}
              </p>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>pts max</p>
            </div>
          </div>
        </div>

        <QCMPlayer
          qcm={qcm}
          videoId={videoId}
          onFinish={handleFinish}
        />
      </div>
    </Layout>
  );
}
