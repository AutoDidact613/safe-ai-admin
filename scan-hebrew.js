/**
 * scan-hebrew.js
 *
 * Scans the client/src directory for hardcoded Hebrew text in .tsx/.ts files
 * and prints a report grouped by file, with line numbers and the matched text.
 *
 * This does NOT translate or modify anything — it only finds candidates
 * for translation, so you know exactly where remaining work is.
 *
 * Usage (from the project root, e.g. SafeAI-613):
 *   node scan-hebrew.js
 *
 * Optional: pass a different root folder to scan:
 *   node scan-hebrew.js client/src/pages
 */

const fs = require("fs");
const path = require("path");

// Matches any run of Hebrew letters (with spaces/punctuation allowed inside)
const HEBREW_REGEX = /[\u0590-\u05FF][\u0590-\u05FF\s.,!?:;'"()%\-]*[\u0590-\u05FF]|[\u0590-\u05FF]/g;

// Lines/patterns we want to ignore (comments, imports, technical strings)
const IGNORE_LINE_PATTERNS = [
  /^\s*\/\//,               // single-line comments
  /^\s*\*/,                  // block comment continuation
  /^\s*\/\*/,                // block comment start
  /^\s*\{\s*\/\*/,           // JSX comments: {/* ... */}
  /console\.(log|error|warn|info)/, // console statements
];

const TARGET_EXTENSIONS = [".tsx", ".ts"];
const DEFAULT_ROOT = path.join("client", "src");
const EXCLUDED_DIRS = new Set(["node_modules", "i18n", "dist", "build", ".git"]);

function shouldIgnoreLine(line) {
  return IGNORE_LINE_PATTERNS.some((pattern) => pattern.test(line));
}

function walk(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        walk(path.join(dir, entry.name), fileList);
      }
    } else if (TARGET_EXTENSIONS.includes(path.extname(entry.name))) {
      fileList.push(path.join(dir, entry.name));
    }
  }
  return fileList;
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const matches = [];

  lines.forEach((line, index) => {
    if (shouldIgnoreLine(line)) return;

    const found = line.match(HEBREW_REGEX);
    if (found && found.length > 0) {
      // Merge adjacent short matches into a cleaner snippet for readability
      const snippet = line.trim().slice(0, 120);
      matches.push({
        lineNumber: index + 1,
        snippet,
      });
    }
  });

  return matches;
}

function main() {
  const rootArg = process.argv[2] || DEFAULT_ROOT;
  const resolvedRoot = path.resolve(process.cwd(), rootArg);

  if (!fs.existsSync(resolvedRoot)) {
    console.error(`❌ Path not found: ${resolvedRoot}`);
    console.error(`   Run this script from your project root (e.g. SafeAI-613),`);
    console.error(`   or pass a valid path, e.g.: node scan-hebrew.js client/src/pages`);
    process.exit(1);
  }

  const files = walk(resolvedRoot);
  let totalMatches = 0;
  let filesWithMatches = 0;

  console.log(`\n🔎 Scanning ${files.length} file(s) under ${rootArg} for hardcoded Hebrew text...\n`);

  for (const file of files) {
    const matches = scanFile(file);
    if (matches.length > 0) {
      filesWithMatches += 1;
      totalMatches += matches.length;
      const relativePath = path.relative(process.cwd(), file);
      console.log(`📄 ${relativePath}`);
      matches.forEach((m) => {
        console.log(`   line ${m.lineNumber}: ${m.snippet}`);
      });
      console.log("");
    }
  }

  console.log("──────────────────────────────────────────");
  if (totalMatches === 0) {
    console.log("✅ No hardcoded Hebrew text found. Great job!");
  } else {
    console.log(`⚠️  Found ${totalMatches} line(s) with Hebrew text across ${filesWithMatches} file(s).`);
    console.log("   Review each one: some may already use t(\"...\") with Hebrew");
    console.log("   fallback text inside comments, or be legitimately hardcoded");
    console.log("   (e.g. inside a JSON default, a data-testid, etc.) — use judgment.");
  }
  console.log("──────────────────────────────────────────\n");
}

main();