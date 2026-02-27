const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");   // 🔥 THIS LINE
const Question = require("../models/Question");

router.post("/add-questions", async (req, res) => {
  try {
    const { questions, branch, company } = req.body;

    if (!questions || questions.length === 0) {
      return res.status(400).json({ error: "No questions received" });
    }

    const formatted = questions.map(q => {
      if (!q.question || !q.company || !q.year || !q.position) {
        throw new Error("Missing fields in question");
      }

      return {
        testId: new mongoose.Types.ObjectId(), // TEMP
        questionText: q.question,
        company: q.company,
        year: q.year,
        position: q.position,
        branch: branch || "General",
        image: "",
        options: [],          // empty now
        correctAnswer: null   // no correct answer
      };
    });

    await Question.insertMany(formatted);

    res.json({ success: true });
  } catch (err) {
    console.error("SAVE ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/all", async (req, res) => {
  try {
    const questions = await Question.find().sort({ _id: -1 });
    res.json({ success: true, questions });
  } catch (err) {
    console.error("FETCH ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get all branches
router.get("/branches", async (req, res) => {
  try {
    const branches = [
      { name: "Computer Science", icon: "💻", color: "#667eea" },
      { name: "Information Technology", icon: "🌐", color: "#11998e" },
      { name: "Mechanical Engineering", icon: "⚙️", color: "#f093fb" },
      { name: "Electrical Engineering", icon: "⚡", color: "#fa709a" },
      { name: "Civil Engineering", icon: "🏗️", color: "#feca57" },
      { name: "Electronics & Communication", icon: "📡", color: "#5f27cd" }
    ];
    res.json({ success: true, branches });
  } catch (err) {
    console.error("FETCH BRANCHES ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get companies for a specific branch
router.get("/companies/:branch", async (req, res) => {
  try {
    const { branch } = req.params;
    const search = req.query.search || "";

    const matchStage = { branch: decodeURIComponent(branch) };
    if (search) matchStage.company = { $regex: search, $options: "i" };

    const companies = await Question.aggregate([
      { $match: matchStage },
      { $group: { _id: "$company", questionCount: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const formattedCompanies = companies.map(c => ({
      name: c._id,
      logo: "🏢",
      questionCount: c.questionCount
    }));

    res.json({ success: true, companies: formattedCompanies });
  } catch (err) {
    console.error("FETCH COMPANIES ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Create new company (just validates, doesn't create a record)
router.post("/create-company", async (req, res) => {
  try {
    const { branch, companyName } = req.body;

    if (!branch || !companyName) {
      return res.status(400).json({ error: "Branch and company name required" });
    }

    // Check if company already exists for this branch
    const existing = await Question.findOne({
      branch,
      company: companyName
    });

    if (existing) {
      return res.status(400).json({ error: "Company already exists for this branch" });
    }

    res.json({ success: true, message: "Company validated" });
  } catch (err) {
    console.error("CREATE COMPANY ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// View questions for a specific branch and company
router.get("/view/:branch/:company", async (req, res) => {
  try {
    const { branch, company } = req.params;

    const questions = await Question.find({
      branch: decodeURIComponent(branch),
      company: decodeURIComponent(company)
    }).sort({ year: -1, createdAt: -1 });

    res.json({ success: true, questions });
  } catch (err) {
    console.error("VIEW QUESTIONS ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
