// application/SubProblem.js
import SubProblem from "../infastructure/schemas/SubProblem.js";
import MainProblem from "../infastructure/schemas/MainProblem.js";

// ✅ Create SubProblem
// Body: { "mainProblemId": "<MainProblem _id>", "name": "3,4,5 Maths" }
export const createSubProblem = async (req, res) => {
  try {
    const { mainProblemId, name } = req.body;

    if (!mainProblemId || !name) {
      return res
        .status(400)
        .json({ message: "mainProblemId and name are required" });
    }

    // Ensure main problem exists
    const mainProblem = await MainProblem.findById(mainProblemId);
    if (!mainProblem) {
      return res.status(404).json({ message: "MainProblem not found" });
    }

    const subProblem = new SubProblem({
      mainProblem: mainProblemId,
      name,
    });

    await subProblem.save();

    return res.status(201).json({
      message: "SubProblem created successfully",
      subProblem,
    });
  } catch (err) {
    console.error("createSubProblem error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Get ALL SubProblems (for all main problems)
export const getAllSubProblems = async (req, res) => {
  try {
    const subProblems = await SubProblem.find()
      .populate("mainProblem", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({ subProblems });
  } catch (err) {
    console.error("getAllSubProblems error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Get ALL SubProblems by MainProblem ID
// GET /api/subproblems/by-main/:mainProblemId
export const getSubProblemsByMainProblemId = async (req, res) => {
  try {
    const { mainProblemId } = req.params;

    const mainProblem = await MainProblem.findById(mainProblemId);
    if (!mainProblem) {
      return res.status(404).json({ message: "MainProblem not found" });
    }

    const subProblems = await SubProblem.find({ mainProblem: mainProblemId })
      .populate("mainProblem", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      mainProblem,
      subProblems,
    });
  } catch (err) {
    console.error("getSubProblemsByMainProblemId error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Update SubProblem by its own _id
// PUT /api/subproblems/:id
export const updateSubProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mainProblemId } = req.body;

    const updateData = {};
    if (name) updateData.name = name;

    if (mainProblemId) {
      const mainProblem = await MainProblem.findById(mainProblemId);
      if (!mainProblem) {
        return res.status(404).json({ message: "MainProblem not found" });
      }
      updateData.mainProblem = mainProblemId;
    }

    const updatedSubProblem = await SubProblem.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    ).populate("mainProblem", "name");

    if (!updatedSubProblem) {
      return res.status(404).json({ message: "SubProblem not found" });
    }

    return res.status(200).json({
      message: "SubProblem updated successfully",
      subProblem: updatedSubProblem,
    });
  } catch (err) {
    console.error("updateSubProblem error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Delete ONE SubProblem by _id
// DELETE /api/subproblems/:id
export const deleteSubProblem = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await SubProblem.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "SubProblem not found" });
    }

    return res
      .status(200)
      .json({ message: "SubProblem deleted successfully", subProblem: deleted });
  } catch (err) {
    console.error("deleteSubProblem error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
