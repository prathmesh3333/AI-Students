import { Navigate } from "react-router-dom";
import { isLoggedIn, isTeacher, isStudent } from "../utils/auth";

/**
 * Wraps any route that requires authentication.
 *
 * Props:
 *   teacherOnly  – redirect non-teachers to /home
 *   studentOnly  – redirect non-students to /teacher-dashboard
 */
const ProtectedRoute = ({ children, teacherOnly = false, studentOnly = false }) => {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  if (teacherOnly && !isTeacher()) {
    return <Navigate to="/home" replace />;
  }

  if (studentOnly && !isStudent()) {
    return <Navigate to="/teacher-dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
