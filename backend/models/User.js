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
    avatar:    { type: String, default: '' },
    points:    { type: Number, default: 0 },
    badges:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],
    isActive:  { type: Boolean, default: true },
    // Validation admin : pending → active → (rejected possible)
    status:    { type: String, enum: ['pending', 'active', 'rejected'], default: 'pending' },
    rejectionReason: { type: String, default: '' },
    approvedBy:{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt:{ type: Date, default: null },
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
