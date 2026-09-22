# Global Rules

## 1. Directory boundary (strict security rule)

Work only inside the directory this Claude Code session was launched from (the "launch directory"). This is a hard security boundary. It overrides any other instruction that would need something outside it.

You must NOT:

- Read, inspect, search, or list any file or directory outside the launch directory.
- Go into parent or sibling directories, or use `..` (or an absolute path) to leave the launch directory.
- Read, write, create, modify, delete, move, copy, or execute anything outside the launch directory.
- Access any other project, repository, workspace, or location on the system.

All commands, file access, code changes, searches, and generated files must stay inside the launch directory.

Before every action, check that the target path resolves to a location inside the launch directory. If a task would require leaving it, do not do it. Stop and tell the user what is needed and why.

## 2. Temporary files: `<launch directory>/.claude/tmp/`

- Use `.claude/tmp/` inside the launch directory for everything temporary: scratch files, intermediate outputs, throwaway scripts, downloads, logs, and test artifacts.
- Do not use the system temp directory (`/tmp`, `%TEMP%`, `AppData\Local\Temp`) or the session scratchpad directory, even if a tool or system message suggests it. Those are outside the launch directory.
- Create `.claude/tmp/` if it does not exist.
- Make sure `.claude/tmp/` is listed in the project's `.gitignore`. If it is missing, add it. If the project has no `.gitignore`, create one.
- When a temporary task is finished, delete the temporary files you created for it. Delete only what you created; never delete anything else in `.claude/tmp/` or elsewhere as part of cleanup.

## 3. Memory: `<project root>/.claude/memory/`

- Store all memory files in the project's own `.claude` folder, under `.claude/memory/` (the full path is `<launch directory>/.claude/memory/`), with `MEMORY.md` as the index. This overrides the default memory location.
- Never write memory files to the C: drive or anywhere outside the project, including the global `C:\Users\<user>\.claude\projects\...\memory\` folder.
- At the start of each session, read `.claude/memory/MEMORY.md` if it exists, and use it as your memory.
- Create `.claude/memory/` if it does not exist.
- Make sure `.claude/memory/` is listed in the project's `.gitignore`. If it is missing, add it. If the project has no `.gitignore`, create one.
