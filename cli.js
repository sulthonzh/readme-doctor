#!/usr/bin/env node
"use strict";

const { analyze, formatReport } = require("./index.js");
const path = require("path");
const fs = require("fs");

const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log(`readme-doctor — diagnose and score your README.md

Usage:
  readme-doctor              Analyze README.md in current directory
  readme-doctor <file>       Analyze a specific file
  readme-doctor --json       Output as JSON
  readme-doctor --ci <min>   Exit 1 if score is below <min> (default: 50)

Examples:
  readme-doctor
  readme-doctor docs/README.md
  readme-doctor --json
  readme-doctor --ci 70`);
  process.exit(0);
}

let filePath = "README.md";
let jsonOutput = false;
let ciThreshold = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--json") jsonOutput = true;
  else if (args[i] === "--ci") ciThreshold = parseInt(args[++i]) || 50;
  else if (!args[i].startsWith("--")) filePath = args[i];
}

const resolved = path.resolve(filePath);
if (!fs.existsSync(resolved)) {
  console.error(`File not found: ${resolved}`);
  process.exit(1);
}

const result = analyze(resolved);

if (jsonOutput) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Analyzing: ${path.basename(resolved)}`);
  console.log("");
  console.log(formatReport(result));
}

if (ciThreshold !== null && result.score < ciThreshold) {
  console.error(`\nCI: Score ${result.score} is below threshold ${ciThreshold}`);
  process.exit(1);
}
