import React, { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./Home.css";

const passwordRules = [
  { id: "minLen",  label: "At least 6 characters",                    test: (p) => p.length >= 6 },
  { id: "upper",   label: "At least one uppercase letter",             test: (p) => /[A-Z]/.test(p) },
  { id: "lower",   label: "At least one lowercase letter",             test: (p) => /[a-z]/.test(p) },
  { id: "number",  label: "At least one number",                       test: (p) => /[0-9]/.test(p) },
  { id: "special", label: "At least one special character (@, #, $ …)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const RESEND_WAIT = 60;

const Home = () => {
  const [studentName, setStudentName] = useState("");
  const [studentBranch, setStudentBranch] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // ── Change Password modal state ──────────────────────────────
  const [showChangePwd, setShowChangePwd] = useState(false);
  // cpMode: 'change' | 'fp1' | 'fp2' | 'fp3'
  const [cpMode, setCpMode]           = useState("change");
  const [cpCurrent, setCpCurrent]     = useState("");
  const [cpNew, setCpNew]             = useState("");
  const [cpConfirm, setCpConfirm]     = useState("");
  const [cpError, setCpError]         = useState("");
  const [cpSuccess, setCpSuccess]     = useState("");
  const [cpLoading, setCpLoading]     = useState(false);

  // ── Forgot-password-inside-modal state ──────────────────────
  const [fpRollNo, setFpRollNo]           = useState("");
  const [fpOtp, setFpOtp]                 = useState(["","","","","",""]);
  const [fpMaskedEmail, setFpMaskedEmail] = useState("");
  const [fpResetToken, setFpResetToken]   = useState("");
  const [fpNewPwd, setFpNewPwd]           = useState("");
  const [fpConfirmPwd, setFpConfirmPwd]   = useState("");
  const [fpResendTimer, setFpResendTimer] = useState(0);
  const fpOtpRefs = useRef([]);

  const navigate = useNavigate();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // ── Resend countdown ──────────────────────────────────────────
  useEffect(() => {
    if (fpResendTimer <= 0) return;
    const t = setTimeout(() => setFpResendTimer(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [fpResendTimer]);

  useEffect(() => {
    const storedName   = localStorage.getItem("studentName");
    const storedBranch = localStorage.getItem("studentBranch");
    const storedRollNo = localStorage.getItem("rollNo");
    if (storedName && storedRollNo) {
      setStudentName(storedName);
      setStudentBranch(storedBranch || "N/A");
      setRollNo(storedRollNo);
    } else {
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // ── Modal open / close helpers ────────────────────────────────
  const openChangePwd = () => {
    setShowDropdown(false);
    setCpMode("change");
    setCpCurrent(""); setCpNew(""); setCpConfirm("");
    setCpError(""); setCpSuccess("");
    setFpRollNo(""); setFpOtp(["","","","","",""]);
    setFpMaskedEmail(""); setFpResetToken("");
    setFpNewPwd(""); setFpConfirmPwd(""); setFpResendTimer(0);
    setShowChangePwd(true);
  };

  const closeModal = () => setShowChangePwd(false);

  const switchToFp = async () => {
    setCpError("");
    setFpOtp(["","","","","",""]); setFpMaskedEmail("");
    setFpResetToken(""); setFpNewPwd(""); setFpConfirmPwd(""); setFpResendTimer(0);
    setFpRollNo(rollNo); // already know who the user is
    setCpLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/auth/forgot-password", { rollNo });
      setFpMaskedEmail(res.data.email);
      setFpResendTimer(RESEND_WAIT);
      setCpMode("fp2"); // jump straight to OTP — skip the roll-number step
    } catch (err) {
      setCpError(err.response?.data?.error || "Failed to send reset code. Please try again.");
    } finally {
      setCpLoading(false);
    }
  };

  // ── Change password handler ───────────────────────────────────
  const handleChangePwd = async (e) => {
    e.preventDefault();
    setCpError("");
    if (cpNew !== cpConfirm) { setCpError("New passwords do not match."); return; }
    if (cpNew.length < 6)    { setCpError("New password must be at least 6 characters."); return; }
    setCpLoading(true);
    try {
      await axios.post("http://localhost:5000/api/auth/change-password", {
        currentPassword: cpCurrent,
        newPassword: cpNew,
      });
      setCpSuccess("Password changed successfully!");
      setTimeout(() => closeModal(), 1800);
    } catch (err) {
      setCpError(err.response?.data?.error || "Failed to change password.");
    } finally {
      setCpLoading(false);
    }
  };

  // ── FP Step 1: Send OTP ───────────────────────────────────────
  const handleFpSend = async (e) => {
    e.preventDefault();
    setCpError("");
    setCpLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/auth/forgot-password", { rollNo: fpRollNo });
      setFpMaskedEmail(res.data.email);
      setFpResendTimer(RESEND_WAIT);
      setCpMode("fp2");
    } catch (err) {
      setCpError(err.response?.data?.error || "Failed to send OTP. Check your roll number.");
    } finally {
      setCpLoading(false);
    }
  };

  // ── FP Step 2: OTP input handlers ────────────────────────────
  const handleFpOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...fpOtp];
    next[index] = value;
    setFpOtp(next);
    if (value && index < 5) fpOtpRefs.current[index + 1]?.focus();
  };

  const handleFpOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !fpOtp[index] && index > 0)
      fpOtpRefs.current[index - 1]?.focus();
  };

  const handleFpOtpPaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) { setFpOtp(pasted.split("")); fpOtpRefs.current[5]?.focus(); }
    e.preventDefault();
  };

  // ── FP Step 2: Verify OTP ────────────────────────────────────
  const handleFpVerify = async (e) => {
    e.preventDefault();
    setCpError("");
    const code = fpOtp.join("");
    if (code.length < 6) { setCpError("Enter the complete 6-digit code."); return; }
    setCpLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/api/auth/verify-reset-otp", { rollNo: fpRollNo, otp: code });
      setFpResetToken(res.data.resetToken);
      setCpMode("fp3");
    } catch (err) {
      setCpError(err.response?.data?.error || "Invalid OTP. Try again.");
      setFpOtp(["","","","","",""]);
      fpOtpRefs.current[0]?.focus();
    } finally {
      setCpLoading(false);
    }
  };

  // ── FP Step 2: Resend ─────────────────────────────────────────
  const handleFpResend = async () => {
    if (fpResendTimer > 0) return;
    setCpError("");
    try {
      const res = await axios.post("http://localhost:5000/api/auth/forgot-password", { rollNo: fpRollNo });
      setFpMaskedEmail(res.data.email);
      setFpResendTimer(RESEND_WAIT);
      setFpOtp(["","","","","",""]);
      fpOtpRefs.current[0]?.focus();
    } catch (err) {
      setCpError(err.response?.data?.error || "Failed to resend OTP.");
    }
  };

  // ── FP Step 3: Reset Password ─────────────────────────────────
  const handleFpReset = async (e) => {
    e.preventDefault();
    setCpError("");
    if (fpNewPwd !== fpConfirmPwd) { setCpError("Passwords do not match."); return; }
    if (fpNewPwd.length < 6) { setCpError("Password must be at least 6 characters."); return; }
    setCpLoading(true);
    try {
      await axios.post("http://localhost:5000/api/auth/reset-password", {
        resetToken: fpResetToken,
        newPassword: fpNewPwd,
      });
      setCpSuccess("Password reset successfully!");
      setTimeout(() => closeModal(), 1800);
    } catch (err) {
      setCpError(err.response?.data?.error || "Failed to reset password. Please try again.");
    } finally {
      setCpLoading(false);
    }
  };

  const features = [
    {
      to: "/test-selection",
      icon: "bi-journal-check",
      label: "Start Test",
      desc: "Take scheduled tests, attempt MCQs and track your academic progress.",
      accent: "#6366f1",
      glow: "rgba(99,102,241,0.35)",
      tag: "Academics",
    },
    {
      to: "/mock-interview",
      icon: "bi-mic-fill",
      label: "Mock Interview",
      desc: "Practice AI-powered voice interviews and get real-time feedback.",
      accent: "#a855f7",
      glow: "rgba(168,85,247,0.35)",
      tag: "Career",
    },
    {
      to: "/question-mode",
      icon: "bi-layers-fill",
      label: "Question Bank",
      desc: "Practice subject-wise questions and strengthen your concepts.",
      accent: "#06b6d4",
      glow: "rgba(6,182,212,0.35)",
      tag: "Practice",
    },
  ];

  // ── Modal header config by mode ───────────────────────────────
  const modalHeader = {
    change: { icon: "bi-shield-lock-fill",    iconClass: "",               title: "Change Password" },
    fp2:    { icon: "bi-envelope-check-fill", iconClass: "h-cp-icon-otp",  title: "Check your email" },
    fp3:    { icon: "bi-shield-check-fill",   iconClass: "h-cp-icon-reset", title: "Set New Password" },
  };
  const mh = modalHeader[cpMode] ?? modalHeader.change;

  return (
    <div className="h-page">
      {/* Animated background blobs */}
      <div className="h-bg" aria-hidden>
        <div className="h-blob h-blob-1" />
        <div className="h-blob h-blob-2" />
        <div className="h-blob h-blob-3" />
      </div>

      {/* ── Navbar ── */}
      <nav className="h-nav">
        <div className="h-nav-brand">
          <div className="h-nav-logo">E</div>
          <span className="h-nav-name">EduPrep</span>
        </div>

        <div className="h-nav-right">
          <button
            className="h-avatar-btn"
            onClick={() => setShowDropdown(!showDropdown)}
            title="Profile"
          >
            {studentName.charAt(0).toUpperCase()}
          </button>

          {showDropdown && (
            <>
              <div className="h-backdrop" onClick={() => setShowDropdown(false)} />
              <div className="h-dropdown">
                <div className="h-dd-header">
                  <div className="h-dd-avatar">
                    {studentName.charAt(0).toUpperCase()}
                  </div>
                  <div className="h-dd-info">
                    <p className="h-dd-name">{studentName}</p>
                    <p className="h-dd-meta">
                      <i className="bi bi-building me-1" />
                      {studentBranch}
                    </p>
                    <p className="h-dd-meta">
                      <i className="bi bi-person-badge me-1" />
                      {rollNo}
                    </p>
                  </div>
                </div>
                <div className="h-dd-actions">
                  <button
                    className="h-dd-btn h-dd-profile"
                    onClick={() => { setShowDropdown(false); navigate(`/student-profile/${rollNo}`); }}
                  >
                    <i className="bi bi-person-lines-fill" />
                    View Profile
                  </button>
                  <button className="h-dd-btn h-dd-changepwd" onClick={openChangePwd}>
                    <i className="bi bi-shield-lock-fill" />
                    Change Password
                  </button>
                  <button
                    className="h-dd-btn h-dd-logout"
                    onClick={() => { setShowDropdown(false); handleLogout(); }}
                  >
                    <i className="bi bi-box-arrow-right" />
                    Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="h-hero">
        <span className="h-greeting-tag">{greeting} 👋</span>
        <h1 className="h-hero-title">{studentName || "Student"}</h1>
        <p className="h-hero-sub">What would you like to work on today?</p>
      </div>

      {/* ── Feature Cards ── */}
      <div className="h-cards">
        {features.map((f) => (
          <Link
            key={f.to}
            to={f.to}
            className="h-card"
            style={{ "--accent": f.accent, "--glow": f.glow }}
          >
            <span className="h-card-tag">{f.tag}</span>
            <div className="h-card-icon-wrap">
              <i className={`bi ${f.icon} h-card-icon`} />
            </div>
            <h3 className="h-card-title">{f.label}</h3>
            <p className="h-card-desc">{f.desc}</p>
            <div className="h-card-arrow">
              Explore <i className="bi bi-arrow-right ms-1" />
            </div>
          </Link>
        ))}
      </div>

      {/* ── Footer ── */}
      <footer className="h-footer">
        © {new Date().getFullYear()} EduPrep · All Rights Reserved
      </footer>

      {/* ── Change / Reset Password Modal ── */}
      {showChangePwd && (
        <div className="h-cp-overlay" onClick={closeModal}>
          <div className="h-cp-modal" onClick={(e) => e.stopPropagation()}>

            {/* Dynamic header */}
            <div className="h-cp-header">
              <div className={`h-cp-icon ${mh.iconClass}`}>
                <i className={`bi ${mh.icon}`} />
              </div>
              <h2 className="h-cp-title">{mh.title}</h2>
              <button className="h-cp-close" onClick={closeModal}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            {/* Alerts */}
            {cpError   && <div className="h-cp-alert h-cp-alert-error">  <i className="bi bi-exclamation-circle-fill" />{cpError}</div>}
            {cpSuccess && <div className="h-cp-alert h-cp-alert-success"><i className="bi bi-check-circle-fill" />{cpSuccess}</div>}

            {/* ── MODE: change password ── */}
            {cpMode === "change" && !cpSuccess && (
              <form onSubmit={handleChangePwd} className="h-cp-form">
                <div className="h-cp-group">
                  <label className="h-cp-label"><i className="bi bi-lock-fill" />Current Password</label>
                  <input type="password" placeholder="Enter current password" className="h-cp-input"
                    value={cpCurrent} onChange={(e) => setCpCurrent(e.target.value)} required />
                </div>
                <div className="h-cp-pwd-wrap">
                  <div className="h-cp-group">
                    <label className="h-cp-label"><i className="bi bi-lock-fill" />New Password</label>
                    <input type="password" placeholder="Create new password" className="h-cp-input"
                      value={cpNew} onChange={(e) => setCpNew(e.target.value)} required />
                  </div>
                  {cpNew && (
                    <ul className="h-cp-hints">
                      {passwordRules.map((rule) => {
                        const met = rule.test(cpNew);
                        return (
                          <li key={rule.id} className={met ? "h-cp-hint-met" : "h-cp-hint-unmet"}>
                            <i className={`bi ${met ? "bi-check-circle-fill" : "bi-circle"}`} />
                            {rule.label}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <div className="h-cp-group">
                  <label className="h-cp-label"><i className="bi bi-shield-lock-fill" />Confirm New Password</label>
                  <input type="password" placeholder="Confirm new password" className="h-cp-input"
                    value={cpConfirm} onChange={(e) => setCpConfirm(e.target.value)} required />
                </div>
                <button type="submit" className="h-cp-submit" disabled={cpLoading}>
                  {cpLoading && <span className="h-cp-spinner" />}
                  {cpLoading ? "Updating..." : "Update Password"}
                </button>
                <button type="button" className="h-cp-fp-link" onClick={switchToFp} disabled={cpLoading}>
                  {cpLoading ? "Sending reset code…" : "Forgot your password?"}
                </button>
              </form>
            )}

            {/* ── MODE: fp2 — enter OTP ── */}
            {cpMode === "fp2" && (
              <>
                <p className="h-cp-fp-sub">
                  We sent a 6-digit code to <span className="h-cp-masked-email">{fpMaskedEmail}</span>
                </p>
                <form onSubmit={handleFpVerify}>
                  <div className="h-cp-otp-boxes" onPaste={handleFpOtpPaste}>
                    {fpOtp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => (fpOtpRefs.current[i] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        className={`h-cp-otp-box${digit ? " h-cp-otp-box-filled" : ""}`}
                        value={digit}
                        onChange={(e) => handleFpOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleFpOtpKeyDown(i, e)}
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>
                  <button type="submit" className="h-cp-submit h-cp-submit-fp" disabled={cpLoading}>
                    {cpLoading && <span className="h-cp-spinner" />}
                    {cpLoading ? "Verifying..." : "Verify Code"}
                  </button>
                </form>
                <div className="h-cp-resend-row">
                  <span className="h-cp-resend-label">Didn't receive it?</span>
                  <button
                    className={`h-cp-resend-btn${fpResendTimer > 0 ? " h-cp-resend-disabled" : ""}`}
                    onClick={handleFpResend}
                    disabled={fpResendTimer > 0}
                  >
                    {fpResendTimer > 0 ? `Resend in ${fpResendTimer}s` : "Resend code"}
                  </button>
                </div>
                <button className="h-cp-back-btn" onClick={() => { setCpMode("change"); setCpError(""); setFpOtp(["","","","","",""]); }}>
                  <i className="bi bi-arrow-left" /> Back to change password
                </button>
              </>
            )}

            {/* ── MODE: fp3 — new password ── */}
            {cpMode === "fp3" && !cpSuccess && (
              <form onSubmit={handleFpReset} className="h-cp-form">
                <div className="h-cp-pwd-wrap">
                  <div className="h-cp-group">
                    <label className="h-cp-label"><i className="bi bi-lock-fill" />New Password</label>
                    <input type="password" placeholder="Create new password" className="h-cp-input"
                      value={fpNewPwd} onChange={(e) => setFpNewPwd(e.target.value)} required autoFocus />
                  </div>
                  {fpNewPwd && (
                    <ul className="h-cp-hints">
                      {passwordRules.map((rule) => {
                        const met = rule.test(fpNewPwd);
                        return (
                          <li key={rule.id} className={met ? "h-cp-hint-met" : "h-cp-hint-unmet"}>
                            <i className={`bi ${met ? "bi-check-circle-fill" : "bi-circle"}`} />
                            {rule.label}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <div className="h-cp-group">
                  <label className="h-cp-label"><i className="bi bi-shield-lock-fill" />Confirm Password</label>
                  <input type="password" placeholder="Confirm new password" className="h-cp-input"
                    value={fpConfirmPwd} onChange={(e) => setFpConfirmPwd(e.target.value)} required />
                </div>
                <button type="submit" className="h-cp-submit h-cp-submit-fp" disabled={cpLoading}>
                  {cpLoading && <span className="h-cp-spinner" />}
                  {cpLoading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
