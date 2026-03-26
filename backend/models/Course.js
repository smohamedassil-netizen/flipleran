import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    titre:       { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    professorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    filiere:     { type: String, required: true },
    promotion:   { type: String, required: true },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Course', courseSchema);
