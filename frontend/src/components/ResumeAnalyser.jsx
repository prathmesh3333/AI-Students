import React, { useState, useRef, useCallback } from "react";
import axios from "axios";
import "./ResumeAnalyser.css";

const API = "http://localhost:5000";

/* ── helpers ──────────────────────────────────────────────── */
const scoreColor = (s) =>
  s >= 80 ? "#10b981" : s >= 60 ? "#6366f1" : s >= 40 ? "#f59e0b" : "#ef4444";

const scoreLabel = (s) =>
  s >= 80 ? "Excellent" : s >= 60 ? "Good" : s >= 40 ? "Needs Work" : "Poor";

/* ── Circular gauge ──────────────────────────────────────── */
const CircularGauge = ({ score, size = 160, stroke = 12, label }) => {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(score, 100) / 100) * circ;
  const color  = scoreColor(score);

  return (
    <div className="ra-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          className="ra-gauge-arc" />
      </svg>
      <div className="ra-gauge-inner">
        <span className="ra-gauge-num" style={{ color }}>{score}</span>
        <span className="ra-gauge-sub">{label}</span>
      </div>
    </div>
  );
};

/* ── Section bar ─────────────────────────────────────────── */
const SectionBar = ({ icon, label, score, feedback, tips }) => {
  const [showTips, setShowTips] = useState(false);
  const color = scoreColor(score);
  return (
    <div className="ra-sbar">
      <div className="ra-sbar-top">
        <span className="ra-sbar-label"><i className={`bi ${icon}`} />{label}</span>
        <span className="ra-sbar-score" style={{ color }}>{score}/100</span>
      </div>
      <div className="ra-sbar-track">
        <div className="ra-sbar-fill" style={{ width: `${score}%`, background: color }} />
      </div>
      {feedback && <p className="ra-sbar-feedback">{feedback}</p>}
      {score < 100 && tips?.length > 0 && (
        <div>
          <button
            className="ra-tips-btn"
            onClick={() => setShowTips(p => !p)}
          >
            <i className={`bi ${showTips ? "bi-chevron-up" : "bi-lightbulb-fill"} me-1`} />
            {showTips ? "Hide tips" : "How to reach 100?"}
          </button>
          {showTips && (
            <div className="ra-tips-panel">
              <p className="ra-tips-heading"><i className="bi bi-stars me-1" />Steps to reach 100/100</p>
              <ul className="ra-tips-list">
                {tips.map((tip, i) => (
                  <li key={i} className="ra-tips-item">
                    <span className="ra-tips-num">{i + 1}</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SECTIONS = [
  { key: "contact",    icon: "bi-person-lines-fill", label: "Contact Info" },
  { key: "summary",    icon: "bi-card-text",          label: "Summary / Objective" },
  { key: "experience", icon: "bi-briefcase-fill",     label: "Work Experience" },
  { key: "education",  icon: "bi-mortarboard-fill",   label: "Education" },
  { key: "skills",     icon: "bi-tools",               label: "Skills" },
  { key: "projects",   icon: "bi-diagram-3-fill",     label: "Projects" },
];

const STEPS = [
  "Parsing document…",
  "Analysing content…",
  "Checking ATS compatibility…",
  "Generating insights…",
  "Finalising report…",
];

/* ── Main component ──────────────────────────────────────── */
const ResumeAnalyser = ({ onClose, asPage = false }) => {
  const [phase,    setPhase]    = useState("upload"); // upload | analysing | result
  const [file,     setFile]     = useState(null);
  const [dragging, setDragging] = useState(false);
  const [step,     setStep]     = useState(0);
  const [error,    setError]    = useState("");
  const [analysis, setAnalysis] = useState(null);
  const inputRef = useRef();

  /* drag & drop */
  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") { setFile(f); setError(""); }
    else setError("Please upload a PDF file.");
  }, []);

  const onFileChange = (e) => {
    const f = e.target.files[0];
    if (f?.type === "application/pdf") { setFile(f); setError(""); }
    else setError("Please upload a PDF file.");
  };

  /* analyse */
  const handleAnalyse = async () => {
    if (!file) { setError("Please select a resume PDF first."); return; }
    setPhase("analysing"); setError(""); setStep(0);

    // Tick through steps for UX
    const ticker = setInterval(() => {
      setStep((s) => {
        if (s >= STEPS.length - 1) { clearInterval(ticker); return s; }
        return s + 1;
      });
    }, 1800);

    try {
      const form = new FormData();
      form.append("resume", file);
      const { data } = await axios.post(`${API}/api/interview/analyse-resume`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      clearInterval(ticker);
      if (data.success) {
        setAnalysis(data.analysis);
        setPhase("result");
      } else {
        setError(data.error || "Analysis failed."); setPhase("upload");
      }
    } catch (err) {
      clearInterval(ticker);
      setError(err.response?.data?.error || "Analysis failed. Please try again.");
      setPhase("upload");
    }
  };

  const reset = () => {
    setPhase("upload"); setFile(null); setAnalysis(null); setError(""); setStep(0);
  };

  return (
    <div className={`ra-overlay${asPage ? " ra-overlay--page" : ""}`} onClick={!asPage ? onClose : undefined}>
      <div className="ra-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="ra-header">
          <div className="ra-header-left">
            <div className="ra-header-icon">
              <i className="bi bi-file-earmark-person-fill" />
            </div>
            <div>
              <h2 className="ra-header-title">AI Resume Analyser</h2>
              <p className="ra-header-sub">Powered by Gemini · ATS & Placement Ready</p>
            </div>
          </div>
          <button className="ra-close" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>

        {/* ── UPLOAD PHASE ── */}
        {phase === "upload" && (
          <div className="ra-body">
            {error && (
              <div className="ra-error">
                <i className="bi bi-exclamation-circle-fill" /> {error}
              </div>
            )}

            <div
              className={`ra-dropzone ${dragging ? "ra-dropzone--drag" : ""} ${file ? "ra-dropzone--has-file" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => !file && inputRef.current?.click()}
            >
              <input ref={inputRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={onFileChange} />

              {!file ? (
                <>
                  <div className="ra-drop-icon"><i className="bi bi-cloud-upload-fill" /></div>
                  <p className="ra-drop-title">Drop your resume here</p>
                  <p className="ra-drop-sub">or click to browse · PDF only · max 5 MB</p>
                </>
              ) : (
                <>
                  <div className="ra-drop-icon ra-drop-icon--ready"><i className="bi bi-file-earmark-check-fill" /></div>
                  <p className="ra-drop-title">{file.name}</p>
                  <p className="ra-drop-sub">{(file.size / 1024).toFixed(0)} KB · Ready to analyse</p>
                  <button className="ra-change-btn" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
                    Change file
                  </button>
                </>
              )}
            </div>

            <div className="ra-upload-tips">
              <div className="ra-tip"><i className="bi bi-check-circle-fill" />Make sure your resume is text-based, not a scanned image</div>
              <div className="ra-tip"><i className="bi bi-check-circle-fill" />ATS score, section-wise grades, missing keywords & more</div>
              <div className="ra-tip"><i className="bi bi-check-circle-fill" />Brutally honest feedback to help you get placed faster</div>
            </div>

            <button className="ra-analyse-btn" onClick={handleAnalyse} disabled={!file}>
              <i className="bi bi-cpu-fill me-2" />
              Analyse Resume
            </button>
          </div>
        )}

        {/* ── ANALYSING PHASE ── */}
        {phase === "analysing" && (
          <div className="ra-body ra-body--center">
            <div className="ra-scan-anim">
              <div className="ra-scan-ring ra-scan-ring--1" />
              <div className="ra-scan-ring ra-scan-ring--2" />
              <div className="ra-scan-ring ra-scan-ring--3" />
              <div className="ra-scan-core"><i className="bi bi-cpu-fill" /></div>
            </div>
            <h3 className="ra-analysing-title">Analysing your resume…</h3>
            <div className="ra-steps">
              {STEPS.map((s, i) => (
                <div key={i} className={`ra-step ${i < step ? "ra-step--done" : i === step ? "ra-step--active" : "ra-step--pending"}`}>
                  <span className="ra-step-dot">
                    {i < step ? <i className="bi bi-check-lg" /> : i === step ? <span className="ra-step-spinner" /> : null}
                  </span>
                  <span className="ra-step-text">{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RESULT PHASE ── */}
        {phase === "result" && analysis && (
          <div className="ra-body ra-result">

            {/* Score row */}
            <div className="ra-score-row">
              <div className="ra-score-main">
                <CircularGauge score={analysis.overallScore} label="Overall" />
                <div className="ra-score-label-block">
                  <span className="ra-score-grade" style={{ color: scoreColor(analysis.overallScore) }}>
                    {scoreLabel(analysis.overallScore)}
                  </span>
                  <p className="ra-score-hint">Your resume scored {analysis.overallScore}/100 overall</p>
                </div>
              </div>
              <div className="ra-score-ats">
                <CircularGauge score={analysis.atsScore} size={120} stroke={10} label="ATS Score" />
                <p className="ra-ats-hint">Applicant Tracking System compatibility</p>
              </div>
            </div>

            {/* Verdict */}
            <div className="ra-verdict">
              <div className="ra-verdict-icon"><i className="bi bi-robot" /></div>
              <div>
                <p className="ra-verdict-label">AI Verdict</p>
                <p className="ra-verdict-text">"{analysis.verdict}"</p>
              </div>
            </div>

            {/* Sections */}
            <div className="ra-block">
              <h4 className="ra-block-title"><i className="bi bi-bar-chart-fill me-2" />Section Breakdown</h4>
              <div className="ra-sections-grid">
                {SECTIONS.map(({ key, icon, label }) =>
                  analysis.sections?.[key] ? (
                    <SectionBar
                      key={key} icon={icon} label={label}
                      score={analysis.sections[key].score}
                      feedback={analysis.sections[key].feedback}
                      tips={analysis.sections[key].tips}
                    />
                  ) : null
                )}
              </div>
            </div>

            {/* Strengths + Weaknesses */}
            <div className="ra-sw-row">
              <div className="ra-block ra-block--green">
                <h4 className="ra-block-title"><i className="bi bi-patch-check-fill me-2" style={{color:"#10b981"}}/>Strengths</h4>
                <ul className="ra-sw-list">
                  {(analysis.strengths || []).map((s, i) => (
                    <li key={i} className="ra-sw-item ra-sw-item--strength">
                      <i className="bi bi-check-circle-fill" />{s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="ra-block ra-block--red">
                <h4 className="ra-block-title"><i className="bi bi-exclamation-triangle-fill me-2" style={{color:"#ef4444"}}/>Weaknesses</h4>
                <ul className="ra-sw-list">
                  {(analysis.weaknesses || []).map((w, i) => (
                    <li key={i} className="ra-sw-item ra-sw-item--weakness">
                      <i className="bi bi-x-circle-fill" />{w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Keywords */}
            <div className="ra-block">
              <h4 className="ra-block-title"><i className="bi bi-tags-fill me-2" />Keyword Analysis</h4>
              <div className="ra-kw-section">
                <p className="ra-kw-label ra-kw-label--present"><i className="bi bi-check2" />Found in your resume</p>
                <div className="ra-kw-chips">
                  {(analysis.presentKeywords || []).map((k, i) => (
                    <span key={i} className="ra-chip ra-chip--present">{k}</span>
                  ))}
                </div>
              </div>
              <div className="ra-kw-section mt-3">
                <p className="ra-kw-label ra-kw-label--missing"><i className="bi bi-x" />Missing keywords (add these)</p>
                <div className="ra-kw-chips">
                  {(analysis.missingKeywords || []).map((k, i) => (
                    <span key={i} className="ra-chip ra-chip--missing">{k}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Suggestions */}
            <div className="ra-block">
              <h4 className="ra-block-title"><i className="bi bi-lightbulb-fill me-2" />Top Suggestions</h4>
              <ol className="ra-suggestions">
                {(analysis.suggestions || []).map((s, i) => (
                  <li key={i} className="ra-suggestion">
                    <span className="ra-sug-num">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Actions */}
            <div className="ra-result-actions">
              <button className="ra-retry-btn" onClick={reset}>
                <i className="bi bi-arrow-repeat me-2" />Analyse Another Resume
              </button>
              <button className="ra-close-btn" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeAnalyser;
