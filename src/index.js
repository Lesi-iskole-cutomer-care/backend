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

// ✅ Parse env origins (ONLY for browser origins like Netlify)
const allowedOrigins = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// ✅ CORS middleware
const corsOptions = {
  origin: (origin, callback) => {
    // ✅ allow requests with NO origin (React Native apps, Postman, curl)
    if (!origin) return callback(null, true);

    // ✅ allow only listed browser origins (hosting domain)
    if (allowedOrigins.includes(origin)) return callback(null, true);

    console.log("❌ CORS blocked origin:", origin);
    return callback(new Error("Not allowed by CORS: " + origin));
  },

  // ⚠️ set true ONLY if you use cookies (sessions)
  // If you use JWT in Authorization header, you can set false.
  credentials: true,

  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// ✅ IMPORTANT: preflight requests
app.options("*", cors(corsOptions));

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

// ✅ Start server after DB connects (recommended)
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