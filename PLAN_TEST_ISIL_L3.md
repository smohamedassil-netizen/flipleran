# PLAN DE TEST — ISIL L3

Contenu détaillé clé en main pour remplir l'application avec des données crédibles et démo-ready.

---

## A. COMPTES UTILISÉS

### Le prof ISIL L3 à utiliser
Un seul prof seedé pour cette filière/promotion :

| Champ | Valeur |
|---|---|
| Nom complet | **Omar Saadi** |
| Email | `omar.isil.l3@fliplearn.dz` |
| Mot de passe | `test1234` |
| Filière | ISIL |
| Promotion | L3 |

### Étudiant ISIL L3 pour les tests
| Champ | Valeur |
|---|---|
| Nom | **Assil Seray** (toi) |
| Email | `assil.isil.l3@fliplearn.dz` |
| Mot de passe | `test1234` |

### Autre étudiant à inscrire (pour tester groupes)
Si tu veux tester un Prosit en groupe ou un Quiz Battle, **inscris-toi** avec un nouveau compte :
- Email : `test.isil.l3@fliplearn.dz` (ou n'importe quel email à toi)
- Filière : ISIL / Promotion : L3
- Puis valide en tant qu'admin

---

## B. 5 MODULES ISIL L3 À CRÉER

Ces 5 modules forment un parcours cohérent pour une L3 informatique. Ils correspondent aux modules typiques de cette année.

---

### Module 1 — Sécurité Informatique

**À copier dans le formulaire "Créer un cours"** :
- **Titre** : `Sécurité Informatique`
- **Filière** : ISIL
- **Promotion** : L3
- **Description** : `Introduction aux fondamentaux de la cybersécurité : menaces, vulnérabilités, défense en profondeur, OWASP Top 10, et bonnes pratiques. Module orienté pratique avec démos d'attaques classiques (XSS, SQLi, CSRF) et mécanismes de protection.`

#### Vidéos YouTube à uploader (mode YouTube)

| # | Titre dans FlipLearn | Recherche YouTube |
|---|---|---|
| 1 | Introduction à la cybersécurité | `cybersécurité débutant Cookie connecté` ou `Micode introduction cybersécurité` |
| 2 | OWASP Top 10 expliqué | `OWASP Top 10 français` |
| 3 | Attaque XSS en pratique | `XSS attaque démo français` |

**Conseil** : sur YouTube, copie l'URL complète depuis la barre d'adresse (format `https://www.youtube.com/watch?v=XXXX` ou `https://youtu.be/XXXX`), colle-la dans le champ "URL YouTube" de FlipLearn.

#### QCM Module 1 — pour génération IA
Quand tu crées le QCM, choisis "Génération par IA" → 5 questions → l'IA Groq se base automatiquement sur le titre et la description de la vidéo. **Pas besoin de fournir le contenu** : Groq connaît OWASP, XSS, etc.

**OU** version manuelle (à copier-coller question par question) :

| # | Question | A | B | C | D | Bonne |
|---|---|---|---|---|---|---|
| 1 | Que signifie XSS ? | Cross Site Scripting | Extra Secure System | XML Site Service | eXtended SQL Server | A |
| 2 | Le principe de défense en profondeur consiste à : | Mettre 1 firewall très fort | Empiler plusieurs couches de sécurité | Bloquer tout le trafic | Désactiver les ports | B |
| 3 | OWASP Top 10 référence : | Les 10 plus grandes entreprises | Les 10 risques web les plus critiques | Les 10 commandes Linux | Les 10 protocoles réseau | B |
| 4 | Une injection SQL exploite : | Les bugs CSS | La concaténation non échappée de requêtes SQL | Les ports ouverts | La RAM | B |
| 5 | Un CSRF (Cross-Site Request Forgery) force la victime à : | Cliquer un lien | Exécuter une action authentifiée à son insu | Télécharger un virus | Changer son mot de passe | B |

---

### Module 2 — Cryptographie

**À copier** :
- **Titre** : `Cryptographie`
- **Filière** : ISIL / **Promotion** : L3
- **Description** : `Fondements mathématiques et applications de la cryptographie moderne : chiffrement symétrique (AES), asymétrique (RSA, ECC), fonctions de hachage (SHA-256), signatures numériques, et infrastructures à clés publiques (PKI).`

#### Vidéos YouTube
| # | Titre dans FlipLearn | Recherche YouTube |
|---|---|---|
| 1 | Chiffrement symétrique vs asymétrique | `chiffrement symétrique asymétrique français` |
| 2 | RSA expliqué simplement | `RSA explication français mathématiques` |
| 3 | Fonctions de hachage SHA-256 | `SHA-256 fonction hachage français` |

#### QCM Module 2 — manuel
| # | Question | A | B | C | D | Bonne |
|---|---|---|---|---|---|---|
| 1 | Quel algorithme est symétrique ? | RSA | AES | ECC | DSA | B |
| 2 | RSA repose sur la difficulté de : | Factoriser un grand nombre | Calculer un sin/cos | Inverser un hash | Trier un tableau | A |
| 3 | SHA-256 produit un hash de : | 128 bits | 256 bits | 512 bits | 64 bits | B |
| 4 | Une signature numérique garantit : | La vitesse | L'authenticité + intégrité | La confidentialité | Le compression | B |
| 5 | Une PKI gère : | Les firewalls | Les certificats numériques | Les VPN | Les logs | B |

---

### Module 3 — Architectures Logicielles

**À copier** :
- **Titre** : `Architectures Logicielles`
- **Filière** : ISIL / **Promotion** : L3
- **Description** : `Patterns architecturaux modernes : MVC, microservices vs monolithe, event-driven, hexagonal architecture, CQRS. Étude de cas concrets et pratiques de découplage, scalabilité, et maintenabilité.`

#### Vidéos YouTube
| # | Titre dans FlipLearn | Recherche YouTube |
|---|---|---|
| 1 | Monolithe vs Microservices | `monolithe microservices français Cocadmin` |
| 2 | Pattern MVC en 10 minutes | `MVC pattern français Grafikart` |
| 3 | Architecture hexagonale (Ports & Adapters) | `architecture hexagonale français` |

#### QCM Module 3 — manuel
| # | Question | A | B | C | D | Bonne |
|---|---|---|---|---|---|---|
| 1 | MVC signifie : | Model View Controller | Memory Virtual Cache | Multi Vendor Code | Modular Vector Cluster | A |
| 2 | Un microservice idéal est : | Énorme et centralisé | Petit, autonome, déployable seul | Stateful obligatoirement | Sans tests | B |
| 3 | L'archi hexagonale isole : | Le frontend | La logique métier des dépendances externes | La base de données | Les utilisateurs | B |
| 4 | CQRS sépare : | Le cache et la RAM | Les commandes des requêtes | Les utilisateurs des admins | Le code et les tests | B |
| 5 | Event-driven signifie : | Tout est synchrone | Les composants communiquent via événements | Les events sont stockés en DB | Les events sont des bugs | B |

---

### Module 4 — Cloud & DevOps

**À copier** :
- **Titre** : `Cloud & DevOps`
- **Filière** : ISIL / **Promotion** : L3
- **Description** : `Pratiques DevOps modernes : conteneurisation Docker, orchestration Kubernetes, CI/CD avec GitHub Actions, Infrastructure as Code (Terraform), monitoring (Prometheus/Grafana). Cloud providers : AWS, GCP, Azure — concepts comparés.`

#### Vidéos YouTube
| # | Titre dans FlipLearn | Recherche YouTube |
|---|---|---|
| 1 | Docker en 15 minutes | `Docker tutoriel français débutant Cocadmin` |
| 2 | Introduction à Kubernetes | `Kubernetes français introduction` |
| 3 | CI/CD avec GitHub Actions | `GitHub Actions tutoriel français` |

#### QCM Module 4 — manuel
| # | Question | A | B | C | D | Bonne |
|---|---|---|---|---|---|---|
| 1 | Docker est : | Un OS | Une plateforme de conteneurisation | Un IDE | Un cloud provider | B |
| 2 | Kubernetes orchestre : | Des serveurs physiques | Des conteneurs | Des bases de données | Des fichiers | B |
| 3 | CI/CD signifie : | Continuous Integration / Continuous Deployment | Code Inspection / Code Debug | Cloud Init / Cloud Deploy | Container Image / Container Daemon | A |
| 4 | Terraform fait : | Du monitoring | De l'Infrastructure as Code | De la base de données | Du chiffrement | B |
| 5 | Prometheus est outil de : | Monitoring/métriques | Build | Sauvegarde | Routage | A |

---

### Module 5 — Intelligence Artificielle

**À copier** :
- **Titre** : `Intelligence Artificielle`
- **Filière** : ISIL / **Promotion** : L3
- **Description** : `Fondamentaux du machine learning supervisé/non supervisé, deep learning, réseaux de neurones, gradient descent, et applications NLP/Computer Vision. Cas concrets avec Python (scikit-learn, TensorFlow).`

#### Vidéos YouTube
| # | Titre dans FlipLearn | Recherche YouTube |
|---|---|---|
| 1 | Qu'est-ce que le Machine Learning ? | `machine learning expliqué français` |
| 2 | Réseaux de neurones (Deep Learning) | `réseau neurones expliqué simple français 3Blue1Brown` |
| 3 | NLP et Transformers | `transformers NLP français explication` |

#### QCM Module 5 — manuel
| # | Question | A | B | C | D | Bonne |
|---|---|---|---|---|---|---|
| 1 | Apprentissage supervisé utilise : | Données sans label | Données avec label | Aucune donnée | Du hasard pur | B |
| 2 | Le gradient descent sert à : | Trier les données | Minimiser une fonction de coût | Compresser les images | Lire un CSV | B |
| 3 | Un transformer en NLP utilise : | Les RNN seuls | L'attention | Du Bayes naïf | Des arbres | B |
| 4 | scikit-learn est une lib : | C++ | Python ML | JavaScript front | Java backend | B |
| 5 | Le deep learning est une branche : | Des bases de données | Du machine learning | Du réseau | Du cloud | B |

---

## C. 2 PROSITS ISIL L3 (énoncés clés en main)

### Prosit 1 — Sécuriser une application web bancaire

**À copier dans "Créer un Prosit"** :

| Champ | Valeur |
|---|---|
| **Titre** | `Sécuriser une application web bancaire` |
| **Pitch (1 phrase)** | `Une banque algérienne lance son app web : analyser les risques OWASP et proposer une stratégie de défense.` |
| **Énoncé complet** | (voir bloc ci-dessous) |
| **Cas d'entreprise** | `BNA — Banque Nationale d'Algérie` |
| **Mots-clés** | `OWASP, XSS, SQLi, JWT, HTTPS, MFA, audit` |
| **Objectifs d'apprentissage** | (voir bloc ci-dessous) |
| **Cours associé** | `Sécurité Informatique` (Module 1) |
| **Filière** | ISIL / **Promotion** : L3 |
| **Date Aller** | (J+1) — demain |
| **Date Retour** | (J+8) — dans 8 jours |
| **Durée recherche** | 7 jours |
| **Min/Max membres** | 3 / 5 |
| **Mode formation** | Aléatoire |

**Énoncé complet (à copier-coller intégralement)** :
```
Vous êtes embauchés comme consultants cybersécurité pour la BNA (Banque Nationale d'Algérie) qui s'apprête à lancer "BNA Online", sa nouvelle application web de banque à distance. L'application permettra aux clients de consulter leurs comptes, effectuer des virements, et demander des crédits.

Le directeur informatique vous demande :
1. D'identifier les 5 risques OWASP les plus critiques pour ce type d'application.
2. De proposer une stratégie de défense en profondeur (couches : réseau, applicatif, données).
3. De définir un plan de tests d'intrusion avant la mise en production.
4. De rédiger un guide de bonnes pratiques pour les développeurs.

Livrable attendu : un rapport de 10 pages + une présentation orale de 15 min devant le comité de pilotage.
```

**Objectifs d'apprentissage (1 par ligne)** :
```
Identifier les vulnérabilités web critiques selon OWASP
Concevoir une stratégie de défense multi-couches
Maîtriser les bonnes pratiques d'authentification (JWT, MFA)
Rédiger un rapport de sécurité professionnel
```

---

### Prosit 2 — Choisir une architecture pour une startup e-commerce

**À copier** :

| Champ | Valeur |
|---|---|
| **Titre** | `Architecture d'une plateforme e-commerce scalable` |
| **Pitch** | `Une startup vise 1M d'utilisateurs en 1 an : monolithe ou microservices ?` |
| **Cas d'entreprise** | `Yassir / Jumia (e-commerce MENA)` |
| **Mots-clés** | `microservices, monolithe, scalabilité, Docker, Kubernetes, base de données` |
| **Cours associé** | `Architectures Logicielles` (Module 3) |
| **Filière** | ISIL / **Promotion** : L3 |
| **Date Aller** | (J+1) |
| **Date Retour** | (J+8) |
| **Min/Max membres** | 3 / 5 |

**Énoncé complet** :
```
Une startup algérienne, "ShopDZ", veut lancer une marketplace e-commerce panafricaine. Elle prévoit 1 million d'utilisateurs actifs mensuels d'ici 12 mois, avec des pics de trafic pendant le Ramadan et le Black Friday.

L'équipe technique débat : faut-il partir sur un monolithe (rapide à développer mais difficile à scaler) ou sur une architecture microservices (complexe mais évolutive) ?

Votre mission :
1. Analyser les besoins fonctionnels (catalogue, panier, paiement, livraison, recommandation).
2. Comparer monolithe vs microservices pour CE contexte précis.
3. Proposer une architecture cible avec justification (diagramme UML/C4).
4. Lister les outils DevOps à mettre en place (CI/CD, monitoring, déploiement).
5. Estimer les coûts cloud (AWS/GCP) sur 1 an.

Livrable : architecture document + diagramme + estimation budgétaire.
```

---

## D. 1 PROJET ISIL L3 (PFE-style)

### Projet — Mini-LMS sécurisé pour une école

**À copier dans "Créer un projet"** :

| Champ | Valeur |
|---|---|
| **Type** | Multi-modules (groupe) |
| **Titre** | `Mini-LMS sécurisé — Gestion de cours en ligne` |
| **Description** | `Développer une plateforme LMS minimale (cours, vidéos, QCM) sécurisée par JWT, déployée en cloud, avec CI/CD.` |
| **Modules rattachés** | Sécurité Informatique + Architectures Logicielles + Cloud & DevOps (3 cochés) |
| **Mots-clés** | `LMS, JWT, Docker, CI/CD, MongoDB, React, Express, OWASP` |
| **Date début** | Aujourd'hui |
| **Date fin** | (J+30) |
| **Date soutenance** | (J+35) |

**Énoncé** :
```
En groupe de 4 étudiants, développer un mini-LMS (Learning Management System) similaire à Moodle, mais centré sur :
- Authentification sécurisée (JWT + refresh token)
- Upload de vidéos (Cloudinary ou stockage local)
- QCM avec timer
- Tableau de bord étudiant + prof
- Pipeline CI/CD GitHub Actions → Docker → Render

Stack imposé : React + Node.js + MongoDB + Docker.

Contraintes :
- Couvrir l'OWASP Top 10 (XSS, SQLi, CSRF, JWT misuse)
- Tests unitaires + intégration (≥ 60% coverage)
- Documentation API (Swagger ou Postman)
- README qui permet à un évaluateur de lancer le projet en < 5 min

Livrables : code GitHub + démo déployée + rapport 15 pages + soutenance 20 min.
```

**Phases (pré-remplies, à éditer si besoin)** :
1. Spécifications & maquettes (5 jours)
2. Setup CI/CD + auth JWT (5 jours)
3. Backend API (cours, vidéos, QCM) (7 jours)
4. Frontend React (7 jours)
5. Tests + audit sécurité (3 jours)
6. Déploiement + soutenance (3 jours)

---

## E. ORDRE DE TEST RECOMMANDÉ

Pour faire une démo complète et cohérente :

### Phase 1 — Setup prof (Omar Saadi, 30 min)
1. Connexion `omar.isil.l3@fliplearn.dz` / `test1234`
2. **Crée les 5 cours** (§B) — un par un, prends ~2 min chacun
3. **Pour chaque cours**, ajoute 1 vidéo YouTube (la 1ère de la liste suffit pour une démo) — au moins 5 vidéos au total
4. **Pour la vidéo du Module 1** (Sécurité), crée 1 QCM via génération IA (5 questions)
5. Crée le **Prosit 1** (Sécuriser app bancaire)
6. Crée le **Projet** (Mini-LMS)

### Phase 2 — Setup étudiant (Assil Seray, 20 min)
1. Connexion `assil.isil.l3@fliplearn.dz` / `test1234`
2. Va sur **Mon Parcours** → tu vois les 5 modules apparaître
3. **Mes cours** → ouvre "Sécurité Informatique" → regarde la vidéo (skip à 90% pour gagner du temps)
4. À 80%, tu vois le toast "Flashcards générées" → va dans Mes decks → tu vois un deck auto
5. Bouton **"QCM"** → fais le QCM (au moins 1 réponse juste pour gagner des points)
6. Va dans **Mon tuteur IA** → pose la question : `"Explique-moi ce qu'est le XSS en 3 phrases"` → réponse Groq
7. Va dans **Prosits** → ouvre le Prosit 1 → regarde la phase Aller → remplis quelques mots-clés
8. Va dans **Projets** → ouvre le projet → vois la timeline

### Phase 3 — Supervision admin (5 min)
1. Connexion `admin@fliplearn.dz` / `admin1234`
2. **Tableau de bord** → vérifie que les stats ont bougé (cours créés, users actifs)
3. **Inscriptions** → si tu as inscrit un nouveau compte (§A), valide-le
4. **Utilisateurs** → vérifie que les comptes sont bien filtrables par filière=ISIL, promotion=L3
5. **Récompenses** → si l'étudiant a réclamé quelque chose, valide-le

---

## F. POUR ALLER PLUS LOIN (optionnel)

### Si tu veux 10 vidéos au lieu de 5
Ajoute 1 vidéo de plus par module, avec le même schéma : recherche YouTube → URL → upload mode YouTube.

### Si tu veux remplir Management ou Finance
Le seed inclut aussi des profs et étudiants pour ces filières (cf. CLAUDE.md). Le concept est le même mais avec d'autres modules :
- **Management L3** : Stratégie, Marketing digital, RH, Finance d'entreprise
- **Finance & Comptabilité L3** : Comptabilité avancée, Audit, Fiscalité, Marchés financiers

### Si tu veux des données réalistes pour Mon Parcours (CAI)
Le système calcule la "préparation classe" en fonction du % de vidéos vues + QCM passés. Pour avoir des indicateurs colorés (rouge / orange / vert), fais en sorte que l'étudiant Assil ait :
- Vidéos vues : 3 sur 5 (= 60%)
- QCM passés : 1 sur 5 (= 20%)
- Cela mettra l'indicateur Préparation en orange "à risque modéré"

---

**Tout est prêt pour la démo. Bonne chance pour ta soutenance du 15 juin !**
