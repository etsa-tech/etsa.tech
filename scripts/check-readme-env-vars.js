#!/usr/bin/env node

// Verifies that every process.env.X reference in src/ is documented
// somewhere in README.md. Catches the exact gap that motivated this script:
// a new env var (e.g. MAILCHIMP_TEMPLATE_ID_PRESENTATION) got wired into a
// feature but never made it into the README, leaving anyone setting up the
// project with no way to discover it short of reading the source.
//
// NODE_ENV is excluded - it's a standard Node/Next.js global, not a var
// this project's .env file needs to define.

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const SRC_DIR = path.join(ROOT, "src");
const README_PATH = path.join(ROOT, "README.md");

const IGNORED_VARS = new Set(["NODE_ENV"]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !/\.test\.tsx?$/.test(entry.name)
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

function getUsedEnvVars() {
  const vars = new Map(); // name -> Set of relative file paths

  for (const filePath of walk(SRC_DIR)) {
    const content = fs.readFileSync(filePath, "utf-8");
    const matches = content.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g);
    for (const [, name] of matches) {
      if (IGNORED_VARS.has(name)) continue;
      if (!vars.has(name)) vars.set(name, new Set());
      vars.get(name).add(path.relative(ROOT, filePath));
    }
  }

  return vars;
}

function getDocumentedEnvVars() {
  const content = fs.readFileSync(README_PATH, "utf-8");
  const documented = new Set();

  // Only look inside ```bash code blocks - that's where env vars are
  // actually declared as NAME=value, avoiding false matches from prose.
  const codeBlocks = content.matchAll(/```bash\n([\s\S]*?)```/g);
  for (const [, block] of codeBlocks) {
    const declarations = block.matchAll(/^([A-Z][A-Z0-9_]*)=/gm);
    for (const [, name] of declarations) {
      documented.add(name);
    }
  }

  return documented;
}

const usedVars = getUsedEnvVars();
const documentedVars = getDocumentedEnvVars();

const missing = [...usedVars.keys()]
  .filter((name) => !documentedVars.has(name))
  .sort((a, b) => a.localeCompare(b));

if (missing.length === 0) {
  console.log(
    `✅ All ${usedVars.size} env vars referenced in src/ are documented in README.md`,
  );
  process.exit(0);
}

console.error("❌ README.md is missing documentation for these env vars:");
for (const name of missing) {
  const usedIn = [...usedVars.get(name)].slice(0, 3).join(", ");
  console.error(`   ${name}  (used in ${usedIn})`);
}
console.error(
  "   Add each one to a ```bash env var block in README.md (see 'Environment Variables (Public Site)' or 'Admin Interface').",
);
process.exit(1);
