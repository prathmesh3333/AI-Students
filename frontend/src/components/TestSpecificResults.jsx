import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./TestSpecificResults.css";

const TestSpecificResults = () => {
  const { testId } = useParams();
  const [teacherName, setTeacherName] = useState("");
  const [test, setTest]       = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortBy, setSortBy]     = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage]     = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [stats, setStats] = useState({
    total: 0, averageScore: "0.00", highestScore: 0,
    lowestScore: 0, passedCount: 0, failedCount: 0, passRate: "0.0",
  });

  const navigate = useNavigate();
  const listRef  = useRef(null);
  const sortRef  = useRef({ sortBy: "date", sortOrder: "desc" });

  // Keep sortRef in sync so scroll handler always sees latest sort
  useEffect(() => { sortRef.current = { sortBy, sortOrder }; }, [sortBy, sortOrder]);

  // ── Fetch a single page of results (appends if append=true) ──
  const fetchResultsPage = async (pg, sb, so, append = false) => {
    try {
      if (append) setLoadingMore(true);
      const res = await axios.get(
        `http://localhost:5000/api/test-result/test/${testId}` +
        `?page=${pg}&limit=10&sortBy=${sb}&sortOrder=${so}`
      );
      if (res.data?.success) {
        setResults(prev => append ? [...prev, ...res.data.results] : res.data.results);
        setStats(res.data.stats);
        setHasMore(res.data.pagination.hasMore);
      }
    } catch (err) {
      console.error("Error fetching results page:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // ── Initial load: test details + first page ──
  useEffect(() => {
    const name = localStorage.getItem("teacherName");
    if (!name) { navigate("/login"); return; }
    setTeacherName(name);

    const load = async () => {
      setLoading(true);
      try {
        const [testRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/test/${testId}`),
          fetchResultsPage(1, "date", "desc", false),
        ]);
        if (testRes.data?.success) setTest(testRes.data.test);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [testId, navigate]);

  // ── Sort change: reset to page 1 and refetch ──
  const isSortMounted = useRef(false);
  useEffect(() => {
    if (!isSortMounted.current) { isSortMounted.current = true; return; }
    setPage(1);
    setResults([]);
    fetchResultsPage(1, sortBy, sortOrder, false);
  }, [sortBy, sortOrder]);

  // ── Scroll to bottom → fetch next page ──
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      if (!hasMore || loadingMore) return;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
        const next = page + 1;
        setPage(next);
        fetchResultsPage(next, sortRef.current.sortBy, sortRef.current.sortOrder, true);
      }
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [hasMore, loadingMore, page]);

  const handleLogout = () => { localStorage.clear(); navigate("/login"); };

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

  const totalPages = Math.ceil(stats.total / 10);

  const jumpToPage = (pg) => {
    setPage(pg);
    setResults([]);
    fetchResultsPage(pg, sortBy, sortOrder, false);
    if (listRef.current) listRef.current.scrollTop = 0;
  };

  const buildPageList = (cur, total) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [1];
    if (cur > 3) pages.push("…");
    for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i);
    if (cur < total - 2) pages.push("…");
    pages.push(total);
    return pages;
  };


  if (loading) {
    return (
      <div className="test-specific-results-container">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="test-specific-results-container">
        <div className="text-center py-5">
          <h3>Test not found</h3>
          <button className="btn btn-primary mt-3" onClick={() => navigate("/teacher-dashboard")}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="test-specific-results-container tsr-locked">
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark navbar-custom px-4">
        <h3 className="navbar-brand fw-bold mb-0">
          <i className="bi bi-clipboard-data me-2"></i>
          Test Results
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

      <div className="container-fluid py-4" id="tsr-main">
        {/* Test Information Card */}
        <div className="card shadow-sm mb-2" id="tsr-info-card">
          <div className="tsr-info-inner">
            <div className="tsr-info-left">
              <span className="tsr-test-title">{test.title}</span>
              {test.description && <span className="tsr-test-desc">{test.description}</span>}
              <div className="d-flex flex-wrap gap-1 align-items-center">
                <span className="badge bg-info">{test.subject}</span>
                <span className="badge bg-dark"><i className="bi bi-building me-1"></i>{test.branch}</span>
                <span className="badge bg-secondary">{test.totalQuestions} Questions</span>
                <span className="badge bg-primary"><i className="bi bi-clock me-1"></i>{test.timeLimit} mins</span>
              </div>
            </div>
            <div className="tsr-info-right">
              <i className="bi bi-people-fill tsr-people-icon"></i>
              <span className="tsr-attempted-num">{stats.total}</span>
              <span className="tsr-attempted-lbl">Students Attempted</span>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="row g-2 mb-2">
          <div className="col-md-3">
            <div className="stat-card">
              <div className="stat-icon average">
                <i className="bi bi-graph-up-arrow"></i>
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
                <small className="text-muted">{stats.passRate}% pass rate</small>
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

          <div className="col-md-3">
            <div className="stat-card">
              <div className="stat-icon failed">
                <i className="bi bi-x-circle"></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.failedCount}</div>
                <div className="stat-label">Failed (&lt;50%)</div>
                <small className="text-muted">Lowest: {stats.lowestScore}%</small>
              </div>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="card shadow-sm" id="tsr-results-card">
          <div className="card-header py-3">
            <h5 className="mb-0">
              <i className="bi bi-table me-2"></i>
              Student Submissions
            </h5>
          </div>

          <div className="card-body p-0">
            {results.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-inbox" style={{fontSize: '3rem', color: '#ccc'}}></i>
                <p className="text-muted mt-3">No submissions yet for this test</p>
              </div>
            ) : (
              <div className="table-responsive" ref={listRef} id="tsr-table-wrap">

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
                      <th>Status</th>
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
                    {results.map((result, idx) => (
                      <tr key={result._id}>
                        <td>{idx + 1}</td>
                        <td className="fw-semibold">{result.studentName}</td>
                        <td>{result.rollNo}</td>
                        <td>
                          <span className={`score-badge ${getScoreClass(result.score)}`}>
                            {result.score}%
                          </span>
                        </td>
                        <td>
                          <span className="text-secondary fw-semibold">
                            {result.correctAnswers}/{result.totalQuestions}
                          </span>
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
                          {result.score >= 50 ? (
                            <span className="badge bg-success">Passed</span>
                          ) : (
                            <span className="badge bg-danger">Failed</span>
                          )}
                        </td>
                        <td>
                          <small>{formatDate(result.submittedAt)}</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {loadingMore && (
                  <div className="tsr-load-more">
                    <span className="tsr-load-dot" /><span className="tsr-load-dot" /><span className="tsr-load-dot" />
                  </div>
                )}
              </div>
            )}
            {totalPages > 1 && (
              <div className="tsr-pagination">
                {buildPageList(page, totalPages).map((p, i) =>
                  p === "…" ? (
                    <span key={`e${i}`} className="tsr-page-ellipsis">…</span>
                  ) : (
                    <button
                      key={p}
                      className={`tsr-page-btn${p === page ? " active" : ""}`}
                      onClick={() => jumpToPage(p)}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestSpecificResults;
