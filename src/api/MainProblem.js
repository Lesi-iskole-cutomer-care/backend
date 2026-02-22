// api/MainProblem.js
import express from "express";
import {
  createMainProblem,
  getAllMainProblems,
  getMainProblemById,
  updateMainProblem,
  deleteMainProblem,
} from "../application/MainProblem.js";

const router = express.Router();

// POST /api/mainproblems
router.post("/", createMainProblem);

// GET /api/mainproblems
router.get("/", getAllMainProblems);

// GET /api/mainproblems/:id
router.get("/:id", getMainProblemById);

// PUT /api/mainproblems/:id
router.put("/:id", updateMainProblem);

// DELETE /api/mainproblems/:id
router.delete("/:id", deleteMainProblem);

export default router;
