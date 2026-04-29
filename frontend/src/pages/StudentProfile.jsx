import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, BookOpen, CheckCircle, Zap, BarChart2, Clock, ArrowLeft, Edit2, Lock, Users, ClipboardList, Video, Camera, Download } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import BadgeCard from '../components/BadgeCard.jsx';
import { capitalizeWords, formatFullName } from '../utils/format.js';

/* ─── All possible badges (for "locked" display) ─────────────────────────── */
const ALL_BADGE_KEYS = [
  'first_video', 'assidu', 'first_qcm', 'expert', 'champion', 'perfectionist',
];

function StatCard({ icon: Icon, label, value, color = 'var(--primary)' }) {
  return (
    <div className="stat-card" style={{ flex: 1, minWidth: '140px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <Icon size={16} color={color} />
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

export default function StudentProfile() {
  const { user, refreshMe } = useAuth();
  const isProf = user?.role === 'professeur';
  const avatarInputRef = useRef(null);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      await api.put('/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      refreshMe?.();
    } catch (err) {
      console.error('Avatar upload failed:', err);
    }
  };

  const [allBadges,  setAllBadges]  = useState([]);
  const [progresses, setProgresses] = useState([]);
  const [profStats,  setProfStats]  = useState({ courses: 0, videos: 0, qcms: 0, students: 0 });
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    if (isProf) {
      api.get('/professor/courses')
        .then((res) => {
          const courses = Array.isArray(res.data) ? res.data : [];
          const videos = courses.reduce((s, c) => s + (c.videos?.length ?? 0), 0);
          const students = courses.reduce((s, c) => s + (c.students?.length ?? 0), 0);
          setProfStats({ courses: courses.length, videos, qcms: 0, students });
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      Promise.all([
        api.get('/badges'),
        api.get('/progress'),
      ])
        .then(([badgesRes, progressRes]) => {
          setAllBadges(badgesRes.data ?? []);
          setProgresses(Array.isArray(progressRes.data) ? progressRes.data : []);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }

    refreshMe?.();
  }, []);

  /* ── Derived stats ─────────────────────────────────────────────────────── */
  const totalVideos = progresses.reduce((s, p) => s + (p.videosCompleted?.length ?? 0), 0);
  const allQcm      = progresses.flatMap((p) => p.qcmScores ?? []);
  const avgQcm      = allQcm.length
    ? Math.round(allQcm.reduce((s, q) => s + q.score, 0) / allQcm.length)
    : 0;

  /* ── Export PDF (zero-dep, via window.print) ──────────────────────────── */
  const handleDownloadRecap = () => {
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { alert('Bloquage pop-up — autorisez les fenêtres pour télécharger le récap.'); return; }
    const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const earnedRows = earnedBadges.map(b => `<li><strong>${b.nom}</strong> — ${b.description ?? ''}</li>`).join('');
    const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>Récap FlipLearn — ${formatFullName(user)}</title>
<style>
  @page { margin: 2cm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; max-width: 720px; margin: 0 auto; padding: 24px; }
  h1 { color: #1B4F72; border-bottom: 3px solid #1B4F72; padding-bottom: 8px; margin-bottom: 4px; }
  .meta { color: #64748b; font-size: 13px; margin-bottom: 24px; }
  h2 { color: #1B4F72; margin-top: 28px; font-size: 16px; border-left: 4px solid #E8A838; padding-left: 10px; }
  .stats { display: flex; gap: 12px; flex-wrap: wrap; }
  .stat { flex: 1; min-width: 140px; padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; }
  .stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
  .stat-value { font-size: 24px; font-weight: 800; color: #1B4F72; margin-top: 4px; }
  ul { padding-left: 20px; }
  li { margin: 6px 0; font-size: 13px; }
  footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  @media print { .no-print { display: none; } }
</style>
</head><body>
  <h1>Récap d'apprentissage FlipLearn</h1>
  <p class="meta">${formatFullName(user)} · ${user?.email ?? ''} · ${user?.filiere ?? ''} ${user?.promotion ?? ''}<br>Édité le ${today}</p>

  <h2>Mes statistiques</h2>
  <div class="stats">
    <div class="stat"><div class="stat-label">Points XP</div><div class="stat-value">${user?.points ?? 0}</div></div>
    <div class="stat"><div class="stat-label">Vidéos terminées</div><div class="stat-value">${totalVideos}</div></div>
    <div class="stat"><div class="stat-label">QCM passés</div><div class="stat-value">${allQcm.length}</div></div>
    <div class="stat"><div class="stat-label">Moy. QCM</div><div class="stat-value">${avgQcm}%</div></div>
  </div>

  <h2>Badges obtenus (${earnedBadges.length}/${allBadges.length})</h2>
  ${earnedBadges.length === 0
    ? '<p style="font-style:italic;color:#94a3b8;">Aucun badge encore obtenu — continuez vos efforts !</p>'
    : `<ul>${earnedRows}</ul>`}

  <footer>
    Document généré depuis FlipLearn — Plateforme de Classe Inversée<br>
    À conserver comme preuve de vos accomplissements pédagogiques.
  </footer>

  <div class="no-print" style="text-align:center;margin-top:30px;">
    <button onclick="window.print()" style="padding:10px 20px;background:#1B4F72;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
      🖨 Imprimer / Enregistrer en PDF
    </button>
  </div>
</body></html>`;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.focus(), 100);
  };

  /* ── Badge matching ────────────────────────────────────────────────────── */
  const earnedIds = new Set((user?.badges ?? []).map((b) => b._id?.toString() ?? b.toString()));
  // Separate earned badges (full objects from allBadges) vs locked stubs
  const earnedBadges = allBadges.filter((b) => earnedIds.has(b._id?.toString()));
  const lockedBadges = allBadges.filter((b) => !earnedIds.has(b._id?.toString()));

  /* ── Initials ──────────────────────────────────────────────────────────── */
  const initials = user ? `${user.prenom?.[0] ?? ''}${user.nom?.[0] ?? ''}`.toUpperCase() : '?';

  return (
    <Layout title="Mon profil">
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 0 40px' }}>

      {/* ── Back button + Export PDF (étudiants seulement) ───────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, justifyContent: 'space-between' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => window.history.back()} aria-label="Retour à la page précédente">
          <ArrowLeft size={15} />
          Retour
        </button>
        {!isProf && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleDownloadRecap}
            aria-label="Télécharger un récap PDF de mes accomplissements"
            title="Génère un récap imprimable (PDF) de tes badges et statistiques"
          >
            <Download size={14} /> Télécharger mon récap
          </button>
        )}
      </div>

      {/* ── Profile header ─────────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          display:      'flex',
          alignItems:   'center',
          gap:          '20px',
          marginBottom: '24px',
          padding:      '24px',
          background:   'linear-gradient(135deg, #1B4F72 0%, #2874A6 100%)',
          color:        '#fff',
        }}
      >
        {/* Avatar */}
        <div style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }} onClick={() => avatarInputRef.current?.click()}>
          {user?.avatar ? (
            <img src={user.avatar} alt="Avatar" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.4)' }} />
          ) : (
            <div
              style={{
                width:          72,
                height:         72,
                borderRadius:   '50%',
                background:     'rgba(255,255,255,0.2)',
                border:         '3px solid rgba(255,255,255,0.4)',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                fontSize:       '24px',
                fontWeight:     800,
              }}
            >
              {initials}
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: '50%', background: '#1B4F72', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
            <Camera size={12} color="white" />
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" hidden onChange={handleAvatarUpload} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>
            {formatFullName(user)}
          </h2>
          <div style={{ fontSize: '13px', opacity: 0.8, marginTop: '2px' }}>{user?.email}</div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
            {user?.filiere   && <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }}>{user.filiere}</span>}
            {user?.promotion && <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }}>Promo {user.promotion}</span>}
          </div>
        </div>
        {/* Points big display (students only) / Role badge (professors) */}
        {isProf ? (
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <span className="badge badge-accent" style={{ fontSize: '14px', padding: '6px 16px' }}>Professeur</span>
          </div>
        ) : (
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: '36px', fontWeight: 800, lineHeight: 1 }}>{user?.points ?? 0}</div>
            <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
              <Zap size={12} fill="#E8A838" stroke="#E8A838" />
              points
            </div>
          </div>
        )}
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────── */}
      {isProf ? (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
          <StatCard icon={BookOpen}      label="Cours créés"        value={profStats.courses}  color="#3B82F6" />
          <StatCard icon={Video}         label="Vidéos uploadées"   value={profStats.videos}   color="#8B5CF6" />
          <StatCard icon={ClipboardList} label="QCM créés"          value={profStats.qcms}     color="#10B981" />
          <StatCard icon={Users}         label="Étudiants suivis"   value={profStats.students} color="#F59E0B" />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
          <StatCard icon={Zap}         label="Points totaux"      value={user?.points ?? 0}                    color="#E8A838" />
          <StatCard icon={BookOpen}    label="Vidéos complétées"  value={totalVideos}                          color="#3B82F6" />
          <StatCard icon={CheckCircle} label="QCM complétés"      value={allQcm.length}                       color="#10B981" />
          <StatCard icon={BarChart2}   label="Score moyen QCM"    value={allQcm.length ? `${avgQcm}%` : '—'}  color="#8B5CF6" />
          <StatCard icon={Award}       label="Badges gagnés"      value={earnedBadges.length}                 color="#F59E0B" />
        </div>
      )}

      {/* ── Mes récompenses (students only) ────────────────────────────── */}
      {user?.role === 'etudiant' && (
        <section style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Award size={18} color="var(--accent)" />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Mes récompenses</h2>
            {earnedBadges.length > 0 && (
              <span className="badge badge-success">{earnedBadges.length} obtenu{earnedBadges.length > 1 ? 's' : ''}</span>
            )}
          </div>

          {loading && <div className="empty-state" style={{ padding: '32px' }}>Chargement...</div>}

          {!loading && earnedBadges.length === 0 && (
            <div className="empty-state" style={{ padding: '32px' }}>
              <Award size={32} />
              <p>{'Aucun badge pour l\'instant — regardez des vidéos et faites des QCM !'}</p>
            </div>
          )}

          {!loading && earnedBadges.length > 0 && (
            <div
              style={{
                display:             'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap:                 '12px',
              }}
            >
              {earnedBadges.map((b) => (
                <BadgeCard key={b._id} badge={b} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Badges a debloquer (students only) ─────────────────────────── */}
      {user?.role === 'etudiant' && !loading && lockedBadges.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Award size={18} color="var(--text-muted)" />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-muted)' }}>
              Badges a debloquer
            </h2>
          </div>
          <div
            style={{
              display:             'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap:                 '12px',
            }}
          >
            {lockedBadges.map((b) => (
              <BadgeCard key={b._id} badge={b} locked />
            ))}
          </div>
        </section>
      )}

      {/* ── Professor: Mes cours section ───────────────────────────────── */}
      {isProf && (
        <section style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <BookOpen size={18} color="var(--color-primary, #1B4F72)" />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Mes cours</h2>
            <span className="badge badge-primary">{profStats.courses} cours</span>
          </div>
          <div className="card" style={{ padding: 20, color: 'var(--text-muted)', fontSize: 14 }}>
            Vous avez cree <strong>{profStats.courses}</strong> cours avec <strong>{profStats.videos}</strong> videos au total.
          </div>
        </section>
      )}

      {/* ── Professor: QCM crees section ───────────────────────────────── */}
      {isProf && (
        <section style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <ClipboardList size={18} color="#10B981" />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>QCM crees</h2>
            <span className="badge badge-success">{profStats.qcms} QCM</span>
          </div>
          <div className="card" style={{ padding: 20, color: 'var(--text-muted)', fontSize: 14 }}>
            Vous avez cree <strong>{profStats.qcms}</strong> QCM pour vos etudiants.
          </div>
        </section>
      )}

      {/* ── Edit profile section ───────────────────────────────────────── */}
      <section style={{ marginTop: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Edit2 size={18} color="var(--color-primary, #1B4F72)" />
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Modifier mon profil</h2>
        </div>
        <ProfileEditForm user={user} onSaved={refreshMe} />
      </section>
    </div>
    </Layout>
  );
}

/* ─── Profile Edit Form ────────────────────────────────────────────────── */
function ProfileEditForm({ user, onSaved }) {
  const [form, setForm] = useState({
    nom:    user?.nom ?? '',
    prenom: user?.prenom ?? '',
    filiere:   user?.filiere ?? '',
    promotion: user?.promotion ?? '',
  });
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState('');
  const [pwMsg, setPwMsg]     = useState('');

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      await api.put('/auth/profile', form);
      setMsg('Profil mis à jour !');
      onSaved?.();
    } catch (err) {
      setMsg(err.response?.data?.message ?? 'Erreur');
    } finally { setSaving(false); }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPwMsg('');
    if (pwForm.newPw.length < 6) { setPwMsg('Le mot de passe doit faire au moins 6 caractères.'); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwMsg('Les mots de passe ne correspondent pas.'); return; }
    setSaving(true);
    try {
      await api.put('/auth/password', { currentPassword: pwForm.current, newPassword: pwForm.newPw });
      setPwMsg('Mot de passe modifié !');
      setPwForm({ current: '', newPw: '', confirm: '' });
    } catch (err) {
      setPwMsg(err.response?.data?.message ?? 'Erreur');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Profile info form */}
      <form onSubmit={handleProfileSave} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="form-label">Prénom</label>
            <input className="form-input" value={form.prenom} onChange={(e) => setForm(p => ({ ...p, prenom: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Nom</label>
            <input className="form-input" value={form.nom} onChange={(e) => setForm(p => ({ ...p, nom: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Filière</label>
            <input className="form-input" value={form.filiere} onChange={(e) => setForm(p => ({ ...p, filiere: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Promotion</label>
            <input className="form-input" value={form.promotion} onChange={(e) => setForm(p => ({ ...p, promotion: e.target.value }))} />
          </div>
        </div>
        {msg && <p style={{ fontSize: 13, color: msg.includes('!') ? '#276749' : '#9B2335', fontWeight: 600 }}>{msg}</p>}
        <button type="submit" className="btn btn-primary" disabled={saving} style={{ alignSelf: 'flex-start' }}>
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>

      {/* Password change form */}
      <form onSubmit={handlePasswordSave} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Lock size={15} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>Changer le mot de passe</span>
        </div>
        <div>
          <label className="form-label">Mot de passe actuel</label>
          <input type="password" className="form-input" value={pwForm.current} onChange={(e) => setPwForm(p => ({ ...p, current: e.target.value }))} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="form-label">Nouveau mot de passe</label>
            <input type="password" className="form-input" value={pwForm.newPw} onChange={(e) => setPwForm(p => ({ ...p, newPw: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Confirmer</label>
            <input type="password" className="form-input" value={pwForm.confirm} onChange={(e) => setPwForm(p => ({ ...p, confirm: e.target.value }))} />
          </div>
        </div>
        {pwMsg && <p style={{ fontSize: 13, color: pwMsg.includes('!') ? '#276749' : '#9B2335', fontWeight: 600 }}>{pwMsg}</p>}
        <button type="submit" className="btn btn-primary" disabled={saving} style={{ alignSelf: 'flex-start' }}>
          Changer le mot de passe
        </button>
      </form>
    </div>
  );
}
