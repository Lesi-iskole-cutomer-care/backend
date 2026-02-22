// application/MainProblem.js
import MainProblem from "../infastructure/schemas/MainProblem.js";
import SubProblem from "../infastructure/schemas/SubProblem.js";

// ✅ Create MainProblem
// Body: { "name": "Delivery Issue" }
export const createMainProblem = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const mainProblem = new MainProblem({ name });
    await mainProblem.save();

    return res.status(201).json(mainProblem);
  } catch (err) {
    console.error("createMainProblem error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Get ALL MainProblems
export const getAllMainProblems = async (req, res) => {
  try {
    const mainProblems = await MainProblem.find().sort({ createdAt: -1 });
    return res.status(200).json({ mainProblems });
  } catch (err) {
    console.error("getAllMainProblems error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Get MainProblem by ID
export const getMainProblemById = async (req, res) => {
  try {
    const { id } = req.params;
    const mainProblem = await MainProblem.findById(id);

    if (!mainProblem) {
      return res.status(404).json({ message: "MainProblem not found" });
    }

    return res.status(200).json({ mainProblem });
  } catch (err) {
    console.error("getMainProblemById error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Update MainProblem (name only)
export const updateMainProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const updated = await MainProblem.findByIdAndUpdate(
      id,
      { name },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "MainProblem not found" });
    }

    return res.status(200).json(updated);
  } catch (err) {
    console.error("updateMainProblem error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Delete MainProblem + ALL related SubProblems
export const deleteMainProblem = async (req, res) => {
  try {
    const { id } = req.params;

    const mainProblem = await MainProblem.findById(id);
    if (!mainProblem) {
      return res.status(404).json({ message: "MainProblem not found" });
    }

    // delete all its sub problems
    await SubProblem.deleteMany({ mainProblem: id });

    await MainProblem.findByIdAndDelete(id);

    return res.status(200).json({
      message: "MainProblem and all related SubProblems deleted successfully",
    });
  } catch (err) {
    console.error("deleteMainProblem error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
