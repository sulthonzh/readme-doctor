# readme-doctor

Diagnose and score your README.md — get actionable health checks and a letter grade.

You know that feeling when you start a new project, ship it, and realize your README is just `# my-project`? Yeah. readme-doctor catches that.

## Installation

```bash
npm install readme-doctor
```

## Usage

### CLI

```bash
# Analyze README.md in current directory
readme-doctor

# Analyze a specific file
readme-doctor docs/README.md

# Output as JSON
readme-doctor --json

# CI mode — fail if score below threshold
readme-doctor --ci 70
```

### Programmatic

```js
const { analyze, formatReport } = require("readme-doctor");

const result = analyze("./README.md");
console.log(formatReport(result));

// Or analyze raw markdown
const result2 = analyze("# My Project\n\nA cool thing.");
console.log(`Score: ${result2.score}/100, Grade: ${result2.grade}`);
```

## What It Checks

| Check | Weight | What it looks for |
|-------|--------|-------------------|
| Title | 10 | H1 heading, proper length |
| Description | 10 | Paragraph after title |
| Installation | 10 | Install section or commands |
| Usage | 12 | Examples with code blocks |
| License | 8 | License section or name |
| Contributing | 6 | Contributing guide |
| Badges | 4 | CI/build status indicators |
| TOC | 3 | Table of contents |
| Links | 5 | External references |
| Changelog | 4 | Version/release history |
| Length | 8 | Not too short, not too long |
| API Docs | 5 | Options/config/methods section |

**Total: 85 points → letter grade A through F**

Partial credit: if something exists but could be better, you get ~60% of the weight.

## Grading Scale

| Grade | Score |
|-------|-------|
| A 🟢 | 90–100 |
| B 🟡 | 80–89 |
| C 🟠 | 65–79 |
| D 🔴 | 45–64 |
| F 💀 | 0–44 |

## CI Integration

Use `--ci <threshold>` to fail the build if your README score drops:

```bash
readme-doctor --ci 70
# Exits with code 1 if score < 70
```

Works in GitHub Actions, GitLab CI, or any CI that respects exit codes.

## Output Example

```
Analyzing: README.md

README Health: 82/100 🟡 Grade B

Lines: 94 | Words: 412 | Headings: 8 | Code blocks: 5 | Links: 6

Checks:
  ✓ [10/10] Has a top-level title
      Title: "readme-doctor"
  ✓ [10/10] Has a description
      Description found (67 chars).
  ...
  ✗ [0/4] References changelog or versioning
      No changelog/release section.

Suggestions:
  → No changelog/release section.
```

## Why?

Because READMEs matter. They're the first thing people see, and a bad README is a red flag. readme-doctor gives you a quick, honest assessment — not just "is it there?" but "is it good enough?"

Zero dependencies. Works with Node 16+.

## License

MIT
