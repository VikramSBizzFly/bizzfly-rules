#!/usr/bin/env node
// /bizzfly-rules:update — refresh the BizzFly marketplace and update the
// bizzfly-rules plugin (and with it rules.md), then show old -> new version.
// Other BizzFly plugins are left alone. Uses the `claude` CLI.
//   node scripts/update.js
'use strict';
const { spawnSync } = require('child_process');

const REPO = 'vikramsbizzfly/bizzfly-marketplace';
const PLUGIN = 'bizzfly-rules';

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
const market = json('plugin', 'marketplace', 'list', '--json')
  .find((m) => (m.repo || '').toLowerCase() === REPO);
if (!market) fail('the BizzFly marketplace is not added. Run:\n  /plugin marketplace add VikramSBizzFly/bizzfly-marketplace');

const id = `${PLUGIN}@${market.name}`;
const installed = (list) => list.filter((p) => p.id === id);
const before = installed(json('plugin', 'list', '--json'));
if (!before.length) fail(`${id} is not installed.`);

const r = claude('plugin', 'marketplace', 'update', market.name);
if (!r.ok) fail(`could not refresh the ${market.name} marketplace: ${r.err || r.out}`);

// It may be installed in more than one scope (user, project, local); update each.
const failed = [];
for (const p of before) {
  const u = claude('plugin', 'update', p.id, '--scope', p.scope);
  if (!u.ok) failed.push(`${p.scope}: ${u.err || u.out}`);
}

const after = installed(json('plugin', 'list', '--json'));
let changed = false;
const rows = before.map((p) => {
  const now = (after.find((a) => a.scope === p.scope) || p).version;
  if (now !== p.version) changed = true;
  return `${now !== p.version ? 'updated' : 'current'}  ${id}  ${now !== p.version ? `${p.version} -> ${now}` : p.version}  (${p.scope})`;
});

console.log(`bizzfly-rules update\n\n${rows.join('\n')}`);
if (failed.length) console.log(`\nFailed:\n  ${failed.join('\n  ')}`);
console.log(changed
  ? '\nRestart Claude Code to load the new rules.'
  : '\nAlready on the latest rules. Nothing to do.');
if (failed.length) process.exit(1);
