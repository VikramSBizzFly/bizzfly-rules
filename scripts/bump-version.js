#!/usr/bin/env node
// Maintainer tool, not a hook: bump the version in plugin.json and turn the
// CHANGELOG's [Unreleased] section into a dated release.
//   node scripts/bump-version.js <major|minor|patch|X.Y.Z>
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MANIFEST = path.join(ROOT, '.claude-plugin', 'plugin.json');
const CHANGELOG = path.join(ROOT, 'CHANGELOG.md');
const REPO = 'https://github.com/VikramSBizzFly/bizzfly-rules';

const arg = process.argv[2];
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const [maj, min, pat] = manifest.version.split('.').map(Number);
const next = { major: `${maj + 1}.0.0`, minor: `${maj}.${min + 1}.0`, patch: `${maj}.${min}.${pat + 1}` }[arg]
  || (/^\d+\.\d+\.\d+$/.test(arg || '') ? arg : null);
if (!next) {
  console.error('usage: node scripts/bump-version.js <major|minor|patch|X.Y.Z>');
  process.exit(1);
}

let log = fs.readFileSync(CHANGELOG, 'utf8');
const unreleased = log.match(/## \[Unreleased\]\n([\s\S]*?)(?=\n## \[)/);
if (!unreleased || !unreleased[1].trim()) {
  console.error('CHANGELOG.md: add what changed under "## [Unreleased]" first.');
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
log = log
  .replace('## [Unreleased]\n', `## [Unreleased]\n\n## [${next}] - ${today}\n`)
  .replace(/^\[Unreleased\]: .*$/m,
    `[Unreleased]: ${REPO}/compare/v${next}...HEAD\n[${next}]: ${REPO}/compare/v${manifest.version}...v${next}`);
fs.writeFileSync(CHANGELOG, log);

manifest.version = next;
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');

console.log(`${arg === next ? '' : `${arg}: `}${maj}.${min}.${pat} -> ${next}`);
console.log(`Next: git commit -am "Release ${next}" && git tag v${next} && git push --follow-tags`);
