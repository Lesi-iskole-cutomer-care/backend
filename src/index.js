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

// ✅ Read from ENV (comma separated)
const allowedOrigins = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // ✅ allow requests with no origin (React Native apps, Postman, curl)
    if (!origin) return callback(null, true);

    // ✅ allow if origin matches env list
    if (allowedOrigins.includes(origin)) return callback(null, true);

    console.log("❌ CORS blocked origin:", origin);
    return callback(new Error("Not allowed by CORS: " + origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// ✅ FIX: Express/router doesn't accept "*" here
app.options("/*", cors(corsOptions));

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
  } catch (e) {
    console.error("❌ Server failed to start:", e);
    process.exit(1);
  }
}

start();