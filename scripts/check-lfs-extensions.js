#!/usr/bin/env node

// Verifies that src/lib/git-lfs.ts's LFS_TRACKED_EXTENSIONS set matches the
// extensions actually tracked by `filter=lfs` in .gitattributes. The admin
// upload routes decide whether to upload a file as a real Git LFS object
// (vs. committing raw bytes) based on that hardcoded set, so if it drifts
// from .gitattributes, uploads for newly-LFS-tracked extensions would
// silently stop being stored via LFS.

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const GITATTRIBUTES_PATH = path.join(ROOT, ".gitattributes");
const GIT_LFS_LIB_PATH = path.join(ROOT, "src/lib/git-lfs.ts");

function getGitattributesExtensions() {
  const content = fs.readFileSync(GITATTRIBUTES_PATH, "utf-8");
  const extensions = new Set();

  for (const line of content.split("\n")) {
    const [pattern, ...attrs] = line.trim().split(/\s+/);
    const extMatch = pattern.match(/^\*\.(\w+)$/);
    if (extMatch && attrs.includes("filter=lfs")) {
      extensions.add(extMatch[1].toLowerCase());
    }
  }

  return extensions;
}

function getLibExtensions() {
  const content = fs.readFileSync(GIT_LFS_LIB_PATH, "utf-8");
  const match = content.match(
    /LFS_TRACKED_EXTENSIONS\s*=\s*new Set\(\[([\s\S]*?)\]\)/,
  );

  if (!match) {
    throw new Error(
      `Could not find LFS_TRACKED_EXTENSIONS in ${GIT_LFS_LIB_PATH}`,
    );
  }

  const extensions = new Set();
  const stringLiteral = /["']([^"']+)["']/g;
  let stringMatch;
  while ((stringMatch = stringLiteral.exec(match[1])) !== null) {
    extensions.add(stringMatch[1].toLowerCase());
  }

  return extensions;
}

function diff(a, b) {
  return [...a].filter((item) => !b.has(item));
}

const gitattributesExtensions = getGitattributesExtensions();
const libExtensions = getLibExtensions();

const missingFromLib = diff(gitattributesExtensions, libExtensions);
const missingFromGitattributes = diff(libExtensions, gitattributesExtensions);

if (missingFromLib.length === 0 && missingFromGitattributes.length === 0) {
  console.log(
    `✅ LFS_TRACKED_EXTENSIONS in git-lfs.ts matches .gitattributes (${[
      ...gitattributesExtensions,
    ]
      .sort((a, b) => a.localeCompare(b))
      .join(", ")})`,
  );
  process.exit(0);
}

console.error("❌ src/lib/git-lfs.ts is out of sync with .gitattributes");
if (missingFromLib.length > 0) {
  console.error(
    `   .gitattributes tracks these extensions via LFS, but LFS_TRACKED_EXTENSIONS doesn't: ${missingFromLib.join(
      ", ",
    )}`,
  );
}
if (missingFromGitattributes.length > 0) {
  console.error(
    `   LFS_TRACKED_EXTENSIONS lists these, but .gitattributes doesn't track them via LFS: ${missingFromGitattributes.join(
      ", ",
    )}`,
  );
}
console.error(
  "   Update LFS_TRACKED_EXTENSIONS in src/lib/git-lfs.ts (or .gitattributes) so they match.",
);
process.exit(1);
