# Script de démo — Soutenance PFE FlipLearn

**Durée totale : 7 minutes** · Plateforme déployée sur
`https://fliplearn-5lsz.onrender.com` (ou en local sur `http://localhost:5173`).

> **Pré-requis** : avoir lancé `node backend/scripts/seed-soutenance.js`
> au moins une fois (ou `--reset` pour repartir d'une scène fraîche).
> Voir [`backend/scripts/README.md`](../backend/scripts/README.md).

## Contexte à donner en intro (lecture directe optionnelle)

> *FlipLearn est une plateforme web de classe inversée, développée pour ma
> filière Licence ISIL. Elle s'appuie sur les travaux de Lebrun (2007),
> Bergmann & Sams (2012) sur la classe inversée, complétés par la
> taxonomie de Bloom révisée (Anderson & Krathwohl, 2001), l'évaluation par
> les pairs (Falchikov, 2005) et la pédagogie APP/CESI pour les Prosits.
> Sur les 7 prochaines minutes, je vais vous montrer le parcours d'un
> étudiant et la vue prof, en illustrant les fonctionnalités pédagogiques
> ajoutées dans le sprint final.*

---

## 0:00 — 0:30 · Intro & problématique (30 s)

**Slide / parler** :
- Le cours magistral pur ne fonctionne plus. Les étudiants oublient 70%
  des contenus passifs en quelques jours (Lebrun, 2007).
- FlipLearn renverse l'ordre : transmission à distance, application en classe.
- Trois apports clés du sprint pédagogie : **questions in-video** + **parcours
  scénarisé** + **évaluation par les pairs**.

> *Aucune action écran. C'est l'introduction debout devant la slide.*

---

## 0:30 — 1:30 · Étudiant : vidéo + question in-video (60 s)

1. Se connecter avec **`lina.demo@fliplearn.dz` / `demo1234`** (étudiante
   moyenne, engagement 65%).
2. Aller dans **Mes cours** → ouvrir **« Sécurité Web — L3 ISIL »**.
3. Faire défiler le bandeau pédagogique en haut :
   - *Pointer le **contrat pédagogique** rendu en Markdown.*
   - *Pointer la **liste des objectifs Bloom** avec leur statut « En cours / Acquis ».*
4. Cliquer sur **étape 1 du parcours** : la première vidéo « Introduction
   à OWASP Top 10 ».
5. Lancer la lecture, **avancer à 1:30** (timestamp d'une question
   in-video) → l'overlay apparaît, la vidéo se met en pause.
6. Répondre **B (Broken Access Control)**. Lire l'explication qui
   s'affiche, fermer.
7. Avancer à **4:00**, répondre à la 2e question, fermer.
8. Avancer à **7:30**, répondre à la 3e, fermer.

**Phrase clé à dire** :
> *« Comme dans EdPuzzle, la vidéo n'est plus passive : elle teste l'attention
> au moment précis où le concept vient d'être expliqué. C'est une
> implémentation directe du Peer Instruction de Mazur. »*

---

## 1:30 — 2:30 · QCM + LearningPath (60 s)

1. Retour à la page du cours (clic logo / breadcrumb).
2. **Étape 2 du parcours** est maintenant débloquée : QCM Top 10.
3. Cliquer **Commencer**, répondre rapidement aux 5 questions (cocher au
   feeling, c'est OK pour la démo).
4. Soumettre. Score affiché → écran de feedback avec corrections.
5. Retour au cours : montrer que **l'étape 3 (vidéo XSS) est désormais
   disponible** alors qu'elle était verrouillée auparavant.
6. Pointer la **barre de progression globale du parcours** (X / 7 étapes).

**Phrase clé** :
> *« Le parcours scénarisé matérialise la notion d'alignement constructif de
> Biggs : chaque étape débloque la suivante selon des critères mesurables
> (visionnage ≥ 70% pour les vidéos, score ≥ 60% pour les QCM). »*

---

## 2:30 — 3:30 · Prosit : évaluation par les pairs (60 s)

1. Toujours connecté en tant que Lina, aller dans **Prosits**.
2. Ouvrir **« Sécuriser une API REST contre OWASP Top 10 »** (Groupe Alpha).
3. La page affiche :
   - L'énoncé complet (cas RestoNow).
   - L'**encart orange « Évaluation par les pairs ouverte »** avec deadline
     dans 4 jours.
4. Cliquer **« Évaluer mes camarades »**.
5. Sur la page d'évaluation :
   - Faire défiler pour montrer l'**auto-évaluation** (effort / qualité /
     communication, sliders étoiles).
   - Cliquer ★★★★ pour les 3 critères, ajouter une réflexion en 1
     phrase.
   - Pour le 1er coéquipier (Sara), donner ★★★★★ partout, commentaire
     « Excellent travail sur les patches IDOR ».
   - Toggle **Anonyme** sur ON (vérifier qu'il l'est par défaut).
6. Cliquer **« Soumettre mes évaluations »**.

**Phrase clé** :
> *« 70% prof, 30% pairs : Falchikov a démontré que cette pondération réduit
> significativement le free-riding et augmente la fiabilité de
> l'évaluation collaborative. L'anonymat est par défaut, comme recommandé
> par Topping. »*

---

## 3:30 — 4:30 · Vue prof : tableau de bord + notes individuelles (60 s)

1. **Se déconnecter**, se reconnecter en prof : **`lebrun@fliplearn.dz` /
   `demo1234`**.
2. Aller dans **Tableau de bord professeur** (sidebar).
3. Sélectionner le cours **« Sécurité Web — L3 ISIL »**.
4. Pointer :
   - **Stats globales** : étudiants inscrits, complétion vidéos moyenne,
     réussite QCM moyenne.
   - **Suivi par vidéo** : tableau coloré (vert ≥ 80%, orange 40-80%,
     rouge < 40%). Faire glisser pour montrer la **vidéo 3 (JWT)** en
     rouge → certains étudiants n'ont pas progressé.
   - **Analyse QCM** : barres de réussite par question. Pointer une question
     en orange (« Notion à revoir en présentiel »).
5. Aller dans **Prosits** → ouvrir **« Sécuriser une API REST »**.
6. Pointer le **panneau « Suivi des évaluations par les pairs »** avec
   compteur 12/24 fait.
7. Faire défiler vers la section **« Notes finales par membre »** :
   - **Sara**  → ⭐ MVC, note finale ~16.6/20, +180 XP
   - **Yanis** → 16.2/20, +160 XP
   - **Lina**  → 15.5/20, +140 XP
   - **Walid** → 14.8/20, +120 XP

**Phrase clé** :
> *« Au lieu d'un flat 150 XP par membre, chacun reçoit une XP individualisée
> selon son coefficient d'engagement personnel. Sara a 30 XP de plus que
> Walid alors qu'ils ont la même note de groupe. »*

---

## 4:30 — 5:30 · Édition pédagogique : nouvel outcome Bloom (60 s)

1. Toujours en prof, aller dans **Mes cours** → carte **Sécurité Web** →
   bouton **« Objectifs »** (ou via la sidebar **Objectifs Bloom**).
2. Sur la page d'édition :
   - Pointer la **liste des 5 outcomes** existants avec leurs badges
     colorés (gris Remember, bleu Understand, vert Apply, orange Analyze).
   - Cliquer **« Ajouter un objectif »**.
   - Énoncé : **« Concevoir une politique de sécurité incidents pour une
     équipe de 10 développeurs »**.
   - Cliquer le radio **Create** → noter le verbe « concevoir » qui
     s'affiche dans la sélection.
   - Durée estimée : 60 minutes.
   - Valider → l'outcome apparaît avec un badge **rouge Create**.
3. Faire un **drag & drop** pour le placer en milieu de liste.
4. Faire défiler vers le **contrat pédagogique** : pointer le rendu Markdown
   live à droite.
5. Cliquer **Enregistrer**.

**Phrase clé** :
> *« Anderson & Krathwohl ont révisé Bloom en 2001 pour distinguer 6 niveaux
> cognitifs : remember, understand, apply, analyze, evaluate, create.
> FlipLearn impose au prof de choisir un niveau pour chaque objectif —
> ce n'est plus une description vague, c'est un engagement vérifiable. »*

---

## 5:30 — 6:30 · Édition du LearningPath (60 s)

1. Retour à la page du cours, cliquer **« Parcours pédagogique »** (bouton
   ou via la fiche cours).
2. Sur la page **LearningPathBuilder** :
   - Pointer les **7 étapes** déjà configurées (V → Q → V → Q → V → Q → Prosit).
   - **Drag & drop** : déplacer le QCM 3 avant la vidéo 3 pour montrer la
     manipulation. Annuler ou laisser tel quel.
   - **Cliquer Ajouter une étape** → sélectionner type **Lecture**, choisir
     une ressource (s'il y en a, sinon montrer le sélecteur vide).
   - Annuler le modal.
   - Sur l'étape **QCM 1** : cliquer **chevron** pour déplier, modifier le
     **score min à 70%** dans `unlockCriteria`, ajouter un message
     personnalisé : « Vise 70% — c'est le seuil pour passer à XSS ».
3. Cliquer **Aperçu étudiant** → on retombe sur la page cours en mode prof
   (avec le toggle **Vue libre**).
4. Cliquer **Enregistrer** puis **Publier**.

**Phrase clé** :
> *« La scénarisation pédagogique au sens de Lebrun, c'est exactement ça :
> le prof orchestre l'ordre, les transitions, les critères. Sans ça, on
> a juste un sac de vidéos. »*

---

## 6:30 — 7:00 · Conclusion + fiche méthode CESI (30 s)

1. Cliquer **« Méthode Prosit »** dans la sidebar (visible aux deux
   rôles).
2. Faire défiler rapidement la fiche pour montrer :
   - Le **schéma SVG des 5 rôles tournants**.
   - Les **3 phases**.
   - Les **pièges à éviter**.
   - Les **citations académiques en bas**.

**Phrase de clôture** :
> *« Cette fiche est obligatoirement présentée à l'étudiant la première fois
> qu'il ouvre un Prosit, via un modal d'onboarding. C'est un détail —
> mais c'est ce détail qui distingue un dispositif pédagogique d'une
> plateforme de stockage de vidéos. Merci, je suis disponible pour vos
> questions. »*

---

## Plan B en cas d'incident

| Symptôme | Action de secours |
|----------|--------------------|
| Backend Render au repos (free tier sleeps) | Démarrer la démo 2 min plus tôt et faire un appel à `https://fliplearn-5lsz.onrender.com/api/courses` (depuis Postman ou un onglet) pour réveiller l'instance |
| Vidéo 1 ne se charge pas (Cloudfront cache) | Aller directement à l'étape 2 (QCM) et expliquer la fonctionnalité in-video à l'oral avec une capture d'écran préparée |
| Mongo down | Annoncer la limite et basculer sur le mode démo statique (slides) prévu en backup |
| Le seed est cassé | Relancer `node backend/scripts/seed-soutenance.js --reset` puis recommencer |

## Captures d'écran à pré-charger (au cas où)

- Page parcours pédagogique étudiant (Lina) avec timeline 7 étapes.
- Modal de question in-video avec l'option B sélectionnée.
- Tableau de bord prof avec les barres de complétion.
- Notes individuelles finales du Groupe Alpha (Sara MVP, Mehdi free-rider).
- Page Objectifs Bloom avec les 6 niveaux colorés.

Stocker dans `assets_memoire/captures/` à la racine du PFE.
