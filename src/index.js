import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./infastructure/db.js";

import userRouter from "./api/User.js";
import mainProblemRouter from "./api/MainProblem.js";
import subProblemRoutes from "./api/SubProblem.js";
import departmentRouter from "./api/Department.js";
import complaintRouter from "./api/Complains.js";
import responsiblePersonRouter from "./api/ResponiblePerson.js";
import authRouter from "./api/auth.js";

const app = express();

console.log("RAW CORS_ORIGINS =", process.env.CORS_ORIGINS);

// ✅ hosting link only
const allowedOrigins = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // ✅ allow no-origin (React Native apps, Postman)
    if (!origin) return callback(null, true);

    // ✅ allow only your hosting domain(s)
    if (allowedOrigins.includes(origin)) return callback(null, true);

    console.log("❌ CORS blocked origin:", origin);
    return callback(null, false); // block silently (no crash)
  },

  // ✅ set true ONLY if you use cookies; if using JWT only, set false.
  credentials: true,

  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json());

// Routes
app.use("/api/user", userRouter);
app.use("/api/mainproblems", mainProblemRouter);
app.use("/api/subproblems", subProblemRoutes);
app.use("/api/departments", departmentRouter);
app.use("/api/complaints", complaintRouter);
app.use("/api/responsiblepeople", responsiblePersonRouter);
app.use("/api/auth", authRouter);

const PORT = process.env.PORT || 8080;

async function start() {
  try {
    await connectDB();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log("✅ Allowed browser origins:", allowedOrigins);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

start();