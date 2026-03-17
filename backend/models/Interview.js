const mongoose = require("mongoose");

const InterviewSchema = new mongoose.Schema({
  rollNo: { type: String, required: true, trim: true },
  studentName: { type: String, required: true, trim: true },
  date: { type: String, required: true },
  role: { type: String, required: true },
  company: { type: String },
  experience: { type: String },
  topic: { type: String },
  difficulty: { type: String },
  confidence: { type: String, required: true },
  nervousness: { type: String, required: true },
  weakAreas: { type: [String], default: [] },
  strongAreas: { type: [String], default: [] },
  focusAreas: { type: [String], default: [] },
  overallSummary: { type: String, default: "" },
  technicalScore: { type: Number, default: 0 },
  communicationScore: { type: Number, default: 0 },
  recommendation: { type: String, default: "" },
  resumeText: { type: String, default: "" },
  messages: { type: Array, default: [] }
}, { timestamps: true });

module.exports = mongoose.model("Interview", InterviewSchema);
