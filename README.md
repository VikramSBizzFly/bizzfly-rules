# bizzfly-rules

bizzfly-rules gives every BizzFly team member the same rules in every Claude Code
session, and it enforces the most important one: **Claude works only inside the
folder the session was launched from.**

Works on Windows, macOS and Linux. Nothing is installed into your project.

Part of the **BizzFly** marketplace, alongside
[testwright](https://github.com/VikramSBizzFly/testwright).

## Install

```
/plugin marketplace add VikramSBizzFly/bizzfly-marketplace
/plugin install bizzfly-rules@BizzFly
```

`BizzFly` is the marketplace
([VikramSBizzFly/bizzfly-marketplace](https://github.com/VikramSBizzFly/bizzfly-marketplace));
`bizzfly-rules` is a plugin inside it.

Restart Claude Code, then run `/bizzfly-rules:apply` in each project. To update
later: `/bizzfly-rules:update`

**Requires Node.js on `PATH`.** Both hooks are small Node scripts. If `node` is
missing, the hooks fail, Claude Code carries on without them, and **no rule is
enforced**. Check with `node --version`.

### Turn it on for a whole team

Commit this to a project's `.claude/settings.json`. Anyone who opens the project
and trusts the folder is prompted to add the marketplace and enable the plugin:

```json
{
  "extraKnownMarketplaces": {
    "BizzFly": {
      "source": { "source": "github", "repo": "VikramSBizzFly/bizzfly-marketplace" }
    }
  },
  "enabledPlugins": {
    "bizzfly-rules@BizzFly": true
  }
}
```

### Moving from the old `bizzfly` marketplace

The marketplace used to live inside the testwright repo under the name
`bizzfly`. If you added it from there, switch once:

```
/plugin marketplace remove bizzfly
/plugin marketplace add VikramSBizzFly/bizzfly-marketplace
/plugin install bizzfly-rules@BizzFly
```

## What it does

Two hooks, both active as soon as the plugin is enabled:

| Hook | When | What it does |
| --- | --- | --- |
| `SessionStart` | startup, resume, `/clear`, after compaction | Adds [`rules.md`](rules.md) and the session's launch directory to Claude's context. |
| `PreToolUse` | before every `Read`, `Write`, `Edit`, `MultiEdit`, `NotebookEdit`, `Glob`, `Grep`, `Bash` and `PowerShell` call | **Denies** the call if it touches a path outside the launch directory, and tells Claude why. |

When a call is denied, Claude sees:

```
bizzfly-rules: "C:\Users\me\.ssh\id_rsa" is outside the launch directory (D:\work\app).
Work only inside the launch directory; if the task needs this path, stop and ask the user.
```

## Commands

```
/bizzfly-rules:apply     set up this project for the rules
/bizzfly-rules:update    update every installed BizzFly plugin
```

**`/bizzfly-rules:apply`** does the setup that rules 2 and 3 ask for, in one step:

- creates `.claude/tmp/` and `.claude/memory/MEMORY.md` in the launch directory
- adds both folders to `.gitignore`, creating the file if there isn't one, and
  keeping its line endings

It only adds what's missing: an existing `MEMORY.md` or `.gitignore` entry (or a
`.claude/` line that already covers both) is left alone, so it's safe to run
again. It never runs on its own. Nothing is created in a project until you ask.

```
bizzfly-rules apply: D:\work\app

created  .claude/tmp/
ok       .claude/memory/
ok       .claude/memory/MEMORY.md
added    .claude/tmp/ to .gitignore
```

**`/bizzfly-rules:update`** refreshes the `BizzFly` marketplace and updates every
plugin you installed from it (bizzfly-rules, testwright, and any added later), in
the scope each was installed in. It uses the `claude` CLI.

```
bizzfly-rules update: BizzFly marketplace refreshed

updated  bizzfly-rules@BizzFly            1.1.0 -> 1.2.0  (user)
current  testwright@BizzFly               2.1.1  (project)

Restart Claude Code to use the new versions.
```

**Restart Claude Code afterwards.** A running session keeps the plugin versions it
started with. If you still have the old `bizzfly` marketplace, the command says so
and shows how to switch.

## The rules

[`rules.md`](rules.md) is the single source of truth. It currently covers:

1. **Directory boundary.** Work only inside the launch directory. Don't read, write,
   list or run anything outside it. If a task needs something outside, stop and ask.
2. **Temporary files.** Use `<launch directory>/.claude/tmp/`, never the system temp
   directory. Keep it in `.gitignore`, and clean up afterwards.
3. **Memory.** Keep memory in `<launch directory>/.claude/memory/` with `MEMORY.md`
   as the index. Keep it in `.gitignore`, and never write memory to the global
   `~/.claude` folder.

Rule 1 is enforced by the `PreToolUse` guard. Rules 2 and 3 are instructions that
Claude follows; `/bizzfly-rules:apply` sets up the folders they need.

### Changing the rules

1. Edit `rules.md`.
2. Note the change under `## [Unreleased]` in [CHANGELOG.md](CHANGELOG.md).
3. Release it. See [Versioning](#versioning).

Team members get it with `/bizzfly-rules:update`. The marketplace repo doesn't
change.

## How the boundary guard decides

**The launch directory** is `$CLAUDE_PROJECT_DIR`, falling back to the session's
`cwd`. Paths are fully resolved, including `..`, `~` and symlinks, before they are
compared. The comparison ignores case on Windows and macOS. A sibling folder with
the same name prefix, such as `D:\work\app-old` next to `D:\work\app`, counts as
outside.

**Always allowed, besides the launch directory:**

- **Installed plugins** (`~/.claude/plugins/`, or `$CLAUDE_CONFIG_DIR/plugins/`).
  Plugins run their own scripts and read their own reference files from there.
  testwright's engine, for example, is `"$CLAUDE_PLUGIN_ROOT/scripts/tf.sh"`.
  The rest of `~/.claude` stays blocked, including `settings.json`,
  `CLAUDE.md` and memory.
- Any folder you list in `BIZZFLY_ALLOW_PATHS` (see
  [Allowing extra folders](#allowing-extra-folders)).

**File tools** are checked exactly: `file_path`, `notebook_path`, and the `path` of
Glob and Grep. Glob and Grep patterns are checked up to their first wildcard, so
`../**` and `C:/Users/**` are caught.

**Bash and PowerShell** are checked best-effort. The guard scans the command for
path-like tokens:

- Caught: absolute paths (`C:\…`, `C:/…`, `/c/…`, `\\server\…`), `..`, `~`,
  `$HOME`, `${VAR}`, `$env:VAR`, `%VAR%`, and both sides of `--opt=value` and
  `VAR=value`.
- Ignored: URLs, `/dev/null`, and short switches like `cmd /c` or `dir /s`.
- A bare `/foo` counts only if it is a system root (`/tmp`, `/etc`, `/Users`,
  `/home`, …) or exists on disk. That's why `grep "/api/users"` isn't blocked.

### Known limits

It's a guard rail, not a sandbox. For hard isolation, turn on Claude Code's
sandbox as well.

- **`cd` inside a command isn't tracked.** `cd sub && cat ../x` is denied even
  though it stays inside. This errs on the safe side; run `cat sub/../x` or
  `cd sub` on its own instead.
- **Paths built at runtime aren't visible.** `cat $(echo /et)c/passwd` gets through.
- **It fails open.** If the hook input can't be parsed, or Node isn't installed,
  the call is allowed.
- **Large tool output is blocked too.** Claude Code sometimes saves very large
  output to a file under `~/.claude/projects/…` and asks Claude to read it. The
  guard blocks that read, as the boundary rule says it should. If that gets in
  the way, add the folder to `BIZZFLY_ALLOW_PATHS`.

## Allowing extra folders

Set `BIZZFLY_ALLOW_PATHS` to a list of folders, separated by `;` on Windows or `:`
elsewhere. The usual place is `env` in your user settings, `~/.claude/settings.json`:

```json
{ "env": { "BIZZFLY_ALLOW_PATHS": "C:\\shared\\datasets;D:\\reference-docs" } }
```

Each folder and everything inside it is allowed for every tool the guard checks.

## Using it with testwright

The two plugins work together without any setup. testwright writes only under your
project's `tests/`, which is inside the launch directory. Its engine and skill
files live in the plugin install folder, which the guard always allows.

## Under the hood

```
bizzfly-rules/
├── .claude-plugin/plugin.json   name and version
├── hooks/hooks.json             wires the two hooks
├── commands/
│   ├── apply.md                 /bizzfly-rules:apply
│   └── update.md                /bizzfly-rules:update
├── rules.md                     the rules text that gets added to the session
├── CHANGELOG.md                 what changed in each version
└── scripts/
    ├── session-start.js         SessionStart: rules.md + launch directory → context
    ├── guard-paths.js           PreToolUse: allow, or deny with a reason
    ├── apply.js                 creates the folders and .gitignore entries
    ├── update.js                refreshes the marketplace, updates BizzFly plugins
    └── bump-version.js          maintainer tool: release a new version
```

Every script uses only Node's standard library. There's no `npm install` and no
`package.json`. The commands are thin: each runs its script and prints the output
unchanged, so the result doesn't depend on how Claude reads the instructions.

To try the guard by hand, pipe it a hook payload:

```sh
echo '{"cwd":"/work/app","tool_name":"Read","tool_input":{"file_path":"/etc/hosts"}}' \
  | CLAUDE_PROJECT_DIR=/work/app node scripts/guard-paths.js
```

Denied calls print a JSON `permissionDecision: "deny"`. Allowed calls print nothing.

## Versioning

The version lives in `.claude-plugin/plugin.json`, and
[CHANGELOG.md](CHANGELOG.md) says what changed. **Claude Code only installs an
update when this version changes**, so every release needs a bump. Semver, where
"breaking" means _a teammate's normal work stops_:

- **MAJOR:** a rule is removed, or the guard starts blocking something it used
  to allow in a way people have to work around.
- **MINOR:** a new rule, a newly guarded tool, or a new allowance.
- **PATCH:** fixes and wording that don't change what's allowed.

### Releasing

1. Add what changed under `## [Unreleased]` in `CHANGELOG.md`.
2. Bump:
   ```sh
   node scripts/bump-version.js patch    # or minor, major, or an exact 1.4.0
   ```
   This sets `version` in `plugin.json`, turns `[Unreleased]` into a dated
   `[x.y.z]` section, and updates the compare links. It refuses to run if
   `[Unreleased]` is empty, so no release goes out without an entry.
3. Commit, tag and push, as the script prints:
   ```sh
   git commit -am "Release x.y.z" && git tag vx.y.z && git push origin main vx.y.z
   ```
   Name the tag in the push. `--follow-tags` skips plain (lightweight) tags.
