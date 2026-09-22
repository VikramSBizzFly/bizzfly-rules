# Changelog

Notable changes to this plugin. Format: [Keep a Changelog](https://keepachangelog.com);
versioning: [semver](https://semver.org), with the meaning of each bump spelled
out under **Versioning** in [README.md](README.md). Bump with
`node scripts/bump-version.js <major|minor|patch>`.

## [Unreleased]

## [1.1.0] - 2026-09-22

A **minor** release: a new allowance. Nothing that was blocked for a good reason
is allowed now.

### Fixed

- **Other plugins can run their own scripts.** With 1.0.0, installing testwright
  next to bizzfly-rules broke it: testwright's engine,
  `"$CLAUDE_PLUGIN_ROOT/scripts/tf.sh"`, and its skill reference files live in
  the plugin install folder, outside the project, so the guard denied every call.
  The guard now always allows `~/.claude/plugins/` (or
  `$CLAUDE_CONFIG_DIR/plugins/`). The rest of `~/.claude` (settings, `CLAUDE.md`,
  memory) stays blocked.

### Changed

- The plugin now lives in its own repo and installs from the `BizzFly`
  marketplace
  ([VikramSBizzFly/bizzfly-marketplace](https://github.com/VikramSBizzFly/bizzfly-marketplace)):
  `/plugin install bizzfly-rules@BizzFly`.
- README rewritten: install, team-wide settings, how the guard decides, known
  limits, and using it alongside testwright.

## [1.0.0] - 2026-09-22

First release.

### Added

- **`SessionStart` hook.** Adds `rules.md` (directory boundary, temporary files,
  memory) and the session's launch directory to Claude's context on startup,
  resume, `/clear` and after compaction.
- **`PreToolUse` guard.** Denies `Read`, `Write`, `Edit`, `MultiEdit`,
  `NotebookEdit`, `Glob`, `Grep`, `Bash` and `PowerShell` calls that touch a path
  outside the launch directory. File tools are checked exactly; shell commands
  are checked by scanning for path-like tokens.
- **`BIZZFLY_ALLOW_PATHS`** for allowing extra folders.
- Runs on Node's standard library only, on Windows, macOS and Linux.

[Unreleased]: https://github.com/VikramSBizzFly/bizzfly-rules/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/VikramSBizzFly/bizzfly-rules/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/VikramSBizzFly/bizzfly-rules/releases/tag/v1.0.0
