#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');

console.log('\x1b[1m\x1b[36m====================================================\x1b[0m');
console.log('\x1b[1m\x1b[36m  Tenvi / Bili UI/UX & Responsiveness Audit Agent   \x1b[0m');
console.log('\x1b[1m\x1b[36m====================================================\x1b[0m\n');

function getAllFiles(dir, exts = ['.tsx', '.ts', '.css']) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(filePath, exts));
    } else {
      const ext = path.extname(file);
      if (exts.includes(ext)) {
        results.push(filePath);
      }
    }
  }
  return results;
}

const files = getAllFiles(srcDir);
const issues = [];

files.forEach((filePath) => {
  const relPath = path.relative(rootDir, filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // 1. Check for fixed bottom elements without mobile clearance (bottom-6 without sm:bottom-6 or bottom-20)
    if (
      line.includes('fixed bottom-') &&
      !line.includes('bottom-0') &&
      !line.includes('bottom-20') &&
      !line.includes('inset-0') &&
      !relPath.includes('audit_ui')
    ) {
      if (!line.includes('sm:bottom-') && !line.includes('md:bottom-')) {
        issues.push({
          severity: 'HIGH',
          file: relPath,
          line: lineNum,
          rule: 'fixed-bottom-overlap',
          message: 'Fixed bottom element may collide with mobile bottom navigation bar (~64px height). Use "bottom-20 sm:bottom-6" for proper mobile clearance.',
          snippet: line.trim(),
        });
      }
    }

    // 2. Check for absolute close button collision in modal headers
    if (
      relPath.includes('components/Forms') &&
      line.includes('absolute top-') &&
      line.includes('right-')
    ) {
      // Check if subsequent lines or enclosing div has header with pr-10 or pr-12
      const surrounding = lines.slice(Math.max(0, idx - 5), Math.min(lines.length, idx + 15)).join('\n');
      if (surrounding.includes('<h2') && !surrounding.includes('pr-10') && !surrounding.includes('pr-12')) {
        issues.push({
          severity: 'MEDIUM',
          file: relPath,
          line: lineNum,
          rule: 'modal-close-overlap',
          message: 'Modal header lacks right padding (e.g. "pr-10 sm:pr-12") to prevent long titles or subtitles from running under the absolute close button.',
          snippet: line.trim(),
        });
      }
    }

    // 3. Check for z-index conflicts between mobile nav, chat, and modals
    if (relPath.includes('MobileNav.tsx') && line.includes('z-50')) {
      issues.push({
        severity: 'MEDIUM',
        file: relPath,
        line: lineNum,
        rule: 'mobile-nav-z-index',
        message: 'MobileNav uses z-50 which can compete with modal dialogs. Recommend z-40 so modals (z-[60]) sit on top.',
        snippet: line.trim(),
      });
    }

    // 4. Check for hardcoded multi-column grids missing mobile breakpoints
    const rawMultiGridMatch = line.match(/(?<![a-z0-9:-])grid-cols-(?:[3-9]|1[0-2])(?![a-z0-9:-])/);
    if (
      rawMultiGridMatch &&
      !line.includes('grid-cols-1') &&
      !line.includes('grid-cols-2') &&
      !line.includes('sm:grid-cols-') &&
      !line.includes('md:grid-cols-') &&
      !line.includes('hidden') &&
      !line.includes('col-span-') &&
      !relPath.includes('Calendar') &&
      !relPath.includes('node_modules')
    ) {
      if (!line.includes('gap-1') && !line.includes('text-center p-1')) {
        issues.push({
          severity: 'LOW',
          file: relPath,
          line: lineNum,
          rule: 'unresponsive-grid-cols',
          message: 'Multi-column grid lacks mobile breakpoint (e.g. grid-cols-1 sm:grid-cols-3) which may cramp content on 360-390px screens.',
          snippet: line.trim(),
        });
      }
    }

    // 5. Check for fixed pixel widths exceeding mobile screen size
    const fixedWidthMatch = line.match(/w-\[(\d+)px\]/);
    if (fixedWidthMatch) {
      const widthVal = parseInt(fixedWidthMatch[1], 10);
      if (widthVal > 340 && !line.includes('max-w-') && !line.includes('sm:') && !line.includes('md:')) {
        issues.push({
          severity: 'HIGH',
          file: relPath,
          line: lineNum,
          rule: 'rigid-fixed-width',
          message: `Fixed width of ${widthVal}px without max-w constraint or responsive prefix may cause horizontal overflow on mobile viewports.`,
          snippet: line.trim(),
        });
      }
    }
  });
});

console.log(`Audited ${files.length} source files across "src/".\n`);

if (issues.length === 0) {
  console.log('\x1b[32m✔ All UI/UX responsiveness and overlap checks passed with zero defects!\x1b[0m\n');
  process.exit(0);
} else {
  console.log(`\x1b[33mFound ${issues.length} potential layout/responsiveness issue(s):\x1b[0m\n`);

  issues.forEach((issue, index) => {
    const color =
      issue.severity === 'HIGH'
        ? '\x1b[31m'
        : issue.severity === 'MEDIUM'
        ? '\x1b[33m'
        : '\x1b[36m';
    console.log(
      `${index + 1}. [${color}${issue.severity}\x1b[0m] \x1b[1m${issue.rule}\x1b[0m in \x1b[4m${issue.file}:${issue.line}\x1b[0m`
    );
    console.log(`   Message: ${issue.message}`);
    console.log(`   Snippet: \x1b[90m${issue.snippet}\x1b[0m\n`);
  });

  const highSeverity = issues.filter((i) => i.severity === 'HIGH');
  if (highSeverity.length > 0) {
    console.log(`\x1b[31m✘ ${highSeverity.length} HIGH severity issue(s) need resolution.\x1b[0m\n`);
    process.exit(1);
  } else {
    console.log(`\x1b[32m✔ No blocking HIGH severity issues found.\x1b[0m\n`);
    process.exit(0);
  }
}
