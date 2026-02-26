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
router.post("/summary", generateInterviewSummary);
router.post("/save", saveInterview);
router.post("/mock-test", generateMockTest);
router.get("/user/:rollNo", getUserInterviews);
router.get("/:id", getInterviewById);
module.exports = router;
