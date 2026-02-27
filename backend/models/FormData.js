const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const FormDataSchema = new mongoose.Schema({
  rollNo: { type: String, required: true, unique: true, trim: true },
  name:   { type: String, required: true, trim: true },
  email:  { type: String, trim: true, lowercase: true },
  password: { type: String, required: true },
  branch: {
    type: String,
    required: true,
    enum: ["Computer Engineering", "IT", "EXTC", "Electrical", "Mechanical"]
  },
}, { timestamps: true });

// Hash password before saving
FormDataSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare passwords
FormDataSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (err) {
    throw new Error("Error comparing passwords");
  }
};

module.exports = mongoose.model("log_reg_form", FormDataSchema);