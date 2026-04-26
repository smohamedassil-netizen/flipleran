/**
 * usersSeed.js — Crée des utilisateurs de test couvrant TOUTES les combinaisons
 * filière × promotion, pour permettre de tester l'isolation par filière.
 *
 * Règle métier école : 1 prof = 1 filière + 1 promotion.
 *
 * Crée :
 *   - 1 admin
 *   - 9 professeurs (3 filières × 3 promotions)
 *   - 9 étudiants (ISIL/Management/Finance × L1/L2/L3)
 *
 * Tous avec status='active' et isActive=true pour un accès immédiat.
 * Mot de passe commun : "test1234" (simple pour démo)
 *
 * Idempotent : skip si email existe déjà (pas d'écrasement).
 */

import User from '../models/User.js';

const PASSWORD = 'test1234';

const USERS = [
  // ═════════════ Admin ═════════════
  {
    email: 'admin@fliplearn.dz',
    password: 'admin1234',
    nom: 'Administrateur',
    prenom: 'Super',
    role: 'admin',
    filiere: '',
    promotion: '',
  },

  // ═════════════ Professeurs (1 par filière × promotion) ═════════════
  // ISIL
  { email: 'karim.isil.l1@fliplearn.dz',    password: PASSWORD, nom: 'Benali',   prenom: 'Karim',   role: 'professeur', filiere: 'ISIL',                    promotion: 'L1' },
  { email: 'leila.isil.l2@fliplearn.dz',    password: PASSWORD, nom: 'Zidane',   prenom: 'Leila',   role: 'professeur', filiere: 'ISIL',                    promotion: 'L2' },
  { email: 'omar.isil.l3@fliplearn.dz',     password: PASSWORD, nom: 'Saadi',    prenom: 'Omar',    role: 'professeur', filiere: 'ISIL',                    promotion: 'L3' },
  // Management
  { email: 'sara.manage.l1@fliplearn.dz',   password: PASSWORD, nom: 'Meziane',  prenom: 'Sara',    role: 'professeur', filiere: 'Management',              promotion: 'L1' },
  { email: 'riad.manage.l2@fliplearn.dz',   password: PASSWORD, nom: 'Kaci',     prenom: 'Riad',    role: 'professeur', filiere: 'Management',              promotion: 'L2' },
  { email: 'fatima.manage.l3@fliplearn.dz', password: PASSWORD, nom: 'Bouzid',   prenom: 'Fatima',  role: 'professeur', filiere: 'Management',              promotion: 'L3' },
  // Finance & Comptabilité
  { email: 'hakim.finance.l1@fliplearn.dz', password: PASSWORD, nom: 'Khaldi',   prenom: 'Hakim',   role: 'professeur', filiere: 'Finance & Comptabilité',  promotion: 'L1' },
  { email: 'sonia.finance.l2@fliplearn.dz', password: PASSWORD, nom: 'Tamazirt', prenom: 'Sonia',   role: 'professeur', filiere: 'Finance & Comptabilité',  promotion: 'L2' },
  { email: 'nabil.finance.l3@fliplearn.dz', password: PASSWORD, nom: 'Berrezoug',prenom: 'Nabil',   role: 'professeur', filiere: 'Finance & Comptabilité',  promotion: 'L3' },

  // ═════════════ Étudiants ISIL ═════════════
  {
    email: 'amine.isil.l1@fliplearn.dz',
    password: PASSWORD,
    nom: 'Hamidi',
    prenom: 'Amine',
    role: 'etudiant',
    filiere: 'ISIL',
    promotion: 'L1',
  },
  {
    email: 'ines.isil.l2@fliplearn.dz',
    password: PASSWORD,
    nom: 'Boumediene',
    prenom: 'Inès',
    role: 'etudiant',
    filiere: 'ISIL',
    promotion: 'L2',
  },
  {
    email: 'assil.isil.l3@fliplearn.dz',
    password: PASSWORD,
    nom: 'Seray',
    prenom: 'Assil',
    role: 'etudiant',
    filiere: 'ISIL',
    promotion: 'L3',
  },

  // ═════════════ Étudiants Management ═════════════
  {
    email: 'yasmine.manage.l1@fliplearn.dz',
    password: PASSWORD,
    nom: 'Rahmani',
    prenom: 'Yasmine',
    role: 'etudiant',
    filiere: 'Management',
    promotion: 'L1',
  },
  {
    email: 'mehdi.manage.l2@fliplearn.dz',
    password: PASSWORD,
    nom: 'Belkacem',
    prenom: 'Mehdi',
    role: 'etudiant',
    filiere: 'Management',
    promotion: 'L2',
  },
  {
    email: 'nadia.manage.l3@fliplearn.dz',
    password: PASSWORD,
    nom: 'Ouali',
    prenom: 'Nadia',
    role: 'etudiant',
    filiere: 'Management',
    promotion: 'L3',
  },

  // ═════════════ Étudiants Finance & Comptabilité ═════════════
  {
    email: 'sofiane.finance.l1@fliplearn.dz',
    password: PASSWORD,
    nom: 'Haddad',
    prenom: 'Sofiane',
    role: 'etudiant',
    filiere: 'Finance & Comptabilité',
    promotion: 'L1',
  },
  {
    email: 'amira.finance.l2@fliplearn.dz',
    password: PASSWORD,
    nom: 'Bouazza',
    prenom: 'Amira',
    role: 'etudiant',
    filiere: 'Finance & Comptabilité',
    promotion: 'L2',
  },
  {
    email: 'walid.finance.l3@fliplearn.dz',
    password: PASSWORD,
    nom: 'Zerrouki',
    prenom: 'Walid',
    role: 'etudiant',
    filiere: 'Finance & Comptabilité',
    promotion: 'L3',
  },
];

export async function seedUsers() {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const u of USERS) {
    const existing = await User.findOne({ email: u.email });

    if (existing) {
      // Si l'user existe mais a un status différent de 'active', on l'active
      // (cas des anciens comptes créés avec status=pending par défaut)
      let needUpdate = false;
      if (existing.status !== 'active') {
        existing.status = 'active';
        needUpdate = true;
      }
      if (existing.isActive === false) {
        existing.isActive = true;
        needUpdate = true;
      }
      // Si filiere/promotion vides (ancien seed) on complète
      if (!existing.filiere && u.filiere) {
        existing.filiere = u.filiere;
        needUpdate = true;
      }
      if (!existing.promotion && u.promotion) {
        existing.promotion = u.promotion;
        needUpdate = true;
      }
      if (needUpdate) {
        await existing.save();
        updated++;
      } else {
        skipped++;
      }
      continue;
    }

    // Nouveau user : utilise le model (pre-save hash le password)
    const user = new User({
      nom: u.nom,
      prenom: u.prenom,
      email: u.email,
      password: u.password,
      role: u.role,
      filiere: u.filiere || '',
      promotion: u.promotion || '',
      status: 'active',
      isActive: true,
      points: 0,
    });
    await user.save();
    created++;
  }

  console.log(`[usersSeed] ${created} utilisateurs créés, ${updated} mis à jour, ${skipped} déjà à jour.`);
  return { created, updated, skipped };
}
