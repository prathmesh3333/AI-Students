import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Home.css";

const Home = () => {
  const [studentName, setStudentName] = useState("");
  const [studentBranch, setStudentBranch] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    const storedName = localStorage.getItem("studentName");
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
    localStorage.removeItem("studentName");
    localStorage.removeItem("rollNo");
    navigate("/login");
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
        <p className="h-hero-sub">
          What would you like to work on today?
        </p>
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
    </div>
  );
};

export default Home;
