// Local test runner for the test-generation agent.
//
// Runs the SAME test-gen prompt the GitHub Action uses, but against a local
// sample diff — no GitHub, no PR needed. Writes generated test file(s)
// straight into the repo (this is the "run it locally and keep the file"
// path from reviewer-enhancements.md Enhancement 4).
//
// Usage (PowerShell):
//   cd scripts
//   npm install
//   $env:ANTHROPIC_API_KEY = "sk-ant-..."
//   npm run test:gen                        # uses sample.diff
//   npm run test:gen -- ../some.diff        # or point at another diff file

const fs = require("fs");
const path = require("path");
const { buildTestGenPrompt } = require("./testGenPrompt");
const { runPrompt } = require("./claude");
const { buildTargets, parseTestBlocks, writeGeneratedFiles } = require("./testGenCore");

const REPO_ROOT = path.join(__dirname, "..");

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(
      "❌ ANTHROPIC_API_KEY is not set.\n" +
        '   PowerShell:  $env:ANTHROPIC_API_KEY = "sk-ant-..."\n' +
        "   Get a key at: https://console.anthropic.com/settings/keys\n" +
        "   then re-run:  npm run test:gen"
    );
    process.exit(1);
  }

  const diffPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(__dirname, "sample.diff");

  if (!fs.existsSync(diffPath)) {
    console.error(`❌ Diff file not found: ${diffPath}`);
    process.exit(1);
  }

  const diffSummary = fs.readFileSync(diffPath, "utf8");

  // Derive filename + status pairs from the diff's "File:"/"Status:" lines
  // (same format review.local.js's sample.diff already uses).
  const files = [...diffSummary.matchAll(/^File:\s*(.+?)\r?\nStatus:\s*(\w+)/gm)].map((m) => ({
    filename: m[1].trim(),
    status: m[2],
  }));

  const targets = buildTargets(files, REPO_ROOT);
  if (targets.length === 0) {
    console.log("No backend/frontend source files found in the diff — nothing to generate tests for.");
    return;
  }

  const fileTable = files.map((f) => `- \`${f.filename}\``).join("\n");

  const prompt = buildTestGenPrompt({
    prNumber: 0,
    title: "Local test: sample change",
    fileTable,
    diffSummary,
    reviewFindings: null,
    targets,
  });

  console.log(`🤖 Sending sample diff to Anthropic Claude for test generation ...\n`);

  const { text, usage } = await runPrompt(prompt, apiKey);
  if (!text) {
    console.error("(no text returned)");
    return;
  }

  const blocks = parseTestBlocks(text);
  if (blocks.length === 0) {
    console.log("⚠️ No parseable test-file blocks in the model's response — nothing written.");
    console.log(text);
    return;
  }

  const written = writeGeneratedFiles(blocks, REPO_ROOT);
  console.log(`✅ Wrote ${written.length} test file(s):`);
  written.forEach((w) => console.log(` - ${w}`));
  console.log(`\n---\nTokens — input: ${usage.input}, output: ${usage.output}`);
}

main().catch((e) => {
  console.error("❌ Local test generation failed:", e.message);
  process.exit(1);
});
