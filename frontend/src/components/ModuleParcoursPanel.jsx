import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api.js';
import {
  BookOpen, ClipboardCheck, Users, Rocket, RotateCcw,
  Lock, CheckCircle2, CircleDashed, ArrowRight, Award,
  TrendingUp, Info,
} from 'lucide-react';

/**
 * ModuleParcoursPanel — affiche en haut de la page d'un cours le parcours
 * pédagogique en 5 phases du Cycle d'Apprentissage Inversé (CAI), avec
 * déblocage progressif et accès direct à la validation finale du module.
 *
 * Source : GET /api/journey/me/:courseId (existant) + GET /api/courses/:id/my-completion
 *
 * Conçu pour cohabiter avec la liste de vidéos existante de StudentCourse.jsx.
 * Compact, dense en information, mais non bloquant : si l'API échoue, le panel
 * s'efface silencieusement et la page reste utilisable.
 */
export default function ModuleParcoursPanel({ courseId }) {
  const navigate = useNavigate();
  const [data, setData]         = useState(null);
  const [completion, setCompl]  = useState(null);
  const [grade, setGrade]       = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      api.get(`/journey/me/${courseId}`).catch(() => ({ data: null })),
      api.get(`/courses/${courseId}/my-completion`).catch(() => ({ data: null })),
      api.get(`/courses/${courseId}/my-grade`).catch(() => ({ data: null })),
    ]).then(([j, c, g]) => {
      if (cancelled) return;
      setData(j.data);
      setCompl(c.data);
      setGrade(g.data);
    }).finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [courseId]);

  if (loading || !data) return null;
  const { steps, cycleProgress } = data;

  const phases = [
    {
      key: 'preparation',
      title: 'Préparation',
      Icon: BookOpen,
      status: steps.preparation.status,
      detail: `Vidéos ${steps.preparation.details.videosWatched}/${steps.preparation.details.videosTotal} · QCM ${steps.preparation.details.quizzesPassed}/${steps.preparation.details.quizzesTotal}`,
      action: null, // déjà sur la page du cours, pas besoin de naviguer
    },
    {
      key: 'rendezvous',
      title: 'Rendez-vous',
      Icon: ClipboardCheck,
      status: steps.rendezvous.status,
      detail: steps.rendezvous.nextClassDate
        ? new Date(steps.rendezvous.nextClassDate).toLocaleDateString('fr-FR')
        : 'Activité présentielle',
      action: null,
    },
    {
      key: 'application',
      title: 'Application',
      Icon: Users,
      status: steps.application.status,
      detail: `Prosit ${steps.application.details.prositsCompleted}/${steps.application.details.prositsTotal} terminé${steps.application.details.prositsCompleted > 1 ? 's' : ''}`,
      action: { label: 'Voir les Prosits', to: `/prosits?courseId=${courseId}` },
      lockedReason: 'Termine la préparation pour débloquer',
    },
    {
      key: 'production',
      title: 'Production',
      Icon: Rocket,
      status: steps.production.status,
      detail: steps.production.details.projectsTotal === 0
        ? 'Aucun projet associé'
        : `Projet : ${steps.production.details.projectsSubmitted > 0 ? 'livré' : 'en cours'}`,
      action: { label: 'Voir le projet', to: `/projects?courseId=${courseId}` },
      lockedReason: steps.preparation.status !== 'completed'
        ? 'Termine la préparation puis 1 Prosit pour débloquer'
        : 'Termine au moins 1 Prosit pour débloquer',
    },
    {
      key: 'consolidation',
      title: 'Consolidation',
      Icon: RotateCcw,
      status: steps.consolidation.status,
      detail: `${steps.consolidation.details.cardsDue} carte${steps.consolidation.details.cardsDue !== 1 ? 's' : ''} à réviser`,
      action: { label: 'Réviser', to: '/decks' },
      lockedReason: 'Commence une vidéo pour débloquer',
    },
  ];

  const allPhasesReady = (
    steps.preparation.status === 'completed' &&
    steps.application.details.prositsCompleted >= 1
  );
  const isValidated = !!completion?.validated;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)',
      border: '1px solid #BAE6FD',
      borderRadius: 14,
      padding: 18,
      marginBottom: 20,
    }}>
      {/* Header — progression globale */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: '#1B4F72' }}>
            PARCOURS PÉDAGOGIQUE — CYCLE D'APPRENTISSAGE INVERSÉ
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#475569' }}>
            Suis les 5 phases dans l'ordre. Chaque phase débloque la suivante.
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 11, color: '#64748B', fontWeight: 700 }}>PROGRESSION</p>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: cycleProgress >= 80 ? '#15803D' : cycleProgress >= 40 ? '#B45309' : '#1B4F72' }}>
            {cycleProgress}%
          </p>
        </div>
      </div>

      {/* Barre de progression */}
      <div style={{ height: 6, background: '#E0E7FF', borderRadius: 999, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{
          width: `${cycleProgress}%`,
          height: '100%',
          background: cycleProgress >= 80 ? '#22C55E' : cycleProgress >= 40 ? '#F59E0B' : '#3B82F6',
          transition: 'width 400ms ease',
        }} />
      </div>

      {/* 5 phases en grille */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 10,
        marginBottom: 14,
      }}>
        {phases.map((p, i) => {
          const isCompleted = p.status === 'completed';
          const isInProgress = ['in-progress', 'active', 'upcoming'].includes(p.status);
          const isLocked = p.status === 'locked';
          const isUnknown = p.status === 'unknown';

          const palette = isCompleted
            ? { bg: 'white', border: '#BBF7D0', accent: '#15803D' }
            : isInProgress
              ? { bg: 'white', border: '#FDE68A', accent: '#B45309' }
              : { bg: '#F8FAFC', border: '#E2E8F0', accent: '#94A3B8' };

          const StatusIcon = isCompleted ? CheckCircle2 : (isLocked ? Lock : CircleDashed);

          return (
            <div
              key={p.key}
              title={isLocked ? p.lockedReason : undefined}
              style={{
                background: palette.bg,
                border: `1.5px solid ${palette.border}`,
                borderRadius: 10,
                padding: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                opacity: isLocked ? 0.65 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p.Icon size={16} color={palette.accent} />
                <StatusIcon size={14} color={palette.accent} />
              </div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: palette.accent, letterSpacing: 0.3 }}>
                {i + 1}. {p.title.toUpperCase()}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: '#475569', minHeight: 28 }}>
                {p.detail}
              </p>
              {p.action && !isLocked && !isUnknown && (
                <button
                  type="button"
                  onClick={() => navigate(p.action.to)}
                  style={{
                    background: palette.accent, color: 'white', border: 'none',
                    borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
                    justifyContent: 'center', gap: 3, marginTop: 'auto',
                  }}
                >
                  {p.action.label} <ArrowRight size={11} />
                </button>
              )}
              {isLocked && (
                <p style={{ margin: 0, fontSize: 10, color: '#94A3B8', fontStyle: 'italic', marginTop: 'auto' }}>
                  🔒 verrouillé
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Validation du module */}
      <div style={{
        background: isValidated ? '#F0FDF4' : 'white',
        border: `1.5px solid ${isValidated ? '#86EFAC' : '#E2E8F0'}`,
        borderRadius: 10,
        padding: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <Award size={22} color={isValidated ? '#15803D' : (allPhasesReady ? '#D97706' : '#94A3B8')} />
        <div style={{ flex: 1, minWidth: 160 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isValidated ? '#15803D' : '#1B4F72' }}>
            {isValidated
              ? 'Module validé !'
              : allPhasesReady
                ? 'Prêt à valider ce module'
                : 'Validation finale du module'}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B' }}>
            {isValidated
              ? `Compétence acquise le ${new Date(completion.validatedAt).toLocaleDateString('fr-FR')}`
              : allPhasesReady
                ? 'Fais une auto-évaluation métacognitive pour obtenir ton badge de compétence.'
                : 'Termine la préparation et au moins 1 Prosit pour débloquer la validation.'}
          </p>
        </div>
        {!isValidated && (
          <button
            type="button"
            disabled={!allPhasesReady}
            onClick={() => navigate(`/courses/${courseId}/validate`)}
            style={{
              background: allPhasesReady ? 'linear-gradient(135deg, #1B4F72, #2874A6)' : '#E2E8F0',
              color: allPhasesReady ? 'white' : '#94A3B8',
              border: 'none', borderRadius: 8, padding: '8px 14px',
              fontSize: 13, fontWeight: 700,
              cursor: allPhasesReady ? 'pointer' : 'not-allowed',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            Valider le module <ArrowRight size={13} />
          </button>
        )}
      </div>

      {/* Note de contrôle continu — séparée des XP gamification */}
      {grade && grade.finalGrade !== null && (
        <div style={{
          marginTop: 12,
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          padding: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 10,
            background: gradeColor(grade.finalGrade),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: 16, flexShrink: 0,
          }}>
            {grade.finalGrade}
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: 0.5 }}>
              NOTE DE CONTRÔLE CONTINU /20
            </p>
            <p style={{ margin: '2px 0 4px', fontSize: 12, color: '#475569' }}>
              {grade.qcmCountsInGrade
                ? 'QCM inclus dans la note (paramétré par le prof)'
                : 'QCM = formatif uniquement (Black & Wiliam 1998)'}
            </p>
            {/* Détail des composantes notées */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11 }}>
              {grade.qcmCountsInGrade && grade.breakdown.qcm !== null && (
                <Pill label="QCM" value={`${grade.breakdown.qcm}/20`} weight={grade.weights.qcm} />
              )}
              {grade.breakdown.prosit !== null && (
                <Pill label="Prosit" value={`${grade.breakdown.prosit}/20`} weight={grade.weights.prosit} />
              )}
              {grade.breakdown.project !== null && (
                <Pill label="Projet" value={`${grade.breakdown.project}/20`} weight={grade.weights.project} />
              )}
              {grade.breakdown.validation !== null && (
                <Pill label="Validation" value="20/20" weight={grade.weights.validation} />
              )}
            </div>
          </div>
          <Info size={14} color="#94A3B8" title="La note CC est séparée des XP gamification" />
        </div>
      )}
    </div>
  );
}

function gradeColor(g) {
  if (g >= 16) return 'linear-gradient(135deg, #15803D, #16A34A)';
  if (g >= 12) return 'linear-gradient(135deg, #1B4F72, #2874A6)';
  if (g >= 10) return 'linear-gradient(135deg, #B45309, #D97706)';
  return 'linear-gradient(135deg, #B91C1C, #DC2626)';
}

function Pill({ label, value, weight }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 999,
      background: '#F8FAFC', border: '1px solid #E2E8F0',
      color: '#475569', fontWeight: 600,
    }}>
      {label} {value} <span style={{ color: '#94A3B8', fontWeight: 400 }}>({weight}%)</span>
    </span>
  );
}
