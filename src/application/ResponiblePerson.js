// src/application/ResponiblePerson.js
import ResponsiblePerson from "../infastructure/schemas/ResponiblePerson.js";

// CREATE
export const createResponsiblePerson = async (req, res) => {
  try {
    const { name, department } = req.body;

    if (!name || !department) {
      return res.status(400).json({ message: "Name & Department required" });
    }

    // department MUST be a valid ObjectId string here
    const person = new ResponsiblePerson({ name, department });
    await person.save();

    // ✅ populate department name before sending back
    await person.populate("department", "name");

    return res.status(201).json(person);
  } catch (err) {
    console.error("createResponsiblePerson error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET ALL
export const getAllResponsiblePeople = async (req, res) => {
  try {
    const people = await ResponsiblePerson.find()
      .populate("department", "name")        // ✅ get department object with name
      .sort({ createdAt: -1 });

    return res.status(200).json(people);
  } catch (err) {
    console.error("getAllResponsiblePeople error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET BY ID
export const getResponsiblePersonById = async (req, res) => {
  try {
    const person = await ResponsiblePerson.findById(req.params.id).populate(
      "department",
      "name"
    );

    if (!person) {
      return res.status(404).json({ message: "Responsible person not found" });
    }

    return res.status(200).json(person);
  } catch (err) {
    console.error("getResponsiblePersonById error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// UPDATE
export const updateResponsiblePersonById = async (req, res) => {
  try {
    const { name, department } = req.body;

    const updated = await ResponsiblePerson.findByIdAndUpdate(
      req.params.id,
      { name, department },
      { new: true, runValidators: true }
    ).populate("department", "name");  // ✅ populate in response

    if (!updated) {
      return res.status(404).json({ message: "Responsible person not found" });
    }

    return res.status(200).json(updated);
  } catch (err) {
    console.error("updateResponsiblePersonById error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// DELETE
export const deleteResponsiblePersonById = async (req, res) => {
  try {
    const deleted = await ResponsiblePerson.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Responsible person not found" });
    }

    return res.status(200).json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("deleteResponsiblePersonById error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getResponsiblePeopleByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    if (!departmentId) {
      return res.status(400).json({ message: "departmentId is required" });
    }

    const people = await ResponsiblePerson.find({
      department: departmentId,
    })
      .populate("department", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json(people);
  } catch (err) {
    console.error("getResponsiblePeopleByDepartment error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};