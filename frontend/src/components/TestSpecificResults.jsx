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

  const [snapshotModal, setSnapshotModal] = useState(null); // { studentName, rollNo, snapshots }
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [lightbox, setLightbox] = useState(null); // { imageData, violationType, capturedAt }
  const [snapshotCounts, setSnapshotCounts] = useState({}); // { rollNo: count }

  const navigate = useNavigate();
  const listRef  = useRef(null);
  const sortRef  = useRef({ sortBy: "date", sortOrder: "desc" });

  const viewSnapshots = async (result) => {
    setLoadingSnapshots(true);
    setSnapshotModal({ studentName: result.studentName, rollNo: result.rollNo, snapshots: [] });
    try {
      const res = await axios.get(
        `http://localhost:5000/api/test-result/violation-snapshots/${testId}/${result.rollNo}`
      );
      if (res.data?.success) {
        setSnapshotModal({ studentName: result.studentName, rollNo: result.rollNo, snapshots: res.data.snapshots });
      }
    } catch (err) {
      console.error("Failed to fetch snapshots:", err);
    } finally {
      setLoadingSnapshots(false);
    }
  };

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
        const newResults = res.data.results;
        setResults(prev => append ? [...prev, ...newResults] : newResults);
        setStats(res.data.stats);
        setHasMore(res.data.pagination.hasMore);

        // Fetch snapshot counts for each student
        const counts = {};
        await Promise.all(newResults.map(async (r) => {
          try {
            const snap = await axios.get(`http://localhost:5000/api/test-result/violation-snapshots/${testId}/${r.rollNo}`);
            counts[r.rollNo] = snap.data.snapshots?.length || 0;
          } catch { counts[r.rollNo] = 0; }
        }));
        setSnapshotCounts(prev => ({ ...prev, ...counts }));
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
                      <th>Snapshots</th>
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
                        <td>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            title="View violation snapshots"
                            onClick={() => viewSnapshots(result)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                          >
                            <i className="bi bi-camera-video-fill"></i>
                            View
                            <span style={{
                              background: snapshotCounts[result.rollNo] > 0 ? "#ef4444" : "#6b7280",
                              color: "#fff",
                              borderRadius: 999,
                              padding: "1px 7px",
                              fontSize: 11,
                              fontWeight: 700,
                              lineHeight: "16px"
                            }}>
                              {snapshotCounts[result.rollNo] ?? 0}
                            </span>
                          </button>
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

      {/* Violation Snapshots Modal */}
      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 99999,
            background: "rgba(0,0,0,0.92)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            cursor: "zoom-out",
          }}
        >
          <img
            src={lightbox.imageData}
            alt={lightbox.violationType}
            style={{ maxWidth: "90vw", maxHeight: "80vh", borderRadius: 8, boxShadow: "0 0 40px rgba(0,0,0,0.8)" }}
          />
          <div style={{ marginTop: 16, display: "flex", gap: 16, alignItems: "center" }}>
            <span className="badge bg-danger fs-6">{lightbox.violationType.replace(/_/g, " ")}</span>
            <span style={{ color: "#9ca3af" }}>{new Date(lightbox.capturedAt).toLocaleString()}</span>
          </div>
          <small style={{ color: "#6b7280", marginTop: 8 }}>Click anywhere to close</small>
        </div>
      )}

      {snapshotModal && (
        <div className="modal fade show d-block" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-camera-video-fill me-2 text-danger"></i>
                  Violation Snapshots — {snapshotModal.studentName} ({snapshotModal.rollNo})
                </h5>
                <button className="btn-close" onClick={() => setSnapshotModal(null)}></button>
              </div>
              <div className="modal-body">
                {loadingSnapshots ? (
                  <div className="text-center py-4"><div className="spinner-border text-danger"></div></div>
                ) : snapshotModal.snapshots.length === 0 ? (
                  <div className="text-center text-muted py-4">No snapshots recorded for this student.</div>
                ) : (
                  <div className="row g-3">
                    {snapshotModal.snapshots.map((snap, i) => (
                      <div key={i} className="col-md-4">
                        <div className="card border-danger" style={{ cursor: "pointer" }} onClick={() => setLightbox(snap)}>
                          <img src={snap.imageData} alt={snap.violationType} className="card-img-top" style={{ transition: "opacity 0.2s" }} onMouseEnter={e => e.target.style.opacity = 0.8} onMouseLeave={e => e.target.style.opacity = 1} />
                          <div className="card-footer d-flex justify-content-between align-items-center">
                            <span className="badge bg-danger">{snap.violationType.replace(/_/g, " ")}</span>
                            <small className="text-muted">{new Date(snap.capturedAt).toLocaleTimeString()}</small>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestSpecificResults;
