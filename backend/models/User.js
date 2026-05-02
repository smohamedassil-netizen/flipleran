import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    nom:       { type: String, required: true, trim: true },
    prenom:    { type: String, required: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:  { type: String, required: true, minlength: 6 },
    role:      { type: String, enum: ['etudiant', 'professeur', 'admin'], default: 'etudiant' },
    filiere:   { type: String, default: '' },
    promotion: { type: String, default: '' },
    // Semestre académique courant pour les étudiants (ex: 'S5' pour un L3 1er sem).
    // Optionnel : permet l'affichage des cours du semestre en cours uniquement.
    semestre:  { type: String, default: '', enum: ['', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'] },
    avatar:    { type: String, default: '' },
    points:    { type: Number, default: 0 },
    badges:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],
    isActive:  { type: Boolean, default: true },
    // Validation admin : pending → active → (rejected possible)
    status:    { type: String, enum: ['pending', 'active', 'rejected'], default: 'pending' },
    rejectionReason: { type: String, default: '' },
    approvedBy:{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt:{ type: Date, default: null },

    /* ─── Prosit : rotation obligatoire des rôles CESI ───────────────────
       Un étudiant doit passer par TOUS les rôles avant que le cycle se
       réinitialise. `prositRolesDoneInCycle` liste les rôles déjà occupés
       dans le cycle courant ; `prositRolesCycle` est incrémenté à chaque
       cycle complet. `prositRolesHistory` garde l'historique total. */
    prositRolesCycle:        { type: Number, default: 0 },
    prositRolesDoneInCycle:  [{ type: String, enum: ['animateur', 'secretaire', 'scribe', 'gestionnaire', 'membre'] }],
    prositRolesHistory: [{
      role:        { type: String, enum: ['animateur', 'secretaire', 'scribe', 'gestionnaire', 'membre'] },
      prositId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Prosit' },
      completedAt: { type: Date, default: Date.now },
    }],

    /* ─── Plan IA & quotas ───────────────────────────────────────────────
       FREE : limites mensuelles sur les agents IA (cf. middleware/aiQuota.js).
       PREMIUM : illimité tant que premiumUntil > now. Le plan est activé
       lorsqu'un admin approuve une RewardClaim de type abonnement FlipLearn. */
    plan:         { type: String, enum: ['free', 'premium'], default: 'free' },
    premiumUntil: { type: Date, default: null },
    aiUsage: {
      videoAnalysis:  { count: { type: Number, default: 0 }, resetAt: { type: Date, default: null } },
      moduleBot:      { count: { type: Number, default: 0 }, resetAt: { type: Date, default: null } },
      qcmGeneration:  { count: { type: Number, default: 0 }, resetAt: { type: Date, default: null } },
      deckGeneration: { count: { type: Number, default: 0 }, resetAt: { type: Date, default: null } },
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

export default mongoose.model('User', userSchema);
