import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "../theme.css"; // Global theme styles

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
import TestResultsView from "./TestResultsView";
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

        {/* Student Dashboard */}
        <Route path="/home" element={<Home />} />
        <Route path="/test-selection" element={<TestSelection />} />
        <Route path="/mock-test-setup" element={<MockTestSetup />} />
        <Route path="/mock-test-session" element={<MockTestSession />} />
        <Route path="/mock-test-result" element={<MockTestResult />} />
        <Route path="/pre-test-lobby" element={<PreTestLobby />} />
        <Route path="/mock-interview" element={<MockInterviewDashboard />} />
        <Route path="/start-test" element={<StartTestDashboard />} />

        {/* Mock Interview Routes */}
        <Route path="/start-mock-interview" element={<StartMockInterview />} />
        <Route path="/mock-session" element={<MockSession />} />

        {/* ✅ New Route for Interview Summary */}
        <Route path="/interview-summary" element={<InterviewSummary />} />

        {/* ✅ Teacher Dashboard Route */}
        <Route path="/teacher-dashboard" element={<TeacherDashboard />} />

        {/* ✅ Teacher Results View */}
        <Route path="/test-results-view" element={<TestResultsView />} />
        <Route path="/test-results/:testId" element={<TestSpecificResults />} />
        <Route path="/students-list" element={<StudentsList />} />
        <Route path="/student-profile/:rollNo" element={<StudentProfile />} />

        {/* ✅ Test Routes */}
        <Route path="/test/:testId" element={<TakeTest />} />
        <Route path="/test-result" element={<TestResultPage />} />

        <Route path="/interview-result/:id" element={< InterviewSummary/>} />

        {/* Question Module Routes */}
        <Route path="/question-mode" element={<QuestionModeSelection />} />
        <Route path="/branch-selection" element={<BranchSelection />} />
        <Route path="/company-list/:branch" element={<CompanyList />} />
        <Route path="/question-module/:branch/:company" element={<QuestionModule />} />
        <Route path="/view-questions/:branch/:company" element={<ViewQuestions />} />
        <Route path="/question-module" element={<QuestionModule />} />


      </Routes>
    </BrowserRouter>
  );
}

export default App;
