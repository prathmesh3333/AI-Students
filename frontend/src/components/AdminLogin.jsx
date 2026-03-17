import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { setAdminAuth } from "../utils/auth";
import "./AdminLogin.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const AdminLogin = () => {
  const navigate = useNavigate();

  const [form, setForm]       = useState({ email: "", password: "" });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleChange = (e) => {
    setError("");
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.email || !form.password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/api/admin/login`, {
        email:    form.email.trim(),
        password: form.password,
      });

      if (data.success) {
        setAdminAuth(data.token, data.admin);
        sessionStorage.setItem("adminJustLoggedIn", "1");
        navigate("/admin-dashboard", { replace: true });
      } else {
        setError(data.error || "Login failed.");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="al-page">
      {/* Background blobs */}
      <div className="al-blob al-blob--1"></div>
      <div className="al-blob al-blob--2"></div>

      <div className="al-card animate-scaleIn">
        {/* Header */}
        <div className="al-header">
          <div className="al-icon-wrap">
            <i className="bi bi-shield-lock-fill"></i>
          </div>
          <h1 className="al-title">Admin Portal</h1>
          <p className="al-subtitle">EduPrep Platform Management</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="al-form" noValidate>
          {error && (
            <div className="al-alert">
              <i className="bi bi-exclamation-circle-fill me-2"></i>
              {error}
            </div>
          )}

          {/* Email */}
          <div className="al-field">
            <label className="al-label" htmlFor="email">
              <i className="bi bi-envelope-fill me-1"></i> Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="al-input"
              placeholder="admin@eduprep.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              autoFocus
            />
          </div>

          {/* Password */}
          <div className="al-field">
            <label className="al-label" htmlFor="password">
              <i className="bi bi-lock-fill me-1"></i> Password
            </label>
            <div className="al-pw-wrap">
              <input
                id="password"
                name="password"
                type={showPw ? "text" : "password"}
                className="al-input"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="al-pw-toggle"
                onClick={() => setShowPw((v) => !v)}
                tabIndex={-1}
              >
                <i className={`bi ${showPw ? "bi-eye-slash" : "bi-eye"}`}></i>
              </button>
            </div>
          </div>

          <button className="al-btn" type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="al-spinner"></span>
                Signing in…
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-in-right me-2"></i>
                Sign In
              </>
            )}
          </button>
        </form>

        <p className="al-back">
          <a href="/login">
            <i className="bi bi-arrow-left me-1"></i>Back to student login
          </a>
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
