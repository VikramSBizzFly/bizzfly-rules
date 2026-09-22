#!/usr/bin/env node
// /bizzfly-rules:update — refresh the BizzFly marketplace and update every
// installed BizzFly plugin, then show old -> new versions. Uses the `claude` CLI.
//   node scripts/update.js
'use strict';
const { spawnSync } = require('child_process');

const REPO = 'vikramsbizzfly/bizzfly-marketplace';
const LEGACY_REPO = 'vikramsbizzfly/testwright';

function claude(...args) {
  // Windows needs a shell to find claude.cmd/.exe; every argument is a plain
  // name, id or flag, so one validated command line is safe to hand it.
  if (!args.every((a) => /^[\w@.:-]+$/.test(a))) fail(`refusing unexpected argument in: ${args.join(' ')}`);
  const r = process.platform === 'win32'
    ? spawnSync(['claude', ...args].join(' '), { encoding: 'utf8', shell: true })
    : spawnSync('claude', args, { encoding: 'utf8' });
  if (r.error) fail(`could not run the claude CLI (${r.error.code}). Is it on PATH?`);
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}
function json(...args) {
  const r = claude(...args);
  try { return JSON.parse(r.out); } catch { fail(`\`claude ${args.join(' ')}\` failed: ${r.err || r.out}`); }
}
function fail(msg) { console.error(`bizzfly-rules update: ${msg}`); process.exit(1); }

// Find the marketplace by its repo, not its name, so a renamed local copy still counts.
const markets = json('plugin', 'marketplace', 'list', '--json');
const market = markets.find((m) => (m.repo || '').toLowerCase() === REPO);
const legacy = markets.find((m) => (m.repo || '').toLowerCase() === LEGACY_REPO);
if (!market) {
  fail('the BizzFly marketplace is not added. Run:\n' +
    (legacy ? `  /plugin marketplace remove ${legacy.name}\n` : '') +
    '  /plugin marketplace add VikramSBizzFly/bizzfly-marketplace');
}

const r = claude('plugin', 'marketplace', 'update', market.name);
if (!r.ok) fail(`could not refresh the ${market.name} marketplace: ${r.err || r.out}`);

// Exact, case-sensitive: plugins from the old "bizzfly" marketplace must not match "BizzFly".
const mine = (list) => list.filter((p) => p.id.endsWith(`@${market.name}`));
const before = mine(json('plugin', 'list', '--json'));
if (!before.length) fail(`no ${market.name} plugins are installed.`);

const failed = [];
for (const p of before) {
  const u = claude('plugin', 'update', p.id, '--scope', p.scope);
  if (!u.ok) failed.push(`${p.id}: ${u.err || u.out}`);
}

const after = mine(json('plugin', 'list', '--json'));
const rows = before.map((p) => {
  const now = after.find((a) => a.id === p.id && a.scope === p.scope) || p;
  const changed = now.version !== p.version;
  return `${changed ? 'updated ' : 'current '} ${p.id.padEnd(32)} ${changed ? `${p.version} -> ${now.version}` : p.version}  (${p.scope})`;
});

console.log(`bizzfly-rules update: ${market.name} marketplace refreshed\n\n${rows.join('\n')}`);
if (failed.length) console.log(`\nFailed:\n  ${failed.join('\n  ')}`);
if (rows.some((row) => row.startsWith('updated'))) console.log('\nRestart Claude Code to use the new versions.');
if (legacy) {
  console.log(`\nYou still have the old "${legacy.name}" marketplace (${legacy.repo}). It no longer ` +
    'has a catalog and cannot update. Remove it, and reinstall anything you had from it:\n' +
    `  /plugin marketplace remove ${legacy.name}\n  /plugin install testwright@${market.name}`);
}
if (failed.length) process.exit(1);
