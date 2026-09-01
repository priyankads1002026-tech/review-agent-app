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
First line: \`Overall risk: <Low|Medium|High> — <one-line reason>\` — your holistic
read of how risky this PR is to merge.
Then 2-4 sentences on what this PR does overall. Then a bullet list mapping the
changed files to the use case / behaviour each one affects, so a reviewer can quickly
grasp the intent — each bullet also gets a risk tag and reason, e.g.:
"- \`backend/server.js\` — 🔴 High: new PUT /api/claims/:id, no input validation
(data-integrity risk)." Explicitly call out (in the bullet text) any file that touches
the frontend↔backend API contract (request/response shape both sides rely on) or
security-sensitive logic (auth, input handling, data deletion).
End the section with a line starting "Not covered:" naming things the PR did NOT do
that a reviewer should know about (e.g. "no tests added", "no input validation on the
new endpoint"). If there's genuinely nothing missing, write "Not covered: nothing
notable."

## 🔴 Critical Issues
Bugs, security vulnerabilities, missing validation, data-loss risks, broken API
contracts between frontend and backend. If none, write "None found." Otherwise, each
item is a bullet in the form
"- **[Severity: <Critical|High|Medium|Low> | Confidence: <High|Medium|Low>]** \`file\` — description"
Severity here is almost always Critical or High.

## 🟡 Warnings
Missing error handling, edge cases, performance concerns, React hook misuse,
inconsistent request/response shapes. If none, write "None found." Same
"- **[Severity: ... | Confidence: ...]** \`file\` — description" bullet form; Severity
here is typically High or Medium.

## 🟢 Suggestions
Readability, naming, small refactors, Node/Express and React best practices. Same
"- **[Severity: ... | Confidence: ...]** \`file\` — description" bullet form; Severity
here is typically Medium or Low.

## ✅ Verdict
Exactly one of: APPROVED / APPROVED WITH COMMENTS / CHANGES REQUESTED — with a
one-line justification.

## 🚑 Critical-Only Fix Prompt
If the Critical Issues section is "None found.", write exactly: "No critical issues —
nothing to fix." Otherwise, write a single copy-pasteable instruction (inside one
\`\`\`text fenced code block) addressing ONLY the Critical Issues, structured as:

You are a senior full-stack engineer maintaining the Claim Billing Request System
(Node.js + Express backend, React + Vite frontend).

Problem: <one sentence naming the critical issue(s) and their impact>.

Fix them by:
1. In <file>, <exact change>.
2. In <file>, <exact change>.
Constraints: preserve existing behaviour (<name what must keep working>); match the
existing code style; do not introduce new dependencies.

(Name the actual files/functions/changes from this PR — the above is the shape, not
literal text to copy.)

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
