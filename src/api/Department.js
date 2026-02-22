// api/Department.js
import express from 'express';
import {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,        // ✅ add this
} from '../application/Department.js';

const router = express.Router();

// POST /api/departments        -> create department
router.post('/', createDepartment);

// GET /api/departments         -> get all departments
router.get('/', getAllDepartments);

// GET /api/departments/:id     -> get department by Mongo _id
router.get('/:id', getDepartmentById);

// PUT /api/departments/:id     -> update department by Mongo _id
router.put('/:id', updateDepartment);

// ✅ DELETE /api/departments/:id -> delete department by Mongo _id
router.delete('/:id', deleteDepartment);

export default router;
