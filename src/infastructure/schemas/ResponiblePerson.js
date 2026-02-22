// infastructure/schemas/ResponsiblePerson.js
import mongoose from 'mongoose';
const { Schema } = mongoose;

const responsiblePersonSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },

    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
  },
  { timestamps: true }
);

const ResponsiblePerson = mongoose.model('ResponsiblePerson', responsiblePersonSchema);

export default ResponsiblePerson;
