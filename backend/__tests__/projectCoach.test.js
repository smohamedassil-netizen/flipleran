import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals';

/**
 * Test smoke F7 — vérifie le contrat de detectBlockage SANS appel Groq, en
 * mockant les models Mongoose avec jest.unstable_mockModule (ESM).
 *
 * Couvre les 3 sévérités principales (none / medium / high) sur Prosit, et
 * le statut 'projet inactif' sur Project. Les fonctions IA (suggestNextStep,
 * reviewContribution, suggestSources) ne sont pas mockées ici — elles sont
 * couvertes en intégration via la démo prod.
 */

// Mock User minimal
jest.unstable_mockModule('../models/User.js', () => ({
  default: { findById: () => ({ select: () => ({ lean: async () => ({ prenom: 'Yacine' }) }) }) },
}));

// Helpers pour construire des fixtures
const fixedUserId = '507f1f77bcf86cd799439011';
const otherUserId = '507f1f77bcf86cd799439099';
const aWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000);
const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

function mockProsit(overrides = {}) {
  return {
    _id: 'p1',
    titre: 'Sécurité Web',
    enonce: 'Étudier CSRF/XSS sur une app Algérie Telecom',
    motsCles: ['CSRF', 'XSS', 'Token'],
    status: 'recherche',
    dateAller: aWeekAgo,
    dateRetour: inThreeDays,
    filiere: 'ISIL',
    promotion: 'L3',
    groupes: [{
      nom: 'G1',
      membres: [{
        userId: fixedUserId,
        role: 'animateur',
        contributionTexte: '',
        contributionAt: null,
      }],
    }],
    ...overrides,
  };
}

function mockProject(overrides = {}) {
  return {
    _id: 'pr1',
    titre: 'App web sécurisée',
    enonce: 'Build a secure CRUD app',
    motsCles: ['security', 'webapp'],
    status: 'actif',
    dateDebut: aWeekAgo,
    dateFin: inThreeDays,
    groupes: [{ nom: 'G1', membres: [{ userId: fixedUserId, role: 'chef_projet' }] }],
    livrables: [],
    phases: [{ titre: 'Conception', statut: 'en_cours', dateDebut: aWeekAgo, dateFin: inThreeDays }],
    ...overrides,
  };
}

let projectCoach;
let prositMock = mockProsit();
let projectMock = mockProject();

beforeAll(async () => {
  jest.unstable_mockModule('../models/Prosit.js', () => ({
    default: { findById: () => ({ lean: async () => prositMock }) },
  }));
  jest.unstable_mockModule('../models/Project.js', () => ({
    default: { findById: () => ({ lean: async () => projectMock }) },
  }));
  projectCoach = await import('../services/projectCoach.js');
});

describe('projectCoach.detectBlockage — Prosit', () => {
  it('returns isBlocked=false when status is not active (e.g. brouillon)', async () => {
    prositMock = mockProsit({ status: 'brouillon' });
    const r = await projectCoach.detectBlockage({ kind: 'prosit', id: 'p1', userId: fixedUserId });
    expect(r.isBlocked).toBe(false);
    expect(r.severity).toBe('none');
  });

  it('flags fear-blank-page + no-contribution when nothing written 24h+ after dateAller', async () => {
    prositMock = mockProsit(); // contribution vide, dateAller = aWeekAgo
    const r = await projectCoach.detectBlockage({ kind: 'prosit', id: 'p1', userId: fixedUserId });
    expect(r.isBlocked).toBe(true);
    expect(r.symptoms).toContain('no-contribution');
    expect(r.symptoms).toContain('fear-blank-page');
    expect(['medium', 'high']).toContain(r.severity);
  });

  it('flags short-contribution as low severity when alone', async () => {
    prositMock = mockProsit({
      groupes: [{
        nom: 'G1',
        membres: [{
          userId: fixedUserId,
          role: 'animateur',
          contributionTexte: 'Petite intro très courte.',  // < 50 mots, but recent
          contributionAt: new Date(),                       // pas d'inactivité
        }],
      }],
    });
    const r = await projectCoach.detectBlockage({ kind: 'prosit', id: 'p1', userId: fixedUserId });
    expect(r.symptoms).toContain('short-contribution');
    expect(r.severity).toBe('low');
  });

  it('returns 403-marker when user is not a member', async () => {
    prositMock = mockProsit();
    const r = await projectCoach.detectBlockage({ kind: 'prosit', id: 'p1', userId: otherUserId });
    expect(r.error).toBe('not-a-member');
    expect(r.isBlocked).toBe(false);
  });
});

describe('projectCoach.detectBlockage — Project', () => {
  it('flags no-contribution when student has 0 livrables in active project', async () => {
    projectMock = mockProject(); // 0 livrables, dateDebut = aWeekAgo
    const r = await projectCoach.detectBlockage({ kind: 'project', id: 'pr1', userId: fixedUserId });
    expect(r.isBlocked).toBe(true);
    expect(r.symptoms).toContain('no-contribution');
    expect(r.symptoms).toContain('fear-blank-page');
  });

  it('returns isBlocked=false on a finished project (not active)', async () => {
    projectMock = mockProject({ status: 'termine' });
    const r = await projectCoach.detectBlockage({ kind: 'project', id: 'pr1', userId: fixedUserId });
    expect(r.isBlocked).toBe(false);
    expect(r.severity).toBe('none');
  });
});
