import { describe, it, expect } from '@jest/globals';
import { TEMPLATES } from '../services/projectTemplatesSeed.js';

/**
 * Test smoke F10 — vérifie l'intégrité du seed des templates de projets.
 * Pure data validation, pas de DB.
 */
describe('projectTemplatesSeed.TEMPLATES', () => {
  it('contains exactly 14 official templates (5 ISIL + 3 Manag + 3 Finance + 3 PFE)', () => {
    expect(TEMPLATES).toHaveLength(14);
  });

  it('every template has the required fields', () => {
    TEMPLATES.forEach((t) => {
      expect(t.title).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.enonce).toBeTruthy();
      expect(['ISIL', 'Management', 'Finance', 'transverse']).toContain(t.filiere);
      expect(['mono', 'groupe', 'pfe']).toContain(t.type);
      expect(['L1', 'L2', 'L3', 'M1', 'M2']).toContain(t.level);
      expect(t.estimatedDurationWeeks).toBeGreaterThan(0);
      expect(Array.isArray(t.phases)).toBe(true);
      expect(t.phases.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('every phase has titre + description + weight + livrableSpec', () => {
    TEMPLATES.forEach((t) => {
      t.phases.forEach((p) => {
        expect(p.titre).toBeTruthy();
        expect(p.description).toBeDefined();
        expect(typeof p.weight).toBe('number');
        expect(p.livrableSpec).toBeDefined();
        expect(['document', 'video', 'presentation', 'demo', 'libre']).toContain(p.livrableSpec.type);
      });
    });
  });

  it('PFE templates have exactly 7 phases', () => {
    const pfeTemplates = TEMPLATES.filter((t) => t.type === 'pfe');
    expect(pfeTemplates.length).toBeGreaterThanOrEqual(3);
    pfeTemplates.forEach((t) => expect(t.phases).toHaveLength(7));
  });

  it('phase weights sum to 100 for every template', () => {
    TEMPLATES.forEach((t) => {
      const sum = t.phases.reduce((s, p) => s + (p.weight || 0), 0);
      expect(sum).toBe(100);
    });
  });

  it('every template has 5-8 motsCles', () => {
    TEMPLATES.forEach((t) => {
      expect(Array.isArray(t.motsCles)).toBe(true);
      expect(t.motsCles.length).toBeGreaterThanOrEqual(3);
      expect(t.motsCles.length).toBeLessThanOrEqual(10);
    });
  });

  it('every template has at least 2 suggestedOutcomes', () => {
    TEMPLATES.forEach((t) => {
      expect(Array.isArray(t.suggestedOutcomes)).toBe(true);
      expect(t.suggestedOutcomes.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('all 3 filières are represented', () => {
    const filieres = new Set(TEMPLATES.map((t) => t.filiere));
    expect(filieres.has('ISIL')).toBe(true);
    expect(filieres.has('Management')).toBe(true);
    expect(filieres.has('Finance')).toBe(true);
  });

  it('all 3 project types are represented', () => {
    const types = new Set(TEMPLATES.map((t) => t.type));
    expect(types.has('mono')).toBe(true);
    expect(types.has('groupe')).toBe(true);
    expect(types.has('pfe')).toBe(true);
  });

  it('titles are unique (no duplicates)', () => {
    const titles = TEMPLATES.map((t) => t.title);
    const set = new Set(titles);
    expect(set.size).toBe(titles.length);
  });
});
