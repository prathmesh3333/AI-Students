import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./BranchSelection.css";
import "./PageNav.css";

const BranchSelection = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "add"; // 'add' or 'view'
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/question/branches");
      setBranches(response.data.branches || []);
    } catch (error) {
      console.error("Error fetching branches:", error);
      // Default branches if API fails
      setBranches([
        { name: "Computer Science", icon: "💻", color: "#667eea" },
        { name: "Information Technology", icon: "🌐", color: "#11998e" },
        { name: "Mechanical Engineering", icon: "⚙️", color: "#f093fb" },
        { name: "Electrical Engineering", icon: "⚡", color: "#fa709a" },
        { name: "Civil Engineering", icon: "🏗️", color: "#feca57" },
        { name: "Electronics & Communication", icon: "📡", color: "#5f27cd" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleBranchSelect = (branchName) => {
    navigate(`/company-list/${encodeURIComponent(branchName)}?mode=${mode}`);
  };

  if (loading) {
    return (
      <div className="branch-selection-wrapper">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading branches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="branch-selection-wrapper">
      <nav className="page-nav">
        <button className="page-nav-back" onClick={() => navigate("/question-mode")}>
          <i className="bi bi-arrow-left"></i> Back
        </button>
      </nav>
      <div className="branch-selection-container">
        <div className="branch-header">
          <h1 className="branch-title">Select Your Branch</h1>
          <p className="branch-subtitle">
            {mode === "add"
              ? "Choose your engineering branch to add questions"
              : "Choose your engineering branch to view questions"
            }
          </p>
        </div>

        <div className="branches-grid">
          {branches.map((branch, index) => (
            <div
              key={index}
              className="branch-card"
              onClick={() => handleBranchSelect(branch.name)}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="branch-icon" style={{ background: branch.color }}>
                {branch.icon}
              </div>
              <h3 className="branch-name">{branch.name}</h3>
              <p className="branch-description">View interview questions</p>
              <div className="branch-arrow">→</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default BranchSelection;
