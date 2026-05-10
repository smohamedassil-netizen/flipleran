import { describe, it, expect, jest, beforeEach } from '@jest/globals';

/**
 * Tests unitaires pour progressService.js — mock complet via jest.unstable_mockModule.
 *
 * Pattern ESM : on déclare les mocks AU TOP-LEVEL avec une référence stable
 * d'objet (mockState). Les tests mutent les méthodes sur cette référence ; le
 * module sous test résout les fonctions à l'appel (closure), donc les
 * réassignations sont prises en compte.
 *
 * Couverture :
 *   getChapterProgressDetails / isChapterCompletedByUser :
 *     · pas de capsules → isComplete=false
 *     · capsules ≥ threshold sans QCM → isComplete=true (fallback)
 *     · capsules OK + QCM trop bas → isComplete=false
 *     · capsules OK + QCM ≥ 80% → isComplete=true
 *     · capsules insuffisantes → isComplete=false même si QCM OK
 *   isCasPratiqueEvaluatedForUser :
 *     · statut !== 'evalue' → false
 *     · pas de livrable → false
 *     · pas de note → false
 *     · tout présent → true
 */

const userId = '507f1f77bcf86cd799439011';
const otherUserId = '507f1f77bcf86cd799439099';
const chapterId = '64aaaaaaaaaaaaaaaaaaaaaa';
const casPratiqueId = '64bbbbbbbbbbbbbbbbbbbbbb';

const chapterStore = { findByIdResult: null };
const videoStore   = { findResult: [] };
const qcmStore     = { findResult: [] };
const prositStore  = { findByIdResult: null };

function leanable(value) {
  return { lean: () => Promise.resolve(value) };
}

jest.unstable_mockModule('../models/Chapter.js', () => ({
  default: {
    findById: () => ({ select: () => leanable(chapterStore.findByIdResult) }),
  },
}));

jest.unstable_mockModule('../models/Video.js', () => ({
  default: {
    find: () => ({ select: () => leanable(videoStore.findResult) }),
  },
}));

jest.unstable_mockModule('../models/QCM.js', () => ({
  default: {
    find: () => ({ select: () => leanable(qcmStore.findResult) }),
  },
}));

jest.unstable_mockModule('../models/Prosit.js', () => ({
  default: {
    findById: () => ({ select: () => leanable(prositStore.findByIdResult) }),
  },
}));

beforeEach(() => {
  chapterStore.findByIdResult = null;
  videoStore.findResult = [];
  qcmStore.findResult = [];
  prositStore.findByIdResult = null;
});

describe('getChapterProgressDetails', () => {
  it('retourne null si le chapitre est introuvable', async () => {
    chapterStore.findByIdResult = null;
    const { getChapterProgressDetails } = await import('../services/progressService.js');
    const res = await getChapterProgressDetails(userId, chapterId);
    expect(res).toBeNull();
  });

  it('isComplete=false quand pas de capsules', async () => {
    chapterStore.findByIdResult = { _id: chapterId, courseId: 'c1', completionThreshold: 80 };
    videoStore.findResult = [];
    qcmStore.findResult = [];
    const { getChapterProgressDetails } = await import('../services/progressService.js');
    const r = await getChapterProgressDetails(userId, chapterId);
    expect(r.videoTotal).toBe(0);
    expect(r.isComplete).toBe(false);
  });

  it('isComplete=true quand capsules ≥ threshold et pas de QCM (fallback)', async () => {
    chapterStore.findByIdResult = { _id: chapterId, courseId: 'c1', completionThreshold: 80 };
    // 4/5 capsules complétées par cet user = 80%
    videoStore.findResult = [
      { _id: 'v1', watchedBy: [{ userId, completed: true }] },
      { _id: 'v2', watchedBy: [{ userId, completed: true }] },
      { _id: 'v3', watchedBy: [{ userId, completed: true }] },
      { _id: 'v4', watchedBy: [{ userId, completed: true }] },
      { _id: 'v5', watchedBy: [{ userId, completed: false }] },
    ];
    qcmStore.findResult = [];
    const { getChapterProgressDetails } = await import('../services/progressService.js');
    const r = await getChapterProgressDetails(userId, chapterId);
    expect(r.videoPercent).toBe(80);
    expect(r.hasQcm).toBe(false);
    expect(r.isComplete).toBe(true);
  });

  it('isComplete=false si capsules OK mais QCM en dessous de 80%', async () => {
    chapterStore.findByIdResult = { _id: chapterId, courseId: 'c1', completionThreshold: 80 };
    videoStore.findResult = [
      { _id: 'v1', watchedBy: [{ userId, completed: true }] },
      { _id: 'v2', watchedBy: [{ userId, completed: true }] },
    ];
    // 2 QCM, aucun avec score >= 60 → 0%
    qcmStore.findResult = [
      { _id: 'q1', resultats: [{ userId, score: 50 }] },
      { _id: 'q2', resultats: [{ userId, score: 30 }] },
    ];
    const { getChapterProgressDetails } = await import('../services/progressService.js');
    const r = await getChapterProgressDetails(userId, chapterId);
    expect(r.qcmTotal).toBe(2);
    expect(r.qcmPassed).toBe(0);
    expect(r.qcmPercent).toBe(0);
    expect(r.isComplete).toBe(false);
  });

  it('isComplete=true si capsules OK et QCM ≥ 80%', async () => {
    chapterStore.findByIdResult = { _id: chapterId, courseId: 'c1', completionThreshold: 80 };
    videoStore.findResult = [
      { _id: 'v1', watchedBy: [{ userId, completed: true }] },
      { _id: 'v2', watchedBy: [{ userId, completed: true }] },
    ];
    // 5 QCM, 4 passés (score>=60) → 80%
    qcmStore.findResult = [
      { _id: 'q1', resultats: [{ userId, score: 70 }] },
      { _id: 'q2', resultats: [{ userId, score: 80 }] },
      { _id: 'q3', resultats: [{ userId, score: 60 }] },
      { _id: 'q4', resultats: [{ userId, score: 90 }] },
      { _id: 'q5', resultats: [{ userId, score: 40 }] },
    ];
    const { getChapterProgressDetails } = await import('../services/progressService.js');
    const r = await getChapterProgressDetails(userId, chapterId);
    expect(r.qcmPercent).toBe(80);
    expect(r.isComplete).toBe(true);
  });

  it('isComplete=false si capsules insuffisantes même avec QCM OK', async () => {
    chapterStore.findByIdResult = { _id: chapterId, courseId: 'c1', completionThreshold: 80 };
    videoStore.findResult = [
      { _id: 'v1', watchedBy: [{ userId, completed: true }] },
      { _id: 'v2', watchedBy: [{ userId, completed: false }] },
    ];
    qcmStore.findResult = [{ _id: 'q1', resultats: [{ userId, score: 100 }] }];
    const { getChapterProgressDetails } = await import('../services/progressService.js');
    const r = await getChapterProgressDetails(userId, chapterId);
    expect(r.videoPercent).toBe(50);
    expect(r.isComplete).toBe(false);
  });
});

describe('isChapterCompletedByUser', () => {
  it('retourne true quand getChapterProgressDetails dit isComplete=true', async () => {
    chapterStore.findByIdResult = { _id: chapterId, courseId: 'c1', completionThreshold: 80 };
    videoStore.findResult = [{ _id: 'v1', watchedBy: [{ userId, completed: true }] }];
    qcmStore.findResult = [];
    const { isChapterCompletedByUser } = await import('../services/progressService.js');
    expect(await isChapterCompletedByUser(userId, chapterId)).toBe(true);
  });
});

describe('isCasPratiqueEvaluatedForUser', () => {
  it('false si statut !== evalue', async () => {
    prositStore.findByIdResult = { statut: 'travail_individuel', livrables: [], notes: [] };
    const { isCasPratiqueEvaluatedForUser } = await import('../services/progressService.js');
    expect(await isCasPratiqueEvaluatedForUser(userId, casPratiqueId)).toBe(false);
  });

  it('false si pas de livrable pour cet étudiant', async () => {
    prositStore.findByIdResult = {
      statut: 'evalue',
      livrables: [{ studentId: otherUserId, contenu: '...' }],
      notes:     [{ studentId: userId, noteIndividuelle: 15 }],
    };
    const { isCasPratiqueEvaluatedForUser } = await import('../services/progressService.js');
    expect(await isCasPratiqueEvaluatedForUser(userId, casPratiqueId)).toBe(false);
  });

  it('false si pas de note pour cet étudiant', async () => {
    prositStore.findByIdResult = {
      statut: 'evalue',
      livrables: [{ studentId: userId, contenu: '...' }],
      notes:     [{ studentId: otherUserId, noteIndividuelle: 12 }],
    };
    const { isCasPratiqueEvaluatedForUser } = await import('../services/progressService.js');
    expect(await isCasPratiqueEvaluatedForUser(userId, casPratiqueId)).toBe(false);
  });

  it('true si statut=evalue ET livrable ET note présents', async () => {
    prositStore.findByIdResult = {
      statut: 'evalue',
      livrables: [{ studentId: userId, contenu: 'mon livrable' }],
      notes:     [{ studentId: userId, noteIndividuelle: 15 }],
    };
    const { isCasPratiqueEvaluatedForUser } = await import('../services/progressService.js');
    expect(await isCasPratiqueEvaluatedForUser(userId, casPratiqueId)).toBe(true);
  });
});
