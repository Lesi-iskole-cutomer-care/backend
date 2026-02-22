import express from "express";
import {
  signUp,
  signIn,
  signOut,
  sendVerificationCode,
  verifyCode,
} from "../application/Auth.js";

const router = express.Router();

router.post("/signup", signUp);
router.post("/signin", signIn);
router.post("/signout", signOut);
router.post("/whatsapp/send-code", sendVerificationCode);
router.post("/whatsapp/verify-code", verifyCode);

export default router;
