import mongoose from "mongoose";
const { Schema } = mongoose;

const AgentPointLedgerSchema = new Schema(
  {
    agentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    complaintId: { type: Schema.Types.ObjectId, ref: "Complaint", required: true, index: true },

    fromStatus: {
      type: String,
      enum: ["Pending", "Processing", "Solved", "Informed"],
      required: true,
    },
    toStatus: {
      type: String,
      enum: ["Pending", "Processing", "Solved", "Informed"],
      required: true,
    },

    minutesTaken: { type: Number, required: true, min: 0 },

    // scoring (each max 5)
    timePoints: { type: Number, required: true, min: 0, max: 5 },
    notePoints: { type: Number, required: true, min: 0, max: 5 },

    // ✅ total max 5 always
    totalPoints: { type: Number, required: true, min: 0, max: 5 },

    noteWords: { type: Number, default: 0 },

    monthKey: { type: String, required: true, index: true }, // "YYYY-MM"
    changedAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

AgentPointLedgerSchema.index({ agentId: 1, monthKey: 1, changedAt: -1 });

const AgentPointLedger =
  mongoose.models.AgentPointLedger ||
  mongoose.model("AgentPointLedger", AgentPointLedgerSchema);

export default AgentPointLedger;
