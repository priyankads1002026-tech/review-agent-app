// Shared, provider-agnostic prompt builder for the test-generation script
// (generateTests.js / generateTests.local.js). Mirrors reviewPrompt.js's pattern:
// all provider specifics stay in claude.js, this only builds prompt text.

// `targets` is an array of:
//   { filename, kind: "backend"|"frontend", testPath, sourceImportPath,
//     fixturesImportPath, existingTestContent: string|null }
function buildTestGenPrompt({ prNumber, title, fileTable, diffSummary, reviewFindings, targets }) {
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

  return `You are a senior test engineer writing regression tests for the "Claim
Billing Request System" (Node.js + Express backend, in-memory store; React + Vite
frontend). This PR (#${prNumber}: ${title}) touched the files below — your job is to
generate or extend tests ONLY for the files actually touched in this PR (not the
whole app), so a human tester doesn't have to manually re-verify this functionality.

Files changed in this PR:
${fileTable}

The automated code review already ran on this PR and found:
${reviewFindings || "(no prior review findings available)"}

Where a Critical or Warning finding above applies to a file you're generating tests
for, add a specific regression test that would FAIL on the buggy behavior described
and PASS once it's fixed — call out in a comment above that test which finding it
covers. Then also add ordinary functional-coverage tests for the rest of that file's
touched behavior (happy path + at least one edge case, e.g. missing/invalid input).

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

Do not add any other commentary outside these blocks. Base every test on the actual
diff below.

Code changes to review:

${diffSummary}`;
}

module.exports = { buildTestGenPrompt };
