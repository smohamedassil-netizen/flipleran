/**
 * Sanity check sur la spec OpenAPI exposée en /api-docs.
 * Si la spec n'est pas bien formée, Swagger UI tombe silencieusement —
 * ces tests garantissent que les éléments minimaux requis sont présents.
 */

import { swaggerSpec } from '../docs/swagger.js';

describe('docs/swagger.js — OpenAPI spec', () => {
  test('a une version OpenAPI 3 valide', () => {
    expect(swaggerSpec.openapi).toMatch(/^3\./);
  });

  test('déclare un objet info avec titre et version', () => {
    expect(swaggerSpec.info).toBeDefined();
    expect(swaggerSpec.info.title).toBe('FlipLearn API');
    expect(swaggerSpec.info.version).toBeDefined();
  });

  test('définit au moins un serveur', () => {
    expect(Array.isArray(swaggerSpec.servers)).toBe(true);
    expect(swaggerSpec.servers.length).toBeGreaterThan(0);
  });

  test('expose un schéma de sécurité bearerAuth', () => {
    const schemes = swaggerSpec.components?.securitySchemes;
    expect(schemes?.bearerAuth).toBeDefined();
    expect(schemes.bearerAuth.type).toBe('http');
    expect(schemes.bearerAuth.scheme).toBe('bearer');
  });

  test('documente au moins les endpoints critiques', () => {
    const paths = Object.keys(swaggerSpec.paths || {});
    expect(paths).toEqual(
      expect.arrayContaining([
        '/api/auth/login',
        '/api/auth/register',
        '/api/decks',
        '/api/leaderboard',
      ])
    );
  });

  test('chaque opération protégée déclare la sécurité bearerAuth', () => {
    const protectedPath = swaggerSpec.paths['/api/decks']?.get;
    expect(protectedPath?.security).toEqual([{ bearerAuth: [] }]);
  });

  test("toutes les tags référencées existent dans la liste globale de tags", () => {
    const globalTags = new Set((swaggerSpec.tags || []).map(t => t.name));
    for (const [path, methods] of Object.entries(swaggerSpec.paths)) {
      for (const [method, op] of Object.entries(methods)) {
        if (method === 'parameters') continue;
        for (const tag of op.tags || []) {
          expect(globalTags.has(tag)).toBe(true);
        }
      }
    }
  });
});
