import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "../theme.css"; // Global theme styles
import ProtectedRoute from "./ProtectedRoute";

// Existing imports
import Home from "./Home";
import Login from "./Login";
import Register from "./Register";
import MockInterviewDashboard from "./MockInterviewDashboard";
import StartTestDashboard from "./StartTestDashboard";
import TestSelection from "./TestSelection";
import MockTestSetup from "./MockTestSetup";
import MockTestSession from "./MockTestSession";
import MockTestResult from "./MockTestResult";
import PreTestLobby from "./PreTestLobby";
import Sidebar from "./Sidebar";
import StartMockInterview from "./StartMockInterview";
import MockSession from "./MockSession";
import QuestionModule from "./QuestionModule";
import BranchSelection from "./BranchSelection";
import CompanyList from "./CompanyList";
import QuestionModeSelection from "./QuestionModeSelection";
import ViewQuestions from "./ViewQuestions";



// ✅ New import for the Interview Summary page
import InterviewSummary from "./InterviewSummary";

// ✅ Teacher Dashboard import
import TeacherDashboard from "./TeacherDashboard";

// ✅ Test-related imports
import TakeTest from "./TakeTest";
import TestResultPage from "./TestResultPage";
import TestSpecificResults from "./TestSpecificResults";
import StudentProfile from "./StudentProfile";
import StudentsList from "./StudentsList";

function App() {
  return (
    <BrowserRouter>
      <Sidebar />
      <Routes>
        {/* Redirect root to /register */}
        <Route path="/" element={<Navigate to="/register" />} />

        {/* Auth Pages */}
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        {/* ── Student-only routes ─────────────────────────────────── */}
        <Route path="/home" element={<ProtectedRoute studentOnly><Home /></ProtectedRoute>} />
        <Route path="/test-selection" element={<ProtectedRoute studentOnly><TestSelection /></ProtectedRoute>} />
        <Route path="/mock-test-setup" element={<ProtectedRoute studentOnly><MockTestSetup /></ProtectedRoute>} />
        <Route path="/mock-test-session" element={<ProtectedRoute studentOnly><MockTestSession /></ProtectedRoute>} />
        <Route path="/mock-test-result" element={<ProtectedRoute studentOnly><MockTestResult /></ProtectedRoute>} />
        <Route path="/pre-test-lobby" element={<ProtectedRoute studentOnly><PreTestLobby /></ProtectedRoute>} />
        <Route path="/mock-interview" element={<ProtectedRoute studentOnly><MockInterviewDashboard /></ProtectedRoute>} />
        <Route path="/start-test" element={<ProtectedRoute studentOnly><StartTestDashboard /></ProtectedRoute>} />
        <Route path="/start-mock-interview" element={<ProtectedRoute studentOnly><StartMockInterview /></ProtectedRoute>} />
        <Route path="/mock-session" element={<ProtectedRoute studentOnly><MockSession /></ProtectedRoute>} />
        <Route path="/interview-summary" element={<ProtectedRoute studentOnly><InterviewSummary /></ProtectedRoute>} />
        <Route path="/interview-result/:id" element={<ProtectedRoute studentOnly><InterviewSummary /></ProtectedRoute>} />
        <Route path="/test/:testId" element={<ProtectedRoute studentOnly><TakeTest /></ProtectedRoute>} />
        <Route path="/test-result" element={<ProtectedRoute studentOnly><TestResultPage /></ProtectedRoute>} />
        <Route path="/question-mode" element={<ProtectedRoute studentOnly><QuestionModeSelection /></ProtectedRoute>} />
        <Route path="/branch-selection" element={<ProtectedRoute studentOnly><BranchSelection /></ProtectedRoute>} />
        <Route path="/company-list/:branch" element={<ProtectedRoute studentOnly><CompanyList /></ProtectedRoute>} />
        <Route path="/question-module/:branch/:company" element={<ProtectedRoute studentOnly><QuestionModule /></ProtectedRoute>} />
        <Route path="/view-questions/:branch/:company" element={<ProtectedRoute studentOnly><ViewQuestions /></ProtectedRoute>} />
        <Route path="/question-module" element={<ProtectedRoute studentOnly><QuestionModule /></ProtectedRoute>} />

        {/* ── Teacher-only routes ─────────────────────────────────── */}
        <Route path="/teacher-dashboard" element={<ProtectedRoute teacherOnly><TeacherDashboard /></ProtectedRoute>} />
        <Route path="/test-results/:testId" element={<ProtectedRoute teacherOnly><TestSpecificResults /></ProtectedRoute>} />
        <Route path="/students-list" element={<ProtectedRoute teacherOnly><StudentsList /></ProtectedRoute>} />
        <Route path="/student-profile/:rollNo" element={<ProtectedRoute><StudentProfile /></ProtectedRoute>} />


      </Routes>
    </BrowserRouter>
  );
}

export default App;
