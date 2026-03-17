import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./StudentsList.css";

const LIMIT = 9;
const BRANCHES = ["Computer Engineering", "IT", "EXTC", "Electrical", "Mechanical"];


const mkInit = () =>
  Object.fromEntries(BRANCHES.map(b => [b, { list: [], page: 0, hasMore: true, loading: false }]));

const StudentsList = () => {
  const [teacherName, setTeacherName]   = useState("");
  const [branchData, setBranchData]     = useState(mkInit);
  const [searchTerm, setSearchTerm]     = useState("");
  const [pageLoading, setPageLoading]   = useState(true);

  const searchDebounce  = useRef(null);
  const isSearchMounted = useRef(false);
  const searchRef       = useRef("");
  const branchDataRef   = useRef(branchData);

  const navigate = useNavigate();

  // keep ref in sync so scroll handlers never see stale state
  useEffect(() => { branchDataRef.current = branchData; }, [branchData]);

  const fetchBranch = async (branch, page, search, append) => {
    setBranchData(prev => ({ ...prev, [branch]: { ...prev[branch], loading: true } }));
    try {
      const res = await axios.get(
        `http://localhost:5000/api/auth/students` +
        `?branch=${encodeURIComponent(branch)}` +
        `&search=${encodeURIComponent(search)}` +
        `&page=${page}&limit=${LIMIT}`
      );
      if (res.data?.success) {
        setBranchData(prev => {
          // For CE page-1 fresh fetch (no search), prepend dummy data
          const base = append ? prev[branch].list : [];
          return {
            ...prev,
            [branch]: {
              list: [...base, ...res.data.students],
              page,
              hasMore: res.data.hasMore,
              loading: false,
            },
          };
        });
      }
    } catch (err) {
      console.error(`Error fetching ${branch}:`, err);
      setBranchData(prev => ({ ...prev, [branch]: { ...prev[branch], loading: false } }));
    }
  };

  // initial load — all branches page 1 in parallel
  useEffect(() => {
    const name = localStorage.getItem("teacherName");
    if (!name) { navigate("/login"); return; }
    setTeacherName(name);
    (async () => {
      await Promise.allSettled(BRANCHES.map(b => fetchBranch(b, 1, "", false)));
      setPageLoading(false);
    })();
  }, [navigate]);

  // search debounce — reset all branches and re-fetch
  useEffect(() => {
    if (!isSearchMounted.current) { isSearchMounted.current = true; return; }
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      searchRef.current = searchTerm;
      setBranchData(mkInit());
      BRANCHES.forEach(b => fetchBranch(b, 1, searchTerm, false));
    }, 300);
  }, [searchTerm]);

  // scroll handler — load next page when near bottom
  const handleScroll = (branch) => (e) => {
    const el = e.currentTarget;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 50;
    const bd = branchDataRef.current[branch];
    if (nearBottom && bd.hasMore && !bd.loading) {
      fetchBranch(branch, bd.page + 1, searchRef.current, true);
    }
  };

  const handleLogout     = () => { localStorage.clear(); navigate("/login"); };
  const handleViewProfile = (rollNo) => navigate(`/student-profile/${rollNo}`);

  if (pageLoading) {
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

  const totalStudents = BRANCHES.reduce((sum, b) => sum + branchData[b].list.length, 0);
  const anyLoading    = BRANCHES.some(b => branchData[b].loading);

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
          <span className="fw-semibold text-white">{teacherName || "Teacher"}</span>
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
        {BRANCHES.map((branch) => {
          const bd = branchData[branch];
          if (bd.list.length === 0 && !bd.loading) return null;

          return (
            <div key={branch} className="branch-section">
              <div className="branch-header">
                <div className="branch-title">
                  <i className="bi bi-building me-2"></i>
                  {branch}
                </div>
                <div className="branch-count">
                  {bd.list.length} {bd.list.length === 1 ? 'Student' : 'Students'}
                </div>
              </div>

              <div className="students-grid" onScroll={handleScroll(branch)}>
                {bd.list.map((student, index) => (
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
                {bd.loading && (
                  <div className="branch-loading">
                    <div className="spinner-border spinner-border-sm" role="status" />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {totalStudents === 0 && !anyLoading && (
          <div className="empty-state">
            <i className="bi bi-person-x"></i>
            <h5>No Students Found</h5>
            <p className="text-muted">
              {searchTerm ? "Try adjusting your search criteria" : "No students have registered yet"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentsList;
