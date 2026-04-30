/**
 * Constantes et helpers liés à la taxonomie de Bloom révisée
 * (Anderson & Krathwohl, 2001).
 */

export const BLOOM_LEVELS = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];

export const BLOOM_META = {
  remember:   { label: 'Mémoriser',  shortLabel: 'Remember',   color: '#64748B', bg: '#F1F5F9', verbs: ['identifier', 'lister', 'nommer', 'définir', 'reconnaître'] },
  understand: { label: 'Comprendre', shortLabel: 'Understand', color: '#3B82F6', bg: '#DBEAFE', verbs: ['expliquer', 'résumer', 'classer', 'comparer', 'illustrer'] },
  apply:      { label: 'Appliquer',  shortLabel: 'Apply',      color: '#10B981', bg: '#D1FAE5', verbs: ['implémenter', 'calculer', 'exécuter', 'utiliser', 'résoudre'] },
  analyze:    { label: 'Analyser',   shortLabel: 'Analyze',    color: '#F59E0B', bg: '#FEF3C7', verbs: ['différencier', 'organiser', 'comparer', 'décomposer', 'attribuer'] },
  evaluate:   { label: 'Évaluer',    shortLabel: 'Evaluate',   color: '#9333EA', bg: '#F3E8FF', verbs: ['justifier', 'critiquer', 'vérifier', 'argumenter', 'défendre'] },
  create:     { label: 'Créer',      shortLabel: 'Create',     color: '#EF4444', bg: '#FEE2E2', verbs: ['concevoir', 'formuler', 'planifier', 'produire', 'inventer'] },
};

export function bloomColor(level)     { return BLOOM_META[level]?.color ?? '#94A3B8'; }
export function bloomBg(level)        { return BLOOM_META[level]?.bg    ?? '#F1F5F9'; }
export function bloomLabel(level)     { return BLOOM_META[level]?.label ?? level; }
export function bloomVerbs(level)     { return BLOOM_META[level]?.verbs ?? []; }
