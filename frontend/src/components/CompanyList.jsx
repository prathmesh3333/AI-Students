import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import "./CompanyList.css";

const CompanyList = () => {
  const navigate = useNavigate();
  const { branch } = useParams();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "add"; // 'add' or 'view'
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const searchDebounce = useRef(null);
  const isSearchMounted = useRef(false);

  useEffect(() => {
    fetchCompanies("");
  }, [branch]);

  const fetchCompanies = async (search) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/question/companies/${encodeURIComponent(branch)}?search=${encodeURIComponent(search)}`
      );
      setCompanies(response.data.companies || []);
    } catch (error) {
      console.error("Error fetching companies:", error);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSearchMounted.current) { isSearchMounted.current = true; return; }
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => fetchCompanies(searchQuery), 300);
  }, [searchQuery]);

  const handleCompanySelect = (companyName) => {
    if (mode === "view") {
      navigate(`/view-questions/${encodeURIComponent(branch)}/${encodeURIComponent(companyName)}`);
    } else {
      navigate(`/question-module/${encodeURIComponent(branch)}/${encodeURIComponent(companyName)}`);
    }
  };

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) {
      alert("Please enter a company name");
      return;
    }

    try {
      await axios.post("http://localhost:5000/api/question/create-company", {
        branch,
        companyName: newCompanyName.trim()
      });

      setShowCreateModal(false);
      setNewCompanyName("");

      // Navigate to question module with new company
      navigate(`/question-module/${encodeURIComponent(branch)}/${encodeURIComponent(newCompanyName.trim())}`);
    } catch (error) {
      console.error("Error creating company:", error);
      alert("Failed to create company. It might already exist.");
    }
  };


  if (loading) {
    return (
      <div className="company-list-wrapper">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading companies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="company-list-wrapper">
      <div className="company-list-container">
        <div className="company-header">
          <button className="back-btn-top" onClick={() => navigate(`/branch-selection?mode=${mode}`)}>
            ← Back
          </button>
          <h1 className="company-title">{branch}</h1>
          <p className="company-subtitle">
            {mode === "add"
              ? "Select a company or create a new one"
              : "Select a company to view questions"
            }
          </p>
        </div>

        {/* Search Bar */}
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search companies..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Companies Grid */}
        <div className="companies-grid">
          {/* Create New Company Card - Only show in 'add' mode */}
          {mode === "add" && (
            <div
              className="company-card create-new-card"
              onClick={() => setShowCreateModal(true)}
            >
              <div className="company-icon create-icon">➕</div>
              <h3 className="company-name">Create New Company</h3>
              <p className="company-info">Add a new company folder</p>
            </div>
          )}

          {/* Existing Companies */}
          {companies.map((company, index) => (
            <div
              key={index}
              className="company-card"
              onClick={() => handleCompanySelect(company.name)}
              style={{ animationDelay: `${(mode === "add" ? index + 1 : index) * 0.1}s` }}
            >
              <div className="company-icon">
                {company.logo || "🏢"}
              </div>
              <h3 className="company-name">{company.name}</h3>
              <p className="company-info">
                {company.questionCount || 0} questions available
              </p>
              <div className="company-arrow">→</div>
            </div>
          ))}
        </div>

        {companies.length === 0 && searchQuery && (
          <div className="empty-state">
            <span className="empty-icon">😕</span>
            <p>No companies found matching "{searchQuery}"</p>
            <button
              className="btn-create-from-empty"
              onClick={() => setShowCreateModal(true)}
            >
              Create New Company
            </button>
          </div>
        )}
      </div>

      {/* Create Company Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Create New Company</h2>
            <p className="modal-subtitle">Enter the company name for {branch}</p>

            <div className="modal-input-group">
              <span className="modal-icon">🏢</span>
              <input
                type="text"
                placeholder="e.g., Google, Microsoft, Amazon"
                className="modal-input"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateCompany()}
                autoFocus
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn-modal-cancel"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewCompanyName("");
                }}
              >
                Cancel
              </button>
              <button
                className="btn-modal-create"
                onClick={handleCreateCompany}
              >
                Create & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyList;
