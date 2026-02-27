const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Question = require("../models/Question");
const { requireTeacher } = require("../middleware/authMiddleware");

// ── Teacher login (public) ──────────────────────────────────
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (
    email === process.env.TEACHER_EMAIL &&
    password === process.env.TEACHER_PASSWORD
  ) {
    const token = jwt.sign(
      { email, name: "Teacher", role: "teacher" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    return res.json({
      success: true,
      message: "Teacher login successful",
      token,
      teacher: { email, name: "Teacher", role: "teacher" },
    });
  }

  res.status(401).json({ success: false, error: "Invalid teacher credentials" });
});

// ── All routes below require a valid teacher JWT ────────────
router.use(requireTeacher);

// Add a new question
router.post("/questions", async (req, res) => {
  try {
    const { subject, question, options, correctAnswer, difficulty } = req.body;

    // Validation
    if (!subject || !question || !options || correctAnswer === undefined) {
      return res.status(400).json({
        success: false,
        error: "All fields are required"
      });
    }

    if (options.length !== 4) {
      return res.status(400).json({
        success: false,
        error: "Must provide exactly 4 options"
      });
    }

    if (correctAnswer < 0 || correctAnswer > 3) {
      return res.status(400).json({
        success: false,
        error: "Correct answer must be between 0 and 3"
      });
    }

    const newQuestion = new Question({
      subject,
      question,
      options,
      correctAnswer,
      difficulty: difficulty || "Medium"
    });

    await newQuestion.save();

    res.json({
      success: true,
      message: "Question added successfully",
      question: newQuestion
    });
  } catch (error) {
    console.error("Error adding question:", error);
    res.status(500).json({
      success: false,
      error: "Failed to add question"
    });
  }
});

// Get all questions (optionally filter by subject)
router.get("/questions", async (req, res) => {
  try {
    const { subject } = req.query;

    const filter = subject ? { subject } : {};
    const questions = await Question.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      questions
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch questions"
    });
  }
});

// Get questions by subject for students
router.get("/questions/:subject", async (req, res) => {
  try {
    const { subject } = req.params;

    const questions = await Question.find({ subject }).select("-correctAnswer");

    res.json({
      success: true,
      questions
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch questions"
    });
  }
});

// Delete a question
router.delete("/questions/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await Question.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Question deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete question"
    });
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
      return res.status(404).json({
        success: false,
        error: "Question not found"
      });
    }

    res.json({
      success: true,
      message: "Question updated successfully",
      question: updatedQuestion
    });
  } catch (error) {
    console.error("Error updating question:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update question"
    });
  }
});

module.exports = router;
