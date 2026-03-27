import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  nom:        { type: String, required: true },
  email:      { type: String, required: true },
  objet:      { type: String, required: true },
  message:    { type: String, required: true },
  status:     { type: String, enum: ['pending', 'accepted', 'resolved'], default: 'pending' },
  acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  acceptedAt: { type: Date, default: null },
  response:   { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('SupportTicket', supportTicketSchema);
