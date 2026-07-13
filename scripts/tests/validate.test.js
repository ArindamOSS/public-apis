"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { validateReadme } = require("../validate");

function withCategory(rows) {
  return [
    "## Index",
    "* [Animals](#animals)",
    "### Animals",
    "|:---|:---|:---|:---|:---|",
    ...rows,
  ].join("\n");
}

function threeValidRows() {
  return [
    "| [A](https://example.com/a) | Desc one | No | Yes | No |",
    "| [B](https://example.com/b) | Desc two | No | Yes | No |",
    "| [C](https://example.com/c) | Desc three | No | Yes | No |",
  ];
}

test("valid file produces no errors", () => {
  assert.deepEqual(validateReadme(withCategory(threeValidRows())), []);
});

test("does not crash on an empty description", () => {
  const rows = [...threeValidRows(), "| [D](https://example.com/d) |  | No | Yes | No |"];
  assert.ok(validateReadme(withCategory(rows)).some((e) => e.includes("description is empty")));
});

test("flags the last category in the file", () => {
  const rows = ["| [A](https://example.com/a) | Only one | No | Yes | No |"];
  assert.ok(validateReadme(withCategory(rows)).some((e) => e.includes("minimum 3")));
});

test("flags a trailing API suffix but not hyphenated brand names", () => {
  const rows = [
    "| [Gmail API](https://example.com/a) | Desc one | No | Yes | No |",
    "| [ip-api](https://example.com/b) | Desc two | No | Yes | No |",
    "| [weather-api](https://example.com/c) | Desc three | No | Yes | No |",
  ];
  const errors = validateReadme(withCategory(rows));
  assert.ok(errors.some((e) => e.includes('"Gmail API"')));
  assert.ok(!errors.some((e) => e.includes('"ip-api"')));
  assert.ok(!errors.some((e) => e.includes('"weather-api"')));
});

test("flags an auth value missing backticks", () => {
  const rows = [
    "| [A](https://example.com/a) | Desc one | apiKey | Yes | No |",
    "| [B](https://example.com/b) | Desc two | No | Yes | No |",
    "| [C](https://example.com/c) | Desc three | No | Yes | No |",
  ];
  assert.ok(validateReadme(withCategory(rows)).some((e) => e.includes("not enclosed in backticks")));
});

test("flags a description over 100 characters", () => {
  const rows = [
    `| [A](https://example.com/a) | ${"D".repeat(101)} | No | Yes | No |`,
    "| [B](https://example.com/b) | Desc two | No | Yes | No |",
    "| [C](https://example.com/c) | Desc three | No | Yes | No |",
  ];
  assert.ok(validateReadme(withCategory(rows)).some((e) => e.includes("should not exceed 100 characters")));
});

test("flags a duplicate name and URL entry", () => {
  const rows = [...threeValidRows(), "| [A](https://example.com/a) | Again | No | Yes | No |"];
  assert.ok(validateReadme(withCategory(rows)).some((e) => e.includes("duplicate entry")));
});

test("flags a category missing from the Index", () => {
  const readme = ["## Index", "### Animals", "|:---|:---|:---|:---|:---|", ...threeValidRows()].join("\n");
  assert.ok(validateReadme(readme).some((e) => e.includes("missing from the ## Index")));
});

test("allows a trailing empty table cell", () => {
  const rows = [
    "| [A](https://example.com/a) | Desc one | No | Yes | No | |",
    "| [B](https://example.com/b) | Desc two | No | Yes | No |",
    "| [C](https://example.com/c) | Desc three | No | Yes | No |",
  ];
  assert.ok(!validateReadme(withCategory(rows)).some((e) => e.includes("columns")));
});

test("flags a populated extra table column", () => {
  const rows = [
    "| [A](https://example.com/a) | Desc one | No | Yes | No | Extra |",
    "| [B](https://example.com/b) | Desc two | No | Yes | No |",
    "| [C](https://example.com/c) | Desc three | No | Yes | No |",
  ];
  assert.ok(validateReadme(withCategory(rows)).some((e) => e.includes("columns")));
});

test("allows promoted rows above an alphabetized organic list", () => {
  const rows = [
    "| [Zebra](https://example.com/z?utm_campaign=Public-apis-repo-Best-sellers) | Paid | No | Yes | No |",
    ...threeValidRows(),
  ];
  assert.deepEqual(validateReadme(withCategory(rows)), []);
});

test("flags a promoted row below an organic entry", () => {
  const rows = [
    "| [A](https://example.com/a) | Desc one | No | Yes | No |",
    "| [Zebra](https://example.com/z?utm_campaign=Public-apis-repo-Best-sellers) | Paid | No | Yes | No |",
    "| [B](https://example.com/b) | Desc two | No | Yes | No |",
  ];
  assert.ok(validateReadme(withCategory(rows)).some((e) => e.includes("promoted entry below organic")));
});

test("does not exempt an unrelated UTM link from alphabetical order", () => {
  const rows = [
    "| [Zebra](https://example.com/z?utm_source=public-apis) | Organic | No | Yes | No |",
    ...threeValidRows(),
  ];
  assert.ok(validateReadme(withCategory(rows)).some((e) => e.includes("not in alphabetical order")));
});
