import { describe, it, expect } from '@jest/globals';
import { getPhasesTemplate, getRubricTemplate } from '../services/projectTemplates.js';

/**
 * Test smoke F8 — vérifie le contrat des templates phases + rubric pour les
 * 3 types de projets. Pure fonction, pas de DB ni Groq.
 */
describe('projectTemplates.getPhasesTemplate', () => {
  it('returns 3 phases for type "mono"', () => {
    const phases = getPhasesTemplate('mono');
    expect(phases).toHaveLength(3);
    expect(phases[0].titre).toBe('Cahier des charges');
    expect(phases[2].titre).toBe('Livraison finale');
  });

  it('returns 5 phases for type "groupe" (multi-modules)', () => {
    const phases = getPhasesTemplate('groupe');
    expect(phases).toHaveLength(5);
    expect(phases.map((p) => p.titre)).toContain('Synopsis');
    expect(phases.map((p) => p.titre)).toContain('Soutenance');
  });

  it('returns 7 phases for type "pfe"', () => {
    const phases = getPhasesTemplate('pfe');
    expect(phases).toHaveLength(7);
    expect(phases[0].titre).toBe('Étude bibliographique');
    expect(phases[5].titre).toBe('Mémoire');
    expect(phases[6].titre).toBe('Soutenance');
  });

  it('falls back to "mono" template for unknown type', () => {
    const phases = getPhasesTemplate('unknown-type');
    expect(phases).toHaveLength(3);
    expect(phases[0].titre).toBe('Cahier des charges');
  });

  it('every phase has a default statut "a_faire"', () => {
    for (const type of ['mono', 'groupe', 'pfe']) {
      const phases = getPhasesTemplate(type);
      phases.forEach((p) => expect(p.statut).toBe('a_faire'));
    }
  });

  it('every phase has a livrableSpec with type, isRequired, consigne', () => {
    for (const type of ['mono', 'groupe', 'pfe']) {
      const phases = getPhasesTemplate(type);
      phases.forEach((p) => {
        expect(p.livrableSpec).not.toBeNull();
        expect(p.livrableSpec.type).toBeDefined();
        expect(typeof p.livrableSpec.isRequired).toBe('boolean');
        expect(typeof p.livrableSpec.consigne).toBe('string');
      });
    }
  });

  it('weights of "pfe" template sum to 100', () => {
    const phases = getPhasesTemplate('pfe');
    const total = phases.reduce((s, p) => s + (p.weight || 0), 0);
    expect(total).toBe(100);
  });

  it('returned objects are independent clones (no mutation leak)', () => {
    const a = getPhasesTemplate('mono');
    a[0].titre = 'MUTATED';
    const b = getPhasesTemplate('mono');
    expect(b[0].titre).toBe('Cahier des charges'); // original preserved
  });
});

describe('projectTemplates.getRubricTemplate', () => {
  it('returns 5 criteria with descriptors', () => {
    const rubric = getRubricTemplate();
    expect(rubric).toHaveLength(5);
    rubric.forEach((c) => {
      expect(c.criterion).toBeDefined();
      expect(c.maxPoints).toBeGreaterThan(0);
      expect(Array.isArray(c.descriptors)).toBe(true);
      expect(c.descriptors.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('descriptor levels are between 1 and 5', () => {
    const rubric = getRubricTemplate();
    rubric.forEach((c) => {
      c.descriptors.forEach((d) => {
        expect(d.level).toBeGreaterThanOrEqual(1);
        expect(d.level).toBeLessThanOrEqual(5);
      });
    });
  });

  it('total maxPoints sums to 20 (note /20 française)', () => {
    const rubric = getRubricTemplate();
    const total = rubric.reduce((s, c) => s + (c.maxPoints || 0), 0);
    expect(total).toBe(20);
  });
});
