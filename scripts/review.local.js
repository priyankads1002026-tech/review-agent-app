// Local test runner for the PR review agent (Anthropic Claude).
//
// Runs the SAME review prompt the GitHub Action uses, but against a local
// sample diff — no GitHub, no PR needed. Prints the review to your terminal.
//
// Usage (PowerShell):
//   cd scripts
//   npm install
//   $env:ANTHROPIC_API_KEY = "sk-ant-..."      # your Anthropic API key
//   npm run test:review                        # uses sample.diff
//   npm run test:review -- ../some.diff        # or point at another diff file

const fs = require("fs");
const path = require("path");
const { buildPrompt } = require("./reviewPrompt");
const { MODEL, runPrompt } = require("./claude");

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(
      "❌ ANTHROPIC_API_KEY is not set.\n" +
        '   PowerShell:  $env:ANTHROPIC_API_KEY = "sk-ant-..."\n' +
        "   Get a key at: https://console.anthropic.com/settings/keys\n" +
        "   then re-run:  npm run test:review"
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

  // A stand-in for GitHub's PR metadata — edit these freely for your own tests.
  const prNumber = 0;
  const title = "Local test: sample change";
  const author = "local-tester";
  const body = "Running the review agent locally against a sample diff.";

  // Derive a simple file list from the diff's "File:"/"+++ b/" markers.
  const fileNames = [...diffSummary.matchAll(/^(?:File:\s*|\+\+\+ b\/)(.+)$/gm)]
    .map((m) => m[1].trim())
    .filter((v, i, arr) => arr.indexOf(v) === i);
  const fileTable =
    fileNames.length > 0
      ? fileNames.map((f) => `- \`${f}\``).join("\n")
      : "(see diff below)";

  const prompt = buildPrompt({ prNumber, title, author, body, fileTable, diffSummary });

  console.log(`🤖 Sending sample diff to Anthropic Claude (${MODEL}) ...\n`);

  const { text, usage } = await runPrompt(prompt, apiKey);
  console.log(text || "(no text returned)");
  console.log(`\n---\nTokens — input: ${usage.input}, output: ${usage.output}`);
}

main().catch((e) => {
  console.error("❌ Local review failed:", e.message);
  process.exit(1);
});
