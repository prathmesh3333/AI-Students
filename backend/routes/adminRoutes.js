const express = require("express");
const router  = express.Router();
const jwt     = require("jsonwebtoken");
const Admin   = require("../models/Admin");
const Teacher = require("../models/Teacher");
const Test    = require("../models/Test");
const FormData = require("../models/FormData");
const { requireAdmin } = require("../middleware/authMiddleware");

// ── POST /api/admin/login ─────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const match = await admin.comparePassword(password);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email, name: admin.name, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      token,
      admin: { email: admin.email, name: admin.name },
    });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ error: "Server error during login." });
  }
});

// ── All routes below require admin JWT ───────────────────────
router.use(requireAdmin);

// ── GET /api/admin/stats ──────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const [teacherCount, testCount, publishedCount, studentCount] = await Promise.all([
      Teacher.countDocuments(),
      Test.countDocuments(),
      Test.countDocuments({ isPublished: true }),
      FormData.countDocuments(),
    ]);

    res.json({
      success: true,
      stats: { teacherCount, testCount, publishedCount, studentCount },
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats." });
  }
});

// ── GET /api/admin/teachers ───────────────────────────────────
// Returns all teachers with their test counts
router.get("/teachers", async (req, res) => {
  try {
    const search = req.query.search || "";
    const query  = search
      ? { $or: [
          { name:  { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ] }
      : {};

    const teachers = await Teacher.find(query)
      .select("-password")
      .sort({ createdAt: -1 });

    const enriched = await Promise.all(
      teachers.map(async (t) => {
        const [testCount, publishedCount] = await Promise.all([
          Test.countDocuments({ createdBy: t.email }),
          Test.countDocuments({ createdBy: t.email, isPublished: true }),
        ]);
        return { ...t.toObject(), testCount, publishedCount };
      })
    );

    res.json({ success: true, teachers: enriched });
  } catch (err) {
    console.error("Get teachers error:", err);
    res.status(500).json({ error: "Failed to fetch teachers." });
  }
});

// ── GET /api/admin/teachers/:email/tests ─────────────────────
// Returns paginated tests for a specific teacher
router.get("/teachers/:email/tests", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const filter = { createdBy: email };

    const [tests, total] = await Promise.all([
      Test.find(filter)
        .select("title subject branches isPublished deadline totalQuestions timeLimit createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Test.countDocuments(filter),
    ]);

    res.json({
      success: true,
      tests,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Get teacher tests error:", err);
    res.status(500).json({ error: "Failed to fetch tests." });
  }
});

// ── POST /api/admin/teachers ──────────────────────────────────
// Admin creates a new teacher account
router.post("/teachers", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const existing = await Teacher.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: "A teacher with this email already exists." });
    }

    const teacher = new Teacher({ name: name.trim(), email, password });
    await teacher.save();

    res.status(201).json({
      success: true,
      teacher: { _id: teacher._id, name: teacher.name, email: teacher.email, createdAt: teacher.createdAt },
    });
  } catch (err) {
    console.error("Create teacher error:", err);
    res.status(500).json({ error: "Failed to create teacher." });
  }
});

// ── DELETE /api/admin/teachers/:id ───────────────────────────
router.delete("/teachers/:id", async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);
    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found." });
    }
    res.json({ success: true, message: "Teacher removed." });
  } catch (err) {
    console.error("Delete teacher error:", err);
    res.status(500).json({ error: "Failed to delete teacher." });
  }
});

module.exports = router;
