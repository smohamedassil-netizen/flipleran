/**
 * Tests unitaires minimaux pour les routes d'authentification.
 *
 * Configuration : NODE_ENV=test désactive connectDB(), httpServer.listen() et
 * tous les seeds dans server.js. L'app Express est importée puis consommée
 * directement par supertest.
 *
 * Pour le test "mauvaises credentials", on mocke le modèle User pour que
 * findOne() retourne null sans avoir besoin d'une vraie connexion MongoDB.
 */
import { jest, describe, test, expect, beforeAll } from '@jest/globals';
import request from 'supertest';

// Force le mode test AVANT tout import (pour que server.js ne lance ni la DB
// ni le scheduler, et n'appelle pas listen()).
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

// Mock du modèle User : findOne() retourne null → "utilisateur introuvable"
// → le contrôleur d'auth renvoie 401 conformément au flux nominal.
jest.unstable_mockModule('../models/User.js', () => ({
  default: {
    findOne: jest.fn().mockResolvedValue(null),
    find:    jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
  },
}));

// Imports dynamiques APRÈS le mock pour que jest.unstable_mockModule prenne effet.
let app;
beforeAll(async () => {
  const mod = await import('../server.js');
  app = mod.app || mod.default;
});

describe('POST /api/auth/login', () => {
  test('renvoie 401 quand les credentials sont invalides (utilisateur inexistant)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inconnu@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message');
  });

  test('renvoie 400 quand le payload n\'a pas d\'email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'whatever' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
  });
});

describe('GET /api/courses sans token', () => {
  test('renvoie 401 quand aucun JWT n\'est fourni', async () => {
    const res = await request(app).get('/api/courses');

    expect(res.status).toBe(401);
  });
});
