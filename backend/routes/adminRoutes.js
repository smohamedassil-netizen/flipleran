import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import {
  getUsers, toggleUser, updateUser, deleteUser,
  getCourses, createCourse, updateCourse, deleteCourse,
  getStats, getProfessors,
} from '../controllers/adminController.js';

const router = express.Router();
router.use(authMiddleware, requireRole('admin'));

// Stats
router.get('/stats',       getStats);
router.get('/professors',  getProfessors);

// Users
router.get('/users',              getUsers);
router.put('/users/:id',          updateUser);
router.put('/users/:id/toggle',   toggleUser);
router.delete('/users/:id',       deleteUser);

// Courses
router.get('/courses',        getCourses);
router.post('/courses',       createCourse);
router.put('/courses/:id',    updateCourse);
router.delete('/courses/:id', deleteCourse);

export default router;
