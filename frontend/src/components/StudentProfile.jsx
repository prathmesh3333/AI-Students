import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./StudentProfile.css";

const StudentProfile = () => {
  const { rollNo } = useParams();
  const [teacherName, setTeacherName] = useState("");
  const [student, setStudent] = useState(null);
  const [publishedTests, setPublishedTests] = useState([]);
  const [completedTests, setCompletedTests] = useState([]);
  const [pendingTests, setPendingTests] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingSearch, setPendingSearch] = useState("");
  const [completedSearch, setCompletedSearch] = useState("");
  const [interviewSearch, setInterviewSearch] = useState("");

  const navigate = useNavigate();

  // Check if viewing as teacher or student
  const isTeacher = !!localStorage.getItem("teacherName");
  const isStudent = !!localStorage.getItem("studentName");

  useEffect(() => {
    if (isTeacher) {
      const name = localStorage.getItem("teacherName");
      setTeacherName(name);
      fetchStudentData();
    } else if (isStudent) {
      const name = localStorage.getItem("studentName");
      setTeacherName(name);
      fetchStudentData();
    } else {
      navigate("/login");
    }
  }, [rollNo, navigate]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching student data for rollNo:", rollNo);

      // Fetch student info
      const studentResponse = await axios.get(`http://localhost:5000/api/auth/student/${rollNo}`);
      console.log("Student response:", studentResponse.data);

      if (!studentResponse.data || !studentResponse.data.success) {
        throw new Error("Student not found");
      }

      setStudent(studentResponse.data.student);

      // Fetch student's test results
      // try {
      //   const resultsResponse = await axios.get(`http://localhost:5000/api/test-result/student/${rollNo}`);
      //   if (resultsResponse.data && resultsResponse.data.success) {
      //     setCompletedTests(resultsResponse.data.results);
      //   }
      // } catch (err) {
      //   console.log("No test results found for student");
      //   setCompletedTests([]);
      // }
      // ✅ Fetch student's test results
let results = [];

try {
  const resultsResponse = await axios.get(
    `http://localhost:5000/api/test-result/student/${rollNo}`
  );

  if (resultsResponse.data && resultsResponse.data.success) {
    results = resultsResponse.data.results || [];
    setCompletedTests(results);
  } else {
    setCompletedTests([]);
  }
} catch (err) {
  console.log("No test results found for student");
  setCompletedTests([]);
}


      // Fetch all published tests
      try {
        const testsResponse = await axios.get("http://localhost:5000/api/test/published");
        if (testsResponse.data && testsResponse.data.success) {
          const allTests = testsResponse.data.tests;
          setPublishedTests(allTests);

          // Calculate pending tests
          // const submittedTestIds = completedTests.map(r => r.testId?._id);
          // const pending = allTests.filter(test =>
          //   test.branch === studentResponse.data.student.branch &&
          //   !submittedTestIds.includes(test._id)
          // );
          // setPendingTests(pending);
          // Calculate pending tests ✅ (using fresh results)
// const submittedTestIds = results.map((r) => r.testId?._id);
const submittedTestIds = results.map(
  (r) => (typeof r.testId === "string" ? r.testId : r.testId?._id)
);


// const pending = allTests.filter(
//   (test) =>
//     test.branch === studentResponse.data.student.branch &&
//     !submittedTestIds.includes(test._id)
// );
const pending = allTests.filter((test) => {
  const branches = test.branches || [test.branch]; // fallback
  return (
    branches.includes(studentResponse.data.student.branch) &&
    !submittedTestIds.includes(test._id)
  );
});

setPendingTests(pending);

        }
      } catch (err) {
        console.log("No published tests found");
        setPublishedTests([]);
        setPendingTests([]);
      }

      // Fetch student's interviews
      try {
        const token = localStorage.getItem("token");
        const interviewsResponse = await axios.get(`http://localhost:5000/api/interview/student/${rollNo}`, { headers: { Authorization: `Bearer ${token}` } });
        if (interviewsResponse.data && interviewsResponse.data.success) {
          setInterviews(interviewsResponse.data.interviews);
        }
      } catch (err) {
        console.log("No interviews found for student");
        setInterviews([]);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching student data:", error);
      setError(error.response?.data?.error || error.message || "Failed to load student data");
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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

  const getScoreGrade = (score) => {
    if (score >= 90) return "A+";
    if (score >= 80) return "A";
    if (score >= 70) return "B+";
    if (score >= 60) return "B";
    if (score >= 50) return "C";
    return "F";
  };

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
            <button
              onClick={() => navigate(isTeacher ? "/students-list" : "/home")}
              className="btn btn-light btn-sm fw-semibold"
            >
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

  const averageScore = completedTests.length > 0
    ? (completedTests.reduce((sum, test) => sum + test.score, 0) / completedTests.length).toFixed(1)
    : 0;

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
              <button
                onClick={() => navigate("/students-list")}
                className="btn btn-light btn-sm fw-semibold"
              >
                <i className="bi bi-arrow-left me-1"></i> Back to Students
              </button>
              <button
                onClick={() => navigate("/teacher-dashboard")}
                className="btn btn-outline-light btn-sm"
              >
                <i className="bi bi-house-door me-1"></i> Dashboard
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate("/home")}
              className="btn btn-light btn-sm fw-semibold"
            >
              <i className="bi bi-arrow-left me-1"></i> Back to Dashboard
            </button>
          )}
          <span className="fw-semibold text-white">
            {teacherName || "User"}
          </span>
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
                  <div className="student-avatar-large">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="student-details-main">
                    <h2 className="student-name-large">{student.name}</h2>
                    <p className="student-roll-large">
                      <i className="bi bi-person-badge me-2"></i>
                      {student.rollNo}
                    </p>
                    <span className="branch-badge-large">
                      <i className="bi bi-building me-2"></i>
                      {student.branch}
                    </span>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="student-stats-grid">
                  <div className="stat-box stat-box-primary">
                    <div className="stat-icon">
                      <i className="bi bi-clipboard-check"></i>
                    </div>
                    <div className="stat-info">
                      <div className="stat-number">{completedTests.length}</div>
                      <div className="stat-label">Tests Completed</div>
                    </div>
                  </div>
                  <div className="stat-box stat-box-warning">
                    <div className="stat-icon">
                      <i className="bi bi-hourglass-split"></i>
                    </div>
                    <div className="stat-info">
                      <div className="stat-number">{pendingTests.length}</div>
                      <div className="stat-label">Tests Pending</div>
                    </div>
                  </div>
                  <div className="stat-box stat-box-success">
                    <div className="stat-icon">
                      <i className="bi bi-trophy"></i>
                    </div>
                    <div className="stat-info">
                      <div className="stat-number">{averageScore}%</div>
                      <div className="stat-label">Average Score</div>
                    </div>
                  </div>
                  <div className="stat-box stat-box-info">
                    <div className="stat-icon">
                      <i className="bi bi-mic"></i>
                    </div>
                    <div className="stat-info">
                      <div className="stat-number">{interviews.length}</div>
                      <div className="stat-label">Interviews</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Tests Section */}
        <div className="mb-4">
        <input
  type="text"
  className="form-control mb-3"
  placeholder="Search Pending Tests..."
  value={pendingSearch}
  onChange={(e) => setPendingSearch(e.target.value)}
/>

          <h4 className="section-title">
            <i className="bi bi-hourglass-split me-2"></i>
            Pending Tests
            <span className="section-count">{pendingTests.length}</span>
          </h4>
          {pendingTests.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-check-circle"></i>
              <h5>All Caught Up!</h5>
              <p>This student has completed all available tests.</p>
            </div>
          ) : (
            <div className="row g-4">
              {pendingTests
  .filter(test =>
    test.title.toLowerCase().includes(pendingSearch.toLowerCase())
  )
  .map((test, index) => (
                <div key={test._id} className="col-md-6 col-lg-4" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="test-card pending-card">
                    <div className="test-card-ribbon pending-ribbon">
                      <i className="bi bi-hourglass-split me-1"></i>
                      Pending
                    </div>
                    <div className="test-card-header">
                      <h5 className="test-title">{test.title}</h5>
                      <p className="test-description">{test.description}</p>
                    </div>
                    <div className="test-card-body">
                      <div className="test-meta-grid">
                        <div className="test-meta-item">
                          <i className="bi bi-book"></i>
                          <span>{test.subject}</span>
                        </div>
                        <div className="test-meta-item">
                          <i className="bi bi-question-circle"></i>
                          <span>{test.totalQuestions} Questions</span>
                        </div>
                        <div className="test-meta-item">
                          <i className="bi bi-clock"></i>
                          <span>{test.timeLimit} mins</span>
                        </div>
                        <div className="test-meta-item">
                          <i className="bi bi-building"></i>
                          <span>{test.branches}</span>
                        </div>
                      </div>
                      {isStudent && (
                        <button
                          className="btn-start-test"
                          onClick={() => navigate(`/test/${test._id}`)}
                        >
                          <i className="bi bi-play-circle me-2"></i>
                          Give Test Now
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Tests Section */}
        <div className="mb-4">
          <input
  type="text"
  className="form-control mb-3"
  placeholder="Search Completed Tests..."
  value={completedSearch}
  onChange={(e) => setCompletedSearch(e.target.value)}
/>

          <h4 className="section-title">
            <i className="bi bi-check2-square me-2"></i>
            Completed Tests
            <span className="section-count">{completedTests.length}</span>
          </h4>
          {completedTests.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-clipboard-x"></i>
              <h5>No Tests Completed Yet</h5>
              <p>This student hasn't completed any tests yet.</p>
            </div>
          ) : (
            <div className="row g-4">
              {completedTests
  .filter(result =>
    result.testId?.title
      ?.toLowerCase()
      .includes(completedSearch.toLowerCase())
  )
  .map((result, index) => (

                <div key={result._id} className="col-md-6 col-lg-4" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="test-card completed-card">
                    <div className={`test-card-ribbon ${result.score >= 50 ? 'passed-ribbon' : 'failed-ribbon'}`}>
                      <i className={`bi ${result.score >= 50 ? 'bi-check-circle' : 'bi-x-circle'} me-1`}></i>
                      {result.score >= 50 ? 'Passed' : 'Failed'}
                    </div>
                    <div className="test-card-header">
                      <h5 className="test-title">{result.testId?.title || "Test"}</h5>
                      <div className="score-display-compact">
                        <div className="score-circle">
                          <div className={`score-value ${getScoreClass(result.score)}`}>
                            {result.score}%
                          </div>
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
                            <span>{result.tabSwitchCount} Tab Switch{result.tabSwitchCount > 1 ? 'es' : ''}</span>
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

        {/* Mock Interviews Section */}
        {/* <div className="mb-4">
          <h4 className="section-title">
            <i className="bi bi-mic me-2"></i>
            Mock Interviews
            <span className="section-count">{interviews.length}</span>
          </h4>
          {interviews.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-mic-mute"></i>
              <h5>No Interviews Yet</h5>
              <p>This student hasn't participated in any mock interviews.</p>
            </div>
          ) : (
            <div className="row g-4">
              {interviews.map((interview, index) => (
                <div key={interview._id} className="col-md-6 col-lg-4" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="test-card interview-card">
                    <div className="test-card-ribbon interview-ribbon">
                      <i className="bi bi-mic me-1"></i>
                      Interview
                    </div>
                    <div className="test-card-header">
                      <h5 className="test-title">{interview.topic || "Mock Interview"}</h5>
                    </div>
                    <div className="test-card-body">
                      <div className="result-details">
                        <div className="result-item">
                          <i className="bi bi-chat-dots text-info"></i>
                          <span>Questions: <strong>{interview.totalQuestions || 0}</strong></span>
                        </div>
                        <div className="result-item">
                          <i className="bi bi-calendar3 text-muted"></i>
                          <span>{formatDate(interview.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div> */}
Mock Interviews Section
<div className="mb-4">
  <input
  type="text"
  className="form-control mb-3"
  placeholder="Search Mock Interviews..."
  value={interviewSearch}
  onChange={(e) => setInterviewSearch(e.target.value)}
/>

  <h4 className="section-title">
    <i className="bi bi-mic me-2"></i>
    Mock Interviews
    <span className="section-count">{interviews.length}</span>
  </h4>

  {interviews.length === 0 ? (
    <div className="empty-state">
      <i className="bi bi-mic-mute"></i>
      <h5>No Interviews Yet</h5>
      <p>This student hasn't participated in any mock interviews.</p>
    </div>
  ) : (
    <div className="row g-4">
      {/* /* {interviews.map((interview, index) => ( */}
      {interviews
  .filter(interview =>
    (interview.topic || interview.role || "mock")
      .toLowerCase()
      .includes(interviewSearch.toLowerCase())
  )
  .map((interview, index) => (

        <div
          key={interview._id || index}
          className="col-md-6 col-lg-4"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <div className="test-card interview-card">
            <div className="test-card-ribbon interview-ribbon">
              <i className="bi bi-mic me-1"></i>
              Interview
            </div>

            <div className="test-card-header">
              <h5 className="test-title">
                {interview.topic || interview.role || "Mock Interview"}
              </h5>

              <p className="test-description" style={{ marginBottom: "0px" }}>
                {interview.studentName ? (
                  <>
                    <i className="bi bi-person-fill me-2"></i>
                    {interview.studentName}
                  </>
                ) : (
                  <>
                    <i className="bi bi-person-fill me-2"></i>
                    Student Interview
                  </>
                )}
              </p>
            </div>

            <div className="test-card-body">
              <div className="result-details">
                <div className="result-item">
                  <i className="bi bi-hash text-primary"></i>
                  <span>
                    Roll No: <strong>{interview.rollNo || rollNo}</strong>
                  </span>
                </div>

                <div className="result-item">
                  <i className="bi bi-chat-dots text-info"></i>
                  <span>
                    Questions: <strong>{interview.totalQuestions || 0}</strong>
                  </span>
                </div>

                <div className="result-item">
                  <i className="bi bi-calendar3 text-muted"></i>
                  <span>
                    Date:{" "}
                    <strong>
                      {interview.createdAt
                        ? formatDate(interview.createdAt)
                        : "N/A"}
                    </strong>
                  </span>
                </div>

                {/* ✅ Optional: show score/overall rating if available */}
                {interview.score !== undefined && (
                  <div className="result-item">
                    <i className="bi bi-bar-chart-line text-success"></i>
                    <span>
                      Score: <strong>{interview.score}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* ✅ Optional: View Interview button */}
              {interview._id && (
                // <button
                //   className="btn-start-test mt-3"
                //   onClick={() => navigate(`/interview-result/${interview._id}`)}
                // >
                //   <i className="bi bi-eye me-2"></i>
                //   View Interview Result
                // </button>
                <button
  className="btn-start-test mt-3"
  onClick={() => {
    console.log("Clicked Interview ID:", interview._id);
    navigate(`/interview-result/${interview._id}`);
  }}
>
  <i className="bi bi-eye me-2"></i>
  View Interview
</button>

              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )}
</div>

      
      </div>
    </div>
  );
};

export default StudentProfile;
