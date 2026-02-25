// src/index.js
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

/**
 * .env (NO spaces):
 * PORT=8081
 * CORS_ORIGINS=http://localhost:5173,http://localhost:8081,https://lesicustomercare.netlify.app
 */
const allowedOrigins = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    // ✅ local dev allow any localhost port
    if (origin.startsWith("http://localhost:")) return callback(null, true);
    if (origin.startsWith("http://127.0.0.1:")) return callback(null, true);

    if (allowedOrigins.includes(origin)) return callback(null, true);

    console.log("❌ CORS blocked origin:", origin);
    return callback(new Error("Not allowed by CORS"), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-user-id"],
  optionsSuccessStatus: 204,
};

// ✅ CORS first
app.use(cors(corsOptions));

// ✅ FIX: preflight handler (DON'T use "*")
app.options(/.*/, cors(corsOptions)); // <-- regex works with your router/path-to-regexp

app.use(express.json({ limit: "2mb" }));

// routes
app.use("/api/user", userRouter);
app.use("/api/mainproblems", mainProblemRouter);
app.use("/api/subproblems", subProblemRoutes);
app.use("/api/departments", departmentRouter);
app.use("/api/complaints", complaintRouter);
app.use("/api/responsiblepeople", responsiblePersonRouter);
app.use("/api/auth", authRouter);

// health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "API running" });
});

// error handler
app.use((err, req, res, next) => {
  console.error("❌ Error:", err?.message || err);
  res.status(500).json({ message: err?.message || "Server error" });
});

const PORT = Number(process.env.PORT || 8081);

async function start() {
  try {
    await connectDB();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log("✅ Allowed origins:", allowedOrigins);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

start();