const { generateInterviewQuestion } = require("../services/geminiService");
const Interview = require("../models/Interview");
const pdfParse = require("pdf-parse");
const fs = require("fs");

// ---------------- Start the Interview ----------------
const startMockInterview = async (req, res) => {
  try {
    const { role, experience, company, resumeText } = req.body;

    if (!role || !experience || !company) {
      return res.status(400).json({ error: "All fields are required" });
    }

    let prompt = `
You are a professional senior interviewer at ${company}. You are conducting a real technical/behavioral interview for the position of ${role}.

The candidate has ${experience} of experience.
${resumeText ? `\n\nCandidate's Resume:\n${resumeText}\n\nBased on the resume above, ask questions that are relevant to their experience, skills, and projects mentioned.` : ''}

IMPORTANT INSTRUCTIONS:
- Act like a real interviewer - be professional, direct, and evaluative
- Start with a brief greeting (1 sentence) then immediately ask ONE specific, challenging question
- Make questions realistic and role-specific
- If resume is provided, ask about specific projects, technologies, or experiences mentioned
- Don't be overly friendly or encouraging - maintain professional interview tone
- Ask ONE question at a time

Begin the interview now.
`;

    const question = await generateInterviewQuestion(prompt);

    res.status(200).json({
      success: true,
      question,
      resumeText: resumeText || ""
    });
  } catch (error) {
    console.error("❌ startMockInterview Error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

// ---------------- Handle User Response ----------------
const handleInterviewResponse = async (req, res) => {
  try {
    const { userMessage, role, company, resumeText, previousMessages } = req.body;

    if (!userMessage || !role || !company) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const conversationHistory = previousMessages && previousMessages.length > 0
      ? previousMessages.slice(-6).map(m => `${m.sender === 'user' ? 'Candidate' : 'Interviewer'}: ${m.text}`).join('\n')
      : '';

    const prompt = `
You are a professional senior interviewer at ${company} conducting an interview for ${role} position.

${conversationHistory ? `Previous conversation:\n${conversationHistory}\n\n` : ''}

Candidate's latest response:
"${userMessage}"

${resumeText ? `\nCandidate's Resume Context:\n${resumeText}\n` : ''}

IMPORTANT INSTRUCTIONS:
- Evaluate the candidate's response critically but fairly
- Give BRIEF feedback (1-2 sentences) on their answer - be honest if answer lacks depth
- Then ask the NEXT relevant interview question
- Maintain professional interview tone - not overly friendly
- Questions should progressively assess deeper knowledge
- If answer was weak, probe deeper or move to related topic
- Don't repeat questions already asked in conversation history

Respond now:
`;

    const followUp = await generateInterviewQuestion(prompt);

    res.status(200).json({
      success: true,
      response: followUp,
    });
  } catch (error) {
    console.error("❌ handleInterviewResponse Error:", error);
    res.status(500).json({ success: false, error: "Failed to process response" });
  }
};

// ---------------- Generate Interview Summary ----------------
const generateInterviewSummary = async (req, res) => {
  try {
    const { messages, role, company } = req.body;

    if (!messages || messages.length === 0) {
      return res.status(400).json({ error: "No messages provided" });
    }

    const transcript = messages
      .map((m) => `${m.sender === "user" ? "Candidate" : "Interviewer"}: ${m.text}`)
      .join("\n");

    const prompt = `
You are an expert interview evaluator analyzing a ${role} interview at ${company}.

Interview Transcript:
${transcript}

Analyze the candidate's performance thoroughly and provide a detailed evaluation.

Generate a JSON summary with the EXACT structure below. Be specific and detailed in your analysis:

{
  "confidence": "High",
  "nervousness": "Low",
  "weakAreas": ["Specific weak area 1", "Specific weak area 2", "Specific weak area 3"],
  "strongAreas": ["Specific strong area 1", "Specific strong area 2", "Specific strong area 3"],
  "technicalScore": 7,
  "communicationScore": 8,
  "recommendation": "Recommended",
  "overallSummary": "Write a detailed 3-4 sentence summary of the candidate's overall interview performance, highlighting key strengths, areas for improvement, and overall readiness for the role."
}

CRITICAL RULES - FOLLOW EXACTLY:
1. confidence MUST be ONLY ONE WORD: either "High", "Medium", or "Low" - NO OTHER TEXT
2. nervousness MUST be ONLY ONE WORD: either "Low", "Medium", or "High" - NO OTHER TEXT
3. weakAreas MUST be an array with 3-4 specific, actionable items based on actual interview responses
4. strongAreas MUST be an array with 3-4 specific, actionable items based on actual interview responses
5. technicalScore: Rate technical knowledge/skills from 1-10
6. communicationScore: Rate communication clarity from 1-10
7. recommendation: MUST be one of "Highly Recommended", "Recommended", or "Not Recommended"
8. overallSummary should be 3-4 comprehensive sentences
9. Output ONLY valid JSON with no extra text, no explanations, no markdown

Example of CORRECT format:
{
  "confidence": "Medium",
  "nervousness": "Medium",
  "weakAreas": ["Struggled with technical questions about algorithms", "Needed prompting for behavioral examples", "Limited knowledge of system design"],
  "strongAreas": ["Good communication skills", "Showed enthusiasm for the role", "Quick learner attitude"],
  "technicalScore": 6,
  "communicationScore": 7,
  "recommendation": "Recommended",
  "overallSummary": "The candidate demonstrated moderate performance during the interview. While they showed good soft skills and enthusiasm, their technical knowledge needs improvement. With focused preparation on core concepts, they could be a strong contender for junior positions."
}

Now generate the evaluation based on the interview transcript:
`;

    let summaryText = await generateInterviewQuestion(prompt);

    // Clean unexpected formatting
    summaryText = summaryText.replace(/```json/gi, "").replace(/```/g, "").trim();

    let summary;
    try {
      summary = JSON.parse(summaryText);

      // Validate and clean confidence/nervousness - extract only first word
      if (summary.confidence) {
        const confidenceWord = summary.confidence.split('.')[0].split(' ')[0].trim();
        summary.confidence = ['High', 'Medium', 'Low'].includes(confidenceWord) ? confidenceWord : 'Medium';
      } else {
        summary.confidence = 'Medium';
      }

      if (summary.nervousness) {
        const nervousnessWord = summary.nervousness.split('.')[0].split(' ')[0].trim();
        summary.nervousness = ['Low', 'Medium', 'High'].includes(nervousnessWord) ? nervousnessWord : 'Medium';
      } else {
        summary.nervousness = 'Medium';
      }

      // Validate that we have the required fields
      if (!summary.weakAreas || summary.weakAreas.length === 0) {
        summary.weakAreas = ["Technical depth needs improvement", "Communication could be clearer", "Limited problem-solving approach"];
      }
      if (!summary.strongAreas || summary.strongAreas.length === 0) {
        summary.strongAreas = ["Active engagement", "Willingness to learn", "Good attitude"];
      }
      if (!summary.overallSummary) {
        summary.overallSummary = "The candidate demonstrated basic understanding of the role requirements and showed enthusiasm during the interview. Further preparation in technical areas would strengthen their candidacy.";
      }

      // Validate scores
      summary.technicalScore = (summary.technicalScore >= 1 && summary.technicalScore <= 10) ? summary.technicalScore : 5;
      summary.communicationScore = (summary.communicationScore >= 1 && summary.communicationScore <= 10) ? summary.communicationScore : 5;

      // Validate recommendation
      const validRecommendations = ["Highly Recommended", "Recommended", "Not Recommended"];
      if (!validRecommendations.includes(summary.recommendation)) {
        summary.recommendation = "Recommended";
      }
    } catch (parseError) {
      console.error("JSON parsing failed:", parseError);
      summary = {
        confidence: "Medium",
        nervousness: "Medium",
        weakAreas: ["Technical depth needs improvement", "Communication clarity", "Problem-solving approach"],
        strongAreas: ["Active engagement", "Enthusiasm", "Willingness to learn"],
        technicalScore: 5,
        communicationScore: 5,
        recommendation: "Recommended",
        overallSummary: "The candidate participated in the interview and provided responses to the questions asked. They demonstrated basic knowledge and showed interest in the role.",
        parseError: true
      };
    }

    res.status(200).json({ success: true, summary });
  } catch (error) {
    console.error("❌ generateInterviewSummary Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate summary",
    });
  }
};

// ---------------- Save Interview Summary ----------------
const saveInterview = async (req, res) => {
  try {
    const {
      rollNo,
      studentName,
      date,
      role,
      company,
      experience,
      topic,
      difficulty,
      confidence,
      nervousness,
      weakAreas,
      strongAreas,
      focusAreas,
      overallSummary,
      technicalScore,
      communicationScore,
      recommendation,
      resumeText,
      messages
    } = req.body;

    if (!rollNo || !studentName || !date || !role || !confidence || !nervousness) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const interview = new Interview({
      rollNo,
      studentName,
      date,
      role,
      company,
      experience,
      topic,
      difficulty,
      confidence,
      nervousness,
      weakAreas: weakAreas || [],
      strongAreas: strongAreas || [],
      focusAreas: focusAreas || [],
      overallSummary: overallSummary || "",
      technicalScore: technicalScore || 0,
      communicationScore: communicationScore || 0,
      recommendation: recommendation || "",
      resumeText: resumeText || "",
      messages: messages || []
    });

    await interview.save();

    res.status(201).json({
      success: true,
      message: "Interview saved successfully",
      interview
    });
  } catch (error) {
    console.error("❌ saveInterview Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to save interview"
    });
  }
};

// ---------------- Get User Interviews ----------------
const getUserInterviews = async (req, res) => {
  try {
    const { rollNo } = req.params;

    if (!rollNo) {
      return res.status(400).json({ error: "Roll number is required" });
    }

    const interviews = await Interview.find({ rollNo }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      interviews
    });
  } catch (error) {
    console.error("❌ getUserInterviews Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch interviews"
    });
  }
};
// ---------------- Get Single Interview By ID ----------------
const getInterviewById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, error: "Interview ID is required" });
    }

    const interview = await Interview.findById(id);

    if (!interview) {
      return res.status(404).json({ success: false, error: "Interview not found" });
    }

    res.status(200).json({
      success: true,
      interview,
    });
  } catch (error) {
    console.error("❌ getInterviewById Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch interview",
    });
  }
};

// ---------------- Parse PDF Resume ----------------
const parseResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(dataBuffer);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    const resumeText = pdfData.text.trim();

    if (!resumeText || resumeText.length < 50) {
      return res.status(400).json({
        error: "Could not extract sufficient text from PDF. Please ensure your resume has readable text."
      });
    }

    res.status(200).json({
      success: true,
      resumeText: resumeText.substring(0, 3000) // Limit to 3000 chars for API
    });
  } catch (error) {
    console.error("❌ parseResume Error:", error);

    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: "Failed to parse PDF resume"
    });
  }
};

// module.exports = {
//   startMockInterview,
//   handleInterviewResponse,
//   generateInterviewSummary,
//   saveInterview,
//   getUserInterviews,
//   parseResume,
// };

// ---------------- Generate Mock Test (PDF-based MCQs) ----------------
const generateMockTest = async (req, res) => {
  try {
    const { branch, subject, difficulty, pdfText, numQuestions = 10 } = req.body;

    if (!branch || !subject || !difficulty || !pdfText) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const count = Math.min(Math.max(parseInt(numQuestions) || 10, 1), 30);

    const prompt = `You are an expert academic question paper setter for ${branch} engineering students.

Generate exactly ${count} multiple-choice questions based ONLY on the following subject notes.

Subject: ${subject}
Branch: ${branch}
Difficulty Level: ${difficulty}

Subject Notes:
${pdfText.substring(0, 3000)}

STRICT RULES:
1. Generate EXACTLY ${count} questions — no more, no less.
2. Base every question directly on the provided notes.
3. Difficulty must match "${difficulty}": Easy = recall/definition, Medium = application/understanding, Hard = analysis/problem-solving.
4. Each question has exactly 4 options labeled A, B, C, D.
5. Only ONE option is correct.
6. "correct" field must be a single letter: A, B, C, or D.
7. "explanation" is 1-2 sentences explaining why the answer is correct.
8. Return ONLY a valid JSON array — no markdown, no extra text.

Required JSON format:
[
  {
    "question": "Question text here?",
    "options": ["A. First option", "B. Second option", "C. Third option", "D. Fourth option"],
    "correct": "A",
    "explanation": "Brief explanation of the correct answer."
  }
]`;

    let raw = await generateInterviewQuestion(prompt);
    raw = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

    let questions;
    try {
      questions = JSON.parse(raw);
    } catch (_) {
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        questions = JSON.parse(match[0]);
      } else {
        throw new Error("Could not parse questions JSON from AI response.");
      }
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("Invalid questions array returned by AI.");
    }

    res.status(200).json({ success: true, questions });
  } catch (error) {
    console.error("❌ generateMockTest Error:", error);
    res.status(500).json({ success: false, error: "Failed to generate mock test" });
  }
};

module.exports = {
  startMockInterview,
  handleInterviewResponse,
  generateInterviewSummary,
  saveInterview,
  getUserInterviews,
  getInterviewById,
  parseResume,
  generateMockTest,
};
