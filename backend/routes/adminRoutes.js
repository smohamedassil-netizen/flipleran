import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import requireRole from '../middleware/roleMiddleware.js';
import {
  getUsers, toggleUser, updateUser, deleteUser,
  getAllCoursesWithStats, createCourse, updateCourse, deleteCourse,
  getStats, getProfessors,
  getRecentMessages, getActivity, createUser,
  seedL3IsilEndpoint,
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
router.get('/courses',        getAllCoursesWithStats);
router.post('/courses',       createCourse);
router.put('/courses/:id',    updateCourse);
router.delete('/courses/:id', deleteCourse);

// Seed L3 ISIL (one-shot, idempotent) — crée profs, étudiants et modules de démo
router.post('/seed/l3-isil',  seedL3IsilEndpoint);

export default router;
