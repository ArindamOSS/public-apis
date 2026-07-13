#!/usr/bin/env node
"use strict";

const fs = require("fs");
const { validateReadme } = require("./validate");
const { fetchDiff } = require("./check-pr-links");
const { CATEGORY_RE } = require("./row-parser");

const COMMENT_MARKER = "<!-- readme-diff-validation -->";
const INDEX_ENTRY_RE = /^\*\s\[([^\]]+)\]\(#/;

function parseReadmeDiff(diffText) {
  const touchedLines = new Set();
  const changedCategoryNames = new Set();
  let inReadme = false;
  let newLine = 0;
  let inHunk = false;

  for (const line of diffText.split("\n")) {
    if (line.startsWith("diff --git ")) {
      inReadme = line === "diff --git a/README.md b/README.md";
      inHunk = false;
      continue;
    }
    if (!inReadme) continue;

    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (hunk) {
      newLine = Number(hunk[1]);
      inHunk = true;
      continue;
    }
    if (!inHunk || line.startsWith("+++") || line.startsWith("---")) continue;

    if (line.startsWith("+")) {
      touchedLines.add(newLine);
      collectCategoryName(line.slice(1), changedCategoryNames);
      newLine += 1;
    } else if (line.startsWith("-")) {
      // A deletion affects the rows on either side in the proposed file.
      touchedLines.add(Math.max(1, newLine - 1));
      touchedLines.add(Math.max(1, newLine));
      collectCategoryName(line.slice(1), changedCategoryNames);
    } else if (line.startsWith(" ")) {
      newLine += 1;
    }
  }

  return { touchedLines, changedCategoryNames };
}

function collectCategoryName(line, names) {
  const category = CATEGORY_RE.exec(line.trim());
  if (category) names.add(category[1].trim());
  const indexEntry = INDEX_ENTRY_RE.exec(line.trim());
  if (indexEntry) names.add(indexEntry[1].trim());
}

function categoryAtLine(lines, oneBasedLine) {
  for (let index = Math.min(oneBasedLine - 1, lines.length - 1); index >= 0; index -= 1) {
    const match = CATEGORY_RE.exec(lines[index].trim());
    if (match) return match[1].trim();
  }
  return null;
}

function filterErrorsToDiff(errors, readmeText, diffText) {
  const { touchedLines, changedCategoryNames } = parseReadmeDiff(diffText);
  const lines = readmeText.split("\n");
  const touchedCategories = new Set(changedCategoryNames);

  for (const lineNumber of touchedLines) {
    const category = categoryAtLine(lines, lineNumber);
    if (category) touchedCategories.add(category);
  }

  return errors.filter((error) => {
    const parsed = /^L(\d+):\s*(.*)$/.exec(error);
    if (!parsed) return false;
    const lineNumber = Number(parsed[1]);
    const message = parsed[2];
    if (touchedLines.has(lineNumber)) return true;

    const categoryError = /^category "([^"]+)"/.exec(message);
    return Boolean(categoryError && touchedCategories.has(categoryError[1]));
  });
}

function errorKey(error) {
  return error.replace(/^L\d+:\s*/, "");
}

function subtractBaselineErrors(proposedErrors, baselineErrors) {
  const baselineCounts = new Map();
  for (const error of baselineErrors) {
    const key = errorKey(error);
    baselineCounts.set(key, (baselineCounts.get(key) || 0) + 1);
  }

  return proposedErrors.filter((error) => {
    const key = errorKey(error);
    const remaining = baselineCounts.get(key) || 0;
    if (remaining === 0) return true;
    baselineCounts.set(key, remaining - 1);
    return false;
  });
}

function formatComment(errors, touchedReadme) {
  if (!touchedReadme) {
    return `${COMMENT_MARKER}\n### README validation\n\nNo README changes to validate.`;
  }
  if (errors.length === 0) {
    return `${COMMENT_MARKER}\n### README validation\n\n✅ Changed README lines passed validation.`;
  }

  const details = errors.map((error) => `- \`${error.replace(/`/g, "\\`")}\``).join("\n");
  return `${COMMENT_MARKER}\n### README validation\n\n❌ Found ${errors.length} issue(s) in the changed README lines:\n\n${details}`;
}

async function fetchReadme(repo, sha, label) {
  const url = `https://raw.githubusercontent.com/${repo}/${sha}/README.md`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${label} README: HTTP ${response.status}`);
  return response.text();
}

async function main() {
  const [readmePath, repo, prNumber, outputPath] = process.argv.slice(2);
  if (!readmePath || !repo || !prNumber || !outputPath) {
    throw new Error(
      "Usage: node validate-pr-readme.js <README> <owner/repo> <PR number> <comment output>"
    );
  }

  const diffText = await fetchDiff(repo, prNumber);
  const { touchedLines } = parseReadmeDiff(diffText);
  const readmeText = process.env.FETCH_HEAD_README === "true"
    ? await fetchReadme(process.env.HEAD_REPO, process.env.HEAD_SHA, "proposed")
    : fs.readFileSync(readmePath, "utf8");
  const baselineText = await fetchReadme(process.env.BASE_REPO, process.env.BASE_SHA, "base");
  const introducedErrors = subtractBaselineErrors(
    validateReadme(readmeText),
    validateReadme(baselineText)
  );
  const errors = filterErrorsToDiff(introducedErrors, readmeText, diffText);
  fs.writeFileSync(outputPath, `${formatComment(errors, touchedLines.size > 0)}\n`);

  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
  } else {
    console.log(touchedLines.size > 0 ? "Changed README lines are valid." : "No README changes.");
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  COMMENT_MARKER,
  filterErrorsToDiff,
  formatComment,
  parseReadmeDiff,
  subtractBaselineErrors,
};
