# Chapitre 6 — Tests système

L'évaluation d'un système d'information n'est pas une étape terminale détachée du développement, mais une démarche transversale qui conditionne la fiabilité du produit livré. Le présent chapitre rend compte de la stratégie d'évaluation mise en œuvre tout au long du projet FlipLearn. Il aborde successivement la **philosophie générale** retenue (§ 6.1), les **tests automatisés** implémentés (§ 6.2), le **protocole de tests utilisateurs** conduit auprès d'étudiants et d'enseignants (§ 6.3), et enfin les **métriques de qualité** obtenues (§ 6.4).

## 6.1 Stratégie de tests : la pyramide inversée pour un projet solo

### 6.1.1 Le contexte impose une stratégie particulière

La littérature classique du génie logiciel (Cohn, 2009 ; Crispin & Gregory, 2009) recommande l'application de la **pyramide de tests** : une base large de **tests unitaires** rapides et nombreux, une couche intermédiaire de **tests d'intégration**, et un sommet étroit de **tests end-to-end** (E2E) lents mais représentatifs. Cette pyramide s'applique de manière idéale aux équipes industrielles disposant de plusieurs développeurs, d'un budget consacré à la qualité, et d'un horizon temporel long.

Les contraintes d'un projet de fin d'études solo sont structurellement différentes : un seul développeur, un budget temps limité (l'année universitaire), une charge fonctionnelle massive (vingt-cinq collections, ~120 endpoints REST, sept agents IA, trois rôles utilisateurs avec interfaces distinctes). Dans ces conditions, suivre dogmatiquement la pyramide classique conduirait soit à diluer dangereusement le temps consacré au développement de fonctionnalités, soit à produire une couverture de tests dérisoire qui ne protégerait contre rien.

### 6.1.2 Le choix retenu : la pyramide inversée

La stratégie effectivement retenue pour FlipLearn inverse la logique : **peu de tests, mais ciblés sur les fonctions à plus haut risque et à plus haute valeur**. Le projet implémente ainsi une **pyramide inversée** ou plutôt une *pyramide aplatie ciblée*, dont le principe directeur est : *« mieux vaut dix tests qui couvrent les fonctions critiques que mille tests qui couvrent tout sans rien protéger réellement »*.

**Figure 6.1 — Pyramide de tests inversée pour un PFE solo**

```
                            ▲
                           ╱ ╲
                          ╱ E ╲          0 tests E2E (Playwright/Cypress)
                         ╱ 2  ╲          → trop coûteux à maintenir solo
                        ╱  E   ╲
                       ╱─────────╲
                      ╱           ╲
                     ╱  Intégration  ╲   ~5 tests d'intégration
                    ╱   (Supertest)   ╲  → endpoints critiques uniquement
                   ╱                   ╲
                  ╱─────────────────────╲
                 ╱                       ╲
                ╱     Tests Smoke /       ╲  ~52 tests smoke
               ╱      Unit ciblés          ╲ → fonctions pures critiques
              ╱     (Vitest / Node)         ╲   (algo SM-2, formules
             ╱                                ╲   note Prosit, calcul streak,
            ╱──────────────────────────────────╲  agrégation CAI…)
           ╱                                    ╲
          ╱────────────────────────────────────╲

         Tests utilisateurs (protocole humain)
       ─────────────────────────────────────────
        5 étudiants L3 ISIL × 8 tâches = 40 observations
        1 enseignante × 10 tâches = 10 observations
        → Évaluation qualitative + quantitative
```

### 6.1.3 Justification du choix par les ADR

Cette stratégie est documentée formellement dans l'ADR n°7 (*Testing Strategy*) du document `docs/technical-decisions.md`. Trois principes directeurs y sont énoncés :

1. **Tester les fonctions pures critiques avant tout** : les algorithmes de calcul (SM-2, formule de note Prosit, calcul de streak, agrégation des cinq étapes du CAI) sont des *single sources of truth* dont les bugs auraient des conséquences en cascade dans toute l'application. Ils sont systématiquement couverts par des tests Vitest unitaires.

2. **Substituer les tests utilisateurs aux tests E2E automatisés** : un test E2E Playwright qui pilote un navigateur Chromium pour vérifier un parcours utilisateur consomme des heures de développement (rédaction, debug des sélecteurs CSS, mainteneur en cas de refactor UI) pour une couverture finalement étroite. Pour un projet solo en délai contraint, **observer une vraie personne accomplir la même tâche en 5 minutes apporte plus d'information** sur la qualité réelle du logiciel — et permet en outre de capter des dimensions (compréhension du vocabulaire, ressenti émotionnel, hésitations) qu'un test automatisé ne peut jamais mesurer.

3. **Les bugs détectés en production sont la métrique ultime** : tous les bugs détectés et corrigés via les tests smoke sont documentés dans le fichier `docs/testing-strategy.md` à des fins d'apprentissage. Cette discipline produit une trace concrète de la valeur défensive des tests.

## 6.2 Tests automatisés (smoke tests)

### 6.2.1 Outillage : Vitest

Les tests automatisés utilisent **Vitest**, le framework de test moderne conçu nativement pour Vite (compatible Jest dans son API). Vitest présente plusieurs avantages décisifs pour un projet de cette envergure : démarrage quasi instantané (à comparer aux 5-10 secondes typiques de Jest sur un projet équivalent), exécution parallèle native, intégration native avec ES modules, *watch mode* fluide pour le développement piloté par les tests.

La configuration est minimaliste (`vitest.config.js` à la racine du backend) : aucun mock complexe, pas de couverture de code visée à 100 % (objectif délibérément abandonné, car le pourcentage de couverture est un mauvais indicateur de qualité réelle). Les tests sont organisés dans `backend/__tests__/` (séparés du code source pour éviter d'embarquer du code de test en production).

### 6.2.2 Inventaire des tests

À la date de soutenance, le projet compte **52 tests smoke** répartis sur huit fichiers, qui couvrent les fonctions critiques suivantes :

**Tableau 6.1 — Inventaire des tests automatisés**

| Fichier | Nombre de tests | Fonctions couvertes |
|---|:---:|---|
| `gamification.test.js` | 13 | `getCurrentLevel()` (5), `daysDiff()` (4), `getWeekStart()` (4) |
| `streakService.test.js` | 8 | Logique d'incrémentation streak, gestion des freezes, reset automatique |
| `prositGrade.test.js` | 6 | Formule note finale Prosit (70 % prof + 30 % pairs), gestion absences |
| `autoFlashcards.test.js` | 5 | `computeFrontHash()` (dédup cartes auto-générées), idempotence |
| `projectCoach.test.js` | 5 | `detectBlockage()` (heuristique inactivité de groupe) |
| `projectTemplatesSeed.test.js` | 4 | Cohérence des 14 templates seedés (poids phases sommés à 100 %, rubric présente) |
| `journeyController.test.js` | 6 | Calcul du `cycleProgress`, états `locked/in-progress/completed`, payload structure |
| `classReadiness.test.js` | 5 | Comptage prêts/partiels/non préparés, dédoublonnage `dedupKey` |

Soit **52 tests** au total, ciblés sur les fonctions à plus haut risque et plus haute valeur.

### 6.2.3 Exemple de test représentatif

Pour illustrer la philosophie, voici un extrait du fichier `gamification.test.js` qui teste la fonction `getCurrentLevel()` du service `levelsService.js` :

```javascript
import { describe, it, expect } from 'vitest';
import { getCurrentLevel } from '../services/levelsService.js';

describe('getCurrentLevel', () => {
  it('returns Débutant for 0 points', () => {
    const lvl = getCurrentLevel(0);
    expect(lvl.title).toBe('Débutant');
    expect(lvl.progressPercent).toBe(0);
  });

  it('returns Apprenti for 500 points (boundary)', () => {
    const lvl = getCurrentLevel(500);
    expect(lvl.title).toBe('Apprenti');
    expect(lvl.progressPercent).toBe(0); // début du palier
  });

  it('returns Expert for 5000 points', () => {
    const lvl = getCurrentLevel(5000);
    expect(lvl.title).toBe('Expert');
  });

  it('returns Maître for 10000+ points (cap)', () => {
    const lvl = getCurrentLevel(50000);
    expect(lvl.title).toBe('Maître');
    expect(lvl.pointsToNext).toBe(0); // niveau max
  });

  it('handles invalid input gracefully', () => {
    expect(() => getCurrentLevel(-100)).not.toThrow();
    expect(() => getCurrentLevel(null)).not.toThrow();
  });
});
```

Ce test couvre les **bornes critiques** (boundary values), un cas standard, le cap haut (niveau Maître), et la robustesse face à des inputs invalides — sans chercher l'exhaustivité combinatoire.

### 6.2.4 Bugs détectés par les tests smoke

À titre de témoignage de la valeur défensive de cette approche, quatre bugs ont effectivement été détectés et corrigés grâce aux tests smoke avant tout déploiement en production :

1. **Bug `daysDiff()` sur changement d'heure d'été** : la fonction de calcul du nombre de jours entre deux dates renvoyait 0 ou 2 au lieu de 1 lors du passage à l'heure d'été (`28 mars → 29 mars`). Corrigé par usage de `Date.UTC()` au lieu de `Date.getTime()` directement.

2. **Bug formule note Prosit** : un test sur la formule `0.7 × note_prof + 0.3 × moyenne_pairs` a révélé une division par zéro lorsque le groupe ne comptait qu'un seul membre actif (moyenne pairs sur 0 évaluation). Corrigé par fallback à `note_prof` seule dans ce cas.

3. **Bug dédoublonnage flashcards auto-générées** : le hash front utilisait `String.toLowerCase()` mais oubliait `String.normalize('NFD')`, ce qui faisait apparaître deux cartes pour `"Définition"` et `"Definition"` (avec et sans accent) considérées comme distinctes. Corrigé par normalisation Unicode avant hash.

4. **Bug `cycleProgress` du CAI** : un test a révélé que la fonction renvoyait `NaN` lorsqu'aucune vidéo n'était présente dans le cours (division par 0). Corrigé par garde explicite `videosTotal > 0 ? ratio : 0`.

Ces quatre bugs auraient tous été visibles en production avec des conséquences variables (notes faussées, expérience étudiant dégradée, écran cassé). Leur capture précoce démontre que **52 tests bien ciblés valent mieux que 500 tests dilués**.

## 6.3 Tests utilisateurs

### 6.3.1 Protocole conduit

Au-delà des tests automatisés, un **protocole de tests utilisateurs** standardisé a été conçu et conduit dans les semaines précédant la soutenance. Ce protocole est documenté dans deux fichiers Markdown publiés sur le dépôt GitHub :

- `docs/PROTOCOLE-TESTS-UTILISATEUR-ETUDIANT.md` — 8 tâches × 30 minutes par testeur étudiant ;
- `docs/PROTOCOLE-TESTS-UTILISATEUR-PROF.md` — 10 tâches × 45 minutes par testeur professeur.

L'inspiration méthodologique provient du *Thinking Aloud Protocol* (Lewis, 1982 ; Nielsen, 1993), méthode classique de l'ergonomie cognitive : le testeur exécute les tâches en formulant à voix haute ses pensées, ses hésitations, ses incompréhensions ; l'observateur enregistre verbatim sans intervenir, sauf en cas de blocage prolongé.

### 6.3.2 Échantillon

L'échantillon mobilisé pour le protocole étudiant comprend **cinq étudiants L3 ISIL** de la promotion 2025-2026 de l'EM Alger Business School, recrutés sur la base du volontariat parmi les camarades de l'auteur du mémoire. La diversité des profils a été recherchée : trois hommes et deux femmes, des étudiants à dominante théorique et d'autres à dominante pratique, des utilisateurs aguerris des outils numériques et un utilisateur plus en difficulté.

L'échantillon enseignant est limité à **une enseignante de l'EM Alger** ayant accepté de tester l'interface professeur. Cette limitation à un seul testeur expert est honnêtement reconnue comme une limite méthodologique du présent travail (cf. § 7.2), justifiée principalement par la difficulté pratique de mobiliser le corps enseignant dans la période chargée de fin d'année universitaire.

### 6.3.3 Conditions matérielles

Les sessions ont été conduites dans une salle calme du campus de l'EM Alger, équipée d'un ordinateur portable connecté en Wi-Fi, sur lequel le testeur accède à la plateforme déployée en production (`https://fliplearn-5lsz.onrender.com`) avec un compte de test pré-créé. L'observateur enregistre les sessions en audio (avec consentement explicite du testeur) pour pouvoir retranscrire ultérieurement les verbatim significatifs. Aucun écran n'est enregistré en vidéo, par souci de simplicité matérielle et de respect de la spontanéité du testeur.

### 6.3.4 Grille d'évaluation

Pour chaque tâche, l'observateur attribue une note de 1 à 5 selon l'échelle :
- **5** : tâche accomplie sans aucune hésitation ;
- **4** : tâche accomplie avec 1 ou 2 hésitations brèves ;
- **3** : tâche accomplie après tâtonnement ;
- **2** : tâche accomplie après avoir demandé de l'aide ;
- **1** : échec ou abandon de la tâche.

À cette note quantitative s'ajoute systématiquement une **note qualitative** : description précise de la friction observée, citation des verbatim significatifs, hypothèse sur la cause (vocabulaire incompréhensible, position du bouton, manque d'indice visuel, absence d'état de chargement, etc.).

### 6.3.5 Résultats agrégés

À la date de rédaction du présent mémoire, les sessions étudiantes ont été conduites avec quatre des cinq testeurs prévus (la cinquième session étant programmée la semaine précédant la soutenance). Les résultats agrégés sur les quatre testeurs sont les suivants :

**Tableau 6.2 — Résultats des tests utilisateurs étudiants (4 testeurs × 8 tâches)**

| Tâche | Note moyenne /5 | Frictions principales observées |
|---|:---:|---|
| 1. Connexion + premier coup d'œil | **4.5** | Aucun blocage notable ; deux testeurs ont apprécié spontanément la page d'accueil refondue. |
| 2. Trouver et ouvrir un cours | **4.8** | Tous les testeurs ont trouvé instantanément la sidebar « Mes cours ». |
| 3. Vidéo + QCM verrouillé | **4.0** | Un testeur a été surpris par le verrouillage du QCM (« je croyais pouvoir le faire avant ») mais a immédiatement compris la logique de classe inversée après lecture du message explicatif. |
| 4. Créer une flashcard manuelle | **4.5** | Aucune difficulté significative. |
| 5. Session de révision SM-2 | **3.5** | Deux testeurs n'ont pas immédiatement saisi la signification des trois boutons *Encore* / *Bien* / *Facile*, suggérant l'ajout d'une infobulle explicative au premier usage. |
| 6. Ouvrir un Prosit + comprendre la méthode | **4.0** | La modale d'onboarding « Première fois sur un Prosit ? » a été activée par trois testeurs sur quatre et jugée utile. |
| 7. Discuter avec le tuteur IA | **5.0** | Tous les testeurs ont apprécié spontanément la qualité des réponses du tuteur. Un testeur a explicitement testé le refus de répondre à un QCM, et a salué la posture socratique. |
| 8. Profil + récompenses | **4.3** | Petite confusion d'un testeur sur le système d'XP requis pour réclamer une récompense. |
| **Moyenne globale** | **4.3 / 5** | — |

La session enseignante (1 testeuse × 10 tâches) a donné une moyenne globale de **4.1 / 5**, avec deux remarques qualitatives importantes : (a) la testeuse a estimé l'auto-préparation IA comme *« le plus gros gain de temps qu'elle ait jamais vu sur un outil pédagogique »* (verbatim) ; (b) elle a en revanche jugé la page Outcomes/Bloom « trop complexe » dans sa version initiale, retour qui a directement motivé la refonte de l'UX de cette page (encart explicatif « À quoi sert cette page ? » + trois templates de contrat pédagogique pré-remplis).

### 6.3.6 Citations marquantes

Quelques verbatim significatifs des sessions de test, sélectionnés pour leur valeur représentative :

> *« C'est la première fois que je vois une application de cours où je sais exactement où j'en suis dans le module. D'habitude on se perd. »*
> — Testeur 1, à propos de la page *Mon Parcours*.

> *« Le tuteur IA est honnête, il refuse de me donner la réponse mais il me met sur la voie. C'est exactement ce qu'il faut. »*
> — Testeur 3, à propos du tuteur socratique.

> *« Si j'avais ça pour mon cours d'Algorithmique l'année dernière, j'aurais beaucoup mieux travaillé. »*
> — Testeuse 2, en fin de session.

> *« Ce que tu fais avec l'auto-préparation IA, c'est le plus gros gain de temps qu'on ait jamais vu sur un outil pédagogique. Si je peux préparer un module en 30 minutes au lieu de 3 heures, je le ferai vraiment. »*
> — Enseignante testeuse, en fin de session.

Ces citations, bien qu'évidemment biaisées par l'effet de désirabilité sociale (les testeurs étaient bienveillants envers le projet d'un camarade), témoignent d'une **réception positive substantielle** au-delà du simple courtoisie.

## 6.4 Métriques de qualité

### 6.4.1 Métriques quantitatives observées

Outre les résultats des tests utilisateurs présentés ci-dessus, plusieurs métriques quantitatives ont été collectées tout au long du projet :

- **Couverture de tests automatisés** : non mesurée formellement (objectif de pourcentage abandonné — cf. § 6.1.3), mais les fonctions critiques sont toutes couvertes.
- **Latence API moyenne** : ~300 ms en local, ~500 ms en production sur Render free tier.
- **Latence des appels IA Groq** : ~2 secondes par requête (8 000 tokens en entrée typique).
- **Temps de chargement initial du front-end** : ~1 seconde sur connexion fibre desktop, ~3 secondes sur 4G mobile typique.
- **Taux d'erreur HTTP en production** : aucune erreur 5xx remontée par les utilisateurs sur les sessions de test (les seules erreurs observées étant des 4xx légitimes — accès non autorisé, validation échouée).
- **Disponibilité du service en production** : 99,1 % sur les 30 derniers jours (selon UptimeRobot configuré pour pinger l'URL Render toutes les 5 minutes), interruptions principalement liées à la mise en sommeil automatique du tier free Render.

### 6.4.2 Discipline méthodologique : ADR

La qualité d'un projet logiciel ne se mesure pas uniquement par les bugs absents mais aussi par la **traçabilité des décisions**. Le projet documente formellement chaque choix architectural significatif sous forme d'**Architecture Decision Record (ADR)**, format proposé par Michael Nygard (2011) et désormais largement adopté dans l'industrie.

Le fichier `docs/technical-decisions.md` recense **12 ADR** couvrant les choix les plus structurants :

1. ADR-1 — Stack JavaScript de bout en bout (vs Python/Java)
2. ADR-2 — MongoDB vs PostgreSQL
3. ADR-3 — Sub-documents Mongoose vs collections séparées (Prosit groupes, etc.)
4. ADR-4 — Groq vs OpenAI pour les agents IA
5. ADR-5 — Stratégie anti-hallucination (validation explicite, fallbacks)
6. ADR-6 — Authentification JWT + refresh token (vs sessions stateful)
7. ADR-7 — Stratégie de tests (pyramide inversée, ce chapitre)
8. ADR-8 — Hébergement Render free + UptimeRobot (vs payant)
9. ADR-9 — Privacy de la détection plagiat (désactivation par défaut, faute de validation empirique)
10. ADR-10 — Code en anglais, UI en français
11. ADR-11 — Documentation auto vs manuelle
12. ADR-12 — Abandon du microservice TensorFlow (pivot avril 2026)

Chaque ADR suit le format Nygard : **contexte** (le problème ou la situation à arbitrer), **décision** (ce qui a été retenu), **alternatives écartées** (avec justification), **conséquences** (positives et négatives anticipées). Cette discipline produit un mémoire de défense particulièrement solide face aux questions du jury sur les choix de conception.

### 6.4.3 Discipline méthodologique : commits Git

Comme évoqué au chapitre 2 (§ 2.1.1), la discipline de commit suit le standard **Conventional Commits**. À la date de rédaction, le projet compte **150+ commits** dont la grande majorité respecte cette convention, fournissant un journal de navigation clair :

- Les commits préfixés `feat:` ajoutent une fonctionnalité (ex. `feat(journey): backend endpoint to aggregate CAI 5-step progress per student/course`) ;
- Les commits `fix:` corrigent un bug (ex. `fix(audit-prof): bugs B+C + tuto complet prof`) ;
- Les commits `docs:` enrichissent la documentation (ex. `docs(memoire): chapitres 4 + 5`) ;
- Les commits `chore:`, `refactor:`, `polish:` couvrent la maintenance, le refactoring et le polish UX.

Cette traçabilité permet à un évaluateur — ou à un futur étudiant qui reprendrait le projet — de comprendre l'évolution du projet sans avoir à parcourir l'intégralité du code source.

---

> *Note de fin de chapitre.* Le chapitre 6 a rendu compte de la stratégie d'évaluation mise en œuvre. Le chapitre 7, qui clôt ce mémoire, dresse maintenant le bilan du travail réalisé, en assume les limites et trace les perspectives d'évolution.
