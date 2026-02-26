import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./MockTestResult.css";

const MockTestResult = () => {
  const navigate  = useNavigate();
  const { state } = useLocation();

  if (!state?.results) {
    navigate("/test-selection");
    return null;
  }

  const { branch, subject, difficulty, score, total, timeTaken, tabSwitchCount, results } = state;

  const pct        = Math.round((score / total) * 100);
  const grade      = pct >= 80 ? "Excellent" : pct >= 60 ? "Good" : pct >= 40 ? "Average" : "Needs Work";
  const gradeColor = pct >= 80 ? "#10b981" : pct >= 60 ? "#3b82f6" : pct >= 40 ? "#f59e0b" : "#ef4444";

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  return (
    <div className="mtr-wrapper">
      {/* Navbar */}
      <nav className="mtr-nav">
        <button className="mtr-back" onClick={() => navigate("/test-selection")}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <span className="mtr-nav-title">Mock Test Result</span>
      </nav>

      <div className="mtr-body">

        {/* Score Card */}
        <div className="mtr-score-card">
          <div className="mtr-circle" style={{ "--pct-color": gradeColor }}>
            <svg viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" className="mtr-ring-bg" />
              <circle
                cx="60" cy="60" r="52"
                className="mtr-ring-fill"
                style={{
                  stroke: gradeColor,
                  strokeDasharray: `${(pct / 100) * 326.7} 326.7`,
                }}
              />
            </svg>
            <div className="mtr-circle-text">
              <span className="mtr-pct">{pct}%</span>
              <span className="mtr-grade-label">{grade}</span>
            </div>
          </div>

          <div className="mtr-score-details">
            <h2 className="mtr-subject">{subject}</h2>
            <p className="mtr-meta">{branch} · {difficulty}</p>

            <div className="mtr-stats">
              <div className="mtr-stat">
                <i className="bi bi-check-circle-fill" style={{ color: "#10b981" }}></i>
                <span>{score} Correct</span>
              </div>
              <div className="mtr-stat">
                <i className="bi bi-x-circle-fill" style={{ color: "#ef4444" }}></i>
                <span>{total - score} Wrong</span>
              </div>
              <div className="mtr-stat">
                <i className="bi bi-clock-fill" style={{ color: "#6366f1" }}></i>
                <span>{formatTime(timeTaken || 0)}</span>
              </div>
              {tabSwitchCount > 0 && (
                <div className="mtr-stat">
                  <i className="bi bi-exclamation-triangle-fill" style={{ color: "#f59e0b" }}></i>
                  <span>{tabSwitchCount} Tab Switch{tabSwitchCount > 1 ? "es" : ""}</span>
                </div>
              )}
            </div>

            <div className="mtr-actions">
              <button className="mtr-btn-primary" onClick={() => navigate("/mock-test-setup")}>
                <i className="bi bi-arrow-repeat me-2"></i>Try Again
              </button>
              <button className="mtr-btn-secondary" onClick={() => navigate("/test-selection")}>
                <i className="bi bi-house me-2"></i>Home
              </button>
            </div>
          </div>
        </div>

        {/* Question Review */}
        <h3 className="mtr-review-title">
          <i className="bi bi-journal-check me-2"></i>Answer Review
        </h3>

        <div className="mtr-questions">
          {results.map((r, i) => (
            <div key={i} className={`mtr-q-card ${r.isCorrect ? "q-correct" : r.selectedIndex === -1 ? "q-skipped" : "q-wrong"}`}>
              <div className="mtr-q-top">
                <span className={`mtr-q-badge ${r.isCorrect ? "badge-correct" : r.selectedIndex === -1 ? "badge-skipped" : "badge-wrong"}`}>
                  {r.isCorrect ? <><i className="bi bi-check-lg"></i> Correct</> :
                   r.selectedIndex === -1 ? <><i className="bi bi-dash-lg"></i> Skipped</> :
                   <><i className="bi bi-x-lg"></i> Wrong</>}
                </span>
                <span className="mtr-q-num">Q{i + 1}</span>
              </div>

              <p className="mtr-q-text">{r.question}</p>

              <div className="mtr-opts">
                {r.options.map((opt, oi) => {
                  const letter    = String.fromCharCode(65 + oi);
                  const isCorrect = letter === r.correctLetter;
                  const isChosen  = oi === r.selectedIndex;
                  return (
                    <div
                      key={oi}
                      className={`mtr-opt
                        ${isCorrect ? "mtr-opt-correct" : ""}
                        ${isChosen && !isCorrect ? "mtr-opt-wrong" : ""}
                      `}
                    >
                      <span className="mtr-opt-letter">{letter}</span>
                      <span className="mtr-opt-text">{opt.replace(/^[A-D]\.\s*/, "")}</span>
                      {isCorrect && <i className="bi bi-check-circle-fill ms-auto" style={{ color: "#10b981" }}></i>}
                      {isChosen && !isCorrect && <i className="bi bi-x-circle-fill ms-auto" style={{ color: "#ef4444" }}></i>}
                    </div>
                  );
                })}
              </div>

              {r.explanation && (
                <div className="mtr-explanation">
                  <i className="bi bi-lightbulb-fill me-2"></i>
                  {r.explanation}
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default MockTestResult;
