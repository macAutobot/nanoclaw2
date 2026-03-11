# NanoClaw Skills Reference

Skills teach the agent domain-specific knowledge and workflows. They're loaded on-demand when the agent identifies a relevant task.

> **Want to create your own skill?** See [HOW_TO_WRITE_SKILLS.md](HOW_TO_WRITE_SKILLS.md)

---

## Available Skills

| Skill | Location | Trigger Keywords |
|-------|----------|-----------------|
| [Agent Browser](#agent-browser) | `container/skills/agent-browser/` | browse, web, scrape, screenshot, form, login |
| [Dev Assistant](#dev-assistant) | `container/skills/dev-assistant/` | codebase, debug, review, feature, git |
| [Game Dev](#game-dev) | `container/skills/game-dev/` | game, pygame, HTML5 game, canvas |
| [Godot Game Dev](#godot-game-dev) | `container/skills/gadot-game-dev/` | Godot, GDScript, game engine, scenes, signals |

---

## Agent Browser

**Description:** Browse the web — research topics, read articles, interact with web apps, fill forms, take screenshots, and extract data.

**Tools:** `Bash(agent-browser:*)`

### Quick Start

```bash
agent-browser open <url>          # Navigate to a page
agent-browser snapshot -i         # List interactive elements with refs
agent-browser click @e1           # Click element by ref
agent-browser fill @e2 "text"     # Fill input by ref
agent-browser close               # Close browser
```

### Key Commands

| Category | Command | Example |
|----------|---------|---------|
| Navigate | `open`, `back`, `forward`, `reload`, `close` | `agent-browser open https://example.com` |
| Snapshot | `snapshot` with flags `-i`, `-c`, `-d`, `-s` | `agent-browser snapshot -i` (interactive elements only) |
| Click | `click`, `dblclick` | `agent-browser click @e3` |
| Input | `fill`, `type`, `press` | `agent-browser fill @e1 "hello"` |
| Forms | `check`, `uncheck`, `select`, `upload` | `agent-browser select @e1 "value"` |
| Read | `get text`, `get html`, `get value`, `get attr` | `agent-browser get text @e1` |
| Visual | `screenshot`, `pdf` | `agent-browser screenshot --full` |
| Wait | `wait @ref`, `wait --text`, `wait --url` | `agent-browser wait --text "Success"` |
| Auth | `state save`, `state load` | `agent-browser state save auth.json` |
| JS | `eval` | `agent-browser eval "document.title"` |

### Typical Workflow

1. `agent-browser open <url>` — navigate
2. `agent-browser snapshot -i` — get interactive elements (returns refs like `@e1`, `@e2`)
3. Interact using the refs from the snapshot
4. Re-snapshot after any navigation or DOM change

---

## Dev Assistant

**Description:** Developer assistant for working with the NanoClaw codebase. Code review, debugging, feature development, and RAG-powered code search.

**Tools:** All (Bash, Read, Write, Edit, RAG search)

### When It Activates

- User asks "how does X work" or "where is Y defined"
- Code review or debugging requests
- Feature development involving existing modules
- Git workflow questions

### Key Workflows

**Code Review:**
1. `git diff HEAD` — see changes
2. `rag_search("module name")` — find all callers/uses
3. Read each changed file
4. Report issues with file:line references

**Debugging:**
1. `rag_search("error message")` — locate relevant code
2. Read source files in the call chain
3. Check logs: `tail -100 groups/main/logs/*.log`
4. Add debug logging, reproduce, fix

**Adding Features:**
1. `rag_search("related module")` — understand existing patterns
2. Write code following project conventions
3. `npm run typecheck` — verify types
4. `npm test` — run tests

### Key File Map

| What | Where |
|------|-------|
| Main orchestrator | `src/index.ts` |
| Container runner | `src/container-runner.ts` |
| SQLite DB | `src/db.ts` |
| RAG system | `src/rag.ts`, `src/rag-server.ts` |
| IPC host↔container | `src/ipc.ts` |
| Agent runner (Claude) | `container/agent-runner/src/index.ts` |
| Agent runner (Ollama) | `container/agent-runner/src/index-ollama.ts` |
| Config | `src/config.ts` |
| Per-group memory | `groups/{folder}/CLAUDE.md` |

---

## Game Dev

**Description:** Build complete, working games using Python (pygame), JavaScript (HTML5 Canvas), or terminal-based approaches.

**Tools:** `Bash(*), Write(*), Read(*), Edit(*), WebSearch`

### When It Activates

- User asks to "create a game", "build a game", or "make a game"
- Any game development request (Python, JS, HTML5)

### Workflow: Plan → Write → Test → Debug → Polish

1. **Plan** (30 seconds max) — core mechanic, tech choice, file list
2. **Write ALL files** — game code, tests, README, dependencies
3. **Test immediately** — run the game, check for crashes
4. **Debug** — read errors, fix, re-test in a loop
5. **Polish** — add missing features, improve UX

### Supported Platforms

| Platform | Template | Test Method |
|----------|----------|-------------|
| Python + pygame | Class-based Game loop | `timeout 3 python game.py` |
| HTML5 Canvas | Single-file HTML+JS | Open in browser |
| Terminal | Input/output loop | Pipe test input |

---

## Godot Game Dev

**Description:** Expert guidance for creating games in Godot Engine 4.x. Covers GDScript, scene trees, nodes, signals, physics, animation, and game architecture.

**Tools:** `Bash(*), Write(*), Read(*), Edit(*), WebSearch(*)`

### When It Activates

- User asks to create a Godot game
- GDScript questions
- Scene/node architecture help
- Godot-specific debugging

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Scenes** | Reusable node trees (`.tscn` files) |
| **Nodes** | Building blocks — Sprite2D, CharacterBody2D, Area2D, etc. |
| **Signals** | Event system for decoupled communication |
| **GDScript** | Python-like language for game logic |
| **Resources** | Data objects separate from logic |
| **@export** | Expose variables in the Godot Inspector |
| **@onready** | Reference child nodes after scene loads |

### Project Structure

```
project/
├── project.godot          # Project config
├── scenes/                # .tscn scene files
├── scripts/               # .gd GDScript files
└── assets/
    ├── sprites/
    ├── sounds/
    └── fonts/
```

### Common Patterns

**Scene creation:**
```gdscript
extends Node2D

signal game_over(score: int)

@export var speed: float = 200.0
@onready var sprite = $Sprite2D

func _ready():
    pass  # Initialize

func _process(delta):
    pass  # Per-frame logic
```

**Input handling:**
```gdscript
func _input(event):
    if event.is_action_pressed("jump"):
        velocity.y = jump_force
```

**Signal connections:**
```gdscript
func _ready():
    $Button.pressed.connect(_on_button_pressed)

func _on_button_pressed():
    print("clicked!")
```

---

## Using Skills from WhatsApp

Skills activate automatically based on your message content. Examples:

| Message | Skill Used |
|---------|-----------|
| `@Andy browse https://example.com and summarize it` | Agent Browser |
| `@Andy how does the message loop work?` | Dev Assistant |
| `@Andy create a snake game in Python` | Game Dev |
| `@Andy build a platformer in Godot` | Godot Game Dev |
| `@Andy debug why the container keeps crashing` | Dev Assistant |
| `@Andy fill out the form at https://...` | Agent Browser |

You don't need to mention the skill name — the agent matches keywords from your message to skill descriptions automatically.
