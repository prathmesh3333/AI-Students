import { Navigate } from "react-router-dom";
import { isLoggedIn, isTeacher, isStudent, isAdmin } from "../utils/auth";

/**
 * Wraps any route that requires authentication.
 *
 * Props:
 *   adminOnly   – accessible only by admins
 *   teacherOnly – accessible only by teachers
 *   studentOnly – accessible only by students
 */
const ProtectedRoute = ({
  children,
  adminOnly   = false,
  teacherOnly = false,
  studentOnly = false,
}) => {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin()) {
    if (isTeacher()) return <Navigate to="/teacher-dashboard" replace />;
    if (isStudent()) return <Navigate to="/home" replace />;
    return <Navigate to="/login" replace />;
  }

  if (teacherOnly && !isTeacher()) {
    if (isAdmin()) return <Navigate to="/admin-dashboard" replace />;
    return <Navigate to="/home" replace />;
  }

  if (studentOnly && !isStudent()) {
    if (isAdmin())   return <Navigate to="/admin-dashboard" replace />;
    if (isTeacher()) return <Navigate to="/teacher-dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
