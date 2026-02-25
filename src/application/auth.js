import bcrypt from "bcryptjs";
import User from "../infastructure/schemas/User.js";
import { sendWhatsApp } from "../api/whatsapp.js";

/**
 * Map<phonenumber, { code: string, expiresAt: number, purpose: "signup"|"forgot" }>
 */
const pendingOtps = new Map();

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const saveOtpForPhone = (phonenumber, code, purpose) => {
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min
  pendingOtps.set(phonenumber, { code, expiresAt, purpose });
};

const validateOtpForPhone = (phonenumber, code, purpose) => {
  const record = pendingOtps.get(phonenumber);
  if (!record) return { ok: false, reason: "no_otp" };

  const { code: savedCode, expiresAt, purpose: savedPurpose } = record;

  if (savedPurpose !== purpose) return { ok: false, reason: "wrong_purpose" };

  if (Date.now() > expiresAt) {
    pendingOtps.delete(phonenumber);
    return { ok: false, reason: "expired" };
  }

  if (savedCode !== code) return { ok: false, reason: "mismatch" };

  pendingOtps.delete(phonenumber);
  return { ok: true };
};

const sendWhatsAppCode = async (phonenumber, code) => {
  const message = `Your Lesi Customer Care verification code is: ${code}`;
  try {
    await sendWhatsApp(phonenumber, message);
  } catch (err) {
    console.error("Error sending WhatsApp code:", err?.message || err);
  }
};

const toUserResponse = (user) => ({
  id: user._id,
  _id: user._id,
  name: user.name,
  gender: user.gender,
  phonenumber: user.phonenumber,
  role: user.role,
  isVerified: user.isVerified,
  otpStatus: user.otpStatus,
  approvalStatus: user.approvalStatus,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// ✅ SIGN UP (admin auto-approved, agent pending)
export const signUp = async (req, res) => {
  try {
    const { name, gender, phonenumber, password, role } = req.body;

    if (!name || !gender || !phonenumber || !password) {
      return res.status(400).json({
        message: "name, gender, phonenumber and password are required",
      });
    }

    const existing = await User.findOne({ phonenumber });
    if (existing) {
      return res.status(409).json({ message: "User with this phone number already exists" });
    }

    const hashed = await bcrypt.hash(String(password), 10);
    const userRole = role === "admin" ? "admin" : "agent";

    // ✅ KEY FIX
    const approvalStatus = userRole === "admin" ? "approved" : "pending";

    const user = await User.create({
      name,
      gender,
      phonenumber,
      password: hashed,
      role: userRole,
      isVerified: false,
      otpStatus: "none",
      approvalStatus,
    });

    const code = generateOtp();
    saveOtpForPhone(phonenumber, code, "signup");
    await sendWhatsAppCode(phonenumber, code);

    return res.status(201).json({
      message: "User registered successfully. WhatsApp verification code has been sent.",
      user: toUserResponse(user),
    });
  } catch (err) {
    console.error("signUp error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Resend SIGNUP OTP
export const sendSignupVerificationCode = async (req, res) => {
  try {
    const { phonenumber } = req.body;
    if (!phonenumber) return res.status(400).json({ message: "phonenumber is required" });

    const user = await User.findOne({ phonenumber });
    if (!user) return res.status(404).json({ message: "User not found for this phone" });

    const code = generateOtp();
    saveOtpForPhone(phonenumber, code, "signup");
    await sendWhatsAppCode(phonenumber, code);

    return res.status(200).json({ message: "Verification code sent via WhatsApp", phonenumber });
  } catch (err) {
    console.error("sendSignupVerificationCode error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Verify SIGNUP OTP
export const verifySignupCode = async (req, res) => {
  try {
    const { phonenumber, code } = req.body;

    if (!phonenumber || !code) {
      return res.status(400).json({ message: "phonenumber and code are required" });
    }

    const user = await User.findOne({ phonenumber });
    if (!user) return res.status(404).json({ message: "User not found for this phone" });

    const validation = validateOtpForPhone(phonenumber, code, "signup");

    if (!validation.ok) {
      await User.updateOne(
        { phonenumber },
        { $set: { isVerified: false, otpStatus: "failed" } }
      );

      if (validation.reason === "expired") {
        return res.status(400).json({ message: "Code expired. Please request a new one." });
      }
      if (validation.reason === "mismatch") {
        return res.status(400).json({ message: "Invalid code" });
      }
      return res.status(400).json({ message: "No code found for this number" });
    }

    user.isVerified = true;
    user.otpStatus = "verified";
    await user.save();

    return res.status(200).json({
      message: "Verification successful",
      user: toUserResponse(user),
    });
  } catch (err) {
    console.error("verifySignupCode error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ SIGN IN (only agent requires approval)
export const signIn = async (req, res) => {
  try {
    const { phonenumber, password } = req.body;

    if (!phonenumber || !password) {
      return res.status(400).json({ message: "phonenumber and password are required" });
    }

    const user = await User.findOne({ phonenumber }).select("+password");
    if (!user) return res.status(401).json({ message: "Invalid phone or password" });

    if (!user.password) {
      return res.status(400).json({
        message: "This account has no password saved (old data). Please reset password.",
      });
    }

    const isMatch = await bcrypt.compare(String(password), user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid phone or password" });

    // ✅ must be OTP verified (for both roles)
    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify OTP first",
        reason: "NOT_VERIFIED",
      });
    }

    // ✅ KEY FIX: approval check ONLY for agent
    if (user.role === "agent" && user.approvalStatus !== "approved") {
      return res.status(403).json({
        message: "Your account is pending admin approval",
        reason: "PENDING_APPROVAL",
        approvalStatus: user.approvalStatus,
        user: toUserResponse(user),
      });
    }

    return res.status(200).json({
      message: "Logged in successfully",
      user: toUserResponse(user),
    });
  } catch (err) {
    console.error("signIn error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ SIGN OUT
export const signOut = async (req, res) => {
  try {
    return res.status(200).json({ message: "Signed out successfully. Clear user on client side." });
  } catch (err) {
    console.error("signOut error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ============================
   FORGOT PASSWORD FLOW
============================ */

export const forgotSendCode = async (req, res) => {
  try {
    const { phonenumber } = req.body;
    if (!phonenumber) return res.status(400).json({ message: "phonenumber is required" });

    const user = await User.findOne({ phonenumber });
    if (!user) return res.status(404).json({ message: "User not found for this phone" });

    const code = generateOtp();
    saveOtpForPhone(phonenumber, code, "forgot");
    await sendWhatsAppCode(phonenumber, code);

    return res.status(200).json({ message: "Reset code sent via WhatsApp", phonenumber });
  } catch (err) {
    console.error("forgotSendCode error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const forgotVerifyCode = async (req, res) => {
  try {
    const { phonenumber, code } = req.body;
    if (!phonenumber || !code) {
      return res.status(400).json({ message: "phonenumber and code are required" });
    }

    const user = await User.findOne({ phonenumber });
    if (!user) return res.status(404).json({ message: "User not found for this phone" });

    const validation = validateOtpForPhone(phonenumber, code, "forgot");
    if (!validation.ok) {
      if (validation.reason === "expired") {
        return res.status(400).json({ message: "Code expired. Please request a new one." });
      }
      if (validation.reason === "mismatch") {
        return res.status(400).json({ message: "Invalid code" });
      }
      return res.status(400).json({ message: "No code found for this number" });
    }

    return res.status(200).json({ message: "Code verified. You can reset password now.", phonenumber });
  } catch (err) {
    console.error("forgotVerifyCode error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const forgotResetPassword = async (req, res) => {
  try {
    const { phonenumber, newPassword } = req.body;
    if (!phonenumber || !newPassword) {
      return res.status(400).json({ message: "phonenumber and newPassword are required" });
    }

    const hashed = await bcrypt.hash(String(newPassword), 10);

    const updated = await User.findOneAndUpdate(
      { phonenumber },
      { $set: { password: hashed } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    console.error("forgotResetPassword error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};