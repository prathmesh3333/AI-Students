import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./StudentsList.css";

const StudentsList = () => {
  const [teacherName, setTeacherName] = useState("");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const searchDebounce  = useRef(null);
  const isSearchMounted = useRef(false);

  const navigate = useNavigate();

  const branches = ["Computer Engineering", "IT", "EXTC", "Electrical", "Mechanical"];

  useEffect(() => {
    const name = localStorage.getItem("teacherName");
    if (!name) { navigate("/login"); return; }
    setTeacherName(name);
    fetchStudents("");
  }, [navigate]);

  const fetchStudents = async (search) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:5000/api/auth/students?search=${encodeURIComponent(search)}`
      );
      if (response.data && response.data.success) {
        setStudents(response.data.students);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSearchMounted.current) { isSearchMounted.current = true; return; }
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => fetchStudents(searchTerm), 300);
  }, [searchTerm]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handleViewProfile = (rollNo) => {
    navigate(`/student-profile/${rollNo}`);
  };

  const getStudentsByBranch = (branch) => students.filter(s => s.branch === branch);

  if (loading) {
    return (
      <div className="students-list-container">
        <div className="loading-container">
          <div className="spinner-wrapper">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
          <p className="loading-text">Loading students...</p>
        </div>
      </div>
    );
  }

  const totalStudents = students.length;

  return (
    <div className="students-list-container">
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark navbar-custom px-4">
        <h3 className="navbar-brand fw-bold mb-0">
          <i className="bi bi-people me-2"></i>
          Students Directory
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

      <div className="container py-4">
        {/* Search Bar */}
        <div className="search-header">
          <div className="search-box">
            <i className="bi bi-search search-icon"></i>
            <input
              type="text"
              className="search-input"
              placeholder="Search by name or roll number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="total-count">
            <i className="bi bi-people-fill me-2"></i>
            <strong>{totalStudents}</strong> {totalStudents === 1 ? 'Student' : 'Students'}
          </div>
        </div>

        {/* Students by Branch */}
        {branches.map((branch) => {
          const branchStudents = getStudentsByBranch(branch);

          if (branchStudents.length === 0) return null;

          return (
            <div key={branch} className="branch-section">
              <div className="branch-header">
                <div className="branch-title">
                  <i className="bi bi-building me-2"></i>
                  {branch}
                </div>
                <div className="branch-count">
                  {branchStudents.length} {branchStudents.length === 1 ? 'Student' : 'Students'}
                </div>
              </div>

              <div className="students-grid">
                {branchStudents.map((student, index) => (
                  <div
                    key={student.rollNo}
                    className="student-card-compact"
                    onClick={() => handleViewProfile(student.rollNo)}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="student-avatar-compact">
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="student-info-compact">
                      <div className="student-name-compact">{student.name}</div>
                      <div className="student-roll-compact">{student.rollNo}</div>
                    </div>
                    <i className="bi bi-chevron-right card-arrow"></i>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {totalStudents === 0 && (
          <div className="empty-state">
            <i className="bi bi-person-x"></i>
            <h5>No Students Found</h5>
            <p className="text-muted">
              {searchTerm
                ? "Try adjusting your search criteria"
                : "No students have registered yet"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentsList;
