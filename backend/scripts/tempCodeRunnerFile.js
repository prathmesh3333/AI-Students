/**
 * Seed script — creates the initial admin account.
 *
 * Usage:
 *   node backend/scripts/seedAdmin.js
 *
 * Configure via environment variables (or edit the defaults below):
 *   ADMIN_NAME     – display name   (default: "Admin")
 *   ADMIN_EMAIL    – login email    (default: "admin@eduprep.com")
 *   ADMIN_PASSWORD – login password (must be ≥ 8 chars, no default — required)
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const Admin    = require("../models/Admin");

const ADMIN_NAME     = process.env.ADMIN_NAME     || "Admin";
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL     || "admin@eduprep.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.error("❌ ADMIN_PASSWORD environment variable is required.");
  console.error("   Set it in your .env file or export it before running this script.");
  process.exit(1);
}

if (ADMIN_PASSWORD.length < 8) {
  console.error("❌ ADMIN_PASSWORD must be at least 8 characters.");
  process.exit(1);
}

async function seed() {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/practice_mern",
      { useNewUrlParser: true, useUnifiedTopology: true }
    );
    console.log("✅ Connected to MongoDB");

    const existing = await Admin.findOne({ email: ADMIN_EMAIL.toLowerCase() });
    if (existing) {
      console.log(`ℹ️  Admin already exists: ${ADMIN_EMAIL}`);
      process.exit(0);
    }

    const admin = new Admin({
      name:     ADMIN_NAME,
      email:    ADMIN_EMAIL,
      password: ADMIN_PASSWORD,   // hashed by the pre-save hook
    });
    await admin.save();

    console.log("✅ Admin account created successfully!");
    console.log(`   Name  : ${admin.name}`);
    console.log(`   Email : ${admin.email}`);
    console.log("   Login at /admin-login");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
}

seed();
