/**
 * Tests smoke pour teacherInsights — focus sur le fallback heuristique et
 * le cache. Les appels Groq sont mockés (jest.unstable_mockModule) car
 * on ne veut pas dépendre du réseau dans les tests.
 */
import { jest, describe, test, expect, beforeAll } from '@jest/globals';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
process.env.GROQ_API_KEY = '';   // force fallback heuristique

// Mock des modèles Mongoose pour éviter toute connexion DB
jest.unstable_mockModule('../models/Course.js', () => ({
  default: {
    findById: jest.fn(),
  },
}));
jest.unstable_mockModule('../models/Video.js', () => ({
  default: {
    find: jest.fn(),
  },
}));
jest.unstable_mockModule('../models/QCM.js', () => ({
  default: {
    find: jest.fn(),
  },
}));
jest.unstable_mockModule('../models/Progress.js', () => ({
  default: {
    find: jest.fn(),
  },
}));

let teacherInsights;
let CourseModel;
let VideoModel;
let QCMModel;
let ProgressModel;
beforeAll(async () => {
  teacherInsights = await import('../services/teacherInsights.js');
  CourseModel = (await import('../models/Course.js')).default;
  VideoModel = (await import('../models/Video.js')).default;
  QCMModel = (await import('../models/QCM.js')).default;
  ProgressModel = (await import('../models/Progress.js')).default;
});

function setupMocks(metricsScenario) {
  CourseModel.findById.mockReturnValue({
    lean: () => Promise.resolve(metricsScenario.course),
  });
  VideoModel.find.mockReturnValue({
    sort: () => ({
      lean: () => Promise.resolve(metricsScenario.videos),
    }),
  });
  QCMModel.find.mockReturnValue({
    lean: () => Promise.resolve(metricsScenario.qcms),
  });
  ProgressModel.find.mockReturnValue({
    populate: () => ({
      lean: () => Promise.resolve(metricsScenario.progress),
    }),
  });
}

describe('teacherInsights — fallback heuristique sans Groq', () => {
  test('classe à risque : 2 étudiants engagement < 30%, 1 vidéo faible complétion', async () => {
    teacherInsights.clearCache();
    const userA = { _id: 'u-a', nom: 'Test', prenom: 'Alice' };
    const userB = { _id: 'u-b', nom: 'Test', prenom: 'Bob' };
    setupMocks({
      course: { _id: 'c1', titre: 'Test Course', filiere: 'ISIL', promotion: 'L3', toString: () => 'c1' },
      videos: [
        { _id: { toString: () => 'v1' }, titre: 'Vidéo 1', duration: 600, watchedBy: [
          { userId: { toString: () => 'u-a' }, watchedPercent: 20, completed: false },
          { userId: { toString: () => 'u-b' }, watchedPercent: 25, completed: false },
        ]},
      ],
      qcms: [],
      progress: [
        { userId: userA, qcmScores: [] },
        { userId: userB, qcmScores: [] },
      ],
    });
    const result = await teacherInsights.generateInsights('c1');
    expect(result.source).toBe('heuristic');
    expect(result.metrics.totalStudents).toBe(2);
    expect(result.metrics.atRiskCount).toBe(2);
    expect(result.atRiskStudents).toHaveLength(2);
    // Au moins un insight 'attention'
    const hasAttention = result.insights.some((i) => i.type === 'attention');
    expect(hasAttention).toBe(true);
  });

  test('classe top performers : engagement >= 80%', async () => {
    teacherInsights.clearCache();
    const userA = { _id: 'u-top', nom: 'Top', prenom: 'Sara' };
    setupMocks({
      course: { _id: 'c2', titre: 'Test 2', filiere: 'ISIL', promotion: 'L3' },
      videos: [
        { _id: { toString: () => 'v1' }, titre: 'V1', duration: 600, watchedBy: [
          { userId: { toString: () => 'u-top' }, watchedPercent: 95, completed: true },
        ]},
      ],
      qcms: [{ titre: 'QCM 1', videoId: { toString: () => 'v1' }, questions: [], resultats: [] }],
      progress: [
        { userId: userA, qcmScores: [{ score: 90 }, { score: 85 }] },
      ],
    });
    const result = await teacherInsights.generateInsights('c2');
    expect(result.metrics.topPerformersCount).toBe(1);
    const hasSuccess = result.insights.some((i) => i.type === 'success');
    expect(hasSuccess).toBe(true);
  });

  test('cache : 2e appel sans bypass renvoie fromCache=true', async () => {
    teacherInsights.clearCache();
    setupMocks({
      course: { _id: 'c3', titre: 'Cache Test', filiere: 'ISIL', promotion: 'L3' },
      videos: [],
      qcms: [],
      progress: [],
    });
    const r1 = await teacherInsights.generateInsights('c3');
    expect(r1.fromCache).toBe(false);
    const r2 = await teacherInsights.generateInsights('c3');
    expect(r2.fromCache).toBe(true);
    // bypass cache
    const r3 = await teacherInsights.generateInsights('c3', { bypassCache: true });
    expect(r3.fromCache).toBe(false);
  });

  test('insights sans données → message explicite', async () => {
    teacherInsights.clearCache();
    setupMocks({
      course: { _id: 'c4', titre: 'Empty', filiere: 'ISIL', promotion: 'L3' },
      videos: [],
      qcms: [],
      progress: [],
    });
    const result = await teacherInsights.generateInsights('c4');
    expect(result.insights.length).toBeGreaterThanOrEqual(1);
  });

  test('generateStudentSuggestion avec fallback heuristique', async () => {
    teacherInsights.clearCache();
    const userA = { _id: 'u-a', nom: 'Risque', prenom: 'Mehdi' };
    setupMocks({
      course: { _id: 'c5', titre: 'Test', filiere: 'ISIL', promotion: 'L3' },
      videos: [{ _id: { toString: () => 'v1' }, titre: 'V', duration: 600, watchedBy: [
        { userId: { toString: () => 'u-a' }, watchedPercent: 15, completed: false },
      ]}],
      qcms: [],
      progress: [{ userId: userA, qcmScores: [] }],
    });
    const r = await teacherInsights.generateStudentSuggestion('c5', 'u-a');
    expect(r.student.engagement).toBeLessThan(30);
    expect(r.actions.length).toBeGreaterThan(0);
    expect(r.source).toBe('heuristic');
  });
});
