// api/SubProblem.js
import express from "express";
import {
  createSubProblem,
  updateSubProblem,
  getAllSubProblems,
  getSubProblemsByMainProblemId,
  deleteSubProblem,
} from "../application/SubProblem.js";

const router = express.Router();

// POST /api/subproblems             -> create sub-problem
router.post("/", createSubProblem);

// GET /api/subproblems              -> get all sub-problems
router.get("/", getAllSubProblems);

// GET /api/subproblems/by-main/:mainProblemId  -> get sub-problems for one main problem
router.get("/by-main/:mainProblemId", getSubProblemsByMainProblemId);

// PUT /api/subproblems/:id          -> update sub-problem by its _id
router.put("/:id", updateSubProblem);

// ✅ DELETE /api/subproblems/:id     -> delete one sub-problem
router.delete("/:id", deleteSubProblem);

export default router;
