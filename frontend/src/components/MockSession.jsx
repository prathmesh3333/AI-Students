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

  // Pick the best available TTS voice
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
      voiceRef.current =
        voices.find((v) => v.lang === "en-US") ||
        voices.find((v) => v.lang.startsWith("en")) ||
        voices[0];
    };

    pickVoice();
    synthesisRef.current.onvoiceschanged = pickVoice;
  }, []);

  // Keep refs in sync with state
  useEffect(() => { userInputRef.current = userInput; }, [userInput]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // ── TTS Queue ──
  const flushTTSQueue = () => {
    if (ttsSpeakingRef.current) return;
    if (ttsQueueRef.current.length === 0) {
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

    utterance.onend = () => { ttsSpeakingRef.current = false; flushTTSQueue(); };
    utterance.onerror = () => { ttsSpeakingRef.current = false; flushTTSQueue(); };

    synthesisRef.current.speak(utterance);
  };

  // ── Buffer chunks → extract complete sentences → queue for TTS ──
  const addToTTSBuffer = (chunk) => {
    ttsRawBufferRef.current += chunk;
    const parts = ttsRawBufferRef.current.split(/(?<=[.!?])\s+/);
    ttsRawBufferRef.current = parts.pop() || "";
    if (parts.length > 0) {
      parts.forEach((s) => { if (s.trim()) ttsQueueRef.current.push(s.trim()); });
      flushTTSQueue();
    }
  };

  // ── Main send function using SSE streaming ──
  const sendAnswer = async (answer, currentMessages) => {
    if (!answer) return;

    const newMessages = [...currentMessages, { sender: "user", text: answer }];
    const messagesWithPlaceholder = [...newMessages, { sender: "ai", text: "" }];
    setMessages(messagesWithPlaceholder);
    messagesRef.current = messagesWithPlaceholder;
    setUserInput("");
    setTranscript("");
    userInputRef.current = "";
    setLoading(true);

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
              const remaining = ttsRawBufferRef.current.trim();
              if (remaining) {
                ttsQueueRef.current.push(remaining);
                ttsRawBufferRef.current = "";
              }
              streamingDoneRef.current = true;
              flushTTSQueue();
            } else if (payload.chunk) {
              fullText += payload.chunk;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { sender: "ai", text: fullText };
                return updated;
              });
              addToTTSBuffer(payload.chunk);
            } else if (payload.error) {
              throw new Error(payload.error);
            }
          } catch (_) {}
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
    if (!answer) return;
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

      recognition.onstart = () => setIsListening(true);

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

        // Don't reset the auto-send flag if the silence timer already fired
        // (browser may emit one more onresult after stop() is called)
        if (shouldAutoSendRef.current) return;

        clearTimeout(silenceTimerRef.current);
        clearInterval(countdownIntervalRef.current);
        setCountdown(null);
        setCountdownProgress(100);

        setCountdown(2);
        silenceTimerRef.current = setTimeout(() => {
          shouldAutoSendRef.current = true;
          if (recognitionRef.current) recognitionRef.current.stop();
        }, 1500);

        let elapsed = 0;
        countdownIntervalRef.current = setInterval(() => {
          elapsed += 100;
          const remaining = 1500 - elapsed;
          setCountdown(Math.ceil(remaining / 1000));
          setCountdownProgress((remaining / 1500) * 100);
          if (remaining <= 0) clearInterval(countdownIntervalRef.current);
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

        if (shouldAutoSendRef.current || userInputRef.current.trim()) {
          shouldAutoSendRef.current = false;
          setTimeout(() => triggerAutoSend(), 200);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      clearTimeout(silenceTimerRef.current);
      clearInterval(countdownIntervalRef.current);
      synthesisRef.current.cancel();
    };
  }, []);

  // Speak welcome / initial question on load
  useEffect(() => {
    if (interviewData?.question) {
      setMessages([{ sender: "ai", text: interviewData.question }]);
      speakText(interviewData.question);
    } else {
      setMessages([{ sender: "ai", text: "Welcome to your mock interview!" }]);
      speakText("Welcome to your mock interview!");
    }
  }, [interviewData]);

  const speakText = (text) => {
    synthesisRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (voiceRef.current) utterance.voice = voiceRef.current;
    utterance.rate = 0.92;
    utterance.pitch = 1.05;
    utterance.volume = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => { setIsSpeaking(false); setTimeout(() => startListening(), 500); };
    utterance.onerror = () => setIsSpeaking(false);
    synthesisRef.current.speak(utterance);
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript("");
      setUserInput("");
      userInputRef.current = "";
      setInterimTranscript("");
      setCountdown(null);
      setCountdownProgress(100);
      shouldAutoSendRef.current = false;
      try { recognitionRef.current.start(); } catch (_) {}
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      shouldAutoSendRef.current = false;
      // Clear input so the fallback in onend doesn't accidentally auto-send
      userInputRef.current = "";
      setUserInput("");
      setTranscript("");
      setInterimTranscript("");
      clearTimeout(silenceTimerRef.current);
      clearInterval(countdownIntervalRef.current);
      setCountdown(null);
      setCountdownProgress(100);
      recognitionRef.current.stop();
    }
  };

  const stopSpeaking = () => {
    synthesisRef.current.cancel();
    ttsQueueRef.current = [];
    ttsSpeakingRef.current = false;
    streamingDoneRef.current = true;
    setIsSpeaking(false);
    setTimeout(() => {
      if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch (_) {}
      }
    }, 300);
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
          interviewData: { role, experience, resumeText: resumeText || "", messages },
        },
      });
    } catch (error) {
      console.error("Error generating summary:", error);
      alert("Failed to generate summary. Please try again.");
    } finally {
      setEnding(false);
    }
  };

  // Derive current state class
  const stateClass = isSpeaking
    ? "ms-speaking"
    : isListening
    ? "ms-listening"
    : loading
    ? "ms-processing"
    : "ms-idle";

  // Last AI message
  const aiMessages = messages.filter((m) => m.sender === "ai");
  const currentQuestion = aiMessages[aiMessages.length - 1]?.text ?? "";

  return (
    <div className="ms-room">
      {/* ── Ambient blobs ── */}
      <div className="ms-blob ms-blob-1" />
      <div className="ms-blob ms-blob-2" />
      <div className="ms-blob ms-blob-3" />

      {/* ── Header ── */}
      <header className="ms-header">
        <div className="ms-header-brand">
          <i className="bi bi-cpu-fill" />
          <span>Mock Interview</span>
        </div>
        <div className="ms-header-meta">
          <span className="ms-pill">{role}</span>
          <span className="ms-pill ms-pill-dim">{experience}</span>
        </div>
        <button
          className="ms-end-btn"
          onClick={handleEndInterview}
          disabled={ending}
        >
          <i className="bi bi-box-arrow-right" />
          End
        </button>
      </header>

      {/* ── Stage ── */}
      <main className="ms-stage">
        {/* Animated Orb */}
        <div className={`ms-orb-wrap ${stateClass}`}>
          <div className="ms-orb-ring ms-orb-r3" />
          <div className="ms-orb-ring ms-orb-r2" />
          <div className="ms-orb-ring ms-orb-r1" />
          <div className="ms-orb-core">
            {isSpeaking && (
              <div className="ms-bars">
                <span /><span /><span /><span /><span />
              </div>
            )}
            {isListening && <i className="bi bi-mic-fill ms-core-icon" />}
            {loading && !isSpeaking && !isListening && (
              <div className="ms-proc-dots">
                <span /><span /><span />
              </div>
            )}
            {!isSpeaking && !isListening && !loading && (
              <i className="bi bi-person-workspace ms-core-icon ms-core-idle" />
            )}
          </div>
        </div>

        {/* State label */}
        <div className="ms-state-row">
          {isSpeaking && (
            <div className="ms-sl ms-sl-ai">
              <span className="ms-sl-dot" />
              AI is speaking
              <button className="ms-skip-btn" onClick={stopSpeaking}>
                <i className="bi bi-skip-forward-fill" /> Skip
              </button>
            </div>
          )}
          {isListening && !isSpeaking && (
            <div className="ms-sl ms-sl-user">
              <span className="ms-sl-dot" />
              Listening to your answer...
            </div>
          )}
          {loading && !isSpeaking && (
            <div className="ms-sl ms-sl-proc">
              <span className="ms-sl-dot" />
              Processing your answer...
            </div>
          )}
          {!isSpeaking && !isListening && !loading && (
            <div className="ms-sl ms-sl-idle">
              <span className="ms-sl-dot" />
              Ready
            </div>
          )}
        </div>

        {/* Current Question */}
        <div className="ms-question-area">
          {currentQuestion ? (
            <p className="ms-question">{currentQuestion}</p>
          ) : (
            <div className="ms-thinking">
              <span /><span /><span />
            </div>
          )}
        </div>
      </main>

      {/* ── User Zone ── */}
      <footer className="ms-user-zone">
        {/* Transcript */}
        <div className={`ms-transcript ${(userInput || interimTranscript) ? "ms-transcript-active" : ""}`}>
          <div className="ms-transcript-label">
            <i className="bi bi-mic" /> Your answer
          </div>
          <div className="ms-transcript-text">
            <span className="ms-final">{userInput}</span>
            {interimTranscript && (
              <span className="ms-interim"> {interimTranscript}</span>
            )}
          </div>
          {countdown !== null && isListening && (
            <div className="ms-cd-wrap">
              <div className="ms-cd-bar">
                <div className="ms-cd-fill" style={{ width: `${countdownProgress}%` }} />
              </div>
              <span className="ms-cd-label">Sending in {countdown}s</span>
            </div>
          )}
        </div>

        {/* Mic Button */}
        <div className="ms-mic-area">
          <button
            className={`ms-mic-btn ${isListening ? "ms-mic-on" : ""}`}
            onClick={isListening ? stopListening : startListening}
            disabled={isSpeaking || loading}
          >
            <i className={`bi ${isListening ? "bi-mic-fill" : "bi-mic"}`} />
            {isListening && <span className="ms-ripple ms-rip1" />}
            {isListening && <span className="ms-ripple ms-rip2" />}
            {isListening && <span className="ms-ripple ms-rip3" />}
          </button>
          <span className="ms-mic-label">
            {isListening
              ? "Tap to stop"
              : isSpeaking
              ? "AI is speaking..."
              : loading
              ? "Processing..."
              : "Tap to speak"}
          </span>
        </div>
      </footer>

      {/* ── Summary Generation Overlay ── */}
      {ending && (
        <div className="ms-overlay">
          <div className="ms-overlay-body">
            <div className="ms-ov-spinner">
              <div className="ms-ov-ring" />
              <div className="ms-ov-ring ms-ov-r2" />
              <div className="ms-ov-ring ms-ov-r3" />
            </div>
            <h2 className="ms-ov-title">Analyzing Your Interview</h2>
            <p className="ms-ov-sub">AI is preparing your performance report</p>
            <div className="ms-ov-dots">
              <span /><span /><span />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MockSession;
