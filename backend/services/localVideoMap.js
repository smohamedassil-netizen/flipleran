/**
 * localVideoMap.js — Mapping entre chaque vidéo logique (filière/cours/titre)
 * et son nom de fichier attendu dans `backend/public/videos/`.
 *
 * Le nom de fichier correspond à la colonne "Fichier attendu" du README.
 * Si le fichier est présent sur le disque, le seed utilise l'URL locale
 * (ex: http://host/videos/isil-l1-algo-01.mp4) — sinon fallback sur sample Google.
 */

// Clé : `${courseTitre}|${videoTitre}` → valeur : nom de fichier (sans chemin)
export const VIDEO_FILE_MAP = {
  // ISIL L1
  "Algorithmique & Programmation|Qu'est-ce qu'un algorithme ?":      'isil-l1-algo-01.mp4',
  "Algorithmique & Programmation|Les variables et types de données": 'isil-l1-algo-02.mp4',
  "Algorithmique & Programmation|Boucles et conditions":             'isil-l1-algo-03.mp4',
  "Bases de Python|Installer Python + 1er script":                   'isil-l1-python-01.mp4',
  "Bases de Python|Types et opérations":                             'isil-l1-python-02.mp4',
  "Bases de Python|Fonctions Python":                                'isil-l1-python-03.mp4',
  "Mathématiques pour l'informatique|Logique des propositions":      'isil-l1-math-01.mp4',
  "Mathématiques pour l'informatique|Théorie des ensembles":         'isil-l1-math-02.mp4',

  // ISIL L2
  'Structures de données|Listes chaînées':        'isil-l2-struct-01.mp4',
  'Structures de données|Piles et files':         'isil-l2-struct-02.mp4',
  'Structures de données|Arbres binaires':        'isil-l2-struct-03.mp4',
  'POO en Java|Classes et objets':                'isil-l2-java-01.mp4',
  'POO en Java|Héritage en Java':                 'isil-l2-java-02.mp4',
  'Bases de données SQL|Introduction SQL':        'isil-l2-sql-01.mp4',
  'Bases de données SQL|SELECT, JOIN, WHERE':     'isil-l2-sql-02.mp4',

  // ISIL L3
  'Développement Web Full-Stack|HTML & CSS essentiels':                   'isil-l3-web-01.mp4',
  'Développement Web Full-Stack|JavaScript moderne':                      'isil-l3-web-02.mp4',
  'Développement Web Full-Stack|Introduction à React':                    'isil-l3-web-03.mp4',
  "Intelligence Artificielle & Machine Learning|Qu'est-ce que le ML ?":   'isil-l3-ia-01.mp4',
  'Intelligence Artificielle & Machine Learning|Régression linéaire expliquée':    'isil-l3-ia-02.mp4',
  'Intelligence Artificielle & Machine Learning|Introduction aux réseaux de neurones': 'isil-l3-ia-03.mp4',
  'Cybersécurité|Les bases de la cybersécurité':   'isil-l3-cyber-01.mp4',
  'Cybersécurité|Attaques par phishing':          'isil-l3-cyber-02.mp4',

  // Management L1
  'Introduction au Management|Les 4 fonctions du management':        'manage-l1-intro-01.mp4',
  'Introduction au Management|Théories classiques (Taylor, Fayol)':  'manage-l1-intro-02.mp4',
  'Économie générale|Offre et demande':                              'manage-l1-eco-01.mp4',
  'Économie générale|Inflation et chômage':                          'manage-l1-eco-02.mp4',
  'Marketing fondamentaux|Les 4P du marketing':                      'manage-l1-marketing-01.mp4',
  'Marketing fondamentaux|Segmentation client':                      'manage-l1-marketing-02.mp4',

  // Management L2
  'Management stratégique|Analyse SWOT':                 'manage-l2-strat-01.mp4',
  'Management stratégique|Les 5 forces de Porter':       'manage-l2-strat-02.mp4',
  'Gestion des ressources humaines|La pyramide de Maslow':     'manage-l2-rh-01.mp4',
  'Gestion des ressources humaines|Styles de leadership':      'manage-l2-rh-02.mp4',
  'Droit des affaires|SARL vs SA en Algérie':            'manage-l2-droit-01.mp4',

  // Management L3
  'Management de projet|Introduction à Scrum':     'manage-l3-pm-01.mp4',
  'Management de projet|Diagramme de Gantt':       'manage-l3-pm-02.mp4',
  'Entrepreneuriat|Business Model Canvas':         'manage-l3-entre-01.mp4',
  'Entrepreneuriat|Pitcher son projet':            'manage-l3-entre-02.mp4',
  'Stratégie digitale|SEO : les bases':            'manage-l3-digital-01.mp4',

  // Finance L1
  'Comptabilité générale|Le bilan comptable expliqué':       'finance-l1-compta-01.mp4',
  "Comptabilité générale|Comptes d'actif et de passif":      'finance-l1-compta-02.mp4',
  'Mathématiques financières|Intérêts simples vs composés':  'finance-l1-math-01.mp4',
  'Mathématiques financières|Actualisation et VAN':          'finance-l1-math-02.mp4',
  "Introduction à la finance|Qu'est-ce que la bourse ?":     'finance-l1-intro-01.mp4',

  // Finance L2
  'Analyse financière|Les ratios de liquidité':  'finance-l2-analyse-01.mp4',
  'Analyse financière|Le fonds de roulement':    'finance-l2-analyse-02.mp4',
  'Comptabilité analytique|Coûts fixes vs variables':  'finance-l2-analyt-01.mp4',
  'Comptabilité analytique|Méthode ABC':               'finance-l2-analyt-02.mp4',
  'Contrôle de gestion|Construire un budget':          'finance-l2-control-01.mp4',

  // Finance L3
  "Audit financier|Introduction à l'audit":     'finance-l3-audit-01.mp4',
  'Audit financier|Cartographie des risques':    'finance-l3-audit-02.mp4',
  'Finance internationale|Les marchés de change (FOREX)': 'finance-l3-int-01.mp4',
  'Finance internationale|Les normes IFRS':               'finance-l3-int-02.mp4',
  'Finance de marché|Comment évaluer une action ?':       'finance-l3-market-01.mp4',
  'Finance de marché|Les options expliquées':             'finance-l3-market-02.mp4',
};

export function getLocalFileFor(courseTitre, videoTitre) {
  return VIDEO_FILE_MAP[`${courseTitre}|${videoTitre}`] || null;
}
