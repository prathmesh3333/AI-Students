import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import axios from 'axios';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './Register.css';

const passwordRules = [
    { id: "minLen",  label: "At least 6 characters",        test: (p) => p.length >= 6 },
    { id: "upper",   label: "At least one uppercase letter", test: (p) => /[A-Z]/.test(p) },
    { id: "lower",   label: "At least one lowercase letter", test: (p) => /[a-z]/.test(p) },
    { id: "number",  label: "At least one number",           test: (p) => /[0-9]/.test(p) },
    { id: "special", label: "At least one special character (@, #, $ …)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const RESEND_WAIT = 60; // seconds

const Register = () => {
    // ── Step 1 state ──────────────────────────────────────────
    const [step, setStep]           = useState(1); // 1 = form, 2 = OTP
    const [rollNo, setRollNo]       = useState("");
    const [name, setName]           = useState("");
    const [email, setEmail]         = useState("");
    const [branch, setBranch]       = useState("");
    const [password, setPassword]   = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPasswordHints, setShowPasswordHints] = useState(false);

    // ── Step 2 state ──────────────────────────────────────────
    const [otp, setOtp]             = useState(["", "", "", "", "", ""]);
    const [sentEmail, setSentEmail] = useState(""); // email OTP was sent to
    const [resendTimer, setResendTimer] = useState(0);
    const otpRefs = useRef([]);

    // ── Shared state ──────────────────────────────────────────
    const [error, setError]     = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [exiting, setExiting] = useState(false);

    const navigate  = useNavigate();
    const location  = useLocation();
    const fromLogin = location.state?.fromLogin;

    const branches = ["Computer Engineering", "IT", "EXTC", "Electrical", "Mechanical"];

    // ── Resend countdown timer ────────────────────────────────
    useEffect(() => {
        if (resendTimer <= 0) return;
        const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
        return () => clearTimeout(t);
    }, [resendTimer]);

    // ── Step 1: Submit form → send OTP ────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        const failedRule = passwordRules.find((r) => !r.test(password));
        if (failedRule) {
            setError(`Password must satisfy: ${failedRule.label.toLowerCase()}`);
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match!");
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post("http://localhost:5000/api/auth/register", {
                rollNo, name, email, password, confirmPassword, branch,
            });
            setSentEmail(res.data.email);
            setResendTimer(RESEND_WAIT);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.error || "Something went wrong. Try again.");
        } finally {
            setLoading(false);
        }
    };

    // ── OTP input handlers ────────────────────────────────────
    const handleOtpChange = (index, value) => {
        if (!/^\d?$/.test(value)) return; // digits only
        const next = [...otp];
        next[index] = value;
        setOtp(next);
        if (value && index < 5) otpRefs.current[index + 1]?.focus();
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e) => {
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (pasted.length === 6) {
            setOtp(pasted.split(""));
            otpRefs.current[5]?.focus();
        }
        e.preventDefault();
    };

    // ── Step 2: Verify OTP ────────────────────────────────────
    const handleVerify = async (e) => {
        e.preventDefault();
        setError("");

        const otpCode = otp.join("");
        if (otpCode.length < 6) {
            setError("Please enter the complete 6-digit OTP.");
            return;
        }

        setLoading(true);
        try {
            await axios.post("http://localhost:5000/api/auth/verify-otp", {
                rollNo, otp: otpCode,
            });
            setSuccess("Account created! Redirecting to login...");
            setTimeout(() => navigate("/login", { state: { fromRegister: true } }), 1800);
        } catch (err) {
            setError(err.response?.data?.error || "Invalid OTP. Try again.");
            setOtp(["", "", "", "", "", ""]);
            otpRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    // ── Resend OTP ────────────────────────────────────────────
    const handleResend = async () => {
        if (resendTimer > 0) return;
        setError("");
        try {
            await axios.post("http://localhost:5000/api/auth/resend-otp", { rollNo });
            setResendTimer(RESEND_WAIT);
            setOtp(["", "", "", "", "", ""]);
            otpRefs.current[0]?.focus();
        } catch (err) {
            setError(err.response?.data?.error || "Failed to resend OTP.");
        }
    };

    const goToLogin = () => {
        setExiting(true);
        setTimeout(() => navigate("/login", { state: { fromRegister: true } }), 320);
    };

    // ─────────────────────────────────────────────────────────
    return (
        <div className="register-wrapper">
            <div className={`register-card${fromLogin ? " card-enter-from-login" : ""}${exiting ? " card-exit-to-login" : ""}`}>

                {/* ── STEP 1: Registration Form ── */}
                {step === 1 && (
                    <>
                        <div className="register-header">
                            <div className="register-logo">
                                <i className="bi bi-person-plus-fill"></i>
                            </div>
                            <h1 className="register-title">Create Account</h1>
                            <p className="register-subtitle">Join EduPrep to start your learning journey</p>
                        </div>

                        {error && (
                            <div className="register-alert register-alert-error">
                                <i className="bi bi-exclamation-circle-fill"></i>{error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="register-form">
                            <div className="form-row-2">
                                <div className="form-group">
                                    <label className="form-label"><i className="bi bi-card-text"></i>Roll Number</label>
                                    <input type="text" placeholder="Roll number" className="form-control"
                                        value={rollNo} onChange={(e) => setRollNo(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label"><i className="bi bi-person-fill"></i>Full Name</label>
                                    <input type="text" placeholder="Full name" className="form-control"
                                        value={name} onChange={(e) => setName(e.target.value)} required />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label"><i className="bi bi-envelope-fill"></i>Email</label>
                                <input type="email" placeholder="your@email.com" className="form-control"
                                    value={email} onChange={(e) => setEmail(e.target.value)} required />
                            </div>

                            <div className="form-group">
                                <label className="form-label"><i className="bi bi-building"></i>Branch</label>
                                <select className="form-select" value={branch}
                                    onChange={(e) => setBranch(e.target.value)} required>
                                    <option value="">Select your branch</option>
                                    {branches.map((b) => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>

                            <div className="pw-row-wrap">
                                <div className="form-row-2">
                                    <div className="form-group">
                                        <label className="form-label"><i className="bi bi-lock-fill"></i>Password</label>
                                        <input type="password" placeholder="Create password" className="form-control"
                                            value={password} onChange={(e) => setPassword(e.target.value)}
                                            onFocus={() => setShowPasswordHints(true)} required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label"><i className="bi bi-shield-lock-fill"></i>Confirm</label>
                                        <input type="password" placeholder="Confirm password" className="form-control"
                                            value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                                    </div>
                                </div>

                                {showPasswordHints && (
                                    <ul className="password-hints">
                                        {passwordRules.map((rule) => {
                                            const met = rule.test(password);
                                            return (
                                                <li key={rule.id} className={met ? "hint-met" : "hint-unmet"}>
                                                    <i className={`bi ${met ? "bi-check-circle-fill" : "bi-circle"}`}></i>
                                                    {rule.label}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>

                            <button type="submit" className="register-submit-btn" disabled={loading}>
                                {loading && <span className="spinner"></span>}
                                {loading ? "Sending OTP..." : "Send Verification Code"}
                            </button>
                        </form>

                        <div className="register-divider"><span>Already have an account?</span></div>
                        <div className="register-footer">
                            <button type="button" className="register-login-btn" onClick={goToLogin}>Sign In</button>
                        </div>
                    </>
                )}

                {/* ── STEP 2: OTP Verification ── */}
                {step === 2 && (
                    <div className="otp-step">
                        <div className="register-header">
                            <div className="register-logo otp-logo">
                                <i className="bi bi-envelope-check-fill"></i>
                            </div>
                            <h1 className="register-title">Check your email</h1>
                            <p className="register-subtitle">
                                We sent a 6-digit code to<br />
                                <span className="otp-email">{sentEmail}</span>
                            </p>
                        </div>

                        {error && (
                            <div className="register-alert register-alert-error">
                                <i className="bi bi-exclamation-circle-fill"></i>{error}
                            </div>
                        )}
                        {success && (
                            <div className="register-alert register-alert-success">
                                <i className="bi bi-check-circle-fill"></i>{success}
                            </div>
                        )}

                        <form onSubmit={handleVerify}>
                            <div className="otp-boxes" onPaste={handleOtpPaste}>
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={(el) => (otpRefs.current[i] = el)}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        className={`otp-box${digit ? " otp-box-filled" : ""}`}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(i, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                        autoFocus={i === 0}
                                    />
                                ))}
                            </div>

                            <button type="submit" className="register-submit-btn" disabled={loading || !!success}>
                                {loading && <span className="spinner"></span>}
                                {loading ? "Verifying..." : "Verify & Create Account"}
                            </button>
                        </form>

                        <div className="otp-footer">
                            <span className="otp-resend-label">Didn't receive it?</span>
                            <button
                                className={`otp-resend-btn${resendTimer > 0 ? " otp-resend-disabled" : ""}`}
                                onClick={handleResend}
                                disabled={resendTimer > 0}
                            >
                                {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
                            </button>
                        </div>

                        <button className="otp-back-btn" onClick={() => { setStep(1); setError(""); setOtp(["","","","","",""]); }}>
                            <i className="bi bi-arrow-left"></i> Wrong email? Go back
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};

export default Register;
