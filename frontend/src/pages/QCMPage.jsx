import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import QCMPlayer from '../components/QCMPlayer.jsx';
import api from '../utils/api.js';
import { ArrowLeft, AlertCircle, BookOpen, Clock } from 'lucide-react';
import { useGamification } from '../context/GamificationContext.jsx';

export default function QCMPage() {
  const { videoId } = useParams();
  const navigate    = useNavigate();
  const { notify }  = useGamification();

  const [qcm,        setQCM]        = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [errorCode,  setErrorCode]  = useState(null);

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
