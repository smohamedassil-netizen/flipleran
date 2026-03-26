import express from 'express';
import { register, login, getMe, updateProfile, changePassword, getUserById } from '../controllers/authController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register',      register);
router.post('/login',         login);
router.get('/me',             authMiddleware, getMe);
router.put('/profile',        authMiddleware, updateProfile);
router.put('/password',       authMiddleware, changePassword);
router.get('/user/:id',       authMiddleware, getUserById);   // Pour afficher le nom du contact

export default router;
