// GitHub Action entrypoint — runs AFTER review.js in the same workflow run.
// Generates runnable Vitest tests for the backend/frontend files touched in
// this PR (targeting the review's Critical/Warning findings where possible),
// writes them into the checked-out workspace, and appends them to the same
// sticky review comment. Does NOT commit/push (the workflow's `contents: read`
// permission intentionally can't) — see reviewer-enhancements.md Enhancement 4.

const { Octokit } = require("@octokit/rest");
const path = require("path");
const { buildTestGenPrompt } = require("./testGenPrompt");
const { runPrompt } = require("./claude");
const { fetchPrContext, findStickyComment } = require("./prContext");
const { buildTargets, parseTestBlocks, writeGeneratedFiles } = require("./testGenCore");

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const [owner, repo] = process.env.REPO.split("/");
const prNumber = parseInt(process.env.PR_NUMBER, 10);
const REPO_ROOT = path.join(__dirname, "..");

async function main() {
  const { pr, files, fileTable, diffSummary } = await fetchPrContext(octokit, owner, repo, prNumber);

  const targets = buildTargets(files, REPO_ROOT);
  if (targets.length === 0) {
    console.log("No backend/frontend source files touched in this PR — skipping test generation.");
    return;
  }

  const existingComment = await findStickyComment(octokit, owner, repo, prNumber);
  const reviewFindings = existingComment ? existingComment.body : null;

  const prompt = buildTestGenPrompt({
    prNumber,
    title: pr.title,
    fileTable,
    diffSummary,
    reviewFindings,
    targets,
  });

  const { text } = await runPrompt(prompt, process.env.ANTHROPIC_API_KEY);
  if (!text) {
    throw new Error("Claude returned no text content for test generation.");
  }

  const blocks = parseTestBlocks(text);
  if (blocks.length === 0) {
    console.log("⚠️ No parseable test-file blocks in the model's response — nothing written.");
    return;
  }

  const written = writeGeneratedFiles(blocks, REPO_ROOT);
  console.log(`✅ Wrote ${written.length} test file(s): ${written.join(", ")}`);

  if (!existingComment) {
    console.log("⚠️ No sticky review comment found to append tests to — files were still written locally.");
    return;
  }

  const section = `

## 🧪 Suggested Tests
Generated to cover the code touched in this PR (and, where possible, to regression-test
the review findings above). Written locally in this run but **not committed** — copy
them into your branch if you want to keep them.

${blocks.map((b) => `**\`${b.testPath}\`**\n\`\`\`javascript\n${b.content}\n\`\`\``).join("\n\n")}`;

  await octokit.issues.updateComment({
    owner,
    repo,
    comment_id: existingComment.id,
    body: existingComment.body + section,
  });
  console.log(`✅ Appended Suggested Tests section to the sticky comment on PR #${prNumber}`);
}

main().catch((e) => {
  console.error("❌ Test generation failed:", e.message);
  process.exit(1);
});
