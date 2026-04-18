import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import {
  ArrowLeft, BarChart3, Users, Video as VideoIcon, FileText,
  Send, CheckCircle, Clock, AlertTriangle, Search, Bell,
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, suffix, color }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={color} />
        </div>
        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#1e293b' }}>
        {value}{suffix && <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>{suffix}</span>}
      </div>
    </div>
  );
}

function ProgressBar({ percent, color }) {
  return (
    <div style={{ width: '100%', height: 8, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ width: `${percent}%`, height: '100%', background: color, transition: 'width .3s' }} />
    </div>
  );
}

export default function ProfessorTracking() {
  const navigate = useNavigate();
  const { courseId } = useParams();

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(courseId || null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [reminderModal, setReminderModal] = useState(null);
  const [reminderMsg, setReminderMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState('');

  /* ── Charger la liste des cours du prof ────────────────────────────── */
  useEffect(() => {
    api.get('/tracking/my-courses').then(({ data }) => {
      setCourses(data);
      if (!selectedCourseId && data.length > 0) setSelectedCourseId(data[0]._id);
    }).catch(() => setCourses([]));
  }, []);

  /* ── Charger le tracking détaillé ──────────────────────────────────── */
  useEffect(() => {
    if (!selectedCourseId) return;
    setLoading(true);
    api.get(`/tracking/course/${selectedCourseId}`)
      .then(({ data }) => setData(data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [selectedCourseId]);

  const filtered = data?.students.filter(s => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (s.student.nom + ' ' + s.student.prenom + ' ' + s.student.email).toLowerCase().includes(q);
  }) || [];

  const openReminder = (student, target, resourceId, titreRessource) => {
    setReminderModal({ student, target, resourceId, titreRessource });
    setReminderMsg('');
  };

  const sendReminder = async () => {
    if (!reminderModal) return;
    setSending(true);
    try {
      const { data: res } = await api.post(`/tracking/course/${selectedCourseId}/remind`, {
        studentIds: [reminderModal.student._id],
        target: reminderModal.target,
        resourceId: reminderModal.resourceId,
        message: reminderMsg,
      });
      setFeedback(`Rappel envoyé (${res.sent}/${res.total}).`);
      setTimeout(() => setFeedback(''), 3000);
      setReminderModal(null);
    } catch (err) {
      setFeedback("Erreur d'envoi.");
      setTimeout(() => setFeedback(''), 3000);
    } finally {
      setSending(false);
    }
  };

  const remindAllMissing = async (target) => {
    if (!data) return;
    const studentIds = filtered
      .filter(r => (target === 'video' ? r.videos.missing.length : r.qcm.missing.length) > 0)
      .map(r => r.student._id);
    if (studentIds.length === 0) return;
    setSending(true);
    try {
      const { data: res } = await api.post(`/tracking/course/${selectedCourseId}/remind`, {
        studentIds,
        target: 'course',
      });
      setFeedback(`Rappel envoyé à ${res.sent} étudiants.`);
      setTimeout(() => setFeedback(''), 4000);
    } catch {
      setFeedback("Erreur d'envoi.");
      setTimeout(() => setFeedback(''), 3000);
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout title="Suivi des étudiants">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#1B4F72', cursor: 'pointer', fontSize: 15, fontWeight: 500, padding: '8px 0', marginBottom: 12 }}>
          <ArrowLeft size={18} /> Retour
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <BarChart3 size={28} color="#1B4F72" />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1B4F72', margin: 0 }}>Suivi des étudiants</h1>
        </div>
        <p style={{ color: '#64748b', marginBottom: 24 }}>
          Visualisez la progression de vos étudiants et envoyez des rappels ciblés.
        </p>

        {/* Sélecteur de cours */}
        {courses.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Cours</label>
            <select
              value={selectedCourseId || ''}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, minWidth: 300, background: 'white' }}
            >
              {courses.map(c => (
                <option key={c._id} value={c._id}>{c.titre} — {c.filiere} / {c.promotion}</option>
              ))}
            </select>
          </div>
        )}

        {courses.length === 0 && (
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 48, textAlign: 'center' }}>
            <Users size={36} color="#cbd5e1" style={{ marginBottom: 12 }} />
            <p style={{ color: '#64748b', margin: 0 }}>Aucun cours trouvé.</p>
          </div>
        )}

        {loading && <p style={{ color: '#64748b' }}>Chargement…</p>}

        {feedback && (
          <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 8, marginBottom: 16, fontSize: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
            <CheckCircle size={16} /> {feedback}
          </div>
        )}

        {data && (
          <>
            {/* Stats globales */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
              <StatCard icon={Users}      label="Étudiants"    value={data.stats.totalStudents} color="#1B4F72" />
              <StatCard icon={VideoIcon}  label="Vidéos vues"  value={data.stats.avgVideoPercent} suffix="%" color="#7c3aed" />
              <StatCard icon={FileText}   label="QCM complétés" value={data.stats.avgQcmPercent} suffix="%" color="#059669" />
              <StatCard icon={AlertTriangle} label="Inactifs > 7 j" value={data.stats.inactiveCount} color="#dc2626" />
            </div>

            {/* Barre de recherche + actions globales */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, position: 'relative', minWidth: 240 }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  placeholder="Rechercher un étudiant…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14 }}
                />
              </div>
              <button
                onClick={() => remindAllMissing('video')}
                disabled={sending}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, background: 'white', color: '#1e293b', fontSize: 13, fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer' }}
              >
                <Bell size={14} /> Rappel global
              </button>
            </div>

            {/* Tableau */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 120px', gap: 12, padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
                <div>Étudiant</div>
                <div>Vidéos</div>
                <div>QCM</div>
                <div>Dernière activité</div>
                <div style={{ textAlign: 'right' }}>Actions</div>
              </div>

              {filtered.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Aucun étudiant.</div>
              )}

              {filtered.map(row => {
                const last = row.lastActivity ? new Date(row.lastActivity).toLocaleDateString('fr-FR') : '—';
                return (
                  <div key={row.student._id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 120px', gap: 12, padding: '14px 16px', borderBottom: '1px solid #f1f5f9', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{row.student.prenom} {row.student.nom}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{row.student.email}</div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{row.videos.completed}/{row.videos.total}</span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>({row.videos.percent}%)</span>
                      </div>
                      <ProgressBar percent={row.videos.percent} color="#7c3aed" />
                      {row.videos.missing.length > 0 && (
                        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {row.videos.missing.slice(0, 2).map(v => (
                            <button
                              key={v._id}
                              onClick={() => openReminder(row.student, 'video', v._id, v.titre)}
                              title={`Rappeler : ${v.titre}`}
                              style={{ fontSize: 10, padding: '2px 6px', background: '#fef3c7', color: '#92400e', border: 'none', borderRadius: 4, cursor: 'pointer', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              ⏰ {v.titre}
                            </button>
                          ))}
                          {row.videos.missing.length > 2 && (
                            <span style={{ fontSize: 10, color: '#94a3b8' }}>+{row.videos.missing.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{row.qcm.completed}/{row.qcm.total}</span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>
                          ({row.qcm.percent}%{row.qcm.avgScore != null ? ` · moy ${row.qcm.avgScore}/100` : ''})
                        </span>
                      </div>
                      <ProgressBar percent={row.qcm.percent} color="#059669" />
                      {row.qcm.missing.length > 0 && (
                        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {row.qcm.missing.slice(0, 2).map(q => (
                            <button
                              key={q._id}
                              onClick={() => openReminder(row.student, 'qcm', q._id, q.titre)}
                              title={`Rappeler : ${q.titre}`}
                              style={{ fontSize: 10, padding: '2px 6px', background: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: 4, cursor: 'pointer', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              ⏰ {q.titre}
                            </button>
                          ))}
                          {row.qcm.missing.length > 2 && (
                            <span style={{ fontSize: 10, color: '#94a3b8' }}>+{row.qcm.missing.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: row.inactive ? '#dc2626' : '#475569' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> {last}
                      </div>
                      {row.inactive && <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>Inactif</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => openReminder(row.student, 'course', null, '')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', border: '1px solid #1B4F72', borderRadius: 6, background: 'white', color: '#1B4F72', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        <Send size={12} /> Rappel
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Modal de rappel personnalisé */}
        {reminderModal && (
          <div
            onClick={() => !sending && setReminderModal(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ background: 'white', borderRadius: 12, padding: 24, width: '100%', maxWidth: 480 }}
            >
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1B4F72', margin: 0, marginBottom: 6 }}>Envoyer un rappel</h3>
              <p style={{ fontSize: 14, color: '#64748b', margin: 0, marginBottom: 16 }}>
                À <strong>{reminderModal.student.prenom} {reminderModal.student.nom}</strong>
                {reminderModal.titreRessource && (<> — <em>{reminderModal.titreRessource}</em></>)}
              </p>
              <textarea
                value={reminderMsg}
                onChange={(e) => setReminderMsg(e.target.value)}
                placeholder="Message personnalisé (optionnel — un message par défaut sera envoyé si vide)"
                rows={4}
                style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', marginBottom: 12 }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  onClick={() => setReminderModal(null)}
                  disabled={sending}
                  style={{ padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                >
                  Annuler
                </button>
                <button
                  onClick={sendReminder}
                  disabled={sending}
                  style={{ padding: '8px 14px', border: 'none', borderRadius: 8, background: '#1B4F72', color: 'white', cursor: sending ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}
                >
                  {sending ? 'Envoi…' : 'Envoyer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
