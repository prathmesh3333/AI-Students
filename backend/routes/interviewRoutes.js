const express = require("express");
const multer = require("multer");
const path = require("path");
const {
  startMockInterview,
  handleInterviewResponse,
  generateInterviewSummary,
  saveInterview,
  getUserInterviews,
  getInterviewById,
  parseResume,
  generateMockTest,
} = require("../controllers/interviewController");
const { streamInterviewResponse } = require("../services/geminiService");

const router = express.Router();

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

router.get("/student/:rollNo", getUserInterviews);
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === ".pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

router.post("/parse-resume", upload.single("resume"), parseResume);
router.post("/start", startMockInterview);
router.post("/respond", handleInterviewResponse);

// ── Streaming respond (SSE) ──────────────────────────────────
router.post("/respond-stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  try {
    const { userMessage, role, experience, resumeText, previousMessages } = req.body;

    // Lean conversation history — last 4 messages only
    const history = (previousMessages || [])
      .slice(-4)
      .map(m => `${m.sender === "user" ? "Candidate" : "Interviewer"}: ${m.text}`)
      .join("\n");

    // Only include resume on the first follow-up (no history yet); after that the conversation carries context
    const isFirstFollowUp = (previousMessages || []).length <= 1;
    const resumeCtx = (resumeText && isFirstFollowUp) ? `\nResume context: ${resumeText.substring(0, 600)}` : "";

    const prompt = `You are a senior interviewer conducting a technical interview for ${role} (${experience} exp).${resumeCtx}

${history ? `Recent conversation:\n${history}\n` : ""}
Candidate just said: "${userMessage}"

Reply with:
1. One short honest reaction to their answer (1 sentence max)
2. One sharp follow-up interview question

Keep it concise and professional. No filler phrases.`;

    await streamInterviewResponse(prompt, (chunk) => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }
    });

    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }
  } catch (error) {
    console.error("❌ respond-stream error:", error.message);
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});
router.post("/summary", generateInterviewSummary);
router.post("/save", saveInterview);
router.post("/mock-test", generateMockTest);
router.get("/user/:rollNo", getUserInterviews);
router.get("/:id", getInterviewById);
module.exports = router;
