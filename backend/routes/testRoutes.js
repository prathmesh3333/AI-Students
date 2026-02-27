// const express = require("express");
// const router = express.Router();
// const Test = require("../models/Test");

// // Create a new test
// router.post("/create", async (req, res) => {
//   try {
//     const { title, description, subject, totalQuestions, timeLimit, branch, questions } = req.body;

//     // Validation
//     if (!title || !subject || !totalQuestions || !timeLimit || !branch || !questions) {
//       return res.status(400).json({
//         success: false,
//         error: "All required fields must be filled"
//       });
//     }

//     if (totalQuestions < 1) {
//       return res.status(400).json({
//         success: false,
//         error: "Total questions must be at least 1"
//       });
//     }

//     if (timeLimit < 1) {
//       return res.status(400).json({
//         success: false,
//         error: "Time limit must be at least 1 minute"
//       });
//     }

//     if (questions.length !== totalQuestions) {
//       return res.status(400).json({
//         success: false,
//         error: `Expected ${totalQuestions} questions but received ${questions.length}`
//       });
//     }

//     const newTest = new Test({
//       title,
//       description: description || "",
//       subject,
//       totalQuestions,
//       timeLimit,
//       branch,
//       questions,
//       isPublished: false
//     });

//     await newTest.save();

//     res.json({
//       success: true,
//       message: "Test created successfully",
//       test: newTest
//     });
//   } catch (error) {
//     console.error("Error creating test:", error);
//     console.error("Error message:", error.message);
//     console.error("Error stack:", error.stack);
//     res.status(500).json({
//       success: false,
//       error: error.message || "Failed to create test"
//     });
//   }
// });

// // Publish test to students
// router.put("/publish/:id", async (req, res) => {
//   try {
//     const { id } = req.params;

//     const test = await Test.findByIdAndUpdate(
//       id,
//       { isPublished: true },
//       { new: true }
//     );

//     if (!test) {
//       return res.status(404).json({
//         success: false,
//         error: "Test not found"
//       });
//     }

//     res.json({
//       success: true,
//       message: "Test published successfully",
//       test
//     });
//   } catch (error) {
//     console.error("Error publishing test:", error);
//     res.status(500).json({
//       success: false,
//       error: "Failed to publish test"
//     });
//   }
// });

// // Get all tests (for teacher - includes unpublished)
// router.get("/all", async (req, res) => {
//   try {
//     const tests = await Test.find().sort({ createdAt: -1 });

//     res.json({
//       success: true,
//       tests
//     });
//   } catch (error) {
//     console.error("Error fetching tests:", error);
//     res.status(500).json({
//       success: false,
//       error: "Failed to fetch tests"
//     });
//   }
// });

// // Get published tests (for students)
// router.get("/published", async (req, res) => {
//   try {
//     const { branch } = req.query;

//     // Filter criteria
//     const filter = { isPublished: true };
//     if (branch) {
//       filter.branch = branch;
//     }

//     const tests = await Test.find(filter)
//       .select("-questions.correctAnswer") // Hide correct answers from students
//       .sort({ createdAt: -1 });

//     res.json({
//       success: true,
//       tests
//     });
//   } catch (error) {
//     console.error("Error fetching published tests:", error);
//     res.status(500).json({
//       success: false,
//       error: "Failed to fetch tests"
//     });
//   }
// });

// // Get test by ID (for taking test - no correct answers)
// router.get("/:id", async (req, res) => {
//   try {
//     const { id } = req.params;

//     const test = await Test.findById(id).select("-questions.correctAnswer");

//     if (!test) {
//       return res.status(404).json({
//         success: false,
//         error: "Test not found"
//       });
//     }

//     res.json({
//       success: true,
//       test
//     });
//   } catch (error) {
//     console.error("Error fetching test:", error);
//     res.status(500).json({
//       success: false,
//       error: "Failed to fetch test"
//     });
//   }
// });

// // Delete test
// router.delete("/:id", async (req, res) => {
//   try {
//     const { id } = req.params;

//     await Test.findByIdAndDelete(id);

//     res.json({
//       success: true,
//       message: "Test deleted successfully"
//     });
//   } catch (error) {
//     console.error("Error deleting test:", error);
//     res.status(500).json({
//       success: false,
//       error: "Failed to delete test"
//     });
//   }
// });

// module.exports = router;
const express = require("express");
const router = express.Router();
const Test = require("../models/Test");
const TestResult = require("../models/TestResult");
const FormDataModel = require("../models/FormData");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const pdfParse = require("pdf-parse");
const { generateInterviewQuestion } = require("../services/geminiService");

/* ===============================
   MULTER CONFIG (QUESTION IMAGES)
================================ */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/questions");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"), false);
  },
});

/* ===============================
   CREATE TEST (WITH IMAGES)
================================ */
// router.post("/create", upload.array("images"), async (req, res) => {
//   try {
//     const {
//       title,
//       description,
//       subject,
//       totalQuestions,
//       timeLimit,
//       branches,
//       questions,
//     } = req.body;


//     if (!title || !subject || !totalQuestions || !timeLimit || !branches || !questions) {
//       return res.status(400).json({
//         success: false,
//         error: "All required fields must be filled",
//       });
//     }

//     // const parsedQuestions = JSON.parse(questions);
//     const parsedBranches = JSON.parse(branches);

//     if (parsedQuestions.length !== Number(totalQuestions)) {
//       return res.status(400).json({
//         success: false,
//         error: `Expected ${totalQuestions} questions but received ${parsedQuestions.length}`,
//       });
//     }

//     // Attach images to questions by index
//     const images = req.files || [];

//     // const finalQuestions = parsedQuestions.map((q, index) => ({
//     //   questionText: q.questionText,
//     //   options: q.options,
//     //   correctAnswer: q.correctAnswer,
//     //   image: images[index] ? images[index].filename : "",
//     // }));
//     const finalQuestions = parsedQuestions.map((q, index) => ({
//       question: q.question,               // ✅ REQUIRED FIELD
//       options: q.options,
//       correctAnswer: q.correctAnswer,
//       image: images[index] ? images[index].filename : ""
//     }));

//     // const newTest = new Test({
//     //   title,
//     //   description: description || "",
//     //   subject,
//     //   totalQuestions,
//     //   timeLimit,
//     //   branches: parsedBranches,
//     //   questions: finalQuestions,
//     //   isPublished: false,
//     // });
//     const newTest = new Test({
//   title,
//   description,
//   subject,
//   totalQuestions,
//   timeLimit,
//   branches,   // ✅
//   questions
// });

//     await newTest.save();

//     res.json({
//       success: true,
//       message: "Test created successfully",
//       test: newTest,
//     });
//   } catch (error) {
//     console.error("Error creating test:", error);
//     res.status(500).json({
//       success: false,
//       error: error.message || "Failed to create test",
//     });
//   }
// });
router.post("/create", upload.array("images"), async (req, res) => {
  try {
    const {
      title,
      description,
      subject,
      totalQuestions,
      timeLimit,
      branches,
      questions,
      deadline,
    } = req.body;

    if (!title || !subject || !totalQuestions || !timeLimit || !branches || !questions) {
      return res.status(400).json({
        success: false,
        error: "All required fields must be filled",
      });
    }

    // PARSE JSON STRINGS
    const parsedQuestions = JSON.parse(questions);
    const parsedBranches = JSON.parse(branches);

    if (parsedQuestions.length !== Number(totalQuestions)) {
      return res.status(400).json({
        success: false,
        error: `Expected ${totalQuestions} questions but received ${parsedQuestions.length}`,
      });
    }

    // Attach images
    const images = req.files || [];

    const finalQuestions = parsedQuestions.map((q, index) => ({
      question: q.questionText || q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      image: images[index] ? images[index].filename : "",
    }));

    const newTest = new Test({
      title,
      description: description || "",
      subject,
      totalQuestions,
      timeLimit,
      branches: parsedBranches,
      questions: finalQuestions,
      deadline: deadline ? new Date(deadline) : null,
      isPublished: false,
    });

    await newTest.save();

    res.json({
      success: true,
      message: "Test created successfully",
      test: newTest,
    });
  } catch (error) {
    console.error("Error creating test:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create test",
    });
  }
});


/* ===============================
   PUBLISH TEST
================================ */
router.put("/publish/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const test = await Test.findByIdAndUpdate(
      id,
      { isPublished: true },
      { new: true }
    );

    if (!test) {
      return res.status(404).json({
        success: false,
        error: "Test not found",
      });
    }

    res.json({
      success: true,
      message: "Test published successfully",
      test,
    });
  } catch (error) {
    console.error("Error publishing test:", error);
    res.status(500).json({
      success: false,
      error: "Failed to publish test",
    });
  }
});

/* ===============================
   GET ALL TESTS (TEACHER)
================================ */
router.get("/all", async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50, parseInt(req.query.limit) || 10);
    const skip   = (page - 1) * limit;
    const search = req.query.search || "";

    const filter = {};
    if (search) {
      filter.$or = [
        { title:   { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
      ];
    }

    const [tests, total] = await Promise.all([
      Test.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Test.countDocuments(filter),
    ]);

    // Aggregate submission counts only for the fetched tests
    const testIds = tests.map((t) => t._id);
    const counts = await TestResult.aggregate([
      { $match: { testId: { $in: testIds } } },
      { $group: { _id: "$testId", count: { $sum: 1 } } },
    ]);
    const countMap = {};
    counts.forEach((c) => { countMap[c._id.toString()] = c.count; });

    const testsWithCount = tests.map((t) => ({
      ...t.toObject(),
      submissionCount: countMap[t._id.toString()] || 0,
    }));

    res.json({
      success: true,
      tests: testsWithCount,
      pagination: { page, limit, total, hasMore: page * limit < total },
    });
  } catch (error) {
    console.error("Error fetching tests:", error);
    res.status(500).json({ success: false, error: "Failed to fetch tests" });
  }
});
router.get("/published", async (req, res) => {
  try {
    const { branch, search } = req.query;

    const filter = { isPublished: true };
    if (branch) filter.branches = { $in: [branch] };
    if (search) {
      filter.$or = [
        { title:   { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
      ];
    }

    const tests = await Test.find(filter)
      .select("-questions.correctAnswer")
      .sort({ createdAt: -1 });

    res.json({ success: true, tests });
  } catch (error) {
    console.error("Error fetching published tests:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch tests",
    });
  }
});

/* ===============================
   GET PUBLISHED TESTS (STUDENT)
================================ */
router.get("/published", async (req, res) => {
  try {
    const { branch } = req.query;

    const filter = { isPublished: true };
    // if (branch) filter.branch = branch;
    filter.branches = { $in: [branch] };


    const tests = await Test.find(filter)
      .select("-questions.correctAnswer")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      tests,
    });
  } catch (error) {
    console.error("Error fetching published tests:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch tests",
    });
  }
});

/* ===============================
   GENERATE QUESTIONS FROM PDF
================================ */
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are allowed"), false);
  },
  limits: { fileSize: 15 * 1024 * 1024 },
});

router.post("/generate-from-pdf", pdfUpload.single("pdf"), async (req, res) => {
  try {
    const { subject, numQuestions } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, error: "Please upload a PDF file" });
    }
    if (!subject || !numQuestions) {
      return res.status(400).json({ success: false, error: "Subject and number of questions are required" });
    }

    // Generate ~60% extra questions (minimum +3) so teacher can pick
    const n = parseInt(numQuestions);
    const toGenerate = n + Math.max(3, Math.ceil(n * 0.6));

    // Parse the PDF
    const pdfData = await pdfParse(req.file.buffer);
    const pdfText = pdfData.text.trim();

    if (!pdfText || pdfText.length < 50) {
      return res.status(400).json({
        success: false,
        error: "PDF appears empty or is image-only. Please upload a text-based PDF.",
      });
    }

    const prompt = `You are an expert exam question generator. Based on the PDF content below, generate exactly ${toGenerate} multiple-choice questions for the subject: "${subject}".

Rules:
- Each question must have exactly 4 options labeled A, B, C, D
- Exactly one option must be the correct answer
- Base questions ONLY on the provided PDF content
- Make questions educational, clear, and unambiguous
- Include a mix of easy, medium, and hard difficulty

Return ONLY a valid JSON array — no markdown, no code fences, no extra text:
[
  {
    "question": "Question text here?",
    "options": ["A. First option", "B. Second option", "C. Third option", "D. Fourth option"],
    "correct": "A",
    "explanation": "Brief explanation of why this answer is correct"
  }
]

PDF Content:
${pdfText.substring(0, 12000)}`;

    const raw = await generateInterviewQuestion(prompt);

    // Strip potential markdown code fences Gemini may add
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    }

    let questions;
    try {
      questions = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ success: false, error: "AI returned an invalid response. Please try again." });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(500).json({ success: false, error: "No questions were generated. Please try again." });
    }

    res.json({ success: true, questions });
  } catch (error) {
    console.error("PDF generation error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to generate questions from PDF" });
  }
});

/* ===============================
   GET PENDING TESTS FOR STUDENT (paginated)
   ?type=active|outdated  &page=  &limit=  &search=
================================ */
router.get("/pending/:rollNo", async (req, res) => {
  try {
    const { rollNo } = req.params;
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit) || 9));
    const search = req.query.search || "";
    const type   = req.query.type || "active"; // "active" | "outdated"

    const student = await FormDataModel.findOne({ rollNo });
    if (!student) return res.status(404).json({ success: false, error: "Student not found" });

    const submitted = await TestResult.find({ rollNo }).select("testId");
    const submittedIds = submitted.map(r => new mongoose.Types.ObjectId(r.testId));

    const now = new Date();
    const filter = {
      isPublished: true,
      branches: { $in: [student.branch] },
      _id: { $nin: submittedIds },
    };

    if (type === "active") {
      filter.$or = [{ deadline: null }, { deadline: { $exists: false } }, { deadline: { $gte: now } }];
    } else {
      filter.deadline = { $lt: now };
    }

    if (search) {
      const sq = { $or: [{ title: { $regex: search, $options: "i" } }, { subject: { $regex: search, $options: "i" } }] };
      filter.$and = [sq];
    }

    const [tests, total] = await Promise.all([
      Test.find(filter).select("-questions.correctAnswer").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Test.countDocuments(filter),
    ]);

    res.json({ success: true, tests, total, page, hasMore: page * limit < total });
  } catch (err) {
    console.error("❌ Pending tests error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch pending tests" });
  }
});

/* ===============================
   GET TEST BY ID (TAKE TEST)
================================ */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const test = await Test.findById(id).select("-questions.correctAnswer");

    if (!test) {
      return res.status(404).json({
        success: false,
        error: "Test not found",
      });
    }

    res.json({
      success: true,
      test,
    });
  } catch (error) {
    console.error("Error fetching test:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch test",
    });
  }
});

/* ===============================
   DELETE TEST
================================ */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await Test.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Test deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting test:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete test",
    });
  }
});

module.exports = router;
