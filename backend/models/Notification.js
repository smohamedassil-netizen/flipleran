import mongoose from 'mongoose';

/**
 * Notification persistée en BD.
 * Types :
 *  - reminder_qcm      : rappel QCM non complété avant deadline
 *  - reminder_video    : rappel vidéo non regardée avant deadline
 *  - reminder_project  : rappel phase/livrable projet
 *  - ticket_update     : mise à jour d'un ticket support
 *  - project_status    : changement de statut d'un projet
 *  - message           : nouveau message chat
 *  - info / success / warning / urgent : notifications libres
 */
const notificationSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type:      { type: String, required: true, default: 'info' },
    title:     { type: String, default: '' },
    message:   { type: String, required: true },
    link:      { type: String, default: null },
    priority:  { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    read:      { type: Boolean, default: false, index: true },
    // Références optionnelles vers la ressource concernée
    relatedType: { type: String, enum: ['qcm', 'video', 'project', 'ticket', 'course', null], default: null },
    relatedId:   { type: mongoose.Schema.Types.ObjectId, default: null },
    // Clé de dédoublonnage pour les rappels cron (ex: `qcm_<qcmId>_<userId>_<YYYYMMDD>`)
    dedupKey:  { type: String, default: null, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ dedupKey: 1 }, { unique: true, sparse: true });

export default mongoose.model('Notification', notificationSchema);
