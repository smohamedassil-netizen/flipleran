import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import Breadcrumb from '../components/Breadcrumb.jsx';
import api from '../utils/api.js';
import {
  ArrowLeft, BookOpen, Sparkles, Search, Filter, Loader, X, Send, FileText,
  Layers, Clock, Award, ChevronRight, Wand2,
} from 'lucide-react';

/**
 * ProjectTemplateLibrary — Bibliothèque de templates projets (F10 sprint-final).
 *
 * Liste les templates officiels + IA-générés, permet de filtrer (filière /
 * type / niveau / source) et d'en générer un nouveau via Groq.
 *
 * Accès : prof + admin (route protégée par requireRole côté App.jsx).
 *
 * @see Helle, Tynjälä, Olkinuora (2006). Bibliothèque de templates →
 *      réduction du coût de scénarisation pédagogique du PBL.
 */

const FILIERES   = ['ISIL', 'Management', 'Finance', 'transverse'];
const TYPES      = [{ k: 'mono', label: 'Module unique' }, { k: 'groupe', label: 'Multi-modules' }, { k: 'pfe', label: 'PFE' }];
const LEVELS     = ['L1', 'L2', 'L3', 'M1', 'M2'];
const SOURCES    = [{ k: 'official', label: '🏛 Officiels' }, { k: 'ai-generated', label: '✨ IA-générés' }];

const FILIERE_COLORS = {
  ISIL:        { bg: '#eff6ff', color: '#1e40af' },
  Management:  { bg: '#fef3c7', color: '#92400e' },
  Finance:     { bg: '#ecfdf5', color: '#059669' },
  transverse:  { bg: '#f3e8ff', color: '#7c3aed' },
};

const TYPE_LABEL = { mono: 'Module unique', groupe: 'Multi-modules', pfe: 'PFE' };

/* ─── Modal "Générer avec l'IA" ────────────────────────────────────────── */
function GenerateModal({ onClose, onGenerated }) {
  const [filiere, setFiliere]   = useState('ISIL');
  const [type, setType]         = useState('groupe');
  const [level, setLevel]       = useState('L3');
  const [theme, setTheme]       = useState('');
  const [save, setSave]         = useState(false);
  const [busy, setBusy]         = useState(false);
  const [preview, setPreview]   = useState(null);
  const [err, setErr]           = useState('');

  const generate = async () => {
    if (!theme.trim()) { setErr('Le thème est requis.'); return; }
    setBusy(true); setErr('');
    try {
      const { data } = await api.post('/project-templates/generate', { filiere, type, level, theme: theme.trim(), save });
      setPreview(data);
      if (save) {
        setTimeout(() => { onGenerated?.(data); onClose(); }, 800);
      }
    } catch (e) {
      setErr(e.response?.data?.message || 'Erreur lors de la génération.');
    } finally { setBusy(false); }
  };

  const useDirect = () => {
    if (!preview) return;
    // On embarque le payload via sessionStorage et on navigue vers ProjectCreate
    try {
      sessionStorage.setItem('projectCreate.prefill', JSON.stringify(preview));
      onClose();
      window.location.href = '/projects/create?from-template=ai';
    } catch (e) { console.error(e); }
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16 }}
    >
      <div style={{ background: 'white', borderRadius: 14, padding: 24, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wand2 size={18} color="#7c3aed" /> Générer un template avec l'IA
          </h3>
          <button onClick={onClose} aria-label="Fermer" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
        </div>

        {!preview ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label className="form-label">Filière</label>
                <select className="form-input" value={filiere} onChange={(e) => setFiliere(e.target.value)}>
                  {FILIERES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Type</label>
                <select className="form-input" value={type} onChange={(e) => setType(e.target.value)}>
                  {TYPES.map((t) => <option key={t.k} value={t.k}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Niveau</label>
                <select className="form-input" value={level} onChange={(e) => setLevel(e.target.value)}>
                  {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569', cursor: 'pointer' }}>
                  <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} />
                  Enregistrer dans la bibliothèque
                </label>
              </div>
            </div>
            <div>
              <label className="form-label">Thème du projet *</label>
              <input
                className="form-input"
                style={{ width: '100%' }}
                placeholder="Ex: Application mobile de réservation de taxi"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              />
            </div>
            {err && <div style={{ marginTop: 10, fontSize: 12, color: '#dc2626' }}>{err}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
              <button onClick={onClose} className="btn btn-ghost btn-sm">Annuler</button>
              <button onClick={generate} disabled={busy || !theme.trim()} className="btn btn-sm" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)', color: 'white', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {busy ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Génération…</> : <><Wand2 size={13} /> Générer</>}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ padding: 14, background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 10, marginBottom: 12 }}>
              <strong style={{ fontSize: 14, color: '#1e1b4b' }}>{preview.title}</strong>
              <p style={{ fontSize: 12.5, color: '#475569', margin: '6px 0' }}>{preview.description}</p>
              <div style={{ fontSize: 11, color: '#64748b', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span>{preview.filiere}</span>
                <span>· {TYPE_LABEL[preview.type]}</span>
                <span>· {preview.level}</span>
                <span>· {preview.estimatedDurationWeeks} semaines</span>
                <span>· {preview.phases?.length || 0} phases</span>
                <span>· {preview.rubric?.length || 0} critères rubric</span>
              </div>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto', padding: 8, background: '#f8fafc', borderRadius: 8, fontSize: 12, color: '#1e293b', whiteSpace: 'pre-wrap' }}>
              {preview.enonce}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
              <button onClick={() => { setPreview(null); }} className="btn btn-ghost btn-sm">Regénérer</button>
              <button onClick={useDirect} className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Send size={12} /> Utiliser maintenant
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Page principale ──────────────────────────────────────────────────── */
export default function ProjectTemplateLibrary() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ filiere: '', type: '', level: '', source: '', q: '' });
  const [showGenerate, setShowGenerate] = useState(false);

  const load = () => {
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    api.get('/project-templates', { params })
      .then((r) => setTemplates(r.data.templates || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleUseTemplate = async (tpl) => {
    try {
      await api.post(`/project-templates/${tpl._id}/use`).catch(() => {});
      sessionStorage.setItem('projectCreate.prefill', JSON.stringify(tpl));
      navigate('/projects/create?from-template=' + tpl._id);
    } catch (e) { console.error(e); }
  };

  const counts = useMemo(() => {
    const byFil = {};
    templates.forEach((t) => { byFil[t.filiere] = (byFil[t.filiere] || 0) + 1; });
    return byFil;
  }, [templates]);

  return (
    <Layout title="Bibliothèque de templates">
      <Breadcrumb items={[{ label: 'Accueil', to: '/' }, { label: 'Templates de projets' }]} />

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Bibliothèque de templates</h1>
          <p className="page-subtitle">{templates.length} template{templates.length !== 1 ? 's' : ''} · réduit le temps de scénarisation pédagogique</p>
        </div>
        <button
          onClick={() => setShowGenerate(true)}
          className="btn btn-sm"
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)', color: 'white', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Wand2 size={14} /> Générer avec l'IA
        </button>
      </div>

      {/* Filtres */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Filter size={13} color="#64748b" />
          <strong style={{ fontSize: 12, color: '#475569' }}>Filtres</strong>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
          <select className="form-input" value={filters.filiere} onChange={(e) => setFilters({ ...filters, filiere: e.target.value })}>
            <option value="">Toute filière</option>
            {FILIERES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select className="form-input" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">Tout type</option>
            {TYPES.map((t) => <option key={t.k} value={t.k}>{t.label}</option>)}
          </select>
          <select className="form-input" value={filters.level} onChange={(e) => setFilters({ ...filters, level: e.target.value })}>
            <option value="">Tout niveau</option>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select className="form-input" value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value })}>
            <option value="">Toute source</option>
            {SOURCES.map((s) => <option key={s.k} value={s.k}>{s.label}</option>)}
          </select>
          <div style={{ position: 'relative' }}>
            <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              className="form-input"
              style={{ paddingLeft: 26 }}
              placeholder="Recherche…"
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            />
          </div>
          <button onClick={load} className="btn btn-primary btn-sm">Appliquer</button>
        </div>
      </div>

      {/* Cards */}
      {loading && <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>Chargement…</div>}
      {!loading && templates.length === 0 && (
        <div className="empty-state">
          <BookOpen size={32} className="empty-state-icon" />
          <p className="empty-state-title">Aucun template ne correspond aux filtres</p>
          <p className="empty-state-desc">Essaie de retirer des filtres ou de générer un template avec l'IA.</p>
        </div>
      )}
      {!loading && templates.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {templates.map((t) => {
            const filMeta = FILIERE_COLORS[t.filiere] || FILIERE_COLORS.transverse;
            const isAI = t.source === 'ai-generated';
            return (
              <div key={t._id} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, border: isAI ? '1px solid #e9d5ff' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: filMeta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isAI ? <Wand2 size={16} color="#7c3aed" /> : <FileText size={16} color={filMeta.color} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 13.5, color: '#1e293b', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</strong>
                    <div style={{ fontSize: 11, color: '#64748b', display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                      <span style={{ padding: '1px 6px', background: filMeta.bg, color: filMeta.color, borderRadius: 999, fontWeight: 700 }}>{t.filiere}</span>
                      <span>{TYPE_LABEL[t.type]}</span>
                      <span>· {t.level}</span>
                    </div>
                  </div>
                  {isAI && (
                    <span title="Généré par l'IA" style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', background: '#faf5ff', padding: '2px 6px', borderRadius: 999 }}>
                      ✨ IA
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: '#475569', margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {t.description || t.enonce?.slice(0, 200)}
                </p>
                <div style={{ display: 'flex', gap: 10, fontSize: 10.5, color: '#64748b', flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <Layers size={10} /> {t.phases?.length || 0} phases
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <Award size={10} /> {t.rubric?.length || 0} critères
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <Clock size={10} /> {t.estimatedDurationWeeks || 6} sem.
                  </span>
                  {t.usageCount > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#059669', fontWeight: 700 }}>
                      ✓ utilisé {t.usageCount}×
                    </span>
                  )}
                </div>
                <button onClick={() => handleUseTemplate(t)} className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  Utiliser ce template <ChevronRight size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showGenerate && <GenerateModal onClose={() => setShowGenerate(false)} onGenerated={load} />}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </Layout>
  );
}
