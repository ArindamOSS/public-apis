"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  COMMENT_MARKER,
  filterErrorsToDiff,
  formatComment,
  parseReadmeDiff,
  subtractBaselineErrors,
} = require("../validate-pr-readme");

const readme = [
  "## Index",
  "* [Animals](#animals)",
  "### Animals",
  "|:---|:---|:---|:---|:---|",
  "| [Ant](https://example.com/a) | Good description | No | Yes | No |",
  "| [Bad](https://example.com/b) | bad description. | No | Yes | No |",
  "| [Cat](https://example.com/c) | Good description | No | Yes | No |",
].join("\n");

test("collects proposed README line numbers from a unified diff", () => {
  const diff = [
    "diff --git a/README.md b/README.md",
    "--- a/README.md",
    "+++ b/README.md",
    "@@ -4,2 +4,3 @@",
    " |:---|:---|:---|:---|:---|",
    "+| [Bad](https://example.com/b) | bad description. | No | Yes | No |",
    " | [Cat](https://example.com/c) | Good description | No | Yes | No |",
  ].join("\n");

  assert.deepEqual([...parseReadmeDiff(diff).touchedLines], [5]);
});

test("ignores legacy errors outside the diff", () => {
  const diff = [
    "diff --git a/README.md b/README.md",
    "--- a/README.md",
    "+++ b/README.md",
    "@@ -5,2 +5,2 @@",
    " | [Ant](https://example.com/a) | Good description | No | Yes | No |",
    "+| [Bad](https://example.com/b) | bad description. | No | Yes | No |",
  ].join("\n");
  const errors = [
    "L6: first character of description is not capitalized",
    'L6: description should not end with "."',
    "L99: unrelated legacy issue",
  ];

  assert.deepEqual(filterErrorsToDiff(errors, readme, diff), errors.slice(0, 2));
});

test("includes category-level errors when that category changed", () => {
  const diff = [
    "diff --git a/README.md b/README.md",
    "--- a/README.md",
    "+++ b/README.md",
    "@@ -5,2 +5,2 @@",
    "+| [Zoo](https://example.com/z) | Good description | No | Yes | No |",
    " | [Bad](https://example.com/b) | bad description. | No | Yes | No |",
  ].join("\n");

  const error = 'L3: category "Animals" is not in alphabetical order';
  assert.deepEqual(filterErrorsToDiff([error], readme, diff), [error]);
});

test("formats a stable success comment", () => {
  const comment = formatComment([], true);
  assert.ok(comment.startsWith(COMMENT_MARKER));
  assert.ok(comment.includes("passed validation"));
});

test("subtracts legacy errors even when their line numbers move", () => {
  const baseline = [
    'L20: category "Finance" is not in alphabetical order',
    "L40: description is empty",
  ];
  const proposed = [
    'L21: category "Finance" is not in alphabetical order',
    "L41: description is empty",
    "L42: first character of description is not capitalized",
  ];

  assert.deepEqual(subtractBaselineErrors(proposed, baseline), [
    "L42: first character of description is not capitalized",
  ]);
});

test("preserves additional occurrences of an existing error", () => {
  const baseline = ["L10: description is empty"];
  const proposed = ["L10: description is empty", "L20: description is empty"];
  assert.deepEqual(subtractBaselineErrors(proposed, baseline), ["L20: description is empty"]);
});
