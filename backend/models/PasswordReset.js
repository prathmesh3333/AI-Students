const mongoose = require("mongoose");

const passwordResetSchema = new mongoose.Schema({
  rollNo: { type: String, required: true },
  otp:    { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 900 }, // 15-min TTL
});

module.exports = mongoose.model("PasswordReset", passwordResetSchema);
