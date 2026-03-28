import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../utils/api.js';
import {
  ArrowLeft, Plus, Trash2, Save, AlertCircle, X,
  FolderKanban, FileText, Calendar,
} from 'lucide-react';

/* ─── Default phases per type ────────────────────────────────────────────── */
const DEFAULT_PHASES_PROSIT = [
  'Lecture et compr\u00e9hension',
  'Identification des mots-cl\u00e9s',
  'Brainstorming',
  'Recherche individuelle',
  'Mise en commun',
  'Synth\u00e8se',
  'Restitution',
];

const DEFAULT_PHASES_PROJET = [
  'Analyse du sujet',
  'Planification',
  'R\u00e9alisation',
  'Tests et validation',
  'R\u00e9daction du rapport',
  'Soutenance',
];

/* ═══════════════════════════════════════════════════════════════════════════
   ProjectCreate
═══════════════════════════════════════════════════════════════════════════ */
export default function ProjectCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [type, setType]               = useState('prosit');
  const [titre, setTitre]             = useState('');
  const [description, setDescription] = useState('');
  const [coursId, setCoursId]         = useState('');
  const [courses, setCourses]         = useState([]);

  /* Prosit fields */
  const [enonce, setEnonce]         = useState('');
  const [motsCles, setMotsCles]     = useState([]);
  const [motCleInput, setMotCleInput] = useState('');

  /* Projet fields */
  const [dateDebut, setDateDebut]           = useState('');
  const [dateFin, setDateFin]               = useState('');
  const [dateSoutenance, setDateSoutenance] = useState('');

  /* Phases */
  const [phases, setPhases] = useState(DEFAULT_PHASES_PROSIT.map(t => ({ titre: t })));

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  /* Fetch prof's courses */
  useEffect(() => {
    api.get('/courses')
      .then(({ data }) => setCourses(data))
      .catch(console.error);
  }, []);

  /* Update phases when type changes */
  const handleTypeChange = (newType) => {
    setType(newType);
    const defaults = newType === 'prosit' ? DEFAULT_PHASES_PROSIT : DEFAULT_PHASES_PROJET;
    setPhases(defaults.map(t => ({ titre: t })));
  };

  /* Mots-clés */
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

  /* Phases */
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

  /* Submit */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!titre.trim()) return setError('Le titre est obligatoire.');
    if (!coursId) return setError('Veuillez s\u00e9lectionner un cours.');
    if (phases.length === 0) return setError('Ajoutez au moins une phase.');
    if (phases.some(p => !p.titre.trim())) return setError('Toutes les phases doivent avoir un titre.');

    setSaving(true);
    try {
      const payload = {
        type,
        titre: titre.trim(),
        description: description.trim(),
        coursId,
        phases: phases.map(p => ({ titre: p.titre.trim(), statut: 'a_faire' })),
      };

      if (type === 'prosit') {
        payload.enonce = enonce;
        payload.motsCles = motsCles;
      } else {
        if (dateDebut) payload.dateDebut = dateDebut;
        if (dateFin) payload.dateFin = dateFin;
        if (dateSoutenance) payload.dateSoutenance = dateSoutenance;
      }

      const { data } = await api.post('/projects', payload);
      navigate(`/projects/${data._id}`);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Erreur lors de la cr\u00e9ation du projet.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title="Nouveau projet">
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={15} />
          </button>
          <h1 className="page-title">Créer un nouveau projet</h1>
        </div>

        {/* Type toggle */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {[
            { key: 'prosit', label: 'Prosit', desc: 'Apprentissage par probl\u00e8me', color: '#1B4F72', bg: '#EBF3FA' },
            { key: 'projet', label: 'Projet', desc: 'Projet de groupe', color: '#2E7D32', bg: '#E8F5E9' },
          ].map(({ key, label, desc, color, bg }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleTypeChange(key)}
              style={{
                flex: 1, padding: '16px 20px',
                borderRadius: 'var(--radius-lg)',
                border: `2px solid ${type === key ? color : 'var(--color-border)'}`,
                backgroundColor: type === key ? bg : 'var(--color-surface)',
                cursor: 'pointer', textAlign: 'left',
                transition: 'all 150ms',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <FolderKanban size={20} color={type === key ? color : 'var(--color-text-secondary)'} />
                <span style={{ fontWeight: 700, fontSize: 'var(--font-size-md)', color: type === key ? color : 'var(--color-text)' }}>
                  {label}
                </span>
              </div>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: 0 }}>
                {desc}
              </p>
            </button>
          ))}
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

            <div>
              <label className="form-label">
                Cours <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <select
                className="form-input"
                style={{ width: '100%' }}
                value={coursId}
                onChange={(e) => setCoursId(e.target.value)}
                required
              >
                <option value="">Sélectionner un cours</option>
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>{c.titre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Prosit-specific fields */}
          {type === 'prosit' && (
            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
              <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', marginBottom: 14 }}>
                Énoncé du prosit
              </p>

              <div style={{ marginBottom: 14 }}>
                <label className="form-label">Énoncé</label>
                <textarea
                  className="form-input"
                  style={{ width: '100%', minHeight: 120, resize: 'vertical' }}
                  placeholder="Décrivez la situation problème..."
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
                      <span
                        key={i}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 10px', fontSize: 12, fontWeight: 600,
                          borderRadius: 20, backgroundColor: '#EBF3FA', color: '#1B4F72',
                        }}
                      >
                        {mc}
                        <button
                          type="button"
                          onClick={() => removeMotCle(i)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#1B4F72' }}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Projet-specific fields */}
          {type === 'projet' && (
            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
              <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-secondary)', marginBottom: 14 }}>
                Dates du projet
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Date début</label>
                  <input
                    type="date"
                    className="form-input"
                    style={{ width: '100%' }}
                    value={dateDebut}
                    onChange={(e) => setDateDebut(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Date fin</label>
                  <input
                    type="date"
                    className="form-input"
                    style={{ width: '100%' }}
                    value={dateFin}
                    onChange={(e) => setDateFin(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Date soutenance</label>
                  <input
                    type="date"
                    className="form-input"
                    style={{ width: '100%' }}
                    value={dateSoutenance}
                    onChange={(e) => setDateSoutenance(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

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
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => removePhase(i)}
                    style={{ color: '#e74c3c', padding: '4px 8px' }}
                    disabled={phases.length <= 1}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={15} />
              {saving ? 'Cr\u00e9ation...' : 'Cr\u00e9er le projet'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
