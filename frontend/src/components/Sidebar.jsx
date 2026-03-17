import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./Sidebar.css";

// Routes where the sidebar must NOT appear
const HIDDEN_ROUTES = [
  "/register", "/login", "/admin-login",
  "/mock-test-session", "/mock-session", "/pre-test-lobby",
];

const studentSections = () => [
  {
    title: "Overview",
    links: [
      { icon: "bi-house-fill",      label: "Home",           path: "/home" },
    ],
  },
  {
    title: "Tests",
    links: [
      { icon: "bi-journal-text",    label: "Academic Tests", path: "/start-test" },
      { icon: "bi-pencil-square",   label: "Mock Test",      path: "/test-selection" },
    ],
  },
  {
    title: "Preparation",
    links: [
      { icon: "bi-mic-fill",        label: "Mock Interview",   path: "/mock-interview" },
      { icon: "bi-file-earmark-person-fill", label: "Resume Analyser", path: "/resume-analyser" },
      { icon: "bi-book-half",       label: "Question Bank",    path: "/question-mode" },
    ],
  },
];

const teacherSections = [
  {
    title: "Management",
    links: [
      { icon: "bi-speedometer2",    label: "Dashboard",      path: "/teacher-dashboard" },
      { icon: "bi-people-fill",     label: "Students",       path: "/students-list" },
    ],
  },
];

const adminSections = [
  {
    title: "Admin",
    links: [
      { icon: "bi-shield-fill",  label: "Dashboard",     path: "/admin-dashboard" },
      { icon: "bi-book-half",    label: "Question Bank",  path: "/branch-selection?mode=manage" },
    ],
  },
];

const Sidebar = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [expanded, setExpanded] = useState(false);

  const studentName = localStorage.getItem("studentName") || "";
  const teacherName = localStorage.getItem("teacherName") || "";
  const adminName   = localStorage.getItem("adminName")   || "";
  const rollNo      = localStorage.getItem("rollNo")      || "";
  const role        = localStorage.getItem("role")        || "";

  const isAdminRole   = role === "admin";
  const isTeacherRole = role === "teacher";
  const name          = adminName || teacherName || studentName;

  const path = location.pathname;
  const shouldHide =
    HIDDEN_ROUTES.includes(path) ||
    path.startsWith("/test/") ||
    !name;

  useEffect(() => {
    if (!shouldHide) {
      document.body.classList.add("has-sidebar");
    } else {
      document.body.classList.remove("has-sidebar", "sb-expanded");
    }
    return () => document.body.classList.remove("has-sidebar", "sb-expanded");
  }, [shouldHide]);

  if (shouldHide) return null;

  let sections;
  let roleLabel;
  if (isAdminRole) {
    sections  = adminSections;
    roleLabel = "Admin";
  } else if (isTeacherRole) {
    sections  = teacherSections;
    roleLabel = "Teacher";
  } else {
    sections  = studentSections();
    roleLabel = "Student";
  }

  const isActive = (linkPath) => {
    const basePath = linkPath.split("?")[0];
    if (basePath === "/home") return location.pathname === "/home";
    if (basePath === "/admin-dashboard") return location.pathname === "/admin-dashboard";
    if (basePath.includes("/student-profile/")) return location.pathname.startsWith("/student-profile/");
    // Question Bank — active on any question-related page
    if (basePath === "/branch-selection") {
      return ["/branch-selection", "/company-list", "/view-questions"].some(
        (p) => location.pathname.startsWith(p)
      );
    }
    return location.pathname.startsWith(basePath);
  };

  const handleExpand = () => {
    setExpanded(true);
    document.body.classList.add("sb-expanded");
  };

  const handleCollapse = () => {
    setExpanded(false);
    document.body.classList.remove("sb-expanded");
  };

  return (
    <aside
      className={`sb-sidebar ${expanded ? "sb-open" : "sb-closed"}`}
      onMouseEnter={handleExpand}
      onMouseLeave={handleCollapse}
    >
      {/* Brand */}
      <div className="sb-brand">
        <div className="sb-logo-icon">
          <i className="bi bi-mortarboard-fill"></i>
        </div>
        <span className="sb-brand-name">EduPrep</span>
      </div>

      {/* User */}
      <div className="sb-user">
        <div className="sb-avatar">{name.charAt(0).toUpperCase()}</div>
        <div className="sb-user-info">
          <p className="sb-user-name">{name}</p>
          <p className="sb-user-role">{roleLabel}</p>
        </div>
      </div>

      <div className="sb-sep"></div>

      {/* Nav */}
      <nav className="sb-nav">
        {sections.map((sec) => (
          <div key={sec.title} className="sb-section">
            <span className="sb-sec-title">{sec.title}</span>
            {sec.links.map((link) => {
              const active = isActive(link.path);
              return (
                <button
                  key={link.label}
                  className={`sb-item ${active ? "sb-item--active" : ""}`}
                  onClick={() => navigate(link.path)}
                  title={!expanded ? link.label : undefined}
                >
                  <span className="sb-item-icon">
                    <i className={`bi ${link.icon}`}></i>
                  </span>
                  <span className="sb-item-label">{link.label}</span>
                  {active && <span className="sb-item-pip"></span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sb-chevron">
        <i className={`bi ${expanded ? "bi-chevron-double-left" : "bi-chevron-double-right"}`}></i>
      </div>
    </aside>
  );
};

export default Sidebar;
