import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import {
  ArrowLeft, Plus, Trash2, GripVertical, Save, Clock,
  HelpCircle, MessageSquare, AlertCircle, CheckCircle2, Sparkles,
} from 'lucide-react';

/**
 * VideoPartsEditor — page prof pour découper une vidéo en parties pédagogiques.
 *
 * Microlearning (Hug 2005) : chaque partie est une mini-unité avec son
 * propre mini-QCM (lien vers QCM existant) et son feedback.
 *
 * À chaque partie, le prof renseigne :
 *   - Titre
 *   - startTime / endTime (en secondes ou format mm:ss)
 *   - QCM associé (optionnel — sélection parmi les QCM de la vidéo)
 *   - Feedback (texte affiché à l'étudiant en fin de partie)
 *
 * Source : GET /api/videos/:id (récupère parts existantes)
 *          PUT /api/videos/:id (sauvegarde la liste parts)
 */
export default function VideoPartsEditor() {
  const { id: videoId } = useParams();
  const navigate = useNavigate();

  const [video, setVideo]       = useState(null);
  const [quizzes, setQuizzes]   = useState([]);
  const [parts, setParts]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [savedAt, setSavedAt]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get(`/videos/${videoId}`),
      api.get(`/qcm?videoId=${videoId}`).catch(() => ({ data: [] })),
    ])
      .then(([v, q]) => {
        if (cancelled) return;
        setVideo(v.data);
        setParts(Array.isArray(v.data.parts) ? [...v.data.parts] : []);
        setQuizzes(Array.isArray(q.data) ? q.data : []);
      })
      .catch((err) => setError(err.response?.data?.message || 'Erreur de chargement'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [videoId]);

  const fmtTime = (s) => {
    if (typeof s !== 'number') return '00:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const parseTime = (str) => {
    if (typeof str === 'number') return str;
    if (!str) return 0;
    const t = str.trim();
    if (/^\d+$/.test(t)) return Number(t);  // secondes brutes
    const parts = t.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + (parts[1] || 0);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0);
    return 0;
  };

  const addPart = () => {
    const lastEnd = parts.length > 0 ? parts[parts.length - 1].endTime : 0;
    const duration = video?.duration || 0;
    const next = {
      ordre: parts.length,
      titre: `Partie ${parts.length + 1}`,
      startTime: lastEnd,
      endTime: Math.min(duration || lastEnd + 60, lastEnd + 60),
      qcmId: null,
      feedback: '',
      _local: true,
    };
    setParts([...parts, next]);
  };

  const removePart = (idx) => {
    setParts(parts.filter((_, i) => i !== idx));
  };

  const updatePart = (idx, field, value) => {
    setParts(parts.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const movePart = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= parts.length) return;
    const arr = [...parts];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setParts(arr);
  };

  const validateParts = () => {
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (!p.titre?.trim()) return `La partie ${i + 1} n'a pas de titre.`;
      if (typeof p.startTime !== 'number' || typeof p.endTime !== 'number') return `Partie ${i + 1} : timestamps invalides.`;
      if (p.endTime <= p.startTime) return `Partie ${i + 1} : la fin doit être après le début.`;
    }
    return null;
  };

  const save = async () => {
    const err = validateParts();
    if (err) { setError(err); return; }
    setSaving(true);
    setError('');
    try {
      const cleaned = parts.map((p, idx) => ({
        ordre: idx,
        titre: p.titre.trim(),
        startTime: p.startTime,
        endTime: p.endTime,
        qcmId: p.qcmId || null,
        feedback: (p.feedback || '').slice(0, 500),
      }));
      const { data } = await api.put(`/videos/${videoId}`, { parts: cleaned });
      setVideo(data);
      setParts(Array.isArray(data.parts) ? data.parts : []);
      setSavedAt(new Date());
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Layout title="Découpage de la vidéo"><div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Chargement…</div></Layout>;
  }
  if (!video) {
    return <Layout title="Découpage"><div className="alert alert-error" style={{ margin: 24 }}>{error || 'Vidéo introuvable'}</div></Layout>;
  }

  return (
    <Layout title={`Découpage — ${video.titre}`}>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '20px 16px' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#64748B', background: 'none', border: 'none', fontSize: 13, marginBottom: 12, cursor: 'pointer' }}
        >
          <ArrowLeft size={14} /> Retour
        </button>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
          border: '1px solid #C4B5FD',
          borderRadius: 14, padding: 20, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Sparkles size={18} color="#9333EA" />
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#7C3AED', letterSpacing: 0.5 }}>
              DÉCOUPAGE PÉDAGOGIQUE — MICROLEARNING
            </p>
          </div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1B4F72' }}>
            {video.titre}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
            Découpe ta vidéo en plusieurs parties (durée : {fmtTime(video.duration)}).
            À chaque partie tu peux associer un mini-QCM et un feedback. Les étudiants
            auront ainsi une rétroaction continue (microlearning, Hug 2005).
          </p>
        </div>

        {/* Liste des parts */}
        {parts.length === 0 && (
          <div style={{
            background: '#F8FAFC', border: '1px dashed #CBD5E1',
            borderRadius: 12, padding: 32, textAlign: 'center',
          }}>
            <p style={{ margin: '0 0 8px', fontSize: 14, color: '#64748B' }}>
              Aucune partie pour le moment.
            </p>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: '#94A3B8' }}>
              Découpe ta vidéo en sections pédagogiques cohérentes (3-5 parties idéal).
            </p>
            <button type="button" onClick={addPart} style={btnPrimary}>
              <Plus size={14} /> Ajouter une première partie
            </button>
          </div>
        )}

        {parts.map((p, idx) => (
          <div key={idx} style={{
            background: 'white', border: '1px solid #E2E8F0',
            borderRadius: 12, padding: 14, marginBottom: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              {/* Drag handle */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button type="button" onClick={() => movePart(idx, -1)} disabled={idx === 0} style={iconBtn} title="Monter">▲</button>
                <button type="button" onClick={() => movePart(idx, 1)} disabled={idx === parts.length - 1} style={iconBtn} title="Descendre">▼</button>
              </div>
              <span style={{
                width: 28, height: 28, borderRadius: '50%',
                background: '#9333EA', color: 'white',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, flexShrink: 0,
              }}>
                {idx + 1}
              </span>
              <input
                value={p.titre}
                onChange={(e) => updatePart(idx, 'titre', e.target.value)}
                placeholder="Titre de la partie"
                style={{
                  flex: 1, minWidth: 200,
                  padding: '8px 10px', border: '1px solid #CBD5E1',
                  borderRadius: 6, fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                }}
              />
              <button type="button" onClick={() => removePart(idx)} style={{ ...iconBtn, color: '#DC2626' }} title="Supprimer">
                <Trash2 size={14} />
              </button>
            </div>

            {/* Timestamps */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={lblStyle}>
                  <Clock size={11} /> Début (mm:ss)
                </label>
                <input
                  type="text"
                  value={fmtTime(p.startTime)}
                  onChange={(e) => updatePart(idx, 'startTime', parseTime(e.target.value))}
                  placeholder="0:00"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={lblStyle}>
                  <Clock size={11} /> Fin (mm:ss)
                </label>
                <input
                  type="text"
                  value={fmtTime(p.endTime)}
                  onChange={(e) => updatePart(idx, 'endTime', parseTime(e.target.value))}
                  placeholder="3:00"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* QCM lié */}
            <div style={{ marginBottom: 10 }}>
              <label style={lblStyle}>
                <HelpCircle size={11} /> Mini-QCM associé (optionnel)
              </label>
              <select
                value={p.qcmId || ''}
                onChange={(e) => updatePart(idx, 'qcmId', e.target.value || null)}
                style={inputStyle}
              >
                <option value="">— Aucun —</option>
                {quizzes.map(q => (
                  <option key={q._id} value={q._id}>{q.titre}</option>
                ))}
              </select>
              {quizzes.length === 0 && (
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94A3B8' }}>
                  Aucun QCM lié à cette vidéo. Crée-en un d'abord depuis "Gérer les QCM".
                </p>
              )}
            </div>

            {/* Feedback */}
            <div>
              <label style={lblStyle}>
                <MessageSquare size={11} /> Feedback (affiché en fin de partie)
              </label>
              <textarea
                value={p.feedback || ''}
                onChange={(e) => updatePart(idx, 'feedback', e.target.value)}
                placeholder="Ex : Bravo ! Tu as compris la cryptographie symétrique. Tu peux passer à RSA."
                maxLength={500}
                rows={2}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
              <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94A3B8', textAlign: 'right' }}>
                {(p.feedback || '').length}/500
              </p>
            </div>
          </div>
        ))}

        {/* Actions */}
        {parts.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
            <button type="button" onClick={addPart} style={btnSecondary}>
              <Plus size={14} /> Ajouter une partie
            </button>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {savedAt && (
                <span style={{ fontSize: 11, color: '#15803D', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <CheckCircle2 size={12} />
                  Enregistré à {savedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button type="button" onClick={save} disabled={saving} style={btnPrimary}>
                {saving ? '…' : <><Save size={14} /> Enregistrer ({parts.length} partie{parts.length > 1 ? 's' : ''})</>}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{ marginTop: 12 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <p style={{ marginTop: 16, fontSize: 11, color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', lineHeight: 1.5 }}>
          Microlearning (Hug 2005) : découper en petites unités augmente la rétention de 22%.
          Le mini-QCM par partie active la récupération continue (Roediger &amp; Karpicke 2006).
        </p>
      </div>
    </Layout>
  );
}

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #CBD5E1',
  borderRadius: 6,
  fontSize: 13, fontFamily: 'inherit',
  color: '#1E293B',
  background: 'white',
};

const lblStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  fontSize: 11, fontWeight: 600, color: '#64748B',
  marginBottom: 3,
};

const btnPrimary = {
  padding: '8px 14px', background: 'linear-gradient(135deg, #9333EA, #C084FC)',
  color: 'white', border: 'none', borderRadius: 8,
  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  display: 'inline-flex', alignItems: 'center', gap: 5,
};
const btnSecondary = {
  padding: '8px 14px', background: 'white',
  color: '#9333EA', border: '1px solid #C4B5FD', borderRadius: 8,
  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  display: 'inline-flex', alignItems: 'center', gap: 5,
};
const iconBtn = {
  padding: '2px 4px', background: 'transparent', color: '#64748B',
  border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 10,
  fontFamily: 'inherit',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};
