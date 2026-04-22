/**
 * Tests du middleware `requireRole`.
 * On simule req.user puis on vérifie le comportement (401/403/next).
 */

import { jest } from '@jest/globals';
import requireRole from '../middleware/roleMiddleware.js';

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('middleware/roleMiddleware.js — requireRole', () => {
  test('renvoie 401 quand req.user est absent', () => {
    const req = {};
    const res = makeRes();
    const next = jest.fn();

    requireRole('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('renvoie 403 quand le rôle ne correspond pas', () => {
    const req = { user: { id: 'u1', role: 'etudiant' } };
    const res = makeRes();
    const next = jest.fn();

    requireRole('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('appelle next() quand le rôle correspond', () => {
    const req = { user: { id: 'u1', role: 'professeur' } };
    const res = makeRes();
    const next = jest.fn();

    requireRole('professeur', 'admin')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('accepte plusieurs rôles (OR logique)', () => {
    const req = { user: { id: 'u1', role: 'admin' } };
    const res = makeRes();
    const next = jest.fn();

    requireRole('professeur', 'admin')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
