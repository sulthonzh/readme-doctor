"use strict";

const fs = require("fs");
const path = require("path");

function extractHeadings(md) {
  const re = /^(\s{0,3})(#{1,6})\s+(.+)$/gm;
  const headings = [];
  let m;
  while ((m = re.exec(md)) !== null) {
    headings.push({ level: m[2].length, text: m[3].trim() });
  }
  return headings;
}

function findSection(headings, patterns) {
  return headings.some(h => patterns.some(p => p.test(h.text.toLowerCase())));
}

const checks = [
  {
    id: "title", name: "Has a top-level title", weight: 10,
    run(md, headings) {
      const h1s = headings.filter(h => h.level === 1);
      if (h1s.length === 0) return { pass: false, message: "No H1 (# title) found." };
      if (headings[0].level !== 1) return { pass: true, partial: true, message: "H1 exists but isn't the first heading." };
      const title = h1s[0].text;
      if (title.length < 3) return { pass: true, partial: true, message: `Title "${title}" is too short.` };
      return { pass: true, message: `Title: "${title}"` };
    }
  },
  {
    id: "description", name: "Has a description", weight: 10,
    run(md) {
      const lines = md.split("\n");
      let pastTitle = false;
      let desc = "";
      for (const line of lines) {
        if (/^#\s/.test(line)) { pastTitle = true; continue; }
        if (pastTitle && line.trim() && !line.startsWith("#") && !line.startsWith("![") && !line.startsWith("[!")) {
          desc = line.trim();
          break;
        }
      }
      if (!desc) return { pass: false, message: "No description found after title." };
      if (desc.length < 20) return { pass: true, partial: true, message: `Description is short (${desc.length} chars).` };
      return { pass: true, message: `Description found (${desc.length} chars).` };
    }
  },
  {
    id: "install", name: "Has installation instructions", weight: 10,
    run(md, headings) {
      const has = findSection(headings, [/install/, /getting started/, /setup/, /quick start/]);
      const hasCmd = /```/.test(md) && /npm|yarn|pnpm|pip|cargo|go install|brew|make|cmake/.test(md);
      if (!has && !hasCmd) return { pass: false, message: "No installation section or commands found." };
      if (!has) return { pass: true, partial: true, message: "Install commands found but no dedicated section." };
      return { pass: true, message: "Installation section found." };
    }
  },
  {
    id: "usage", name: "Has usage examples", weight: 12,
    run(md, headings) {
      const has = findSection(headings, [/usage/, /example/, /quickstart/, /quick start/, /how to/, /getting started/]);
      const codeBlocks = (md.match(/```[\s\S]*?```/g) || []).length;
      if (!has && codeBlocks === 0) return { pass: false, message: "No usage section or code examples." };
      if (codeBlocks < 2) return { pass: true, partial: true, message: `Only ${codeBlocks} code block(s). Add more examples.` };
      return { pass: true, message: `Usage section with ${codeBlocks} code blocks.` };
    }
  },
  {
    id: "license", name: "Mentions license", weight: 8,
    run(md, headings) {
      const has = findSection(headings, [/license/, /licenc/]);
      const mentions = /\bMIT\b|\bApache\b|\bGPL\b|\bBSD\b|\bISC\b|\bLGPL\b|\bMPL\b|\bUnlicense\b|\bCC0\b/i.test(md);
      if (!has && !mentions) return { pass: false, message: "No license section or name found." };
      if (!has) return { pass: true, partial: true, message: "License mentioned but no dedicated section." };
      return { pass: true, message: "License section found." };
    }
  },
  {
    id: "contributing", name: "Has contributing guide", weight: 6,
    run(md, headings) {
      const has = findSection(headings, [/contribut/, /develop/, /building/]);
      if (!has) return { pass: false, message: "No contributing section found." };
      return { pass: true, message: "Contributing section found." };
    }
  },
  {
    id: "badges", name: "Has badges or status indicators", weight: 4,
    run(md) {
      const badgeCount = (md.match(/\[!\[.*?\]\(.*?\)\]\(.*?\)|!\[.*?\]\(https:\/\/.*?(badge|shield|travis|github|circleci|codecov|coveralls).*?\)/gi) || []).length;
      if (badgeCount === 0) return { pass: false, message: "No badges found. Add CI/build status." };
      if (badgeCount < 2) return { pass: true, partial: true, message: `${badgeCount} badge. More would help.` };
      return { pass: true, message: `${badgeCount} badges found.` };
    }
  },
  {
    id: "toc", name: "Has table of contents", weight: 3,
    run(md) {
      const hasTOC = /table of contents/i.test(md) || /^\s*- \[.*\]\(#.*\)/m.test(md);
      if (!hasTOC) return { pass: false, message: "No table of contents." };
      return { pass: true, message: "Table of contents found." };
    }
  },
  {
    id: "links", name: "Has relevant links", weight: 5,
    run(md) {
      const links = (md.match(/\[.*?\]\(https?:\/\/.*?\)/g) || []).length;
      if (links === 0) return { pass: false, message: "No links found." };
      if (links < 3) return { pass: true, partial: true, message: `${links} link(s). Add more references.` };
      return { pass: true, message: `${links} links found.` };
    }
  },
  {
    id: "changelog", name: "References changelog or versioning", weight: 4,
    run(md, headings) {
      const has = findSection(headings, [/changelog/, /history/, /version/, /release/]);
      if (!has) return { pass: false, message: "No changelog/release section." };
      return { pass: true, message: "Changelog section found." };
    }
  },
  {
    id: "length", name: "Appropriate length", weight: 8,
    run(md) {
      const lines = md.split("\n").filter(l => l.trim()).length;
      if (lines < 10) return { pass: false, message: `Only ${lines} non-empty lines. Too sparse.` };
      if (lines < 25) return { pass: true, partial: true, message: `${lines} lines — could be more thorough.` };
      if (lines > 500) return { pass: true, partial: true, message: `${lines} lines — consider splitting into docs/.` };
      return { pass: true, message: `${lines} lines — good length.` };
    }
  },
  {
    id: "api-docs", name: "Has API documentation", weight: 5,
    run(md, headings) {
      const has = findSection(headings, [/api/, /options/, /configuration/, /config/, /methods/, /function/, /interface/, /params/]);
      if (!has) return { pass: false, message: "No API/options/configuration section." };
      return { pass: true, message: "API documentation section found." };
    }
  }
];

function analyze(input) {
  let md;
  if (fs.existsSync(input)) {
    md = fs.readFileSync(input, "utf8");
  } else {
    md = input;
  }

  const headings = extractHeadings(md);
  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  let earned = 0;
  const results = [];

  for (const check of checks) {
    const result = check.run(md, headings);
    let score = 0;
    if (result.pass && !result.partial) score = check.weight;
    else if (result.pass && result.partial) score = Math.round(check.weight * 0.6);
    earned += score;
    results.push({ id: check.id, name: check.name, weight: check.weight, score, ...result });
  }

  const percentage = Math.round((earned / totalWeight) * 100);
  let grade;
  if (percentage >= 90) grade = "A";
  else if (percentage >= 80) grade = "B";
  else if (percentage >= 65) grade = "C";
  else if (percentage >= 45) grade = "D";
  else grade = "F";

  return {
    score: percentage, grade, maxWeight: totalWeight, earnedWeight: earned,
    checks: results,
    stats: {
      lines: md.split("\n").length,
      words: md.split(/\s+/).filter(Boolean).length,
      headings: headings.length,
      codeBlocks: (md.match(/```[\s\S]*?```/g) || []).length,
      links: (md.match(/\[.*?\]\(https?:\/\/.*?\)/g) || []).length
    }
  };
}

function formatReport(result) {
  const lines = [];
  const { score, grade, checks: results, stats } = result;
  const gradeEmoji = { A: "🟢", B: "🟡", C: "🟠", D: "🔴", F: "💀" };
  lines.push(`README Health: ${score}/100 ${gradeEmoji[grade]} Grade ${grade}`);
  lines.push("");
  lines.push(`Lines: ${stats.lines} | Words: ${stats.words} | Headings: ${stats.headings} | Code blocks: ${stats.codeBlocks} | Links: ${stats.links}`);
  lines.push("");
  lines.push("Checks:");
  for (const r of results) {
    const icon = !r.pass ? "✗" : r.partial ? "~" : "✓";
    const scoreStr = r.pass ? `${r.score}/${r.weight}` : `0/${r.weight}`;
    lines.push(`  ${icon} [${scoreStr}] ${r.name}`);
    lines.push(`      ${r.message}`);
  }
  const failed = results.filter(r => !r.pass);
  if (failed.length > 0) {
    lines.push("");
    lines.push("Suggestions:");
    for (const f of failed) lines.push(`  → ${f.message}`);
  }
  return lines.join("\n");
}

module.exports = { analyze, formatReport, checks, extractHeadings };
