---
description: Update every installed BizzFly plugin to its latest version
allowed-tools: Bash(node:*)
---

Run this and **print its output verbatim. Add nothing.**

```sh
node "${CLAUDE_PLUGIN_ROOT}/scripts/update.js"
```

It refreshes the `BizzFly` marketplace, then updates every installed plugin from
it: bizzfly-rules, testwright, and any added later. It shows each plugin's old
and new version. This changes Claude Code's plugin install, which the user asked
for by running this command.

New versions take effect after Claude Code restarts. If the output says a
restart is needed, end with that. Don't try to reload the plugins yourself.

If `node` or `claude` is not found, say which one is missing, and stop.
