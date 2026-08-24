// Shared GitHub PR helpers used by both review.js and generateTests.js —
// fetching PR metadata/diff and finding the agent's sticky comment.

// Hidden marker so we can find & update our own comment instead of posting a new
// one on every push (keeps a single, always-current review comment per PR).
const MARKER = "<!-- claude-pr-review-agent -->";

// Keep prompts within a sane token budget: cap each file's patch and the total.
const MAX_PATCH_CHARS = 12000;
const MAX_TOTAL_DIFF_CHARS = 90000;

// Fetches PR metadata + changed files and builds the file table / capped diff
// text shared by every prompt builder.
async function fetchPrContext(octokit, owner, repo, prNumber) {
  const { data: pr } = await octokit.pulls.get({ owner, repo, pull_number: prNumber });

  const { data: files } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });

  const fileTable = files
    .map((f) => `- \`${f.filename}\` — ${f.status} (+${f.additions} / -${f.deletions})`)
    .join("\n");

  let total = 0;
  const diffParts = [];
  for (const f of files) {
    let patch = f.patch || "(no textual diff available — binary, renamed, or too large)";
    if (patch.length > MAX_PATCH_CHARS) {
      patch = patch.slice(0, MAX_PATCH_CHARS) + "\n... (patch truncated) ...";
    }
    const block = `File: ${f.filename}\nStatus: ${f.status} (+${f.additions} / -${f.deletions})\n\n${patch}`;
    if (total + block.length > MAX_TOTAL_DIFF_CHARS) {
      diffParts.push("... (remaining files omitted from diff due to size limits) ...");
      break;
    }
    diffParts.push(block);
    total += block.length;
  }
  const diffSummary = diffParts.join("\n\n---\n\n");

  return { pr, files, fileTable, diffSummary };
}

// Finds the agent's existing sticky comment on a PR, if any.
async function findStickyComment(octokit, owner, repo, prNumber) {
  const { data: comments } = await octokit.issues.listComments({
    owner,
    repo,
    issue_number: prNumber,
    per_page: 100,
  });
  return comments.find((c) => c.body && c.body.includes(MARKER)) || null;
}

module.exports = { MARKER, MAX_PATCH_CHARS, MAX_TOTAL_DIFF_CHARS, fetchPrContext, findStickyComment };
