import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./TakeTest.css";
import Toast from "./Toast";
import ConfirmModal from "./ConfirmModal";
import AIProctoring from "../components/AIProctoring";

const TakeTest = () => {
  const { testId } = useParams();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [startTime] = useState(Date.now());
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [isTestLocked, setIsTestLocked] = useState(false);
  const [proctorActive, setProctorActive] = useState(true);

  const timerRef = useRef(null);
  const documentVisibilityRef = useRef(true);
  const lastLockRef = useRef(0); // debounce camera-violation locks

  const [lockReason, setLockReason] = useState("");
  const [violations, setViolations] = useState({
    NO_FACE: 0,
    MULTIPLE_FACE: 0,
    VOICE_DETECTED: 0,
    TAB_SWITCH: 0
  });

  // const handleViolation = (type, evidence = null) => {
  //   console.log("Violation:", type);

  //   setToast({
  //     message: `⚠️ Suspicious activity detected: ${type}`,
  //     type: "warning"
  //   });

  //   // Optional: increase tab switch count as penalty
  //   if (type !== "TAB_SWITCH") {
  //     setTabSwitchCount(prev => prev + 1);
  //   }

  //   // Later we will send this to backend
  // };
  const LOCK_MESSAGES = {
    TAB_SWITCH:     "You switched tabs during the test. Return to fullscreen to continue.",
    NO_FACE:        "No face detected in the camera. Please ensure your face is clearly visible.",
    MULTIPLE_FACE:  "Multiple faces detected. Only you should be visible during the test.",
    VOICE_DETECTED: "Voice or noise was detected. Please maintain silence during the test.",
  };

  const handleViolation = (type) => {
    setToast({ message: `⚠️ ${type.replace(/_/g, " ")} detected`, type: "warning" });
    setViolations(prev => ({ ...prev, [type]: (prev[type] || 0) + 1 }));

    if (type === "TAB_SWITCH") {
      setTabSwitchCount(prev => prev + 1);
      setLockReason(LOCK_MESSAGES.TAB_SWITCH);
      setIsTestLocked(true);
      setIsFullscreen(false);
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    } else {
      // Camera/voice violations: lock with a 15-second debounce to avoid constant locking
      const now = Date.now();
      if (now - lastLockRef.current > 15000) {
        lastLockRef.current = now;
        setLockReason(LOCK_MESSAGES[type] || `${type.replace(/_/g, " ")} detected.`);
        setIsTestLocked(true);
      }
    }
  };
  // Fetch test data
  useEffect(() => {
    const fetchTest = async () => {
      try {
        const studentName = localStorage.getItem("studentName");
        const rollNo = localStorage.getItem("rollNo");

        if (!studentName || !rollNo) {
          setToast({ message: "Please login to take the test", type: "error" });
          setTimeout(() => navigate("/login"), 1500);
          return;
        }

        const response = await axios.get(`http://localhost:5000/api/test/${testId}`);
        if (response.data && response.data.success) {
          const testData = response.data.test;
          setTest(testData);
          setTimeRemaining(testData.timeLimit * 60); // Convert minutes to seconds

          // Initialize answers array
          const initialAnswers = testData.questions.map((_, index) => ({
            questionIndex: index,
            selectedAnswer: -1
          }));
          setAnswers(initialAnswers);
          setLoading(false);

          // Request fullscreen
          requestFullscreen();
        }
      } catch (error) {
        console.error("Error fetching test:", error);
        setToast({ message: "Failed to load test", type: "error" });
        setTimeout(() => navigate("/start-test"), 1500);
      }
    };

    fetchTest();
  }, [testId, navigate]);

  // Timer countdown
  useEffect(() => {
    if (!test || loading || submitting) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSubmitTest(true); // Auto-submit when time runs out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [test, loading, submitting]);

  // Fullscreen management
  // const requestFullscreen = () => {
  //   const elem = document.documentElement;
  //   if (elem.requestFullscreen) {
  //     elem.requestFullscreen().then(() => {
  //       setIsTestLocked(false);
  //       setIsFullscreen(true);
  //     }).catch(err => {
  //       console.log("Fullscreen request failed:", err);
  //     });
  //   } else if (elem.webkitRequestFullscreen) {
  //     elem.webkitRequestFullscreen();
  //     setIsTestLocked(false);
  //     setIsFullscreen(true);
  //   } else if (elem.msRequestFullscreen) {
  //     elem.msRequestFullscreen();
  //     setIsTestLocked(false);
  //     setIsFullscreen(true);
  //   }
  // };
  const requestFullscreen = async () => {
    try {
      const elem = document.documentElement;

      if (!document.fullscreenElement) {
        if (elem.requestFullscreen) await elem.requestFullscreen();
        else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
        else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
      }

      setIsTestLocked(false);
      setIsFullscreen(true);
    } catch (err) {
      console.log("Fullscreen failed:", err);
    }
  };

  useEffect(() => {
    if (!proctorActive) return;

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const audioContext = new AudioContext();
        const mic = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();

        mic.connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);

        const detectSound = () => {
          analyser.getByteFrequencyData(data);

          const volume = data.reduce((a, b) => a + b) / data.length;

          if (volume > 70) {
            handleViolation("VOICE_DETECTED");
          }

          requestAnimationFrame(detectSound);
        };

        detectSound();
      })
      .catch(err => console.log("Mic error:", err));

  }, [proctorActive]);;


  // useEffect(() => {
  //   const handleFullscreenChange = () => {
  //     const inFullscreen = !!document.fullscreenElement;
  //     setIsFullscreen(inFullscreen);

  //     // If user exits fullscreen and test is not locked, request it again
  //     if (!inFullscreen && !submitting && !isTestLocked) {
  //       setTimeout(() => {
  //         requestFullscreen();
  //       }, 1000);
  //     }
  //   };

  //   document.addEventListener("fullscreenchange", handleFullscreenChange);
  //   document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
  //   document.addEventListener("mozfullscreenchange", handleFullscreenChange);
  //   document.addEventListener("MSFullscreenChange", handleFullscreenChange);

  //   return () => {
  //     document.removeEventListener("fullscreenchange", handleFullscreenChange);
  //     document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
  //     document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
  //     document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
  //   };
  // }, [submitting]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const inFullscreen = !!document.fullscreenElement;
      setIsFullscreen(inFullscreen);

      if (!inFullscreen && !submitting && !isTestLocked) {
        setTimeout(() => {
          requestFullscreen();
        }, 400);
      }
    };

    const handleEscKey = (e) => {
      if (e.key === "Escape" && !submitting && !isTestLocked) {
        setTimeout(() => {
          requestFullscreen();
        }, 200);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleEscKey);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [submitting, isTestLocked]);


  useEffect(() => {
    const handleUserClick = () => {
      if (!document.fullscreenElement && !submitting && !isTestLocked) {
        requestFullscreen();
      }
    };

    document.addEventListener("click", handleUserClick);

    return () => {
      document.removeEventListener("click", handleUserClick);
    };
  }, [submitting, isTestLocked]);


  // Tab switch detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !submitting) {
        documentVisibilityRef.current = false;
        handleViolation("TAB_SWITCH");
      } else {
        documentVisibilityRef.current = true;
      }
    };

    const handleBlur = () => {
      if (!submitting) {
        setTabSwitchCount(prev => prev + 1);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [submitting]);

  // Prevent back button and page refresh
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!submitting) {
        e.preventDefault();
        e.returnValue = "Are you sure you want to leave? Your test progress will be lost.";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [submitting]);

  // Handle answer selection
  const handleAnswerSelect = (optionIndex) => {
    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestionIndex].selectedAnswer = optionIndex;
    setAnswers(updatedAnswers);
  };

  // Navigation
  const goToNextQuestion = () => {
    if (currentQuestionIndex < test.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const goToQuestion = (index) => {
    setCurrentQuestionIndex(index);
  };


  useEffect(() => {
    if (tabSwitchCount >= 5) {
      submitTestNow();
    }
  }, [tabSwitchCount]);


  // Submit test
  const handleSubmitTest = async (autoSubmit = false) => {
    if (!autoSubmit) {
      const unanswered = answers.filter(a => a.selectedAnswer === -1).length;
      if (unanswered > 0) {
        setConfirmModal({
          message: `You have ${unanswered} unanswered question(s). Do you still want to submit?`,
          onConfirm: () => {
            setConfirmModal(null);
            submitTestNow();
          },
          onCancel: () => setConfirmModal(null),
          type: "warning",
          confirmText: "Submit Anyway"
        });
        return;
      } else {
        setConfirmModal({
          message: "Are you sure you want to submit your test?",
          onConfirm: () => {
            setConfirmModal(null);
            submitTestNow();
          },
          onCancel: () => setConfirmModal(null),
          type: "info",
          confirmText: "Submit Test"
        });
        return;
      }
    }

    submitTestNow();
  };

  // const submitTestNow = async () => {
  //   setSubmitting(true);
  //   setProctorActive(false); 
  //   // Clear timer
  //   if (timerRef.current) {
  //     clearInterval(timerRef.current);
  //   }

  //   const timeTaken = Math.floor((Date.now() - startTime) / 1000);
  //   const studentName = localStorage.getItem("studentName");
  //   const rollNo = localStorage.getItem("rollNo");

  //   try {
  //     const response = await axios.post("http://localhost:5000/api/test-result/submit", {
  //       testId,
  //       studentName,
  //       rollNo,
  //       answers,
  //       timeTaken,
  //       tabSwitchCount
  //     });

  //     if (response.data && response.data.success) {
  //       // Exit fullscreen
  //       if (document.exitFullscreen) {
  //         document.exitFullscreen();
  //       }

  //       // Navigate to results page with result data
  //       navigate("/test-result", {
  //         state: {
  //           result: response.data.result,
  //           testTitle: test.title,
  //           tabSwitchCount
  //         }
  //       });
  //     }
  //   } catch (error) {
  //     console.error("Error submitting test:", error);
  //     setToast({ message: "Failed to submit test. Please try again.", type: "error" });
  //     setSubmitting(false);
  //   }
  // };
  const submitTestNow = async () => {
    setSubmitting(true);

    // STOP PROCTOR
    setProctorActive(false);

    // wait for camera cleanup
    await new Promise(resolve => setTimeout(resolve, 500));

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    const studentName = localStorage.getItem("studentName");
    const rollNo = localStorage.getItem("rollNo");

    try {
      const response = await axios.post(
        "http://localhost:5000/api/test-result/submit",
        {
          testId,
          studentName,
          rollNo,
          answers,
          timeTaken,
          tabSwitchCount
        }
      );

      if (response.data && response.data.success) {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }

        navigate("/test-result", {
          state: {
            result: response.data.result,
            testTitle: test.title,
            tabSwitchCount,
            violations   // 👈 IMPORTANT (next step)
          }
        });
      }
    } catch (error) {
      console.error("Error submitting test:", error);
      setToast({
        message: "Failed to submit test. Please try again.",
        type: "error"
      });
      setSubmitting(false);
    }
  };

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="take-test-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading test...</p>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="take-test-loading">
        <p>Test not found</p>
      </div>
    );
  }
  const currentQuestion = test.questions[currentQuestionIndex];
  const answeredCount = answers.filter(a => a.selectedAnswer !== -1).length;
  const progressPercentage = (answeredCount / test.totalQuestions) * 100;

  return (
    <div className="take-test-container">
      {/* Lock Overlay */}
      {isTestLocked && (
        <div className="test-lock-overlay">
          <div className="lock-content">
            <div className="lock-icon">
              <i className="bi bi-lock-fill"></i>
            </div>
            <h3 className="lock-title">Test Locked</h3>
            <p className="lock-message">
              {lockReason}
            </p>
            <button
              className="btn btn-primary btn-lg go-fullscreen-btn"
              onClick={requestFullscreen}
            >
              <i className="bi bi-arrows-fullscreen me-2"></i>
              Go Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="test-header-bar">
        <div className="container-fluid">
          <div className="row align-items-center">
            <div className="col-md-4">
              <h5 className="mb-0">
                <i className="bi bi-file-text me-2"></i>
                {test.title}
              </h5>
              <small className="text-muted">{test.subject}</small>
            </div>
            <div className="col-md-4 text-center">
              <div className={`timer-display ${timeRemaining < 60 ? 'timer-warning' : ''}`}>
                <i className="bi bi-clock me-2"></i>
                <span className="time-text">{formatTime(timeRemaining)}</span>
              </div>
              {tabSwitchCount > 0 && (
                <div className="tab-switch-warning mt-1">
                  <i className="bi bi-exclamation-triangle me-1"></i>
                  Tab Switches: {tabSwitchCount}
                </div>
              )}
            </div>
            <div className="col-md-4 text-end">
              <button
                className="btn btn-success"
                onClick={() => handleSubmitTest(false)}
                disabled={submitting}
              >
                <i className="bi bi-check-circle me-2"></i>
                Submit Test
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-container">
        <div className="container-fluid">
          <div className="progress" style={{ height: '8px' }}>
            <div
              className="progress-bar bg-success"
              role="progressbar"
              style={{ width: `${progressPercentage}%` }}
              aria-valuenow={progressPercentage}
              aria-valuemin="0"
              aria-valuemax="100"
            ></div>
          </div>
          <small className="text-muted">
            {answeredCount} of {test.totalQuestions} questions answered
          </small>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-fluid py-4">
        <div className="row">
          {/* Question Area */}
          <div className="col-lg-9">
            <div className="question-card">
              <div className="question-header">
                <h4>
                  Question {currentQuestionIndex + 1} of {test.totalQuestions}
                </h4>
              </div>

              <div className="question-body">
                <p className="question-text">{currentQuestion.question}</p>
                <p>{currentQuestion.image}</p>
                {currentQuestion.image && (
                  <div className="question-image-wrapper text-center mb-3">
                    <p>Image name: {currentQuestion.image}</p>
                    <img
                      // src={`http://localhost:5000/uploads/${currentQuestion.image}`}
                      // alt="Question"
                      // className="img-fluid rounded"
                      // style={{ maxHeight: "300px" }}
                      // onError={(e) => {
                      // e.target.style.display = "none";
                      // console.log("Image failed:", currentQuestion.image);
                      src={`http://localhost:5000/uploads/questions/${currentQuestion.image}`}
                      alt="Question"
                      style={{ maxWidth: "400px", borderRadius: "8px" }}
                      onError={(e) => {
                        console.log("Image failed:", currentQuestion.image);
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                )}
                <div className="options-container">
                  {currentQuestion.options.map((option, index) => (
                    <div
                      key={index}
                      className={`option-item ${answers[currentQuestionIndex].selectedAnswer === index ? 'selected' : ''
                        }`}
                      onClick={() => handleAnswerSelect(index)}
                    >
                      <div className="option-radio">
                        <input
                          type="radio"
                          name={`question-${currentQuestionIndex}`}
                          checked={answers[currentQuestionIndex].selectedAnswer === index}
                          onChange={() => handleAnswerSelect(index)}
                        />
                      </div>
                      <div className="option-label">
                        <span className="option-letter">{String.fromCharCode(65 + index)}.</span>
                        <span className="option-text">{option}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="question-footer">
                <button
                  className="btn btn-outline-primary"
                  onClick={goToPreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                >
                  <i className="bi bi-arrow-left me-2"></i>
                  Previous
                </button>

                {currentQuestionIndex < test.questions.length - 1 && (
                  <button
                    className="btn btn-primary"
                    onClick={goToNextQuestion}
                  >
                    Next
                    <i className="bi bi-arrow-right ms-2"></i>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Question Navigator */}
          <div className="col-lg-3">
            <div className="question-navigator">
              <h6 className="mb-3">Question Navigator</h6>
              <div className="question-grid">
                {test.questions.map((_, index) => (
                  <button
                    key={index}
                    className={`question-nav-btn ${index === currentQuestionIndex ? 'active' : ''
                      } ${answers[index].selectedAnswer !== -1 ? 'answered' : ''
                      }`}
                    onClick={() => goToQuestion(index)}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              <div className="legend mt-3">
                <div className="legend-item">
                  <span className="legend-color current"></span>
                  <small>Current</small>
                </div>
                <div className="legend-item">
                  <span className="legend-color answered"></span>
                  <small>Answered</small>
                </div>
                <div className="legend-item">
                  <span className="legend-color unanswered"></span>
                  <small>Unanswered</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
      <AIProctoring onViolation={handleViolation} isActive={proctorActive}
      />
    </div>
  );
};

export default TakeTest;