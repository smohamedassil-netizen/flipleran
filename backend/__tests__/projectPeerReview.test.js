import { describe, it, expect } from '@jest/globals';
import { computePairings } from '../controllers/projectPeerReviewController.js';

/**
 * Test smoke F9 — algo auto-pairing peer-review.
 *
 * Pure fonction, pas de DB. Couvre les invariants critiques :
 *  - 2 reviewers par livrable
 *  - jamais d'auto-review
 *  - préférence cross-group
 *  - pas de pair (reviewer, target) en double sur le même livrable
 */

const livrables = [
  { _id: 'L1', uploadedBy: 'U1', phaseId: 'P1' },
  { _id: 'L2', uploadedBy: 'U2', phaseId: 'P1' },
  { _id: 'L3', uploadedBy: 'U3', phaseId: 'P2' },
];

const members = [
  { userId: 'U1', groupeIdx: 0 },
  { userId: 'U2', groupeIdx: 0 },
  { userId: 'U3', groupeIdx: 1 },
  { userId: 'U4', groupeIdx: 1 },
];

describe('computePairings (peer-review auto-pairing)', () => {
  it('assigns exactly 2 reviewers per livrable when enough members exist', () => {
    const pairings = computePairings({ livrables, members });
    const byLivrable = {};
    pairings.forEach((p) => {
      byLivrable[p.livrableId] = (byLivrable[p.livrableId] || 0) + 1;
    });
    Object.values(byLivrable).forEach((count) => expect(count).toBe(2));
  });

  it('never assigns a user to review their own deliverable', () => {
    const pairings = computePairings({ livrables, members });
    pairings.forEach((p) => {
      expect(p.reviewerId).not.toBe(p.targetUserId);
    });
  });

  it('attaches phaseId snapshot from the livrable', () => {
    const pairings = computePairings({ livrables, members });
    pairings.forEach((p) => {
      const liv = livrables.find((l) => l._id === p.livrableId);
      expect(p.phaseId).toBe(liv.phaseId);
    });
  });

  it('falls back to fewer reviewers when member pool is too small', () => {
    const tinyMembers = [
      { userId: 'U1', groupeIdx: 0 },
      { userId: 'U2', groupeIdx: 0 },
    ];
    const tinyLivrables = [{ _id: 'L1', uploadedBy: 'U1', phaseId: null }];
    const pairings = computePairings({ livrables: tinyLivrables, members: tinyMembers });
    expect(pairings).toHaveLength(1); // U2 only available reviewer
    expect(pairings[0].reviewerId).toBe('U2');
  });

  it('skips livrables without uploadedBy (null/undefined)', () => {
    const orphan = [{ _id: 'L1', uploadedBy: null, phaseId: null }];
    const pairings = computePairings({ livrables: orphan, members });
    expect(pairings).toHaveLength(0);
  });

  it('returns no duplicate (reviewerId, targetUserId, livrableId) tuples', () => {
    const pairings = computePairings({ livrables, members });
    const seen = new Set();
    pairings.forEach((p) => {
      const key = `${p.reviewerId}|${p.targetUserId}|${p.livrableId}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    });
  });

  it('prefers cross-group reviewers when possible (statistical check over 50 runs)', () => {
    // U1 (groupe 0) → on espère que dans la majorité des runs, au moins 1 reviewer
    // sur 2 vienne de groupe 1 (U3 ou U4)
    let crossGroupCount = 0;
    const runs = 50;
    for (let i = 0; i < runs; i++) {
      const pairings = computePairings({ livrables: [livrables[0]], members });
      const reviewerGroupes = pairings.map((p) =>
        members.find((m) => m.userId === p.reviewerId)?.groupeIdx
      );
      // Au moins 1 cross-group (groupeIdx !== 0 puisque target U1 est groupe 0)
      if (reviewerGroupes.some((g) => g !== 0)) crossGroupCount++;
    }
    // Sur 50 runs, au moins 90% devraient avoir au moins 1 cross-group
    expect(crossGroupCount).toBeGreaterThanOrEqual(45);
  });
});
