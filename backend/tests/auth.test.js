/**
 * Tests du middleware `protect` (auth JWT).
 * On monte une mini-app Express avec une route protégée et on vérifie
 * que le middleware renvoie bien 401 / passe bien selon le token fourni.
 *
 * Aucun accès à MongoDB : les tests sont 100% unitaires.
 */

import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import protect from '../middleware/auth.js';

const JWT_SECRET = 'test-secret-for-jest';

function buildApp() {
  const app = express();
  app.get('/private', protect, (req, res) => {
    res.json({ ok: true, userId: req.user.id, role: req.user.role });
  });
  return app;
}

describe('middleware/auth.js — protect', () => {
  const ORIGINAL_ENV = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  afterAll(() => {
    process.env.JWT_SECRET = ORIGINAL_ENV;
  });

  test('refuse la requête sans en-tête Authorization (401)', async () => {
    const res = await request(buildApp()).get('/private');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/no token/i);
  });

  test('refuse un en-tête mal formé (sans "Bearer ")', async () => {
    const res = await request(buildApp())
      .get('/private')
      .set('Authorization', 'token-sans-prefixe');
    expect(res.status).toBe(401);
  });

  test('refuse un token invalide (401)', async () => {
    const res = await request(buildApp())
      .get('/private')
      .set('Authorization', 'Bearer ceci-nest-pas-un-jwt');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid token/i);
  });

  test('refuse un token signé avec un mauvais secret', async () => {
    const token = jwt.sign({ id: 'u1', role: 'etudiant' }, 'wrong-secret');
    const res = await request(buildApp())
      .get('/private')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  test('accepte un token valide et expose req.user', async () => {
    const token = jwt.sign({ id: 'user-42', role: 'etudiant' }, JWT_SECRET);
    const res = await request(buildApp())
      .get('/private')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, userId: 'user-42', role: 'etudiant' });
  });

  test('refuse un token expiré', async () => {
    const token = jwt.sign({ id: 'u1', role: 'etudiant' }, JWT_SECRET, { expiresIn: '-1s' });
    const res = await request(buildApp())
      .get('/private')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});
