# Public APIs scripts

This directory contains the JavaScript tools used to validate `README.md`, check links, and generate the JSON API files. The tools use Node.js built-ins and have no package dependencies.

## Commands

Run these commands from the repository root:

```bash
npm test
npm run validate -- README.md
npm run check-links -- README.md
npm run generate -- README.md dist
```

To check only for duplicate links, without making HTTP requests to every API:

```bash
npm run check-links -- README.md --duplicates-only
```

## Files

- `validate.js` validates the README category tables.
- `validate-pr-readme.js` reports validation errors only for README lines changed by a pull request.
- `check-links.js` checks duplicate and unreachable links.
- `check-pr-links.js` checks links added by a pull request.
- `generate.js` writes `apis.json`, `apis.min.json`, and `category.json`.
- `links.js` and `row-parser.js` contain shared parsing and validation helpers.
- `tests/` contains the Node test suite.

GitHub Actions runs Node tests and diff-aware README validation for pull requests. A scheduled workflow checks all README links.
