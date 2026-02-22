import bcrypt from "bcryptjs";
import User from "../infastructure/schemas/User.js";

// ✅ Create new user
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
    });

    return res.status(201).json({
      message: "User created successfully",
      user: {
        _id: user._id,
        name: user.name,
        gender: user.gender,
        phonenumber: user.phonenumber,
        role: user.role,
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

// ✅ Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return res.status(200).json({ users });
  } catch (err) {
    console.error("getAllUsers error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Get all AGENTS only
export const getAllAgents = async (req, res) => {
  try {
    const agents = await User.find({ role: "agent" }).sort({ createdAt: -1 });
    return res.status(200).json({ agents });
  } catch (err) {
    console.error("getAllAgents error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Get user by ID
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

// ✅ Update user
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

    return res.status(200).json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.phonenumber) {
      return res.status(409).json({ message: "Phone number already in use" });
    }
    console.error("updateUser error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({
      message: "User deleted successfully",
      user: deletedUser,
    });
  } catch (err) {
    console.error("deleteUser error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
