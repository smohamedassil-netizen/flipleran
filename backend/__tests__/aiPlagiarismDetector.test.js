/**
 * Tests smoke pour aiPlagiarismDetector.
 *
 * On teste les heuristiques sans appel réseau (skipGroq=true) puisque
 * c'est elles qui font le travail principal. La confirmation Groq est
 * un bonus quand le seuil est dépassé.
 */
import { jest, describe, test, expect, beforeAll } from '@jest/globals';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
process.env.GROQ_API_KEY = ''; // force skipGroq automatique

let detector;
beforeAll(async () => {
  detector = await import('../services/aiPlagiarismDetector.js');
});

describe('aiPlagiarismDetector — heuristiques (sans Groq)', () => {
  test('texte trop court → score 0 + flag explicite', async () => {
    const r = await detector.detectAIGenerated('Trop court.', { skipGroq: true });
    expect(r.aiProbability).toBe(0);
    expect(r.flags).toContain('texte trop court pour détection fiable');
  });

  test('texte humain typique → score bas', async () => {
    const txt = `Bon alors j'ai bossé sur l'audit OWASP du site RestoNow.
J'ai d'abord regardé l'IDOR — j'ai trouvé que l'URL /commande/123 permettait à n'importe qui
de voir les commandes des autres juste en changeant le numéro. C'est moche. J'ai prototypé un
middleware Express qui vérifie req.user._id contre resource.userId avant de servir.
Pour le XSS j'ai dû creuser, le champ Adresse n'avait aucune sanitisation. J'ai testé
avec dompurify et c'est nickel. La CPU bouge à peine.`;
    const r = await detector.detectAIGenerated(txt, { skipGroq: true });
    expect(r.aiProbability).toBeLessThan(35);
  });

  test('texte clairement IA (patterns ChatGPT) → score haut', async () => {
    const txt = `Bien sûr ! Voici une analyse complète de la sécurité d'une API REST.

Tout d'abord, il est important de noter que la sécurité d'une API web repose sur plusieurs aspects fondamentaux. En conclusion, il convient de noter que ces principes jouent un rôle clé dans la protection des données.

## Approche stratégique

- Authentification robuste
- Autorisation granulaire
- Validation stricte des entrées
- Chiffrement systématique
- Audit régulier des logs
- Mise à jour des dépendances

D'autre part, dans le contexte actuel, une approche holistique de la cybersécurité s'avère absolument essentielle. D'une part, les développeurs doivent rigoureusement appliquer les bonnes pratiques. En somme, la sécurité est un processus continu qui nécessite vigilance constante.

N'oublions pas que la formation continue des équipes est également primordiale.`;
    const r = await detector.detectAIGenerated(txt, { skipGroq: true });
    expect(r.aiProbability).toBeGreaterThanOrEqual(35);
    expect(r.flags.length).toBeGreaterThan(2);
  });

  test('runHeuristics retourne une structure valide même sur input vide', () => {
    const r = detector.runHeuristics('Texte court mais > 5 chars sans patterns spécifiques.');
    expect(typeof r.score).toBe('number');
    expect(Array.isArray(r.flags)).toBe(true);
  });

  test('scorePatterns détecte plusieurs patterns dans un même texte', () => {
    const r = detector.scorePatterns(`En conclusion, il est important de noter que d'autre part, n'oublions pas le principal. Tout d'abord, voici une approche holistique. D'une part, les choses changent.`);
    expect(r.score).toBeGreaterThan(15);
    expect(r.flags.length).toBeGreaterThan(2);
  });

  test('scoreSentenceVariance pénalise les phrases trop régulières', () => {
    // 10 phrases de longueurs très proches → variance faible
    const txt = Array.from({ length: 10 }, (_, i) =>
      `Voici une phrase numéro ${i + 1} qui contient exactement le même nombre de mots ici.`
    ).join(' ');
    const r = detector.scoreSentenceVariance(txt);
    expect(r.score).toBeGreaterThan(0);
  });

  test('scoreOverStructure pénalise les listes excessives', () => {
    const txt = [
      'Un titre normal pour commencer.',
      '## Section 1',
      '- Premier point',
      '- Deuxième point',
      '- Troisième point',
      '- Quatrième point',
      '- Cinquième point',
      '## Section 2',
      '- Sixième point',
    ].join('\n');
    const r = detector.scoreOverStructure(txt);
    expect(r.score).toBeGreaterThan(0);
  });

  test('détecteur fail-soft : exception Groq ne crashe pas le pipeline', async () => {
    // Avec GROQ_API_KEY vide, le détecteur doit retomber sur les heuristiques seules
    const txt = 'Bien sûr ! Voici, en conclusion, une approche holistique de la sécurité. ' +
                'En somme, il est important de noter que d\'autre part, n\'oublions pas l\'essentiel. ' +
                'Dans le contexte actuel, plusieurs aspects jouent un rôle clé.';
    const r = await detector.detectAIGenerated(txt);
    expect(typeof r.aiProbability).toBe('number');
    expect(r.aiProbability).toBeGreaterThanOrEqual(0);
    expect(r.aiProbability).toBeLessThanOrEqual(100);
    expect(r.groqScore).toBeNull(); // pas appelé sans GROQ_API_KEY
  });
});
