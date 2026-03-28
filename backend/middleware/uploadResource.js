import multer from 'multer';

const ALLOWED_MIME = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
  'application/x-zip-compressed',
];

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

const uploadResource = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé. Formats acceptés : PDF, PPTX, DOCX, ZIP.'));
    }
  },
});

// Upload étendu pour les livrables de projets (inclut vidéos)
const LIVRABLE_MIME = [
  ...ALLOWED_MIME,
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'image/png',
  'image/jpeg',
  'image/gif',
];

export const uploadLivrable = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 100 * 1024 * 1024 }, // 100 MB pour les vidéos
  fileFilter: (_req, file, cb) => {
    if (LIVRABLE_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé. Formats acceptés : PDF, PPTX, DOCX, ZIP, MP4, WebM, PNG, JPG.'));
    }
  },
});

export default uploadResource;
