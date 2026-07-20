// Google Gemini provider for the review agent.
// Isolates all Gemini/@google/genai specifics so review.js and review.local.js
// stay provider-neutral.

const { GoogleGenAI } = require("@google/genai");

const MODEL = "gemini-2.5-pro";

// Runs the review prompt through Gemini and returns { text, usage }.
async function runReview(prompt, apiKey) {
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
  });

  const text = (response.text || "").trim();
  const u = response.usageMetadata || {};
  const usage = {
    input: u.promptTokenCount ?? 0,
    output: u.candidatesTokenCount ?? 0,
  };

  return { text, usage };
}

module.exports = { MODEL, runReview };
