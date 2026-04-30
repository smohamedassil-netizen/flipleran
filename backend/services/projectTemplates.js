/**
 * projectTemplates — Templates pré-remplis de phases + rubric par type
 * de projet (F8 sprint-final).
 *
 * @see Helle, Tynjälä, Olkinuora (2006). *Project-based learning in
 *      post-secondary education*. Les templates encadrent la conception
 *      tout en laissant le prof éditer librement.
 *
 * 3 types disponibles :
 *  - 'mono'   : 3 phases (cahier des charges → prototype → livraison)
 *  - 'groupe' : 5 phases (synopsis → conception → dev1 → dev2 → soutenance)
 *  - 'pfe'    : 7 phases standards d'un PFE algérien
 *
 * NB : ces templates sont une suggestion ; le prof peut tout éditer après
 * création. La structure (titre, description, weight, livrableSpec) est
 * préremplie pour gagner du temps de scénarisation.
 */

const phasesMono = [
  { titre: 'Cahier des charges', description: 'Définir le besoin, les contraintes et les critères de succès.', weight: 20, livrableSpec: { type: 'document', isRequired: true, consigne: 'Un document de 2-4 pages décrivant le périmètre.' } },
  { titre: 'Prototype', description: 'Première implémentation qui couvre les fonctionnalités essentielles.', weight: 40, livrableSpec: { type: 'demo', isRequired: true, consigne: 'Démo fonctionnelle + dépôt code.' } },
  { titre: 'Livraison finale', description: 'Version finalisée + documentation utilisateur.', weight: 40, livrableSpec: { type: 'document', isRequired: true, consigne: 'Code + README + manuel utilisateur.' } },
];

const phasesGroupe = [
  { titre: 'Synopsis', description: 'Cadrage transverse : objectifs commun aux modules concernés.', weight: 10, livrableSpec: { type: 'document', isRequired: true, consigne: 'Synopsis 1 page.' } },
  { titre: 'Conception', description: 'Architecture, modèle de données, plan d\'intégration des modules.', weight: 20, livrableSpec: { type: 'document', isRequired: true, consigne: 'Document de conception 5-10 pages avec diagrammes.' } },
  { titre: 'Itération 1', description: 'Première implémentation incrémentale (MVP).', weight: 25, livrableSpec: { type: 'demo', isRequired: true, consigne: 'Démo MVP + commit history visible.' } },
  { titre: 'Itération 2', description: 'Améliorations + intégration finale des modules.', weight: 25, livrableSpec: { type: 'demo', isRequired: true, consigne: 'Démo enrichie + tests.' } },
  { titre: 'Soutenance', description: 'Présentation orale + démo + discussion technique.', weight: 20, livrableSpec: { type: 'presentation', isRequired: true, consigne: 'Slides 15 min + démo en direct.' } },
];

const phasesPfe = [
  { titre: 'Étude bibliographique', description: 'Revue de la littérature, état de l\'art du domaine.', weight: 10, livrableSpec: { type: 'document', isRequired: true, consigne: 'Synthèse bibliographique 8-15 pages.' } },
  { titre: 'Cahier des charges fonctionnel', description: 'Spécifications fonctionnelles et non-fonctionnelles.', weight: 10, livrableSpec: { type: 'document', isRequired: true, consigne: 'CdCF complet.' } },
  { titre: 'Conception détaillée', description: 'Architecture logicielle, diagrammes UML, choix techno.', weight: 15, livrableSpec: { type: 'document', isRequired: true, consigne: 'Document de conception + diagrammes.' } },
  { titre: 'Implémentation', description: 'Codage, tests unitaires, intégration continue.', weight: 25, livrableSpec: { type: 'document', isRequired: true, consigne: 'Code source + repo Git + rapport intermédiaire.' } },
  { titre: 'Tests & validation', description: 'Tests fonctionnels, mesures de performance, retours utilisateurs.', weight: 10, livrableSpec: { type: 'document', isRequired: true, consigne: 'Cahier de tests + résultats.' } },
  { titre: 'Mémoire', description: 'Rédaction du mémoire académique (50-80 pages).', weight: 20, livrableSpec: { type: 'document', isRequired: true, consigne: 'Mémoire format université.' } },
  { titre: 'Soutenance', description: 'Présentation devant le jury + questions/réponses.', weight: 10, livrableSpec: { type: 'presentation', isRequired: true, consigne: 'Slides 25-30 min + démo.' } },
];

const rubricGenerique = [
  { criterion: 'Pertinence du sujet et de la démarche', maxPoints: 4, descriptors: [
      { level: 1, text: 'Sujet flou, démarche absente.' },
      { level: 3, text: 'Sujet clair, démarche cohérente mais peu approfondie.' },
      { level: 5, text: 'Sujet original, démarche rigoureuse, hypothèses explicitées.' },
  ] },
  { criterion: 'Qualité technique et originalité', maxPoints: 5, descriptors: [
      { level: 1, text: 'Implémentation incomplète ou copiée.' },
      { level: 3, text: 'Implémentation correcte avec choix techniques justifiés.' },
      { level: 5, text: 'Implémentation soignée, choix techniques originaux et bien documentés.' },
  ] },
  { criterion: 'Travail d\'équipe', maxPoints: 4, descriptors: [
      { level: 1, text: 'Inégalités majeures, conflits non gérés.' },
      { level: 3, text: 'Répartition globalement équitable, communication correcte.' },
      { level: 5, text: 'Synergie évidente, gestion proactive des désaccords, complémentarité des rôles.' },
  ] },
  { criterion: 'Documentation et restitution écrite', maxPoints: 4, descriptors: [
      { level: 1, text: 'Documentation absente ou incompréhensible.' },
      { level: 3, text: 'Documentation lisible mais incomplète.' },
      { level: 5, text: 'Documentation exhaustive, structurée, illustrée.' },
  ] },
  { criterion: 'Présentation orale', maxPoints: 3, descriptors: [
      { level: 1, text: 'Présentation peu claire, démo non préparée.' },
      { level: 3, text: 'Présentation claire mais perfectible.' },
      { level: 5, text: 'Présentation maîtrisée, démo fluide, réponses précises aux questions.' },
  ] },
];

/**
 * Retourne les phases template pour un type donné. Si type inconnu →
 * fallback sur phasesMono. Le résultat est cloné pour éviter les mutations.
 */
export function getPhasesTemplate(type) {
  let template;
  if (type === 'pfe')         template = phasesPfe;
  else if (type === 'groupe') template = phasesGroupe;
  else                        template = phasesMono;
  return template.map((p) => ({
    ...p,
    statut: 'a_faire',
    livrableSpec: p.livrableSpec ? { ...p.livrableSpec } : null,
  }));
}

/**
 * Rubric générique applicable à tous types. Le prof peut éditer après
 * création (PUT /api/projects/:id/rubric).
 */
export function getRubricTemplate() {
  return rubricGenerique.map((c) => ({
    criterion:   c.criterion,
    maxPoints:   c.maxPoints,
    descriptors: c.descriptors.map((d) => ({ ...d })),
  }));
}

export default { getPhasesTemplate, getRubricTemplate };
