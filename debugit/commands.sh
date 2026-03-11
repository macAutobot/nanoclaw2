#!/bin/bash
# NanoClaw Command Reference
# Quick-access commands you can ask NanoClaw to run
# Usage: ./debugit/commands.sh [category]
#   ./debugit/commands.sh          — show all categories
#   ./debugit/commands.sh tasks    — show task/scheduling commands
#   ./debugit/commands.sh browser  — show browser commands
#   ./debugit/commands.sh games    — show game dev commands
#   etc.

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

category="${1:-all}"

show_header() {
  echo ""
  echo -e "${BOLD}${CYAN}━━━ $1 ━━━${NC}"
  echo ""
}

show_cmd() {
  echo -e "  ${GREEN}▸${NC} ${BOLD}$1${NC}"
  echo -e "    ${DIM}$2${NC}"
  echo ""
}

# ── Scheduling & Tasks ──
show_tasks() {
  show_header "📅 Scheduling & Tasks"
  show_cmd "Scan my directories every day at 9am and send me a summary" \
    "Creates a cron task (0 9 * * *) that runs an agent to scan and report"
  show_cmd "Remind me every Monday at 8am to review pull requests" \
    "Recurring cron task with group context"
  show_cmd "In 30 minutes, check if the server is still running" \
    "One-time task using 'once' schedule type"
  show_cmd "Every 6 hours, check disk usage and warn me if it's over 80%" \
    "Interval task (21600000ms) with conditional messaging"
  show_cmd "Run a backup of my workspace files every night at midnight" \
    "Cron task (0 0 * * *) in isolated mode"
  show_cmd "List all my scheduled tasks" \
    "Calls list_tasks to show active schedules"
  show_cmd "Pause the daily scan task" \
    "Pauses a task by ID without deleting it"
  show_cmd "Cancel all my reminders" \
    "Lists then cancels tasks"
  show_cmd "Schedule a weather check every morning at 7am and message me the forecast" \
    "Isolated context — self-contained with web search"
}

# ── Browser & Web ──
show_browser() {
  show_header "🌐 Browser & Web"
  show_cmd "Go to https://news.ycombinator.com and summarize the top 5 stories" \
    "Uses agent-browser to navigate, snapshot, and extract content"
  show_cmd "Take a screenshot of my website at https://example.com" \
    "Browser screenshot saved as PNG in workspace"
  show_cmd "Fill out the contact form at https://example.com/contact with my info" \
    "Browser automation — clicks, fills fields, submits"
  show_cmd "Log into GitHub and check my notifications" \
    "Browser with auth state save/load for persistent sessions"
  show_cmd "Search Google for 'best Node.js frameworks 2026' and give me the top results" \
    "Web search + browser for deeper scraping if needed"
  show_cmd "Download the PDF from https://example.com/report.pdf and summarize it" \
    "WebFetch + file analysis"
  show_cmd "Monitor https://example.com/status every hour and alert me if it goes down" \
    "Combines schedule_task + browser/fetch for uptime monitoring"
  show_cmd "Scrape all product prices from https://example.com/products" \
    "Browser navigation + DOM extraction"
}

# ── Code & Development ──
show_code() {
  show_header "💻 Code & Development"
  show_cmd "Review the code in my workspace and find bugs" \
    "Code review mode — reads all files, finds issues, scores quality"
  show_cmd "Create a Python script that converts CSV to JSON" \
    "Writes file + tests it with bash"
  show_cmd "Debug why my script throws an error when I run it" \
    "Reads code, executes it, traces the error"
  show_cmd "Refactor Player.gd to use state machines instead of if-else chains" \
    "Reads existing code, plans refactor, implements it"
  show_cmd "Search the codebase for all files that reference 'database'" \
    "Uses RAG search and grep to find references"
  show_cmd "Set up a new Node.js project with Express and TypeScript" \
    "Creates project structure, package.json, tsconfig, boilerplate"
  show_cmd "Write unit tests for my Python functions in utils.py" \
    "Reads the file, generates pytest tests, runs them"
  show_cmd "Explain how the task scheduler works in this project" \
    "Uses RAG search + file reading to trace execution flow"
  show_cmd "Create a git commit with a good message for my current changes" \
    "Runs git diff, writes descriptive commit message, commits"
  show_cmd "Install and configure ESLint for my JavaScript project" \
    "npm install + config file creation + initial lint run"
}

# ── Games ──
show_games() {
  show_header "🎮 Game Development"
  show_cmd "Build a Snake game in Python with pygame" \
    "Full game: plan → code → test → debug → polish"
  show_cmd "Create an HTML5 Canvas platformer game" \
    "Browser-playable game with physics and input handling"
  show_cmd "Make a terminal-based Tetris game" \
    "Python curses-based game that runs in the terminal"
  show_cmd "Create a Godot 4 project with a player that can move and jump" \
    "GDScript scene tree, CharacterBody2D, input mapping"
  show_cmd "Add enemies with patrol AI to my Godot game" \
    "NavigationAgent2D, state machine, collision detection"
  show_cmd "Build a card matching memory game in HTML" \
    "HTML + CSS + JS with flip animations and score tracking"
}

# ── File & System ──
show_files() {
  show_header "📁 File & System Operations"
  show_cmd "List all files in my workspace" \
    "ls, find, or glob across /workspace/group"
  show_cmd "Find all Python files larger than 1MB" \
    "find + file size filtering"
  show_cmd "Create a directory structure for a new project called MyApp" \
    "mkdir -p with conventional layout"
  show_cmd "Rename all .txt files to .md in my documents folder" \
    "Bash loop with mv"
  show_cmd "Compress my project into a zip file" \
    "zip/tar command on workspace files"
  show_cmd "Show me disk usage for my workspace" \
    "du -sh breakdown by directory"
  show_cmd "Find and delete all .DS_Store files" \
    "find + rm cleanup"
  show_cmd "Count lines of code across all my Python files" \
    "find + wc -l with summary"
  show_cmd "Read my CLAUDE.md and tell me what it says" \
    "Reads the group memory file"
  show_cmd "Update my CLAUDE.md to remember that I prefer dark themes" \
    "Edits the persistent group memory file"
}

# ── Communication ──
show_messaging() {
  show_header "💬 Messaging & Communication"
  show_cmd "Send a message to the main group saying 'deployment complete'" \
    "Uses send_message IPC tool for cross-group messaging (main only)"
  show_cmd "Compose a professional email about the project status" \
    "Generates formatted text (use with Gmail integration if set up)"
  show_cmd "Summarize our last conversation" \
    "Uses group context mode to access chat history"
  show_cmd "Draft a README for my project" \
    "Reads codebase, generates comprehensive README.md"
  show_cmd "Create a changelog from my recent git commits" \
    "git log parsing + formatted markdown output"
}

# ── RAG & Knowledge ──
show_rag() {
  show_header "🔍 RAG & Knowledge Search"
  show_cmd "Search the codebase for how authentication works" \
    "rag_search for semantic code retrieval"
  show_cmd "Index my new documentation files so you can find them later" \
    "rag_index to add files to the search database"
  show_cmd "What do you know about the container runner?" \
    "RAG search + file reading for deep knowledge retrieval"
  show_cmd "Find all references to 'schedule_task' across the project" \
    "Combines grep + RAG for comprehensive search"
}

# ── Advanced ──
show_advanced() {
  show_header "⚡ Advanced & Multi-Step"
  show_cmd "Plan a new feature for user authentication, then implement it" \
    "Uses /plan mode first, then /build mode"
  show_cmd "Create a REST API, write tests, and generate documentation" \
    "Multi-step: scaffold → implement → test → document"
  show_cmd "Analyze my codebase and create an architecture diagram in Mermaid" \
    "Reads project structure, generates mermaid markdown"
  show_cmd "Set up a daily stand-up report that summarizes what changed in git" \
    "schedule_task + git log + send_message"
  show_cmd "Build a dashboard page that shows my scheduled tasks and their status" \
    "HTML file with task data, serveable locally"
  show_cmd "Create a CI pipeline config for GitHub Actions" \
    "Generates .github/workflows/ci.yml with test + build steps"
  show_cmd "Run my test suite and fix any failing tests" \
    "Execute tests, read errors, edit code, re-run until green"
}

# ── CLI Modes ──
show_modes() {
  show_header "🎯 CLI Modes (prefix commands)"
  show_cmd "/plan create a multiplayer game architecture" \
    "Research & plan only — no file changes. Outputs a structured plan."
  show_cmd "/build implement the login page from the plan" \
    "Implementation only — writes code, no lengthy planning."
  show_cmd "/review check my codebase for security issues" \
    "Code review mode — reads & critiques, doesn't modify files."
  show_cmd "/default" \
    "Full agent mode — plans and builds (this is the default)."
  echo -e "  ${DIM}Prefix with mode for one-shot, or type mode alone to switch sticky.${NC}"
  echo ""
}

# ── Main ──

echo -e "${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║          NanoClaw Command Reference              ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo -e "${DIM}These are example prompts you can send to NanoClaw${NC}"
echo -e "${DIM}via WhatsApp or the CLI (./nanoclaw-cli).${NC}"

case "$category" in
  tasks|schedule) show_tasks ;;
  browser|web)    show_browser ;;
  code|dev)       show_code ;;
  games|game)     show_games ;;
  files|system)   show_files ;;
  message|msg)    show_messaging ;;
  rag|search)     show_rag ;;
  advanced)       show_advanced ;;
  modes|mode)     show_modes ;;
  all)
    show_tasks
    show_browser
    show_code
    show_games
    show_files
    show_messaging
    show_rag
    show_advanced
    show_modes
    ;;
  *)
    echo ""
    echo -e "${YELLOW}Unknown category: $category${NC}"
    echo -e "Available: ${DIM}tasks, browser, code, games, files, message, rag, advanced, modes${NC}"
    ;;
esac

echo -e "${DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${DIM}Run: ./debugit/commands.sh [category] to filter${NC}"
echo -e "${DIM}Categories: tasks, browser, code, games, files, message, rag, advanced, modes${NC}"
