import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import {
  listChapters, createChapter, updateChapter, deleteChapter,
  assignVideo, getChapterPractice,
} from '../controllers/chapterController.js';

const router = express.Router({ mergeParams: true });
router.use(authMiddleware);

/* Routes nichées sous /api/courses/:courseId/chapters (cf. server.js) */
router.get('/',  listChapters);
router.post('/', requireRole('professeur', 'admin'), createChapter);

export default router;

/* Routes top-level /api/chapters/:id/... (montées séparément dans server.js) */
export const chapterStandaloneRouter = express.Router();
chapterStandaloneRouter.use(authMiddleware);

chapterStandaloneRouter.put('/:id',                requireRole('professeur', 'admin'), updateChapter);
chapterStandaloneRouter.delete('/:id',             requireRole('professeur', 'admin'), deleteChapter);
chapterStandaloneRouter.post('/:id/assign-video',  requireRole('professeur', 'admin'), assignVideo);
chapterStandaloneRouter.get('/:id/practice',       getChapterPractice);
