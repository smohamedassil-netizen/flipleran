# 📚 Documentation FlipLearn

**Projet de Fin d'Études — Licence 3 ISIL · EM Alger Business School · 2025-2026.**

Cette documentation est le complément académique du dépôt de code. Elle regroupe les choix techniques justifiés, les diagrammes d'architecture, le modèle de données, la référence des endpoints, et la stratégie de tests pour la soutenance.

---

## Sommaire

| Document | Objet |
|---|---|
| **[Architecture](architecture.md)** | Diagramme 3 couches, flux IA, runtime, déploiement |
| **[Modèle de données](data-model.md)** | ERD des 25 modèles MongoDB regroupés par domaine |
| **[Référence API](api-reference.md)** | ~120 endpoints REST groupés par module |
| **[Décisions techniques](technical-decisions.md)** | ADR (Architecture Decision Records) — choix justifiés |
| **[Stratégie de tests](testing-strategy.md)** | Couverture, types de tests, philosophie |
| **[Features MVP](features-mvp.md)** | 5 features stars démontrées à la soutenance |
| **[Features extensions](features-extensions.md)** | 7 modules complémentaires implémentés |
| **[Script soutenance](script-soutenance.md)** | Démo minute par minute + comptes test |
| **[Diagrammes](diagrams/)** | Mermaid : architecture, séquences, classes, cas d'usage |

---

## Cadre théorique mobilisé

FlipLearn s'appuie sur 18 références scientifiques cumulées dans le code et le mémoire.

### Pédagogie & sciences de l'éducation
- **Bergmann, J. & Sams, A. (2012)** — *Flip Your Classroom*. ISTE.
- **Lebrun, M. (2007)** — *Théories et méthodes pédagogiques*. De Boeck.
- **Anderson, L. W. & Krathwohl, D. R. (2001)** — Bloom révisé.
- **Mazur, E. (1997)** — *Peer Instruction: A User's Manual*.
- **Vygotsky, L. (1978)** — Zone Proximale de Développement.
- **Bandura, A. (1977)** — Self-efficacy theory.
- **Schön, D. (1983)** — *The Reflective Practitioner*.
- **Helle, Tynjälä, Olkinuora (2006)** — Project-based learning.

### Évaluation & peer-review
- **Topping, K. (1998)** — Peer assessment in colleges.
- **Falchikov, N. (2005)** — *Improving Assessment*.
- **Boud, D. & Falchikov, N. (2007)** — *Rethinking Assessment*.

### Mémoire & révision espacée
- **Ebbinghaus, H. (1885)** — Courbe de l'oubli.
- **Wozniak, P. (1990)** — Algorithme SuperMemo / SM-2.

### Motivation & gamification
- **Deci, E. & Ryan, R. (1985)** — Self-Determination Theory.
- **Csikszentmihalyi, M. (1990)** — *Flow*.
- **Werbach, K. & Hunter, D. (2012)** — *For the Win*.
- **Locke, E. & Latham, G. (2002)** — Goal-setting theory.

### Détection IA & e-learning
- **Mitchell et al. (2023)** — *DetectGPT*.
- **Garrison, Anderson, Archer (2000)** — Community of Inquiry.

---

## Comptes de démonstration

Voir [script-soutenance.md](script-soutenance.md). Mots de passe : `demo1234` (étudiants) ou `test1234` (suivant le seed appliqué).

| Rôle | Email | Profil |
|---|---|---|
| Prof | `lebrun@fliplearn.dz` | Mme Lebrun, ISIL L3 |
| Étudiante MVP | `sara.demo@fliplearn.dz` | engagement 95% |
| Étudiante moyenne | `lina.demo@fliplearn.dz` | engagement 65% |
| Étudiant en difficulté | `mehdi.demo@fliplearn.dz` | engagement 25% |

---

## Liens utiles

- **Application en production** : <https://fliplearn-5lsz.onrender.com>
- **Dépôt code** : <https://github.com/smohamedassil-netizen/flipleran>
- **Auteur** : Mohamed Assil SERAY · Licence 3 ISIL · 2025-2026
