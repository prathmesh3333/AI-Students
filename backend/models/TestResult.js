const mongoose = require("mongoose");

const TestResultSchema = new mongoose.Schema({
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Test",
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  rollNo: {
    type: String,
    required: true
  },
  answers: [{
    questionIndex: {
      type: Number,
      required: true
    },
    selectedAnswer: {
      type: Number,
      required: true
    }
  }],
  score: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  correctAnswers: {
    type: Number,
    required: true
  },
  timeTaken: {
    type: Number,
    comment: "Time taken in seconds"
  },
  tabSwitchCount: {
    type: Number,
    default: 0
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

TestResultSchema.index({ testId: 1, rollNo: 1 }, { unique: true });

module.exports = mongoose.model("TestResult", TestResultSchema);
