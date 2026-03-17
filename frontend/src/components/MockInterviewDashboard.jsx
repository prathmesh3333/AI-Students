import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
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
import "./MockInterviewDashboard.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const MockInterviewDashboard = () => {
  const [studentName, setStudentName] = useState("");
  const [studentBranch, setStudentBranch] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [interviews, setInterviews] = useState([]);
  const [interviewSearch, setInterviewSearch] = useState("");

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
      fetchInterviews(roll);
    }
  }, [navigate]);

  const fetchInterviews = async (rollNo) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:5000/api/interview/user/${rollNo}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setInterviews(response.data.interviews);
      }
    } catch (error) {
      console.error("Error fetching interviews:", error);
      setInterviews([]);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // Chart Data
  const chartData = {
    labels: interviews.map((i) => i.date),
    datasets: [
      {
        label: "Confidence",
        data: interviews.map((i) =>
          i.confidence === "High" ? 3 : i.confidence === "Medium" ? 2 : 1
        ),
        borderColor: "#00d5ff",
        backgroundColor: "rgba(0, 213, 255, 0.2)",
        tension: 0.3,
      },
      {
        label: "Nervousness",
        data: interviews.map((i) =>
          i.nervousness === "Low" ? 1 : i.nervousness === "Medium" ? 2 : 3
        ),
        borderColor: "#ff4d6d",
        backgroundColor: "rgba(255, 77, 109, 0.2)",
        tension: 0.3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Performance Over Time" },
    },
    scales: {
      y: {
        min: 0,
        max: 3,
        ticks: {
          stepSize: 1,
          callback: (val) =>
            val === 1 ? "Low" : val === 2 ? "Medium" : "High",
        },
      },
    },
  };

  // Split interviews into carousel slides
  const chunkArray = (arr, chunkSize) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
      chunks.push(arr.slice(i, i + chunkSize));
    }
    return chunks;
  };

  const [currentSlide, setCurrentSlide] = useState(0);
  const [chunkSize, setChunkSize] = useState(3);
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 576) setChunkSize(1);
      else if (window.innerWidth < 850) setChunkSize(2);
      else if (window.innerWidth < 1100) setChunkSize(3);
      else if (window.innerWidth < 1400) setChunkSize(4);
      else setChunkSize(5);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const filteredInterviews = (interviews || []).filter((interview) => {
  const text = interviewSearch.toLowerCase();

  return (
    interview.role?.toLowerCase().includes(text) ||
    interview.company?.toLowerCase().includes(text) ||
    interview.topic?.toLowerCase().includes(text) ||
    interview.difficulty?.toLowerCase().includes(text) ||
    interview.date?.toLowerCase().includes(text)
  );
});

  const slides = chunkArray(filteredInterviews, chunkSize);
  // Clamp currentSlide whenever slides length changes
  const safeSlide = Math.min(currentSlide, Math.max(0, slides.length - 1));

  const goPrev = () => setCurrentSlide((s) => Math.max(0, s - 1));
  const goNext = () => setCurrentSlide((s) => Math.min(slides.length - 1, s + 1));

  return (
    <div className="mock-dashboard-wrapper">
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark navbar-custom px-4">
        <button
          onClick={() => navigate("/home")}
          className="btn btn-outline-light btn-sm fw-semibold me-3"
        >
          <i className="bi bi-arrow-left me-1"></i> Back to Home
        </button>
        <h3 className="navbar-brand fw-bold mb-0">
          Mock Interview Dashboard
        </h3>
        <div className="ms-auto d-flex align-items-center gap-3">
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

      {/* Main Content */}
      <div className="container py-5">
          <input
    type="text"
    className="form-control mb-3"
    placeholder="Search Mock Interviews..."
    value={interviewSearch}
    onChange={(e) => setInterviewSearch(e.target.value)}
  />
        <h2 className="mb-4 text-center">Previous Mock Interviews</h2>

        {/* Chart */}
        {interviews.length > 0 && (
          <div className="card shadow-sm mb-5 p-4">
            <Line data={chartData} options={chartOptions} />
          </div>
        )}

        {/* Carousel */}
        {interviews.length > 0 ? (
          <div className="mid-carousel mb-4">
            <div className="mid-carousel-viewport">
              <div
                className="mid-carousel-track"
                style={{ transform: `translateX(-${safeSlide * 100}%)` }}
              >
                {slides.map((slideGroup, slideIdx) => (
                  <div key={slideIdx} className="mid-slide-group">
                    {slideGroup.map((interview) => {
                      // Extract only first word from confidence/nervousness (handle long text)
                      const confidenceLevel = interview.confidence?.split('.')[0].split(' ')[0] || 'N/A';
                      const nervousnessLevel = interview.nervousness?.split('.')[0].split(' ')[0] || 'N/A';

                      // Show max 2 items for weak/strong areas
                      const weakAreasDisplay = interview.weakAreas?.slice(0, 2) || [];
                      const strongAreasDisplay = interview.strongAreas?.slice(0, 2) || [];

                      return (
                      <div
                        key={interview._id}
                        className="card shadow-sm hover-card interview-card"
                      >
                        <div className="card-content">
                          <div className="interview-header">
                            <h6 className="fw-bold mb-1 text-white">{interview.date}</h6>
                          </div>

                          {/* Interview Details Grid */}
                          <div className="interview-details">
                            <div className="detail-row">
                              <i className="bi bi-briefcase-fill text-primary"></i>
                              <span className="detail-text">{interview.role || 'N/A'}</span>
                            </div>
                            <div className="detail-row">
                              <i className="bi bi-building text-info"></i>
                              <span className="detail-text">{interview.company || 'N/A'}</span>
                            </div>
                            <div className="detail-row">
                              <i className="bi bi-clock-history text-secondary"></i>
                              <span className="detail-text">{interview.experience || 'N/A'}</span>
                            </div>
                            <div className="detail-row">
                              <i className="bi bi-book text-success"></i>
                              <span className="detail-text">{interview.topic || 'N/A'}</span>
                            </div>
                            <div className="detail-row">
                              <i className="bi bi-speedometer2 text-warning"></i>
                              <span className="detail-text">{interview.difficulty || 'N/A'}</span>
                            </div>
                          </div>

                          {/* Performance Badges */}
                          <div className="performance-badges">
                            <span className={`custom-badge ${
                              confidenceLevel === 'High' ? 'badge-success' :
                              confidenceLevel === 'Medium' ? 'badge-warning' :
                              'badge-danger'
                            }`}>
                              <i className="bi bi-award-fill me-1"></i>
                              {confidenceLevel}
                            </span>
                            <span className={`custom-badge ${
                              nervousnessLevel === 'Low' ? 'badge-success' :
                              nervousnessLevel === 'Medium' ? 'badge-warning' :
                              'badge-danger'
                            }`}>
                              <i className="bi bi-heart-pulse-fill me-1"></i>
                              {nervousnessLevel}
                            </span>
                          </div>

                          {/* Areas Summary */}
                          <div className="areas-summary">
                            {weakAreasDisplay.length > 0 && (
                              <div className="area-item weak">
                                <i className="bi bi-arrow-down-circle-fill"></i>
                                <span>
                                  {weakAreasDisplay.slice(0, 1).join(", ")}
                                  {interview.weakAreas?.length > 1 && ` +${interview.weakAreas.length - 1}`}
                                </span>
                              </div>
                            )}

                            {strongAreasDisplay.length > 0 && (
                              <div className="area-item strong">
                                <i className="bi bi-arrow-up-circle-fill"></i>
                                <span>
                                  {strongAreasDisplay.slice(0, 1).join(", ")}
                                  {interview.strongAreas?.length > 1 && ` +${interview.strongAreas.length - 1}`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="fixed-footer">
                          <button
                            className="btn btn-primary"
                            onClick={() =>
                              navigate("/interview-summary", {
                                state: {
                                  summary: {
                                    confidence: interview.confidence,
                                    nervousness: interview.nervousness,
                                    weakAreas: interview.weakAreas,
                                    strongAreas: interview.strongAreas,
                                    overallSummary: interview.overallSummary,
                                    technicalScore: interview.technicalScore,
                                    communicationScore: interview.communicationScore,
                                    recommendation: interview.recommendation
                                  },
                                  interviewData: {
                                    role: interview.role,
                                    company: interview.company,
                                    experience: interview.experience,
                                    topic: interview.topic,
                                    difficulty: interview.difficulty,
                                    resumeText: interview.resumeText,
                                    messages: interview.messages
                                  },
                                  isAlreadySaved: true
                                },
                              })
                            }
                          >
                            <i className="bi bi-bar-chart-line-fill me-1" />
                            View Summary
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* React-controlled nav */}
            <div className="mid-carousel-nav">
              <button
                className="mid-nav-btn"
                onClick={goPrev}
                disabled={safeSlide === 0}
              >
                <i className="bi bi-chevron-left" />
              </button>
              <span className="mid-nav-dots">
                {slides.map((_, i) => (
                  <span
                    key={i}
                    className={`mid-dot ${i === safeSlide ? "mid-dot-active" : ""}`}
                    onClick={() => setCurrentSlide(i)}
                  />
                ))}
              </span>
              <button
                className="mid-nav-btn"
                onClick={goNext}
                disabled={safeSlide === slides.length - 1}
              >
                <i className="bi bi-chevron-right" />
              </button>
            </div>
          </div>
        ) : (
          <p className="text-center">No mock interviews yet.</p>
        )}

        {/* Start New Interview Button */}
        <div className="text-center mt-4">
          <Link to="/start-mock-interview" className="btn btn-primary btn-lg">
            Start New Interview
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer-custom text-center py-3">
        © {new Date().getFullYear()} Mock Interview Dashboard
      </footer>
    </div>
  );
};

export default MockInterviewDashboard;
