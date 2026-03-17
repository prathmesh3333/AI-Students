import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./ViewQuestions.css";

const ViewQuestions = () => {
  const { branch, company } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "view";
  const isAdmin = localStorage.getItem("role") === "admin";
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedRole, setSelectedRole] = useState("all");
  const [deletingId, setDeletingId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null); // { id, text }

  useEffect(() => {
    fetchQuestions();
  }, [branch, company]);

  const fetchQuestions = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/question/view/${encodeURIComponent(branch)}/${encodeURIComponent(company)}`
      );
      const qs = res.data.questions || [];
      setQuestions(qs);
      // auto-select latest year
      if (qs.length > 0) {
        const years = [...new Set(qs.map((q) => q.year || "Unknown"))].sort(
          (a, b) => b.localeCompare(a)
        );
        setSelectedYear(years[0]);
      }
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (q) => setConfirmTarget({ id: q._id, text: q.questionText || q.question });

  const deleteQuestion = async () => {
    const id = confirmTarget.id;
    setConfirmTarget(null);
    setDeletingId(id);
    try {
      await axios.delete(`http://localhost:5000/api/question/${id}`);
      setQuestions((prev) => prev.filter((q) => q._id !== id));
    } catch {
      // silently ignore — row stays
    } finally {
      setDeletingId(null);
    }
  };

  const displayCompany =
    company ? company.charAt(0).toUpperCase() + company.slice(1) : "";
  const initials = company ? company.slice(0, 2).toUpperCase() : "?";

  // Derived data
  const years = [...new Set(questions.map((q) => q.year || "Unknown"))].sort(
    (a, b) => b.localeCompare(a)
  );
  const allRoles = [
    ...new Set(questions.map((q) => q.position).filter(Boolean)),
  ].sort();

  const filteredByYear = selectedYear
    ? questions.filter((q) => (q.year || "Unknown") === selectedYear)
    : questions;

  const filtered =
    selectedRole === "all"
      ? filteredByYear
      : filteredByYear.filter((q) => q.position === selectedRole);

  if (loading) {
    return (
      <div className="vq-loading">
        <div className="vq-spinner"></div>
        <p>Loading questions...</p>
      </div>
    );
  }

  return (
    <div className="vq-shell">
      {/* ── Top bar ── */}
      <header className="vq-topbar">
        <button
          className="vq-back"
          onClick={() =>
            navigate(`/company-list/${encodeURIComponent(branch)}?mode=${mode}`)
          }
        >
          <i className="bi bi-arrow-left"></i> Back
        </button>

        <div className="vq-topbar-center">
          <div className="vq-logo">{initials}</div>
          <div>
            <span className="vq-cname">{displayCompany}</span>
            <span className="vq-branch-pill">
              <i className="bi bi-diagram-3"></i> {branch}
            </span>
          </div>
        </div>

        <div className="vq-topbar-stats">
          <div className="vq-tstat">
            <span className="vq-tstat-val">{questions.length}</span>
            <span className="vq-tstat-lbl">Questions</span>
          </div>
          <div className="vq-tstat-sep"></div>
          <div className="vq-tstat">
            <span className="vq-tstat-val">{years.length}</span>
            <span className="vq-tstat-lbl">Years</span>
          </div>
          <div className="vq-tstat-sep"></div>
          <div className="vq-tstat">
            <span className="vq-tstat-val">{allRoles.length}</span>
            <span className="vq-tstat-lbl">Roles</span>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      {questions.length === 0 ? (
        <div className="vq-empty">
          <div className="vq-empty-icon">
            <i className="bi bi-inbox"></i>
          </div>
          <h2>No Questions Yet</h2>
          <p>
            {isAdmin
              ? `No questions found for ${displayCompany} — ${branch}`
              : `Be the first to contribute for ${displayCompany} — ${branch}`
            }
          </p>
          {!isAdmin && (
            <button
              className="vq-add-btn"
              onClick={() =>
                navigate(
                  `/question-module/${encodeURIComponent(branch)}/${encodeURIComponent(company)}`
                )
              }
            >
              <i className="bi bi-plus-lg"></i> Add Questions
            </button>
          )}
        </div>
      ) : (
        <div className="vq-body">
          {/* ── Left: year + role filter ── */}
          <aside className="vq-sidebar">
            <div className="vq-sidebar-section">
              <p className="vq-sidebar-label">
                <i className="bi bi-calendar3"></i> Year
              </p>
              {years.map((yr) => {
                const count = questions.filter(
                  (q) => (q.year || "Unknown") === yr
                ).length;
                return (
                  <button
                    key={yr}
                    className={`vq-filter-btn ${
                      selectedYear === yr ? "vq-filter-btn--active" : ""
                    }`}
                    onClick={() => {
                      setSelectedYear(yr);
                      setSelectedRole("all");
                    }}
                  >
                    <span>{yr}</span>
                    <span className="vq-filter-count">{count}</span>
                  </button>
                );
              })}
            </div>

            {allRoles.length > 0 && (
              <div className="vq-sidebar-section">
                <p className="vq-sidebar-label">
                  <i className="bi bi-briefcase"></i> Role
                </p>
                <button
                  className={`vq-filter-btn ${
                    selectedRole === "all" ? "vq-filter-btn--role-active" : ""
                  }`}
                  onClick={() => setSelectedRole("all")}
                >
                  <span>All Roles</span>
                  <span className="vq-filter-count">
                    {filteredByYear.length}
                  </span>
                </button>
                {allRoles
                  .filter((role) =>
                    filteredByYear.some((q) => q.position === role)
                  )
                  .map((role) => {
                    const count = filteredByYear.filter(
                      (q) => q.position === role
                    ).length;
                    return (
                      <button
                        key={role}
                        className={`vq-filter-btn ${
                          selectedRole === role
                            ? "vq-filter-btn--role-active"
                            : ""
                        }`}
                        onClick={() => setSelectedRole(role)}
                      >
                        <span className="vq-filter-role-text">{role}</span>
                        <span className="vq-filter-count">{count}</span>
                      </button>
                    );
                  })}
              </div>
            )}
          </aside>

          {/* ── Right: question table ── */}
          <div className="vq-main">
            <div className={`vq-table-head ${isAdmin ? "vq-table-head--admin" : ""}`}>
              <div className="vq-th vq-th--num">#</div>
              <div className="vq-th vq-th--role">Role</div>
              <div className="vq-th vq-th--q">Question</div>
              {isAdmin && <div className="vq-th vq-th--action"></div>}
            </div>

            <div className="vq-table-body">
              {filtered.length === 0 ? (
                <div className="vq-no-results">
                  <i className="bi bi-funnel"></i>
                  <p>No questions match this filter</p>
                </div>
              ) : (
                filtered.map((q, i) => (
                  <div key={q._id || i} className={`vq-row ${isAdmin ? "vq-row--admin" : ""}`}>
                    <div className="vq-td vq-td--num">
                      <span className="vq-num-badge">{i + 1}</span>
                    </div>
                    <div className="vq-td vq-td--role">
                      <span className="vq-role-pill">
                        {q.position || "—"}
                      </span>
                    </div>
                    <div className="vq-td vq-td--q">
                      <p className="vq-question-text">
                        {q.questionText || q.question}
                      </p>
                    </div>
                    {isAdmin && (
                      <div className="vq-td vq-td--action">
                        <button
                          className="vq-delete-btn"
                          onClick={() => confirmDelete(q)}
                          disabled={deletingId === q._id}
                          title="Delete question"
                        >
                          {deletingId === q._id
                            ? <i className="bi bi-hourglass-split"></i>
                            : <i className="bi bi-trash3"></i>
                          }
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="vq-table-footer">
              Showing {filtered.length} of {questions.length} questions
              {selectedYear && ` · ${selectedYear}`}
              {selectedRole !== "all" && ` · ${selectedRole}`}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      {confirmTarget && (
        <div className="vq-confirm-overlay" onClick={() => setConfirmTarget(null)}>
          <div className="vq-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vq-confirm-icon">
              <i className="bi bi-trash3"></i>
            </div>
            <h3 className="vq-confirm-title">Delete Question?</h3>
            <p className="vq-confirm-text">
              {confirmTarget.text.length > 120
                ? confirmTarget.text.slice(0, 120) + "…"
                : confirmTarget.text}
            </p>
            <p className="vq-confirm-warn">This action cannot be undone.</p>
            <div className="vq-confirm-actions">
              <button className="vq-confirm-cancel" onClick={() => setConfirmTarget(null)}>
                Cancel
              </button>
              <button className="vq-confirm-delete" onClick={deleteQuestion}>
                <i className="bi bi-trash3"></i> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewQuestions;
