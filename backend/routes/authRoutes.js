import express from 'express';
import multer from 'multer';
import { register, login, getMe, updateProfile, changePassword, getUserById, uploadAvatar } from '../controllers/authController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();
const avatarUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/register',      register);
router.post('/login',         login);
router.get('/me',             authMiddleware, getMe);
router.put('/profile',        authMiddleware, updateProfile);
router.put('/avatar',         authMiddleware, avatarUpload.single('avatar'), uploadAvatar);
router.put('/password',       authMiddleware, changePassword);
router.get('/user/:id',       authMiddleware, getUserById);   // Pour afficher le nom du contact

export default router;
