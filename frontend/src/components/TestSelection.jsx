import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./TestSelection.css";

const TestSelection = () => {
  const [studentName, setStudentName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const name = localStorage.getItem("studentName");
    const roll = localStorage.getItem("rollNo");
    if (!name || !roll) {
      navigate("/login");
    } else {
      setStudentName(name);
    }
  }, [navigate]);

  return (
    <div className="test-sel-wrapper">
      {/* Navbar */}
      <nav className="navbar navbar-dark navbar-custom px-4">
        <button className="back-btn" onClick={() => navigate("/home")}>
          <i className="bi bi-arrow-left"></i>
        </button>
        <h3 className="navbar-brand fw-bold mb-0 mx-auto">Select Test Type</h3>
        <div style={{ width: "42px" }} /> {/* spacer to centre the title */}
      </nav>

      {/* Content */}
      <div className="test-sel-body">
        <p className="test-sel-greeting">
          Hello, <span>{studentName}</span>! What would you like to do today?
        </p>

        <div className="test-sel-cards">
          {/* Mock Test */}
          <button
            className="test-sel-card test-sel-card-mock"
            onClick={() => navigate("/mock-test-setup")}
          >
            <div className="ts-icon-wrap ts-icon-mock">
              <i className="bi bi-cpu-fill"></i>
            </div>
            <h4 className="ts-title">Give Mock Test</h4>
            <p className="ts-desc">
              Practise with AI-powered mock sessions to sharpen your skills before the real thing.
            </p>
            <span className="ts-cta">
              Start Practising <i className="bi bi-arrow-right"></i>
            </span>
          </button>

          {/* Academic Test */}
          <button
            className="test-sel-card test-sel-card-academic"
            onClick={() => navigate("/start-test")}
          >
            <div className="ts-icon-wrap ts-icon-academic">
              <i className="bi bi-journal-text"></i>
            </div>
            <h4 className="ts-title">Give Academic Test</h4>
            <p className="ts-desc">
              Attempt scheduled tests assigned by your teacher and track your academic progress.
            </p>
            <span className="ts-cta">
              Go to Tests <i className="bi bi-arrow-right"></i>
            </span>
          </button>
        </div>
      </div>

      <footer className="footer-custom text-center py-3">
        © {new Date().getFullYear()} Student Dashboard
      </footer>
    </div>
  );
};

export default TestSelection;
