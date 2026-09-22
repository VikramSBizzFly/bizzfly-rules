---
description: Set up this project for the BizzFly rules (.claude/tmp, .claude/memory, .gitignore)
allowed-tools: Bash(node:*)
---

Run this and **print its output verbatim. Add nothing.**

```sh
node "${CLAUDE_PLUGIN_ROOT}/scripts/apply.js"
```

It creates `.claude/tmp/` and `.claude/memory/MEMORY.md` in the launch directory
if they're missing, and adds both folders to `.gitignore`, creating the file if
needed. It only adds what's missing, so it's safe to run again.

If `node` is not found, say that bizzfly-rules needs Node.js on `PATH`, and stop.
Do not create the folders by hand instead.
