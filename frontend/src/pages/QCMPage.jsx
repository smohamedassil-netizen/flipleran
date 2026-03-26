import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import QCMPlayer from '../components/QCMPlayer.jsx';
import api from '../utils/api.js';
import { ArrowLeft, AlertCircle, BookOpen } from 'lucide-react';
import { useGamification } from '../context/GamificationContext.jsx';

export default function QCMPage() {
  const { videoId } = useParams();
  const navigate    = useNavigate();
  const { notify }  = useGamification();

  const [qcm,     setQCM]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    api.get(`/qcm/video/${videoId}`)
      .then(({ data }) => setQCM(data))
      .catch((err) => setError(err.response?.data?.message ?? 'QCM introuvable.'))
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
    return (
      <Layout title="QCM">
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Retour
        </button>
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
