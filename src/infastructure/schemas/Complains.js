import mongoose from "mongoose";
const { Schema } = mongoose;

const complaintSchema = new Schema(
  {
    // Auto-generated invoice number
    InvoiceNumber: { type: String, required: true, unique: true },

    CustomerName: { type: String },
    ContactNumber: { type: String, required: true },

    mainProblem: { type: Schema.Types.ObjectId, ref: "MainProblem", required: true },
    subProblem: { type: Schema.Types.ObjectId, ref: "SubProblem", required: true },

    ResponsibleDepartment: { type: Schema.Types.ObjectId, ref: "Department", required: true },
    responsiblePerson: { type: Schema.Types.ObjectId, ref: "ResponsiblePerson", required: true },

    description: { type: String, required: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // Note for Informed mainly
    complaintNote: { type: String, trim: true, default: "" },

    status: {
      type: String,
      enum: ["Pending", "Processing", "Solved", "Informed"],
      default: "Pending",
    },

    // ✅ Timing fields
    statusChangedAt: { type: Date, default: () => new Date() },
    processingAt: { type: Date, default: null },
    solvedAt: { type: Date, default: null },
    informedAt: { type: Date, default: null },

    // ✅ Status history with points
    statusHistory: [
      {
        from: { type: String, enum: ["Pending", "Processing", "Solved", "Informed"] },
        to: { type: String, enum: ["Pending", "Processing", "Solved", "Informed"] },
        changedAt: { type: Date, default: () => new Date() },
        changedBy: { type: Schema.Types.ObjectId, ref: "User" },

        minutesTaken: { type: Number, default: 0 },

        timePoints: { type: Number, default: 0 },
        notePoints: { type: Number, default: 0 },

        // ✅ total max 5 always
        totalPoints: { type: Number, default: 0 },

        noteWords: { type: Number, default: 0 },
      },
    ],

    // For display
    createdDate: {
      type: String,
      default: () =>
        new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
    },
    createdTime: {
      type: String,
      default: () =>
        new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
    },
  },
  { timestamps: true }
);

complaintSchema.index({ status: 1 });
complaintSchema.index({ mainProblem: 1 });
complaintSchema.index({ subProblem: 1 });
complaintSchema.index({ ResponsibleDepartment: 1 });
complaintSchema.index({ responsiblePerson: 1 });
complaintSchema.index({ createdAt: 1 });
complaintSchema.index({ createdBy: 1 });
complaintSchema.index({ statusChangedAt: 1 });

const Complaint = mongoose.model("Complaint", complaintSchema);
export default Complaint;
