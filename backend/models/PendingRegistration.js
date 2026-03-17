const mongoose = require("mongoose");

// Stores form data + OTP temporarily until the user verifies.
// MongoDB auto-deletes documents after 10 minutes (TTL index on createdAt).
const pendingSchema = new mongoose.Schema({
  rollNo:   { type: String, required: true, unique: true },
  name:     { type: String, required: true },
  email:    { type: String, required: true },
  password: { type: String, required: true }, // plain — hashed when account is created
  branch:   { type: String, required: true },
  otp:      { type: String, required: true },
  createdAt:{ type: Date, default: Date.now, expires: 600 }, // 10-minute TTL
});

module.exports = mongoose.model("PendingRegistration", pendingSchema);
