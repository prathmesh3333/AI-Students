import { useState } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import axios from 'axios';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './Register.css';

const passwordRules = [
    { id: "minLen",   label: "At least 6 characters",        test: (p) => p.length >= 6 },
    { id: "upper",    label: "At least one uppercase letter", test: (p) => /[A-Z]/.test(p) },
    { id: "lower",    label: "At least one lowercase letter", test: (p) => /[a-z]/.test(p) },
    { id: "number",   label: "At least one number",           test: (p) => /[0-9]/.test(p) },
    { id: "special",  label: "At least one special character (@, #, $ …)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const Register = () => {
    const [rollNo, setRollNo] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [branch, setBranch] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPasswordHints, setShowPasswordHints] = useState(false);
    const [exiting, setExiting] = useState(false);

    const location = useLocation();
    const fromLogin = location.state?.fromLogin;

    const branches = [
        "Computer Engineering",
        "IT",
        "EXTC",
        "Electrical",
        "Mechanical"
    ];

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

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
            const response = await axios.post('http://localhost:5000/api/auth/register', {
                rollNo,
                name,
                password,
                confirmPassword,
                branch
            });

            if (response.data.message === "Registration successful") {
                setSuccess("Registered successfully! Redirecting to login...");
                setTimeout(() => navigate('/login'), 2000);
            }
        } catch (err) {
            if (err.response && err.response.data && err.response.data.error) {
                setError(err.response.data.error);
            } else {
                setError("Something went wrong. Try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    const goToLogin = () => {
        setExiting(true);
        setTimeout(() => navigate('/login', { state: { fromRegister: true } }), 320);
    };

    return (
        <div className="register-wrapper">
            <div className={`register-card${fromLogin ? ' card-enter-from-login' : ''}${exiting ? ' card-exit-to-login' : ''}`}>
                <div className="register-header">
                    <div className="register-logo">
                        <i className="bi bi-person-plus-fill"></i>
                    </div>
                    <h1 className="register-title">Create Account</h1>
                    <p className="register-subtitle">Join AI-Student to start your learning journey</p>
                </div>

                {error && (
                    <div className="register-alert register-alert-error">
                        <i className="bi bi-exclamation-circle-fill"></i>
                        {error}
                    </div>
                )}
                {success && (
                    <div className="register-alert register-alert-success">
                        <i className="bi bi-check-circle-fill"></i>
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="register-form">
                    <div className="form-group">
                        <label className="form-label">
                            <i className="bi bi-card-text"></i>
                            Roll Number
                        </label>
                        <input
                            type="text"
                            placeholder="Enter your roll number"
                            className="form-control"
                            value={rollNo}
                            onChange={(e) => setRollNo(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">
                            <i className="bi bi-person-fill"></i>
                            Full Name
                        </label>
                        <input
                            type="text"
                            placeholder="Enter your full name"
                            className="form-control"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">
                            <i className="bi bi-building"></i>
                            Branch
                        </label>
                        <select
                            className="form-select"
                            value={branch}
                            onChange={(e) => setBranch(e.target.value)}
                            required
                        >
                            <option value="">Select your branch</option>
                            {branches.map((branchName) => (
                                <option key={branchName} value={branchName}>
                                    {branchName}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">
                            <i className="bi bi-lock-fill"></i>
                            Password
                        </label>
                        <input
                            type="password"
                            placeholder="Create a password"
                            className="form-control"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onFocus={() => setShowPasswordHints(true)}
                            required
                        />
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
                    <div className="form-group">
                        <label className="form-label">
                            <i className="bi bi-shield-lock-fill"></i>
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            placeholder="Confirm your password"
                            className="form-control"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="register-submit-btn"
                        disabled={loading}
                    >
                        {loading && <span className="spinner"></span>}
                        {loading ? "Creating Account..." : "Create Account"}
                    </button>
                </form>

                <div className="register-divider">
                    <span>Already have an account?</span>
                </div>

                <div className="register-footer">
                    <button type="button" className="register-login-btn" onClick={goToLogin}>
                        Sign In
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Register;
