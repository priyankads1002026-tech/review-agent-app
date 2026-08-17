// Anthropic Claude provider for the review agent.
// Isolates all Claude/@anthropic-ai/sdk specifics so review.js and
// review.local.js stay provider-neutral.

const Anthropic = require("@anthropic-ai/sdk");

const MODEL = "claude-opus-4-1";

// Runs the review prompt through Claude and returns { text, usage }.
async function runReview(prompt, apiKey) {
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    messages: [{ role: "user", content: prompt }],
  });

  // content is a list of blocks (thinking, text, ...) — keep only the text.
  // Guard against an unexpected response shape before filtering.
  const blocks = Array.isArray(response.content) ? response.content : [];
  const text = blocks
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();

  const u = response.usage || {};
  const usage = {
    input: u.input_tokens ?? 0,
    output: u.output_tokens ?? 0,
  };

  return { text, usage };
}

module.exports = { MODEL, runReview };
