import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    senderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },   // null pour les messages bot
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    roomId:     { type: String, required: true },
    content:    { type: String, required: true },
    type:       { type: String, enum: ['text', 'bot'], default: 'text' },
    priority:   { type: String, enum: ['normal', 'urgent'], default: 'normal' },
    senderName: { type: String },  // Nom d'affichage pour les messages non-utilisateurs
  },
  { timestamps: true }
);

messageSchema.index({ roomId: 1, createdAt: 1 });

export default mongoose.model('Message', messageSchema);
