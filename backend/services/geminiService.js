const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
  throw new Error("❌ GEMINI_API_KEY missing in .env file");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ⭐ Helper to call Gemini
async function generateInterviewQuestion(prompt) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", // ⭐ fastest + stable
    });

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("❌ Gemini Error:", error.message);
    return "Error generating response.";
  }
}

// ⭐ Streaming version — calls onChunk for each text piece
async function streamInterviewResponse(prompt, onChunk) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContentStream(prompt);
    let fullText = "";
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        fullText += text;
        onChunk(text);
      }
    }
    return fullText;
  } catch (error) {
    console.error("❌ Gemini Streaming Error:", error.message);
    throw error;
  }
}

module.exports = { generateInterviewQuestion, streamInterviewResponse };
