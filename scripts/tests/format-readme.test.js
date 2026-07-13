"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { sortCategoryRows } = require("../format-readme");

const unsorted = [
  "Intro",
  "### Animals",
  "API | Description | Auth | HTTPS | CORS |",
  "|:---|:---|:---|:---|:---|",
  "| [Zebra](https://example.com/z) | Zebra data | No | Yes | No |",
  "| [Ant](https://example.com/a) | Ant data | No | Yes | No |",
  "",
  "Back to index",
].join("\n");

test("sorts API rows by title inside a category", () => {
  const formatted = sortCategoryRows(unsorted);
  assert.ok(formatted.indexOf("[Ant]") < formatted.indexOf("[Zebra]"));
});

test("preserves Markdown outside API rows", () => {
  const formatted = sortCategoryRows(unsorted);
  assert.ok(formatted.startsWith("Intro\n### Animals"));
  assert.ok(formatted.endsWith("\nBack to index"));
});

test("formatting is idempotent", () => {
  const once = sortCategoryRows(unsorted);
  assert.equal(sortCategoryRows(once), once);
});
