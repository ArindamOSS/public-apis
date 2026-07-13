"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { findLinksInText, checkDuplicateLinks, getHostFromLink } = require("../links");
const { extractAddedLines } = require("../check-pr-links");

test("finds links in text", () => {
  const text = "| [Cats](https://example.com/cats) | Pictures | No | Yes | No |";
  assert.deepEqual(findLinksInText(text), ["https://example.com/cats"]);
});

test("flags the second occurrence of a duplicate link, ignoring trailing slash", () => {
  const links = ["https://a.com", "https://a.com/", "https://b.com"];
  const { hasDuplicates, duplicates } = checkDuplicateLinks(links);
  assert.equal(hasDuplicates, true);
  assert.deepEqual(duplicates, ["https://a.com"]);
});

test("does not flag links that only appear once", () => {
  const links = ["https://a.com", "https://b.com"];
  const { hasDuplicates } = checkDuplicateLinks(links);
  assert.equal(hasDuplicates, false);
});

test("extracts the host from a link", () => {
  assert.equal(getHostFromLink("https://example.com/path?x=1"), "example.com");
  assert.equal(getHostFromLink("example.com/path"), "example.com");
});

test("extractAddedLines only keeps real additions, not the +++ file header", () => {
  const diff = [
    "--- a/README.md",
    "+++ b/README.md",
    "@@ -1,2 +1,3 @@",
    " unchanged line",
    "+| [New](https://example.com/new) | Desc | No | Yes | No |",
    "-| [Old](https://example.com/old) | Desc | No | Yes | No |",
  ].join("\n");

  const added = extractAddedLines(diff);
  assert.deepEqual(added, ["| [New](https://example.com/new) | Desc | No | Yes | No |"]);
});
