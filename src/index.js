// index.js (backend)
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

const allowedOrigins = [
  "http://localhost:5174", // Vite web app
  "http://localhost:8081", // Expo web bundle
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // RN apps
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      console.log("❌ CORS blocked origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Routes
app.use("/api/user", userRouter);
app.use("/api/mainproblems", mainProblemRouter);
app.use("/api/subproblems", subProblemRoutes);
app.use("/api/departments", departmentRouter);
app.use("/api/complaints", complaintRouter);
app.use("/api/responsiblepeople", responsiblePersonRouter);
app.use("/api/auth", authRouter);

connectDB();

const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server is running on  192.168.8.107:${PORT}`);
});
