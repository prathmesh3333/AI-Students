// ── Storage helpers ──────────────────────────────────────────

export const setStudentAuth = (token, user) => {
  localStorage.setItem("token", token);
  localStorage.setItem("role", "student");
  localStorage.setItem("rollNo", user.rollNo);
  localStorage.setItem("studentName", user.name);
  localStorage.setItem("studentBranch", user.branch);
};

export const setTeacherAuth = (token, teacher) => {
  localStorage.setItem("token", token);
  localStorage.setItem("role", "teacher");
  localStorage.setItem("teacherEmail", teacher.email);
  localStorage.setItem("teacherName", teacher.name);
};

export const setAdminAuth = (token, admin) => {
  localStorage.setItem("token", token);
  localStorage.setItem("role", "admin");
  localStorage.setItem("adminName", admin.name);
  localStorage.setItem("adminEmail", admin.email);
};

export const logout = () => {
  localStorage.clear();
};

// ── Reads ─────────────────────────────────────────────────────

export const getToken = () => localStorage.getItem("token");
export const getRole  = () => localStorage.getItem("role");

export const isLoggedIn = () => !!localStorage.getItem("token");
export const isTeacher  = () => localStorage.getItem("role") === "teacher";
export const isStudent  = () => localStorage.getItem("role") === "student";
export const isAdmin    = () => localStorage.getItem("role") === "admin";
