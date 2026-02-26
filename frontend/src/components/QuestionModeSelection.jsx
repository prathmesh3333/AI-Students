import React from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./QuestionModeSelection.css";
import "./PageNav.css";

const QuestionModeSelection = () => {
  const navigate = useNavigate();

  const handleModeSelect = (mode) => {
    navigate(`/branch-selection?mode=${mode}`);
  };

  return (
    <div className="mode-selection-wrapper">
      <nav className="page-nav">
        <button className="page-nav-back" onClick={() => navigate("/home")}>
          <i className="bi bi-arrow-left"></i> Back to Home
        </button>
      </nav>
      <div className="mode-selection-container">
        <div className="mode-header">
          <h1 className="mode-title">Question Module</h1>
          <p className="mode-subtitle">Choose what you'd like to do</p>
        </div>

        <div className="mode-cards-container">
          <div
            className="mode-card add-mode"
            onClick={() => handleModeSelect("add")}
          >
            <div className="mode-icon add-icon">
              <span className="icon-main">➕</span>
              <span className="icon-bg">📝</span>
            </div>
            <h2 className="mode-card-title">Add Questions</h2>
            <p className="mode-card-description">
              Contribute new interview questions to help your peers prepare better
            </p>
            <ul className="mode-features">
              <li>✓ Add company-specific questions</li>
              <li>✓ Organize by branch</li>
              <li>✓ Help the community</li>
            </ul>
            <div className="mode-action">
              Get Started →
            </div>
          </div>

          <div
            className="mode-card view-mode"
            onClick={() => handleModeSelect("view")}
          >
            <div className="mode-icon view-icon">
              <span className="icon-main">👁️</span>
              <span className="icon-bg">📚</span>
            </div>
            <h2 className="mode-card-title">View Questions</h2>
            <p className="mode-card-description">
              Browse and practice interview questions organized by branch and company
            </p>
            <ul className="mode-features">
              <li>✓ Filter by branch</li>
              <li>✓ Browse by company</li>
              <li>✓ Prepare for interviews</li>
            </ul>
            <div className="mode-action">
              Browse Now →
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default QuestionModeSelection;
