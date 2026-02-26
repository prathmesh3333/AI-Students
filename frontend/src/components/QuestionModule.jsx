import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import SuccessModal from "./SuccessModal";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./QuestionModule.css";
import "./PageNav.css";

const QuestionModule = () => {
  const { branch, company } = useParams();
  const navigate = useNavigate();

  const emptyQuestion = {
    company: company || "",
    year: "",
    position: "",
    question: ""
  };

  const [questions, setQuestions] = useState([emptyQuestion]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleChange = (index, e) => {
    const updated = [...questions];
    updated[index][e.target.name] = e.target.value;
    setQuestions(updated);
  };

  const addQuestion = () => {
    setQuestions([...questions, emptyQuestion]);
  };

  const removeQuestion = (index) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(
        "http://localhost:5000/api/question/add-questions",
        {
          questions,
          branch: branch || "General",
          company: company || questions[0].company
        }
      );

      if (res.data.success) {
        setShowSuccessModal(true);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save questions");
    }
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    navigate(`/company-list/${encodeURIComponent(branch)}?mode=add`);
  };

  return (
    <div className="question-module-wrapper">
      <nav className="page-nav">
        <button
          className="page-nav-back"
          onClick={() => navigate(branch ? `/company-list/${encodeURIComponent(branch)}?mode=add` : "/question-mode")}
        >
          <i className="bi bi-arrow-left"></i> Back
        </button>
      </nav>
      <div className="question-module-container">
        <div className="question-module-header">
          <h1 className="question-module-title">Question Module</h1>
          <p className="question-module-subtitle">
            {branch && company ? (
              <>Adding questions for <strong>{company}</strong> in <strong>{branch}</strong></>
            ) : (
              "Add interview questions to help candidates prepare better"
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {questions.map((q, index) => (
            <div key={index} className="question-card">
              <div className="question-card-header">
                <h3 className="question-number">Question {index + 1}</h3>
                {questions.length > 1 && (
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => removeQuestion(index)}
                  >
                    🗑️ Remove
                  </button>
                )}
              </div>

              <div className="input-row">
                <div className="input-group-custom">
                  <label className="input-label">Company Name</label>
                  <div className="input-with-icon">
                    <span className="input-icon">🏢</span>
                    <input
                      type="text"
                      placeholder="e.g., Google, Microsoft, Amazon"
                      name="company"
                      className="form-control-custom"
                      value={q.company}
                      onChange={(e) => handleChange(index, e)}
                      required
                    />
                  </div>
                </div>

                <div className="input-group-custom">
                  <label className="input-label">Year</label>
                  <div className="input-with-icon">
                    <span className="input-icon">📅</span>
                    <input
                      type="number"
                      placeholder="2026"
                      name="year"
                      className="form-control-custom"
                      value={q.year}
                      onChange={(e) => handleChange(index, e)}
                      required
                      min="2000"
                      max="2030"
                    />
                  </div>
                </div>
              </div>

              <div className="input-group-custom">
                <label className="input-label">Job Position</label>
                <div className="input-with-icon">
                  <span className="input-icon">💼</span>
                  <input
                    type="text"
                    placeholder="e.g., Software Engineer, Data Analyst"
                    name="position"
                    className="form-control-custom"
                    value={q.position}
                    onChange={(e) => handleChange(index, e)}
                    required
                  />
                </div>
              </div>

              <div className="input-group-custom">
                <label className="input-label">Question</label>
                <div className="input-with-icon">
                  <span className="input-icon" style={{ top: '20px' }}>❓</span>
                  <textarea
                    placeholder="Enter the interview question here..."
                    name="question"
                    className="form-control-custom"
                    value={q.question}
                    onChange={(e) => handleChange(index, e)}
                    required
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="action-buttons">
            <button
              type="button"
              className="btn-add"
              onClick={addQuestion}
            >
              <span>➕</span> Add Another Question
            </button>

            <button type="submit" className="btn-submit">
              <span>🚀</span> Submit All Questions
            </button>
          </div>
        </form>
      </div>

      <SuccessModal
        show={showSuccessModal}
        onClose={handleModalClose}
        title="Questions Saved!"
        message={`Successfully added ${questions.length} question${questions.length > 1 ? 's' : ''} for ${company} in ${branch}.`}
      />
    </div>
  );
};

export default QuestionModule;
