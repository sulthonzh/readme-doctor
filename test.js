"use strict";

const { analyze, formatReport, extractHeadings } = require("./index.js");
const assert = require("assert");
const fs = require("fs");
const path = require("path");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

console.log("readme-doctor tests\n");

// -- extractHeadings --
test("extracts headings correctly", () => {
  const md = "# Title\n## Section\n### Sub\nNo heading here\n#### Deep";
  const h = extractHeadings(md);
  assert.strictEqual(h.length, 4);
  assert.strictEqual(h[0].level, 1);
  assert.strictEqual(h[0].text, "Title");
  assert.strictEqual(h[3].level, 4);
});

test("extractHeadings returns empty for no headings", () => {
  assert.strictEqual(extractHeadings("just text\nmore text").length, 0);
});

// -- Perfect README --
const perfectReadme = `# My Awesome Project

A comprehensive tool that does amazing things for developers everywhere. This project helps you build better software.

## Installation

\`\`\`bash
npm install my-awesome-project
\`\`\`

## Usage

\`\`\`js
const tool = require("my-awesome-project");
tool.doSomething();
\`\`\`

## API

### Options

| Param | Type | Description |
|-------|------|-------------|

## Contributing

PRs welcome! See CONTRIBUTING.md.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

MIT License

[![Build Status](https://travis-ci.org/example/repo.svg)](https://travis-ci.org/example/repo)
[![npm version](https://badge.fury.io/js/example.svg)](https://badge.fury.io/js/example)

- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
- [Contributing](#contributing)

More info at [docs](https://example.com/docs) and [repo](https://github.com/example/repo).
`;

test("perfect README scores high", () => {
  const r = analyze(perfectReadme);
  assert.ok(r.score >= 80, `Expected >= 80, got ${r.score}`);
  assert.ok(r.grade === "A" || r.grade === "B", `Expected A/B, got ${r.grade}`);
});

// -- Minimal README --
const minimalReadme = `# hi`;

test("minimal README scores low", () => {
  const r = analyze(minimalReadme);
  assert.ok(r.score < 40, `Expected < 40, got ${r.score}`);
  assert.strictEqual(r.grade, "F");
});

// -- Empty README --
test("empty README gets F", () => {
  const r = analyze("");
  assert.strictEqual(r.grade, "F");
  assert.ok(r.score < 20);
});

// -- Title check --
test("title check passes for H1 first", () => {
  const r = analyze("# Great Project\n\nSome description here that is decent.");
  const tc = r.checks.find(c => c.id === "title");
  assert.ok(tc.pass);
  assert.ok(!tc.partial);
});

test("title check partial for short title", () => {
  const r = analyze("# x\n\nSome description here that is decent.");
  const tc = r.checks.find(c => c.id === "title");
  assert.ok(tc.partial);
});

// -- Description --
test("description check passes for good description", () => {
  const r = analyze("# Project\n\nThis is a solid description of the project that explains what it does well.");
  const dc = r.checks.find(c => c.id === "description");
  assert.ok(dc.pass);
  assert.ok(!dc.partial);
});

test("description check fails when missing", () => {
  const r = analyze("# Project\n\n## Install");
  const dc = r.checks.find(c => c.id === "description");
  assert.ok(!dc.pass);
});

// -- Install --
test("install check detects npm in code block", () => {
  const r = analyze("# P\n\nDesc here.\n\n## Install\n\n```bash\nnpm install p\n```");
  const ic = r.checks.find(c => c.id === "install");
  assert.ok(ic.pass);
});

test("install check fails without install section or commands", () => {
  const r = analyze("# P\n\nSome description text here.");
  const ic = r.checks.find(c => c.id === "install");
  assert.ok(!ic.pass);
});

// -- Usage --
test("usage check with code blocks", () => {
  const r = analyze("# P\n\nDesc.\n\n## Usage\n\n```js\nfoo()\n```\n\n```js\nbar()\n```");
  const uc = r.checks.find(c => c.id === "usage");
  assert.ok(uc.pass);
  assert.ok(!uc.partial);
});

// -- License --
test("license check detects MIT", () => {
  const r = analyze("# P\n\nDesc.\n\n## License\n\nMIT");
  const lc = r.checks.find(c => c.id === "license");
  assert.ok(lc.pass);
});

// -- Badges --
test("badge check detects shields.io", () => {
  const md = "# P\n\n[![Build](https://img.shields.io/badge/build-passing.svg)](https://example.com)\n[![npm](https://img.shields.io/npm/v/foo.svg)](https://npmjs.com)";
  const r = analyze(md);
  const bc = r.checks.find(c => c.id === "badges");
  assert.ok(bc.pass);
});

// -- Contributing --
test("contributing check", () => {
  const r = analyze("# P\n\nDesc.\n\n## Contributing\n\nPRs welcome.");
  const cc = r.checks.find(c => c.id === "contributing");
  assert.ok(cc.pass);
});

// -- TOC --
test("TOC check detects link list", () => {
  const r = analyze("# P\n\n- [Install](#install)\n- [Usage](#usage)");
  const tc = r.checks.find(c => c.id === "toc");
  assert.ok(tc.pass);
});

// -- Links --
test("links check counts external links", () => {
  const r = analyze("# P\n\n[docs](https://example.com) [repo](https://github.com/x) [npm](https://npmjs.com/x)");
  const lc = r.checks.find(c => c.id === "links");
  assert.ok(lc.pass);
});

test("links check fails with no links", () => {
  const r = analyze("# P\n\nNo links here.");
  const lc = r.checks.find(c => c.id === "links");
  assert.ok(!lc.pass);
});

// -- Length --
test("length check passes for good length", () => {
  const lines = ["# Project", "", "Good description of the project."];
  for (let i = 0; i < 30; i++) lines.push(`Line ${i} of content here.`);
  const r = analyze(lines.join("\n"));
  const lc = r.checks.find(c => c.id === "length");
  assert.ok(lc.pass);
  assert.ok(!lc.partial);
});

// -- API docs --
test("API check detects options section", () => {
  const r = analyze("# P\n\nDesc.\n\n## Options\n\n| Name | Type |\n|------|------|");
  const ac = r.checks.find(c => c.id === "api-docs");
  assert.ok(ac.pass);
});

// -- Stats --
test("stats are populated", () => {
  const r = analyze(perfectReadme);
  assert.ok(r.stats.lines > 0);
  assert.ok(r.stats.words > 0);
  assert.ok(r.stats.headings > 0);
  assert.ok(r.stats.codeBlocks > 0);
  assert.ok(r.stats.links > 0);
});

// -- formatReport --
test("formatReport produces string", () => {
  const r = analyze(perfectReadme);
  const report = formatReport(r);
  assert.ok(typeof report === "string");
  assert.ok(report.includes("README Health"));
  assert.ok(report.includes("Grade"));
});

// -- File input --
test("analyze accepts file path", () => {
  const tmpFile = path.join("/tmp", "test-readme-doctor.md");
  fs.writeFileSync(tmpFile, "# Test\n\nA decent description of the project.\n\n## Install\n\n```bash\nnpm i\n```");
  const r = analyze(tmpFile);
  assert.ok(r.score > 30);
  fs.unlinkSync(tmpFile);
});

// -- Grade thresholds --
test("grade A is 90+", () => {
  const r = analyze(perfectReadme);
  if (r.score >= 90) assert.strictEqual(r.grade, "A");
});

test("grade F for very low score", () => {
  const r = analyze("# x");
  assert.strictEqual(r.grade, "F");
});

// Summary
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
