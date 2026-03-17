import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./InterviewSummary.css";

const ScoreRing = ({ score, label, color }) => {
  const pct = (score / 10) * 100;
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;

  return (
    <div className="score-ring-wrap">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
        <text x="50" y="54" textAnchor="middle" fontSize="18" fontWeight="700" fill={color}>
          {score}
        </text>
      </svg>
      <p className="score-label">{label}</p>
    </div>
  );
};

const InterviewSummary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { summary, interviewData, isAlreadySaved } = location.state || {};

  const [parsedSummary, setParsedSummary] = useState({
    confidence: "N/A",
    nervousness: "N/A",
    weakAreas: [],
    strongAreas: [],
    overallSummary: "",
    technicalScore: 0,
    communicationScore: 0,
    recommendation: "",
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!summary) return;
    try {
      if (typeof summary === "object") {
        setParsedSummary({
          confidence: summary.confidence ?? "N/A",
          nervousness: summary.nervousness ?? "N/A",
          weakAreas: summary.weakAreas ?? [],
          strongAreas: summary.strongAreas ?? [],
          overallSummary: summary.overallSummary ?? "",
          technicalScore: Number(summary.technicalScore) || 0,
          communicationScore: Number(summary.communicationScore) || 0,
          recommendation: summary.recommendation ?? "",
        });
        return;
      }
      if (typeof summary === "string") {
        const clean = summary.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(clean);
        setParsedSummary({
          confidence: parsed.confidence ?? "N/A",
          nervousness: parsed.nervousness ?? "N/A",
          weakAreas: parsed.weakAreas ?? [],
          strongAreas: parsed.strongAreas ?? [],
          overallSummary: parsed.overallSummary ?? "",
          technicalScore: Number(parsed.technicalScore) || 0,
          communicationScore: Number(parsed.communicationScore) || 0,
          recommendation: parsed.recommendation ?? "",
        });
      }
    } catch (err) {
      console.error("Error parsing summary JSON:", err);
    }
  }, [summary]);

  useEffect(() => {
    if (!summary) return;
    if (saving || saved) return;
    if (isAlreadySaved) return;
    const timer = setTimeout(() => { handleSaveInterview(); }, 600);
    return () => clearTimeout(timer);
  }, [parsedSummary]);

  const handleSaveInterview = async () => {
    try {
      if (saving || saved) return;
      setSaving(true);
      const rollNo = localStorage.getItem("rollNo");
      const studentName = localStorage.getItem("studentName");
      if (!rollNo || !studentName) {
        alert("User information not found. Please login again.");
        navigate("/login");
        return;
      }
      const today = new Date().toISOString().split("T")[0];
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:5000/api/interview/save",
        {
          rollNo,
          studentName,
          date: today,
          role: interviewData?.role || "N/A",
          experience: interviewData?.experience || "N/A",
          confidence: parsedSummary.confidence,
          nervousness: parsedSummary.nervousness,
          weakAreas: parsedSummary.weakAreas,
          strongAreas: parsedSummary.strongAreas,
          focusAreas: [],
          overallSummary: parsedSummary.overallSummary,
          technicalScore: parsedSummary.technicalScore,
          communicationScore: parsedSummary.communicationScore,
          recommendation: parsedSummary.recommendation,
          resumeText: interviewData?.resumeText || "",
          messages: interviewData?.messages || [],
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSaved(true);
    } catch (error) {
      console.error("Error saving interview:", error);
    } finally {
      setSaving(false);
    }
  };

  const rec = parsedSummary.recommendation || summary?.recommendation || "";
  const recColor =
    rec === "Highly Recommended" ? "#10b981" :
    rec === "Recommended" ? "#3b82f6" : "#ef4444";

  const confColor =
    parsedSummary.confidence === "High" ? "#10b981" :
    parsedSummary.confidence === "Medium" ? "#f59e0b" : "#ef4444";

  const nervColor =
    parsedSummary.nervousness === "Low" ? "#10b981" :
    parsedSummary.nervousness === "Medium" ? "#f59e0b" : "#ef4444";

  return (
    <div className="is-page">

      {/* ── Hero Header ── */}
      <div className="is-hero">
        <div className="is-hero-inner">
          <div className="is-hero-left">
            <p className="is-eyebrow">Performance Report</p>
            <h1 className="is-hero-title">{interviewData?.role || "Mock Interview"}</h1>
            <p className="is-hero-sub">
              {interviewData?.experience && <span>{interviewData.experience} experience</span>}
            </p>
          </div>
          <div className="is-rec-badge" style={{ borderColor: recColor, color: recColor }}>
            <span className="is-rec-icon">
              {rec === "Highly Recommended" ? "★" : rec === "Recommended" ? "✓" : "✗"}
            </span>
            <span>{rec || "N/A"}</span>
          </div>
        </div>
        {saving && <p className="is-saving-note">Saving report...</p>}
        {saved && <p className="is-saving-note saved">Report saved ✓</p>}
      </div>

      <div className="is-body">

        {/* ── Scores ── */}
        <div className="is-card is-scores-card">
          <h2 className="is-card-title">Performance Scores</h2>
          <div className="is-scores-row">
            <ScoreRing
              score={parsedSummary.technicalScore || 0}
              label="Technical"
              color="#3b82f6"
            />
            <div className="is-scores-divider" />
            <ScoreRing
              score={parsedSummary.communicationScore || 0}
              label="Communication"
              color="#8b5cf6"
            />
            <div className="is-scores-divider" />
            <div className="is-sentiment-col">
              <div className="is-sentiment-item">
                <span className="is-sentiment-label">Confidence</span>
                <span className="is-sentiment-pill" style={{ background: confColor }}>
                  {parsedSummary.confidence}
                </span>
              </div>
              <div className="is-sentiment-item">
                <span className="is-sentiment-label">Nervousness</span>
                <span className="is-sentiment-pill" style={{ background: nervColor }}>
                  {parsedSummary.nervousness}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Overall Summary ── */}
        <div className="is-card">
          <h2 className="is-card-title">Overall Assessment</h2>
          <p className="is-summary-text">
            {parsedSummary.overallSummary || "No summary available."}
          </p>
        </div>

        {/* ── Areas Grid ── */}
        <div className="is-areas-grid">
          {/* Strong Areas */}
          <div className="is-card is-strong-card">
            <h2 className="is-card-title">
              <span className="is-area-icon strong">↑</span> Strong Areas
            </h2>
            <ul className="is-area-list">
              {parsedSummary.strongAreas?.length ? (
                parsedSummary.strongAreas.map((area, i) => (
                  <li key={i} className="is-area-item strong-item">
                    <span className="is-area-dot strong-dot" />
                    {area}
                  </li>
                ))
              ) : (
                <li className="is-area-empty">No specific areas identified.</li>
              )}
            </ul>
          </div>

          {/* Weak Areas */}
          <div className="is-card is-weak-card">
            <h2 className="is-card-title">
              <span className="is-area-icon weak">↓</span> Areas to Improve
            </h2>
            <ul className="is-area-list">
              {parsedSummary.weakAreas?.length ? (
                parsedSummary.weakAreas.map((area, i) => (
                  <li key={i} className="is-area-item weak-item">
                    <span className="is-area-dot weak-dot" />
                    {area}
                  </li>
                ))
              ) : (
                <li className="is-area-empty">No specific areas identified.</li>
              )}
            </ul>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="is-actions">
          <button className="is-btn is-btn-primary" onClick={() => navigate("/mock-interview")}>
            View Dashboard
          </button>
          <button className="is-btn is-btn-secondary" onClick={() => navigate("/home")}>
            Go to Home
          </button>
        </div>

      </div>
    </div>
  );
};

export default InterviewSummary;
