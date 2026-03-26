import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Users, BookOpen, Video, MessageSquare, Shield,
  ToggleLeft, ToggleRight, Trash2, PlusCircle,
  AlertCircle, Search, Check, X, Edit2, BarChart2,
} from 'lucide-react';
import Layout from '../components/Layout.jsx';
import api    from '../utils/api.js';

/* ─── Tab navigation ─────────────────────────────────────────────────────── */
const TABS = [
  { id: 'stats',   label: 'Vue d\'ensemble', icon: BarChart2 },
  { id: 'users',   label: 'Utilisateurs',    icon: Users },
  { id: 'courses', label: 'Cours',           icon: BookOpen },
];

/* ─── StatCard ───────────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color = 'var(--color-primary)' }) {
  return (
    <div className="stat-card" style={{ flex: 1, minWidth: '140px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <Icon size={16} color={color} />
        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-text)' }}>{value}</div>
    </div>
  );
}

/* ─── Role badge ─────────────────────────────────────────────────────────── */
function RoleBadge({ role }) {
  const map = {
    admin:      { label: 'Admin',      cls: 'badge-danger' },
    professeur: { label: 'Professeur', cls: 'badge-accent' },
    etudiant:   { label: 'Étudiant',   cls: 'badge-primary' },
  };
  const m = map[role] ?? { label: role, cls: '' };
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Tab: Stats
═══════════════════════════════════════════════════════════════════════════ */
function StatsTab() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/admin/stats').then(({ data }) => setStats(data)).catch(console.error);
  }, []);

  if (!stats) return <div className="empty-state">Chargement…</div>;

  const byRole = (role) => stats.byRole?.find((r) => r._id === role)?.count ?? 0;

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <StatCard icon={Users}       label="Utilisateurs"  value={stats.totalUsers}    color="#1B4F72" />
        <StatCard icon={BookOpen}    label="Cours"         value={stats.totalCourses}  color="#8B5CF6" />
        <StatCard icon={Video}       label="Vidéos"        value={stats.totalVideos}   color="#3B82F6" />
        <StatCard icon={MessageSquare} label="Messages"   value={stats.totalMessages} color="#10B981" />
      </div>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <StatCard icon={Shield}  label="Admins"      value={byRole('admin')}      color="#EF4444" />
        <StatCard icon={Users}   label="Professeurs" value={byRole('professeur')} color="#F59E0B" />
        <StatCard icon={Users}   label="Étudiants"   value={byRole('etudiant')}   color="#10B981" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Tab: Users
═══════════════════════════════════════════════════════════════════════════ */
function UsersTab() {
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [roleF,    setRoleF]    = useState('');
  const [editUser, setEditUser] = useState(null);  // { _id, role }
  const [confirm,  setConfirm]  = useState(null);  // id to delete

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (roleF)  params.set('role', roleF);
    api.get(`/admin/users?${params}`).then(({ data }) => setUsers(data)).catch(console.error).finally(() => setLoading(false));
  }, [search, roleF]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (id) => {
    const { data } = await api.put(`/admin/users/${id}/toggle`).catch(() => ({ data: null }));
    if (data) setUsers((prev) => prev.map((u) => u._id === id ? { ...u, isActive: data.isActive } : u));
  };

  const remove = async (id) => {
    await api.delete(`/admin/users/${id}`).catch(console.error);
    setUsers((prev) => prev.filter((u) => u._id !== id));
    setConfirm(null);
  };

  const saveEdit = async () => {
    if (!editUser) return;
    const { data } = await api.put(`/admin/users/${editUser._id}`, { role: editUser.role }).catch(() => ({ data: null }));
    if (data) {
      setUsers((prev) => prev.map((u) => u._id === data._id ? data : u));
      setEditUser(null);
    }
  };

  return (
    <div>
      {/* Filtres */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
          <input className="form-input" style={{ paddingLeft: '32px' }} placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-input" style={{ width: 'auto' }} value={roleF} onChange={(e) => setRoleF(e.target.value)}>
          <option value="">Tous les rôles</option>
          <option value="etudiant">Étudiant</option>
          <option value="professeur">Professeur</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {loading && <div className="empty-state">Chargement…</div>}

      {/* Table */}
      {!loading && (
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ fontSize: '13px' }}>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Filière</th>
                <th>Points</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td><strong>{u.prenom} {u.nom}</strong></td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{u.email}</td>
                  <td><RoleBadge role={u.role} /></td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{u.filiere || '—'}</td>
                  <td>{u.points ?? 0}</td>
                  <td>
                    {u.isActive !== false
                      ? <span className="badge badge-success">Actif</span>
                      : <span className="badge badge-danger">Désactivé</span>
                    }
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        title={u.isActive !== false ? 'Désactiver' : 'Activer'}
                        onClick={() => toggle(u._id)}
                        disabled={u.role === 'admin'}
                      >
                        {u.isActive !== false ? <ToggleRight size={14} color="#10B981" /> : <ToggleLeft size={14} color="#EF4444" />}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        title="Modifier le rôle"
                        onClick={() => setEditUser({ _id: u._id, role: u.role })}
                        disabled={u.role === 'admin'}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        title="Supprimer"
                        onClick={() => setConfirm(u._id)}
                        disabled={u.role === 'admin'}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <div className="empty-state"><Users size={28} /><p>Aucun utilisateur trouvé.</p></div>}
        </div>
      )}

      {/* Modal édition rôle */}
      {editUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ padding: '24px', width: '320px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700 }}>Modifier le rôle</h3>
            <select className="form-input" value={editUser.role} onChange={(e) => setEditUser((p) => ({ ...p, role: e.target.value }))}>
              <option value="etudiant">Étudiant</option>
              <option value="professeur">Professeur</option>
            </select>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setEditUser(null)}><X size={14} />Annuler</button>
              <button className="btn btn-primary" onClick={saveEdit}><Check size={14} />Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm suppression */}
      {confirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ padding: '24px', width: '360px', textAlign: 'center' }}>
            <AlertCircle size={32} color="#EF4444" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 700 }}>Supprimer cet utilisateur ?</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '20px' }}>Cette action est irréversible.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setConfirm(null)}>Annuler</button>
              <button className="btn btn-danger" onClick={() => remove(confirm)}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Tab: Courses
═══════════════════════════════════════════════════════════════════════════ */
function CoursesTab() {
  const [courses,   setCourses]   = useState([]);
  const [profs,     setProfs]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState({ titre: '', description: '', professorId: '', filiere: '', promotion: '' });
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [confirm,   setConfirm]   = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/admin/courses'),
      api.get('/admin/professors'),
    ]).then(([c, p]) => { setCourses(c.data); setProfs(p.data); }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.titre || !form.professorId || !form.filiere || !form.promotion) {
      setError('Tous les champs sont requis.'); return;
    }
    setSaving(true); setError('');
    const { data } = await api.post('/admin/courses', form).catch((err) => { setError(err.response?.data?.message ?? 'Erreur'); return { data: null }; });
    if (data) { setCourses((p) => [{ ...data, studentCount: 0, videoCount: 0 }, ...p]); setShowForm(false); setForm({ titre: '', description: '', professorId: '', filiere: '', promotion: '' }); }
    setSaving(false);
  };

  const toggleActive = async (id, current) => {
    const { data } = await api.put(`/admin/courses/${id}`, { isActive: !current }).catch(() => ({ data: null }));
    if (data) setCourses((p) => p.map((c) => c._id === id ? { ...c, isActive: data.isActive } : c));
  };

  const remove = async (id) => {
    await api.delete(`/admin/courses/${id}`).catch(console.error);
    setCourses((p) => p.filter((c) => c._id !== id));
    setConfirm(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          <PlusCircle size={14} /> Nouveau cours
        </button>
      </div>

      {/* Formulaire création */}
      {showForm && (
        <form onSubmit={handleCreate} className="card" style={{ padding: '20px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Créer un cours</h3>
          {error && <div className="alert alert-danger" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><AlertCircle size={14} />{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="form-label">Titre *</label>
              <input className="form-input" value={form.titre} onChange={(e) => setForm((p) => ({ ...p, titre: e.target.value }))} placeholder="ex: Algorithmes" />
            </div>
            <div>
              <label className="form-label">Professeur *</label>
              <select className="form-input" value={form.professorId} onChange={(e) => setForm((p) => ({ ...p, professorId: e.target.value }))}>
                <option value="">Sélectionner…</option>
                {profs.map((p) => <option key={p._id} value={p._id}>{p.prenom} {p.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Filière *</label>
              <input className="form-input" value={form.filiere} onChange={(e) => setForm((p) => ({ ...p, filiere: e.target.value }))} placeholder="ex: Informatique" />
            </div>
            <div>
              <label className="form-label">Promotion *</label>
              <input className="form-input" value={form.promotion} onChange={(e) => setForm((p) => ({ ...p, promotion: e.target.value }))} placeholder="ex: L3 2024" />
            </div>
          </div>
          <div>
            <label className="form-label">Description</label>
            <input className="form-input" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description du cours…" />
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Création…' : 'Créer'}</button>
          </div>
        </form>
      )}

      {loading && <div className="empty-state">Chargement…</div>}

      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {courses.length === 0 && <div className="empty-state"><BookOpen size={28} /><p>Aucun cours.</p></div>}
          {courses.map((c) => (
            <div key={c._id} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {c.titre}
                  {!c.isActive && <span className="badge badge-danger" style={{ fontSize: '10px' }}>Désactivé</span>}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '3px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span>Prof : {c.professorId?.prenom} {c.professorId?.nom}</span>
                  <span>{c.filiere} — {c.promotion}</span>
                  <span>{c.studentCount ?? 0} étudiants</span>
                  <span>{c.videoCount ?? 0} vidéos</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  title={c.isActive ? 'Désactiver' : 'Activer'}
                  onClick={() => toggleActive(c._id, c.isActive)}
                >
                  {c.isActive ? <ToggleRight size={15} color="#10B981" /> : <ToggleLeft size={15} color="#EF4444" />}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => setConfirm(c._id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ padding: '24px', width: '360px', textAlign: 'center' }}>
            <AlertCircle size={32} color="#EF4444" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 700 }}>Supprimer ce cours ?</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '20px' }}>Cette action est irréversible.</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setConfirm(null)}>Annuler</button>
              <button className="btn btn-danger" onClick={() => remove(confirm)}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Page Admin
═══════════════════════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathTab = location.pathname.replace('/admin', '').replace('/', '') || 'stats';
  const initialTab = ['stats', 'users', 'courses', 'settings'].includes(pathTab) ? pathTab : 'stats';
  const [tab, setTab] = useState(initialTab);

  const handleTabChange = (newTab) => {
    setTab(newTab);
    const path = newTab === 'stats' ? '/admin' : `/admin/${newTab}`;
    navigate(path, { replace: true });
  };

  return (
    <Layout title="Administration">
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <Shield size={22} color="var(--color-primary)" />
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Administration</h1>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid var(--color-border)', paddingBottom: '0' }}>
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                style={{
                  padding:        '8px 16px',
                  background:     'none',
                  border:         'none',
                  borderBottom:   tab === t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                  marginBottom:   '-2px',
                  fontWeight:     tab === t.id ? 700 : 500,
                  color:          tab === t.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  cursor:         'pointer',
                  fontSize:       '13px',
                  display:        'flex',
                  alignItems:     'center',
                  gap:            '6px',
                  fontFamily:     'inherit',
                  transition:     'color 0.15s',
                }}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {tab === 'stats'   && <StatsTab />}
        {tab === 'users'   && <UsersTab />}
        {tab === 'courses' && <CoursesTab />}
      </div>
    </Layout>
  );
}
