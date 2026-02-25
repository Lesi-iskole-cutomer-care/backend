import bcrypt from "bcryptjs";
import User from "../infastructure/schemas/User.js";

export const createUser = async (req, res) => {
  try {
    const { name, gender, phonenumber, password, role } = req.body;

    if (!name || !gender || !phonenumber || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const userRole = role === "admin" ? "admin" : "agent";
    const hashed = await bcrypt.hash(String(password), 10);

    const user = await User.create({
      name,
      gender,
      phonenumber,
      password: hashed,
      role: userRole,
      isVerified: false,
      otpStatus: "none",
      approvalStatus: "pending",
    });

    return res.status(201).json({
      message: "User created successfully",
      user: {
        _id: user._id,
        name: user.name,
        gender: user.gender,
        phonenumber: user.phonenumber,
        role: user.role,
        isVerified: user.isVerified,
        otpStatus: user.otpStatus,
        approvalStatus: user.approvalStatus,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.phonenumber) {
      return res.status(409).json({ message: "Phone number already in use" });
    }
    console.error("createUser error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return res.status(200).json({ users });
  } catch (err) {
    console.error("getAllUsers error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllAgents = async (req, res) => {
  try {
    const agents = await User.find({ role: "agent" }).sort({ createdAt: -1 });
    return res.status(200).json({ agents });
  } catch (err) {
    console.error("getAllAgents error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json({ user });
  } catch (err) {
    console.error("getUserById error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ NEW: get current user (for pending page refresh)
export const getMe = async (req, res) => {
  try {
    return res.status(200).json({ user: req.user });
  } catch (err) {
    console.error("getMe error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, gender, phonenumber, password, role } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (gender) updateData.gender = gender;
    if (phonenumber) updateData.phonenumber = phonenumber;
    if (role && ["agent", "admin"].includes(role)) updateData.role = role;

    if (password) {
      updateData.password = await bcrypt.hash(String(password), 10);
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({ message: "User updated successfully", user: updatedUser });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.phonenumber) {
      return res.status(409).json({ message: "Phone number already in use" });
    }
    console.error("updateUser error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({ message: "User deleted successfully", user: deletedUser });
  } catch (err) {
    console.error("deleteUser error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ NEW: approve user (admin only)
export const approveUser = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await User.findByIdAndUpdate(
      id,
      { $set: { approvalStatus: "approved" } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({ message: "User approved", user: updated });
  } catch (err) {
    console.error("approveUser error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ NEW: reject user (admin only)
export const rejectUser = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await User.findByIdAndUpdate(
      id,
      { $set: { approvalStatus: "rejected" } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({ message: "User rejected", user: updated });
  } catch (err) {
    console.error("rejectUser error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ NEW: get all pending agents (admin only)
export const getPendingAgents = async (req, res) => {
  try {
    const agents = await User.find({
      role: "agent",
      approvalStatus: "pending",
    }).sort({ createdAt: -1 });

    return res.status(200).json({ agents });
  } catch (err) {
    console.error("getPendingAgents error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ NEW: approve agent (admin only)
export const approveAgent = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await User.findOneAndUpdate(
      { _id: id, role: "agent" },
      { $set: { approvalStatus: "approved" } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Agent not found" });

    return res.status(200).json({ message: "Agent approved", agent: updated });
  } catch (err) {
    console.error("approveAgent error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ NEW: reject agent (admin only)
export const rejectAgent = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await User.findOneAndUpdate(
      { _id: id, role: "agent" },
      { $set: { approvalStatus: "rejected" } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Agent not found" });

    return res.status(200).json({ message: "Agent rejected", agent: updated });
  } catch (err) {
    console.error("rejectAgent error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};