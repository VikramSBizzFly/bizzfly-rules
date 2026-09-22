#!/usr/bin/env node
// /bizzfly-rules:apply — set up a project for rules 2 and 3: create .claude/tmp/
// and .claude/memory/MEMORY.md, and list both folders in .gitignore. Idempotent:
// only adds what is missing, never rewrites or removes anything.
//   node scripts/apply.js [project-dir]
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || process.env.CLAUDE_PROJECT_DIR || process.cwd());
const DIRS = ['.claude/tmp/', '.claude/memory/'];
const report = [];

for (const dir of DIRS) {
  const abs = path.join(root, dir);
  if (fs.existsSync(abs)) report.push(`ok       ${dir}`);
  else { fs.mkdirSync(abs, { recursive: true }); report.push(`created  ${dir}`); }
}

const index = path.join(root, '.claude', 'memory', 'MEMORY.md');
if (fs.existsSync(index)) report.push('ok       .claude/memory/MEMORY.md');
else {
  fs.writeFileSync(index, '# Memory\n\nOne line per memory file: `- [Title](file.md) — hook`.\n');
  report.push('created  .claude/memory/MEMORY.md');
}

// A .gitignore line covers a folder if it names it, or names .claude itself.
const gitignore = path.join(root, '.gitignore');
const text = fs.existsSync(gitignore) ? fs.readFileSync(gitignore, 'utf8') : null;
const norm = (line) => line.trim().replace(/^\//, '').replace(/\/\*{0,2}$/, '');
const lines = new Set((text || '').split(/\r?\n/).map(norm));
const missing = DIRS.filter((d) => !lines.has(norm(d)) && !lines.has('.claude'));

if (missing.length) {
  const eol = text && text.includes('\r\n') ? '\r\n' : '\n';
  const lead = text && !text.endsWith('\n') ? eol : '';
  fs.appendFileSync(gitignore, lead + missing.join(eol) + eol);
  for (const d of missing) report.push(`added    ${d} to .gitignore${text === null ? ' (new file)' : ''}`);
} else {
  report.push('ok       .gitignore already lists both folders');
}

console.log(`bizzfly-rules apply: ${root}\n\n${report.join('\n')}`);
