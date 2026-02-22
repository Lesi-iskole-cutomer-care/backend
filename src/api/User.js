import express from "express";
import {
  createUser,
  getAllUsers,
  getAllAgents,
  getUserById,
  updateUser,
  deleteUser,
} from "../application/User.js";

const Userrouter = express.Router();

// POST /api/user
Userrouter.post("/", createUser);

// GET /api/user
Userrouter.get("/", getAllUsers);

// GET /api/user/agents
Userrouter.get("/agents", getAllAgents);

// GET /api/user/:id
Userrouter.get("/:id", getUserById);

// PUT /api/user/:id
Userrouter.put("/:id", updateUser);

// DELETE /api/user/:id
Userrouter.delete("/:id", deleteUser);

export default Userrouter;
