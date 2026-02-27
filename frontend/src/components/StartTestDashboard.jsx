import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import "./StartTestDashboard.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const StartTestDashboard = () => {
  const [studentName, setStudentName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [studentBranch, setStudentBranch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [publishedTests, setPublishedTests] = useState([]);
  const [submittedResults, setSubmittedResults] = useState([]);
  const [pendingTests, setPendingTests] = useState([]);
  const [outdatedTests, setOutdatedTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingSearch, setPendingSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");



  const navigate = useNavigate();

  useEffect(() => {
    const name = localStorage.getItem("studentName");
    const roll = localStorage.getItem("rollNo");
    const branch = localStorage.getItem("studentBranch");

    if (!name || !roll) {
      navigate("/login");
    } else {
      setStudentName(name);
      setRollNo(roll);
      setStudentBranch(branch || "N/A");
      fetchData(roll);
    }
  }, [navigate]);

  const getDeadlineLabel = (deadline) => {
    if (!deadline) return null;
    const now = new Date();
    const dl = new Date(deadline);
    const diffMs = dl - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0)  return { text: "Overdue",          cls: "bg-danger" };
    if (diffDays === 0) return { text: "Due Today!",       cls: "bg-danger" };
    if (diffDays === 1) return { text: "Due Tomorrow",     cls: "bg-warning text-dark" };
    if (diffDays <= 3)  return { text: `Due in ${diffDays} days`, cls: "bg-warning text-dark" };
    return { text: `Due ${dl.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, cls: "bg-info" };
  };

  const splitAndSetPending = (pending) => {
    const now = new Date();
    const active = pending.filter(t => !t.deadline || new Date(t.deadline) >= now);
    const outdated = pending.filter(t => t.deadline && new Date(t.deadline) < now);
    // Sort active: closest deadline first, no-deadline last
    active.sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    });
    setPendingTests(active);
    setOutdatedTests(outdated);
  };

  const fetchData = async (roll) => {
    try {
      setLoading(true);

      // Get student's branch from localStorage
      const studentBranch = localStorage.getItem("studentBranch");

      // Fetch published tests for this branch
      const testsResponse = await axios.get(`http://localhost:5000/api/test/published?branch=${studentBranch}`);

      // Fetch student's submitted results
      const resultsResponse = await axios.get(`http://localhost:5000/api/test-result/student/${roll}`);

      if (testsResponse.data && testsResponse.data.success) {
        const allTests = testsResponse.data.tests;
        setPublishedTests(allTests);

        if (resultsResponse.data && resultsResponse.data.success) {
          const results = resultsResponse.data.results;
          setSubmittedResults(results);

          // Calculate pending tests (tests not yet taken)
          const submittedTestIds = results.map(r => r.testId?._id);
          const pending = allTests.filter(test => !submittedTestIds.includes(test._id));
          splitAndSetPending(pending);
        } else {
          // No results yet, all tests are pending
          splitAndSetPending(allTests);
        }
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

  const startTest = (testId) => {
    navigate("/pre-test-lobby", { state: { type: "academic", testId } });
  };

  const getScoreClass = (score) => {
    if (score >= 90) return "text-success";
    if (score >= 70) return "text-primary";
    if (score >= 50) return "text-warning";
    return "text-danger";
  };

  const getScoreBadgeClass = (score) => {
    if (score >= 90) return "bg-success";
    if (score >= 70) return "bg-primary";
    if (score >= 50) return "bg-warning";
    return "bg-danger";
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Chart data from real submitted results
  // const chartData = {
  //   labels: submittedResults.map((result) => result.testId?.title || "Test"),
  //   datasets: [
  //     {
  //       label: "Score (%)",
  //       data: submittedResults.map((result) => result.score),
  //       borderColor: "#004b8d",
  //       backgroundColor: "rgba(0, 75, 141, 0.1)",
  //       tension: 0.4,
  //       fill: true,
  //       pointBackgroundColor: "#004b8d",
  //       pointBorderColor: "#fff",
  //       pointBorderWidth: 2,
  //       pointRadius: 6,
  //       pointHoverRadius: 8,
  //     },
  //   ],
  // };

  // ✅ Sort submitted results by date (oldest → latest) to fix "opposite" graph issue
const sortedResults = [...submittedResults]
  .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))
  .reverse();
// ✅ Chart data from sorted results
const chartData = {
  labels: sortedResults.map((result) => result.testId?.title || "Test"),
  datasets: [
    {
      label: "Score (%)",
      data: sortedResults.map((result) => Number(result.score) || 0),
      borderColor: "#004b8d",
      backgroundColor: "rgba(0, 75, 141, 0.1)",
      tension: 0.4,
      fill: true,
      pointBackgroundColor: "#004b8d",
      pointBorderColor: "#fff",
      pointBorderWidth: 2,
      pointRadius: 6,
      pointHoverRadius: 8,
    },
  ],
};



  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
        labels: {
          font: {
            size: 14,
            weight: 'bold'
          }
        }
      },
      title: {
        display: true,
        text: "Your Test Score Performance",
        font: {
          size: 18,
          weight: 'bold'
        },
        color: '#004b8d'
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 10,
          callback: (val) => `${val}%`,
          font: {
            size: 12
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        ticks: {
          font: {
            size: 11
          }
        },
        grid: {
          display: false
        }
      }
    },
  };

  return (
    <div className="start-test-wrapper">
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark navbar-custom px-4">
        <h3 className="navbar-brand fw-bold mb-0">Test Series Dashboard</h3>
        <div className="ms-auto d-flex align-items-center gap-3">
          <button
            onClick={() => navigate("/home")}
            className="btn btn-light btn-sm fw-semibold home-btn"
          >
            <i className="bi bi-house-door-fill"></i>
          </button>
          <div className="profile-dropdown-container">
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
        </div>
      </nav>

      <div className="container py-5">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading tests...</p>
          </div>
        ) : (
          <>
            {/* Score Performance Chart */}
            {submittedResults.length > 0 && (
              <div className="mb-5">
                <h2 className="mb-4 text-center" style={{color: '#004b8d', fontWeight: '700'}}>
                  Your Test Score Performance
                </h2>
                <div className="card shadow-sm p-4">
                  <Line data={chartData} options={chartOptions} />
                </div>
              </div>
            )}

            {/* Pending Tests Section */}
            <div className="mb-5">
                  <input
                  type="text"
                  className="form-control mb-3"
                   placeholder="Search Pending Tests..."
                    value={pendingSearch}
                    onChange={(e) => setPendingSearch(e.target.value)}
                        />
              <h3 className="mb-4" style={{color: '#004b8d', fontWeight: '700'}}>
                <i className="bi bi-hourglass-split me-2"></i>
                Pending Tests
              </h3>
              {pendingTests.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-check-circle" style={{fontSize: '3rem', color: '#28a745'}}></i>
                  <h5 className="mt-3 text-success">All Caught Up!</h5>
                  <p className="text-muted">You have completed all available tests</p>
                </div>
              ) : (
                <div className="row g-4">
                  {/* {pendingTests.map((test) => ( */}
                  {pendingTests
                    .filter(test =>
                        test.title.toLowerCase().includes(pendingSearch.toLowerCase()) ||
                           test.subject.toLowerCase().includes(pendingSearch.toLowerCase())
                              )
                          .map((test) => (
                    <div key={test._id} className="col-md-6 col-lg-4">
                      <div className="card shadow-sm p-4 hover-card test-card">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <h5 className="fw-bold mb-0">{test.title}</h5>
                          <span className="badge bg-primary">{test.subject}</span>
                        </div>
                        <p className="text-muted mb-3">{test.description}</p>
                        <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                          <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-question-circle" style={{color: '#004b8d'}}></i>
                            <small className="text-muted">{test.totalQuestions} Questions</small>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-clock" style={{color: '#004b8d'}}></i>
                            <small className="text-muted">{test.timeLimit} Minutes</small>
                          </div>
                          {(() => {
                            const dl = getDeadlineLabel(test.deadline);
                            return dl ? (
                              <span className={`badge ${dl.cls}`}>
                                <i className="bi bi-alarm me-1"></i>{dl.text}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        <button
                          className="btn btn-primary mt-auto w-100"
                          onClick={() => startTest(test._id)}
                        >
                          <i className="bi bi-play-circle me-2"></i>
                          Start Test
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Past Deadline Section */}
            {outdatedTests.length > 0 && (
              <div className="mb-5">
                <h3 className="mb-4" style={{color: '#dc3545', fontWeight: '700'}}>
                  <i className="bi bi-calendar-x me-2"></i>
                  Past Deadline
                  <span className="badge bg-danger ms-2">{outdatedTests.length}</span>
                </h3>
                <p className="text-muted mb-3" style={{fontSize: '0.9rem'}}>
                  <i className="bi bi-info-circle me-1"></i>
                  These tests had a deadline that has passed. You can still attempt them but they are marked as overdue.
                </p>
                <div className="row g-4">
                  {outdatedTests.map((test) => (
                    <div key={test._id} className="col-md-6 col-lg-4">
                      <div className="card shadow-sm p-4 hover-card test-card" style={{opacity: 0.75, borderLeft: '4px solid #dc3545'}}>
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <h5 className="fw-bold mb-0">{test.title}</h5>
                          <span className="badge bg-danger">Overdue</span>
                        </div>
                        <span className="badge bg-primary mb-2">{test.subject}</span>
                        <p className="text-muted mb-3">{test.description}</p>
                        <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                          <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-question-circle text-muted"></i>
                            <small className="text-muted">{test.totalQuestions} Questions</small>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-clock text-muted"></i>
                            <small className="text-muted">{test.timeLimit} Minutes</small>
                          </div>
                          <small className="text-danger fw-semibold">
                            <i className="bi bi-calendar-x me-1"></i>
                            Deadline: {new Date(test.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </small>
                        </div>
                        <button
                          className="btn btn-outline-danger mt-auto w-100"
                          onClick={() => startTest(test._id)}
                        >
                          <i className="bi bi-play-circle me-2"></i>
                          Attempt Anyway
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submitted Tests Section */}
            <div className="mb-5">
              <input
  type="text"
  className="form-control mb-3"
  placeholder="Search Submitted Tests..."
  value={submittedSearch}
  onChange={(e) => setSubmittedSearch(e.target.value)}
/>

              <h3 className="mb-4" style={{color: '#004b8d', fontWeight: '700'}}>
                <i className="bi bi-check2-square me-2"></i>
                Submitted Tests
              </h3>
              {submittedResults.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-clipboard-x" style={{fontSize: '3rem', color: '#6c757d'}}></i>
                  <h5 className="mt-3 text-muted">No Tests Submitted Yet</h5>
                  <p className="text-muted">Start taking tests to see your results here</p>
                </div>
              ) : (
                <div className="row g-4">
                  {/* {submittedResults.map((result) => ( */}
                  {submittedResults
  .filter(result =>
    result.testId?.title
      ?.toLowerCase()
      .includes(submittedSearch.toLowerCase())
  )
  .map((result) => (

                    <div key={result._id} className="col-md-6 col-lg-4">
                      <div className="card shadow-sm hover-card test-result-card">
                        <div className="card-body">
                          {/* Header with badge */}
                          <div className="d-flex justify-content-between align-items-start mb-3">
                            <h5 className="card-title fw-bold mb-0">
                              {result.testId?.title || "Test"}
                            </h5>
                            <span className={`badge ${getScoreBadgeClass(result.score)}`}>
                              {result.score >= 50 ? 'Passed' : 'Failed'}
                            </span>
                          </div>

                          {/* Subject */}
                          <div className="mb-3">
                            <span className="badge bg-info">
                              {result.testId?.subject || "N/A"}
                            </span>
                          </div>

                          {/* Score Display */}
                          <div className="score-display-box mb-3">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <h2 className={`mb-0 fw-bold ${getScoreClass(result.score)}`}>
                                  {result.score}%
                                </h2>
                                <small className="text-muted">Score</small>
                              </div>
                              <div className="text-end">
                                <h4 className="mb-0 fw-bold text-secondary">
                                  {result.correctAnswers}/{result.totalQuestions}
                                </h4>
                                <small className="text-muted">Correct</small>
                              </div>
                            </div>
                          </div>

                          {/* Details */}
                          <div className="test-details mb-3">
                            <div className="d-flex align-items-center gap-2 mb-2">
                              <i className="bi bi-calendar3" style={{color: '#004b8d'}}></i>
                              <small className="text-muted">
                                Submitted: {formatDate(result.submittedAt)}
                              </small>
                            </div>
                            {result.tabSwitchCount > 0 && (
                              <div className="d-flex align-items-center gap-2">
                                <i className="bi bi-exclamation-triangle text-warning"></i>
                                <small className="text-warning">
                                  {result.tabSwitchCount} Tab Switch{result.tabSwitchCount > 1 ? 'es' : ''}
                                </small>
                              </div>
                            )}
                          </div>

                          {/* Performance indicator */}
                          <div className="performance-indicator">
                            {result.score >= 90 ? (
                              <div className="text-success">
                                <i className="bi bi-trophy-fill me-2"></i>
                                <small className="fw-semibold">Outstanding!</small>
                              </div>
                            ) : result.score >= 70 ? (
                              <div className="text-primary">
                                <i className="bi bi-star-fill me-2"></i>
                                <small className="fw-semibold">Great Job!</small>
                              </div>
                            ) : result.score >= 50 ? (
                              <div className="text-warning">
                                <i className="bi bi-check-circle-fill me-2"></i>
                                <small className="fw-semibold">Good Effort!</small>
                              </div>
                            ) : (
                              <div className="text-danger">
                                <i className="bi bi-x-circle-fill me-2"></i>
                                <small className="fw-semibold">Keep Trying!</small>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <footer className="footer-custom text-center py-3">
        © {new Date().getFullYear()} Test Series Dashboard
      </footer>
    </div>
  );
};

export default StartTestDashboard;
