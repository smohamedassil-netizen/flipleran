import mongoose from 'mongoose';

const conversationMessageSchema = new mongoose.Schema({
  from:     { type: String, enum: ['user', 'admin'], required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message:  { type: String, required: true },
  createdAt:{ type: Date, default: Date.now },
}, { _id: true });

const supportTicketSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  nom:        { type: String, required: true },
  email:      { type: String, required: true },
  objet:      { type: String, required: true },
  message:    { type: String, required: true },
  status:     { type: String, enum: ['pending', 'accepted', 'resolved', 'closed'], default: 'pending' },
  priority:   { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  category:   { type: String, enum: ['technique', 'pedagogique', 'compte', 'autre'], default: 'autre' },
  acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  acceptedAt: { type: Date, default: null },
  resolvedAt: { type: Date, default: null },
  response:   { type: String, default: '' },
  conversation: [conversationMessageSchema],
}, { timestamps: true });

supportTicketSchema.index({ userId: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, priority: 1 });

export default mongoose.model('SupportTicket', supportTicketSchema);
