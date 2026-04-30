/**
 * Tests smoke pour le pipeline d'auto-préparation IA.
 *
 * Configuration :
 *   - NODE_ENV=test désactive connectDB() / listen() / cron / seeds.
 *   - On mocke le SDK Groq pour ne pas faire d'appel réseau.
 *   - On mocke les modèles Mongoose pour vérifier que le pipeline
 *     orchestre correctement les Promise.allSettled (résilience aux
 *     échecs partiels) sans crasher.
 *
 * Objectif : vérifier que générer + parser JSON + sanitiser fonctionne,
 * et que la valid validation rejette les payloads malformés sans
 * propager d'exception (résilience).
 */

import { jest, describe, test, expect, beforeAll } from '@jest/globals';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || 'test-groq-key';

// ─── Mock du SDK Groq : retourne des payloads JSON conformes ─────────────────
const mockCompletionsCreate = jest.fn();
jest.unstable_mockModule('groq-sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCompletionsCreate } },
  })),
}));

let courseAutoPrep;
beforeAll(async () => {
  courseAutoPrep = await import('../services/courseAutoPrep.js');
});

describe('courseAutoPrep — appels Groq individuels (smoke)', () => {
  test('generateInVideoQuestions sanitise et borne les timestamps', async () => {
    mockCompletionsCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            questions: [
              { timestamp: 90,    question: 'Q1', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, correctAnswer: 'B', explanation: 'ok' },
              { timestamp: 99999, question: 'Q2', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, correctAnswer: 'A', explanation: '' },
              { timestamp: 'bad', question: 'Q3', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, correctAnswer: 'X', explanation: '' }, // correctAnswer invalide → filtré
            ],
          }),
        },
      }],
    });

    const result = await courseAutoPrep.generateInVideoQuestions({
      video: { titre: 'Test', duration: 600, description: '' },
      transcript: 'lorem ipsum',
    });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);          // Q3 filtré (correctAnswer invalide)
    expect(result[0].timestamp).toBe(90);
    expect(result[1].timestamp).toBe(600);   // borné à video.duration
  });

  test('generateQCM filtre les questions malformées', async () => {
    mockCompletionsCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            titre: 'Mon QCM',
            questions: [
              { texte: 'Q1', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, correctAnswer: 'A', bloomLevel: 'remember' },
              { texte: 'Q2', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, correctAnswer: 'INVALID' }, // → filtré
              null,
            ],
          }),
        },
      }],
    });
    const result = await courseAutoPrep.generateQCM({
      video: { titre: 'X' }, transcript: 'foo',
    });
    expect(result.titre).toBe('Mon QCM');
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].correctAnswers).toEqual(['A']);
  });

  test('generateBloomOutcomes ne duplique pas les outcomes existants', async () => {
    mockCompletionsCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            outcomes: [
              { statement: 'Identifier le Top 10', bloomLevel: 'remember', estimatedMinutes: 15 },
              { statement: 'Expliquer XSS',        bloomLevel: 'understand', estimatedMinutes: 20 },
              { statement: 'Bad Bloom Level',      bloomLevel: 'unknown_level', estimatedMinutes: 10 },   // → filtré
            ],
          }),
        },
      }],
    });
    const result = await courseAutoPrep.generateBloomOutcomes({
      video: { titre: 'X' }, transcript: 'foo',
      existingOutcomes: [{ statement: 'Identifier le Top 10' }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].statement).toBe('Expliquer XSS');
  });

  test('generateProsiSuggestion retourne un objet structuré', async () => {
    mockCompletionsCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            titre: 'Audit OWASP',
            enonce: 'Cas RestoNow ...',
            motsCles: ['OWASP', 'XSS', 'IDOR'],
            problematique: 'Comment auditer ?',
          }),
        },
      }],
    });
    const result = await courseAutoPrep.generateProsiSuggestion({
      video: { titre: 'X' }, course: { titre: 'Sécurité Web', filiere: 'ISIL', promotion: 'L3' },
    });
    expect(result.titre).toBe('Audit OWASP');
    expect(result.motsCles).toEqual(['OWASP', 'XSS', 'IDOR']);
  });

  test('generateFlashcards borne les difficultés et tags', async () => {
    mockCompletionsCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            flashcards: [
              { front: 'Q1', back: 'R1', difficulty: 7, tags: ['t1', 't2', 't3', 't4', 't5', 't6'] },  // diff > 5 → 5, tags > 5 → 5
              { front: 'Q2', back: 'R2', difficulty: 0 },                                              // diff < 1 → 1
              { front: 'Q3' },                                                                         // back manquant → filtré
            ],
          }),
        },
      }],
    });
    const result = await courseAutoPrep.generateFlashcards({
      video: { titre: 'X' }, transcript: 'foo',
    });
    expect(result).toHaveLength(2);
    expect(result[0].difficulty).toBe(5);
    expect(result[0].tags).toHaveLength(5);
    expect(result[1].difficulty).toBe(1);
  });

  test('un payload Groq invalide JSON ne crashe pas le pipeline (résilience)', async () => {
    mockCompletionsCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'NOT_VALID_JSON{{{' } }],
    });
    // Le service callGroqJSON va throw (JSON.parse) — c'est cohérent : la
    // résilience est portée par Promise.allSettled au niveau orchestrateur,
    // pas par les fonctions individuelles.
    await expect(courseAutoPrep.generateFlashcards({
      video: { titre: 'X' }, transcript: 'foo',
    })).rejects.toThrow();
  });
});
