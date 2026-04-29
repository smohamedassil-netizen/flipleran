import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import {
  ArrowLeft, Lightbulb, Plus, Calendar, Users, ChevronRight,
  Mic, FileText, PenTool, Clock3, User as UserIcon,
} from 'lucide-react';

const STATUS_META = {
  brouillon: { label: 'Brouillon',    color: '#94A3B8', bg: '#F1F5F9' },
  aller:     { label: 'Phase Aller',  color: '#1B4F72', bg: '#DBEAFE' },
  recherche: { label: 'Recherche',    color: '#9333EA', bg: '#F3E8FF' },
  retour:    { label: 'Phase Retour', color: '#D97706', bg: '#FEF3C7' },
  evalue:    { label: 'Évalué',       color: '#059669', bg: '#D1FAE5' },
  archive:   { label: 'Archivé',      color: '#64748B', bg: '#E2E8F0' },
};

const ROLE_META = {
  animateur:    { label: 'Animateur',    Icon: Mic,      color: '#9333EA' },
  secretaire:   { label: 'Secrétaire',   Icon: FileText, color: '#0EA5E9' },
  scribe:       { label: 'Scribe',       Icon: PenTool,  color: '#10B981' },
  gestionnaire: { label: 'Gestionnaire', Icon: Clock3,   color: '#D97706' },
  membre:       { label: 'Membre',       Icon: UserIcon, color: '#64748B' },
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function PrositList() {
  const navigate = useNavigate();
  const [prosits, setProsits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('fliplearn_user')); } catch { return null; }
  });
  const [rolesProgress, setRolesProgress] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const isProf = user?.role === 'professeur' || user?.role === 'admin';

  useEffect(() => {
    setLoading(true);
    api.get('/prosits')
      .then(({ data }) => setProsits(Array.isArray(data) ? data : []))
      .catch(() => setProsits([]))
      .finally(() => setLoading(false));

    if (user?.role === 'etudiant') {
      api.get('/prosits/me/roles-progress')
        .then(({ data }) => setRolesProgress(data))
        .catch(() => setRolesProgress(null));
    }
  }, [user?.role]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return prosits;
    return prosits.filter(p => p.status === statusFilter);
  }, [prosits, statusFilter]);

  return (
    <Layout title="Prosits">
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#1B4F72', cursor: 'pointer', fontSize: 15, fontWeight: 500, padding: '8px 0', marginBottom: 12 }}>
          <ArrowLeft size={18} /> Retour
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <Lightbulb size={28} color="#F59E0B" />
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1B4F72', margin: 0 }}>Prosits</h1>
            </div>
            <p style={{ color: '#64748b', margin: 0, fontSize: 14 }}>
              Apprentissage Par Problème — méthodologie CESI adaptée à EM Alger.
            </p>
          </div>
          {isProf && (
            <button
              onClick={() => navigate('/prosits/new')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 16px', borderRadius: 10,
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                color: 'white', border: 'none', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 4px 14px rgba(245,158,11,.25)',
              }}
            >
              <Plus size={16} /> Nouveau Prosit
            </button>
          )}
        </div>

        {/* Encart pédagogique sobre */}
        <div style={{
          padding: 14, marginBottom: 18,
          background: '#FFFBEB', borderLeft: '3px solid #F59E0B',
          borderRadius: 6, fontSize: 13, color: '#78350F', lineHeight: 1.5,
        }}>
          <strong>Qu'est-ce qu'un Prosit ?</strong> Un cas concret d'entreprise à résoudre en groupe,
          structuré en 3 phases : <strong>Aller</strong> (analyse en groupe),
          <strong> Recherche</strong> (travail individuel) et <strong>Retour</strong> (présentation au tuteur).
          Chaque membre joue un rôle CESI distinct.
        </div>

        {/* Étudiant : progression rotation des rôles */}
        {!isProf && rolesProgress && (
          <section
            aria-label="Ma progression des rôles CESI"
            style={{
              padding: 14, marginBottom: 18,
              background: 'white', borderRadius: 12, border: '1px solid #E5E7EB',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1B4F72' }}>
                Ma rotation des rôles
              </div>
              <div style={{ fontSize: 11, color: '#64748B' }}>
                Cycle {rolesProgress.currentCycle + 1} ·
                {' '}{rolesProgress.totalProsits} Prosit{rolesProgress.totalProsits > 1 ? 's' : ''} terminé{rolesProgress.totalProsits > 1 ? 's' : ''}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
              {Object.entries(ROLE_META).map(([key, meta]) => {
                const done = rolesProgress.rolesDoneInCycle.includes(key);
                const totalCount = rolesProgress.totalByRole?.[key] ?? 0;
                const Icon = meta.Icon;
                return (
                  <div
                    key={key}
                    aria-label={`${meta.label} ${done ? 'fait dans ce cycle' : 'à faire'}`}
                    style={{
                      padding: '10px 12px',
                      background: done ? `${meta.color}15` : '#F8FAFC',
                      border: `1px solid ${done ? meta.color : '#E5E7EB'}`,
                      borderRadius: 8,
                      opacity: done ? 1 : 0.65,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    <Icon size={16} color={done ? meta.color : '#94A3B8'} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: done ? meta.color : '#475569' }}>
                        {meta.label}
                      </div>
                      <div style={{ fontSize: 10, color: '#94A3B8' }}>
                        {totalCount > 0 ? `${totalCount}× au total` : 'jamais joué'}
                      </div>
                    </div>
                    {done && <span style={{ fontSize: 11, color: meta.color }}>✓</span>}
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: 11, color: '#94A3B8', margin: '10px 0 0', lineHeight: 1.5 }}>
              ℹ️ Tu dois passer par <strong>tous les rôles</strong> avant que le cycle recommence.
              Le système te priorisera automatiquement sur les rôles non encore occupés.
            </p>
          </section>
        )}

        {/* Filtres */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {[
            { id: 'all',       label: 'Tous' },
            { id: 'aller',     label: 'Phase Aller' },
            { id: 'recherche', label: 'Recherche' },
            { id: 'retour',    label: 'Phase Retour' },
            { id: 'evalue',    label: 'Évalués' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              style={{
                padding: '6px 14px', borderRadius: 999,
                border: `1px solid ${statusFilter === f.id ? '#1B4F72' : '#E5E7EB'}`,
                background: statusFilter === f.id ? '#1B4F72' : 'white',
                color: statusFilter === f.id ? 'white' : '#475569',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading && <p style={{ color: '#94A3B8', textAlign: 'center', padding: 40 }}>Chargement…</p>}

        {!loading && filtered.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', background: 'white', borderRadius: 12, border: '1px dashed #CBD5E1' }}>
            <Lightbulb size={32} style={{ opacity: 0.4, marginBottom: 8, color: '#94A3B8' }} />
            <p style={{ color: '#94A3B8', marginBottom: isProf ? 14 : 0 }}>
              {isProf ? 'Aucun Prosit créé pour l\'instant.' : 'Aucun Prosit actif pour votre filière.'}
            </p>
            {isProf && (
              <button
                onClick={() => navigate('/prosits/new')}
                style={{
                  padding: '9px 16px', background: '#F59E0B', color: 'white',
                  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Créer le premier Prosit
              </button>
            )}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {filtered.map(p => {
              const meta = STATUS_META[p.status] || STATUS_META.brouillon;
              const totalMembres = (p.groupes || []).reduce((s, g) => s + (g.membres?.length || 0), 0);
              return (
                <button
                  key={p._id}
                  onClick={() => navigate(`/prosits/${p._id}`)}
                  style={{
                    textAlign: 'left', cursor: 'pointer',
                    padding: 16, background: 'white', borderRadius: 12,
                    border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 10,
                    transition: 'transform .15s, box-shadow .15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ padding: '3px 8px', background: meta.bg, color: meta.color, fontSize: 10, fontWeight: 700, borderRadius: 999, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      {meta.label}
                    </span>
                    <ChevronRight size={16} color="#94A3B8" />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', lineHeight: 1.3 }}>
                    {p.titre}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>
                    {p.description || (p.enonce || '').slice(0, 110) + (p.enonce && p.enonce.length > 110 ? '…' : '')}
                  </div>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 11, color: '#64748B', marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #F1F5F9', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={11} /> Aller {fmtDate(p.dateAller)} · Retour {fmtDate(p.dateRetour)}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Users size={11} /> {p.groupes?.length || 0} groupe{(p.groupes?.length || 0) > 1 ? 's' : ''}
                      {totalMembres > 0 && ` · ${totalMembres} membre${totalMembres > 1 ? 's' : ''}`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
