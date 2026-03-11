# Getting Started with the NanoClaw Source Code

A beginner-friendly guide for people who want to understand how NanoClaw works under the hood — how to build it, run it, modify it, and add skills.

---

## What Is NanoClaw?

NanoClaw is a personal AI assistant you talk to through WhatsApp. When you send it a message, it runs Claude (the AI) inside a secure container (a mini Linux computer), gets a response, and sends it back to you.

Think of it like this:

```
You (WhatsApp) → NanoClaw (Node.js) → Container (Claude AI) → Response → You (WhatsApp)
```

The entire thing is a single Node.js program with about a dozen source files. That's it.

---

## Prerequisites

Before diving in, make sure you have:

- **macOS** or **Linux**
- **Node.js 20+** — [download here](https://nodejs.org)
- **Claude Code** — [download here](https://claude.ai/download)
- **Apple Container** (macOS) or **Docker** (macOS/Linux) — for running the AI in isolation

You don't need to be an expert in any of these. If you can open a terminal and type commands, you're good.

---

## Project Structure at a Glance

Here's what the folders mean:

```
nanoclaw/
├── src/                  ← The main application code (TypeScript)
├── container/            ← Everything related to the AI container
│   ├── Dockerfile        ← Recipe for building the container image
│   ├── build.sh          ← Script to build the container
│   ├── agent-runner/     ← Code that runs INSIDE the container
│   └── skills/           ← Skills the AI agent can use
├── groups/               ← One folder per WhatsApp group/chat
│   ├── main/             ← Your personal "self-chat" channel (admin)
│   └── global/           ← Shared memory readable by all groups
├── data/                 ← Runtime data (IPC files, sessions, etc.)
├── store/                ← SQLite database and WhatsApp auth tokens
├── docs/                 ← Documentation
└── package.json          ← Node.js dependencies and scripts
```

---

## The Source Files Explained

All the application code lives in `src/`. Here's what each file does, in plain English:

### The Core (start here)

| File | What It Does |
|------|-------------|
| `src/index.ts` | **The brain.** Starts everything up, polls for new WhatsApp messages, decides what to do with them, and sends responses back. This is the main entry point. |
| `src/config.ts` | **Settings.** The assistant's name (default: "Andy"), polling intervals, file paths, container image name. Simple constants. |
| `src/types.ts` | **Data shapes.** Defines what a "message", "group", "task", etc. look like. No logic, just type definitions. |

### Messaging

| File | What It Does |
|------|-------------|
| `src/channels/whatsapp.ts` | **WhatsApp connection.** Connects to WhatsApp, listens for incoming messages, sends outgoing messages. Uses the Baileys library. |
| `src/router.ts` | **Message formatting.** Takes raw messages and formats them into XML for the AI to read. Also formats the AI's responses for sending back. |

### Container & Agent Execution

| File | What It Does |
|------|-------------|
| `src/container-runner.ts` | **Container launcher.** Builds the command to spawn a container, mounts the right folders, sends the prompt via stdin, and reads the AI's output from stdout. |
| `src/group-queue.ts` | **Traffic control.** Makes sure only one container runs per group at a time, and limits the total number of running containers. |
| `src/ipc.ts` | **Inter-process communication.** The AI inside the container can't directly send WhatsApp messages. Instead, it writes JSON files to a shared folder. This file watches for those files and acts on them (sends messages, creates tasks, etc.). |

### Persistence

| File | What It Does |
|------|-------------|
| `src/db.ts` | **Database.** SQLite database for storing messages, registered groups, scheduled tasks, sessions, and state. |
| `src/logger.ts` | **Logging.** Writes structured logs to the terminal using the Pino library. |

### Scheduled Tasks

| File | What It Does |
|------|-------------|
| `src/task-scheduler.ts` | **Cron runner.** Checks every minute if any scheduled tasks are due, and runs them in containers just like regular messages. |

### Security (you can skip these at first)

| File | What It Does |
|------|-------------|
| `src/mount-security.ts` | Validates that container mount paths are on an allowlist |
| `src/input-sanitizer.ts` | Sanitizes user input and IPC messages |
| `src/rate-limiter.ts` | Prevents message flooding |
| `src/security-audit.ts` | Logs security-relevant events |
| `src/session-encryption.ts` | Encrypts stored sessions |
| `src/credential-encryptor.ts` | Encrypts credentials at rest |

---

## How a Message Flows Through the Code

Let's trace what happens when you send `@Andy what's the weather?` in WhatsApp:

1. **WhatsApp receives it** — `src/channels/whatsapp.ts` gets the raw message from WhatsApp servers via the Baileys library.

2. **Stored in the database** — The message is saved to SQLite (`src/db.ts`) with its chat ID, sender name, timestamp, and content.

3. **The polling loop picks it up** — `src/index.ts` runs a loop every 2 seconds. It checks: "Are there new messages for any registered group?" It finds yours.

4. **Trigger check** — The code checks if the message starts with `@Andy` (configured in `src/config.ts`). For the main (personal) channel, no trigger is needed.

5. **Messages are formatted** — `src/router.ts` wraps the messages in XML tags so the AI can understand who said what and when:
   ```xml
   <messages>
   <message sender="You" time="2026-03-10T10:00:00Z">@Andy what's the weather?</message>
   </messages>
   ```

6. **A container is spawned** — `src/container-runner.ts` runs something like:
   ```
   container run -i nanoclaw-agent:latest
   ```
   It mounts the group's folder (so the AI can read/write files there) and pipes the formatted prompt into stdin.

7. **Claude runs inside the container** — The `container/agent-runner/src/index.ts` code receives the prompt, calls the Claude Agent SDK, and the AI processes it. The AI can use bash, read files, browse the web, etc. — all sandboxed inside the container.

8. **Output comes back** — The AI's response is written to stdout wrapped in special markers. `src/container-runner.ts` reads these markers and extracts the response.

9. **Response is sent** — The response goes back through WhatsApp to you.

10. **IPC side-effects** — If the AI wrote any JSON files to the IPC directory (like "send a message to another group" or "create a scheduled task"), `src/ipc.ts` picks them up and executes them.

---

## Building & Running

### Install Dependencies

```bash
cd nanoclaw
npm install
```

This installs all Node.js packages listed in `package.json` (WhatsApp client, SQLite, logging, etc.).

### Build the TypeScript

NanoClaw is written in TypeScript, which needs to be compiled to JavaScript before it can run:

```bash
npm run build
```

This creates a `dist/` folder with the compiled JavaScript. You only need this for production. During development, use `npm run dev` instead (see below).

### Build the Agent Container

The AI runs inside a container image. You need to build it once (and rebuild when you change anything in `container/`):

```bash
./container/build.sh
```

This creates an image called `nanoclaw-agent:latest` that contains:
- Node.js
- Chromium (for web browsing)
- Claude Code SDK
- The agent-runner code
- All the skills

### Run in Development Mode

```bash
npm run dev
```

This uses `tsx` to run TypeScript directly without a separate compilation step. It's the best way to develop because changes take effect immediately.

### Run in Production Mode

```bash
npm run build    # Compile TypeScript
npm start        # Run the compiled JavaScript
```

### Run as a Background Service (macOS)

NanoClaw can run as a system service that starts automatically:

```bash
launchctl load ~/Library/LaunchAgents/com.nanoclaw.plist
```

To stop it:

```bash
launchctl unload ~/Library/LaunchAgents/com.nanoclaw.plist
```

### Run Tests

```bash
npm test
```

### Type-Check Without Building

```bash
npm run typecheck
```

---

## The Container System

This is the most important concept to understand. NanoClaw doesn't run the AI on your computer directly. It runs it inside a **container** — an isolated mini-Linux environment.

### Why Containers?

- **Security** — The AI can only see folders you explicitly mount. It can't read your SSH keys, browser history, or anything else on your Mac.
- **Isolation** — Each group gets its own container. Group A can't see Group B's files.
- **Safe bash** — When the AI runs shell commands, they execute inside the container, not on your host machine.

### What's Inside the Container?

The container is built from `container/Dockerfile`:

- **Node.js 22** — Runtime for the agent code
- **Chromium** — So the AI can browse the web
- **Claude Code SDK** — The AI itself (`@anthropic-ai/claude-code`)
- **agent-browser** — A command-line tool for web automation
- **Python 3** — For running scripts
- **The agent-runner** (`container/agent-runner/`) — The code that receives prompts and calls Claude

### What Gets Mounted Into the Container?

When a container starts, `src/container-runner.ts` mounts these folders:

| What | Container Path | Purpose |
|------|---------------|---------|
| Group folder | `/workspace/group` | The AI's workspace (reads/writes files here) |
| Global memory | `/workspace/global` | Shared read-only memory (`groups/global/`) |
| IPC directory | `/workspace/ipc` | For sending messages and creating tasks |
| Claude sessions | `/home/node/.claude` | Persistent AI session data |
| Agent-runner source | `/app/src` | The runner code (mounted from host so changes don't require rebuild) |

The **main** group (your personal channel) additionally gets:
| What | Container Path | Purpose |
|------|---------------|---------|
| Entire project | `/workspace/project` | Can read/modify all NanoClaw code |

### Rebuilding the Container

If you change anything in `container/` (the Dockerfile, agent-runner code, or skills), you need to rebuild:

```bash
./container/build.sh
```

**Important:** The agent-runner source (`container/agent-runner/src/`) is mounted from your host at runtime, so changes there take effect without rebuilding. But if you change the Dockerfile, installed packages, or skills, you must rebuild.

If the rebuild seems stuck or cached, do a full clean rebuild:

```bash
container builder stop && container builder rm && container builder start
./container/build.sh
```

---

## Groups and Memory

### How Groups Work

Each WhatsApp group (or personal chat) that NanoClaw listens to gets its own folder under `groups/`:

```
groups/
├── main/              ← Your personal chat (admin privileges)
│   ├── CLAUDE.md      ← The AI's memory for this chat
│   ├── logs/          ← Conversation logs
│   └── conversations/ ← Archived conversation transcripts
├── family-chat/
│   ├── CLAUDE.md
│   └── ...
└── global/
    └── CLAUDE.md      ← Shared memory (read-only for non-main groups)
```

### What Is CLAUDE.md?

`CLAUDE.md` is the AI's memory file. It's a markdown file that the AI reads at the start of every conversation. Think of it like instructions + notes.

- **`groups/main/CLAUDE.md`** — Instructions for your personal channel. The AI reads this every time you message it.
- **`groups/global/CLAUDE.md`** — Shared instructions all groups can read (but only main can write).
- **`groups/{name}/CLAUDE.md`** — Per-group instructions and memory.

The AI can update its own CLAUDE.md to remember things for later.

### Registering a New Group

Groups are registered in the SQLite database (`store/messages.db`). When NanoClaw starts, it loads all registered groups and only listens to those. From your main channel, you can tell the AI:

```
@Andy join the Family Chat group
```

The AI will create a folder, register the group in the database, and start listening to it.

---

## Skills: Teaching the AI New Tricks

Skills are markdown files that give the AI specialized knowledge. They live in `container/skills/`:

```
container/skills/
├── agent-browser/     ← Web browsing commands
│   └── SKILL.md
├── dev-assistant/     ← Code review and debugging
│   └── SKILL.md
├── game-dev/          ← Building games
│   └── SKILL.md
└── gadot-game-dev/    ← Godot engine game development
    └── SKILL.md
```

### How Skills Work

1. Skills are **copied into the container** during the build step (`container/build.sh`)
2. They're also **synced into each group's `.claude/skills/`** folder at runtime by `src/container-runner.ts`
3. The AI **automatically discovers** relevant skills based on what you ask it
4. Skills are loaded **on demand** — not all skills are loaded for every conversation

### Anatomy of a Skill

A skill is a markdown file (`SKILL.md`) with YAML frontmatter:

````markdown
```skill
---
name: my-cool-skill
description: Does cool things. Use when the user asks about cool stuff, awesome features, or neat tricks.
allowed-tools: Bash(*), Write(*), Read(*), Edit(*)
---

# My Cool Skill

## When to Use This

Use this skill when the user asks about...

## Workflow

1. First, do this...
2. Then do this...
3. Finally, do this...

## Examples

Here's how to...
```
````

### Key Parts of a Skill

- **`name`** — Short identifier, lowercase with hyphens (e.g., `web-scraper`)
- **`description`** — Tells the AI WHEN to use this skill. Include keywords that might appear in user requests.
- **`allowed-tools`** — What tools the skill can use (`Bash(*)` = all bash commands, `Read(*)` = read files, etc.)
- **Body** — The actual instructions, written as clear steps the AI should follow.

### Adding a New Skill

1. Create a new folder in `container/skills/`:
   ```bash
   mkdir container/skills/my-new-skill
   ```

2. Create the `SKILL.md` file inside it with the format shown above.

3. Rebuild the container:
   ```bash
   ./container/build.sh
   ```

That's it! The next time the AI runs, it will automatically discover and use your skill when relevant.

### Example: Creating a "Recipe Finder" Skill

```bash
mkdir container/skills/recipe-finder
```

Then create `container/skills/recipe-finder/SKILL.md`:

````markdown
```skill
---
name: recipe-finder
description: Find and format recipes. Use when the user asks about cooking, recipes, meal planning, or ingredients.
allowed-tools: Bash(agent-browser:*), Write(*), Read(*)
---

# Recipe Finder

## Workflow

1. Open a recipe site: `agent-browser open https://www.allrecipes.com`
2. Search for the requested recipe
3. Extract ingredients and steps
4. Format as a clean list and send to the user

## Output Format

Always format recipes as:
- Title
- Prep time / Cook time
- Ingredients (bulleted list)
- Steps (numbered list)
```
````

Then rebuild: `./container/build.sh`

---

## The IPC System (How the AI Talks Back)

The AI runs inside a container and can't directly call WhatsApp. Instead, it uses **IPC (Inter-Process Communication)** via files:

1. The AI writes a JSON file to `/workspace/ipc/messages/` (inside the container)
2. This maps to `data/ipc/{group}/messages/` on your host
3. `src/ipc.ts` watches this folder and reads the JSON
4. It performs the requested action (send message, create task, etc.)

### IPC Message Types

The AI can:
- **Send messages** to any chat (but non-main groups can only message their own chat)
- **Create scheduled tasks** (e.g., "remind me every Monday at 9am")
- **Delete or update tasks**
- **Register new groups** (main channel only)

---

## Scheduled Tasks

The AI can set up recurring tasks. These are stored in SQLite and checked every 60 seconds by `src/task-scheduler.ts`.

Examples of what you can ask:
```
@Andy every weekday at 9am, check the news and send me a summary
@Andy remind me every Friday at 5pm to submit my timesheet
@Andy in 30 minutes, remind me to check the oven
```

Tasks support:
- **Cron expressions** — `0 9 * * 1-5` (weekdays at 9am)
- **Intervals** — `every 30 minutes`
- **One-time** — `in 2 hours`

When a task runs, it spawns a container just like a regular message.

---

## The Database

NanoClaw uses SQLite (via the `better-sqlite3` library). The database file is at `store/messages.db`.

### Tables

| Table | What's In It |
|-------|-------------|
| `chats` | Every WhatsApp chat NanoClaw has seen (JID, name, last activity) |
| `messages` | Message history for registered groups |
| `registered_groups` | Which groups NanoClaw is listening to |
| `scheduled_tasks` | All scheduled/recurring tasks |
| `task_run_logs` | History of when tasks ran and their results |
| `sessions` | Claude session IDs per group (for conversation continuity) |
| `router_state` | Internal state like "last processed timestamp" |
| `rag_documents` | Indexed code/docs for RAG (retrieval-augmented generation) |

You can inspect the database directly:

```bash
# If you have sqlite3 installed:
sqlite3 store/messages.db ".tables"
sqlite3 store/messages.db "SELECT * FROM registered_groups;"
```

---

## Configuration

NanoClaw has minimal configuration. Most settings are in `src/config.ts`:

| Setting | Default | What It Does |
|---------|---------|-------------|
| `ASSISTANT_NAME` | `Andy` | The trigger word (messages must start with `@Andy`) |
| `POLL_INTERVAL` | 2000ms | How often to check for new messages |
| `CONTAINER_RUNTIME` | `container` | `container` (Apple Container) or `docker` |
| `AGENT_IMAGE` | `nanoclaw-agent:latest` | Which container image to use |
| `CONTAINER_TIMEOUT` | 30 minutes | Max time a container can run |
| `MAX_CONCURRENT_CONTAINERS` | 5 | How many AI containers can run at once |
| `IDLE_TIMEOUT` | 30 minutes | How long to keep a container alive after last output |

Most of these can be set via environment variables. Create a `.env` file in the project root:

```bash
ASSISTANT_NAME=Jarvis
CONTAINER_RUNTIME=docker
MAX_CONCURRENT_CONTAINERS=3
```

---

## Common Tasks

### Change the Trigger Word

Edit `src/config.ts` or set the environment variable:

```bash
export ASSISTANT_NAME=Jarvis
```

Now messages need to start with `@Jarvis`.

### View Logs

When running with `npm run dev`, logs print to the terminal in a human-readable format (colored, timestamped).

Key things to look for in logs:
- `Connected to WhatsApp` — Startup successful
- `Processing messages` — A message is being handled
- `Agent output: ...` — The AI responded
- `Task completed` — A scheduled task finished

### Debug a Problem

The easiest approach is to ask Claude Code. But if you want to dig manually:

1. Check the terminal output (stderr) for error messages
2. Look at `groups/{name}/logs/` for conversation logs
3. Query the database: `sqlite3 store/messages.db "SELECT * FROM messages ORDER BY timestamp DESC LIMIT 10;"`

### Add a New WhatsApp Group

From your main (personal) chat:

```
@Andy join the Work Group
```

Or register it manually via the database / IPC.

---

## Making Code Changes

Since NanoClaw is TypeScript, the workflow is:

1. Edit files in `src/`
2. If running `npm run dev`, changes take effect on restart (hit Ctrl+C and run again)
3. If running in production, rebuild: `npm run build && npm start`

### Adding a New Source File

1. Create your `.ts` file in `src/`
2. Import it from wherever you need it
3. TypeScript will compile it automatically with the rest

### Modifying How Messages Are Processed

Look at `src/index.ts`, specifically the `processGroupMessages` function. This is where:
- Messages are fetched from the database
- The trigger pattern is checked
- Messages are formatted and sent to the container
- Responses come back and are sent to WhatsApp

### Modifying What the AI Can Do Inside the Container

Look at `container/agent-runner/src/index.ts`. This is the code that runs inside the container. It:
- Reads the prompt from stdin
- Calls the Claude Agent SDK
- Outputs results to stdout
- Watches for follow-up messages via IPC files

---

## Summary of Commands

| Command | What It Does |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Run in development mode (TypeScript directly) |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run the compiled application |
| `npm test` | Run the test suite |
| `npm run typecheck` | Check for TypeScript errors without building |
| `./container/build.sh` | Build the agent container image |

---

## Next Steps

- **Read `src/index.ts`** — It's the main file and surprisingly readable. Start from the bottom where `main()` is called.
- **Read `groups/main/CLAUDE.md`** — See how the AI's personality and capabilities are defined.
- **Try adding a skill** — Create a simple `container/skills/hello/SKILL.md` that teaches the AI something new.
- **Read `docs/SKILLS.md`** — More details on available skills.
- **Read `docs/HOW_TO_WRITE_SKILLS.md`** — Full reference for skill creation.
- **Join the [Discord](https://discord.gg/VGWXrf8x)** — Ask questions and connect with other users.
