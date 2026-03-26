import multer from 'multer';

const ALLOWED_VIDEO = [
  'video/mp4', 'video/webm', 'video/ogg',
  'video/quicktime', 'video/x-msvideo',
];

const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp'];

const fileFilter = (_req, file, cb) => {
  const allowed = [...ALLOWED_VIDEO, ...ALLOWED_IMAGE];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non autorise : ${file.mimetype}`), false);
  }
};

// Stockage en mémoire — sera streamé vers Cloudinary
const storage = multer.memoryStorage();

// Limite : 500 MB pour les vidéos
const uploadVideo = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB — limite Cloudinary gratuit
});

export default uploadVideo;
