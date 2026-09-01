// Whole-application test generation — MANUALLY triggered (not diff-scoped).
//
// Unlike generateTests.js (PR diff) and generateTests.local.js (sample diff),
// this generates or extends Vitest tests for EVERY eligible backend/frontend
// source file. It needs no GitHub API — it enumerates files from the local
// checkout and writes tests straight into it — so the same script runs both
// locally (`npm run test:gen:all`) and in CI via the manually-dispatched
// generate-all-tests workflow (which uploads the results as an artifact, since
// the workflow's `contents: read` permission still can't push).
//
// One model call per file keeps each prompt small and within the token budget
// (rather than trying to stuff the whole app into a single request).
//
// Usage (PowerShell):
//   cd scripts
//   npm install
//   $env:ANTHROPIC_API_KEY = "sk-ant-..."
//   npm run test:gen:all

const fs = require("fs");
const path = require("path");
const { buildTestGenPrompt } = require("./testGenPrompt");
const { runPrompt } = require("./claude");
const { MAX_PATCH_CHARS } = require("./prContext");
const {
  collectAllSourceFiles,
  buildTargets,
  parseTestBlocks,
  writeGeneratedFiles,
} = require("./testGenCore");

const REPO_ROOT = path.join(__dirname, "..");

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(
      "❌ ANTHROPIC_API_KEY is not set.\n" +
        '   PowerShell:  $env:ANTHROPIC_API_KEY = "sk-ant-..."\n' +
        "   Get a key at: https://console.anthropic.com/settings/keys\n" +
        "   then re-run:  npm run test:gen:all"
    );
    process.exit(1);
  }

  const files = collectAllSourceFiles(REPO_ROOT);
  const targets = buildTargets(files, REPO_ROOT);
  if (targets.length === 0) {
    console.log("No eligible backend/frontend source files found — nothing to generate.");
    return;
  }

  console.log(`🤖 Whole-application test generation — ${targets.length} file(s) to cover.\n`);

  const allWritten = [];
  let totalIn = 0;
  let totalOut = 0;

  for (const target of targets) {
    // Feed the file's CURRENT source (capped to the same per-file budget the
    // diff path uses) in place of a diff — there is no diff in whole-app mode.
    const srcAbs = path.join(REPO_ROOT, target.filename);
    let source = fs.existsSync(srcAbs) ? fs.readFileSync(srcAbs, "utf8") : "";
    if (source.length > MAX_PATCH_CHARS) {
      source = source.slice(0, MAX_PATCH_CHARS) + "\n... (source truncated) ...";
    }
    const sourceBlock = `File: ${target.filename}\n\n${source}`;

    const prompt = buildTestGenPrompt({
      prNumber: 0,
      title: "Whole-application test generation",
      fileTable: `- \`${target.filename}\``,
      diffSummary: sourceBlock,
      reviewFindings: null,
      targets: [target],
      mode: "whole",
    });

    process.stdout.write(`• ${target.filename} ... `);
    const { text, usage } = await runPrompt(prompt, apiKey);
    totalIn += usage.input;
    totalOut += usage.output;

    if (!text) {
      console.log("(no text returned) — skipped");
      continue;
    }
    const blocks = parseTestBlocks(text);
    if (blocks.length === 0) {
      console.log("no parseable test block — skipped");
      continue;
    }

    const written = writeGeneratedFiles(blocks, REPO_ROOT);
    allWritten.push(...written);
    console.log(`wrote ${written.join(", ") || "(nothing — outside repo root)"}`);
  }

  console.log(`\n✅ Whole-app generation complete — ${allWritten.length} test file(s) written:`);
  allWritten.forEach((w) => console.log(` - ${w}`));
  console.log(`\n---\nTokens — input: ${totalIn}, output: ${totalOut}`);
}

main().catch((e) => {
  console.error("❌ Whole-application test generation failed:", e.message);
  process.exit(1);
});
