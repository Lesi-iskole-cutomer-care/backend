// api/ResponiblePerson.js
import express from "express";
import {
  createResponsiblePerson,
  getAllResponsiblePeople,
  getResponsiblePersonById,
  updateResponsiblePersonById,
  deleteResponsiblePersonById,
  getResponsiblePeopleByDepartment, // ✅ NEW
} from "../application/ResponiblePerson.js";

const router = express.Router();

// POST /api/responsiblepeople
router.post("/", createResponsiblePerson);

// GET /api/responsiblepeople
router.get("/", getAllResponsiblePeople);

// 🔹 NEW: GET /api/responsiblepeople/by-department/:departmentId
router.get("/by-department/:departmentId", getResponsiblePeopleByDepartment);

// GET /api/responsiblepeople/:id
router.get("/:id", getResponsiblePersonById);

// PUT /api/responsiblepeople/:id
router.put("/:id", updateResponsiblePersonById);

// DELETE /api/responsiblepeople/:id
router.delete("/:id", deleteResponsiblePersonById);

export default router;
