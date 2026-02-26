import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "./MockSession.css";

const MockSession = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, experience, resumeText, interviewData } =
    location.state || {};

  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ending, setEnding] = useState(false);

  // Speech states
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [countdown, setCountdown] = useState(null);
  const [countdownProgress, setCountdownProgress] = useState(100);

  // Refs
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const synthesisRef = useRef(window.speechSynthesis);
  const countdownIntervalRef = useRef(null);
  const shouldAutoSendRef = useRef(false);
  const userInputRef = useRef("");
  const messagesRef = useRef([]);

  // TTS streaming refs
  const ttsQueueRef = useRef([]);
  const ttsSpeakingRef = useRef(false);
  const ttsRawBufferRef = useRef("");
  const streamingDoneRef = useRef(false);
  const voiceRef = useRef(null);

  // Pick the best available TTS voice (Google > Microsoft Neural > any English)
  useEffect(() => {
    const pickVoice = () => {
      const voices = synthesisRef.current.getVoices();
      if (!voices.length) return;

      const preferred = [
        "Google US English",
        "Google UK English Female",
        "Google UK English Male",
        "Microsoft Aria Online (Natural) - English (United States)",
        "Microsoft Jenny Online (Natural) - English (United States)",
        "Microsoft Guy Online (Natural) - English (United States)",
        "Microsoft Aria - English (United States)",
        "Microsoft Zira - English (United States)",
        "Microsoft David - English (United States)",
      ];

      for (const name of preferred) {
        const v = voices.find((v) => v.name === name);
        if (v) { voiceRef.current = v; return; }
      }
      // Fallback: any en-US or en- voice
      voiceRef.current =
        voices.find((v) => v.lang === "en-US") ||
        voices.find((v) => v.lang.startsWith("en")) ||
        voices[0];
    };

    pickVoice();
    synthesisRef.current.onvoiceschanged = pickVoice;
  }, []);

  // Keep refs in sync with state
  useEffect(() => {
    userInputRef.current = userInput;
  }, [userInput]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // ── TTS Queue: speak next sentence, then auto-start mic when done ──
  const flushTTSQueue = () => {
    if (ttsSpeakingRef.current) return; // already speaking
    if (ttsQueueRef.current.length === 0) {
      // Queue drained — if streaming is also done, auto-start mic
      if (streamingDoneRef.current) {
        setIsSpeaking(false);
        setTimeout(() => {
          if (recognitionRef.current) {
            try { recognitionRef.current.start(); } catch (_) {}
          }
        }, 500);
      }
      return;
    }

    const sentence = ttsQueueRef.current.shift();
    ttsSpeakingRef.current = true;
    setIsSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(sentence);
    if (voiceRef.current) utterance.voice = voiceRef.current;
    utterance.rate = 0.92;
    utterance.pitch = 1.05;
    utterance.volume = 1.0;

    utterance.onend = () => {
      ttsSpeakingRef.current = false;
      flushTTSQueue();
    };

    utterance.onerror = () => {
      ttsSpeakingRef.current = false;
      flushTTSQueue();
    };

    synthesisRef.current.speak(utterance);
  };

  // ── Buffer chunks → extract complete sentences → queue for TTS ──
  const addToTTSBuffer = (chunk) => {
    ttsRawBufferRef.current += chunk;
    // Split on sentence endings followed by whitespace
    const parts = ttsRawBufferRef.current.split(/(?<=[.!?])\s+/);
    // Last element may be incomplete — always keep it in the buffer
    ttsRawBufferRef.current = parts.pop() || "";
    // Queue any completed sentences
    if (parts.length > 0) {
      parts.forEach((s) => { if (s.trim()) ttsQueueRef.current.push(s.trim()); });
      flushTTSQueue();
    }
  };

  // ── Main send function using SSE streaming ──
  const sendAnswer = async (answer, currentMessages) => {
    if (!answer) return;

    const newMessages = [...currentMessages, { sender: "user", text: answer }];
    // Add placeholder AI message updated incrementally (typewriter effect)
    const messagesWithPlaceholder = [...newMessages, { sender: "ai", text: "" }];
    setMessages(messagesWithPlaceholder);
    messagesRef.current = messagesWithPlaceholder;
    setUserInput("");
    setTranscript("");
    userInputRef.current = "";
    setLoading(true);

    // Reset TTS state for new response
    synthesisRef.current.cancel();
    ttsQueueRef.current = [];
    ttsSpeakingRef.current = false;
    ttsRawBufferRef.current = "";
    streamingDoneRef.current = false;

    try {
      const response = await fetch("http://localhost:5000/api/interview/respond-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: answer,
          previousMessages: newMessages,
          role,
          experience,
          resumeText: resumeText || "",
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const raw = decoder.decode(value, { stream: true });
        const lines = raw.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6));

            if (payload.done) {
              // Flush any remaining buffer text
              const remaining = ttsRawBufferRef.current.trim();
              if (remaining) {
                ttsQueueRef.current.push(remaining);
                ttsRawBufferRef.current = "";
              }
              streamingDoneRef.current = true;
              flushTTSQueue();

            } else if (payload.chunk) {
              fullText += payload.chunk;
              // Update last AI message in real-time (typewriter effect)
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { sender: "ai", text: fullText };
                return updated;
              });
              addToTTSBuffer(payload.chunk);

            } else if (payload.error) {
              throw new Error(payload.error);
            }
          } catch (_) {
            // skip malformed SSE lines
          }
        }
      }
    } catch (error) {
      console.error("Error fetching AI response:", error);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          sender: "ai",
          text: "Something went wrong. Please try again.",
        };
        return updated;
      });
      setIsSpeaking(false);
      setTimeout(() => {
        if (recognitionRef.current) {
          try { recognitionRef.current.start(); } catch (_) {}
        }
      }, 500);
    } finally {
      setLoading(false);
    }
  };

  // ── Auto-send triggered by silence detection ──
  const triggerAutoSend = () => {
    const answer = userInputRef.current.trim();
    if (!answer) {
      console.log("No answer to send");
      return;
    }
    console.log("Auto-sending answer:", answer);
    sendAnswer(answer, messagesRef.current);
  };

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let interimText = "";
        let finalText = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPart = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += transcriptPart + " ";
          } else {
            interimText += transcriptPart;
          }
        }

        if (finalText) {
          setTranscript((prev) => prev + finalText);
          setUserInput((prev) => {
            const newInput = prev + finalText;
            userInputRef.current = newInput;
            return newInput;
          });
        }

        setInterimTranscript(interimText);

        // Reset silence timer
        clearTimeout(silenceTimerRef.current);
        clearInterval(countdownIntervalRef.current);
        setCountdown(null);
        setCountdownProgress(100);
        shouldAutoSendRef.current = false;

        // Start countdown after 1.5 seconds of silence
        setCountdown(2);

        silenceTimerRef.current = setTimeout(() => {
          shouldAutoSendRef.current = true;
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
        }, 1500);

        // Update countdown display every 100ms
        let elapsed = 0;
        countdownIntervalRef.current = setInterval(() => {
          elapsed += 100;
          const remaining = 1500 - elapsed;
          const secondsLeft = Math.ceil(remaining / 1000);
          const progress = (remaining / 1500) * 100;

          setCountdown(secondsLeft);
          setCountdownProgress(progress);

          if (remaining <= 0) {
            clearInterval(countdownIntervalRef.current);
          }
        }, 100);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript("");
        clearInterval(countdownIntervalRef.current);
        setCountdown(null);
        setCountdownProgress(100);

        if (shouldAutoSendRef.current) {
          shouldAutoSendRef.current = false;
          // Small delay to ensure all state updates are processed
          setTimeout(() => {
            triggerAutoSend();
          }, 200);
        }
      };

      recognitionRef.current = recognition;
    } else {
      console.warn("Speech Recognition not supported in this browser.");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      clearTimeout(silenceTimerRef.current);
      clearInterval(countdownIntervalRef.current);
      synthesisRef.current.cancel();
    };
  }, []);

  // Speak welcome / initial question on load
  useEffect(() => {
    if (interviewData?.question) {
      const welcomeMsg = { sender: "ai", text: interviewData.question };
      setMessages([welcomeMsg]);
      speakText(interviewData.question);
    } else {
      const welcomeMsg = { sender: "ai", text: "Welcome to your mock interview!" };
      setMessages([welcomeMsg]);
      speakText("Welcome to your mock interview!");
    }
  }, [interviewData]);

  // Text-to-Speech for the welcome message (subsequent responses use TTS queue)
  const speakText = (text) => {
    synthesisRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (voiceRef.current) utterance.voice = voiceRef.current;
    utterance.rate = 0.92;
    utterance.pitch = 1.05;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setTimeout(() => startListening(), 500);
    };

    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event);
      setIsSpeaking(false);
    };

    synthesisRef.current.speak(utterance);
  };

  // Start listening
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript("");
      setUserInput("");
      userInputRef.current = "";
      setInterimTranscript("");
      setCountdown(null);
      setCountdownProgress(100);
      shouldAutoSendRef.current = false;
      try {
        recognitionRef.current.start();
      } catch (_) {}
    }
  };

  // Stop listening
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      shouldAutoSendRef.current = false;
      recognitionRef.current.stop();
      clearTimeout(silenceTimerRef.current);
      clearInterval(countdownIntervalRef.current);
      setCountdown(null);
      setCountdownProgress(100);
      setInterimTranscript("");
    }
  };

  // Stop speaking (clears TTS queue) then auto-start listening
  const stopSpeaking = () => {
    synthesisRef.current.cancel();
    ttsQueueRef.current = [];
    ttsSpeakingRef.current = false;
    streamingDoneRef.current = true; // treat as done so mic starts
    setIsSpeaking(false);
    setTimeout(() => {
      if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch (_) {}
      }
    }, 300);
  };

  // Manual send (send button)
  const handleSend = () => {
    stopListening();
    const answer = userInputRef.current.trim();
    if (!answer) return;
    sendAnswer(answer, messagesRef.current);
  };

  const handleEndInterview = async () => {
    try {
      setEnding(true);
      const res = await axios.post("http://localhost:5000/api/interview/summary", {
        messages,
        role,
      });

      navigate("/interview-summary", {
        state: {
          summary: res.data.summary,
          interviewData: {
            role,
            experience,
            resumeText: resumeText || "",
            messages,
          },
        },
      });
    } catch (error) {
      console.error("Error generating summary:", error);
      alert("Failed to generate summary. Please try again.");
    } finally {
      setEnding(false);
    }
  };

  return (
    <div className="mock-session-container">
      <div className="mock-session-card">
        <div className="session-header">
          <h3>Mock Interview Session</h3>
          <p>
            Role: <b>{role}</b> | Experience: <b>{experience}</b>
          </p>
        </div>

        <div className="chat-window">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`chat-bubble ${
                msg.sender === "user" ? "user-bubble" : "ai-bubble"
              }`}
            >
              {msg.text}
            </div>
          ))}
          {/* Only show "thinking" when the placeholder AI bubble has no text yet */}
          {loading && messages[messages.length - 1]?.sender === "ai" &&
            messages[messages.length - 1]?.text === "" && (
              <div className="typing">AI is thinking...</div>
            )}
        </div>

        <div className="voice-input-section">
          {/* Voice Status Indicator */}
          <div className="voice-status">
            {isSpeaking && (
              <div className="status-badge speaking">
                <i className="bi bi-volume-up-fill"></i>
                <span>AI Speaking...</span>
                <button className="stop-btn ms-2" onClick={stopSpeaking}>
                  <i className="bi bi-stop-fill"></i>
                </button>
              </div>
            )}

            {isListening && !isSpeaking && (
              <div className="status-badge listening">
                <i className="bi bi-mic-fill pulse-icon"></i>
                <span>Listening... (Auto-send after 1.5s silence)</span>
              </div>
            )}

            {!isListening && !isSpeaking && !loading && (
              <div className="status-badge ready">
                <i className="bi bi-mic-mute"></i>
                <span>Ready to listen</span>
              </div>
            )}

            {loading && !isSpeaking && (
              <div className="status-badge processing">
                <div className="spinner-border spinner-border-sm me-2"></div>
                <span>AI is responding...</span>
              </div>
            )}
          </div>

          {/* Live Transcript Display */}
          {(userInput || interimTranscript) && (
            <div className="live-transcript">
              <p className="transcript-label">
                <i className="bi bi-mic-fill me-2"></i>
                Your Answer:
              </p>
              <p className="transcript-text">
                <span className="final-text">{userInput}</span>
                {interimTranscript && (
                  <span className="interim-text">{interimTranscript}</span>
                )}
              </p>

              {/* Countdown Timer with Progress Bar */}
              {countdown !== null && isListening && (
                <div className="countdown-container">
                  <div className="countdown-info">
                    <i className="bi bi-hourglass-split me-2"></i>
                    <span>Auto-sending in {countdown}s...</span>
                  </div>
                  <div className="countdown-progress-bar">
                    <div
                      className="countdown-progress-fill"
                      style={{ width: `${countdownProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Voice Controls */}
          <div className="voice-controls">
            <button
              className={`btn btn-voice ${isListening ? "btn-danger" : "btn-primary"}`}
              onClick={isListening ? stopListening : startListening}
              disabled={isSpeaking || loading}
            >
              <i className={`bi ${isListening ? "bi-mic-fill" : "bi-mic"}`}></i>
              {isListening ? "Stop Recording" : "Start Recording"}
            </button>
          </div>
        </div>

        <div className="footer-btns">
          <button
            className="btn btn-outline-danger"
            onClick={handleEndInterview}
            disabled={ending}
          >
            {ending ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Generating Summary...
              </>
            ) : "End Interview"}
          </button>
        </div>

        {/* Full-page loading overlay while generating summary */}
        {ending && (
          <div className="session-loading-overlay">
            <div className="loading-content">
              <div className="loading-spinner">
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
              </div>
              <h3 className="loading-title">Analyzing Your Interview...</h3>
              <p className="loading-subtitle">AI is preparing your performance report</p>
              <div className="loading-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MockSession;
