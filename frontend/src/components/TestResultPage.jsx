import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./TestResultPage.css";

const ProcRow = ({ icon, label, count, color }) => (
  <div className={`trp-proc-row ${count > 0 ? "trp-proc-flagged" : ""}`}>
    <div className="trp-proc-icon" style={{ background: color + "22", color }}>
      <i className={`bi ${icon}`}></i>
    </div>
    <span className="trp-proc-label">{label}</span>
    <span className="trp-proc-count" style={{ color: count > 0 ? color : "#94a3b8" }}>
      {count}
    </span>
  </div>
);

const TestResultPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { result, testTitle, tabSwitchCount, violations } = location.state || {};

  const proctorData = violations || {
    NO_FACE: 0, MULTIPLE_FACE: 0, VOICE_DETECTED: 0, TAB_SWITCH: 0,
  };

  if (!result) {
    return (
      <div className="trp-wrapper">
        <div className="trp-empty">
          <i className="bi bi-clipboard-x"></i>
          <h3>No result data found</h3>
          <button className="trp-btn-primary" onClick={() => navigate("/start-test")}>
            Go to Tests
          </button>
        </div>
      </div>
    );
  }

  const pct     = result.score;
  const correct = result.correctAnswers;
  const total   = result.totalQuestions;
  const wrong   = total - correct;
  const isPassed = pct >= 50;

  const grade =
    pct >= 90 ? "Outstanding" :
    pct >= 70 ? "Great Job"   :
    pct >= 50 ? "Passed"      : "Keep Trying";

  const gradeColor =
    pct >= 90 ? "#10b981" :
    pct >= 70 ? "#3b82f6" :
    pct >= 50 ? "#f59e0b" : "#ef4444";

  const perfEmoji =
    pct >= 90 ? "🏆" : pct >= 70 ? "⭐" : pct >= 50 ? "👍" : "💪";

  const perfSub =
    pct >= 90 ? "You've demonstrated excellent understanding of the subject."  :
    pct >= 70 ? "You've shown a great grasp of the concepts."                  :
    pct >= 50 ? "You passed! Keep practising to improve further."              :
                "Don't give up! Review the material and try again.";

  // SVG ring  r=52 → C = 2πr ≈ 326.7
  const C   = 326.7;
  const arc = (pct / 100) * C;

  const totalViolations =
    (proctorData.NO_FACE       || 0) +
    (proctorData.MULTIPLE_FACE || 0) +
    (proctorData.VOICE_DETECTED|| 0) +
    (tabSwitchCount            || 0);

  return (
    <div className="trp-wrapper">

      {/* Navbar */}
      <nav className="trp-nav">
        <button className="trp-back" onClick={() => navigate("/start-test")}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <span className="trp-nav-title">Test Result</span>
        <button className="trp-home-btn" onClick={() => navigate("/home")}>
          <i className="bi bi-house me-1"></i>Home
        </button>
      </nav>

      <div className="trp-body">

        {/* ── Score Card ── */}
        <div className="trp-score-card">

          {/* Ring */}
          <div className="trp-ring-wrap">
            <svg viewBox="0 0 120 120" className="trp-ring-svg">
              <circle cx="60" cy="60" r="52" className="trp-ring-bg" />
              <circle
                cx="60" cy="60" r="52"
                className="trp-ring-fill"
                style={{ stroke: gradeColor, strokeDasharray: `${arc} ${C}` }}
              />
            </svg>
            <div className="trp-ring-inner">
              <span className="trp-pct" style={{ color: gradeColor }}>{pct}%</span>
              <span
                className="trp-grade-chip"
                style={{ background: gradeColor + "22", color: gradeColor }}
              >
                {grade}
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="trp-score-info">
            <h2 className="trp-test-title">{testTitle || "Academic Test"}</h2>

            <div className={`trp-result-badge ${isPassed ? "trp-badge-pass" : "trp-badge-fail"}`}>
              <i className={`bi ${isPassed ? "bi-check-circle-fill" : "bi-x-circle-fill"} me-1`}></i>
              {isPassed ? "Passed" : "Failed"}
            </div>

            <div className="trp-stats-row">
              <div className="trp-stat">
                <i className="bi bi-check-circle-fill" style={{ color: "#10b981" }}></i>
                <span className="trp-stat-val">{correct}</span>
                <span className="trp-stat-lbl">Correct</span>
              </div>
              <div className="trp-stat-divider"></div>
              <div className="trp-stat">
                <i className="bi bi-x-circle-fill" style={{ color: "#ef4444" }}></i>
                <span className="trp-stat-val">{wrong}</span>
                <span className="trp-stat-lbl">Wrong</span>
              </div>
              <div className="trp-stat-divider"></div>
              <div className="trp-stat">
                <i className="bi bi-journal-check" style={{ color: "#6366f1" }}></i>
                <span className="trp-stat-val">{total}</span>
                <span className="trp-stat-lbl">Total</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Performance Banner ── */}
        <div
          className="trp-perf-banner"
          style={{ borderColor: gradeColor, background: gradeColor + "14" }}
        >
          <span className="trp-perf-emoji">{perfEmoji}</span>
          <div>
            <div className="trp-perf-title" style={{ color: gradeColor }}>{grade}!</div>
            <div className="trp-perf-sub">{perfSub}</div>
          </div>
        </div>

        {/* ── Proctoring Report ── */}
        <div className="trp-proctor-card">
          <div className="trp-proctor-header">
            <i className="bi bi-shield-check me-2" style={{ color: "#6366f1" }}></i>
            Proctoring Report
            {totalViolations === 0 ? (
              <span className="trp-clean-badge">
                <i className="bi bi-check-circle-fill me-1"></i>Clean Session
              </span>
            ) : (
              <span className="trp-viol-badge">
                <i className="bi bi-exclamation-triangle-fill me-1"></i>
                {totalViolations} Violation{totalViolations > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="trp-proctor-grid">
            <ProcRow icon="bi-person-x"    label="No Face Detected" count={proctorData.NO_FACE        || 0} color="#f59e0b" />
            <ProcRow icon="bi-people-fill" label="Multiple Faces"   count={proctorData.MULTIPLE_FACE  || 0} color="#ef4444" />
            <ProcRow icon="bi-mic-fill"    label="Voice Detected"   count={proctorData.VOICE_DETECTED || 0} color="#8b5cf6" />
            <ProcRow icon="bi-window-stack"label="Tab Switches"     count={tabSwitchCount             || 0} color="#f97316" />
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div className="trp-actions">
          <button className="trp-btn-primary" onClick={() => navigate("/start-test")}>
            <i className="bi bi-arrow-left-circle me-2"></i>Back to Tests
          </button>
          <button className="trp-btn-secondary" onClick={() => navigate("/home")}>
            <i className="bi bi-house me-2"></i>Dashboard
          </button>
        </div>

      </div>
    </div>
  );
};

export default TestResultPage;
