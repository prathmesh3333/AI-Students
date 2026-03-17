import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./PreTestLobby.css";

const RULES = [
  "Stay in full-screen mode for the entire duration of the test.",
  "Keep your face clearly visible in the camera at all times.",
  "Only one person should be visible — no external help allowed.",
  "Do not switch tabs, windows, or open any other application.",
  "Do not talk or make loud noise — your microphone is monitored.",
  "Do not use your phone, book, or any other resource.",
  "The test will auto-submit when the timer reaches zero.",
  "Switching tabs 5 times will result in automatic submission.",
];

const PermRow = ({ icon, label, status }) => {
  const color =
    status === "granted" ? "#10b981" : status === "denied" ? "#ef4444" : "#94a3b8";
  const statusIcon =
    status === "granted"
      ? "bi-check-circle-fill"
      : status === "denied"
      ? "bi-x-circle-fill"
      : "bi-circle";
  const statusText =
    status === "granted"
      ? "Granted"
      : status === "denied"
      ? "Denied"
      : "Not yet requested";

  return (
    <div className="ptl-perm-row">
      <i className={`bi ${icon} ptl-perm-icon`}></i>
      <span className="ptl-perm-label">{label}</span>
      <span className="ptl-perm-status" style={{ color }}>
        <i className={`bi ${statusIcon} me-1`}></i>
        {statusText}
      </span>
    </div>
  );
};

const PreTestLobby = () => {
  const navigate = useNavigate();
  const { state } = useLocation();

  const videoRef    = useRef(null);
  const streamRef   = useRef(null);
  const animRef     = useRef(null);

  const [camStatus,  setCamStatus]  = useState("pending"); // pending | granted | denied
  const [micStatus,  setMicStatus]  = useState("pending");
  const [micVolume,  setMicVolume]  = useState(0);
  const [requesting, setRequesting] = useState(false);

  // Guard — if no state, go back
  useEffect(() => {
    if (!state) navigate("/test-selection");
  }, [state, navigate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Attach stream to video element AFTER it appears in the DOM
  useEffect(() => {
    if (camStatus === "granted" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [camStatus]);

  const requestPermissions = async () => {
    setRequesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;

      // Don't set srcObject here — the <video> element doesn't exist yet.
      // The useEffect above will attach it after the re-render.
      setCamStatus("granted");
      setMicStatus("granted");

      // Live mic-level visualiser
      const ctx      = new AudioContext();
      const mic      = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      mic.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setMicVolume(Math.min(100, Math.round(avg * 2.5)));
        animRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      console.error("Permission error:", err);
      setCamStatus("denied");
      setMicStatus("denied");
    } finally {
      setRequesting(false);
    }
  };

  const handleStart = () => {
    // Stop preview stream — test will re-acquire its own
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());

    if (state?.type === "mock") {
      const { type, ...mockState } = state;
      navigate("/mock-test-session", { state: mockState });
    } else if (state?.type === "academic") {
      navigate(`/test/${state.testId}`);
    }
  };

  const allGranted = camStatus === "granted" && micStatus === "granted";
  const anyDenied  = camStatus === "denied"  || micStatus === "denied";

  if (!state) return null;

  const testLabel =
    state.type === "mock"
      ? `${state.subject} · ${state.difficulty} · ${state.numQuestions} Questions`
      : "Academic Test";

  return (
    <div className="ptl-wrapper">
      {/* Navbar */}
      <nav className="ptl-nav">
        <button className="ptl-back" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <span className="ptl-nav-title">
          <i className="bi bi-shield-check me-2"></i>Test Preparation
        </span>
      </nav>

      <div className="ptl-body">
        {/* Header */}
        <div className="ptl-header">
          <h2 className="ptl-title">Before You Begin</h2>
          <p className="ptl-subtitle">{testLabel}</p>
        </div>

        <div className="ptl-grid">

          {/* ── Left: Camera + permissions ── */}
          <div className="ptl-left">

            {/* Camera preview */}
            <div className="ptl-cam-box">
              {camStatus === "granted" ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="ptl-cam-video"
                />
              ) : (
                <div className="ptl-cam-placeholder">
                  <i className="bi bi-camera-video-off"></i>
                  <span>Camera Preview</span>
                  <small>Grant permission to see your feed</small>
                </div>
              )}
              {camStatus === "granted" && (
                <div className="ptl-cam-badge">
                  <span className="ptl-live-dot"></span>LIVE
                </div>
              )}
            </div>

            {/* Permission status */}
            <div className="ptl-perms">
              <PermRow icon="bi-camera-video" label="Camera"       status={camStatus} />
              <PermRow icon="bi-mic"          label="Microphone"   status={micStatus} />
            </div>

            {/* Allow button */}
            {!allGranted && (
              <button
                className="ptl-btn-perm"
                onClick={requestPermissions}
                disabled={requesting}
              >
                {requesting ? (
                  <><span className="ptl-spinner"></span>Requesting…</>
                ) : anyDenied ? (
                  <><i className="bi bi-arrow-repeat me-2"></i>Retry Permissions</>
                ) : (
                  <><i className="bi bi-camera-video me-2"></i>Allow Camera & Microphone</>
                )}
              </button>
            )}

            {anyDenied && (
              <p className="ptl-denied-msg">
                <i className="bi bi-exclamation-triangle-fill me-1"></i>
                Permissions denied. Allow camera &amp; mic in your browser settings, then retry.
              </p>
            )}

            {allGranted && (
              <div className="ptl-ready-badge">
                <i className="bi bi-check-circle-fill me-2"></i>
                All permissions granted — you're ready!
              </div>
            )}
          </div>

          {/* ── Right: Rules + start ── */}
          <div className="ptl-right">
            <h3 className="ptl-rules-title">
              <i className="bi bi-list-check me-2"></i>Test Rules
            </h3>

            <ul className="ptl-rules-list">
              {RULES.map((rule, i) => (
                <li key={i} className="ptl-rule-item">
                  <span className="ptl-rule-num">{i + 1}</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>

            <div className="ptl-note">
              <i className="bi bi-info-circle-fill"></i>
              <span>
                By clicking <strong>Start Test</strong>, you agree to be monitored
                by AI proctoring throughout the exam. Any violations will be recorded.
              </span>
            </div>

            <button
              className={`ptl-btn-start ${allGranted ? "ptl-start-active" : "ptl-start-locked"}`}
              onClick={handleStart}
              disabled={!allGranted}
            >
              {allGranted ? (
                <><i className="bi bi-play-circle-fill me-2"></i>Start Test Now</>
              ) : (
                <><i className="bi bi-lock-fill me-2"></i>Allow Permissions to Continue</>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PreTestLobby;
