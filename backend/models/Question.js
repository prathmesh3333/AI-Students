// const mongoose = require("mongoose");

// const QuestionSchema = new mongoose.Schema({
//   subject: {
//     type: String,
//     required: true,
//     enum: ["JavaScript Fundamentals", "React Basics", "Data Structures", "Algorithms", "Behavioral Test"]
//   },
//   question: {
//     type: String,
//     required: true
//   },
//   options: {
//     type: [String],
//     required: true,
//     validate: {
//       validator: function(arr) {
//         return arr.length === 4;
//       },
//       message: "Must have exactly 4 options"
//     }
//   },
//   correctAnswer: {
//     type: Number,
//     required: true,
//     min: 0,
//     max: 3
//   },
//   difficulty: {
//     type: String,
//     enum: ["Easy", "Medium", "Hard"],
//     default: "Medium"
//   },
//   createdBy: {
//     type: String,
//     default: "Teacher"
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   }
// });

// module.exports = mongoose.model("Question", QuestionSchema);
const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema({
  testId: mongoose.Schema.Types.ObjectId,

  branch: {
    type: String,
    default: "General"
  },
  company: String,
  year: String,
  position: String,

  questionText: {
    type: String,
    required: true,
  },

  image: {
    type: String,
    default: "",
  },

  options: {
    type: [String],
    default: []
  },

  correctAnswer: {
    type: Number,
    default: null
  }
}, { timestamps: true });


module.exports = mongoose.model("Question", QuestionSchema);
