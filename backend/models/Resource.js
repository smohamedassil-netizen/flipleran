import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema(
  {
    titre:       { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    courseId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    uploadedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
    type:        { type: String, enum: ['pdf', 'pptx', 'docx', 'zip', 'autre'], default: 'pdf' },
    url:         { type: String, required: true },
    publicId:    { type: String, default: '' },
    size:        { type: Number, default: 0 },   // octets
  },
  { timestamps: true }
);

resourceSchema.index({ courseId: 1, createdAt: -1 });

export default mongoose.model('Resource', resourceSchema);
