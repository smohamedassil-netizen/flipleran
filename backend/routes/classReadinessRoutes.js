import express from 'express';
import { getClassReadiness, remindStudents, getTopBlocages } from '../controllers/classReadinessController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';

const router = express.Router();
router.use(authMiddleware);
router.use(requireRole('professeur', 'admin'));

router.get('/:courseId',                getClassReadiness);
router.post('/:courseId/remind',        remindStudents);
router.get('/:courseId/top-blocages',   getTopBlocages);

export default router;
