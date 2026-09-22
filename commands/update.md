---
description: Update the BizzFly rules to the latest version
allowed-tools: Bash(node:*)
---

Run this and **print its output verbatim. Add nothing.**

```sh
node "${CLAUDE_PLUGIN_ROOT}/scripts/update.js"
```

It refreshes the `BizzFly` marketplace and updates the bizzfly-rules plugin, which
brings the latest `rules.md` and guard. It updates only bizzfly-rules. Other
BizzFly plugins, such as testwright, are left alone. This changes Claude Code's
plugin install, which the user asked for by running this command.

New rules take effect after Claude Code restarts. If the output says a restart is
needed, end with that. Don't try to reload the plugin yourself.

If `node` or `claude` is not found, say which one is missing, and stop.
