// application/Department.js
import Department from '../infastructure/schemas/Department.js';

// ✅ Create Department
export const createDepartment = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const department = new Department({ name });
    await department.save();

    return res.status(201).json({
      message: 'Department created successfully',
      department,
    });
  } catch (err) {
    console.error('createDepartment error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ✅ Get All Departments
export const getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.find().sort({ createdAt: -1 });
    return res.status(200).json({ departments });
  } catch (err) {
    console.error('getAllDepartments error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ✅ Get Department by Mongo _id
export const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    return res.status(200).json({ department });
  } catch (err) {
    console.error('getDepartmentById error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ✅ Update Department by Mongo _id
export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const updatedDepartment = await Department.findByIdAndUpdate(
      id,
      { name },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedDepartment) {
      return res.status(404).json({ message: 'Department not found' });
    }

    return res.status(200).json({
      message: 'Department updated successfully',
      department: updatedDepartment,
    });
  } catch (err) {
    console.error('updateDepartment error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ✅ Delete Department by Mongo _id
export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedDepartment = await Department.findByIdAndDelete(id);

    if (!deletedDepartment) {
      return res.status(404).json({ message: 'Department not found' });
    }

    return res.status(200).json({
      message: 'Department deleted successfully',
    });
  } catch (err) {
    console.error('deleteDepartment error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
