# dev-assistant

Developer assistant skill for NanoClaw. Load this when the user asks about the
codebase, wants code reviewed, needs debugging help, or wants new features built.

## When to use `rag_search`

Call `rag_search` *before* answering architecture questions or touching existing
modules. This ensures you see real, current code rather than guessing.

```
rag_search({ query: "how does IPC work between host and container" })
rag_search({ query: "message loop polling" })
rag_search({ query: "db schema registered_groups" })
rag_search({ query: "how are volume mounts calculated" })
```

**Always use `rag_search` when:**
- A user asks "how does X work" or "where is Y defined"
- You are about to write code that touches an existing module
- You need to find callers of a function before renaming/changing it
- You are debugging an error and need to locate the relevant code path

---

## Code Review Workflow

1. `Bash(git diff HEAD)` — see all uncommitted changes
2. `Bash(git diff HEAD~1)` — see the last commit
3. `rag_search("function or module name being changed")` — find all callers/uses
4. `Read` each file mentioned in the diff
5. Report issues with specific file:line references
6. Suggest edits using `Edit` or `Write` tools

---

## Debugging Workflow

1. `rag_search("exact error message or module name")`
2. `Read` the relevant source file(s)
3. Check runtime logs:
   - `Bash(tail -100 groups/main/logs/*.log 2>/dev/null || echo "no logs")`
   - `Bash(cat data/audit-logs/main.json | tail -50)`
4. Trace the call chain: for each intermediate function, call `rag_search` on it
5. Add debug `console.log` / `logger.debug` via `Edit` if needed
6. Reproduce with `Bash(npm run dev)` if it's safe to restart

---

## Adding a New Feature

1. `rag_search("related existing feature or module")`
2. Read the target files (src/index.ts, relevant module, types.ts)
3. Check for existing patterns to follow (error handling, logging style, test style)
4. Write code with `Edit` or `Write`
5. After writing, `rag_index({ path: "...", content: "..." })` to update the index
6. Run `Bash(npm run typecheck)` to catch type errors
7. Run `Bash(npm test)` to verify tests pass

---

## Test Workflow

1. `Glob("**/*.test.ts")` — find all existing test files
2. `rag_search("test patterns for the module you are testing")`
3. Read a similar existing test file for patterns (e.g., db.test.ts for db tests)
4. Write new tests following the exact same structure
5. `Bash(npm test)` to verify
6. `rag_index` the new test file

---

## Git Workflow

Always run these before suggesting any change:

```bash
git status
git log --oneline -20
git diff HEAD
```

For commit messages follow conventional commits:
- `feat: add RAG search endpoint`
- `fix: handle empty embedding response from Ollama`
- `refactor: extract chunk logic into separate function`

---

## Self-Indexing

After creating or significantly editing a file, keep the RAG index fresh:

```
rag_index({
  path: "src/rag-server.ts",
  content: "<read the file with Read tool first, then pass it here>"
})
```

---

## Key File Map (quick reference)

| What | Where |
|---|---|
| Main orchestrator | `src/index.ts` |
| Message → agent pipeline | `src/index.ts` → `src/container-runner.ts` |
| SQLite schema + queries | `src/db.ts` |
| RAG logic (chunks + embed) | `src/rag.ts` |
| RAG HTTP server | `src/rag-server.ts` |
| IPC host→container | `src/ipc.ts` |
| MCP tools (agent tools) | `container/agent-runner/src/ipc-mcp-stdio.ts` |
| Agent runner (Claude SDK) | `container/agent-runner/src/index.ts` |
| Agent runner (Ollama) | `container/agent-runner/src/index-ollama.ts` |
| Config / env vars | `src/config.ts` |
| Per-group memory | `groups/{folder}/CLAUDE.md` |
| Global memory | `groups/global/CLAUDE.md` |
| Conversation archives | `groups/{folder}/conversations/` |

---

## Constraints

- Never modify the `src/db.ts` schema without reading the migration comment at
  the top of the file first (existing DBs need ALTER TABLE migrations)
- Never restart the RAG server or the main NanoClaw process from inside the
  container — both run on the host
- Project root is always `/workspace/project` inside the container
- Group workspace is `/workspace/group` (maps to `groups/main/` for main)
