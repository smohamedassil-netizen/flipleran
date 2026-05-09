import { useState } from 'react';
import Markdown from './Markdown.jsx';
import { BLOOM_META } from '../utils/bloom.js';
import {
  Target, BookOpen, ChevronDown, ChevronUp, CheckCircle, Clock, Circle,
} from 'lucide-react';

/**
 * PedagogicalHeader — Bandeau pédagogique en haut de StudentCourse :
 * contrat pédagogique (Biggs 1996) + liste des objectifs d'apprentissage
 * (Anderson & Krathwohl 2001) avec leur statut d'acquisition.
 *
 * Le statut d'un outcome est dérivé des capsules qui le couvrent
 * (Video.coversOutcomes) et de la progression de l'utilisateur :
 *   - mastered    : toutes les capsules liées sont complétées (≥ 80%)
 *   - inprogress  : au moins une capsule liée a été commencée
 *   - todo        : aucune capsule liée n'a été commencée
 *   - unlinked    : aucune capsule ne cible cet outcome
 *
 * Cette dérivation reste cohérente même si une partie du parcours utilise
 * des QCM ou Prosits non encore reliés aux outcomes : l'agrégation se base
 * sur le signal le plus fiable disponible (visionnage vidéo).
 */

function statusOf(outcome, videos) {
  const oid = outcome._id?.toString?.() || outcome._id;
  const linked = (videos || []).filter((v) =>
    Array.isArray(v.coversOutcomes) &&
    v.coversOutcomes.some((cid) => cid?.toString?.() === oid)
  );
  if (linked.length === 0) return 'unlinked';

  const allCompleted = linked.every((v) =>
    v.myProgress?.completed || (v.myProgress?.watchedPercent ?? 0) >= 80
  );
  if (allCompleted) return 'mastered';

  const someStarted = linked.some((v) => (v.myProgress?.watchedPercent ?? 0) > 0);
  return someStarted ? 'inprogress' : 'todo';
}

const STATUS_META = {
  mastered:   { label: 'Acquis',     color: '#10B981', bg: '#D1FAE5', Icon: CheckCircle },
  inprogress: { label: 'En cours',   color: '#F59E0B', bg: '#FEF3C7', Icon: Clock },
  todo:       { label: 'À acquérir', color: '#94A3B8', bg: '#F1F5F9', Icon: Circle },
  unlinked:   { label: 'À rattacher',color: '#94A3B8', bg: '#F1F5F9', Icon: Circle },
};

export default function PedagogicalHeader({ contract, outcomes, videos, isProfOrAdmin = false }) {
  const [contractOpen, setContractOpen] = useState(true);
  const [outcomesOpen, setOutcomesOpen] = useState(true);

  // Côté étudiant : on filtre les objectifs "unlinked" (non rattachés à une vidéo)
  // car le statut "À rattacher" est une action prof, pas une info utile à
  // l'apprenant. Côté prof/admin, on garde tout pour permettre la liaison.
  const visibleOutcomes = isProfOrAdmin
    ? (outcomes || [])
    : (outcomes || []).filter((o) => statusOf(o, videos) !== 'unlinked');

  const masteredCount = visibleOutcomes.reduce(
    (n, o) => statusOf(o, videos) === 'mastered' ? n + 1 : n, 0
  );

  // Si rien à afficher (étudiant + 0 outcome rattaché + pas de contrat), on rend null
  if (!contract && visibleOutcomes.length === 0) return null;

  return (
    <section style={{
      marginBottom: 18,
      display: 'grid',
      gap: 12,
    }}>
      {/* Contrat pédagogique */}
      {contract && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setContractOpen((v) => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px', background: 'linear-gradient(135deg, #EBF3FA, #F8FAFC)',
              border: 'none', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#1B4F72' }}>
              <BookOpen size={15} /> Contrat pédagogique
            </span>
            {contractOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {contractOpen && (
            <div style={{ padding: '12px 16px' }}>
              <Markdown source={contract} />
            </div>
          )}
        </div>
      )}

      {/* Objectifs d'apprentissage — filtré côté étudiant pour ne montrer que les rattachés */}
      {visibleOutcomes.length > 0 && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setOutcomesOpen((v) => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px', background: 'none', border: 'none',
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#1B4F72' }}>
              <Target size={15} /> Objectifs d'apprentissage
              <span style={{ padding: '2px 8px', background: '#EBF3FA', color: '#1B4F72', fontSize: 11, fontWeight: 700, borderRadius: 999, marginLeft: 6 }}>
                {masteredCount}/{outcomes.length} acquis
              </span>
            </span>
            {outcomesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {outcomesOpen && (
            <div style={{ padding: '6px 14px 14px' }}>
              <div style={{ display: 'grid', gap: 6 }}>
                {visibleOutcomes.map((o, i) => {
                  const status = statusOf(o, videos);
                  const stMeta = STATUS_META[status];
                  const StIcon = stMeta.Icon;
                  const meta = BLOOM_META[o.bloomLevel] || BLOOM_META.understand;
                  return (
                    <div key={o._id || i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px',
                      background: '#FAFCFE', borderRadius: 8,
                      border: '1px solid #E5E7EB',
                    }}>
                      <StIcon size={16} color={stMeta.color} style={{ flexShrink: 0 }} />
                      <span style={{
                        padding: '2px 8px', borderRadius: 999,
                        background: meta.bg, color: meta.color,
                        fontSize: 10, fontWeight: 700, flexShrink: 0,
                        textTransform: 'uppercase', letterSpacing: 0.4,
                      }}>
                        {meta.shortLabel}
                      </span>
                      <span style={{ fontSize: 13, color: '#1E293B', flex: 1, lineHeight: 1.4 }}>
                        {o.statement}
                      </span>
                      <span style={{
                        padding: '2px 8px', borderRadius: 999,
                        background: stMeta.bg, color: stMeta.color,
                        fontSize: 11, fontWeight: 700, flexShrink: 0,
                      }}>
                        {stMeta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '10px 0 0', fontStyle: 'italic' }}>
                Statut dérivé des capsules qui couvrent chaque objectif (visionnage ≥ 80% = acquis).
                Taxonomie : Anderson & Krathwohl (2001) ; alignement constructif : Biggs (1996).
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
