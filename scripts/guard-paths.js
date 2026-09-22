#!/usr/bin/env node
// PreToolUse hook: deny file and shell tool calls that touch paths outside the
// launch directory. File tools are checked exactly; Bash/PowerShell commands are
// checked heuristically by scanning the command for path-like tokens.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const WIN = process.platform === 'win32';
const FOLD_CASE = WIN || process.platform === 'darwin';
const DEVICES = new Set(['/dev/null', '/dev/stdin', '/dev/stdout', '/dev/stderr', '/dev/tty']);
// Unix roots that are always outside a project, even when they do not exist on this OS.
const SYSTEM_ROOTS = new Set(['tmp', 'etc', 'var', 'usr', 'home', 'users', 'root', 'opt',
  'private', 'volumes', 'mnt', 'proc', 'sys', 'bin', 'sbin', 'lib', 'srv', 'library']);

let input;
try { input = JSON.parse(fs.readFileSync(0, 'utf8')); } catch { process.exit(0); }

const cwd = input.cwd || process.cwd();
const root = real(process.env.CLAUDE_PROJECT_DIR || cwd);
// Installed plugins run their own scripts and read their own files (e.g. testwright's
// "$CLAUDE_PLUGIN_ROOT/scripts/tf.sh"), so the plugin install directory is allowed too.
const pluginsDir = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'plugins');
const allowed = [root, real(pluginsDir), ...(process.env.BIZZFLY_ALLOW_PATHS || '')
  .split(path.delimiter).filter(Boolean).map((p) => real(path.resolve(expand(p))))];

function deny(target) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `bizzfly-rules: "${target}" is outside the launch directory (${root}). ` +
        'Work only inside the launch directory; if the task needs this path, stop and ask the user.',
    },
  }));
  process.exit(0);
}

// ~, $HOME, ${VAR}, $env:VAR and %VAR% -> their values (unknown variables are left as-is).
function expand(s) {
  const env = (name, fallback) => (/^home$/i.test(name) ? os.homedir() : process.env[name] ?? fallback);
  return s
    .replace(/^~(?=$|[\\/])/, os.homedir())
    .replace(/\$env:([A-Za-z_]\w*)/gi, (m, v) => env(v, m))
    .replace(/\$\{([A-Za-z_]\w*)\}|\$([A-Za-z_]\w*)/g, (m, a, b) => env(a || b, m))
    .replace(/%([A-Za-z_]\w*)%/g, (m, v) => env(v, m));
}

// Git Bash style /c/Users/... -> C:/Users/... on Windows.
function native(p) {
  return WIN ? p.replace(/^\/([A-Za-z])(?=\/|$)/, '$1:') : p;
}

// Resolve symlinks through the deepest existing ancestor, so new files are checked too.
function real(p) {
  let head = path.resolve(p);
  const tail = [];
  for (;;) {
    try { return path.join(fs.realpathSync.native(head), ...tail); } catch { /* keep walking up */ }
    const parent = path.dirname(head);
    if (parent === head) return path.resolve(p);
    tail.unshift(path.basename(head));
    head = parent;
  }
}

function inside(p, dir) {
  const norm = (x) => (FOLD_CASE ? x.toLowerCase() : x);
  const rel = path.relative(norm(dir), norm(p));
  return rel === '' || (rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel));
}

// Throws out (denies) if the path resolves outside every allowed directory.
function check(raw, base = cwd) {
  if (!raw || typeof raw !== 'string') return;
  const p = real(path.resolve(base, native(expand(raw))));
  if (!allowed.some((dir) => inside(p, dir))) deny(raw);
}

// The part of a glob pattern before its first wildcard segment.
function globBase(pattern) {
  const segs = pattern.split(/[\\/]/);
  const i = segs.findIndex((s) => /[*?[{]/.test(s));
  const fixed = segs.slice(0, i < 0 ? segs.length : i).join('/');
  return fixed || (pattern.startsWith('/') ? '/' : '.');
}

// Does a shell token look like it names a path outside the working tree?
function pathLike(tok) {
  if (!tok || tok.includes('://') || DEVICES.has(tok)) return false;
  if (/^\/[A-Za-z?][A-Za-z0-9]?$/.test(tok)) return false;          // switches: cmd /c, dir /s
  if (/(^|[\\/])\.\.($|[\\/])/.test(tok)) return true;              // ..
  if (/^[A-Za-z]:[\\/]/.test(tok) || /^[\\/]{2}/.test(tok)) return true; // C:\, \\server
  if (tok.startsWith('/')) {
    // Plain /foo is often a URL path or regex; only flag roots that exist or are system dirs.
    const top = tok.split('/')[1] || '';
    if (!top) return true;
    if (SYSTEM_ROOTS.has(top.toLowerCase()) || (WIN && /^[A-Za-z]$/.test(top))) return true;
    return fs.existsSync(path.resolve('/', top));
  }
  return tok.startsWith('\\');
}

function checkCommand(cmd) {
  if (typeof cmd !== 'string') return;
  const re = /"([^"]*)"|'([^']*)'|([^\s;|&()<>`,]+)/g;
  for (let m; (m = re.exec(cmd));) {
    const tok = m[1] ?? m[2] ?? m[3];
    // Check the whole token and each side of --opt=value / VAR=value.
    for (const part of new Set([tok, ...tok.split('=')])) {
      const t = expand(part.trim());
      if (pathLike(t)) check(t);
    }
  }
}

const t = input.tool_input || {};
switch (input.tool_name) {
  case 'Read':
  case 'Write':
  case 'Edit':
  case 'MultiEdit':
    check(t.file_path);
    break;
  case 'NotebookEdit':
    check(t.notebook_path);
    break;
  case 'Glob': {
    const base = t.path ? path.resolve(cwd, native(expand(t.path))) : cwd;
    check(base);
    if (t.pattern) check(globBase(t.pattern), base);
    break;
  }
  case 'Grep': {
    const base = t.path ? path.resolve(cwd, native(expand(t.path))) : cwd;
    check(base);
    if (t.glob) check(globBase(t.glob), base);
    break;
  }
  case 'Bash':
  case 'PowerShell':
    checkCommand(t.command);
    break;
}
process.exit(0);
