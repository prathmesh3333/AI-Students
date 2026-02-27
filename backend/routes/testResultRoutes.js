const express = require("express");
const router = express.Router();
const TestResult = require("../models/TestResult");
const Test = require("../models/Test");
const mongoose = require("mongoose");

// Submit test result
router.post("/submit", async (req, res) => {
  try {
    const { testId, studentName, rollNo, answers, timeTaken, tabSwitchCount } = req.body;

    // Validate
    if (!testId || !studentName || !rollNo || !answers) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields"
      });
    }
    // Check if already submitted
const existingResult = await TestResult.findOne({
  testId,
  rollNo
});

if (existingResult) {
  return res.json({
    success: true,
    message: "Already submitted",
    result: {
      score: existingResult.score,
      correctAnswers: existingResult.correctAnswers,
      totalQuestions: existingResult.totalQuestions
    }
  });
}


    // Fetch the test to calculate score
    const test = await Test.findById(testId);
    if (!test) {
      return res.status(404).json({
        success: false,
        error: "Test not found"
      });
    }

    // Calculate score
    let correctAnswers = 0;
    answers.forEach(answer => {
      const question = test.questions[answer.questionIndex];
      if (question && question.correctAnswer === answer.selectedAnswer) {
        correctAnswers++;
      }
    });

    const score = (correctAnswers / test.totalQuestions) * 100;

    // Create result
    const newResult = new TestResult({
      testId,
      studentName,
      rollNo,
      answers,
      score: Math.round(score * 100) / 100, // Round to 2 decimal places
      totalQuestions: test.totalQuestions,
      correctAnswers,
      timeTaken,
      tabSwitchCount: tabSwitchCount || 0
    });

    await newResult.save();

    res.json({
      success: true,
      message: "Test submitted successfully",
      result: {
        score: newResult.score,
        correctAnswers: newResult.correctAnswers,
        totalQuestions: newResult.totalQuestions
      }
    });
  } catch (error) {
    console.error("Error submitting test result:", error);
    res.status(500).json({
      success: false,
      error: "Failed to submit test result"
    });
  }
});

// Get paginated results for a specific test (for teachers)
router.get("/test/:testId", async (req, res) => {
  try {
    const { testId } = req.params;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    // Map frontend sort keys to DB fields
    const sortFieldMap = { date: "submittedAt", score: "score", name: "studentName" };
    const sortField = sortFieldMap[req.query.sortBy] || "submittedAt";
    const sortDir   = req.query.sortOrder === "asc" ? 1 : -1;

    const objectId = new mongoose.Types.ObjectId(testId);

    const [results, total, aggStats] = await Promise.all([
      TestResult.find({ testId })
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit),
      TestResult.countDocuments({ testId }),
      TestResult.aggregate([
        { $match: { testId: objectId } },
        {
          $group: {
            _id: null,
            averageScore: { $avg: "$score" },
            highestScore: { $max: "$score" },
            lowestScore:  { $min: "$score" },
            passedCount:  { $sum: { $cond: [{ $gte: ["$score", 50] }, 1, 0] } },
            failedCount:  { $sum: { $cond: [{ $lt:  ["$score", 50] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const s = aggStats[0] || {};
    res.json({
      success: true,
      results,
      stats: {
        total,
        averageScore: s.averageScore != null ? s.averageScore.toFixed(2) : "0.00",
        highestScore: s.highestScore ?? 0,
        lowestScore:  s.lowestScore  ?? 0,
        passedCount:  s.passedCount  ?? 0,
        failedCount:  s.failedCount  ?? 0,
        passRate: total > 0
          ? ((( s.passedCount ?? 0) / total) * 100).toFixed(1)
          : "0.0",
      },
      pagination: { page, limit, total, hasMore: page * limit < total },
    });
  } catch (error) {
    console.error("Error fetching test results:", error);
    res.status(500).json({ success: false, error: "Failed to fetch results" });
  }
});

// Get results for a specific student
router.get("/student/:rollNo", async (req, res) => {
  try {
    const { rollNo } = req.params;
    const search = req.query.search || "";

    let results = await TestResult.find({ rollNo })
      .populate("testId", "title subject")
      .sort({ submittedAt: -1 });

    if (search) {
      const q = search.toLowerCase();
      results = results.filter(r =>
        r.testId?.title?.toLowerCase().includes(q) ||
        r.testId?.subject?.toLowerCase().includes(q)
      );
    }

    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error("Error fetching student results:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch results"
    });
  }
});

// Get all results (for teachers - dashboard view)
router.get("/all", async (req, res) => {
  try {
    const results = await TestResult.find()
      .populate("testId", "title subject")
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error("Error fetching all results:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch results"
    });
  }
});

module.exports = router;
