import express from 'express';
import multer from 'multer';
import {
  register, login, getMe, updateProfile, changePassword, getUserById,
  uploadAvatar, listPendingUsers, approveUser, rejectUser, checkStatus,
} from '../controllers/authController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';

const router = express.Router();
const avatarUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/register',      register);
router.post('/login',         login);
router.get('/status',         checkStatus);                    // public : ?email=...
router.get('/me',             authMiddleware, getMe);
router.put('/profile',        authMiddleware, updateProfile);
router.put('/avatar',         authMiddleware, avatarUpload.single('avatar'), uploadAvatar);
router.put('/password',       authMiddleware, changePassword);
router.get('/user/:id',       authMiddleware, getUserById);

// Admin : validation des inscriptions
router.get('/pending',                authMiddleware, requireRole('admin'), listPendingUsers);
router.put('/users/:id/approve',      authMiddleware, requireRole('admin'), approveUser);
router.put('/users/:id/reject',       authMiddleware, requireRole('admin'), rejectUser);

export default router;
