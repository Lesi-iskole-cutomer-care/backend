// infastructure/schemas/Department.js
import mongoose from 'mongoose';
const { Schema } = mongoose;

const departmentSchema = new Schema(
  {
    // Only name field – no custom Id
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true, // adds createdAt, updatedAt
  }
);

const Department = mongoose.model('Department', departmentSchema);

export default Department;
