import { describe, it, expect } from '@jest/globals';
import { computeFrontHash } from '../services/autoFlashcards.js';

/**
 * Test smoke F6 — vérifie le contrat de déduplication des flashcards
 * auto-générées. Ne mocke pas Groq (testé indirectement via courseAutoPrep) :
 * le hash est la pierre angulaire qui empêche le cron hebdo de créer des
 * doublons à chaque run.
 */
describe('autoFlashcards.computeFrontHash', () => {
  it('returns a stable 16-char hex hash', () => {
    const h = computeFrontHash('Qu\'est-ce que CSRF ?');
    expect(h).toMatch(/^[a-f0-9]{16}$/);
  });

  it('is deterministic — same input → same hash', () => {
    const front = 'Définis le principe SOLID O.';
    expect(computeFrontHash(front)).toBe(computeFrontHash(front));
  });

  it('normalizes whitespace and case (dedup robust to typo variations)', () => {
    const a = computeFrontHash('  Définis CSRF  ');
    const b = computeFrontHash('définis csrf');
    const c = computeFrontHash('définis  csrf'); // double space
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('produces different hashes for distinct concepts', () => {
    expect(computeFrontHash('Qu\'est-ce que CSRF ?'))
      .not.toBe(computeFrontHash('Qu\'est-ce que XSS ?'));
  });

  it('handles empty / null / undefined gracefully', () => {
    expect(computeFrontHash('')).toMatch(/^[a-f0-9]{16}$/);
    expect(computeFrontHash(null)).toMatch(/^[a-f0-9]{16}$/);
    expect(computeFrontHash(undefined)).toMatch(/^[a-f0-9]{16}$/);
  });
});
