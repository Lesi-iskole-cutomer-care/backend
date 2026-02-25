import express from "express";
import {
  signUp,
  signIn,
  signOut,
  sendSignupVerificationCode,
  verifySignupCode,
  forgotSendCode,
  forgotVerifyCode,
  forgotResetPassword,
} from "../application/auth.js";

const router = express.Router();

router.post("/signup", signUp);
router.post("/signin", signIn);
router.post("/signout", signOut);

// ✅ signup otp
router.post("/whatsapp/send-code", sendSignupVerificationCode);
router.post("/whatsapp/verify-code", verifySignupCode);

// ✅ forgot password otp
router.post("/forgot/send-code", forgotSendCode);
router.post("/forgot/verify-code", forgotVerifyCode);
router.post("/forgot/reset-password", forgotResetPassword);

export default router;