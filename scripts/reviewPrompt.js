// Shared, provider-agnostic review prompt used by both the GitHub Action
// (review.js) and the local test runner (review.local.js).

function buildPrompt({ prNumber, title, author, body, fileTable, diffSummary }) {
  return `You are a senior software engineer reviewing a Pull Request for the
"Claim Billing Request System" — a POC with a Node.js + Express REST API backend
(in-memory store) and a React + Vite frontend.

PR #${prNumber}: ${title}
Author: ${author || "unknown"}
Description:
${body ? body : "(no description provided)"}

Files changed in this PR:
${fileTable}

Produce a Markdown review with EXACTLY these sections and headings:

## 📋 PR Summary
2-4 sentences on what this PR does overall. Then a bullet list mapping the changed
files to the use case / behaviour each one affects, so a reviewer can quickly grasp
the intent (e.g. "- \`backend/server.js\` — adds the DELETE /api/claims/:id endpoint").

## 🔴 Critical Issues
Bugs, security vulnerabilities, missing validation, data-loss risks, broken API
contracts between frontend and backend. If none, write "None found."

## 🟡 Warnings
Missing error handling, edge cases, performance concerns, React hook misuse,
inconsistent request/response shapes. If none, write "None found."

## 🟢 Suggestions
Readability, naming, small refactors, Node/Express and React best practices.

## ✅ Verdict
Exactly one of: APPROVED / APPROVED WITH COMMENTS / CHANGES REQUESTED — with a
one-line justification.

## 🛠️ Suggested Fix Prompt
Write a single, copy-pasteable instruction (inside one \`\`\`text fenced code block)
that the developer can paste into an AI coding assistant to address the Critical
Issues and Warnings above. Be specific: name the files, the functions, and the
exact changes needed. If there is nothing to fix, put "No fixes required." in the block.

Report findings thoroughly — include lower-confidence items, and mark each with a
confidence level. Base every point on the actual diff below.

Code changes to review:

${diffSummary}`;
}

module.exports = { buildPrompt };
