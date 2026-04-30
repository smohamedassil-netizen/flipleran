import { useState } from 'react';
import {
  ChevronDown, ChevronUp, CheckCircle, X, Play, FileText, Target, Lightbulb, Layers, Clock,
} from 'lucide-react';
import { BLOOM_META } from '../utils/bloom.js';

/**
 * Sous-composants d'AutoPrepReview — sortis pour respecter la limite 500 lignes.
 * Chaque section est collapsible et affiche les éléments générés par l'IA
 * avec un toggle Garder/Rejeter par item.
 */

/* ─── Section générique avec en-tête collapsible ──────────────────────────── */
export function CollapsibleSection({ icon: Icon, title, count, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', marginBottom: 14, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 16px', background: 'linear-gradient(135deg, #EBF3FA, #F8FAFC)',
          border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <Icon size={17} color="#1B4F72" />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1B4F72', flex: 1 }}>{title}</span>
        {typeof count === 'number' && (
          <span style={{ padding: '2px 10px', borderRadius: 999, background: '#1B4F72', color: 'white', fontSize: 11, fontWeight: 700 }}>
            {count}
          </span>
        )}
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && <div style={{ padding: 14 }}>{children}</div>}
    </div>
  );
}

/* ─── Toggle Keep/Reject ──────────────────────────────────────────────────── */
function KeepToggle({ kept, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!kept)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 12px', borderRadius: 999,
        background: kept ? '#D1FAE5' : '#FEE2E2',
        color: kept ? '#065F46' : '#991B1B',
        border: 'none', cursor: 'pointer',
        fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
      }}
    >
      {kept ? <><CheckCircle size={11} /> Garder</> : <><X size={11} /> Rejeter</>}
    </button>
  );
}

/* ─── Format mm:ss ────────────────────────────────────────────────────────── */
function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/* ─── Section In-video questions ──────────────────────────────────────────── */
export function InVideoQuestionsSection({ items, selections, onToggle }) {
  return (
    <CollapsibleSection icon={Play} title="Questions in-video (méthode EdPuzzle)" count={items.length}>
      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }}>Aucune question générée.</p>
      ) : (
        items.map((q, i) => (
          <div key={i} style={{ padding: 12, marginBottom: 10, background: '#FAFCFE', borderRadius: 10, border: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ padding: '2px 8px', background: '#FEF3C7', color: '#92400E', fontSize: 11, fontWeight: 700, borderRadius: 999 }}>
                <Clock size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                {fmtTime(q.timestamp)}
              </span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{q.question}</span>
              <KeepToggle kept={selections[i]} onChange={(v) => onToggle(i, v)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 6 }}>
              {['A', 'B', 'C', 'D'].map((opt) => (
                <div
                  key={opt}
                  style={{
                    padding: '6px 10px', borderRadius: 6, fontSize: 12,
                    background: opt === q.correctAnswer ? '#DCFCE7' : '#F1F5F9',
                    border: opt === q.correctAnswer ? '1px solid #15803D' : '1px solid transparent',
                  }}
                >
                  <strong style={{ color: opt === q.correctAnswer ? '#15803D' : '#475569' }}>{opt}.</strong> {q.options[opt]}
                </div>
              ))}
            </div>
            {q.explanation && (
              <p style={{ fontSize: 11, color: '#64748B', fontStyle: 'italic', margin: '6px 0 0' }}>
                💡 {q.explanation}
              </p>
            )}
          </div>
        ))
      )}
    </CollapsibleSection>
  );
}

/* ─── Section QCM ─────────────────────────────────────────────────────────── */
export function QCMSection({ qcm, kept, onToggle }) {
  const [showDetail, setShowDetail] = useState(false);
  if (!qcm) {
    return (
      <CollapsibleSection icon={FileText} title="QCM généré" count={0}>
        <p style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }}>Aucun QCM généré.</p>
      </CollapsibleSection>
    );
  }

  const bloomCount = (qcm.questions || []).reduce((acc, q) => {
    acc[q.bloomLevel] = (acc[q.bloomLevel] || 0) + 1;
    return acc;
  }, {});

  return (
    <CollapsibleSection icon={FileText} title="QCM généré" count={qcm.questions?.length || 0}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1E293B' }}>{qcm.titre}</p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748B' }}>
            Mix Bloom : {Object.entries(bloomCount).map(([k, v]) => `${v} ${BLOOM_META[k]?.label || k}`).join(' · ')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => setShowDetail((v) => !v)} className="btn btn-ghost btn-sm">
            {showDetail ? 'Masquer le détail' : 'Voir le détail'}
          </button>
          <KeepToggle kept={kept} onChange={onToggle} />
        </div>
      </div>
      {showDetail && (
        <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
          {(qcm.questions || []).map((q, i) => (
            <div key={i} style={{ padding: 10, background: '#F8FAFC', borderRadius: 8, fontSize: 12 }}>
              <p style={{ margin: 0, fontWeight: 600, color: '#1E293B' }}>
                {i + 1}. {q.texte}{' '}
                {q.bloomLevel && (
                  <span style={{ padding: '1px 6px', borderRadius: 999, background: BLOOM_META[q.bloomLevel]?.bg, color: BLOOM_META[q.bloomLevel]?.color, fontSize: 10, fontWeight: 700, marginLeft: 4 }}>
                    {BLOOM_META[q.bloomLevel]?.shortLabel}
                  </span>
                )}
              </p>
              <p style={{ margin: '2px 0 0', color: '#475569' }}>
                Réponse correcte : <strong>{q.correctAnswer}.</strong> {q.options[q.correctAnswer]}
              </p>
            </div>
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}

/* ─── Section Outcomes Bloom ──────────────────────────────────────────────── */
export function OutcomesSection({ items, selections, onToggle }) {
  return (
    <CollapsibleSection icon={Target} title="Objectifs d'apprentissage Bloom-aligned" count={items.length}>
      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }}>Aucun outcome généré.</p>
      ) : (
        items.map((o, i) => {
          const meta = BLOOM_META[o.bloomLevel] || BLOOM_META.understand;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, marginBottom: 8, background: '#FAFCFE', borderRadius: 8, border: '1px solid #E5E7EB' }}>
              <span style={{
                padding: '3px 10px', borderRadius: 999,
                background: meta.bg, color: meta.color,
                fontSize: 10, fontWeight: 700, flexShrink: 0,
                textTransform: 'uppercase', letterSpacing: 0.4,
              }}>
                {meta.shortLabel}
              </span>
              <span style={{ flex: 1, fontSize: 13, color: '#1E293B' }}>{o.statement}</span>
              <span style={{ fontSize: 11, color: '#64748B', flexShrink: 0 }}>
                ~{o.estimatedMinutes} min
              </span>
              <KeepToggle kept={selections[i]} onChange={(v) => onToggle(i, v)} />
            </div>
          );
        })
      )}
    </CollapsibleSection>
  );
}

/* ─── Section Prosit suggestion ───────────────────────────────────────────── */
export function ProsiSuggestionSection({ data, kept, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  if (!data || !data.titre) {
    return (
      <CollapsibleSection icon={Lightbulb} title="Suggestion de Prosit (CESI/APP)" count={0}>
        <p style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }}>Aucune suggestion générée.</p>
      </CollapsibleSection>
    );
  }
  const enonce = data.enonce || '';
  const truncated = !expanded && enonce.length > 300 ? enonce.slice(0, 300) + '…' : enonce;

  return (
    <CollapsibleSection icon={Lightbulb} title="Suggestion de Prosit (CESI/APP)">
      <div style={{ padding: 12, background: '#FFFBEB', borderRadius: 10, border: '1px solid #FDE68A' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#92400E' }}>{data.titre}</p>
          <KeepToggle kept={kept} onChange={onToggle} />
        </div>
        {data.problematique && (
          <p style={{ margin: '0 0 8px', fontSize: 12, color: '#78350F', fontStyle: 'italic' }}>
            « {data.problematique} »
          </p>
        )}
        <p style={{ margin: 0, fontSize: 13, color: '#1E293B', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          {truncated}
        </p>
        {enonce.length > 300 && (
          <button type="button" onClick={() => setExpanded((v) => !v)} className="btn btn-ghost btn-sm" style={{ marginTop: 6 }}>
            {expanded ? 'Réduire' : 'Lire plus'}
          </button>
        )}
        {data.motsCles?.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {data.motsCles.map((m, i) => (
              <span key={i} style={{ padding: '2px 8px', background: '#FEF3C7', color: '#78350F', fontSize: 11, fontWeight: 600, borderRadius: 999 }}>
                {m}
              </span>
            ))}
          </div>
        )}
        <p style={{ margin: '10px 0 0', fontSize: 11, color: '#92400E', fontStyle: 'italic' }}>
          Si validé, tu seras redirigé vers le formulaire de création de Prosit pré-rempli (brouillon, à compléter).
        </p>
      </div>
    </CollapsibleSection>
  );
}

/* ─── Section Flashcards ──────────────────────────────────────────────────── */
export function FlashcardsSection({ items, selections, onToggle, onToggleAll }) {
  const allKept = selections.every(Boolean);
  return (
    <CollapsibleSection icon={Layers} title="Flashcards SM-2 (Anki)" count={items.length}>
      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }}>Aucune flashcard générée.</p>
      ) : (
        <>
          <div style={{ marginBottom: 10, textAlign: 'right' }}>
            <button type="button" onClick={() => onToggleAll(!allKept)} className="btn btn-ghost btn-sm">
              {allKept ? 'Tout rejeter' : 'Tout garder'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8 }}>
            {items.map((c, i) => (
              <div key={i} style={{ padding: 10, background: '#FAFCFE', borderRadius: 8, border: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ padding: '1px 8px', borderRadius: 999, background: c.difficulty <= 2 ? '#DCFCE7' : c.difficulty >= 4 ? '#FEE2E2' : '#FEF3C7', color: c.difficulty <= 2 ? '#15803D' : c.difficulty >= 4 ? '#991B1B' : '#92400E', fontSize: 10, fontWeight: 700 }}>
                    {c.difficulty}/5
                  </span>
                  <KeepToggle kept={selections[i]} onChange={(v) => onToggle(i, v)} />
                </div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1E293B' }}>Q. {c.front}</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569', lineHeight: 1.4 }}>R. {c.back}</p>
                {c.tags?.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {c.tags.map((t, j) => (
                      <span key={j} style={{ padding: '1px 6px', background: '#EBF3FA', color: '#1B4F72', fontSize: 10, fontWeight: 600, borderRadius: 999 }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </CollapsibleSection>
  );
}
