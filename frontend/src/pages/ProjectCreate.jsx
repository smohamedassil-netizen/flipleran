import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../utils/api.js';
import {
  ArrowLeft, Plus, Trash2, Save, AlertCircle, X,
} from 'lucide-react';

/* Phases par défaut (communes mono/groupé, modifiables) */
const DEFAULT_PHASES = [
  'Lancement',
  'Recherche',
  'Développement',
  'Livrable',
  'Soutenance',
];

export default function ProjectCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [type, setType]               = useState('mono'); // 'mono' | 'groupe'
  const [titre, setTitre]             = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId]       = useState('');         // pour mono
  const [moduleIds, setModuleIds]     = useState([]);          // pour groupé
  const [courses, setCourses]         = useState([]);

  const [enonce, setEnonce]         = useState('');
  const [motsCles, setMotsCles]     = useState([]);
  const [motCleInput, setMotCleInput] = useState('');

  const [dateDebut, setDateDebut]           = useState('');
  const [dateFin, setDateFin]               = useState('');
  const [dateSoutenance, setDateSoutenance] = useState('');

  const [phases, setPhases] = useState(DEFAULT_PHASES.map(t => ({ titre: t })));

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    api.get('/courses')
      .then(({ data }) => setCourses(data))
      .catch(console.error);
  }, []);

  const toggleModule = (id) => {
    setModuleIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const addMotCle = () => {
    const mc = motCleInput.trim();
    if (mc && !motsCles.includes(mc)) {
      setMotsCles(prev => [...prev, mc]);
    }
    setMotCleInput('');
  };
  const removeMotCle = (index) => {
    setMotsCles(prev => prev.filter((_, i) => i !== index));
  };

  const addPhase = () => {
    setPhases(prev => [...prev, { titre: '' }]);
  };
  const removePhase = (index) => {
    setPhases(prev => prev.filter((_, i) => i !== index));
  };
  const updatePhase = (index, value) => {
    setPhases(prev => {
      const updated = [...prev];
      updated[index] = { titre: value };
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!titre.trim()) return setError('Le titre est obligatoire.');
    if (type === 'mono' && !courseId) {
      return setError('Sélectionnez le module rattaché au projet.');
    }
    if (type === 'groupe' && moduleIds.length < 2) {
      return setError('Un projet groupé doit être rattaché à au moins deux modules.');
    }
    if (phases.length === 0) return setError('Ajoutez au moins une phase.');
    if (phases.some(p => !p.titre.trim())) return setError('Toutes les phases doivent avoir un titre.');

    setSaving(true);
    try {
      const payload = {
        type,
        titre: titre.trim(),
        description: description.trim(),
        enonce: enonce.trim(),
        motsCles,
        phases: phases.map(p => ({ titre: p.titre.trim(), statut: 'a_faire' })),
      };

      if (type === 'mono') {
        payload.courseId = courseId;
      } else {
        payload.modules = moduleIds;
      }
      if (dateDebut) payload.dateDebut = dateDebut;
      if (dateFin) payload.dateFin = dateFin;
      if (dateSoutenance) payload.dateSoutenance = dateSoutenance;

      const { data } = await api.post('/projects', payload);
      navigate(`/projects/${data._id}`);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Erreur lors de la création du projet.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title="Nouveau projet">
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={15} />
          </button>
          <h1 className="page-title">Créer un nouveau projet</h1>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Common fields */}
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', marginBottom: 14 }}>
              Informations générales
            </p>

            <div style={{ marginBottom: 14 }}>
              <label className="form-label">
                Titre <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <input
                className="form-input"
                style={{ width: '100%' }}
                placeholder="Titre du projet"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                style={{ width: '100%', minHeight: 70, resize: 'vertical' }}
                placeholder="Description du projet..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Rattachement : 1 module ou plusieurs */}
            <div>
              <label className="form-label">
                Rattachement <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>

              {/* Toggle compact en ligne */}
              <div style={{ display: 'inline-flex', gap: 0, marginBottom: 10, padding: 2, border: '1px solid var(--color-border)', borderRadius: 8, background: '#F8FAFC' }}>
                {[
                  { key: 'mono',   label: '1 seul module' },
                  { key: 'groupe', label: 'Plusieurs modules' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setType(key)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 6,
                      border: 'none',
                      background: type === key ? 'var(--color-primary)' : 'transparent',
                      color: type === key ? '#fff' : 'var(--color-text-secondary)',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 150ms',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {type === 'mono' ? (
                <select
                  className="form-input"
                  style={{ width: '100%' }}
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  required
                >
                  <option value="">Sélectionner un module</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>{c.titre}</option>
                  ))}
                </select>
              ) : (
                <>
                  <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 6px' }}>
                    Sélectionner au moins 2 modules. Le projet sera transverse.
                  </p>
                  <div style={{
                    border: '1px solid var(--color-border)', borderRadius: 8,
                    maxHeight: 220, overflowY: 'auto', padding: 4,
                  }}>
                    {courses.length === 0 && (
                      <p style={{ padding: 12, color: 'var(--color-text-secondary)', fontSize: 13, margin: 0 }}>Aucun cours disponible.</p>
                    )}
                    {courses.map((c) => {
                      const checked = moduleIds.includes(c._id);
                      return (
                        <label key={c._id} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 10px', borderRadius: 6,
                          background: checked ? '#EBF3FA' : 'transparent',
                          cursor: 'pointer',
                        }}>
                          <input type="checkbox" checked={checked} onChange={() => toggleModule(c._id)} />
                          <span style={{ fontSize: 13, color: 'var(--color-text)' }}>
                            {c.titre} <span style={{ color: 'var(--color-text-secondary)', fontSize: 11 }}>({c.filiere || '?'})</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {moduleIds.length > 0 && (
                    <p style={{ marginTop: 6, fontSize: 12, color: '#1B4F72' }}>
                      {moduleIds.length} module{moduleIds.length > 1 ? 's' : ''} sélectionné{moduleIds.length > 1 ? 's' : ''}.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Énoncé + mots-clés (commun à mono et groupé) */}
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', marginBottom: 14 }}>
              Énoncé et mots-clés
            </p>

            <div style={{ marginBottom: 14 }}>
              <label className="form-label">Énoncé / contexte</label>
              <textarea
                className="form-input"
                style={{ width: '100%', minHeight: 100, resize: 'vertical' }}
                placeholder="Décrivez le sujet, le contexte ou la situation problème..."
                value={enonce}
                onChange={(e) => setEnonce(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Mots-clés</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder="Ajouter un mot-clé..."
                  value={motCleInput}
                  onChange={(e) => setMotCleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addMotCle();
                    }
                  }}
                />
                <button type="button" className="btn btn-secondary btn-sm" onClick={addMotCle}>
                  <Plus size={14} /> Ajouter
                </button>
              </div>
              {motsCles.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {motsCles.map((mc, i) => (
                    <span key={i} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 10px', fontSize: 12, fontWeight: 600,
                      borderRadius: 20, backgroundColor: '#EBF3FA', color: '#1B4F72',
                    }}>
                      {mc}
                      <button type="button" onClick={() => removeMotCle(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#1B4F72' }}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Calendrier */}
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', marginBottom: 14 }}>
              Calendrier (optionnel)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label className="form-label">Date début</label>
                <input type="date" className="form-input" style={{ width: '100%' }} value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Date fin</label>
                <input type="date" className="form-input" style={{ width: '100%' }} value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Date soutenance</label>
                <input type="date" className="form-input" style={{ width: '100%' }} value={dateSoutenance} onChange={(e) => setDateSoutenance(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Phases */}
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', margin: 0 }}>
                Phases ({phases.length})
              </p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addPhase} style={{ fontSize: 'var(--font-size-xs)' }}>
                <Plus size={13} /> Ajouter une phase
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {phases.map((phase, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{
                    width: 28, height: 28, flexShrink: 0,
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-primary-light)',
                    color: 'var(--color-primary)',
                    fontWeight: 700, fontSize: 'var(--font-size-xs)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {i + 1}
                  </div>
                  <input
                    className="form-input"
                    style={{ flex: 1 }}
                    placeholder={`Phase ${i + 1}`}
                    value={phase.titre}
                    onChange={(e) => updatePhase(i, e.target.value)}
                  />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removePhase(i)} style={{ color: '#e74c3c', padding: '4px 8px' }} disabled={phases.length <= 1}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={15} />
              {saving ? 'Création...' : 'Créer le projet'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
