import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./TeacherDashboard.css";
import Toast from "./Toast";
import ConfirmModal from "./ConfirmModal";
import DeadlinePicker from "./DeadlinePicker";

const TeacherDashboard = () => {
  const [teacherName, setTeacherName] = useState("");
  const [tests, setTests] = useState([]);
  const [showCreateTestModal, setShowCreateTestModal] = useState(false);
  const [creatingTest, setCreatingTest] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Toast and Modal states
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  // Test creation state
  const [testDetails, setTestDetails] = useState({
    title: "",
    description: "",
    subject: "",
    totalQuestions: 1,
    timeLimit: 30,
    branches: [],
    deadline: ""
  });

  const [currentTest, setCurrentTest] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionsList, setQuestionsList] = useState([]);
  const [questionImage, setQuestionImage] = useState(null);

  // Question form state
  const [questionForm, setQuestionForm] = useState({
    question: "",
    options: ["", "", "", ""],
    correctAnswer: 0
  });

  const navigate = useNavigate();

  // PDF-based test creation
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [pdfDetails, setPdfDetails] = useState({
    title: "", description: "", subject: "", totalQuestions: 5, timeLimit: 30, branches: [], deadline: ""
  });
  const [pdfBranchDropdown, setPdfBranchDropdown] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfStep, setPdfStep] = useState(null); // null | 'form' | 'generating' | 'select'
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [selectedQSet, setSelectedQSet] = useState(new Set());

  const subjects = [
    "JavaScript Fundamentals",
    "React Basics",
    "Data Structures",
    "Algorithms",
    "Behavioral Test"
  ];

  const branches = [
    "Computer Engineering",
    "IT",
    "EXTC",
    "Electrical",
    "Mechanical"
  ];

  useEffect(() => {
    const name = localStorage.getItem("teacherName");
    if (!name) {
      navigate("/login");
    } else {
      setTeacherName(name);
      fetchTests();
    }
  }, [navigate]);

  const fetchTests = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/test/all");
      if (response.data.success) {
        setTests(response.data.tests);
      }
    } catch (error) {
      console.error("Error fetching tests:", error);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handleTestDetailsSubmit = (e) => {
    e.preventDefault();

    // if (!testDetails.title || !testDetails.subject || !testDetails.branch || testDetails.totalQuestions < 1 || testDetails.timeLimit < 1) {
    //   setToast({ message: "Please fill in all required fields. Total questions and time limit must be at least 1.", type: "error" });
    //   return;
    // }
    if (!testDetails.title ||!testDetails.subject ||testDetails.branches.length === 0 ||testDetails.totalQuestions < 1 ||testDetails.timeLimit < 1) {
  setToast({
    message: "Please fill all fields and select at least one branch",
    type: "error"
  });
  return;
}

    // Start test creation flow
    setCreatingTest(true);
    setShowCreateTestModal(false);
    setCurrentQuestionIndex(0);
    setQuestionsList([]);
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...questionForm.options];
    newOptions[index] = value;
    setQuestionForm({ ...questionForm, options: newOptions });
  };

  const handleAddQuestion = (e) => {
    e.preventDefault();

    if (!questionForm.question.trim()) {
      setToast({ message: "Please enter the question", type: "warning" });
      return;
    }

    if (questionForm.options.some(opt => !opt.trim())) {
      setToast({ message: "Please fill in all 4 options", type: "warning" });
      return;
    }

    // Add question to list
    // const newQuestion = {
    //   question: questionForm.question,
    //   options: questionForm.options,
    //   correctAnswer: questionForm.correctAnswer
    // };
const newQuestion = {
  questionText: questionForm.question,
  options: questionForm.options,
  correctAnswer: questionForm.correctAnswer,
  image: questionImage
};

setQuestionImage(null);

    const updatedList = [...questionsList, newQuestion];
    setQuestionsList(updatedList);

    // Reset form
    setQuestionForm({
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0
    });

    // Move to next question or finish
    if (currentQuestionIndex + 1 < testDetails.totalQuestions) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // All questions added, ready to publish
      setCurrentTest({
        ...testDetails,
        questions: updatedList
      });
    }
  };

  // const handlePublishTest = async () => {
  //   if (!currentTest) return;

  //   try {
  //     const testData = {
  //       ...currentTest,
  //       questions: questionsList
  //     };
  //     console.log("Publishing test with data:", testData);

  //     const response = await axios.post("http://localhost:5000/api/test/create", testData);

  //     if (response.data.success) {
  //       const testId = response.data.test._id;

  //       // Publish the test
  //       const publishResponse = await axibranch: "os.put(`http://localhost:5000/api/test/publish/${testId}`);

  //       if (publishResponse.data.success) {
  //         setToast({ message: "Test published successfully to students!", type: "success" });

  //         // Reset everything
  //         setCreatingTest(false);
  //         setCurrentTest(null);
  //         setQuestionsList([]);
  //         setCurrentQuestionIndex(0);
  //         setTestDetails({
  //           title: "",
  //           description: "",
  //           subject: "",
  //           totalQuestions: 1,
  //           timeLimit: 30,
  //           branch: ""
  //         });

  //         // Refresh tests list
  //         fetchTests();
  //       }
  //     }
  //   } catch (error) {
  //     console.error("Error publishing test:", error);
  //     console.error("Error response:", error.response?.data);
  //     const errorMessage = error.response?.data?.error || "Failed to publish test. Please try again.";
  //     setToast({ message: errorMessage, type: "error" });
  //   }
  // };
const handlePublishTest = async () => {
  try {
    const formData = new FormData();

    // Test details
    formData.append("title", testDetails.title);
    formData.append("description", testDetails.description);
    formData.append("subject", testDetails.subject);
    formData.append("totalQuestions", testDetails.totalQuestions);
    formData.append("timeLimit", testDetails.timeLimit);
    // formData.append("branch", testDetails.branch);
    formData.append("branches", JSON.stringify(testDetails.branches));
    if (testDetails.deadline) formData.append("deadline", testDetails.deadline);

    // Questions without images
    const questionsForBackend = questionsList.map((q) => ({
      questionText: q.questionText,
      options: q.options,
      correctAnswer: q.correctAnswer
    }));

    formData.append("questions", JSON.stringify(questionsForBackend));

    // Images (order matters)
    questionsList.forEach((q) => {
      if (q.image) {
        formData.append("images", q.image);
      }
    });

    const response = await axios.post(
      "http://localhost:5000/api/test/create",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );

    if (response.data.success) {
      const testId = response.data.test._id;

      await axios.put(`http://localhost:5000/api/test/publish/${testId}`);

      setToast({ message: "Test published successfully!", type: "success" });

      // Reset
      setCreatingTest(false);
      setQuestionsList([]);
      setCurrentQuestionIndex(0);
      setCurrentTest(null);

      setTestDetails({
        title: "",
        description: "",
        subject: "",
        totalQuestions: 1,
        timeLimit: 10,
        branches: [],
        deadline: ""
      });

      fetchTests();
    }
  } catch (error) {
    console.error("Publish error:", error);
    setToast({ message: "Failed to publish test", type: "error" });
  }
};

  const handleDeleteTest = (id) => {
    setConfirmModal({
      message: "Are you sure you want to delete this test? This action cannot be undone.",
      onConfirm: async () => {
        try {
          const response = await axios.delete(`http://localhost:5000/api/test/${id}`);
          if (response.data.success) {
            setToast({ message: "Test deleted successfully!", type: "success" });
            fetchTests();
          }
        } catch (error) {
          console.error("Error deleting test:", error);
          setToast({ message: "Failed to delete test", type: "error" });
        }
        setConfirmModal(null);
      },
      onCancel: () => setConfirmModal(null),
      type: "danger",
      confirmText: "Delete"
    });
  };

  const cancelTestCreation = () => {
    setConfirmModal({
      message: "Are you sure you want to cancel? All progress will be lost.",
      onConfirm: () => {
        setCreatingTest(false);
        setCurrentTest(null);
        setQuestionsList([]);
        setCurrentQuestionIndex(0);
        setTestDetails({
          title: "",
          description: "",
          subject: "",
          totalQuestions: 1,
          timeLimit: 30,
          branches: [],
          deadline: ""
        });
        setQuestionForm({
          question: "",
          options: ["", "", "", ""],
          correctAnswer: 0
        });
        setConfirmModal(null);
      },
      onCancel: () => setConfirmModal(null),
      type: "warning",
      confirmText: "Yes, Cancel"
    });
  };

  // ── PDF flow handlers ─────────────────────────────────────────
  const resetPdfFlow = () => {
    setPdfStep(null);
    setPdfFile(null);
    setGeneratedQuestions([]);
    setSelectedQSet(new Set());
    setPdfDetails({ title: "", description: "", subject: "", totalQuestions: 5, timeLimit: 30, branches: [], deadline: "" });
    setPdfBranchDropdown(false);
  };

  const handlePdfFormSubmit = async (e) => {
    e.preventDefault();
    if (!pdfFile) { setToast({ message: "Please upload a PDF file", type: "warning" }); return; }
    if (pdfDetails.branches.length === 0) { setToast({ message: "Please select at least one branch", type: "warning" }); return; }

    setPdfStep("generating");
    try {
      const fd = new FormData();
      fd.append("pdf", pdfFile);
      fd.append("subject", pdfDetails.subject);
      fd.append("numQuestions", pdfDetails.totalQuestions);
      const res = await axios.post("http://localhost:5000/api/test/generate-from-pdf", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.success) {
        setGeneratedQuestions(res.data.questions);
        setSelectedQSet(new Set());
        setPdfStep("select");
      }
    } catch (err) {
      setToast({ message: err.response?.data?.error || "Failed to generate questions", type: "error" });
      setPdfStep("form");
    }
  };

  const toggleQuestion = (index) => {
    setSelectedQSet((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else if (next.size < pdfDetails.totalQuestions) next.add(index);
      return next;
    });
  };

  const handlePublishPdfTest = async () => {
    if (selectedQSet.size !== pdfDetails.totalQuestions) {
      setToast({ message: `Please select exactly ${pdfDetails.totalQuestions} questions`, type: "warning" });
      return;
    }
    try {
      const selectedQuestions = [...selectedQSet].map((idx) => {
        const q = generatedQuestions[idx];
        const correctIndex = ["A", "B", "C", "D"].indexOf(q.correct);
        return {
          questionText: q.question,
          options: q.options.map((opt) => opt.replace(/^[A-D]\.\s*/, "")),
          correctAnswer: correctIndex,
        };
      });

      const fd = new FormData();
      fd.append("title", pdfDetails.title);
      fd.append("description", pdfDetails.description);
      fd.append("subject", pdfDetails.subject);
      fd.append("totalQuestions", pdfDetails.totalQuestions);
      fd.append("timeLimit", pdfDetails.timeLimit);
      fd.append("branches", JSON.stringify(pdfDetails.branches));
      if (pdfDetails.deadline) fd.append("deadline", pdfDetails.deadline);
      fd.append("questions", JSON.stringify(selectedQuestions));

      const res = await axios.post("http://localhost:5000/api/test/create", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.success) {
        await axios.put(`http://localhost:5000/api/test/publish/${res.data.test._id}`);
        setToast({ message: "PDF-based test published successfully!", type: "success" });
        resetPdfFlow();
        fetchTests();
      }
    } catch (err) {
      setToast({ message: "Failed to publish test", type: "error" });
    }
  };

  // Check if all questions are added
  const allQuestionsAdded = questionsList.length === testDetails.totalQuestions && testDetails.totalQuestions > 0;
  const filteredTests = tests.filter((test) =>
  test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
  test.subject.toLowerCase().includes(searchTerm.toLowerCase())
);

  return (
    <div className="teacher-dashboard-wrapper">
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark navbar-custom px-4">
        <h3 className="navbar-brand fw-bold mb-0">
          <i className="bi bi-mortarboard-fill me-2"></i>
          Teacher Dashboard
        </h3>
        <div className="ms-auto d-flex align-items-center gap-3">
          <button
            onClick={() => navigate("/students-list")}
            className="btn btn-light btn-sm fw-semibold"
          >
            <i className="bi bi-people me-1"></i> View Students
          </button>
          <span className="fw-semibold text-white">
            Welcome, {teacherName || "Teacher"}
          </span>
          <button onClick={handleLogout} className="btn btn-outline-light btn-sm">
            <i className="bi bi-box-arrow-right me-1"></i> Logout
          </button>
        </div>
      </nav>

      <div className="container py-5">
        {/* Main Action - Create New Test */}
        {!creatingTest && (
          <>
            <div className="row mb-4">
              <div className="col-12 text-center">
                <button
                  className="btn btn-primary btn-lg"
                  onClick={() => setShowMethodModal(true)}
                >
                  <i className="bi bi-plus-circle me-2"></i>
                  Create New Test
                </button>
              </div>
            </div>

            {/* Existing Tests List */}
            <div className="row">
              <div className="col-12">
                <div className="card shadow-sm p-4">
                  <div className="mb-3">
  <input
    type="text"
    className="form-control"
    placeholder="Search by title or subject..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
  />
</div>

                  <h4 className="mb-3">
                    <i className="bi bi-list-check me-2"></i>
                    Published Tests
                    <span className="badge bg-primary ms-2">{tests.length}</span>
                  </h4>

                  {tests.length === 0 ? (
                    <p className="text-muted text-center py-4">
                      <i className="bi bi-inbox me-2"></i>
                      No tests created yet. Click "Create New Test" to get started.
                    </p>
                  ) : (
                    <div className="test-list">
                      {filteredTests.map((test) => (
                        <div key={test._id} className="test-item">
                          <div className="test-header">
                            <div>
                              <h5 className="mb-1">{test.title}</h5>
                              <p className="text-muted mb-0">{test.description}</p>
                            </div>
                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => navigate(`/test-results/${test._id}`)}
                              >
                                <i className="bi bi-bar-chart-fill me-1"></i>
                                View Results
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDeleteTest(test._id)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </div>
                          <div className="test-meta">
                            <span className="badge bg-info">{test.subject}</span>
<span className="badge bg-dark">
  <i className="bi bi-building me-1"></i>
  {Array.isArray(test.branches)
    ? test.branches.join(", ")
    : test.branch}
</span>

                            <span className="badge bg-secondary">{test.totalQuestions} Questions</span>
                            <span className="badge bg-primary">
                              <i className="bi bi-clock me-1"></i>
                              {test.timeLimit} mins
                            </span>
                            <span className={`badge ${test.isPublished ? 'bg-success' : 'bg-warning'}`}>
                              {test.isPublished ? 'Published' : 'Draft'}
                            </span>
                            {test.deadline && (
                              <span className="badge bg-warning text-dark">
                                <i className="bi bi-calendar-event me-1"></i>
                                Due: {new Date(test.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
        {/* Test Creation Flow */}
        {creatingTest && (
          <div className="test-creation-container">
            {/* Progress Header */}
            <div className="card shadow-sm p-4 mb-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="mb-1">Creating: {testDetails.title}</h4>
                  <p className="text-muted mb-0">{testDetails.subject}</p>
                </div>
                <div className="text-end">
                  <div className="progress-text">
                    Question {Math.min(currentQuestionIndex + 1, testDetails.totalQuestions)} of {testDetails.totalQuestions}
                  </div>
                  <div className="progress mt-2" style={{width: '200px', height: '8px'}}>
                    <div
                      className="progress-bar"
                      style={{width: `${(questionsList.length / testDetails.totalQuestions) * 100}%`}}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Question Form or Publish Button */}
            {!allQuestionsAdded ? (
              <div className="card shadow-sm p-4">
                <h5 className="mb-3">
                  <i className="bi bi-pencil-square me-2"></i>
                  Add Question {currentQuestionIndex + 1}
                </h5>

                <form onSubmit={handleAddQuestion}>
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label fw-semibold">Question *</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={questionForm.question}
                        onChange={(e) => setQuestionForm({...questionForm, question: e.target.value})}
                        placeholder="Enter the question..."
                        required
                      />
                      <label className="form-label fw-semibold mt-3">
  Upload Question Image (Optional)
</label>

<input
  type="file"
  accept="image/*"
  className="form-control"
  onChange={(e) => setQuestionImage(e.target.files[0])}
/>

{questionImage && (
  <img
    src={URL.createObjectURL(questionImage)}
    alt="Question Preview"
    style={{
      maxWidth: "100%",
      marginTop: "10px",
      borderRadius: "8px",
      border: "1px solid #ccc"
    }}
  />
)}

                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Options *</label>
                      {questionForm.options.map((option, index) => (
                        <div key={index} className="mb-2">
                          <div className="input-group">
                            <span className="input-group-text">
                              <input
                                type="radio"
                                checked={questionForm.correctAnswer === index}
                                onChange={() => setQuestionForm({...questionForm, correctAnswer: index})}
                                className="form-check-input mt-0"
                              />
                            </span>
                            <input
                              type="text"
                              className="form-control"
                              value={option}
                              onChange={(e) => handleOptionChange(index, e.target.value)}
                              placeholder={`Option ${index + 1}`}
                              required
                            />
                          </div>
                        </div>
                      ))}
                      <small className="text-muted">
                        <i className="bi bi-info-circle me-1"></i>
                        Select the radio button to mark the correct answer
                      </small>
                    </div>

                    <div className="col-12">
                      <div className="d-flex gap-2">
                        <button type="submit" className="btn btn-success">
                          <i className="bi bi-plus-circle me-2"></i>
                          Add Question ({questionsList.length + 1}/{testDetails.totalQuestions})
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={cancelTestCreation}>
                          <i className="bi bi-x-circle me-2"></i>
                          Cancel Test Creation
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              <div className="card shadow-sm p-4 text-center">
                <h4 className="mb-3 text-success">
                  <i className="bi bi-check-circle me-2"></i>
                  All Questions Added!
                </h4>
                <p className="mb-4">You've added all {testDetails.totalQuestions} questions. Ready to publish?</p>
                <div className="d-flex gap-2 justify-content-center">
                  <button className="btn btn-success btn-lg" onClick={handlePublishTest}>
                    <i className="bi bi-send me-2"></i>
                    Send Test to Students
                  </button>
                  <button className="btn btn-secondary" onClick={cancelTestCreation}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Questions Added List */}
            {questionsList.length > 0 && (
              <div className="card shadow-sm p-4 mt-4">
                <h5 className="mb-3">
                  <i className="bi bi-list-ul me-2"></i>
                  Questions Added ({questionsList.length})
                </h5>
                <div className="added-questions-list">
                  {questionsList.map((q, index) => (
                    <div key={index} className="added-question-item">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <span className="question-number">Q{index + 1}</span>
                          <p className="question-text mt-2">{q.question}</p>
                        </div>
                        <i className="bi bi-check-circle-fill text-success fs-4"></i>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Method Selection Modal ─────────────────────────────── */}
      {showMethodModal && (
        <div className="modal-overlay" onClick={() => setShowMethodModal(false)}>
          <div className="modal-content method-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header d-flex justify-content-between align-items-center">
              <h5 className="modal-title mb-0">
                <i className="bi bi-file-earmark-plus me-2"></i>Create New Test
              </h5>
              <button className="btn-close" onClick={() => setShowMethodModal(false)}></button>
            </div>
            <div className="modal-body">
              <p className="text-center text-muted mb-4">Choose how you want to create the test</p>
              <div className="row g-4">
                <div className="col-md-6">
                  <div className="method-card" onClick={() => { setShowMethodModal(false); setShowCreateTestModal(true); }}>
                    <div className="method-icon method-icon-manual">
                      <i className="bi bi-pencil-square"></i>
                    </div>
                    <h5 className="mt-3 mb-2">Create Manually</h5>
                    <p className="text-muted small mb-3">Type each question and its options one by one with full control</p>
                    <ul className="method-features small text-muted text-start">
                      <li>Full control over each question</li>
                      <li>Add images to questions</li>
                      <li>Customize every detail</li>
                    </ul>
                    <div className="method-action">Get Started →</div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="method-card method-card-pdf" onClick={() => { setShowMethodModal(false); setPdfStep("form"); }}>
                    <div className="method-icon method-icon-pdf">
                      <i className="bi bi-file-earmark-pdf-fill"></i>
                    </div>
                    <h5 className="mt-3 mb-2">Generate from PDF</h5>
                    <p className="text-muted small mb-3">Upload study material and let AI generate questions automatically</p>
                    <ul className="method-features small text-muted text-start">
                      <li>AI-powered question generation</li>
                      <li>Review &amp; pick questions you like</li>
                      <li>Save hours of manual work</li>
                    </ul>
                    <div className="method-action method-action-pdf">Generate with AI →</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PDF Form Modal ─────────────────────────────────────── */}
      {pdfStep === "form" && (
        <div className="modal-overlay" onClick={resetPdfFlow}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header d-flex justify-content-between align-items-center">
              <h5 className="modal-title mb-0">
                <i className="bi bi-file-earmark-pdf-fill me-2 text-danger"></i>Create PDF-Based Test
              </h5>
              <button className="btn-close" onClick={resetPdfFlow}></button>
            </div>
            <form onSubmit={handlePdfFormSubmit}>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold">Test Title *</label>
                  <input type="text" className="form-control" value={pdfDetails.title}
                    onChange={(e) => setPdfDetails({ ...pdfDetails, title: e.target.value })}
                    placeholder="e.g., Data Structures Mid-Sem" required />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Description</label>
                  <textarea className="form-control" rows="2" value={pdfDetails.description}
                    onChange={(e) => setPdfDetails({ ...pdfDetails, description: e.target.value })}
                    placeholder="Brief description (optional)" />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Subject *</label>
                  <input type="text" className="form-control" value={pdfDetails.subject}
                    onChange={(e) => setPdfDetails({ ...pdfDetails, subject: e.target.value })}
                    placeholder="e.g., Data Structures, DBMS, Networks" required />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Branches *</label>
                  <div className="branch-pills">
                    {branches.map((branch) => (
                      <label key={branch} className={`branch-pill ${pdfDetails.branches.includes(branch) ? "branch-pill-active" : ""}`}>
                        <input type="checkbox" checked={pdfDetails.branches.includes(branch)}
                          onChange={(e) => {
                            if (e.target.checked)
                              setPdfDetails({ ...pdfDetails, branches: [...pdfDetails.branches, branch] });
                            else
                              setPdfDetails({ ...pdfDetails, branches: pdfDetails.branches.filter((b) => b !== branch) });
                          }} />
                        {pdfDetails.branches.includes(branch) && <i className="bi bi-check-lg"></i>}
                        {branch}
                      </label>
                    ))}
                  </div>
                  <small className="text-muted mt-1 d-block">Click to select one or more branches</small>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label fw-semibold">Total Questions *</label>
                    <input type="number" className="form-control" min="1" max="30" value={pdfDetails.totalQuestions}
                      onChange={(e) => setPdfDetails({ ...pdfDetails, totalQuestions: Math.max(1, parseInt(e.target.value) || 1) })}
                      required />
                    <small className="text-muted">
                      AI will generate {pdfDetails.totalQuestions + Math.max(3, Math.ceil(pdfDetails.totalQuestions * 0.6))} questions to pick from
                    </small>
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-semibold">Time Limit (mins) *</label>
                    <input type="number" className="form-control" min="1" value={pdfDetails.timeLimit}
                      onChange={(e) => setPdfDetails({ ...pdfDetails, timeLimit: Math.max(1, parseInt(e.target.value) || 1) })}
                      required />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-calendar-event me-1 text-warning"></i>
                    Deadline <span className="text-muted fw-normal">(Optional)</span>
                  </label>
                  <DeadlinePicker
                    value={pdfDetails.deadline}
                    onChange={(val) => setPdfDetails({ ...pdfDetails, deadline: val })}
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-file-earmark-pdf-fill text-danger me-1"></i>Upload PDF *
                  </label>
                  <input type="file" accept=".pdf" className="form-control"
                    onChange={(e) => setPdfFile(e.target.files[0])} required />
                  <small className="text-muted">Upload your notes or study material (max 15 MB). Must be a text-based PDF.</small>
                  {pdfFile && (
                    <div className="mt-2 p-2 bg-light rounded d-flex align-items-center gap-2">
                      <i className="bi bi-file-earmark-pdf-fill text-danger"></i>
                      <span className="small fw-semibold">{pdfFile.name}</span>
                      <span className="badge bg-secondary ms-auto">{(pdfFile.size / 1024).toFixed(0)} KB</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={resetPdfFlow}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-magic me-2"></i>Generate Questions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Generating Spinner Modal ────────────────────────────── */}
      {pdfStep === "generating" && (
        <div className="modal-overlay">
          <div className="modal-content text-center py-5">
            <div className="mb-4">
              <div className="spinner-border text-primary" style={{ width: "3.5rem", height: "3.5rem" }}></div>
            </div>
            <h4 className="mb-2">Analyzing PDF...</h4>
            <p className="text-muted mb-1">Gemini AI is reading your document and crafting questions</p>
            <p className="text-muted small">This usually takes 10–20 seconds</p>
            <div className="mt-3 d-flex justify-content-center gap-2 flex-wrap">
              <span className="badge bg-info"><i className="bi bi-file-earmark-pdf me-1"></i>{pdfFile?.name}</span>
              <span className="badge bg-primary"><i className="bi bi-book me-1"></i>{pdfDetails.subject}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Question Selection Modal ────────────────────────────── */}
      {pdfStep === "select" && (
        <div className="modal-overlay pdf-select-overlay">
          <div className="pdf-select-modal">
            {/* Sticky header */}
            <div className="pdf-select-header">
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                <div>
                  <h5 className="mb-1">
                    <i className="bi bi-check2-square me-2 text-primary"></i>
                    Select Questions — <span className="text-primary">{pdfDetails.title}</span>
                  </h5>
                  <p className="text-muted mb-0 small">
                    {generatedQuestions.length} questions generated. Select exactly <strong>{pdfDetails.totalQuestions}</strong> for the test.
                  </p>
                </div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <div className={`pdf-select-counter ${selectedQSet.size === pdfDetails.totalQuestions ? "counter-done" : ""}`}>
                    <span className="counter-num">{selectedQSet.size}</span>
                    <span className="counter-sep"> / {pdfDetails.totalQuestions}</span>
                    <span className="counter-lbl ms-1">selected</span>
                  </div>
                  <button className="btn btn-outline-secondary btn-sm"
                    onClick={() => { setPdfStep("form"); setSelectedQSet(new Set()); }}>
                    <i className="bi bi-arrow-left me-1"></i>Back
                  </button>
                  <button className="btn btn-success" onClick={handlePublishPdfTest}
                    disabled={selectedQSet.size !== pdfDetails.totalQuestions}>
                    <i className="bi bi-send me-2"></i>Publish Test
                  </button>
                  <button className="btn btn-outline-danger btn-sm" onClick={resetPdfFlow} title="Cancel">
                    <i className="bi bi-x-lg"></i>
                  </button>
                </div>
              </div>
              {selectedQSet.size < pdfDetails.totalQuestions ? (
                <div className="mt-2 small text-warning fw-semibold">
                  <i className="bi bi-info-circle me-1"></i>
                  {pdfDetails.totalQuestions - selectedQSet.size} more question{pdfDetails.totalQuestions - selectedQSet.size !== 1 ? "s" : ""} needed
                </div>
              ) : (
                <div className="mt-2 small text-success fw-semibold">
                  <i className="bi bi-check-circle me-1"></i>All {pdfDetails.totalQuestions} questions selected — ready to publish!
                </div>
              )}
            </div>

            {/* Scrollable questions */}
            <div className="pdf-select-body">
              {generatedQuestions.map((q, idx) => {
                const isSelected = selectedQSet.has(idx);
                const isDisabled = !isSelected && selectedQSet.size >= pdfDetails.totalQuestions;
                return (
                  <div key={idx}
                    className={`pdf-q-card ${isSelected ? "pdf-q-selected" : ""} ${isDisabled ? "pdf-q-disabled" : ""}`}
                    onClick={() => !isDisabled && toggleQuestion(idx)}>
                    <div className="d-flex gap-3">
                      <div className={`pdf-q-checkbox ${isSelected ? "pdf-q-checkbox-checked" : ""}`}>
                        {isSelected && <i className="bi bi-check-lg"></i>}
                      </div>
                      <div className="flex-grow-1">
                        <div className="pdf-q-num">Question {idx + 1}</div>
                        <p className="pdf-q-text">{q.question}</p>
                        <div className="pdf-opts-grid">
                          {q.options.map((opt, oi) => {
                            const letter = ["A", "B", "C", "D"][oi];
                            const isCorrect = q.correct === letter;
                            return (
                              <div key={oi} className={`pdf-opt ${isCorrect ? "pdf-opt-correct" : ""}`}>
                                <span className="pdf-opt-letter">{letter}</span>
                                <span className="pdf-opt-text">{opt.replace(/^[A-D]\.\s*/, "")}</span>
                                {isCorrect && <i className="bi bi-check-circle-fill ms-auto text-success"></i>}
                              </div>
                            );
                          })}
                        </div>
                        {q.explanation && (
                          <div className="pdf-q-explanation">
                            <i className="bi bi-lightbulb me-1"></i>{q.explanation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Create Test Modal */}
      {showCreateTestModal && (
        <div className="modal-overlay" onClick={() => setShowCreateTestModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="bi bi-file-earmark-plus me-2"></i>
                Create New Test
              </h5>
              <button className="btn-close" onClick={() => setShowCreateTestModal(false)}></button>
            </div>
            <form onSubmit={handleTestDetailsSubmit}>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold">Test Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={testDetails.title}
                    onChange={(e) => setTestDetails({...testDetails, title: e.target.value})}
                    placeholder="e.g., JavaScript Quiz - Week 1"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Description</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={testDetails.description}
                    onChange={(e) => setTestDetails({...testDetails, description: e.target.value})}
                    placeholder="Brief description of the test (optional)"
                  />
                  <small className="text-muted">Optional - Add a description to help students understand the test</small>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Subject *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={testDetails.subject}
                    onChange={(e) => setTestDetails({...testDetails, subject: e.target.value})}
                    placeholder="e.g., JavaScript, React, Data Structures, etc."
                    required
                  />
                  <small className="text-muted">Enter the subject or topic name</small>
                </div>
                <div className="mb-3">
                  {/* <label className="form-label fw-semibold">Branch *</label>
                  <select
                    className="form-select"
                    value={testDetails.branch}
                    onChange={(e) => setTestDetails({...testDetails, branch: e.target.value})}
                    required
                  >
                    <option value="">-- Select Branch --</option>
                    {branches.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </select> */}
                  <label className="form-label fw-semibold">Branches *</label>
                  <div className="branch-pills">
                    {branches.map((branch) => (
                      <label key={branch} className={`branch-pill ${testDetails.branches.includes(branch) ? "branch-pill-active" : ""}`}>
                        <input type="checkbox" checked={testDetails.branches.includes(branch)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTestDetails({ ...testDetails, branches: [...testDetails.branches, branch] });
                            } else {
                              setTestDetails({ ...testDetails, branches: testDetails.branches.filter(b => b !== branch) });
                            }
                          }} />
                        {testDetails.branches.includes(branch) && <i className="bi bi-check-lg"></i>}
                        {branch}
                      </label>
                    ))}
                  </div>
                  <small className="text-muted mt-1 d-block">Click to select one or more branches</small>
</div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Total Number of Questions *</label>
                  <input
                    type="number"
                    className="form-control"
                    min="1"
                    value={testDetails.totalQuestions}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      setTestDetails({...testDetails, totalQuestions: Math.max(1, value)});
                    }}
                    placeholder="Enter number of questions"
                    required
                  />
                  <small className="text-muted">Minimum 1 question required</small>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Time Limit (Minutes) *</label>
                  <input
                    type="number"
                    className="form-control"
                    min="1"
                    value={testDetails.timeLimit}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      setTestDetails({...testDetails, timeLimit: Math.max(1, value)});
                    }}
                    placeholder="Enter time in minutes"
                    required
                  />
                  <small className="text-muted">Minimum 1 minute required</small>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-calendar-event me-1 text-warning"></i>
                    Deadline <span className="text-muted fw-normal">(Optional)</span>
                  </label>
                  <DeadlinePicker
                    value={testDetails.deadline}
                    onChange={(val) => setTestDetails({ ...testDetails, deadline: val })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateTestModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-arrow-right me-2"></i>
                  Start Adding Questions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer-custom text-center py-3">
        © {new Date().getFullYear()} Teacher Dashboard - AI Student
      </footer>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText || "Cancel"}
          type={confirmModal.type}
        />
      )}
    </div>
  );
};

export default TeacherDashboard;
