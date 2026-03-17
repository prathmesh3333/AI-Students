require("dotenv").config();
const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const interviewRoutes = require("./routes/interviewRoutes");
const authRoutes = require("./routes/authRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const adminRoutes = require("./routes/adminRoutes");
const testRoutes = require("./routes/testRoutes");
const testResultRoutes = require("./routes/testResultRoutes");
const path = require("path");
const questionRoutes = require("./routes/questionRoutes");
const { requireAuth } = require("./middleware/authMiddleware");



const app = express();
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// ---------------- CORS ----------------
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// ---------------- MongoDB Connection ----------------
mongoose
  .connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/practice_mern", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ MongoDB connected");
    await migrateEnvTeacher();
  })
  .catch((err) => console.log("❌ MongoDB connection error:", err));

// ---------------- Startup: migrate env-var teacher into DB ----------------
async function migrateEnvTeacher() {
  const email    = process.env.TEACHER_EMAIL;
  const password = process.env.TEACHER_PASSWORD;
  const name     = process.env.TEACHER_NAME || "Teacher";
  if (!email || !password) return;

  const Teacher = require("./models/Teacher");
  const Test    = require("./models/Test");

  const existing = await Teacher.findOne({ email: email.toLowerCase() });
  if (!existing) {
    const teacher = new Teacher({ name, email, password });
    await teacher.save();
    console.log(`✅ Env-var teacher migrated to DB: ${email}`);

    // Attribute all legacy "Teacher" tests to this email
    const result = await Test.updateMany(
      { createdBy: "Teacher" },
      { $set: { createdBy: email.toLowerCase() } }
    );
    if (result.modifiedCount > 0) {
      console.log(`✅ ${result.modifiedCount} legacy test(s) attributed to ${email}`);
    }
  }
}

// ---------------- Modular Routes ----------------
// Public routes (no token needed)
app.use("/api/auth", authRoutes);
app.use("/api/teacher", teacherRoutes);  // teacher login is public; protected routes enforce requireTeacher internally
app.use("/api/admin", adminRoutes);       // admin login is public; protected routes enforce requireAdmin internally

// Protected routes (valid JWT required for all)
app.use("/api/interview", requireAuth, interviewRoutes);
app.use("/api/test", requireAuth, testRoutes);
app.use("/api/test-result", requireAuth, testResultRoutes);
app.use("/api/question", requireAuth, questionRoutes);

app.use("/uploads", express.static("uploads"));

// ---------------- Default Route ----------------
app.get("/", (req, res) => {
  res.send("🚀 Backend is running successfully!");
});

// ---------------- Start Server ----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, "127.0.0.1", () => {
  console.log(`🚀 Server running at http://127.0.0.1:${PORT}`);
});