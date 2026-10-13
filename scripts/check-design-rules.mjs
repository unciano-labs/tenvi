#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ALLOWLIST_PATH = path.resolve(process.cwd(), "design-rules-allowlist.json");
const SRC_DIR = path.resolve(process.cwd(), "src");

// Allowed exceptions for border patterns in non-allowlisted files
const ALLOWED_BORDER_PATTERNS = new Set([
  "border-0",
  "border-transparent",
  "border-none",
  "border-collapse",
  "border-box",
]);

// Regular expressions for banned patterns
// Matches classes like border, border-2, border-slate-200, border-t, border-[1px], etc.
const BORDER_REGEX = /\bborder(-[a-z0-9\[\]/#-]+)?\b/g;
const DIVIDE_REGEX = /\bdivide-[a-z0-9\[\]/#-]+\b/g;
const GRADIENT_REGEX = /\b(?:bg-)?gradient(-[a-z0-9\[\]/#-]+)?\b/g;

// Load allowlist
let allowlist = {};
if (fs.existsSync(ALLOWLIST_PATH)) {
  try {
    const raw = fs.readFileSync(ALLOWLIST_PATH, "utf8");
    const parsed = JSON.parse(raw);
    allowlist = parsed.allowlist || {};
  } catch (err) {
    console.error("Error reading design-rules-allowlist.json:", err.message);
    process.exit(1);
  }
}

function walkDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, fileList);
    } else if (/\.(ts|tsx|css)$/.test(entry.name)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const files = walkDir(SRC_DIR);
let totalViolations = 0;
const violationsByFile = new Map();

for (const absolutePath of files) {
  const relativePath = path.relative(process.cwd(), absolutePath).replace(/\\/g, "/");

  // Check if file is in allowlist
  if (allowlist[relativePath]) {
    continue;
  }

  const content = fs.readFileSync(absolutePath, "utf8");
  const lines = content.split("\n");

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();
    // Skip single-line comments in ts/tsx/css
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
      return;
    }

    // Check borders
    const borderMatches = line.match(BORDER_REGEX);
    if (borderMatches) {
      for (const match of borderMatches) {
        if (!ALLOWED_BORDER_PATTERNS.has(match)) {
          // Ignore CSS properties and variable names like border-radius, --border-radius, --normal-border, box-sizing: border-box
          if (
            line.includes("--border") ||
            line.includes("--normal-border") ||
            line.includes("box-sizing: border-box") ||
            line.includes("border-radius")
          ) {
            continue;
          }
          recordViolation(relativePath, lineIndex + 1, "BORDER", match, line);
        }
      }
    }

    // Check divide-*
    const divideMatches = line.match(DIVIDE_REGEX);
    if (divideMatches) {
      for (const match of divideMatches) {
        recordViolation(relativePath, lineIndex + 1, "DIVIDE", match, line);
      }
    }

    // Check gradients
    const gradientMatches = line.match(GRADIENT_REGEX);
    if (gradientMatches) {
      for (const match of gradientMatches) {
        recordViolation(relativePath, lineIndex + 1, "GRADIENT", match, line);
      }
    }
  });
}

function recordViolation(file, lineNumber, type, match, lineContent) {
  totalViolations++;
  if (!violationsByFile.has(file)) {
    violationsByFile.set(file, []);
  }
  violationsByFile.get(file).push({ lineNumber, type, match, lineContent: lineContent.trim() });
}

console.log("====================================================");
console.log("  Tenvi Design Rules Enforcement Guard (TNV-004)   ");
console.log("====================================================");
console.log(`Audited ${files.length} source files under src/ (Allowlisted: ${Object.keys(allowlist).length})\n`);

if (totalViolations > 0) {
  console.error(`❌ FAILED: Found ${totalViolations} design rule violation(s) outside allowlist:\n`);
  for (const [file, items] of violationsByFile.entries()) {
    console.error(`📄 ${file}:`);
    for (const item of items) {
      console.error(`   Line ${item.lineNumber} [${item.type}]: Banned "${item.match}" in: ${item.lineContent}`);
    }
    console.error("");
  }
  console.error("Policy Reminders (ADR 0001):");
  console.error("1. Tenvi bans decorative borders: use tonal background wells and shadows instead.");
  console.error("2. Tenvi bans gradients: use solid curated color tokens.");
  console.error("3. If this file is a legacy view pending refactor, add it with justification to design-rules-allowlist.json.\n");
  process.exit(1);
} else {
  console.log("✔ SUCCESS: Zero banned borders, dividing lines, or gradients detected outside allowlist.");
  process.exit(0);
}
