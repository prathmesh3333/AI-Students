import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./StudentProfile.css";

const LIMIT = 9;
const mkSection = () => ({ list: [], page: 0, hasMore: true, loading: false, total: 0 });

const StudentProfile = () => {
  const { rollNo } = useParams();
  const navigate   = useNavigate();

  const isTeacher = !!localStorage.getItem("teacherName");
  const isStudent = !!localStorage.getItem("studentName");

  const [teacherName, setTeacherName] = useState("");
  const [student, setStudent]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  // per-section state
  const [pendingData,  setPendingData]  = useState(mkSection);
  const [outdatedData, setOutdatedData] = useState(mkSection);
  const [completedData,setCompletedData]= useState(mkSection);
  const [interviewData,setInterviewData]= useState(mkSection);

  // search state
  const [pendingSearch,  setPendingSearch]  = useState("");
  const [outdatedSearch, setOutdatedSearch] = useState("");
  const [completedSearch,setCompletedSearch]= useState("");
  const [interviewSearch,setInterviewSearch]= useState("");

  // refs for stale-closure-free scroll handlers
  const sRef = useRef({ pending: mkSection(), outdated: mkSection(), completed: mkSection(), interview: mkSection() });
  const searchRefs = useRef({ pending: "", outdated: "", completed: "", interview: "" });

  // debounce refs
  const debounces = useRef({ pending: null, outdated: null, completed: null, interview: null });
  const mounted   = useRef({ pending: false, outdated: false, completed: false, interview: false });

  // keep sRef in sync
  useEffect(() => { sRef.current.pending  = pendingData;  }, [pendingData]);
  useEffect(() => { sRef.current.outdated = outdatedData; }, [outdatedData]);
  useEffect(() => { sRef.current.completed= completedData;}, [completedData]);
  useEffect(() => { sRef.current.interview= interviewData;}, [interviewData]);

  // ── fetch helpers ──────────────────────────────────────────────

  const fetchSection = async (key, setter, url, page, append) => {
    setter(prev => ({ ...prev, loading: true }));
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(url, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
      if (res.data?.success) {
        setter(prev => ({
          list: append ? [...prev.list, ...res.data[key]] : res.data[key],
          page,
          hasMore: res.data.hasMore,
          loading: false,
          total: res.data.total ?? (append ? prev.total : (res.data[key]?.length ?? 0)),
        }));
      }
    } catch (err) {
      console.error(`Error fetching ${key}:`, err);
      setter(prev => ({ ...prev, loading: false }));
    }
  };

  const fetchPending = (page, search, append) =>
    fetchSection("tests", setPendingData,
      `http://localhost:5000/api/test/pending/${rollNo}?type=active&page=${page}&limit=${LIMIT}&search=${encodeURIComponent(search)}`,
      page, append);

  const fetchOutdated = (page, search, append) =>
    fetchSection("tests", setOutdatedData,
      `http://localhost:5000/api/test/pending/${rollNo}?type=outdated&page=${page}&limit=${LIMIT}&search=${encodeURIComponent(search)}`,
      page, append);

  const fetchCompleted = (page, search, append) =>
    fetchSection("results", setCompletedData,
      `http://localhost:5000/api/test-result/student/${rollNo}?page=${page}&limit=${LIMIT}&search=${encodeURIComponent(search)}`,
      page, append);

  const fetchInterviews = (page, search, append) =>
    fetchSection("interviews", setInterviewData,
      `http://localhost:5000/api/interview/student/${rollNo}?page=${page}&limit=${LIMIT}&search=${encodeURIComponent(search)}`,
      page, append);

  // ── initial load ───────────────────────────────────────────────

  useEffect(() => {
    if (!isTeacher && !isStudent) { navigate("/login"); return; }
    const name = localStorage.getItem("teacherName") || localStorage.getItem("studentName");
    setTeacherName(name);

    (async () => {
      try {
        setLoading(true);
        const res = await axios.get(`http://localhost:5000/api/auth/student/${rollNo}`);
        if (!res.data?.success) throw new Error("Student not found");
        setStudent(res.data.student);
        await Promise.allSettled([
          fetchPending(1, "", false),
          fetchOutdated(1, "", false),
          fetchCompleted(1, "", false),
          fetchInterviews(1, "", false),
        ]);
      } catch (err) {
        setError(err.response?.data?.error || err.message || "Failed to load student data");
      } finally {
        setLoading(false);
      }
    })();
  }, [rollNo, navigate]);

  // ── search debounces ───────────────────────────────────────────

  const makeSearchEffect = (key, search, setter, fetchFn) => {
    if (!mounted.current[key]) { mounted.current[key] = true; return; }
    clearTimeout(debounces.current[key]);
    debounces.current[key] = setTimeout(() => {
      searchRefs.current[key] = search;
      setter(mkSection());
      fetchFn(1, search, false);
    }, 300);
  };

  useEffect(() => makeSearchEffect("pending",  pendingSearch,  setPendingData,  fetchPending),  [pendingSearch]);
  useEffect(() => makeSearchEffect("outdated", outdatedSearch, setOutdatedData, fetchOutdated), [outdatedSearch]);
  useEffect(() => makeSearchEffect("completed",completedSearch,setCompletedData,fetchCompleted),[completedSearch]);
  useEffect(() => makeSearchEffect("interview",interviewSearch,setInterviewData,fetchInterviews),[interviewSearch]);

  // ── scroll handlers ────────────────────────────────────────────

  const makeScrollHandler = (key, fetchFn) => (e) => {
    const el = e.currentTarget;
    const near = el.scrollTop + el.clientHeight >= el.scrollHeight - 60;
    const sd = sRef.current[key];
    if (near && sd.hasMore && !sd.loading) {
      fetchFn(sd.page + 1, searchRefs.current[key], true);
    }
  };

  const onScrollPending   = makeScrollHandler("pending",   fetchPending);
  const onScrollOutdated  = makeScrollHandler("outdated",  fetchOutdated);
  const onScrollCompleted = makeScrollHandler("completed", fetchCompleted);
  const onScrollInterview = makeScrollHandler("interview", fetchInterviews);

  // ── helpers ────────────────────────────────────────────────────

  const handleLogout = () => { localStorage.clear(); navigate("/login"); };
  const handleViewProfile = (r) => navigate(`/student-profile/${r}`);

  const formatDate = (d) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  const getScoreClass = (s) => s >= 90 ? "text-success" : s >= 70 ? "text-primary" : s >= 50 ? "text-warning" : "text-danger";
  const getScoreGrade = (s) => s >= 90 ? "A+" : s >= 80 ? "A" : s >= 70 ? "B+" : s >= 60 ? "B" : s >= 50 ? "C" : "F";

  // ── loading / error states ─────────────────────────────────────

  if (loading) {
    return (
      <div className="student-profile-container">
        <div className="loading-container">
          <div className="spinner-wrapper">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
          <p className="loading-text">Loading student profile...</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="student-profile-container">
        <nav className="navbar navbar-expand-lg navbar-dark navbar-custom px-4">
          <h3 className="navbar-brand fw-bold mb-0">
            <i className="bi bi-person-circle me-2"></i>
            {isStudent ? "My Profile" : "Student Profile"}
          </h3>
          <div className="ms-auto d-flex align-items-center gap-3">
            <button onClick={() => navigate(isTeacher ? "/students-list" : "/home")} className="btn btn-light btn-sm fw-semibold">
              <i className="bi bi-arrow-left me-1"></i> {isTeacher ? "Back to Students" : "Back to Dashboard"}
            </button>
            <button onClick={handleLogout} className="btn btn-outline-light btn-sm">
              <i className="bi bi-box-arrow-right me-1"></i> Logout
            </button>
          </div>
        </nav>
        <div className="error-container">
          <div className="error-card">
            <i className="bi bi-exclamation-triangle-fill text-warning"></i>
            <h3>Profile Not Found</h3>
            <p>Roll Number: <strong>{rollNo}</strong></p>
            <p className="text-muted">{error || "The profile you're looking for doesn't exist."}</p>
            <button className="btn btn-primary" onClick={() => navigate(isTeacher ? "/students-list" : "/home")}>
              <i className="bi bi-arrow-left me-2"></i>
              {isTeacher ? "Back to Students List" : "Back to Dashboard"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const avgScore = completedData.total > 0
    ? (completedData.list.reduce((s, t) => s + t.score, 0) / completedData.list.length).toFixed(1)
    : 0;

  // ── section renderer ───────────────────────────────────────────

  const SectionGrid = ({ data, onScroll, children, emptyIcon, emptyTitle, emptyMsg }) => (
    <>
      <div className="sp-grid-wrap" onScroll={onScroll}>
        {data.list.length === 0 && !data.loading ? (
          <div className="empty-state">
            <i className={`bi ${emptyIcon}`}></i>
            <h5>{emptyTitle}</h5>
            <p>{emptyMsg}</p>
          </div>
        ) : (
          <div className="row g-4">
            {children}
            {data.loading && (
              <div className="col-12 text-center py-3">
                <div className="spinner-border spinner-border-sm text-primary" role="status" />
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="student-profile-container">
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark navbar-custom px-4">
        <h3 className="navbar-brand fw-bold mb-0">
          <i className="bi bi-person-circle me-2"></i>
          {isStudent ? "My Profile" : "Student Profile"}
        </h3>
        <div className="ms-auto d-flex align-items-center gap-3">
          {isTeacher ? (
            <>
              <button onClick={() => navigate("/students-list")} className="btn btn-light btn-sm fw-semibold">
                <i className="bi bi-arrow-left me-1"></i> Back to Students
              </button>
              <button onClick={() => navigate("/teacher-dashboard")} className="btn btn-outline-light btn-sm">
                <i className="bi bi-house-door me-1"></i> Dashboard
              </button>
            </>
          ) : (
            <button onClick={() => navigate("/home")} className="btn btn-light btn-sm fw-semibold">
              <i className="bi bi-arrow-left me-1"></i> Back to Dashboard
            </button>
          )}
          <span className="fw-semibold text-white">{teacherName || "User"}</span>
          <button onClick={handleLogout} className="btn btn-outline-light btn-sm">
            <i className="bi bi-box-arrow-right me-1"></i> Logout
          </button>
        </div>
      </nav>

      <div className="container-fluid py-4">
        {/* Student Header Card */}
        <div className="student-header-card">
          <div className="student-header-background"></div>
          <div className="student-header-content">
            <div className="row align-items-end">
              <div className="col-md-8">
                <div className="student-info-main">
                  <div className="student-avatar-large">{student.name.charAt(0).toUpperCase()}</div>
                  <div className="student-details-main">
                    <h2 className="student-name-large">{student.name}</h2>
                    <p className="student-roll-large"><i className="bi bi-person-badge me-2"></i>{student.rollNo}</p>
                    <span className="branch-badge-large"><i className="bi bi-building me-2"></i>{student.branch}</span>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="student-stats-grid">
                  <div className="stat-box stat-box-primary">
                    <div className="stat-icon"><i className="bi bi-clipboard-check"></i></div>
                    <div className="stat-info">
                      <div className="stat-number">{completedData.total}</div>
                      <div className="stat-label">Tests Completed</div>
                    </div>
                  </div>
                  <div className="stat-box stat-box-warning">
                    <div className="stat-icon"><i className="bi bi-hourglass-split"></i></div>
                    <div className="stat-info">
                      <div className="stat-number">{pendingData.total}</div>
                      <div className="stat-label">Tests Pending</div>
                    </div>
                  </div>
                  <div className="stat-box stat-box-danger">
                    <div className="stat-icon"><i className="bi bi-calendar-x"></i></div>
                    <div className="stat-info">
                      <div className="stat-number">{outdatedData.total}</div>
                      <div className="stat-label">Outdated Tests</div>
                    </div>
                  </div>
                  <div className="stat-box stat-box-success">
                    <div className="stat-icon"><i className="bi bi-trophy"></i></div>
                    <div className="stat-info">
                      <div className="stat-number">{avgScore}%</div>
                      <div className="stat-label">Average Score</div>
                    </div>
                  </div>
                  <div className="stat-box stat-box-info">
                    <div className="stat-icon"><i className="bi bi-mic"></i></div>
                    <div className="stat-info">
                      <div className="stat-number">{interviewData.total}</div>
                      <div className="stat-label">Interviews</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Pending Tests ── */}
        <div className="mb-4">
          <h4 className="section-title">
            <i className="bi bi-hourglass-split me-2"></i>
            Pending Tests
            <span className="section-count">{pendingData.total}</span>
          </h4>
          <input type="text" className="form-control mb-3" placeholder="Search Pending Tests..."
            value={pendingSearch} onChange={(e) => setPendingSearch(e.target.value)} />
          <SectionGrid data={pendingData} onScroll={onScrollPending}
            emptyIcon="bi-check-circle" emptyTitle="All Caught Up!" emptyMsg="This student has completed all available tests.">
            {pendingData.list.map((test, index) => (
              <div key={test._id} className="col-md-6 col-lg-4" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="test-card pending-card">
                  <div className="test-card-ribbon pending-ribbon"><i className="bi bi-hourglass-split me-1"></i>Pending</div>
                  <div className="test-card-header">
                    <h5 className="test-title">{test.title}</h5>
                    <p className="test-description">{test.description}</p>
                  </div>
                  <div className="test-card-body">
                    <div className="test-meta-grid">
                      <div className="test-meta-item"><i className="bi bi-book"></i><span>{test.subject}</span></div>
                      <div className="test-meta-item"><i className="bi bi-question-circle"></i><span>{test.totalQuestions} Questions</span></div>
                      <div className="test-meta-item"><i className="bi bi-clock"></i><span>{test.timeLimit} mins</span></div>
                      <div className="test-meta-item"><i className="bi bi-building"></i><span>{test.branches}</span></div>
                    </div>
                    {isStudent && (
                      <button className="btn-start-test" onClick={() => navigate(`/test/${test._id}`)}>
                        <i className="bi bi-play-circle me-2"></i>Give Test Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </SectionGrid>
        </div>

        {/* ── Outdated Tests ── */}
        {(outdatedData.total > 0 || outdatedData.loading) && (
          <div className="mb-4">
            <h4 className="section-title">
              <i className="bi bi-calendar-x me-2"></i>
              Outdated Tests
              <span className="section-count section-count-danger">{outdatedData.total}</span>
            </h4>
            <input type="text" className="form-control mb-3" placeholder="Search Outdated Tests..."
              value={outdatedSearch} onChange={(e) => setOutdatedSearch(e.target.value)} />
            <SectionGrid data={outdatedData} onScroll={onScrollOutdated}
              emptyIcon="bi-calendar-check" emptyTitle="No Outdated Tests" emptyMsg="No missed deadlines.">
              {outdatedData.list.map((test, index) => (
                <div key={test._id} className="col-md-6 col-lg-4" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="test-card outdated-card">
                    <div className="test-card-ribbon outdated-ribbon"><i className="bi bi-calendar-x me-1"></i>Outdated</div>
                    <div className="test-card-header">
                      <h5 className="test-title">{test.title}</h5>
                      <p className="test-description">{test.description}</p>
                    </div>
                    <div className="test-card-body">
                      <div className="test-meta-grid">
                        <div className="test-meta-item"><i className="bi bi-book"></i><span>{test.subject}</span></div>
                        <div className="test-meta-item"><i className="bi bi-question-circle"></i><span>{test.totalQuestions} Questions</span></div>
                        <div className="test-meta-item"><i className="bi bi-clock"></i><span>{test.timeLimit} mins</span></div>
                        <div className="test-meta-item outdated-deadline">
                          <i className="bi bi-calendar-x"></i>
                          <span>Deadline: {formatDate(test.deadline)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </SectionGrid>
          </div>
        )}

        {/* ── Completed Tests ── */}
        <div className="mb-4">
          <h4 className="section-title">
            <i className="bi bi-check2-square me-2"></i>
            Completed Tests
            <span className="section-count">{completedData.total}</span>
          </h4>
          <input type="text" className="form-control mb-3" placeholder="Search Completed Tests..."
            value={completedSearch} onChange={(e) => setCompletedSearch(e.target.value)} />
          <SectionGrid data={completedData} onScroll={onScrollCompleted}
            emptyIcon="bi-clipboard-x" emptyTitle="No Tests Completed Yet" emptyMsg="This student hasn't completed any tests yet.">
            {completedData.list.map((result, index) => (
              <div key={result._id} className="col-md-6 col-lg-4" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="test-card completed-card">
                  <div className={`test-card-ribbon ${result.score >= 50 ? "passed-ribbon" : "failed-ribbon"}`}>
                    <i className={`bi ${result.score >= 50 ? "bi-check-circle" : "bi-x-circle"} me-1`}></i>
                    {result.score >= 50 ? "Passed" : "Failed"}
                  </div>
                  <div className="test-card-header">
                    <h5 className="test-title">{result.testId?.title || "Test"}</h5>
                    <div className="score-display-compact">
                      <div className="score-circle">
                        <div className={`score-value ${getScoreClass(result.score)}`}>{result.score}%</div>
                        <div className="score-grade">{getScoreGrade(result.score)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="test-card-body">
                    <div className="result-details">
                      <div className="result-item">
                        <i className="bi bi-check-circle text-success"></i>
                        <span>Correct: <strong>{result.correctAnswers}/{result.totalQuestions}</strong></span>
                      </div>
                      <div className="result-item">
                        <i className="bi bi-calendar3 text-muted"></i>
                        <span>{formatDate(result.submittedAt)}</span>
                      </div>
                      {result.tabSwitchCount > 0 && (
                        <div className="result-item warning-item">
                          <i className="bi bi-exclamation-triangle"></i>
                          <span>{result.tabSwitchCount} Tab Switch{result.tabSwitchCount > 1 ? "es" : ""}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </SectionGrid>
        </div>

        {/* ── Mock Interviews ── */}
        <div className="mb-4">
          <h4 className="section-title">
            <i className="bi bi-mic me-2"></i>
            Mock Interviews
            <span className="section-count">{interviewData.total}</span>
          </h4>
          <input type="text" className="form-control mb-3" placeholder="Search Mock Interviews..."
            value={interviewSearch} onChange={(e) => setInterviewSearch(e.target.value)} />
          <SectionGrid data={interviewData} onScroll={onScrollInterview}
            emptyIcon="bi-mic-mute" emptyTitle="No Interviews Yet" emptyMsg="This student hasn't participated in any mock interviews.">
            {interviewData.list.map((interview, index) => (
              <div key={interview._id || index} className="col-md-6 col-lg-4" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="test-card interview-card">
                  <div className="test-card-ribbon interview-ribbon"><i className="bi bi-mic me-1"></i>Interview</div>
                  <div className="test-card-header">
                    <h5 className="test-title">{interview.topic || interview.role || "Mock Interview"}</h5>
                    <p className="test-description" style={{ marginBottom: 0 }}>
                      <i className="bi bi-person-fill me-2"></i>
                      {interview.studentName || "Student Interview"}
                    </p>
                  </div>
                  <div className="test-card-body">
                    <div className="result-details">
                      <div className="result-item">
                        <i className="bi bi-hash text-primary"></i>
                        <span>Roll No: <strong>{interview.rollNo || rollNo}</strong></span>
                      </div>
                      <div className="result-item">
                        <i className="bi bi-chat-dots text-info"></i>
                        <span>Questions: <strong>{interview.totalQuestions || 0}</strong></span>
                      </div>
                      <div className="result-item">
                        <i className="bi bi-calendar3 text-muted"></i>
                        <span>Date: <strong>{interview.createdAt ? formatDate(interview.createdAt) : "N/A"}</strong></span>
                      </div>
                      {interview.score !== undefined && (
                        <div className="result-item">
                          <i className="bi bi-bar-chart-line text-success"></i>
                          <span>Score: <strong>{interview.score}</strong></span>
                        </div>
                      )}
                    </div>
                    {interview._id && (
                      <button className="btn-start-test mt-3" onClick={() => navigate(`/interview-result/${interview._id}`)}>
                        <i className="bi bi-eye me-2"></i>View Interview
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </SectionGrid>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
