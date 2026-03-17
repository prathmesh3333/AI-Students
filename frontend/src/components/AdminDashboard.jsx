import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { logout } from "../utils/auth";
import "./AdminDashboard.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

/* ─── Small helpers ──────────────────────────────────────────── */
const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

const initials = (name = "") =>
  name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "T";

/* ─── Admin Welcome Splash ───────────────────────────────────── */
const AdminWelcomeSplash = ({ name, onDone }) => {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 2400);
    const t2 = setTimeout(() => onDone(), 2900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className={`adw-overlay ${leaving ? "adw-overlay--out" : ""}`}>
      {/* grid */}
      <div className="adw-grid"></div>
      {/* scan line */}
      <div className="adw-scan"></div>

      <div className="adw-center">
        {/* rings */}
        <div className="adw-rings">
          <div className="adw-ring adw-ring--1"></div>
          <div className="adw-ring adw-ring--2"></div>
          <div className="adw-ring adw-ring--3"></div>
          <div className="adw-icon-wrap">
            <i className="bi bi-shield-fill-check"></i>
          </div>
        </div>

        <p className="adw-access">ACCESS GRANTED</p>
        <h1 className="adw-name">Welcome back, <span>{name}</span></h1>
        <p className="adw-role">EduPrep · Admin Portal</p>

        <div className="adw-bar-track">
          <div className="adw-bar-fill"></div>
        </div>
      </div>
    </div>
  );
};

/* ─── Stat card ──────────────────────────────────────────────── */
const StatCard = ({ icon, label, value, gradient, loading }) => (
  <div className={`ad-stat-card ad-stat-card--${gradient}`}>
    <div className="ad-stat-icon">
      <i className={`bi ${icon}`}></i>
    </div>
    <div className="ad-stat-body">
      <p className="ad-stat-label">{label}</p>
      {loading ? (
        <div className="ad-stat-skeleton"></div>
      ) : (
        <p className="ad-stat-value">{value ?? "—"}</p>
      )}
    </div>
  </div>
);

/* ─── Test Results Modal ─────────────────────────────────────── */
const TestResultsModal = ({ test, onClose }) => {
  const [results, setResults] = useState([]);
  const [stats, setStats]     = useState(null);
  const [page, setPage]       = useState(1);
  const [pages, setPages]     = useState(1);
  const [loading, setLoading] = useState(true);
  const [snapshotModal, setSnapshotModal] = useState(null);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [snapshotCounts, setSnapshotCounts] = useState({}); // { rollNo: count }

  const viewSnapshots = async (r) => {
    setLoadingSnapshots(true);
    setSnapshotModal({ studentName: r.studentName, rollNo: r.rollNo, snapshots: [] });
    try {
      const { data } = await axios.get(`${API}/api/test-result/violation-snapshots/${test._id}/${r.rollNo}`);
      if (data.success) setSnapshotModal({ studentName: r.studentName, rollNo: r.rollNo, snapshots: data.snapshots });
    } catch { /* ignore */ } finally {
      setLoadingSnapshots(false);
    }
  };

  const fetchResults = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${API}/api/test-result/test/${test._id}`,
        { params: { page: p, limit: 10, sortBy: "score", sortOrder: "desc" } }
      );
      if (data.success) {
        setResults(data.results);
        setStats(data.stats);
        setPages(Math.ceil(data.stats.total / 10));
        setPage(p);

        // Fetch snapshot counts for each student
        const counts = {};
        await Promise.all(data.results.map(async (r) => {
          try {
            const snap = await axios.get(`${API}/api/test-result/violation-snapshots/${test._id}/${r.rollNo}`);
            counts[r.rollNo] = snap.data.snapshots?.length || 0;
          } catch { counts[r.rollNo] = 0; }
        }));
        setSnapshotCounts(counts);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [test._id]);

  useEffect(() => { fetchResults(1); }, [fetchResults]);

  const scoreColor = (s) =>
    s >= 80 ? "#10b981" : s >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="ad-modal-overlay" onClick={onClose}>
      <div className="ad-modal ad-modal--results" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ad-modal-header">
          <div className="ad-modal-avatar ad-modal-avatar--teal">
            <i className="bi bi-bar-chart-fill"></i>
          </div>
          <div>
            <h3 className="ad-modal-title">{test.title}</h3>
            <p className="ad-modal-sub">{test.subject} · Student Results</p>
          </div>
          <button className="ad-modal-close" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="ad-modal-body">
          {loading ? (
            <div className="ad-modal-loading"><div className="ad-spinner"></div></div>
          ) : results.length === 0 ? (
            <div className="ad-empty">
              <i className="bi bi-inbox"></i>
              <p>No students have submitted this test yet.</p>
            </div>
          ) : (
            <>
              {/* Stats strip */}
              {stats && (
                <div className="ad-result-stats">
                  <div className="ad-rs-item">
                    <span className="ad-rs-val">{stats.total}</span>
                    <span className="ad-rs-lbl">Submissions</span>
                  </div>
                  <div className="ad-rs-item">
                    <span className="ad-rs-val" style={{ color: "#6366f1" }}>{stats.averageScore}%</span>
                    <span className="ad-rs-lbl">Avg Score</span>
                  </div>
                  <div className="ad-rs-item">
                    <span className="ad-rs-val" style={{ color: "#10b981" }}>{stats.highestScore}%</span>
                    <span className="ad-rs-lbl">Highest</span>
                  </div>
                  <div className="ad-rs-item">
                    <span className="ad-rs-val" style={{ color: "#ef4444" }}>{stats.lowestScore}%</span>
                    <span className="ad-rs-lbl">Lowest</span>
                  </div>
                  <div className="ad-rs-item">
                    <span className="ad-rs-val" style={{ color: "#10b981" }}>{stats.passedCount}</span>
                    <span className="ad-rs-lbl">Passed</span>
                  </div>
                  <div className="ad-rs-item">
                    <span className="ad-rs-val" style={{ color: "#ef4444" }}>{stats.failedCount}</span>
                    <span className="ad-rs-lbl">Failed</span>
                  </div>
                  <div className="ad-rs-item">
                    <span className="ad-rs-val">{stats.passRate}%</span>
                    <span className="ad-rs-lbl">Pass Rate</span>
                  </div>
                </div>
              )}

              {/* Results table */}
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Student</th>
                      <th>Roll No</th>
                      <th>Score</th>
                      <th>Correct</th>
                      <th>Time</th>
                      <th>Tab Switches</th>
                      <th>Submitted</th>
                      <th>Snapshots</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={r._id}>
                        <td className="ad-td-num">{(page - 1) * 10 + i + 1}</td>
                        <td className="ad-td-title">{r.studentName}</td>
                        <td>{r.rollNo}</td>
                        <td>
                          <span className="ad-score-badge" style={{
                            background: `${scoreColor(r.score)}22`,
                            color: scoreColor(r.score),
                            border: `1px solid ${scoreColor(r.score)}44`,
                          }}>
                            {r.score}%
                          </span>
                        </td>
                        <td className="ad-td-center">{r.correctAnswers}/{r.totalQuestions}</td>
                        <td>{r.timeTaken ? `${Math.floor(r.timeTaken / 60)}m ${r.timeTaken % 60}s` : "—"}</td>
                        <td className="ad-td-center">
                          {r.tabSwitchCount > 0
                            ? <span className="ad-badge ad-badge--warn"><i className="bi bi-exclamation-triangle-fill me-1"></i>{r.tabSwitchCount}</span>
                            : <span className="ad-badge ad-badge--green">Clean</span>
                          }
                        </td>
                        <td>{fmtDate(r.submittedAt)}</td>
                        <td>
                          <button
                            className="ad-badge ad-badge--warn"
                            style={{ cursor: "pointer", border: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
                            title="View violation snapshots"
                            onClick={() => viewSnapshots(r)}
                          >
                            <i className="bi bi-camera-video-fill"></i>
                            View
                            <span style={{
                              background: snapshotCounts[r.rollNo] > 0 ? "#ef4444" : "#6b7280",
                              color: "#fff",
                              borderRadius: 999,
                              padding: "1px 7px",
                              fontSize: 11,
                              fontWeight: 700,
                              lineHeight: "16px"
                            }}>
                              {snapshotCounts[r.rollNo] ?? 0}
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {pages > 1 && (
          <div className="ad-modal-footer">
            <button className="ad-pg-btn" disabled={page <= 1} onClick={() => fetchResults(page - 1)}>
              <i className="bi bi-chevron-left"></i>
            </button>
            <span className="ad-pg-info">Page {page} of {pages}</span>
            <button className="ad-pg-btn" disabled={page >= pages} onClick={() => fetchResults(page + 1)}>
              <i className="bi bi-chevron-right"></i>
            </button>
          </div>
        )}
      </div>

      {/* Violation Snapshots Sub-Modal */}
      {snapshotModal && (
        <div className="ad-modal-overlay" onClick={() => setSnapshotModal(null)}>
          <div className="ad-modal" style={{ maxWidth: 900, maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div className="ad-modal-header">
              <div className="ad-modal-avatar" style={{ background: "#fee2e2" }}>
                <i className="bi bi-camera-video-fill" style={{ color: "#ef4444" }}></i>
              </div>
              <div>
                <h3 className="ad-modal-title">Violation Snapshots</h3>
                <p className="ad-modal-sub">{snapshotModal.studentName} · {snapshotModal.rollNo}</p>
              </div>
              <button className="ad-modal-close" onClick={() => setSnapshotModal(null)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="ad-modal-body">
              {loadingSnapshots ? (
                <div className="ad-modal-loading"><div className="ad-spinner"></div></div>
              ) : snapshotModal.snapshots.length === 0 ? (
                <div className="ad-empty"><i className="bi bi-camera-video-off"></i><p>No snapshots recorded.</p></div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
                  {snapshotModal.snapshots.map((snap, i) => (
                    <div key={i} style={{ border: "1px solid #fca5a5", borderRadius: 8, overflow: "hidden", cursor: "zoom-in" }} onClick={() => setLightbox(snap)}>
                      <img src={snap.imageData} alt={snap.violationType} style={{ width: "100%", display: "block", transition: "opacity 0.2s" }} onMouseEnter={e => e.target.style.opacity = 0.8} onMouseLeave={e => e.target.style.opacity = 1} />
                      <div style={{ padding: "6px 10px", background: "#fef2f2", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="ad-badge ad-badge--warn">{snap.violationType.replace(/_/g, " ")}</span>
                        <small style={{ color: "#9ca3af" }}>{new Date(snap.capturedAt).toLocaleTimeString()}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
            <span className="ad-badge ad-badge--warn" style={{ fontSize: 14 }}>{lightbox.violationType.replace(/_/g, " ")}</span>
            <span style={{ color: "#9ca3af" }}>{new Date(lightbox.capturedAt).toLocaleString()}</span>
          </div>
          <small style={{ color: "#6b7280", marginTop: 8 }}>Click anywhere to close</small>
        </div>
      )}
    </div>
  );
};

/* ─── Tests modal ────────────────────────────────────────────── */
const TeacherTestsModal = ({ teacher, onClose }) => {
  const [tests, setTests]     = useState([]);
  const [page, setPage]       = useState(1);
  const [pages, setPages]     = useState(1);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState(null);

  const fetchTests = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${API}/api/admin/teachers/${encodeURIComponent(teacher.email)}/tests`,
        { params: { page: p, limit: 8 } }
      );
      if (data.success) {
        setTests(data.tests);
        setPages(data.pages);
        setTotal(data.total);
        setPage(p);
      }
    } catch {
      setTests([]);
    } finally {
      setLoading(false);
    }
  }, [teacher.email]);

  useEffect(() => { fetchTests(1); }, [fetchTests]);

  const statusBadge = (t) =>
    t.isPublished
      ? <span className="ad-badge ad-badge--green"><i className="bi bi-check-circle-fill me-1"></i>Published</span>
      : <span className="ad-badge ad-badge--gray"><i className="bi bi-pencil-fill me-1"></i>Draft</span>;

  return (
    <>
      <div className="ad-modal-overlay" onClick={onClose}>
        <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
          {/* Modal header */}
          <div className="ad-modal-header">
            <div className="ad-modal-avatar">{initials(teacher.name)}</div>
            <div>
              <h3 className="ad-modal-title">{teacher.name}</h3>
              <p className="ad-modal-sub">{teacher.email} · {total} test{total !== 1 ? "s" : ""}</p>
            </div>
            <button className="ad-modal-close" onClick={onClose}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          {/* Table */}
          <div className="ad-modal-body">
            {loading ? (
              <div className="ad-modal-loading">
                <div className="ad-spinner"></div>
              </div>
            ) : tests.length === 0 ? (
              <div className="ad-empty">
                <i className="bi bi-journal-x"></i>
                <p>No tests created yet.</p>
              </div>
            ) : (
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Title</th>
                      <th>Subject</th>
                      <th>Branches</th>
                      <th>Questions</th>
                      <th>Deadline</th>
                      <th>Results</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tests.map((t, i) => (
                      <tr key={t._id}>
                        <td className="ad-td-num">{(page - 1) * 8 + i + 1}</td>
                        <td className="ad-td-title">{t.title}</td>
                        <td>{t.subject}</td>
                        <td>
                          <div className="ad-branch-tags">
                            {(t.branches || []).slice(0, 2).map((b) => (
                              <span key={b} className="ad-branch-tag">{b}</span>
                            ))}
                            {(t.branches || []).length > 2 && (
                              <span className="ad-branch-tag ad-branch-tag--more">
                                +{t.branches.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="ad-td-center">{t.totalQuestions}</td>
                        <td>{fmtDate(t.deadline)}</td>
                        <td>
                          <button
                            className="ad-results-btn"
                            onClick={() => setSelectedTest(t)}
                            title="View student results"
                          >
                            <i className="bi bi-bar-chart-fill me-1"></i>
                            Results
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="ad-modal-footer">
              <button className="ad-pg-btn" disabled={page <= 1} onClick={() => fetchTests(page - 1)}>
                <i className="bi bi-chevron-left"></i>
              </button>
              <span className="ad-pg-info">Page {page} of {pages}</span>
              <button className="ad-pg-btn" disabled={page >= pages} onClick={() => fetchTests(page + 1)}>
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Nested results modal */}
      {selectedTest && (
        <TestResultsModal
          test={selectedTest}
          onClose={() => setSelectedTest(null)}
        />
      )}
    </>
  );
};

/* ─── Add Teacher modal ──────────────────────────────────────── */
const AddTeacherModal = ({ onClose, onCreated }) => {
  const [form, setForm]   = useState({ name: "", email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const handleChange = (e) => {
    setError("");
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError("All fields are required.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await axios.post(`${API}/api/admin/teachers`, form);
      if (data.success) {
        onCreated(data.teacher);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create teacher.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ad-modal-overlay" onClick={onClose}>
      <div className="ad-modal ad-modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="ad-modal-header">
          <div className="ad-modal-avatar ad-modal-avatar--green">
            <i className="bi bi-person-plus-fill"></i>
          </div>
          <div>
            <h3 className="ad-modal-title">Add Teacher</h3>
            <p className="ad-modal-sub">Create a new teacher account</p>
          </div>
          <button className="ad-modal-close" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="ad-modal-body">
          {error && (
            <div className="ad-form-error">
              <i className="bi bi-exclamation-circle-fill me-2"></i>{error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="ad-add-form">
            <div className="ad-field">
              <label className="ad-field-label">Full Name</label>
              <input name="name" className="ad-field-input" placeholder="e.g. Dr. Priya Sharma"
                value={form.name} onChange={handleChange} autoFocus />
            </div>
            <div className="ad-field">
              <label className="ad-field-label">Email Address</label>
              <input name="email" type="email" className="ad-field-input" placeholder="teacher@college.edu"
                value={form.email} onChange={handleChange} />
            </div>
            <div className="ad-field">
              <label className="ad-field-label">Password</label>
              <div className="ad-pw-wrap">
                <input name="password" type={showPw ? "text" : "password"} className="ad-field-input"
                  placeholder="Min. 8 characters" value={form.password} onChange={handleChange} />
                <button type="button" className="ad-pw-toggle" onClick={() => setShowPw((v) => !v)} tabIndex={-1}>
                  <i className={`bi ${showPw ? "bi-eye-slash" : "bi-eye"}`}></i>
                </button>
              </div>
            </div>
            <div className="ad-modal-footer ad-modal-footer--form">
              <button type="button" className="ad-btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="ad-btn-primary" disabled={saving}>
                {saving ? <><span className="ad-spinner-sm"></span> Creating…</> : "Create Teacher"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Dashboard ─────────────────────────────────────────── */
const AdminDashboard = () => {
  const navigate = useNavigate();

  const adminName  = localStorage.getItem("adminName")  || "Admin";
  const adminEmail = localStorage.getItem("adminEmail") || "";

  const [showSplash, setShowSplash] = useState(() => {
    const v = sessionStorage.getItem("adminJustLoggedIn");
    if (v) { sessionStorage.removeItem("adminJustLoggedIn"); return true; }
    return false;
  });

  const [stats, setStats]               = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [teachers, setTeachers]         = useState([]);
  const [teachLoad, setTeachLoad]       = useState(true);
  const [search, setSearch]             = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [showAddModal, setShowAddModal]       = useState(false);
  const [toast, setToast]               = useState(null);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/api/admin/stats`);
      if (data.success) setStats(data.stats);
    } catch {
      /* silently ignore */
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch teachers
  const fetchTeachers = useCallback(async (q = "") => {
    setTeachLoad(true);
    try {
      const { data } = await axios.get(`${API}/api/admin/teachers`, {
        params: q ? { search: q } : {},
      });
      if (data.success) setTeachers(data.teachers);
    } catch {
      setTeachers([]);
    } finally {
      setTeachLoad(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchTeachers();
  }, [fetchStats, fetchTeachers]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchTeachers(search), 350);
    return () => clearTimeout(t);
  }, [search, fetchTeachers]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleTeacherCreated = (teacher) => {
    fetchTeachers(search);
    fetchStats();
    showToast(`Teacher "${teacher.name}" created successfully!`);
  };

  return (
    <div className="ad-page">
      {/* Welcome splash */}
      {showSplash && (
        <AdminWelcomeSplash name={adminName} onDone={() => setShowSplash(false)} />
      )}

      {/* Toast */}
      {toast && (
        <div className={`ad-toast ad-toast--${toast.type}`}>
          <i className={`bi ${toast.type === "success" ? "bi-check-circle-fill" : "bi-exclamation-circle-fill"} me-2`}></i>
          {toast.msg}
        </div>
      )}

      {/* Top bar */}
      <header className="ad-topbar">
        <div className="ad-topbar-left">
          <div className="ad-page-icon">
            <i className="bi bi-shield-fill"></i>
          </div>
          <div>
            <h1 className="ad-page-title">Admin Dashboard</h1>
            <p className="ad-page-sub">Welcome back, {adminName}</p>
          </div>
        </div>
        <div className="ad-topbar-right">
          <div className="ad-admin-badge">
            <i className="bi bi-person-circle me-1"></i>
            {adminEmail}
          </div>
          <button className="ad-logout-btn" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right me-1"></i> Logout
          </button>
        </div>
      </header>

      <div className="ad-content">
        {/* Stats row */}
        <div className="ad-stats-row">
          <StatCard icon="bi-person-workspace" label="Total Teachers"   value={stats?.teacherCount}   gradient="purple"  loading={statsLoading} />
          <StatCard icon="bi-journal-text"     label="Total Tests"      value={stats?.testCount}      gradient="blue"    loading={statsLoading} />
          <StatCard icon="bi-check2-circle"    label="Published Tests"  value={stats?.publishedCount} gradient="green"   loading={statsLoading} />
          <StatCard icon="bi-mortarboard-fill" label="Total Students"   value={stats?.studentCount}   gradient="teal"    loading={statsLoading} />
        </div>

        {/* Teachers section */}
        <section className="ad-section">
          {/* Section header */}
          <div className="ad-section-header">
            <div className="ad-section-title-wrap">
              <h2 className="ad-section-title">
                <i className="bi bi-person-workspace me-2"></i>Teachers
              </h2>
              <span className="ad-section-count">{teachers.length}</span>
            </div>
            <div className="ad-section-actions">
              <div className="ad-search-wrap">
                <i className="bi bi-search ad-search-icon"></i>
                <input
                  className="ad-search"
                  type="text"
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button className="ad-search-clear" onClick={() => setSearch("")}>
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
              <button className="ad-btn-add" onClick={() => setShowAddModal(true)}>
                <i className="bi bi-plus-lg me-1"></i> Add Teacher
              </button>
            </div>
          </div>

          {/* Teacher grid */}
          {teachLoad ? (
            <div className="ad-teacher-grid">
              {[1, 2, 3, 4].map((k) => (
                <div key={k} className="ad-teacher-card ad-teacher-card--skeleton">
                  <div className="ad-sk-avatar"></div>
                  <div className="ad-sk-line ad-sk-line--wide"></div>
                  <div className="ad-sk-line ad-sk-line--mid"></div>
                </div>
              ))}
            </div>
          ) : teachers.length === 0 ? (
            <div className="ad-empty ad-empty--lg">
              <i className="bi bi-people"></i>
              <p>
                {search
                  ? `No teachers found for "${search}"`
                  : "No teachers registered yet. Add one to get started!"}
              </p>
            </div>
          ) : (
            <div className="ad-teacher-grid">
              {teachers.map((t) => (
                <TeacherCard
                  key={t._id}
                  teacher={t}
                  onViewTests={() => setSelectedTeacher(t)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Modals */}
      {selectedTeacher && (
        <TeacherTestsModal
          teacher={selectedTeacher}
          onClose={() => setSelectedTeacher(null)}
        />
      )}
      {showAddModal && (
        <AddTeacherModal
          onClose={() => setShowAddModal(false)}
          onCreated={handleTeacherCreated}
        />
      )}
    </div>
  );
};

/* ─── Teacher Card ───────────────────────────────────────────── */
const TeacherCard = ({ teacher, onViewTests }) => {
  const joinDate = new Date(teacher.createdAt).toLocaleDateString("en-IN", {
    month: "short", year: "numeric",
  });

  return (
    <div className="ad-teacher-card">
      <div className="ad-teacher-card-top">
        <div className="ad-teacher-avatar">{initials(teacher.name)}</div>
        <div className="ad-teacher-info">
          <h3 className="ad-teacher-name">{teacher.name}</h3>
          <p className="ad-teacher-email">{teacher.email}</p>
        </div>
      </div>

      <div className="ad-teacher-meta">
        <div className="ad-meta-item">
          <i className="bi bi-journal-text"></i>
          <span>{teacher.testCount} Test{teacher.testCount !== 1 ? "s" : ""}</span>
        </div>
        <div className="ad-meta-item ad-meta-item--green">
          <i className="bi bi-check-circle"></i>
          <span>{teacher.publishedCount} Published</span>
        </div>
        <div className="ad-meta-item">
          <i className="bi bi-calendar3"></i>
          <span>Joined {joinDate}</span>
        </div>
      </div>

      <button className="ad-view-btn" onClick={onViewTests}>
        <i className="bi bi-eye me-1"></i> View Tests
      </button>
    </div>
  );
};

export default AdminDashboard;
