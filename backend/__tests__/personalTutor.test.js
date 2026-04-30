/**
 * Tests smoke pour personalTutor — focus sur le contexte étudiant et le
 * fallback heuristique des suggestions quotidiennes (sans Groq).
 */
import { jest, describe, test, expect, beforeAll } from '@jest/globals';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
process.env.GROQ_API_KEY = '';

jest.unstable_mockModule('../models/User.js', () => ({
  default: {
    findById: jest.fn(),
  },
}));
jest.unstable_mockModule('../models/Course.js', () => ({
  default: {
    find: jest.fn(),
  },
}));
jest.unstable_mockModule('../models/Video.js', () => ({
  default: {
    find: jest.fn(),
    findById: jest.fn(),
  },
}));
jest.unstable_mockModule('../models/VideoAnalysis.js', () => ({
  default: {
    findOne: jest.fn(),
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
jest.unstable_mockModule('../models/Prosit.js', () => ({
  default: {
    find: jest.fn(),
  },
}));

let personalTutor;
let UserModel, CourseModel, VideoModel, QCMModel, ProgressModel, PrositModel;

beforeAll(async () => {
  personalTutor = await import('../services/personalTutor.js');
  UserModel    = (await import('../models/User.js')).default;
  CourseModel  = (await import('../models/Course.js')).default;
  VideoModel   = (await import('../models/Video.js')).default;
  QCMModel     = (await import('../models/QCM.js')).default;
  ProgressModel = (await import('../models/Progress.js')).default;
  PrositModel  = (await import('../models/Prosit.js')).default;
});

function setupMocks(scenario) {
  UserModel.findById.mockReturnValue({
    select: () => ({ lean: () => Promise.resolve(scenario.user) }),
  });
  CourseModel.find.mockReturnValue({
    select: () => ({ lean: () => Promise.resolve(scenario.courses || []) }),
  });
  VideoModel.find.mockReturnValue({
    select: () => ({ lean: () => Promise.resolve(scenario.videos || []) }),
  });
  ProgressModel.find.mockReturnValue({
    lean: () => Promise.resolve(scenario.progress || []),
  });
  QCMModel.find.mockReturnValue({
    select: () => ({ lean: () => Promise.resolve(scenario.qcms || []) }),
  });
  PrositModel.find.mockReturnValue({
    select: () => ({ lean: () => Promise.resolve(scenario.prosits || []) }),
  });
}

describe('personalTutor — buildStudentContext', () => {
  test('retourne un contexte structuré avec courses + summary', async () => {
    setupMocks({
      user: { _id: 'u1', prenom: 'Sara', nom: 'Test', filiere: 'ISIL', promotion: 'L3', points: 320 },
      courses: [
        { _id: { toString: () => 'c1' }, titre: 'Sécurité Web', description: '' },
      ],
      progress: [
        { courseId: { toString: () => 'c1' }, videosCompleted: ['v1'], qcmScores: [{ score: 80 }, { score: 75 }], lastActivity: new Date() },
      ],
      videos: [
        { _id: { toString: () => 'v1' }, titre: 'V1', courseId: { toString: () => 'c1' } },
        { _id: { toString: () => 'v2' }, titre: 'V2', courseId: { toString: () => 'c1' } },
      ],
      qcms: [],
      prosits: [],
    });
    const ctx = await personalTutor.buildStudentContext('u1');
    expect(ctx.structured.user.prenom).toBe('Sara');
    expect(ctx.structured.courses).toHaveLength(1);
    expect(ctx.structured.courses[0].progress).toBe(50); // 1/2 vidéos
    expect(ctx.structured.courses[0].avgQCM).toBe(78);   // moyenne (80+75)/2 = 77.5 → 78
    expect(ctx.summary).toContain('Sara');
    expect(ctx.summary).toContain('Sécurité Web');
  });

  test('throw si user introuvable', async () => {
    setupMocks({ user: null });
    await expect(personalTutor.buildStudentContext('inexistant')).rejects.toThrow('Utilisateur introuvable');
  });
});

describe('personalTutor — generateDailySuggestions (fallback)', () => {
  test('sans GROQ_API_KEY → utilise fallback heuristique avec liens', async () => {
    personalTutor.clearDailyCache();
    setupMocks({
      user: { _id: 'u1', prenom: 'Lina', nom: 'Test', filiere: 'ISIL', promotion: 'L3', points: 100 },
      courses: [{ _id: { toString: () => 'c1' }, titre: 'Cours en cours' }],
      progress: [{ courseId: { toString: () => 'c1' }, videosCompleted: ['v1'], qcmScores: [{ score: 60 }], lastActivity: new Date() }],
      videos: [
        { _id: { toString: () => 'v1' }, titre: 'V1', courseId: { toString: () => 'c1' } },
        { _id: { toString: () => 'v2' }, titre: 'V2', courseId: { toString: () => 'c1' } },
      ],
      qcms: [],
      prosits: [{ titre: 'Mon Prosit', status: 'recherche' }],
    });
    const r = await personalTutor.generateDailySuggestions('u1');
    expect(r.source).toBe('heuristic');
    expect(Array.isArray(r.suggestions)).toBe(true);
    expect(r.suggestions.length).toBeGreaterThan(0);
    // doit contenir au moins une suggestion liée au cours en cours
    const hasCourseSuggestion = r.suggestions.some((s) => s.action.includes('Cours en cours'));
    expect(hasCourseSuggestion).toBe(true);
  });

  test('cache journalier : 2e appel renvoie fromCache=true', async () => {
    personalTutor.clearDailyCache();
    setupMocks({
      user: { _id: 'u1', prenom: 'Cache', nom: 'Test', filiere: 'ISIL', promotion: 'L3', points: 0 },
      courses: [], progress: [], videos: [], qcms: [], prosits: [],
    });
    const r1 = await personalTutor.generateDailySuggestions('u1');
    expect(r1.fromCache).toBe(false);
    const r2 = await personalTutor.generateDailySuggestions('u1');
    expect(r2.fromCache).toBe(true);
    const r3 = await personalTutor.generateDailySuggestions('u1', { bypassCache: true });
    expect(r3.fromCache).toBe(false);
  });
});

describe('personalTutor — askAboutVideo (sans transcript)', () => {
  test('renvoie un message d\'erreur explicite si transcription absente', async () => {
    VideoModel.findById.mockReturnValue({
      select: () => ({ lean: () => Promise.resolve({ titre: 'V1', duration: 600 }) }),
    });
    (await import('../models/VideoAnalysis.js')).default.findOne.mockReturnValue({
      lean: () => Promise.resolve(null),
    });
    const r = await personalTutor.askAboutVideo('u1', 'v1', 'Test ?', 30);
    expect(r.confidence).toBe(0);
    expect(r.answer.toLowerCase()).toContain('transcription');
  });
});
