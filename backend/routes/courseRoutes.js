import express from 'express';
import { getCourses, createCourse, getCourseById, updateCourse, deleteCourse } from '../controllers/courseController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(authMiddleware);

router.route('/').get(getCourses).post(createCourse);
router.route('/:id').get(getCourseById).put(updateCourse).delete(deleteCourse);

export default router;
