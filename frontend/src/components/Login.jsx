import { useState } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import axios from 'axios';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './Login.css';

const Login = () => {
    const [rollNo, setRollNo] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [exiting, setExiting] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const fromRegister = location.state?.fromRegister;

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (!rollNo || !password) {
            setError("Please fill in all fields.");
            return;
        }

        setLoading(true);

        try {
            // Check if the input is an email (teacher login)
            const isEmail = rollNo.includes("@");

            if (isEmail) {
                // Teacher Login
                const response = await axios.post("http://localhost:5000/api/teacher/login", {
                    email: rollNo,
                    password
                });

                if (response.data && response.data.success) {
                    localStorage.setItem("teacherEmail", response.data.teacher.email);
                    localStorage.setItem("teacherName", response.data.teacher.name);

                    setSuccess("Teacher login successful! Redirecting...");
                    setTimeout(() => navigate("/teacher-dashboard"), 1500);
                } else {
                    setError(response.data.error || "Invalid teacher credentials");
                }
            } else {
                // Student Login
                const response = await axios.post("http://localhost:5000/api/auth/login", {
                    rollNo,
                    password
                });

                if (response.data && response.data.message === "Login successful") {
                    localStorage.setItem("rollNo", response.data.user.rollNo);
                    localStorage.setItem("studentName", response.data.user.name);
                    localStorage.setItem("studentBranch", response.data.user.branch);

                    setSuccess("Login successful! Redirecting...");
                    setTimeout(() => navigate("/home"), 1500);
                } else {
                    setError(response.data.error || "Invalid credentials");
                }
            }
        } catch (err) {
            console.error("Login Error:", err);
            if (err.response && err.response.data) {
                setError(err.response.data.error || "Invalid credentials");
            } else {
                setError("Something went wrong. Try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    const goToRegister = () => {
        setExiting(true);
        setTimeout(() => navigate('/register', { state: { fromLogin: true } }), 320);
    };

    return (
        <div className="login-wrapper">
            <div className={`login-card${fromRegister ? ' card-enter-from-register' : ''}${exiting ? ' card-exit-to-register' : ''}`}>
                <div className="login-header">
                    <div className="login-logo">
                        <i className="bi bi-mortarboard-fill"></i>
                    </div>
                    <h1 className="login-title">Welcome Back</h1>
                    <p className="login-subtitle">Sign in to continue your learning journey</p>
                </div>

                {error && (
                    <div className="login-alert login-alert-error">
                        <i className="bi bi-exclamation-circle-fill"></i>
                        {error}
                    </div>
                )}
                {success && (
                    <div className="login-alert login-alert-success">
                        <i className="bi bi-check-circle-fill"></i>
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label className="form-label">
                            <i className="bi bi-person-fill"></i>
                            Roll Number / Email
                        </label>
                        <input
                            type="text"
                            placeholder="Enter your roll number or email"
                            className="form-control"
                            value={rollNo}
                            onChange={(e) => setRollNo(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">
                            <i className="bi bi-lock-fill"></i>
                            Password
                        </label>
                        {/* <input
                            type="password"
                            placeholder="Enter your password"
                            className="form-control"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        /> */}
                        <div className="form-group position-relative">
  <label className="form-label">
  </label>

  <input
    type={showPassword ? "text" : "password"}
    placeholder="Enter your password"
    className="form-control"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    required
  />

  <i
    className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}
    onClick={() => setShowPassword(!showPassword)}
    style={{
      position: "absolute",
      right: "15px",
      top: "55%",
      transform: "translateY(-50%)",
      cursor: "pointer",
      fontSize: "18px",
      color: "#666"
    }}
  ></i>
</div>

                    </div>
                    <button
                        type="submit"
                        className="login-submit-btn"
                        disabled={loading}
                    >
                        {loading && <span className="spinner"></span>}
                        {loading ? "Signing In..." : "Sign In"}
                    </button>
                </form>

                <div className="login-divider">
                    <span>New to AI-Student?</span>
                </div>

                <div className="login-footer">
                    <button type="button" className="login-register-btn" onClick={goToRegister}>
                        Create Account
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
