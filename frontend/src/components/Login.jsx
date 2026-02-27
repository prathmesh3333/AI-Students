import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import axios from 'axios';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './Login.css';
import { setStudentAuth, setTeacherAuth } from '../utils/auth';

const passwordRules = [
    { id: "minLen",  label: "At least 6 characters",                    test: (p) => p.length >= 6 },
    { id: "upper",   label: "At least one uppercase letter",             test: (p) => /[A-Z]/.test(p) },
    { id: "lower",   label: "At least one lowercase letter",             test: (p) => /[a-z]/.test(p) },
    { id: "number",  label: "At least one number",                       test: (p) => /[0-9]/.test(p) },
    { id: "special", label: "At least one special character (@, #, $ …)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const Login = () => {
    // ── Login state ────────────────────────────────────────────
    const [rollNo, setRollNo]           = useState("");
    const [password, setPassword]       = useState("");
    const [error, setError]             = useState("");
    const [success, setSuccess]         = useState("");
    const [loading, setLoading]         = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [exiting, setExiting]         = useState(false);

    // ── Forgot Password state ──────────────────────────────────
    const [fpStep, setFpStep]             = useState(0); // 0=login 1=roll 2=otp 3=newpwd
    const [fpRollNo, setFpRollNo]         = useState("");
    const [fpOtp, setFpOtp]               = useState(["","","","","",""]);
    const [fpMaskedEmail, setFpMaskedEmail] = useState("");
    const [fpResetToken, setFpResetToken] = useState("");
    const [fpNewPwd, setFpNewPwd]         = useState("");
    const [fpConfirmPwd, setFpConfirmPwd] = useState("");
    const [fpResendTimer, setFpResendTimer] = useState(0);
    const fpOtpRefs = useRef([]);

    const navigate = useNavigate();
    const location = useLocation();
    const fromRegister = location.state?.fromRegister;

    // ── Resend countdown timer ─────────────────────────────────
    useEffect(() => {
        if (fpResendTimer <= 0) return;
        const t = setTimeout(() => setFpResendTimer(r => r - 1), 1000);
        return () => clearTimeout(t);
    }, [fpResendTimer]);

    // ── Login submit ───────────────────────────────────────────
    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(""); setSuccess("");
        if (!rollNo || !password) { setError("Please fill in all fields."); return; }
        setLoading(true);
        try {
            const isEmail = rollNo.includes("@");
            if (isEmail) {
                const response = await axios.post("http://localhost:5000/api/teacher/login", { email: rollNo, password });
                if (response.data?.success) {
                    setTeacherAuth(response.data.token, response.data.teacher);
                    setSuccess("Teacher login successful! Redirecting...");
                    setTimeout(() => navigate("/teacher-dashboard"), 1500);
                } else {
                    setError(response.data.error || "Invalid teacher credentials");
                }
            } else {
                const response = await axios.post("http://localhost:5000/api/auth/login", { rollNo, password });
                if (response.data?.message === "Login successful") {
                    setStudentAuth(response.data.token, response.data.user);
                    setSuccess("Login successful! Redirecting...");
                    setTimeout(() => navigate("/home"), 1500);
                } else {
                    setError(response.data.error || "Invalid credentials");
                }
            }
        } catch (err) {
            setError(err.response?.data?.error || "Something went wrong. Try again.");
        } finally {
            setLoading(false);
        }
    };

    // ── FP Step 1: Send OTP ────────────────────────────────────
    const handleFpSend = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await axios.post("http://localhost:5000/api/auth/forgot-password", { rollNo: fpRollNo });
            setFpMaskedEmail(res.data.email);
            setFpResendTimer(60);
            setFpStep(2);
        } catch (err) {
            setError(err.response?.data?.error || "Failed to send OTP. Check your roll number.");
        } finally {
            setLoading(false);
        }
    };

    // ── FP Step 2: OTP input handlers ─────────────────────────
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

    // ── FP Step 2: Verify OTP ─────────────────────────────────
    const handleFpVerify = async (e) => {
        e.preventDefault();
        setError("");
        const code = fpOtp.join("");
        if (code.length < 6) { setError("Enter the complete 6-digit code."); return; }
        setLoading(true);
        try {
            const res = await axios.post("http://localhost:5000/api/auth/verify-reset-otp", { rollNo: fpRollNo, otp: code });
            setFpResetToken(res.data.resetToken);
            setFpStep(3);
        } catch (err) {
            setError(err.response?.data?.error || "Invalid OTP. Try again.");
            setFpOtp(["","","","","",""]);
            fpOtpRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    // ── FP Step 2: Resend OTP ─────────────────────────────────
    const handleFpResend = async () => {
        if (fpResendTimer > 0) return;
        setError("");
        try {
            const res = await axios.post("http://localhost:5000/api/auth/forgot-password", { rollNo: fpRollNo });
            setFpMaskedEmail(res.data.email);
            setFpResendTimer(60);
            setFpOtp(["","","","","",""]);
            fpOtpRefs.current[0]?.focus();
        } catch (err) {
            setError(err.response?.data?.error || "Failed to resend OTP.");
        }
    };

    // ── FP Step 3: Reset Password ─────────────────────────────
    const handleFpReset = async (e) => {
        e.preventDefault();
        setError("");
        if (fpNewPwd !== fpConfirmPwd) { setError("Passwords do not match."); return; }
        if (fpNewPwd.length < 6) { setError("Password must be at least 6 characters."); return; }
        setLoading(true);
        try {
            await axios.post("http://localhost:5000/api/auth/reset-password", {
                resetToken: fpResetToken,
                newPassword: fpNewPwd,
            });
            setSuccess("Password reset successful! Please sign in with your new password.");
            resetFpFlow();
        } catch (err) {
            setError(err.response?.data?.error || "Failed to reset password. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const resetFpFlow = () => {
        setFpStep(0);
        setFpRollNo(""); setFpOtp(["","","","","",""]);
        setFpMaskedEmail(""); setFpResetToken("");
        setFpNewPwd(""); setFpConfirmPwd("");
        setFpResendTimer(0); setError("");
    };

    const goToRegister = () => {
        setExiting(true);
        setTimeout(() => navigate('/register', { state: { fromLogin: true } }), 320);
    };

    return (
        <div className="login-wrapper">
            <div className={`login-card${fromRegister ? ' card-enter-from-register' : ''}${exiting ? ' card-exit-to-register' : ''}`}>

                {/* ── MAIN LOGIN ── */}
                {fpStep === 0 && (
                    <>
                        <div className="login-header">
                            <div className="login-logo"><i className="bi bi-mortarboard-fill"></i></div>
                            <h1 className="login-title">Welcome Back</h1>
                            <p className="login-subtitle">Sign in to continue your learning journey</p>
                        </div>

                        {error   && <div className="login-alert login-alert-error">  <i className="bi bi-exclamation-circle-fill"></i>{error}</div>}
                        {success && <div className="login-alert login-alert-success"><i className="bi bi-check-circle-fill"></i>{success}</div>}

                        <form onSubmit={handleSubmit} className="login-form">
                            <div className="form-group">
                                <label className="form-label"><i className="bi bi-person-fill"></i>Roll Number / Email</label>
                                <input type="text" placeholder="Enter your roll number or email" className="form-control"
                                    value={rollNo} onChange={(e) => setRollNo(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label"><i className="bi bi-lock-fill"></i>Password</label>
                                <div className="fp-pwd-wrap">
                                    <input type={showPassword ? "text" : "password"} placeholder="Enter your password" className="form-control"
                                        value={password} onChange={(e) => setPassword(e.target.value)} required />
                                    <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"} fp-eye`}
                                        onClick={() => setShowPassword(!showPassword)} />
                                </div>
                                <button type="button" className="fp-link" onClick={() => { setFpStep(1); setError(""); setSuccess(""); }}>
                                    Forgot password?
                                </button>
                            </div>
                            <button type="submit" className="login-submit-btn" disabled={loading}>
                                {loading && <span className="spinner"></span>}
                                {loading ? "Signing In..." : "Sign In"}
                            </button>
                        </form>

                        <div className="login-divider"><span>New to EduPrep?</span></div>
                        <div className="login-footer">
                            <button type="button" className="login-register-btn" onClick={goToRegister}>Create Account</button>
                        </div>
                    </>
                )}

                {/* ── FP STEP 1: Enter Roll Number ── */}
                {fpStep === 1 && (
                    <>
                        <div className="login-header">
                            <div className="login-logo fp-logo-key"><i className="bi bi-key-fill"></i></div>
                            <h1 className="login-title">Forgot Password?</h1>
                            <p className="login-subtitle">Enter your roll number and we'll send a reset code to your linked email</p>
                        </div>

                        {error && <div className="login-alert login-alert-error"><i className="bi bi-exclamation-circle-fill"></i>{error}</div>}

                        <form onSubmit={handleFpSend} className="login-form">
                            <div className="form-group">
                                <label className="form-label"><i className="bi bi-person-badge-fill"></i>Roll Number</label>
                                <input type="text" placeholder="Enter your roll number" className="form-control"
                                    value={fpRollNo} onChange={(e) => setFpRollNo(e.target.value)} required autoFocus />
                            </div>
                            <button type="submit" className="login-submit-btn" disabled={loading}>
                                {loading && <span className="spinner"></span>}
                                {loading ? "Sending code..." : "Send Reset Code"}
                            </button>
                        </form>

                        <button className="fp-back-btn" onClick={resetFpFlow}>
                            <i className="bi bi-arrow-left"></i> Back to sign in
                        </button>
                    </>
                )}

                {/* ── FP STEP 2: Enter OTP ── */}
                {fpStep === 2 && (
                    <>
                        <div className="login-header">
                            <div className="login-logo fp-logo-otp"><i className="bi bi-envelope-check-fill"></i></div>
                            <h1 className="login-title">Check your email</h1>
                            <p className="login-subtitle">
                                We sent a 6-digit code to<br />
                                <span className="fp-email">{fpMaskedEmail}</span>
                            </p>
                        </div>

                        {error && <div className="login-alert login-alert-error"><i className="bi bi-exclamation-circle-fill"></i>{error}</div>}

                        <form onSubmit={handleFpVerify}>
                            <div className="fp-otp-boxes" onPaste={handleFpOtpPaste}>
                                {fpOtp.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={(el) => (fpOtpRefs.current[i] = el)}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        className={`fp-otp-box${digit ? " fp-otp-box-filled" : ""}`}
                                        value={digit}
                                        onChange={(e) => handleFpOtpChange(i, e.target.value)}
                                        onKeyDown={(e) => handleFpOtpKeyDown(i, e)}
                                        autoFocus={i === 0}
                                    />
                                ))}
                            </div>
                            <button type="submit" className="login-submit-btn" disabled={loading}>
                                {loading && <span className="spinner"></span>}
                                {loading ? "Verifying..." : "Verify Code"}
                            </button>
                        </form>

                        <div className="fp-resend-row">
                            <span className="fp-resend-label">Didn't receive it?</span>
                            <button className={`fp-resend-btn${fpResendTimer > 0 ? " fp-resend-disabled" : ""}`}
                                onClick={handleFpResend} disabled={fpResendTimer > 0}>
                                {fpResendTimer > 0 ? `Resend in ${fpResendTimer}s` : "Resend code"}
                            </button>
                        </div>

                        <button className="fp-back-btn" onClick={() => { setFpStep(1); setError(""); setFpOtp(["","","","","",""]); }}>
                            <i className="bi bi-arrow-left"></i> Back
                        </button>
                    </>
                )}

                {/* ── FP STEP 3: New Password ── */}
                {fpStep === 3 && (
                    <>
                        <div className="login-header">
                            <div className="login-logo fp-logo-lock"><i className="bi bi-shield-lock-fill"></i></div>
                            <h1 className="login-title">New Password</h1>
                            <p className="login-subtitle">Create a strong new password for your account</p>
                        </div>

                        {error && <div className="login-alert login-alert-error"><i className="bi bi-exclamation-circle-fill"></i>{error}</div>}

                        <form onSubmit={handleFpReset} className="login-form">
                            <div className="fp-pwd-hints-wrap">
                                <div className="form-group">
                                    <label className="form-label"><i className="bi bi-lock-fill"></i>New Password</label>
                                    <input type="password" placeholder="Create new password" className="form-control"
                                        value={fpNewPwd} onChange={(e) => setFpNewPwd(e.target.value)} required autoFocus />
                                </div>
                                {fpNewPwd && (
                                    <ul className="fp-hints">
                                        {passwordRules.map((rule) => {
                                            const met = rule.test(fpNewPwd);
                                            return (
                                                <li key={rule.id} className={met ? "fp-hint-met" : "fp-hint-unmet"}>
                                                    <i className={`bi ${met ? "bi-check-circle-fill" : "bi-circle"}`}></i>
                                                    {rule.label}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label"><i className="bi bi-shield-lock-fill"></i>Confirm Password</label>
                                <input type="password" placeholder="Confirm new password" className="form-control"
                                    value={fpConfirmPwd} onChange={(e) => setFpConfirmPwd(e.target.value)} required />
                            </div>
                            <button type="submit" className="login-submit-btn" disabled={loading}>
                                {loading && <span className="spinner"></span>}
                                {loading ? "Resetting..." : "Reset Password"}
                            </button>
                        </form>
                    </>
                )}

            </div>
        </div>
    );
};

export default Login;
