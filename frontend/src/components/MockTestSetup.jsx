import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./MockTestSetup.css";

const MockTestSetup = () => {
  const navigate = useNavigate();

  const branch = localStorage.getItem("studentBranch") || "";
  const [subject, setSubject]           = useState("");
  const [difficulty, setDifficulty]     = useState("");
  const [numQuestions, setNumQuestions] = useState(10);
  const [pdfFile, setPdfFile]           = useState(null);
  const [pdfText, setPdfText]           = useState("");
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadError, setUploadError]   = useState("");
  const [loading, setLoading]           = useState(false);

  // ── PDF Upload ──────────────────────────────────────────────
  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadError("");

    if (file.type !== "application/pdf") {
      setUploadError("Please upload a PDF file only.");
      setPdfFile(null);
      setPdfText("");
      e.target.value = null;
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size must be less than 5 MB.");
      setPdfFile(null);
      setPdfText("");
      e.target.value = null;
      return;
    }

    setPdfFile(file);
    setUploadingPdf(true);

    try {
      const fd = new FormData();
      fd.append("resume", file); // reusing the existing parse-resume endpoint

      const res = await axios.post(
        "http://localhost:5000/api/interview/parse-resume",
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (res.data.success) {
        setPdfText(res.data.resumeText);
        setUploadError("");
      }
    } catch (err) {
      console.error("PDF parse error:", err);
      setUploadError("Failed to parse PDF. Please try a different file.");
      setPdfFile(null);
      setPdfText("");
    } finally {
      setUploadingPdf(false);
    }
  };

  // ── Start Test ──────────────────────────────────────────────
  const handleStart = async () => {
    if (!branch || !subject.trim() || !difficulty) {
      alert("⚠️ Please fill out all fields before starting!");
      return;
    }
    if (!pdfFile || !pdfText) {
      alert("⚠️ Please upload your subject PDF before starting the test.");
      return;
    }

    try {
      setLoading(true);

      const res = await axios.post(
        "http://localhost:5000/api/interview/mock-test",
        { branch, subject, difficulty, pdfText, numQuestions }
      );

      if (res.data.success) {
        navigate("/pre-test-lobby", {
          state: { type: "mock", branch, subject, difficulty, numQuestions, questions: res.data.questions },
        });
      }
    } catch (err) {
      console.error("Mock test error:", err);
      alert("Unable to generate test. Please ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mock-setup-container">
      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner">
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
            </div>
            <h3 className="loading-title">Generating Your Test…</h3>
            <p className="loading-subtitle">AI is crafting questions from your PDF</p>
            <div className="loading-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      )}

      {/* Back button */}
      <button className="mock-back-btn" onClick={() => navigate("/test-selection")}>
        <i className="bi bi-arrow-left me-1"></i> Back
      </button>

      <div className="start-card">
        <h2 className="text-center mb-4 fw-bold">Start a New Mock Test</h2>

        {/* Branch — pre-filled from registration, read-only */}
        <div className="mb-4">
          <label className="form-label fw-semibold">Branch</label>
          <div className="branch-display">
            <i className="bi bi-building me-2"></i>
            {branch || "Not found — please log in again"}
          </div>
        </div>

        {/* Subject */}
        <div className="mb-4">
          <label className="form-label fw-semibold">Subject Name</label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g., Data Structures, Thermodynamics, DBMS"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        {/* Difficulty */}
        <div className="mb-4">
          <label className="form-label fw-semibold">Select Difficulty</label>
          <div className="btn-group-container">
            {["Easy", "Medium", "Hard"].map((level) => (
              <button
                key={level}
                type="button"
                className={`btn ${difficulty === level ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setDifficulty(level)}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Number of Questions */}
        <div className="mb-4">
          <label className="form-label fw-semibold">
            Number of Questions &nbsp;
            <span className="num-q-badge">{numQuestions} Qs</span>
          </label>
          <div className="btn-group-container">
            {[5, 10, 15, 20].map((n) => (
              <button
                key={n}
                type="button"
                className={`btn ${numQuestions === n ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setNumQuestions(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* PDF Upload */}
        <div className="mb-4">
          <label className="form-label fw-semibold">
            Upload Subject PDF <span className="text-danger">*Required</span>
          </label>
          <input
            type="file"
            className="form-control"
            accept=".pdf"
            onChange={handlePdfUpload}
            disabled={uploadingPdf}
          />

          {uploadingPdf && (
            <div className="alert alert-info mt-2 mb-0 py-2 d-flex align-items-center" role="alert">
              <div className="spinner-border spinner-border-sm me-2" role="status"></div>
              <small>Uploading and reading your PDF…</small>
            </div>
          )}
          {uploadError && !uploadingPdf && (
            <div className="alert alert-danger mt-2 mb-0 py-2 d-flex align-items-center" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              <small>{uploadError}</small>
            </div>
          )}
          {pdfFile && !uploadingPdf && !uploadError && (
            <div className="alert alert-success mt-2 mb-0 py-2 d-flex align-items-center" role="alert">
              <i className="bi bi-check-circle-fill me-2"></i>
              <small><strong>PDF uploaded!</strong> {pdfFile.name}</small>
            </div>
          )}
          {!pdfFile && !uploadingPdf && !uploadError && (
            <small className="text-muted d-block mt-2">
              <i className="bi bi-info-circle me-1"></i>
              Upload your subject notes or textbook PDF — questions will be generated from its content.
            </small>
          )}
        </div>

        {/* Submit */}
        <div className="text-center mt-4">
          <button
            onClick={handleStart}
            className="btn btn-dark btn-lg start-btn"
            disabled={loading || uploadingPdf}
          >
            {loading ? "Generating…" : "Start Mock Test"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MockTestSetup;
