import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import uploadResource  from '../middleware/uploadResource.js';
import { uploadResource as upload, getResourcesByCourse, deleteResource } from '../controllers/resourceController.js';

const router = express.Router();
router.use(authMiddleware);

router.post('/upload',
  requireRole('professeur', 'admin'),
  uploadResource.single('file'),
  upload
);
router.get('/course/:courseId', getResourcesByCourse);
router.delete('/:id',          requireRole('professeur', 'admin'), deleteResource);

export default router;
