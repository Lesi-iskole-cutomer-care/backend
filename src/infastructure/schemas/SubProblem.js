// infastructure/schemas/SubProblem.js
import mongoose from 'mongoose';
const { Schema } = mongoose;

const subProblemSchema = new Schema(
  {
    // Reference to MainProblem document
    name: {
      type: String,
      required: true,
      trim: true,
    },
    
    mainProblem: {
      type: Schema.Types.ObjectId,
      ref: 'MainProblem',
      required: true,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

const SubProblem = mongoose.model('SubProblem', subProblemSchema);

export default SubProblem;

