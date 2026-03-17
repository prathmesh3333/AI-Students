const mongoose = require("mongoose");

const TestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: false,
    default: ""
  },
  subject: {
    type: String,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  timeLimit: {
    type: Number,
    required: true,
    min: 1,
    comment: "Time limit in minutes"
  },
  // branch: {
  //   type: String,
  //   required: true,
  //   enum: ["Computer Engineering", "IT", "EXTC", "Electrical", "Mechanical"]
  // },
  branches: {
  type: [String],
  enum: ["Computer Engineering", "IT", "EXTC", "Electrical", "Mechanical"],
  required: true
},

  questions: [{
    question: {
      type: String,
      required: true
    },
    image: {          // 🔽 ADD THIS
    type: String,
    default: ""
  },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: function(arr) {
          return arr.length === 4;
        },
        message: "Must have exactly 4 options"
      }
    },
    correctAnswer: {
      type: Number,
      required: true,
      min: 0,
      max: 3
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium"
    }
  }],
  deadline: {
    type: Date,
    default: null,
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: String,
    default: "Teacher"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Test", TestSchema);
