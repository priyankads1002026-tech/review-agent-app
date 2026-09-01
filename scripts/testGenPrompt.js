// Shared, provider-agnostic prompt builder for the test-generation script
// (generateTests.js / generateTests.local.js). Mirrors reviewPrompt.js's pattern:
// all provider specifics stay in claude.js, this only builds prompt text.

// `targets` is an array of:
//   { filename, kind: "backend"|"frontend", testPath, sourceImportPath,
//     fixturesImportPath, existingTestContent: string|null }
// `mode`:
//   "diff"  (default) — diff-scoped run (a PR or a local sample diff); the
//           trailing payload is the diff, and the prompt asks the model to prune
//           tests for behavior the diff REMOVES.
//   "whole" — whole-application run; the trailing payload is each target file's
//           current full source, and there is no diff to react to.
function buildTestGenPrompt({ prNumber, title, fileTable, diffSummary, reviewFindings, targets, mode = "diff" }) {
  const targetBlocks = targets
    .map((t) => {
      const mode = t.existingTestContent
        ? `A test file already exists at \`${t.testPath}\`. EXTEND it — keep every existing
test case working, and add new ones. Output the FULL updated file content (existing +
new tests merged), not a diff/patch.

Existing \`${t.testPath}\`:
\`\`\`
${t.existingTestContent}
\`\`\``
        : `No test file exists yet at \`${t.testPath}\`. Create one from scratch.`;

      const frameworkNote =
        t.kind === "backend"
          ? `Use Vitest + Supertest. Import the Express app with
\`import { app } from "${t.sourceImportPath}";\` and drive it with Supertest
(\`import request from "supertest";\`) — do not start a real listener.`
          : `Use Vitest + React Testing Library. Import the component with
\`import ${t.componentName} from "${t.sourceImportPath}";\` and \`render\`/\`screen\`/
\`fireEvent\` from \`@testing-library/react\`.`;

      return `### Target: ${t.filename}
Write tests to: ${t.testPath}
Import shared sample data with: \`import { ... } from "${t.fixturesImportPath}";\`
(pick whichever named exports from the fixtures you actually need — see the fixtures
file's exports listed below).
${frameworkNote}
${mode}`;
    })
    .join("\n\n");

  const whole = mode === "whole";

  const intro = whole
    ? `You are a senior test engineer writing a regression suite for the "Claim
Billing Request System" (Node.js + Express backend, in-memory store; React + Vite
frontend). This is a WHOLE-APPLICATION test-generation run (not a PR) — your job is to
generate or extend tests for the source file(s) below so a human tester doesn't have
to manually re-verify this functionality.`
    : `You are a senior test engineer writing regression tests for the "Claim
Billing Request System" (Node.js + Express backend, in-memory store; React + Vite
frontend). This PR (#${prNumber}: ${title}) touched the files below — your job is to
generate or extend tests ONLY for the files actually touched in this PR (not the
whole app), so a human tester doesn't have to manually re-verify this functionality.`;

  const filesHeader = whole ? "Files to cover:" : "Files changed in this PR:";

  // Diff-only: prior review context + turning findings into regression tests.
  const reviewSection = whole
    ? ""
    : `
The automated code review already ran on this PR and found:
${reviewFindings || "(no prior review findings available)"}

Where a Critical or Warning finding above applies to a file you're generating tests
for, add a specific regression test that would FAIL on the buggy behavior described
and PASS once it's fixed — call out in a comment above that test which finding it
covers. Then also add ordinary functional-coverage tests for the rest of that file's
touched behavior (happy path + at least one edge case, e.g. missing/invalid input).
`;

  // Diff-only: handle removed APIs/endpoints (Feature 5). Uses the '-' lines in
  // the diff plus any existing test content shown per target.
  const removalSection = whole
    ? ""
    : `
If the diff REMOVES a route, endpoint, exported function, or public behavior: do NOT
write new tests that call the removed behavior. If an existing test file (shown per
target below) has test cases covering behavior this diff removes, delete or update
those specific cases so the suite still passes, and add a comment noting what was
removed and why the test was dropped. Do not touch unrelated existing tests.
`;

  const coverageNote = whole
    ? `
For each file, cover its public behavior: the happy path plus at least one edge case
(e.g. missing/invalid input, error paths). Prefer meaningful assertions over trivial
ones.
`
    : "";

  const basisNote = whole
    ? "Base every test on the current source of each file below."
    : "Base every test on the actual diff below.";
  const payloadHeader = whole
    ? "Current source of each target file:"
    : "Code changes to review:";

  return `${intro}

${filesHeader}
${fileTable}
${reviewSection}${removalSection}${coverageNote}
Shared fixtures are available from a file exporting: pendingClaim, approvedClaim,
rejectedClaim, nonNumericAmountClaim, sampleClaims (array), newClaimPayload — a Claim
has shape { id, patientName, policyNumber, claimAmount, description, status,
submittedDate }. Reuse these instead of inventing your own data where they fit.

${targetBlocks}

Output format — for EACH target above, emit exactly one block in this exact form
(the file content goes inside the fenced code block, nothing else on those lines):

### TEST FILE: <the "Write tests to" path for that target>
\`\`\`javascript
<full file content here>
\`\`\`

Do not add any other commentary outside these blocks. ${basisNote}

${payloadHeader}

${diffSummary}`;
}

module.exports = { buildTestGenPrompt };
