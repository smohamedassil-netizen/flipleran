import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import {
  ArrowLeft, Star, Award, Trophy, Zap, Target, BookOpen,
  Medal, Crown, Flame, Heart, Plus, Search, Gift, X,
} from 'lucide-react';

const ICON_MAP = { Star, Award, Trophy, Zap, Target, BookOpen, Medal, Crown, Flame, Heart };
const ICON_OPTIONS = Object.keys(ICON_MAP);

const RARITY_LABELS = { common: 'Commun', rare: 'Rare', epic: 'Épique' };
const RARITY_COLORS = {
  common: { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0' },
  rare:   { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
  epic:   { bg: '#FAF5FF', text: '#9333EA', border: '#E9D5FF' },
};

const PRESET_COLORS = ['#1B4F72', '#E74C3C', '#F39C12', '#27AE60', '#8E44AD', '#2980B9', '#D35400', '#16A085', '#C0392B', '#2C3E50'];

const emptyForm = { nom: '', description: '', icon: 'Star', color: '#1B4F72', rarity: 'common', condition: '' };

export default function BadgeManagement() {
  const navigate = useNavigate();
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  // Award section
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedBadge, setSelectedBadge] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [awarding, setAwarding] = useState(false);
  const [awardMsg, setAwardMsg] = useState('');

  const fetchBadges = async () => {
    try {
      const { data } = await api.get('/badges');
      setBadges(data);
    } catch (err) { logError(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchBadges();
    (async () => {
      try {
        const { data } = await api.get('/admin/users');
        const studs = Array.isArray(data) ? data.filter(u => u.role === 'etudiant') : [];
        setStudents(studs);
      } catch { /* user list not available */ }
    })();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const key = form.nom.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      await api.post('/badges', { ...form, key });
      setShowForm(false);
      setForm({ ...emptyForm });
      await fetchBadges();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la création');
    } finally { setSaving(false); }
  };

  const handleAward = async () => {
    if (!selectedBadge || !selectedStudent) return;
    setAwarding(true);
    setAwardMsg('');
    try {
      await api.post('/badges/award', { userId: selectedStudent, badgeId: selectedBadge });
      setAwardMsg('Badge attribué avec succès !');
      setSelectedBadge('');
      setSelectedStudent('');
    } catch (err) {
      setAwardMsg(err.response?.data?.message || 'Erreur');
    } finally { setAwarding(false); }
  };

  const filteredStudents = students.filter(s =>
    !studentSearch || `${s.nom} ${s.prenom}`.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const cardStyle = {
    background: 'white', borderRadius: 12, border: '1px solid #e5e7eb',
    padding: 24, marginBottom: 20,
  };

  return (
    <Layout title="Gestion des badges">
      <div style={{ maxWidth: 850, margin: '0 auto' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#1B4F72', cursor: 'pointer', fontSize: 15, fontWeight: 500, padding: '8px 0', marginBottom: 12 }}>
          <ArrowLeft size={18} /> Retour
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1B4F72', marginBottom: 4 }}>Gestion des badges</h1>
            <p style={{ color: '#64748b' }}>Créez et attribuez des badges à vos étudiants</p>
          </div>
          <button onClick={() => setShowForm(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
            borderRadius: 10, background: '#1B4F72', color: 'white', border: 'none',
            cursor: 'pointer', fontWeight: 600, fontSize: 14,
          }}>
            <Plus size={16} /> Créer un badge
          </button>
        </div>

        {/* ── Create Badge Modal ─────────────────────────────────────────────── */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', position: 'relative' }}>
              <button onClick={() => setShowForm(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1B4F72', marginBottom: 20 }}>Créer un badge</h2>
              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Nom</label>
                  <input required value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} style={inputStyle} placeholder="Ex: Expert en maths" />
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} placeholder="Description du badge" />
                </div>
                <div>
                  <label style={labelStyle}>Icône</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {ICON_OPTIONS.map(name => {
                      const Ic = ICON_MAP[name];
                      const selected = form.icon === name;
                      return (
                        <button key={name} type="button" onClick={() => setForm({ ...form, icon: name })} style={{
                          width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: selected ? `2px solid ${form.color}` : '1px solid #e5e7eb',
                          background: selected ? '#EBF5FB' : 'white', cursor: 'pointer',
                        }}>
                          <Ic size={20} color={selected ? form.color : '#94a3b8'} />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Couleur</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {PRESET_COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} style={{
                        width: 32, height: 32, borderRadius: 8, background: c, border: form.color === c ? '3px solid #1e293b' : '2px solid #e5e7eb', cursor: 'pointer',
                      }} />
                    ))}
                    <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ width: 32, height: 32, border: 'none', cursor: 'pointer', borderRadius: 6 }} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Rareté</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {Object.entries(RARITY_LABELS).map(([key, label]) => (
                      <button key={key} type="button" onClick={() => setForm({ ...form, rarity: key })} style={{
                        padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        border: form.rarity === key ? `2px solid ${RARITY_COLORS[key].text}` : '1px solid #e5e7eb',
                        background: form.rarity === key ? RARITY_COLORS[key].bg : 'white',
                        color: form.rarity === key ? RARITY_COLORS[key].text : '#64748b',
                      }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Condition</label>
                  <input value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} style={inputStyle} placeholder="Ex: Compléter 10 QCM" />
                </div>
                <button type="submit" disabled={saving} style={{
                  padding: '12px 0', borderRadius: 10, background: '#1B4F72', color: 'white',
                  border: 'none', fontWeight: 600, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}>
                  {saving ? 'Création...' : 'Créer le badge'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── Badge List ─────────────────────────────────────────────────────── */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>Badges existants</h2>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Chargement...</div>
          ) : badges.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              <Gift size={40} color="#d1d5db" style={{ marginBottom: 8 }} />
              <p>Aucun badge créé pour le moment.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {badges.map(badge => {
                const Ic = ICON_MAP[badge.icon] || Star;
                const rarityStyle = RARITY_COLORS[badge.rarity] || RARITY_COLORS.common;
                return (
                  <div key={badge._id} style={{
                    padding: 16, borderRadius: 12, border: '1px solid #e5e7eb', background: '#fafbfc',
                    display: 'flex', flexDirection: 'column', gap: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: badge.color ? `${badge.color}18` : '#EBF5FB',
                      }}>
                        <Ic size={22} color={badge.color || '#1B4F72'} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{badge.nom}</div>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                          background: rarityStyle.bg, color: rarityStyle.text, border: `1px solid ${rarityStyle.border}`,
                        }}>
                          {RARITY_LABELS[badge.rarity] || badge.rarity}
                        </span>
                      </div>
                    </div>
                    {badge.description && <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{badge.description}</p>}
                    {badge.condition && <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>{badge.condition}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Award Badge Section ────────────────────────────────────────────── */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>Attribuer un badge</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Badge</label>
              <select value={selectedBadge} onChange={e => setSelectedBadge(e.target.value)} style={inputStyle}>
                <option value="">-- Sélectionner un badge --</option>
                {badges.map(b => <option key={b._id} value={b._id}>{b.nom}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Étudiant</label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text" placeholder="Rechercher un étudiant..."
                  value={studentSearch} onChange={e => { setStudentSearch(e.target.value); setSelectedStudent(''); }}
                  style={{ ...inputStyle, paddingLeft: 36 }}
                />
              </div>
              {studentSearch && filteredStudents.length > 0 && !selectedStudent && (
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, marginTop: 4, maxHeight: 160, overflow: 'auto', background: 'white' }}>
                  {filteredStudents.slice(0, 10).map(s => (
                    <button key={s._id} onClick={() => { setSelectedStudent(s._id); setStudentSearch(`${s.prenom} ${s.nom}`); }} style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px',
                      border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: '#1e293b',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                      {s.prenom} {s.nom} <span style={{ color: '#94a3b8', fontSize: 12 }}>({s.email})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={handleAward} disabled={!selectedBadge || !selectedStudent || awarding} style={{
              padding: '10px 24px', borderRadius: 10, background: '#1B4F72', color: 'white',
              border: 'none', fontWeight: 600, fontSize: 14, cursor: !selectedBadge || !selectedStudent || awarding ? 'not-allowed' : 'pointer',
              opacity: !selectedBadge || !selectedStudent || awarding ? 0.6 : 1, alignSelf: 'flex-start',
            }}>
              {awarding ? 'Attribution...' : 'Attribuer le badge'}
            </button>
            {awardMsg && <p style={{ fontSize: 13, color: awardMsg.includes('succès') ? '#16A34A' : '#DC2626', fontWeight: 500, margin: 0 }}>{awardMsg}</p>}
          </div>
        </div>
      </div>
    </Layout>
  );
}

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 };
const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db',
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
};
