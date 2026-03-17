import React from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./QuestionModeSelection.css";
import "./PageNav.css";

const QuestionModeSelection = () => {
  const navigate = useNavigate();

  return (
    <div className="mode-selection-wrapper">
      <nav className="page-nav">
        <button className="page-nav-back" onClick={() => navigate("/home")}>
          <i className="bi bi-arrow-left"></i> Back to Home
        </button>
      </nav>

      <div className="mode-selection-container">
        <div className="mode-header">
          <div className="qms-badge">
            <i className="bi bi-book-half"></i>
            Question Bank
          </div>
          <h1 className="mode-title">What would you like to do?</h1>
          <p className="mode-subtitle">
            Contribute questions or browse the community question bank
          </p>
        </div>

        <div className="mode-cards-container">
          <div
            className="mode-card add-mode"
            onClick={() => navigate(`/branch-selection?mode=add`)}
          >
            <div className="mode-icon add-icon">
              <i className="bi bi-pencil-square"></i>
            </div>
            <h2 className="mode-card-title">Add Questions</h2>
            <p className="mode-card-description">
              Contribute new interview questions to help your peers prepare
              better for placements
            </p>
            <ul className="mode-features">
              <li>
                <i className="bi bi-check-circle-fill"></i>
                Company-specific questions
              </li>
              <li>
                <i className="bi bi-check-circle-fill"></i>
                Organize by branch
              </li>
              <li>
                <i className="bi bi-check-circle-fill"></i>
                Help the community
              </li>
            </ul>
            <div className="mode-action">
              Start Contributing <i className="bi bi-arrow-right"></i>
            </div>
          </div>

          <div
            className="mode-card view-mode"
            onClick={() => navigate(`/branch-selection?mode=view`)}
          >
            <div className="mode-icon view-icon">
              <i className="bi bi-eye"></i>
            </div>
            <h2 className="mode-card-title">View Questions</h2>
            <p className="mode-card-description">
              Browse and practice interview questions organized by branch and
              company to ace your placement
            </p>
            <ul className="mode-features">
              <li>
                <i className="bi bi-check-circle-fill"></i>
                Filter by branch
              </li>
              <li>
                <i className="bi bi-check-circle-fill"></i>
                Browse by company
              </li>
              <li>
                <i className="bi bi-check-circle-fill"></i>
                Year-wise questions
              </li>
            </ul>
            <div className="mode-action">
              Browse Questions <i className="bi bi-arrow-right"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionModeSelection;
