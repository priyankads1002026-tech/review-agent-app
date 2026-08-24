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
  for (const b of blocks) {
    const abs = path.join(repoRoot, b.testPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, b.content, "utf8");
    written.push(b.testPath);
  }
  return written;
}

module.exports = { buildTargets, parseTestBlocks, writeGeneratedFiles };
