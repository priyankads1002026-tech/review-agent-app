// Shared logic for the test-generation scripts (generateTests.js /
// generateTests.local.js): which touched files get tests, where those tests
// go, what to import, and parsing/writing the model's response.

const fs = require("fs");
const path = require("path");

const BACKEND_RE = /^backend\/.+\.js$/;
const FRONTEND_RE = /^frontend\/src\/.+\.(jsx|js)$/;

function isEligible(filename, status) {
  if (status === "removed") return false;
  if (filename.endsWith(".test.js") || filename.endsWith(".test.jsx")) return false;
  if (filename.startsWith("frontend/src/test/")) return false;
  return BACKEND_RE.test(filename) || FRONTEND_RE.test(filename);
}

function testPathFor(filename) {
  const ext = path.extname(filename);
  const base = filename.slice(0, -ext.length);
  return `${base}.test${ext}`;
}

// Builds one target descriptor per eligible touched file: where its test file
// goes, what to import, and (if one already exists) its current content so the
// prompt can ask the model to extend rather than overwrite it.
function buildTargets(files, repoRoot) {
  return files
    .filter((f) => isEligible(f.filename, f.status))
    .map((f) => {
      const kind = f.filename.startsWith("backend/") ? "backend" : "frontend";
      const testPath = testPathFor(f.filename);
      const testAbsPath = path.join(repoRoot, testPath);
      const testDir = path.dirname(testAbsPath);

      const fixturesAbsPath = path.join(repoRoot, "test", "fixtures", "claims.mjs");
      let fixturesImportPath = path.relative(testDir, fixturesAbsPath).split(path.sep).join("/");
      if (!fixturesImportPath.startsWith(".")) fixturesImportPath = "./" + fixturesImportPath;

      const existingTestContent = fs.existsSync(testAbsPath) ? fs.readFileSync(testAbsPath, "utf8") : null;

      return {
        filename: f.filename,
        kind,
        testPath,
        sourceImportPath: "./" + path.basename(f.filename),
        fixturesImportPath,
        componentName: path.basename(f.filename, path.extname(f.filename)),
        existingTestContent,
      };
    });
}

// Whole-application mode: enumerate every eligible source file on disk (backend
// + frontend/src), returning the same { filename, status } shape the diff-based
// path produces so buildTargets() can consume it unchanged. `status: "modified"`
// is a placeholder that keeps isEligible()'s "removed" guard from filtering them.
function collectAllSourceFiles(repoRoot) {
  const roots = ["backend", path.join("frontend", "src")];
  const found = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        const rel = path.relative(repoRoot, full).split(path.sep).join("/");
        if (isEligible(rel, "modified")) found.push(rel);
      }
    }
  }

  for (const rel of roots) {
    const abs = path.join(repoRoot, rel);
    if (fs.existsSync(abs)) walk(abs);
  }

  return found.map((filename) => ({ filename, status: "modified" }));
}

const BLOCK_RE = /### TEST FILE:\s*(.+?)\s*\r?\n```[a-zA-Z]*\r?\n([\s\S]*?)```/g;

function parseTestBlocks(text) {
  const blocks = [];
  let m;
  while ((m = BLOCK_RE.exec(text)) !== null) {
    blocks.push({ testPath: m[1].trim(), content: m[2] });
  }
  return blocks;
}

function writeGeneratedFiles(blocks, repoRoot) {
  const written = [];
  const root = path.resolve(repoRoot);
  for (const b of blocks) {
    // testPath comes from the model — resolve it and reject anything that
    // escapes repoRoot (e.g. "../.github/workflows/x") so a crafted PR can't
    // coax an arbitrary file write in CI.
    const abs = path.resolve(root, b.testPath);
    if (abs !== root && !abs.startsWith(root + path.sep)) {
      console.warn(`Skipping test file outside repo root: ${b.testPath}`);
      continue;
    }
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, b.content, "utf8");
    written.push(b.testPath);
  }
  return written;
}

module.exports = { collectAllSourceFiles, buildTargets, parseTestBlocks, writeGeneratedFiles };
