# bizzfly-rules

Gives every BizzFly team member the same global rules in every Claude Code session.

| Hook | What it does |
|---|---|
| `SessionStart` | Injects `rules.md` plus the session's launch directory as context (on startup, resume, `/clear` and after compaction). |
| `PreToolUse` | Denies `Read`, `Write`, `Edit`, `MultiEdit`, `NotebookEdit`, `Glob`, `Grep`, `Bash` and `PowerShell` calls that touch a path outside the launch directory. |

**Requires:** Node.js on `PATH` (Windows, macOS, Linux). If `node` is missing, the hooks error out and Claude Code carries on without them, so the rules are **not** enforced.

## Install

The plugin is published through the `BizzFly` marketplace ([VikramSBizzFly/bizzfly-marketplace](https://github.com/VikramSBizzFly/bizzfly-marketplace)).

```
/plugin marketplace add VikramSBizzFly/bizzfly-marketplace
/plugin install bizzfly-rules@BizzFly
```

To enable it for everyone automatically, commit this to a project's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "BizzFly": { "source": { "source": "github", "repo": "VikramSBizzFly/bizzfly-marketplace" } }
  },
  "enabledPlugins": { "bizzfly-rules@BizzFly": true }
}
```

## Editing the rules

Edit `rules.md`, bump `version` in `.claude-plugin/plugin.json`, and push to this repo. Team members pick up the change with `/plugin marketplace update BizzFly`.

## How the boundary guard works

- **Launch directory:** `$CLAUDE_PROJECT_DIR`, falling back to the session's `cwd`. Symlinks are resolved, and the comparison ignores case on Windows and macOS.
- **File tools:** `file_path`, `notebook_path`, and the `path` of Glob and Grep are checked exactly. Glob and Grep patterns are checked up to their first wildcard, so `../**` and `C:/Users/**` are caught.
- **Bash and PowerShell:** best-effort. The guard scans the command for path-like tokens: absolute paths (`C:\…`, `/c/…`, `\\server`), `..`, `~`, `$HOME`, `$env:X` and `%X%`. It also checks both sides of `--opt=value`. It skips URLs, `/dev/null`, and short switches like `cmd /c`. A bare `/foo` counts only if it is a system root (`/tmp`, `/etc`, `/Users`, …) or exists on disk, so `grep "/api/users"` is not blocked.
- **Known limits:** The guard does not track a `cd` earlier in the same command (`cd sub && cat ../x` is denied, which errs on the safe side). It also cannot see paths that a command builds at runtime (`cat $(echo /et)c/passwd`). Treat it as a guard rail, not a sandbox. For hard isolation, turn on Claude Code's sandbox as well.
- **Fails open:** if the hook input can't be parsed, the call is allowed.

## Escape hatch

To allow extra directories, set `BIZZFLY_ALLOW_PATHS` to a list separated by the OS path delimiter (`;` on Windows, `:` elsewhere). For example, you might add it to `env` in `~/.claude/settings.json`:

```json
{ "env": { "BIZZFLY_ALLOW_PATHS": "C:\\shared\\datasets" } }
```

Claude Code sometimes saves very large tool output to a file under `~/.claude/projects/…` and asks Claude to read it. The guard blocks that read. That matches the boundary rule, but if it gets in the way, add that folder here.
