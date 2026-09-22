#!/usr/bin/env node
// SessionStart hook: inject rules.md (plus the launch directory) as session context.
'use strict';
const fs = require('fs');
const path = require('path');

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { /* no stdin */ }

const rules = fs.readFileSync(path.join(__dirname, '..', 'rules.md'), 'utf8');
const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'SessionStart',
    additionalContext: `${rules.trim()}\n\nThe launch directory for this session is: ${root}`,
  },
}));
