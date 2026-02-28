# NanoClaw Run Modes

NanoClaw can run in several modes depending on what you need. Here's the full breakdown.

---

## 1. Service Mode (WhatsApp Daemon)

The primary production mode. Runs as a persistent background process that connects to WhatsApp, listens for messages, and dispatches agent containers.

```bash
npm run dev          # Development (hot reload via tsx)
npm run start        # Production (compiled JS)
./start.sh           # With network isolation + env setup
```

**What it does:**
- Connects to WhatsApp via Baileys
- Polls for new messages on registered groups
- Queues messages per-group (one agent at a time per group)
- Spawns isolated containers for each agent invocation
- Runs the IPC watcher (agent → host communication)
- Runs the task scheduler (cron-style recurring tasks)
- Starts the RAG server for context retrieval

**Auto-start with launchd:**
```bash
launchctl load ~/Library/LaunchAgents/com.nanoclaw.plist    # start on boot
launchctl unload ~/Library/LaunchAgents/com.nanoclaw.plist  # stop
```

---

## 2. CLI Single-Query Mode

Fire off a one-shot prompt. The agent runs, responds, and exits.

```bash
./nanoclaw-cli "what is 2+2?"
./nanoclaw-cli "list files in current directory"
./nanoclaw-cli -v "create a snake game"           # verbose (shows tool use)
./nanoclaw-cli "/review check my Player.gd"       # with agent mode prefix
```

**Behavior:**
- Starts the RAG server if not already running
- Creates a fresh container, sends the prompt, prints the response
- No session persistence — each call is stateless
- Exits when done (exit code 0 on success)

---

## 3. CLI Interactive Mode

A persistent terminal session with conversation memory.

```bash
./nanoclaw-cli           # no arguments → interactive
./nanoclaw-cli -v        # interactive + verbose
```

**In-session commands:**

| Command | Effect |
|---------|--------|
| `help` | Show all commands |
| `new` | Clear session context |
| `status` | Show session ID, message count, active mode |
| `verbose` | Toggle step-by-step output |
| `exit` / `quit` | Leave |

**Session persistence:** Messages within the same interactive session share context (via `sessionId`). Type `new` to reset.

---

## 4. CLI REPL Mode

A rapid-fire loop for quick back-and-forth. Same container stays warm between prompts — no startup overhead after the first message.

```bash
./nanoclaw-cli --repl
./nanoclaw-cli --repl -v
```

**How it differs from interactive mode:**
- Minimal chrome — just a `>>> ` prompt
- Prints response text only (no timing boxes or RAG panels unless verbose)
- Designed for fast iteration during development

**Commands:** Same as interactive mode (`new`, `status`, `verbose`, `exit`).

---

## 5. Agent Modes (Orthogonal)

Any run mode can use these agent behavior modes. They control *what the agent is allowed to do*, not *how NanoClaw runs*.

| Mode | Prefix | Description |
|------|--------|-------------|
| Default | `/default` | Full agent — plans and builds |
| Plan | `/plan` | Research & plan only — no file changes |
| Build | `/build` | Implementation only — writes code |
| Review | `/review` | Code review — reads & critiques |

**Usage:**
- **One-shot prefix:** `/plan create a platformer` (mode applies to this prompt only)
- **Sticky switch:** `/plan` alone switches the default for all subsequent prompts
- **Single-query:** `./nanoclaw-cli "/review check my code"`

---

## Quick Reference

| Mode | Command | Session | Use Case |
|------|---------|---------|----------|
| Service | `npm run dev` | Persistent (WhatsApp) | Production / always-on |
| Single query | `./nanoclaw-cli "prompt"` | None | Scripting, one-off questions |
| Interactive | `./nanoclaw-cli` | Within session | Development, multi-turn chat |
| REPL | `./nanoclaw-cli --repl` | Within session | Fast iteration, minimal output |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AGENT_IMAGE` | `nanoclaw-agent:latest` | Container image for agent |
| `USE_OLLAMA` | `false` | Use local Ollama instead of Claude |
| `OLLAMA_MODEL` | `qwen2.5-coder:14b` | Which Ollama model |
| `VERBOSE` | `false` | Always show step-by-step output |
| `RAG_PORT` | `7700` | RAG server port |
