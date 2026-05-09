import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import {
  ArrowLeft, Lightbulb, Plus, Calendar, Users, ChevronRight,
  Mic, PenTool, User as UserIcon, Clock,
} from 'lucide-react';

const STATUT_META = {
  planifie:           { label: 'Planifié',          color: '#94A3B8', bg: '#F1F5F9' },
  cadrage_en_cours:   { label: 'Cadrage',           color: '#1B4F72', bg: '#DBEAFE' },
  travail_individuel: { label: 'Travail individuel',color: '#9333EA', bg: '#F3E8FF' },
  bilan_en_cours:     { label: 'Bilan',             color: '#D97706', bg: '#FEF3C7' },
  evalue:             { label: 'Évalué',            color: '#059669', bg: '#D1FAE5' },
};

const ROLE_META = {
  animateur: { label: 'Animateur', Icon: Mic,      color: '#9333EA' },
  scribe:    { label: 'Scribe',    Icon: PenTool,  color: '#10B981' },
  membre:    { label: 'Membre',    Icon: UserIcon, color: '#64748B' },
};

const FILTERS = [
  { id: 'all',     label: 'Tous',      statuts: null },
  { id: 'todo',    label: 'À faire',   statuts: ['planifie', 'cadrage_en_cours'] },
  { id: 'doing',   label: 'En cours',  statuts: ['travail_individuel', 'bilan_en_cours'] },
  { id: 'done',    label: 'Terminés',  statuts: ['evalue'] },
];

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function getCurrentUser() {
  try { return JSON.parse(sessionStorage.getItem('fliplearn_user')); }
  catch { return null; }
}

export default function CasPratiqueList() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const isProf = user?.role === 'professeur' || user?.role === 'admin';

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    api.get('/cas-pratiques')
      .then(({ data }) => setList(Array.isArray(data) ? data : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter);
    if (!f || !f.statuts) return list;
    return list.filter((cp) => f.statuts.includes(cp.statut));
  }, [list, filter]);

  return (
    <Layout>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 4 }}>
              <Lightbulb size={24} style={{ verticalAlign: 'middle', color: 'var(--color-primary)' }} /> Cas pratiques
            </h1>
            <p style={{ color: '#64748B' }}>
              {isProf
                ? 'Cas pratiques que tu as créés'
                : 'Tes cas pratiques en groupe — Cadrage, Travail individuel, Bilan'}
            </p>
          </div>
          {isProf && (
            <button onClick={() => navigate('/cas-pratiques/new')} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 18px', background: 'var(--color-primary)', border: 'none',
              borderRadius: 8, color: 'white', cursor: 'pointer', fontWeight: 500,
            }}>
              <Plus size={16} /> Nouveau cas pratique
            </button>
          )}
        </div>

        {/* ─── Filtres ─── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: '6px 14px', borderRadius: 999,
              border: `1px solid ${filter === f.id ? 'var(--color-primary)' : '#CBD5E1'}`,
              background: filter === f.id ? 'var(--color-primary)' : 'white',
              color: filter === f.id ? 'white' : '#475569',
              cursor: 'pointer', fontSize: 13, fontWeight: 500,
            }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* ─── Liste ─── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>Chargement…</div>
        ) : filtered.length === 0 ? (
          <div style={{
            padding: '3rem', textAlign: 'center', color: '#94A3B8',
            border: '2px dashed #E2E8F0', borderRadius: 12,
          }}>
            <Lightbulb size={48} style={{ opacity: 0.4, marginBottom: 12 }} />
            <p>Aucun cas pratique pour le moment.</p>
            {isProf && (
              <button onClick={() => navigate('/cas-pratiques/new')} style={{
                marginTop: '1rem', padding: '8px 16px', background: 'var(--color-primary)',
                border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer',
              }}>
                Créer le premier
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {filtered.map((cp) => <CpCard key={cp._id} cp={cp} userId={user?._id} isProf={isProf} navigate={navigate} />)}
          </div>
        )}
      </div>
    </Layout>
  );
}

function CpCard({ cp, userId, isProf, navigate }) {
  const meta = STATUT_META[cp.statut] || STATUT_META.planifie;
  const myMember = !isProf && (cp.groupMembers || []).find((m) =>
    String(m.studentId?._id || m.studentId) === userId
  );
  const myRole = myMember?.role;
  const myRoleMeta = myRole ? ROLE_META[myRole] : null;

  return (
    <div onClick={() => navigate(`/cas-pratiques/${cp._id}`)} style={{
      padding: '1.25rem', background: 'white', border: '1px solid #E2E8F0',
      borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 4 }}>{cp.titre}</h3>
          {cp.description && (
            <p style={{ color: '#64748B', fontSize: 13, marginBottom: 8 }}>{cp.description}</p>
          )}
        </div>
        <ChevronRight size={20} color="#94A3B8" />
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', fontSize: 13, color: '#64748B' }}>
        <span style={{
          padding: '3px 10px', background: meta.bg, color: meta.color,
          borderRadius: 999, fontSize: 12, fontWeight: 500,
        }}>
          {meta.label}
        </span>
        {cp.courseId && <span>📚 {cp.courseId.titre}</span>}
        {cp.phaseCadrageDate && <span><Calendar size={12} style={{ verticalAlign: 'middle' }} /> {fmtDate(cp.phaseCadrageDate)} → {fmtDate(cp.phaseBilanDate)}</span>}
        <span><Users size={12} style={{ verticalAlign: 'middle' }} /> {(cp.groupMembers || []).length}</span>
        {myRoleMeta && (
          <span style={{
            padding: '3px 10px', background: myRoleMeta.color + '22', color: myRoleMeta.color,
            borderRadius: 999, fontSize: 12, fontWeight: 500,
          }}>
            <myRoleMeta.Icon size={11} style={{ verticalAlign: 'middle' }} /> {myRoleMeta.label}
          </span>
        )}
      </div>
    </div>
  );
}
