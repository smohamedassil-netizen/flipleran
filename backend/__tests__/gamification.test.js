import { describe, it, expect } from '@jest/globals';
import { getCurrentLevel, XP_LEVELS } from '../services/levelsService.js';
import { daysDiff } from '../services/streakService.js';
import { getWeekStart } from '../services/questGenerator.js';

/**
 * Test smoke F11A — fonctions pures, pas de DB.
 *
 * Couvre les invariants critiques :
 *  - getCurrentLevel mappe correctement les XP vers les 5 paliers
 *  - daysDiff retourne le nombre de jours UTC corrects
 *  - getWeekStart trouve le lundi UTC quel que soit le jour de référence
 */

describe('levelsService.getCurrentLevel', () => {
  it('returns Débutant for 0 XP', () => {
    const lvl = getCurrentLevel(0);
    expect(lvl.title).toBe('Débutant');
    expect(lvl.next).toBe('Apprenti');
    expect(lvl.progressPercent).toBe(0);
  });

  it('returns Apprenti for 1000 XP (mid-range)', () => {
    const lvl = getCurrentLevel(1000);
    expect(lvl.title).toBe('Apprenti');
    expect(lvl.current).toBe(1000);
    expect(lvl.progressPercent).toBeGreaterThan(0);
    expect(lvl.progressPercent).toBeLessThan(100);
  });

  it('returns Confirmé exactly at 2000 XP boundary', () => {
    const lvl = getCurrentLevel(2000);
    expect(lvl.title).toBe('Confirmé');
  });

  it('returns Maître for 50000 XP (way above max)', () => {
    const lvl = getCurrentLevel(50000);
    expect(lvl.title).toBe('Maître');
    expect(lvl.next).toBeNull();
    expect(lvl.pointsToNext).toBe(0);
    expect(lvl.progressPercent).toBe(100);
  });

  it('handles negative or NaN gracefully (returns Débutant)', () => {
    expect(getCurrentLevel(-100).title).toBe('Débutant');
    expect(getCurrentLevel(NaN).title).toBe('Débutant');
    expect(getCurrentLevel(undefined).title).toBe('Débutant');
  });

  it('exposes 5 levels in XP_LEVELS', () => {
    expect(XP_LEVELS).toHaveLength(5);
    expect(XP_LEVELS.map((l) => l.title)).toEqual(['Débutant', 'Apprenti', 'Confirmé', 'Expert', 'Maître']);
  });
});

describe('streakService.daysDiff', () => {
  it('returns 1 for consecutive UTC days', () => {
    expect(daysDiff('2026-04-30', '2026-05-01')).toBe(1);
  });

  it('returns 0 for same day', () => {
    expect(daysDiff('2026-04-30', '2026-04-30')).toBe(0);
  });

  it('returns 7 for one week gap', () => {
    expect(daysDiff('2026-04-23', '2026-04-30')).toBe(7);
  });

  it('returns Infinity for null inputs', () => {
    expect(daysDiff(null, '2026-04-30')).toBe(Infinity);
    expect(daysDiff('2026-04-30', null)).toBe(Infinity);
    expect(daysDiff(null, null)).toBe(Infinity);
  });
});

describe('questGenerator.getWeekStart', () => {
  it('returns Monday 00:00 UTC for a Wednesday reference', () => {
    const ref = new Date(Date.UTC(2026, 3, 29, 14, 30, 0)); // mer 29 avr 2026
    const ws = getWeekStart(ref);
    expect(ws.getUTCDay()).toBe(1); // lundi
    expect(ws.getUTCHours()).toBe(0);
    expect(ws.getUTCDate()).toBe(27); // lundi 27 avr 2026
  });

  it('returns same day if reference is already Monday', () => {
    const ref = new Date(Date.UTC(2026, 3, 27, 8, 0, 0)); // lundi 27 avr 2026 08:00
    const ws = getWeekStart(ref);
    expect(ws.getUTCDate()).toBe(27);
    expect(ws.getUTCHours()).toBe(0);
  });

  it('returns previous Monday if reference is Sunday', () => {
    const ref = new Date(Date.UTC(2026, 4, 3, 23, 59, 0)); // dim 3 mai 2026
    const ws = getWeekStart(ref);
    expect(ws.getUTCDay()).toBe(1);
    expect(ws.getUTCDate()).toBe(27); // lundi de la même semaine ISO
    expect(ws.getUTCMonth()).toBe(3); // avril
  });
});
