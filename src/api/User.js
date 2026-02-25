import express from "express";
import {
  createUser,
  getAllUsers,
  getAllAgents,
  getUserById,
  updateUser,
  deleteUser,
  approveUser,
  rejectUser,
  getMe,
  getPendingAgents,
  approveAgent,
  rejectAgent,
} from "../application/User.js";

import { isAuthenticated, authorizeRoles } from "./middlewares/auth.js";

const Userrouter = express.Router();

Userrouter.post("/", createUser);
Userrouter.get("/", getAllUsers);
Userrouter.get("/agents", getAllAgents);
// ✅ NEW: pending agents list (admin only)
Userrouter.get(
  "/agents/pending",
  isAuthenticated,
  authorizeRoles("admin"),
  getPendingAgents
);

// ✅ NEW: approve/reject agent (admin only)
Userrouter.put(
  "/agents/:id/approve",
  isAuthenticated,
  authorizeRoles("admin"),
  approveAgent
);

Userrouter.put(
  "/agents/:id/reject",
  isAuthenticated,
  authorizeRoles("admin"),
  rejectAgent
);
// ✅ NEW: current user (used for Pending refresh)
Userrouter.get("/me", isAuthenticated, getMe);

Userrouter.get("/:id", getUserById);
Userrouter.put("/:id", updateUser);
Userrouter.delete("/:id", deleteUser);

// ✅ NEW: admin approve/reject
Userrouter.put("/:id/approve", isAuthenticated, authorizeRoles("admin"), approveUser);
Userrouter.put("/:id/reject", isAuthenticated, authorizeRoles("admin"), rejectUser);

export default Userrouter;