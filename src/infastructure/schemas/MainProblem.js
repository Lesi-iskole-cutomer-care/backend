// infastructure/schemas/MainProblem.js
import mongoose from 'mongoose';
const { Schema } = mongoose;

const mainProblemSchema = new Schema(
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

const MainProblem = mongoose.model('MainProblem', mainProblemSchema);

export default MainProblem;
