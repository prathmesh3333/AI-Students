import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./TakeTest.css";          // reuse the exact same stylesheet
import Toast from "./Toast";
import ConfirmModal from "./ConfirmModal";
import AIProctoring from "./AIProctoring";

const MockTestSession = () => {
  const navigate   = useNavigate();
  const { state }  = useLocation();

  // ── Guard ───────────────────────────────────────────────────
  useEffect(() => {
    if (!state?.questions?.length) navigate("/test-selection");
  }, [state, navigate]);

  if (!state?.questions?.length) return null;

  const { branch, subject, difficulty, numQuestions, questions } = state;

  // 2 minutes per question, minimum 5 min
  const TOTAL_SECONDS = Math.max(questions.length * 2 * 60, 300);

  // ── State ───────────────────────────────────────────────────
  const [currentIndex,  setCurrentIndex]  = useState(0);
  const [answers,       setAnswers]        = useState(
    questions.map((_, i) => ({ questionIndex: i, selectedAnswer: -1 }))
  );
  const [timeRemaining, setTimeRemaining] = useState(TOTAL_SECONDS);
  const [tabSwitchCount,setTabSwitchCount]= useState(0);
  const [isFullscreen,  setIsFullscreen]  = useState(false);
  const [isTestLocked,  setIsTestLocked]  = useState(false);
  const [submitting,    setSubmitting]    = useState(false);
  const [proctorActive, setProctorActive] = useState(true);
  const [toast,         setToast]         = useState(null);
  const [confirmModal,  setConfirmModal]  = useState(null);
  const [violations,    setViolations]    = useState({
    NO_FACE: 0, MULTIPLE_FACE: 0, VOICE_DETECTED: 0, TAB_SWITCH: 0,
  });

  const timerRef     = useRef(null);
  const startTimeRef = useRef(Date.now());
  const lastLockRef  = useRef(0); // debounce camera-violation locks

  const [lockReason, setLockReason] = useState("");

  // ── Fullscreen ──────────────────────────────────────────────
  const requestFullscreen = async () => {
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement) {
        if      (el.requestFullscreen)       await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        else if (el.msRequestFullscreen)     el.msRequestFullscreen();
      }
      setIsTestLocked(false);
      setIsFullscreen(true);
    } catch (e) { console.log("Fullscreen failed:", e); }
  };

  // Request fullscreen on mount
  useEffect(() => { requestFullscreen(); }, []);

  // Fullscreen change listener
  useEffect(() => {
    const onChange = () => {
      const inFS = !!document.fullscreenElement;
      setIsFullscreen(inFS);
      if (!inFS && !submitting && !isTestLocked) {
        setTimeout(requestFullscreen, 400);
      }
    };
    const onEsc = (e) => {
      if (e.key === "Escape" && !submitting && !isTestLocked) {
        setTimeout(requestFullscreen, 200);
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("keydown", onEsc);
    };
  }, [submitting, isTestLocked]);

  // Re-enter fullscreen on click
  useEffect(() => {
    const onClick = () => {
      if (!document.fullscreenElement && !submitting && !isTestLocked)
        requestFullscreen();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [submitting, isTestLocked]);

  // ── Tab-switch detection ────────────────────────────────────
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && !submitting) {
        handleViolation("TAB_SWITCH");
        setLockReason("You switched tabs during the test. Return to fullscreen to continue.");
        setIsTestLocked(true);
        setIsFullscreen(false);
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      }
    };
    const onBlur = () => { if (!submitting) setTabSwitchCount(p => p + 1); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
    };
  }, [submitting]);

  // Auto-submit after 5 tab switches
  useEffect(() => {
    if (tabSwitchCount >= 5) submitTestNow();
  }, [tabSwitchCount]);

  // ── Before-unload guard ─────────────────────────────────────
  useEffect(() => {
    const onUnload = (e) => {
      if (!submitting) {
        e.preventDefault();
        e.returnValue = "Your test progress will be lost.";
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [submitting]);

  // ── Audio proctoring ────────────────────────────────────────
  useEffect(() => {
    if (!proctorActive) return;
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const ctx      = new AudioContext();
        const mic      = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        mic.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const detect = () => {
          analyser.getByteFrequencyData(data);
          const vol = data.reduce((a, b) => a + b) / data.length;
          if (vol > 70) handleViolation("VOICE_DETECTED");
          requestAnimationFrame(detect);
        };
        detect();
      })
      .catch(() => {});
  }, [proctorActive]);

  // ── Timer ───────────────────────────────────────────────────
  useEffect(() => {
    if (submitting) return;
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) { handleSubmitTest(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [submitting]);

  // ── Violation handler ───────────────────────────────────────
  const LOCK_MESSAGES = {
    TAB_SWITCH:     "You switched tabs during the test. Return to fullscreen to continue.",
    NO_FACE:        "No face detected in the camera. Please ensure your face is clearly visible.",
    MULTIPLE_FACE:  "Multiple faces detected. Only you should be visible during the test.",
    VOICE_DETECTED: "Voice or noise was detected. Please maintain silence during the test.",
  };

  const handleViolation = (type) => {
    setToast({ message: `⚠️ ${type.replace(/_/g, " ")} detected`, type: "warning" });
    setViolations(prev => ({ ...prev, [type]: (prev[type] || 0) + 1 }));

    if (type === "TAB_SWITCH") {
      setTabSwitchCount(p => p + 1);
      // TAB_SWITCH lock is handled in the visibilitychange listener
    } else {
      // Camera/voice violations: lock with a 15-second debounce
      const now = Date.now();
      if (now - lastLockRef.current > 15000) {
        lastLockRef.current = now;
        setLockReason(LOCK_MESSAGES[type] || `${type.replace(/_/g, " ")} detected.`);
        setIsTestLocked(true);
      }
    }
  };

  // ── Answer selection ────────────────────────────────────────
  const handleSelect = (optIndex) => {
    const updated = [...answers];
    updated[currentIndex].selectedAnswer = optIndex;
    setAnswers(updated);
  };

  // ── Navigation ──────────────────────────────────────────────
  const goTo     = (i)  => setCurrentIndex(i);
  const goNext   = ()   => { if (currentIndex < questions.length - 1) setCurrentIndex(p => p + 1); };
  const goPrev   = ()   => { if (currentIndex > 0) setCurrentIndex(p => p - 1); };

  // ── Submit ──────────────────────────────────────────────────
  const handleSubmitTest = (autoSubmit = false) => {
    if (submitting) return;
    if (!autoSubmit) {
      const unanswered = answers.filter(a => a.selectedAnswer === -1).length;
      setConfirmModal({
        message: unanswered > 0
          ? `You have ${unanswered} unanswered question(s). Submit anyway?`
          : "Are you sure you want to submit your test?",
        onConfirm: () => { setConfirmModal(null); submitTestNow(); },
        onCancel:  () => setConfirmModal(null),
        type:        unanswered > 0 ? "warning" : "info",
        confirmText: "Submit Test",
      });
      return;
    }
    submitTestNow();
  };

  const submitTestNow = async () => {
    if (submitting) return;
    setSubmitting(true);
    setProctorActive(false);

    await new Promise(r => setTimeout(r, 500)); // camera cleanup
    clearInterval(timerRef.current);
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});

    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);

    // Calculate results locally (AI questions have correct letter)
    const results = questions.map((q, i) => {
      const selIdx    = answers[i].selectedAnswer;
      const selLetter = selIdx === -1 ? null : String.fromCharCode(65 + selIdx);
      return {
        question:      q.question,
        options:       q.options,
        selectedIndex: selIdx,
        selectedLetter: selLetter,
        correctLetter:  q.correct,
        isCorrect:      selLetter === q.correct,
        explanation:    q.explanation || "",
      };
    });

    const score = results.filter(r => r.isCorrect).length;

    navigate("/mock-test-result", {
      state: {
        branch, subject, difficulty,
        score, total: questions.length,
        timeTaken, tabSwitchCount, violations,
        results,
      },
    });
  };

  // ── Helpers ─────────────────────────────────────────────────
  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  };

  const q             = questions[currentIndex];
  const answeredCount = answers.filter(a => a.selectedAnswer !== -1).length;
  const progress      = (answeredCount / questions.length) * 100;

  return (
    <div className="take-test-container">

      {/* ── Lock overlay ─────────────────────────────────────── */}
      {isTestLocked && (
        <div className="test-lock-overlay">
          <div className="lock-content">
            <div className="lock-icon"><i className="bi bi-lock-fill"></i></div>
            <h3 className="lock-title">Test Locked</h3>
            <p className="lock-message">
              {lockReason}
            </p>
            <button className="btn btn-primary btn-lg go-fullscreen-btn" onClick={requestFullscreen}>
              <i className="bi bi-arrows-fullscreen me-2"></i>Go Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="test-header-bar">
        <div className="container-fluid">
          <div className="row align-items-center">
            <div className="col-md-4">
              <h5 className="mb-0">
                <i className="bi bi-file-text me-2"></i>{subject}
              </h5>
              <small>{branch} · {difficulty}</small>
            </div>
            <div className="col-md-4 text-center">
              <div className={`timer-display ${timeRemaining < 60 ? "timer-warning" : ""}`}>
                <i className="bi bi-clock me-2"></i>
                <span className="time-text">{formatTime(timeRemaining)}</span>
              </div>
              {tabSwitchCount > 0 && (
                <div className="tab-switch-warning mt-1">
                  <i className="bi bi-exclamation-triangle me-1"></i>
                  Tab Switches: {tabSwitchCount}
                </div>
              )}
            </div>
            <div className="col-md-4 text-end">
              <button
                className="btn btn-success"
                onClick={() => handleSubmitTest(false)}
                disabled={submitting}
              >
                <i className="bi bi-check-circle me-2"></i>Submit Test
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Progress bar ─────────────────────────────────────── */}
      <div className="progress-container">
        <div className="container-fluid">
          <div className="progress" style={{ height: "8px" }}>
            <div
              className="progress-bar bg-success"
              role="progressbar"
              style={{ width: `${progress}%` }}
            />
          </div>
          <small className="text-muted">
            {answeredCount} of {questions.length} questions answered
          </small>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="container-fluid py-4">
        <div className="row">

          {/* Question area */}
          <div className="col-lg-9">
            <div className="question-card">
              <div className="question-header">
                <h4>Question {currentIndex + 1} of {questions.length}</h4>
              </div>

              <div className="question-body">
                <p className="question-text">{q.question}</p>

                <div className="options-container">
                  {q.options.map((opt, oi) => (
                    <div
                      key={oi}
                      className={`option-item ${answers[currentIndex].selectedAnswer === oi ? "selected" : ""}`}
                      onClick={() => handleSelect(oi)}
                    >
                      <div className="option-radio">
                        <input
                          type="radio"
                          name={`q-${currentIndex}`}
                          checked={answers[currentIndex].selectedAnswer === oi}
                          onChange={() => handleSelect(oi)}
                        />
                      </div>
                      <div className="option-label">
                        <span className="option-letter">{String.fromCharCode(65 + oi)}.</span>
                        {/* Strip the "A. " prefix that AI adds */}
                        <span className="option-text">{opt.replace(/^[A-D]\.\s*/,"")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="question-footer">
                <button
                  className="btn btn-outline-primary"
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                >
                  <i className="bi bi-arrow-left me-2"></i>Previous
                </button>
                {currentIndex < questions.length - 1 && (
                  <button className="btn btn-primary" onClick={goNext}>
                    Next<i className="bi bi-arrow-right ms-2"></i>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Question navigator */}
          <div className="col-lg-3">
            <div className="question-navigator">
              <h6 className="mb-3">Question Navigator</h6>
              <div className="question-grid">
                {questions.map((_, i) => (
                  <button
                    key={i}
                    className={`question-nav-btn
                      ${i === currentIndex ? "active" : ""}
                      ${answers[i].selectedAnswer !== -1 ? "answered" : ""}
                    `}
                    onClick={() => goTo(i)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <div className="legend mt-3">
                <div className="legend-item"><span className="legend-color current"></span><small>Current</small></div>
                <div className="legend-item"><span className="legend-color answered"></span><small>Answered</small></div>
                <div className="legend-item"><span className="legend-color unanswered"></span><small>Unanswered</small></div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
          confirmText={confirmModal.confirmText}
          cancelText="Cancel"
          type={confirmModal.type}
        />
      )}
      <AIProctoring onViolation={handleViolation} isActive={proctorActive} />
    </div>
  );
};

export default MockTestSession;
