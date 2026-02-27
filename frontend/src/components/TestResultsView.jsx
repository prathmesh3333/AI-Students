import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./TestResultsView.css";

const TestResultsView = () => {
  const [teacherName, setTeacherName] = useState("");
  const [results, setResults] = useState([]);
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState("all");
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("date"); // date, score, name
  const [sortOrder, setSortOrder] = useState("desc");

  const navigate = useNavigate();

  useEffect(() => {
    const name = localStorage.getItem("teacherName");
    if (!name) {
      navigate("/login");
    } else {
      setTeacherName(name);
      fetchData();
    }
  }, [navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all results
      const resultsResponse = await axios.get("http://localhost:5000/api/test-result/all");
      if (resultsResponse.data.success) {
        setResults(resultsResponse.data.results);
      }

      // Fetch all tests
      const testsResponse = await axios.get("http://localhost:5000/api/test/all");
      if (testsResponse.data.success) {
        setTests(testsResponse.data.tests);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // Filter and sort results
  const getFilteredResults = () => {
    let filtered = [...results];

    // Filter by test
    if (selectedTest !== "all") {
      filtered = filtered.filter(result => result.testId?._id === selectedTest);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;

      if (sortBy === "date") {
        comparison = new Date(b.submittedAt) - new Date(a.submittedAt);
      } else if (sortBy === "score") {
        comparison = b.score - a.score;
      } else if (sortBy === "name") {
        comparison = a.studentName.localeCompare(b.studentName);
      }

      return sortOrder === "asc" ? -comparison : comparison;
    });

    return filtered;
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (seconds) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getScoreClass = (score) => {
    if (score >= 90) return "score-excellent";
    if (score >= 70) return "score-good";
    if (score >= 50) return "score-average";
    return "score-poor";
  };

  const filteredResults = getFilteredResults();

  // Calculate statistics
  const stats = {
    totalSubmissions: filteredResults.length,
    averageScore: filteredResults.length > 0
      ? (filteredResults.reduce((sum, r) => sum + r.score, 0) / filteredResults.length).toFixed(2)
      : 0,
    passedCount: filteredResults.filter(r => r.score >= 50).length,
    highestScore: filteredResults.length > 0
      ? Math.max(...filteredResults.map(r => r.score))
      : 0
  };

  if (loading) {
    return (
      <div className="results-view-container">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="results-view-container">
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark navbar-custom px-4">
        <h3 className="navbar-brand fw-bold mb-0">
          <i className="bi bi-bar-chart-fill me-2"></i>
          Test Results Dashboard
        </h3>
        <div className="ms-auto d-flex align-items-center gap-3">
          <button
            onClick={() => navigate("/teacher-dashboard")}
            className="btn btn-light btn-sm fw-semibold"
          >
            <i className="bi bi-house-door me-1"></i> Dashboard
          </button>
          <span className="fw-semibold text-white">
            {teacherName || "Teacher"}
          </span>
          <button onClick={handleLogout} className="btn btn-outline-light btn-sm">
            <i className="bi bi-box-arrow-right me-1"></i> Logout
          </button>
        </div>
      </nav>

      <div className="container-fluid py-4">
        {/* Statistics Cards */}
        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <div className="stat-card">
              <div className="stat-icon total">
                <i className="bi bi-file-earmark-text"></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.totalSubmissions}</div>
                <div className="stat-label">Total Submissions</div>
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div className="stat-card">
              <div className="stat-icon average">
                <i className="bi bi-graph-up"></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.averageScore}%</div>
                <div className="stat-label">Average Score</div>
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div className="stat-card">
              <div className="stat-icon passed">
                <i className="bi bi-check-circle"></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.passedCount}</div>
                <div className="stat-label">Passed (≥50%)</div>
              </div>
            </div>
          </div>

          <div className="col-md-3">
            <div className="stat-card">
              <div className="stat-icon highest">
                <i className="bi bi-trophy"></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.highestScore}%</div>
                <div className="stat-label">Highest Score</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Table */}
        <div className="card shadow-sm">
          <div className="card-header bg-white py-3">
            <div className="row align-items-center">
              <div className="col-md-6">
                <h5 className="mb-0">
                  <i className="bi bi-table me-2"></i>
                  Student Submissions
                </h5>
              </div>
              <div className="col-md-6">
                <div className="d-flex gap-2 justify-content-end">
                  <select
                    className="form-select form-select-sm"
                    value={selectedTest}
                    onChange={(e) => setSelectedTest(e.target.value)}
                    style={{maxWidth: '250px'}}
                  >
                    <option value="all">All Tests</option>
                    {tests.map(test => (
                      <option key={test._id} value={test._id}>
                        {test.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="card-body p-0">
            {filteredResults.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-inbox" style={{fontSize: '3rem', color: '#ccc'}}></i>
                <p className="text-muted mt-3">No submissions found</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th
                        className="sortable"
                        onClick={() => toggleSort("name")}
                      >
                        Student Name
                        {sortBy === "name" && (
                          <i className={`bi bi-arrow-${sortOrder === "asc" ? "up" : "down"} ms-1`}></i>
                        )}
                      </th>
                      <th>Roll No</th>
                      <th>Test</th>
                      <th>Subject</th>
                      <th
                        className="sortable"
                        onClick={() => toggleSort("score")}
                      >
                        Score
                        {sortBy === "score" && (
                          <i className={`bi bi-arrow-${sortOrder === "asc" ? "up" : "down"} ms-1`}></i>
                        )}
                      </th>
                      <th>Correct/Total</th>
                      <th>Time Taken</th>
                      <th>Tab Switches</th>
                      <th
                        className="sortable"
                        onClick={() => toggleSort("date")}
                      >
                        Submitted
                        {sortBy === "date" && (
                          <i className={`bi bi-arrow-${sortOrder === "asc" ? "up" : "down"} ms-1`}></i>
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map((result, index) => (
                      <tr key={result._id}>
                        <td>{index + 1}</td>
                        <td className="fw-semibold">{result.studentName}</td>
                        <td>{result.rollNo}</td>
                        <td>{result.testId?.title || "N/A"}</td>
                        <td>
                          <span className="badge bg-info">
                            {result.testId?.subject || "N/A"}
                          </span>
                        </td>
                        <td>
                          <span className={`score-badge ${getScoreClass(result.score)}`}>
                            {result.score}%
                          </span>
                        </td>
                        <td>
                          {result.correctAnswers}/{result.totalQuestions}
                        </td>
                        <td>{formatTime(result.timeTaken)}</td>
                        <td>
                          {result.tabSwitchCount > 0 ? (
                            <span className="badge bg-warning text-dark">
                              {result.tabSwitchCount}
                            </span>
                          ) : (
                            <span className="text-success">✓</span>
                          )}
                        </td>
                        <td>
                          <small>{formatDate(result.submittedAt)}</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestResultsView;
