import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import {
  getUsers, toggleUser, updateUser, deleteUser,
  getCourses, createCourse, updateCourse, deleteCourse,
  getStats, getProfessors,
  getRecentMessages, getActivity, createUser,
} from '../controllers/adminController.js';

const router = express.Router();
router.use(authMiddleware, requireRole('admin'));

// Stats
router.get('/stats',       getStats);
router.get('/professors',  getProfessors);

// Users
router.get('/users',              getUsers);
router.post('/users',             createUser);
router.put('/users/:id',          updateUser);
router.put('/users/:id/toggle',   toggleUser);
router.delete('/users/:id',       deleteUser);

// Messages & Activity
router.get('/messages', getRecentMessages);
router.get('/activity', getActivity);

// Courses
router.get('/courses',        getCourses);
router.post('/courses',       createCourse);
router.put('/courses/:id',    updateCourse);
router.delete('/courses/:id', deleteCourse);

export default router;
