const jwt = require("jsonwebtoken");
const FormDataModel = require("../models/FormData");
const PendingRegistration = require("../models/PendingRegistration");
const PasswordReset = require("../models/PasswordReset");
const { sendOTPEmail } = require("../services/emailService");

const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const maskEmail = (email) => {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 3)}***@${domain}`;
};

// ---------------- Step 1: Send OTP ----------------
const register = async (req, res) => {
  const { rollNo, name, email, password, confirmPassword, branch } = req.body;

  if (!rollNo || !name || !email || !password || !confirmPassword || !branch)
    return res.status(400).json({ error: "All fields are required" });

  if (password !== confirmPassword)
    return res.status(400).json({ error: "Passwords do not match" });

  try {
    // Check if account already exists
    const existingUser = await FormDataModel.findOne({ rollNo });
    if (existingUser)
      return res.status(400).json({ error: "Roll number already registered" });

    // Remove any existing pending entry for this rollNo
    await PendingRegistration.deleteOne({ rollNo });

    const otp = generateOTP();

    await PendingRegistration.create({ rollNo, name, email, password, branch, otp });

    await sendOTPEmail(email, name, otp);

    res.status(200).json({
      message: "OTP sent",
      email, // send back so frontend can display "we sent to x@y.com"
    });
  } catch (err) {
    console.error("❌ Registration Error:", err);
    res.status(500).json({ error: "Failed to send OTP. Check your email address." });
  }
};

// ---------------- Step 2: Verify OTP & Create Account ----------------
const verifyOTP = async (req, res) => {
  const { rollNo, otp } = req.body;

  if (!rollNo || !otp)
    return res.status(400).json({ error: "Roll number and OTP are required" });

  try {
    const pending = await PendingRegistration.findOne({ rollNo });

    if (!pending)
      return res.status(400).json({ error: "OTP expired or not found. Please register again." });

    if (pending.otp !== otp.toString())
      return res.status(400).json({ error: "Invalid OTP. Please try again." });

    // Create the real account
    const newUser = new FormDataModel({
      rollNo: pending.rollNo,
      name:   pending.name,
      email:  pending.email,
      password: pending.password, // plain — pre-save hook will hash it
      branch: pending.branch,
    });
    await newUser.save();

    // Clean up pending entry
    await PendingRegistration.deleteOne({ rollNo });

    res.status(201).json({ message: "Registration successful" });
  } catch (err) {
    console.error("❌ Verify OTP Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ---------------- Resend OTP ----------------
const resendOTP = async (req, res) => {
  const { rollNo } = req.body;

  if (!rollNo)
    return res.status(400).json({ error: "Roll number is required" });

  try {
    const pending = await PendingRegistration.findOne({ rollNo });

    if (!pending)
      return res.status(400).json({ error: "Session expired. Please fill the form again." });

    const otp = generateOTP();
    pending.otp = otp;
    pending.createdAt = new Date(); // reset TTL
    await pending.save();

    await sendOTPEmail(pending.email, pending.name, otp);

    res.json({ message: "OTP resent", email: pending.email });
  } catch (err) {
    console.error("❌ Resend OTP Error:", err);
    res.status(500).json({ error: "Failed to resend OTP" });
  }
};

// ---------------- Login ----------------
const login = async (req, res) => {
  const { rollNo, password } = req.body;

  if (!rollNo || !password)
    return res.status(400).json({ error: "Roll number and password are required" });

  try {
    const user = await FormDataModel.findOne({ rollNo });
    if (!user)
      return res.status(404).json({ error: "No records found for this roll number" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(400).json({ error: "Wrong password" });

    const token = signToken({
      rollNo: user.rollNo,
      name: user.name,
      branch: user.branch,
      role: "student",
    });

    res.json({
      message: "Login successful",
      token,
      user: { rollNo: user.rollNo, name: user.name, branch: user.branch },
    });
  } catch (err) {
    console.error("❌ Login Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ---------------- Get Student by Roll No ----------------
const getStudent = async (req, res) => {
  const { rollNo } = req.params;

  try {
    const student = await FormDataModel.findOne({ rollNo }).select("-password");
    if (!student)
      return res.status(404).json({ success: false, error: "Student not found" });

    res.json({
      success: true,
      student: {
        rollNo: student.rollNo,
        name: student.name,
        branch: student.branch
      }
    });
  } catch (err) {
    console.error("❌ Get Student Error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// ---------------- Get All Students ----------------
const getAllStudents = async (req, res) => {
  try {
    const search = req.query.search || "";
    const branch = req.query.branch || "";
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit) || 9));

    const filter = {};
    if (search) {
      filter.$or = [
        { name:   { $regex: search, $options: "i" } },
        { rollNo: { $regex: search, $options: "i" } },
      ];
    }
    if (branch) filter.branch = branch;

    const [students, total] = await Promise.all([
      FormDataModel.find(filter)
        .select("-password")
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      FormDataModel.countDocuments(filter),
    ]);

    res.json({
      success: true,
      students: students.map(s => ({ rollNo: s.rollNo, name: s.name, branch: s.branch })),
      total,
      page,
      hasMore: page * limit < total,
    });
  } catch (err) {
    console.error("❌ Get All Students Error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// ---------------- Forgot Password: Send OTP ----------------
const forgotPassword = async (req, res) => {
  const { rollNo } = req.body;
  if (!rollNo) return res.status(400).json({ error: "Roll number is required" });

  try {
    const user = await FormDataModel.findOne({ rollNo });
    if (!user) return res.status(404).json({ error: "No account found for this roll number" });

    await PasswordReset.deleteOne({ rollNo });

    const otp = generateOTP();
    await PasswordReset.create({ rollNo, otp });

    await sendOTPEmail(user.email, user.name, otp);

    res.json({ message: "OTP sent", email: maskEmail(user.email) });
  } catch (err) {
    console.error("❌ Forgot Password Error:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
};

// ---------------- Forgot Password: Verify OTP ----------------
const verifyResetOTP = async (req, res) => {
  const { rollNo, otp } = req.body;
  if (!rollNo || !otp) return res.status(400).json({ error: "Roll number and OTP are required" });

  try {
    const record = await PasswordReset.findOne({ rollNo });
    if (!record) return res.status(400).json({ error: "OTP expired or not found. Please try again." });
    if (record.otp !== otp.toString()) return res.status(400).json({ error: "Invalid OTP. Please try again." });

    // Issue a short-lived reset token
    const resetToken = jwt.sign(
      { rollNo, purpose: "password-reset" },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    await PasswordReset.deleteOne({ rollNo });

    res.json({ message: "OTP verified", resetToken });
  } catch (err) {
    console.error("❌ Verify Reset OTP Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ---------------- Forgot Password: Reset Password ----------------
const resetPassword = async (req, res) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) return res.status(400).json({ error: "All fields are required" });

  try {
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    if (decoded.purpose !== "password-reset")
      return res.status(400).json({ error: "Invalid reset token" });

    const user = await FormDataModel.findOne({ rollNo: decoded.rollNo });
    if (!user) return res.status(404).json({ error: "User not found" });

    user.password = newPassword; // pre-save hook will hash
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    if (err.name === "TokenExpiredError")
      return res.status(400).json({ error: "Reset session expired. Please start over." });
    console.error("❌ Reset Password Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ---------------- Change Password (authenticated) ----------------
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const rollNo = req.user.rollNo;

  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: "All fields are required" });

  try {
    const user = await FormDataModel.findOne({ rollNo });
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ error: "Current password is incorrect" });

    user.password = newPassword; // pre-save hook will hash
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("❌ Change Password Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  register, verifyOTP, resendOTP, login, getStudent, getAllStudents,
  forgotPassword, verifyResetOTP, resetPassword, changePassword,
};