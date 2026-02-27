const express = require("express");
const router = express.Router();
const {
  register, verifyOTP, resendOTP, login, getStudent, getAllStudents,
  forgotPassword, verifyResetOTP, resetPassword, changePassword,
} = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");

router.post("/register", register);        // Step 1 — send OTP
router.post("/verify-otp", verifyOTP);     // Step 2 — verify OTP & create account
router.post("/resend-otp", resendOTP);     // Resend OTP
router.post("/login", login);
router.get("/students", getAllStudents);
router.get("/student/:rollNo", getStudent);

// Forgot / reset password (public)
router.post("/forgot-password",    forgotPassword);
router.post("/verify-reset-otp",   verifyResetOTP);
router.post("/reset-password",     resetPassword);

// Change password (authenticated)
router.post("/change-password", requireAuth, changePassword);

module.exports = router;