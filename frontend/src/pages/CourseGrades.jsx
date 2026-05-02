import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../utils/api.js';
import {
  ArrowLeft, Download, Settings, ToggleLeft, ToggleRight,
  TrendingUp, Users, Award, AlertCircle, CheckCircle2,
} from 'lucide-react';

/**
 * CourseGrades — vue prof du tableau des notes de contrôle continu d'une promo.
 *
 * Source : GET /api/courses/:id/grades
 *          PUT /api/courses/:id/grade-settings
 *
 * Pédagogie : Black & Wiliam (1998) distinguent l'évaluation formative
 * (continue, non notée) de la sommative (notée). Le toggle "QCM compte
 * dans la note" laisse le prof décider selon son usage du QCM.
 */
const gradeColor = (g) => {
  if (g === null) return '#94A3B8';
  if (g >= 16) return '#15803D';
  if (g >= 12) return '#1B4F72';
  if (g >= 10) return '#B45309';
  return '#B91C1C';
};

export default function CourseGrades() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();

  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState('');
  const [weights, setWeights]   = useState(null);
  const [qcmToggle, setQcmToggle] = useState(false);

  const load = () => {
    setLoading(true);
    api.get(`/courses/${courseId}/grades`)
      .then(({ data }) => {
        setData(data);
        setQcmToggle(data.course.qcmCountsInGrade);
        setWeights(data.course.gradeWeights);
      })
      .catch((err) => setError(err.response?.data?.message || 'Erreur de chargement'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [courseId]);

  const saveSettings = async (newToggle, newWeights) => {
    setSaving(true);
    setSaveError('');
    try {
      const body = {};
      if (newToggle !== undefined) body.qcmCountsInGrade = newToggle;
      if (newWeights) body.gradeWeights = newWeights;
      await api.put(`/courses/${courseId}/grade-settings`, body);
      load();
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    if (!data) return;
    const header = ['Nom', 'Prénom', 'Email', 'Semestre', 'Note finale /20', 'QCM /20', 'Prosit /20', 'Projet /20', 'Validation /20'];
    const rows = data.rows.map(r => [
      r.student.nom,
      r.student.prenom,
      r.student.email,
      r.student.semestre || '',
      r.finalGrade ?? '',
      r.breakdown?.qcm ?? '',
      r.breakdown?.prosit ?? '',
      r.breakdown?.project ?? '',
      r.breakdown?.validation ?? '',
    ]);
    const csv = [header, ...rows].map(line => line.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes_${data.course.titre.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <Layout title="Notes du module"><div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Chargement…</div></Layout>;
  }

  if (error || !data) {
    return (
      <Layout title="Notes du module">
        <div className="alert alert-error" style={{ margin: 24 }}>
          <AlertCircle size={16} /> {error || 'Données indisponibles'}
        </div>
      </Layout>
    );
  }

  const { course, stats, rows } = data;

  return (
    <Layout title={`Notes — ${course.titre}`}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px' }}>
        <Link to={`/courses/${courseId}`} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          color: '#64748B', textDecoration: 'none', fontSize: 13, marginBottom: 12,
        }}>
          <ArrowLeft size={14} /> Retour au module
        </Link>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          gap: 12, flexWrap: 'wrap', marginBottom: 16,
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1B4F72' }}>
              Notes de contrôle continu
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748B' }}>
              {course.titre}
            </p>
          </div>
          <button
            type="button"
            onClick={exportCSV}
            style={{
              padding: '8px 14px', background: 'white',
              border: '1px solid #E2E8F0', borderRadius: 8,
              fontSize: 13, fontWeight: 600, color: '#1B4F72',
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            <Download size={14} /> Exporter en CSV
          </button>
        </div>

        {/* Statistiques globales */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 10, marginBottom: 20,
        }}>
          <Stat label="Étudiants suivis" value={stats.students} Icon={Users} color="#3B82F6" />
          <Stat label="Étudiants notés" value={stats.graded} Icon={CheckCircle2} color="#15803D" />
          <Stat label="Moyenne classe" value={stats.average !== null ? `${stats.average}/20` : '—'} Icon={TrendingUp} color="#B45309" highlight />
          <Stat label="Min / Max" value={stats.min !== null ? `${stats.min} → ${stats.max}` : '—'} Icon={Award} color="#9333EA" />
        </div>

        {/* Toggle paramètres notation */}
        <div style={{
          background: 'white', border: '1px solid #E2E8F0',
          borderRadius: 12, padding: 16, marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Settings size={16} color="#1B4F72" />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1B4F72' }}>
              Paramètres de notation
            </h3>
          </div>

          {/* Toggle QCM */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: 12, background: '#F8FAFC',
            borderRadius: 8, marginBottom: 10, flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1B4F72' }}>
                Les QCM comptent-ils dans la note CC ?
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748B', lineHeight: 1.4 }}>
                {qcmToggle
                  ? 'Activé : la moyenne des QCM (best score) compte dans la note finale.'
                  : 'Désactivé : QCM = formatif uniquement (avant cours, Black & Wiliam 1998).'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => saveSettings(!qcmToggle, weights)}
              disabled={saving}
              style={{
                padding: '6px 12px',
                background: qcmToggle ? '#15803D' : '#E2E8F0',
                color: qcmToggle ? 'white' : '#64748B',
                border: 'none', borderRadius: 999,
                fontSize: 12, fontWeight: 700,
                cursor: saving ? 'wait' : 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              {qcmToggle ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
              {qcmToggle ? 'Activé' : 'Désactivé'}
            </button>
          </div>

          {/* Pondérations */}
          <p style={{ margin: '12px 0 6px', fontSize: 11, color: '#94A3B8', fontWeight: 700, letterSpacing: 0.5 }}>
            PONDÉRATIONS (somme = 100)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
            {['qcm', 'prosit', 'project', 'validation'].map((k) => (
              <div key={k} style={{
                background: '#F8FAFC', borderRadius: 8, padding: 8, textAlign: 'center',
                opacity: !qcmToggle && k === 'qcm' ? 0.4 : 1,
              }}>
                <p style={{ margin: 0, fontSize: 11, color: '#64748B', textTransform: 'capitalize' }}>{k}</p>
                <input
                  type="number" min={0} max={100}
                  value={weights?.[k] ?? 0}
                  disabled={!qcmToggle && k === 'qcm'}
                  onChange={(e) => setWeights(w => ({ ...w, [k]: Number(e.target.value) }))}
                  style={{
                    width: 60, padding: '4px 8px', textAlign: 'center',
                    border: '1px solid #CBD5E1', borderRadius: 6,
                    fontSize: 14, fontWeight: 700, color: '#1B4F72',
                    fontFamily: 'inherit',
                  }}
                />
                <span style={{ fontSize: 11, color: '#94A3B8' }}>%</span>
              </div>
            ))}
          </div>
          {weights && (
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: (weights.qcm + weights.prosit + weights.project + weights.validation) === 100 ? '#15803D' : '#B91C1C',
              }}>
                Total : {weights.qcm + weights.prosit + weights.project + weights.validation} / 100
              </span>
              <button
                type="button"
                onClick={() => saveSettings(qcmToggle, weights)}
                disabled={saving || (weights.qcm + weights.prosit + weights.project + weights.validation) !== 100}
                style={{
                  padding: '6px 14px',
                  background: (weights.qcm + weights.prosit + weights.project + weights.validation) === 100
                    ? 'linear-gradient(135deg, #1B4F72, #2874A6)'
                    : '#E2E8F0',
                  color: (weights.qcm + weights.prosit + weights.project + weights.validation) === 100 ? 'white' : '#94A3B8',
                  border: 'none', borderRadius: 8,
                  fontSize: 12, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Enregistrer les pondérations
              </button>
            </div>
          )}
          {saveError && <p style={{ marginTop: 8, fontSize: 12, color: '#B91C1C' }}>{saveError}</p>}
        </div>

        {/* Tableau des notes */}
        <div style={{
          background: 'white', border: '1px solid #E2E8F0',
          borderRadius: 12, overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={th}>#</th>
                  <th style={th}>Étudiant</th>
                  <th style={th}>Sem.</th>
                  <th style={{ ...th, textAlign: 'center' }}>QCM</th>
                  <th style={{ ...th, textAlign: 'center' }}>Prosit</th>
                  <th style={{ ...th, textAlign: 'center' }}>Projet</th>
                  <th style={{ ...th, textAlign: 'center' }}>Validation</th>
                  <th style={{ ...th, textAlign: 'center' }}>Note finale /20</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#94A3B8' }}>
                    Aucun étudiant trouvé pour cette filière/promotion.
                  </td></tr>
                )}
                {rows.map((r, i) => (
                  <tr key={r.student._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={td}>{i + 1}</td>
                    <td style={td}>
                      <div style={{ fontWeight: 600, color: '#1B4F72' }}>
                        {r.student.prenom} {r.student.nom}
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>{r.student.email}</div>
                    </td>
                    <td style={td}>{r.student.semestre || '—'}</td>
                    <td style={{ ...td, textAlign: 'center', color: gradeColor(r.breakdown?.qcm) }}>
                      {r.breakdown?.qcm !== null && r.breakdown?.qcm !== undefined ? `${r.breakdown.qcm}/20` : '—'}
                    </td>
                    <td style={{ ...td, textAlign: 'center', color: gradeColor(r.breakdown?.prosit) }}>
                      {r.breakdown?.prosit !== null && r.breakdown?.prosit !== undefined ? `${r.breakdown.prosit}/20` : '—'}
                    </td>
                    <td style={{ ...td, textAlign: 'center', color: gradeColor(r.breakdown?.project) }}>
                      {r.breakdown?.project !== null && r.breakdown?.project !== undefined ? `${r.breakdown.project}/20` : '—'}
                    </td>
                    <td style={{ ...td, textAlign: 'center', color: gradeColor(r.breakdown?.validation) }}>
                      {r.breakdown?.validation !== null && r.breakdown?.validation !== undefined ? `${r.breakdown.validation}/20` : '—'}
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      {r.finalGrade !== null ? (
                        <span style={{
                          display: 'inline-block', minWidth: 56,
                          padding: '4px 10px', borderRadius: 999,
                          background: `${gradeColor(r.finalGrade)}15`,
                          color: gradeColor(r.finalGrade),
                          fontWeight: 800, fontSize: 13,
                        }}>
                          {r.finalGrade}
                        </span>
                      ) : <span style={{ color: '#94A3B8' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p style={{ marginTop: 12, fontSize: 11, color: '#94A3B8', fontStyle: 'italic', textAlign: 'center' }}>
          Notes calculées en moyenne pondérée. Les composantes non notées sont ignorées
          (pas de pénalité). Black &amp; Wiliam (1998) — évaluation formative vs sommative.
        </p>
      </div>
    </Layout>
  );
}

function Stat({ label, value, Icon, color, highlight }) {
  return (
    <div style={{
      background: highlight ? `${color}15` : 'white',
      border: `1px solid ${highlight ? color + '40' : '#E2E8F0'}`,
      borderRadius: 10, padding: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Icon size={14} color={color} />
        <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

const th = {
  padding: '10px 14px', textAlign: 'left',
  fontSize: 11, fontWeight: 700, color: '#64748B',
  textTransform: 'uppercase', letterSpacing: 0.5,
};
const td = {
  padding: '10px 14px', color: '#1E293B',
};
