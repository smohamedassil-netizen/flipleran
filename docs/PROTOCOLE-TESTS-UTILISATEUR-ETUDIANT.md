# 🧪 Protocole de tests utilisateur — côté étudiant

**Pour qui** : 3-5 camarades L3 ISIL d'EM Alger Business School (testeurs externes)
**Durée** : ~30 min par testeur
**Objectif** : valider que l'expérience étudiant est fluide, comprendre les blocages réels, alimenter le chapitre "Tests utilisateurs" du mémoire PFE.

---

## Setup pour le testeur

**URL de test** : https://fliplearn-5lsz.onrender.com (Render — peut prendre 30s à se réveiller au 1er accès)

**Compte fourni** :
- Email : `assil.isil.l3@fliplearn.dz` (ou un autre `<prenom>.isil.l3@fliplearn.dz`)
- Mot de passe : `test1234`

**Matériel** : navigateur récent (Chrome/Firefox/Safari), session privée recommandée.

---

## Consigne au testeur (à lire à voix haute)

> « Tu vas tester FlipLearn, une plateforme d'apprentissage de classe inversée pour étudiants L3. Je vais te demander d'accomplir 8 tâches typiques. Pour chacune, je veux que tu **penses à voix haute** : ce que tu cherches, ce qui te bloque, ce que tu aimes, ce qui te paraît bizarre. Je note tout. **Il n'y a pas de mauvaise réponse — c'est l'app qu'on teste, pas toi.** »

---

## Tâches à accomplir

### Tâche 1 — Connexion + premier coup d'œil (2 min)

> « Connecte-toi avec les identifiants donnés. Une fois sur la page d'accueil, dis-moi en 2 phrases ce que tu vois et où tu cliquerais en premier. »

**À noter** :
- ⏱ Temps pour repérer la zone "Mes cours"
- 💬 Premier mot pour décrire la page (claire / confuse / vide / chargée…)
- ✋ Hésitations sur les boutons

---

### Tâche 2 — Trouver et ouvrir un cours (2 min)

> « Trouve le cours de **Cybersécurité** et ouvre-le. »

**À observer** :
- Passe-t-il par la sidebar "Mes cours" ou par la liste du dashboard ?
- Comprend-il la liste des vidéos ?
- Repère-t-il le panneau "MA PROGRESSION" à droite ?

---

### Tâche 3 — Regarder une vidéo + faire le QCM (5 min)

> « Lance la première vidéo. Regarde au moins la moitié. Ensuite, essaie de faire le QCM associé. »

**À observer** :
- ⚠️ La vidéo se charge-t-elle ? (Si non → noter "vidéo cassée", c'est un bug connu — option Cloudinary à appliquer)
- Le testeur comprend-il le système de "QCM verrouillé tant que < 50% vu" ?
- Réussit-il à débloquer le QCM ?
- Comprend-il les questions ?

---

### Tâche 4 — Créer une flashcard manuelle (3 min)

> « Va dans "Mes decks" depuis le menu. Crée un nouveau deck nommé "Test révision", puis ajoute-y une carte (recto = "Capitale du Japon", verso = "Tokyo"). »

**À observer** :
- Trouve-t-il "Mes decks" rapidement ?
- Le bouton "Nouveau deck" est-il visible ?
- Le formulaire est-il intuitif ?
- Comprend-il la différence entre un *deck* et une *carte* ?

---

### Tâche 5 — Lancer une session de révision (2 min)

> « Réviser ton deck "Test révision". Réponds aux cartes en cliquant "Encore", "Bien" ou "Facile". »

**À observer** :
- Comprend-il le système SM-2 (espacement) ?
- L'animation flip card est-elle fluide ?
- Que pense-t-il du feedback "prochaine révision dans X jours" ?

---

### Tâche 6 — Ouvrir un Prosit + comprendre la méthode (5 min)

> « Va dans "Prosits". Ouvre celui qui s'appelle "Sécuriser une application web (OWASP)". Tu joues le rôle de **Secrétaire** : qu'est-ce que tu dois faire ? »

**À observer** :
- Repère-t-il l'encart "Première fois sur un Prosit ? → Lire la méthode (5 min)" ?
- Comprend-il les 3 phases (Aller / Recherche / Retour) ?
- Identifie-t-il son rôle et ses responsabilités ?
- Le badge "ÉVALUÉ" est-il clair ?

---

### Tâche 7 — Discuter avec le tuteur IA (5 min)

> « Va dans "Mon tuteur IA" (badge "IA" violet). Pose-lui une question liée à un cours, par exemple "Explique-moi la triade CIA" ou "Comment je commence mon Prosit ?". »

**À observer** :
- Comprend-il que c'est de l'IA et non un humain ?
- Le tuteur répond-il en français correct ?
- Les suggestions personnalisées à gauche sont-elles utiles ?
- Note l'éventuel délai de réponse (Groq peut prendre 2-5s).

---

### Tâche 8 — Profil + récompenses (3 min)

> « Va voir ton profil ("Mon profil"). Combien de points XP as-tu ? Va ensuite dans "Récompenses" : que peux-tu débloquer avec tes points ? »

**À observer** :
- Trouve-t-il le profil rapidement ?
- Comprend-il le système de points/badges ?
- Que pense-t-il de la récompense "1 mois Premium" comme incitation ?

---

## Questions de débrief (5 min)

À poser après les 8 tâches, à voix haute, sans interruption :

1. **Globalement, tu mets quelle note sur 10 à FlipLearn ?** Pourquoi ?
2. **Une seule chose à améliorer en priorité** — laquelle ?
3. **Une seule chose qui t'a vraiment plu** — laquelle ?
4. **Si tu devais l'utiliser pour de vrai pour un cours**, qu'est-ce qui te manquerait ?
5. **Le terme "classe inversée" te parle-t-il ?** Avant de tester, tu savais ce que c'était ?

---

## Grille d'évaluation à remplir par l'observateur

Pour chaque tâche : note de 1 à 5
- **5** = accomplie sans aucune hésitation
- **4** = accomplie avec 1-2 hésitations brèves
- **3** = accomplie après tâtonnement
- **2** = accomplie après avoir demandé de l'aide
- **1** = échec

| Tâche | Note | Bugs/blocages observés |
|---|:---:|---|
| 1. Connexion + 1er coup d'œil | / 5 | |
| 2. Trouver & ouvrir un cours | / 5 | |
| 3. Vidéo + QCM | / 5 | |
| 4. Créer flashcard manuelle | / 5 | |
| 5. Session de révision SM-2 | / 5 | |
| 6. Prosit + méthode CESI | / 5 | |
| 7. Tuteur IA | / 5 | |
| 8. Profil + récompenses | / 5 | |

**Score global** : __ / 40
**Temps total** : __ min
**Bugs non répertoriés** :
- …

---

## Pour le mémoire

Une fois les 3-5 testeurs passés, tu peux compiler dans le chapitre "Tests utilisateurs" :

1. **Tableau récap des scores** (3-5 testeurs × 8 tâches)
2. **Top 3 des blocages observés** (cohérence inter-testeurs)
3. **Top 3 des points positifs** spontanément mentionnés
4. **Citations marquantes** (verbatim)
5. **Conclusion** : ce que tu changerais en V2 post-PFE

C'est le matériau le plus solide possible pour défendre l'aspect UX devant le jury.

---

## Timing recommandé

- 1 testeur tous les 2 jours sur la dernière semaine avant dépôt
- Salle calme, pas plus de 2 personnes (testeur + observateur)
- Enregistrement audio (smartphone) pour pouvoir retranscrire les verbatims
