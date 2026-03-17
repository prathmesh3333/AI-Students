import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "./StartMockInterview.css";

const StartMockInterview = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    role: "",
    experience: "",
  });

  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadError("");

    if (file.type !== "application/pdf") {
      setUploadError("Please upload a PDF file only");
      setResumeFile(null);
      setResumeText("");
      e.target.value = null;
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size should be less than 5MB");
      setResumeFile(null);
      setResumeText("");
      e.target.value = null;
      return;
    }

    setResumeFile(file);
    setUploadingResume(true);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append("resume", file);

      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:5000/api/interview/parse-resume",
        formDataUpload,
        { headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setResumeText(response.data.resumeText);
        setUploadError("");
      }
    } catch (error) {
      console.error("Error uploading resume:", error);
      setUploadError("Failed to parse resume. Please try again with a different file.");
      setResumeFile(null);
      setResumeText("");
    } finally {
      setUploadingResume(false);
    }
  };

  const handleStart = async () => {
    const { role, experience } = formData;

    if (!role || !experience) {
      alert("⚠️ Please fill out all fields before starting your mock interview!");
      return;
    }

    if (!resumeFile || !resumeText) {
      alert("⚠️ Please upload your resume (PDF) before starting the interview. It helps us create personalized questions!");
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem("token");
      const res = await axios.post(
        "http://localhost:5000/api/interview/start",
        { ...formData, resumeText },
        { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
      );

      navigate("/mock-session", {
        state: {
          ...formData,
          resumeText,
          interviewData: res.data,
        },
      });
    } catch (error) {
      console.error("❌ Error starting mock interview:", error);
      alert("Unable to start mock interview. Please ensure backend is running on port 5000.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="start-mock-container">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner">
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
            </div>
            <h3 className="loading-title">Preparing Your Interview...</h3>
            <p className="loading-subtitle">AI is crafting personalized questions</p>
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}

      <div className="start-card">
        <h2 className="text-center mb-4 fw-bold">Start a New Mock Interview</h2>

        {/* Role Input */}
        <div className="mb-4">
          <label className="form-label fw-semibold">Role you want to interview for</label>
          <input
            type="text"
            className="form-control"
            name="role"
            placeholder="e.g., Frontend Developer"
            value={formData.role}
            onChange={handleChange}
          />
        </div>

        {/* Experience Input */}
        <div className="mb-4">
          <label className="form-label fw-semibold">Experience you have in this field</label>
          <input
            type="text"
            className="form-control"
            name="experience"
            placeholder="e.g., 6 months, 2 years, Fresher"
            value={formData.experience}
            onChange={handleChange}
          />
        </div>

        {/* Resume Upload */}
        <div className="mb-4">
          <label className="form-label fw-semibold">
            Upload Resume (PDF) <span className="text-danger">*Required</span>
          </label>
          <input
            type="file"
            className="form-control"
            accept=".pdf"
            onChange={handleResumeUpload}
            disabled={uploadingResume}
          />

          {uploadingResume && (
            <div className="alert alert-info mt-2 mb-0 py-2 d-flex align-items-center" role="alert">
              <div className="spinner-border spinner-border-sm me-2" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <small>Uploading and parsing your resume...</small>
            </div>
          )}

          {uploadError && !uploadingResume && (
            <div className="alert alert-danger mt-2 mb-0 py-2 d-flex align-items-center" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              <small>{uploadError}</small>
            </div>
          )}

          {resumeFile && !uploadingResume && !uploadError && (
            <div className="alert alert-success mt-2 mb-0 py-2 d-flex align-items-center" role="alert">
              <i className="bi bi-check-circle-fill me-2"></i>
              <small>
                <strong>Resume uploaded successfully!</strong> {resumeFile.name}
              </small>
            </div>
          )}

          {!resumeFile && !uploadingResume && !uploadError && (
            <small className="text-muted d-block mt-2">
              <i className="bi bi-info-circle me-1"></i>
              Upload your resume to get personalized interview questions based on your experience and skills.
            </small>
          )}
        </div>

        <div className="text-center mt-4">
          <button
            onClick={handleStart}
            className="btn btn-dark btn-lg start-btn"
            disabled={loading}
          >
            {loading ? "Starting..." : "Start Interview"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartMockInterview;
