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

// ── POST /api/interview/analyse-resume ──────────────────────
router.post("/analyse-resume", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Resume PDF is required." });

    const fs       = require("fs");
    const pdfParse = require("pdf-parse");

    const buffer     = fs.readFileSync(req.file.path);
    const pdfData    = await pdfParse(buffer);
    const resumeText = pdfData.text.trim();

    // cleanup uploaded file
    try { fs.unlinkSync(req.file.path); } catch (_) {}

    if (!resumeText || resumeText.length < 80) {
      return res.status(400).json({ error: "Could not extract text. Please upload a text-based PDF." });
    }

    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are an expert resume reviewer and ATS specialist with 15 years of experience in campus placements and technical hiring at top companies.

Analyse the following resume and return a brutally honest, detailed assessment.

RESUME TEXT:
${resumeText.substring(0, 4500)}

Return ONLY valid JSON — no markdown fences, no explanation, just raw JSON — with this exact structure:
{
  "overallScore": <integer 0-100>,
  "atsScore": <integer 0-100>,
  "sections": {
    "contact":    { "score": <0-100>, "feedback": "<1-2 sentence specific feedback>", "tips": ["<specific fix to reach 100>", "<specific fix>", "<specific fix>"] },
    "summary":    { "score": <0-100>, "feedback": "<1-2 sentence specific feedback>", "tips": ["<specific fix to reach 100>", "<specific fix>", "<specific fix>"] },
    "experience": { "score": <0-100>, "feedback": "<1-2 sentence specific feedback>", "tips": ["<specific fix to reach 100>", "<specific fix>", "<specific fix>"] },
    "education":  { "score": <0-100>, "feedback": "<1-2 sentence specific feedback>", "tips": ["<specific fix to reach 100>", "<specific fix>", "<specific fix>"] },
    "skills":     { "score": <0-100>, "feedback": "<1-2 sentence specific feedback>", "tips": ["<specific fix to reach 100>", "<specific fix>", "<specific fix>"] },
    "projects":   { "score": <0-100>, "feedback": "<1-2 sentence specific feedback>", "tips": ["<specific fix to reach 100>", "<specific fix>", "<specific fix>"] }
  },
  "strengths": ["<specific strength>", "<specific strength>", "<specific strength>"],
  "weaknesses": ["<specific weakness>", "<specific weakness>", "<specific weakness>", "<specific weakness>"],
  "presentKeywords": ["<keyword found in resume>", ... list up to 12 relevant tech/domain keywords actually found],
  "missingKeywords": ["<important missing keyword>", ... list up to 10 highly recommended missing keywords for tech/campus roles],
  "suggestions": ["<specific actionable improvement>", "<specific actionable improvement>", "<specific actionable improvement>", "<specific actionable improvement>", "<specific actionable improvement>"],
  "verdict": "<2-3 sentences of direct, honest assessment — do not sugarcoat>"
}`;

    const result  = await model.generateContent(prompt);
    let   rawText = result.response.text().trim();

    // Strip markdown fences if model wraps output
    rawText = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

    let analysis;
    try {
      analysis = JSON.parse(rawText);
    } catch {
      return res.status(500).json({ error: "Analysis parsing failed. Please try again." });
    }

    res.json({ success: true, analysis });
  } catch (err) {
    console.error("Resume analysis error:", err.message);
    res.status(500).json({ error: "Analysis failed. Please try again." });
  }
});

module.exports = router;
