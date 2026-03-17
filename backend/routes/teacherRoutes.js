const express  = require("express");
const router   = express.Router();
const jwt      = require("jsonwebtoken");
const bcrypt   = require("bcrypt");
const Teacher  = require("../models/Teacher");
const Question = require("../models/Question");
const Test     = require("../models/Test");
const { requireTeacher } = require("../middleware/authMiddleware");

// ── POST /api/teacher/login ───────────────────────────────────
// Priority: DB teachers first, then env-var fallback (auto-migrates to DB).
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required." });
    }

    // 1. Check DB teachers first
    const dbTeacher = await Teacher.findOne({ email: email.toLowerCase() });
    if (dbTeacher) {
      const match = await dbTeacher.comparePassword(password);
      if (!match) {
        return res.status(401).json({ success: false, error: "Invalid teacher credentials." });
      }

      const token = jwt.sign(
        { id: dbTeacher._id, email: dbTeacher.email, name: dbTeacher.name, role: "teacher" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
      return res.json({
        success: true,
        message: "Teacher login successful",
        token,
        teacher: { email: dbTeacher.email, name: dbTeacher.name, role: "teacher" },
      });
    }

    // 2. Fallback: env-var credentials (legacy single-teacher support)
    if (
      email === process.env.TEACHER_EMAIL &&
      password === process.env.TEACHER_PASSWORD
    ) {
      const teacherEmail = email.toLowerCase();
      const teacherName  = process.env.TEACHER_NAME || "Teacher";

      // Auto-migrate: create DB record so admin can track this teacher
      try {
        const newTeacher = new Teacher({ name: teacherName, email: teacherEmail, password });
        await newTeacher.save();

        // Attribute any legacy "Teacher" tests to this email
        await Test.updateMany({ createdBy: "Teacher" }, { $set: { createdBy: teacherEmail } });
      } catch (upsertErr) {
        // Likely duplicate key — already migrated, safe to ignore
        if (upsertErr.code !== 11000) {
          console.error("Teacher upsert error:", upsertErr.message);
        }
      }

      const token = jwt.sign(
        { email: teacherEmail, name: teacherName, role: "teacher" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
      return res.json({
        success: true,
        message: "Teacher login successful",
        token,
        teacher: { email: teacherEmail, name: teacherName, role: "teacher" },
      });
    }

    return res.status(401).json({ success: false, error: "Invalid teacher credentials." });
  } catch (err) {
    console.error("Teacher login error:", err);
    res.status(500).json({ success: false, error: "Server error during login." });
  }
});

// ── All routes below require a valid teacher JWT ────────────
router.use(requireTeacher);

// Add a new question
router.post("/questions", async (req, res) => {
  try {
    const { subject, question, options, correctAnswer, difficulty } = req.body;

    if (!subject || !question || !options || correctAnswer === undefined) {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }
    if (options.length !== 4) {
      return res.status(400).json({ success: false, error: "Must provide exactly 4 options" });
    }
    if (correctAnswer < 0 || correctAnswer > 3) {
      return res.status(400).json({ success: false, error: "Correct answer must be between 0 and 3" });
    }

    const newQuestion = new Question({ subject, question, options, correctAnswer, difficulty: difficulty || "Medium" });
    await newQuestion.save();

    res.json({ success: true, message: "Question added successfully", question: newQuestion });
  } catch (error) {
    console.error("Error adding question:", error);
    res.status(500).json({ success: false, error: "Failed to add question" });
  }
});

// Get all questions (optionally filter by subject)
router.get("/questions", async (req, res) => {
  try {
    const { subject } = req.query;
    const filter = subject ? { subject } : {};
    const questions = await Question.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, questions });
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ success: false, error: "Failed to fetch questions" });
  }
});

// Get questions by subject for students
router.get("/questions/:subject", async (req, res) => {
  try {
    const { subject } = req.params;
    const questions = await Question.find({ subject }).select("-correctAnswer");
    res.json({ success: true, questions });
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ success: false, error: "Failed to fetch questions" });
  }
});

// Delete a question
router.delete("/questions/:id", async (req, res) => {
  try {
    await Question.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Question deleted successfully" });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({ success: false, error: "Failed to delete question" });
  }
});

router.get("/by-test/:testId", async (req, res) => {
  const data = await Question.find({ testId: req.params.testId });
  res.json(data);
});

// Update a question
router.put("/questions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, question, options, correctAnswer, difficulty } = req.body;

    const updatedQuestion = await Question.findByIdAndUpdate(
      id,
      { subject, question, options, correctAnswer, difficulty },
      { new: true, runValidators: true }
    );

    if (!updatedQuestion) {
      return res.status(404).json({ success: false, error: "Question not found" });
    }

    res.json({ success: true, message: "Question updated successfully", question: updatedQuestion });
  } catch (error) {
    console.error("Error updating question:", error);
    res.status(500).json({ success: false, error: "Failed to update question" });
  }
});

module.exports = router;
