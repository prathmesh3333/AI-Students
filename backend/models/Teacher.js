const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const TeacherSchema = new mongoose.Schema(
  {
    name:  { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

TeacherSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

TeacherSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("Teacher", TeacherSchema);
