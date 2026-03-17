const mongoose = require("mongoose");

const ViolationSnapshotSchema = new mongoose.Schema({
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Test",
    required: true
  },
  rollNo: {
    type: String,
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  violationType: {
    type: String,
    enum: ["NO_FACE", "MULTIPLE_FACE", "TAB_SWITCH"],
    required: true
  },
  imageData: {
    type: String, // base64 data URL
    required: true
  },
  capturedAt: {
    type: Date,
    default: Date.now
  }
});

ViolationSnapshotSchema.index({ testId: 1, rollNo: 1 });

module.exports = mongoose.model("ViolationSnapshot", ViolationSnapshotSchema);
