import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Home.css";

const Home = () => {
  const [studentName, setStudentName] = useState("");
  const [studentBranch, setStudentBranch] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

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

  return (
    <div className="home-wrapper">
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark navbar-custom px-4">
        <h3 className="navbar-brand fw-bold mb-0">Student Dashboard</h3>
        <div className="ms-auto profile-dropdown-container">
          <button
            className="profile-icon-btn"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <i className="bi bi-person-circle"></i>
          </button>

          {showDropdown && (
            <>
              <div className="dropdown-backdrop" onClick={() => setShowDropdown(false)}></div>
              <div className="profile-dropdown">
                <div className="dropdown-header">
                  <div className="dropdown-avatar">
                    {studentName.charAt(0).toUpperCase()}
                  </div>
                  <div className="dropdown-info">
                    <div className="dropdown-name">{studentName}</div>
                    <div className="dropdown-detail">
                      <i className="bi bi-building me-1"></i>
                      {studentBranch}
                    </div>
                    <div className="dropdown-detail">
                      <i className="bi bi-person-badge me-1"></i>
                      {rollNo}
                    </div>
                  </div>
                </div>
                <div className="dropdown-actions">
                  <button
                    className="dropdown-btn view-profile-btn"
                    onClick={() => {
                      setShowDropdown(false);
                      navigate(`/student-profile/${rollNo}`);
                    }}
                  >
                    <i className="bi bi-eye me-2"></i>
                    View Profile
                  </button>
                  <button
                    className="dropdown-btn logout-btn"
                    onClick={() => {
                      setShowDropdown(false);
                      handleLogout();
                    }}
                  >
                    <i className="bi bi-box-arrow-right me-2"></i>
                    Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </nav>

      {/* Main Options */}
      <div className="container d-flex flex-column justify-content-center align-items-center flex-grow-1 landing-container">
        <h2 className="fw-bold my-5 text-center landing-title">
          Choose Your Path
        </h2>

        <div className="d-flex flex-row gap-5 justify-content-center options-container">

          {/* Start Test */}
          <Link to="/test-selection" className="option-card option-card-primary">
            <div className="option-icon">
              <i className="bi bi-pencil-square"></i>
            </div>
            <h4 className="option-title">Start Test</h4>
            <p className="option-desc">Take scheduled tests and track your progress.</p>
          </Link>

          {/* Start Mock Interview */}
          <Link to="/mock-interview" className="option-card option-card-success">
            <div className="option-icon">
              <i className="bi bi-mic-fill"></i>
            </div>
            <h4 className="option-title">Start Mock Interview</h4>
            <p className="option-desc">Practice AI-based mock interviews and improve skills.</p>
          </Link>
          <Link to="/question-mode" className="option-card option-card-warning">
          <div className="option-icon">
      <i className="bi bi-question-circle-fill"></i>
    </div>
    <h4 className="option-title">Question Module</h4>
    <p className="option-desc">
      Practice subject-wise questions and improve concepts.
    </p>
  </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer-custom">
        <p className="mb-0">
          © {new Date().getFullYear()} Student Dashboard | All Rights Reserved
        </p>
      </footer>
    </div>
  );
};

export default Home;
