import bcrypt from "bcryptjs";
import User from "../infastructure/schemas/User.js";
import { sendWhatsApp } from "../api/whatsapp.js";

/**
 * Map<phonenumber, { code: string, expiresAt: number }>
 */
const pendingOtps = new Map();

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const saveOtpForPhone = (phonenumber, code) => {
  const expiresAt = Date.now() + 5 * 60 * 1000;
  pendingOtps.set(phonenumber, { code, expiresAt });
};

const validateOtpForPhone = (phonenumber, code) => {
  const record = pendingOtps.get(phonenumber);
  if (!record) return { ok: false, reason: "no_otp" };

  const { code: savedCode, expiresAt } = record;

  if (Date.now() > expiresAt) {
    pendingOtps.delete(phonenumber);
    return { ok: false, reason: "expired" };
  }

  if (savedCode !== code) {
    return { ok: false, reason: "mismatch" };
  }

  pendingOtps.delete(phonenumber);
  return { ok: true };
};

const sendWhatsAppCode = async (phonenumber, code) => {
  const message = `Your Lesi Customer Care verification code is: ${code}`;
  try {
    await sendWhatsApp(phonenumber, message);
  } catch (err) {
    console.error("Error sending WhatsApp code via ChatBizz:", err.message || err);
  }
};

const toUserResponse = (user) => ({
  id: user._id,
  name: user.name,
  gender: user.gender,
  phonenumber: user.phonenumber,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// ✅ SIGN UP
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
      return res.status(409).json({
        message: "User with this phone number already exists",
      });
    }

    // ✅ hash password and store in "password"
    const hashed = await bcrypt.hash(String(password), 10);

    // ✅ enforce roles
    const userRole = role === "admin" ? "admin" : "agent";

    const user = await User.create({
      name,
      gender,
      phonenumber,
      password: hashed, // ✅ IMPORTANT FIX
      role: userRole,
    });

    const code = generateOtp();
    saveOtpForPhone(phonenumber, code);
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

// ✅ SIGN IN (FIXED for select:false password)
export const signIn = async (req, res) => {
  try {
    const { phonenumber, password } = req.body;

    if (!phonenumber || !password) {
      return res.status(400).json({ message: "phonenumber and password are required" });
    }

    // ✅ must select password explicitly
    const user = await User.findOne({ phonenumber }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid phone or password" });
    }

    if (!user.password) {
      return res.status(400).json({
        message:
          "This account has no password saved (old data). Please reset password or create account again.",
      });
    }

    const isMatch = await bcrypt.compare(String(password), user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid phone or password" });
    }

    // ✅ return safe user response (no password)
    return res.status(200).json({
      message: "Logged in successfully",
      user: toUserResponse(user),
    });
  } catch (err) {
    console.error("signIn error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// SIGN OUT
export const signOut = async (req, res) => {
  try {
    return res.status(200).json({
      message: "Signed out successfully. Clear user on client side.",
    });
  } catch (err) {
    console.error("signOut error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Send code again
export const sendVerificationCode = async (req, res) => {
  try {
    const { phonenumber } = req.body;

    if (!phonenumber) {
      return res.status(400).json({ message: "phonenumber is required" });
    }

    const user = await User.findOne({ phonenumber });
    if (!user) {
      return res.status(404).json({ message: "User not found for this phone" });
    }

    const code = generateOtp();
    saveOtpForPhone(phonenumber, code);
    await sendWhatsAppCode(phonenumber, code);

    return res.status(200).json({
      message: "Verification code sent via WhatsApp",
      phonenumber,
    });
  } catch (err) {
    console.error("sendVerificationCode error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Verify code
export const verifyCode = async (req, res) => {
  try {
    const { phonenumber, code } = req.body;

    if (!phonenumber || !code) {
      return res.status(400).json({ message: "phonenumber and code are required" });
    }

    const validation = validateOtpForPhone(phonenumber, code);

    if (!validation.ok) {
      if (validation.reason === "expired") {
        return res.status(400).json({ message: "Code expired. Please request a new one." });
      }
      if (validation.reason === "mismatch") {
        return res.status(400).json({ message: "Invalid code" });
      }
      return res.status(400).json({ message: "No code found for this number" });
    }

    const user = await User.findOne({ phonenumber });
    if (!user) {
      return res.status(404).json({ message: "User not found for this phone" });
    }

    return res.status(200).json({
      message: "Verification successful",
      user: toUserResponse(user),
    });
  } catch (err) {
    console.error("verifyCode error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
