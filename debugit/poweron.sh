#!/bin/bash
# NanoClaw Power-On Script
# Starts all services needed after a reboot
# Usage: ./debugit/poweron.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; ERRORS=1; }
skip() { echo -e "  ${DIM}⏭ $1${NC}"; }
wait_for() { echo -e "  ${YELLOW}⏳${NC} $1"; }

ERRORS=0

# Load .env
if [[ -f .env ]]; then
  while IFS='=' read -r key value; do
    [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
    key=$(echo "$key" | xargs)
    export "$key=$value"
  done < .env
else
  fail ".env not found — can't determine configuration"
  exit 1
fi

RUNTIME="${CONTAINER_RUNTIME:-container}"

echo -e "${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║       NanoClaw Power-On                  ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"
echo -e "${DIM}$(date)${NC}"
echo ""

# ── 1. Docker ──
echo -e "${CYAN}1. Container Runtime ($RUNTIME)${NC}"

if [[ "$RUNTIME" == "docker" ]]; then
  if docker info &>/dev/null 2>&1; then
    ok "Docker is already running"
  else
    wait_for "Starting Docker Desktop..."
    open -a Docker 2>/dev/null || open -a "Docker Desktop" 2>/dev/null || true
    # Wait for Docker to be ready (up to 60s)
    for i in {1..30}; do
      if docker info &>/dev/null 2>&1; then
        ok "Docker started (${i}s)"
        break
      fi
      sleep 2
    done
    if ! docker info &>/dev/null 2>&1; then
      fail "Docker failed to start after 60s — start Docker Desktop manually"
    fi
  fi

  # Ensure network isolation
  if ! docker network inspect nanoclaw-isolated &>/dev/null 2>&1; then
    wait_for "Creating isolated Docker network..."
    if docker network create --internal nanoclaw-isolated &>/dev/null; then
      ok "Created nanoclaw-isolated network"
    else
      skip "Network creation skipped (non-critical)"
    fi
  else
    ok "Docker network nanoclaw-isolated exists"
  fi
elif [[ "$RUNTIME" == "container" ]]; then
  if command -v container &>/dev/null; then
    ok "Apple Container CLI available"
  else
    fail "Apple Container CLI not found"
  fi
fi

echo ""

# ── 2. Ollama ──
echo -e "${CYAN}2. Ollama${NC}"

if [[ "${USE_OLLAMA:-}" == "true" ]]; then
  OLLAMA_PORT="${OLLAMA_PORT:-11434}"

  if curl -s --connect-timeout 2 "http://localhost:$OLLAMA_PORT/" &>/dev/null; then
    ok "Ollama already running on port $OLLAMA_PORT"
  else
    wait_for "Starting Ollama..."

    # Try brew services first, fall back to ollama serve
    if command -v brew &>/dev/null && brew services list 2>/dev/null | grep -q ollama; then
      brew services start ollama &>/dev/null
      STARTED_VIA="brew services"
    elif command -v ollama &>/dev/null; then
      nohup ollama serve &>/dev/null &
      STARTED_VIA="ollama serve (background)"
    else
      fail "Ollama not installed — install with: brew install ollama"
      STARTED_VIA=""
    fi

    if [[ -n "${STARTED_VIA:-}" ]]; then
      # Wait up to 15s for Ollama to respond
      for i in {1..15}; do
        if curl -s --connect-timeout 1 "http://localhost:$OLLAMA_PORT/" &>/dev/null; then
          ok "Ollama started via $STARTED_VIA (${i}s)"
          break
        fi
        sleep 1
      done
      if ! curl -s --connect-timeout 1 "http://localhost:$OLLAMA_PORT/" &>/dev/null; then
        fail "Ollama failed to start — try manually: ollama serve"
      fi
    fi
  fi

  # Verify model is available
  MODEL="${OLLAMA_MODEL:-qwen2.5-coder:14b}"
  if curl -s "http://localhost:$OLLAMA_PORT/api/tags" 2>/dev/null | grep -q "$MODEL"; then
    ok "Model '$MODEL' available"
  else
    wait_for "Model '$MODEL' not found — pulling (this may take a while)..."
    if ollama pull "$MODEL" 2>/dev/null; then
      ok "Model '$MODEL' pulled"
    else
      fail "Could not pull model '$MODEL' — run manually: ollama pull $MODEL"
    fi
  fi
else
  skip "Ollama disabled (USE_OLLAMA != true)"
fi

echo ""

# ── 3. RAG Server ──
echo -e "${CYAN}3. RAG Server${NC}"

RAG_PORT="${RAG_PORT:-7700}"

if lsof -Pi ":$RAG_PORT" -sTCP:LISTEN -t &>/dev/null; then
  RAG_PID=$(lsof -Pi ":$RAG_PORT" -sTCP:LISTEN -t 2>/dev/null)
  ok "RAG server already running on port $RAG_PORT (PID: $RAG_PID)"
else
  wait_for "Starting RAG server on port $RAG_PORT..."
  nohup node --import tsx/esm src/rag-server.ts >"$PROJECT_DIR/logs/rag-server.log" 2>&1 &
  RAG_PID=$!

  # Wait up to 5s
  for i in {1..5}; do
    if lsof -Pi ":$RAG_PORT" -sTCP:LISTEN -t &>/dev/null; then
      ok "RAG server started (PID: $RAG_PID)"
      break
    fi
    sleep 1
  done
  if ! lsof -Pi ":$RAG_PORT" -sTCP:LISTEN -t &>/dev/null; then
    fail "RAG server failed to start — check logs/rag-server.log"
  fi
fi

echo ""

# ── 4. NanoClaw Service ──
echo -e "${CYAN}4. NanoClaw Service${NC}"

PLIST_SRC="$PROJECT_DIR/launchd/com.nanoclaw.plist"
PLIST_DST="$HOME/Library/LaunchAgents/com.nanoclaw.plist"

if launchctl list 2>/dev/null | grep -q com.nanoclaw; then
  ok "NanoClaw launchd service is loaded"
else
  if [[ -f "$PLIST_DST" ]]; then
    wait_for "Loading NanoClaw launchd service..."
    launchctl load "$PLIST_DST" 2>/dev/null
    if launchctl list 2>/dev/null | grep -q com.nanoclaw; then
      ok "NanoClaw service loaded"
    else
      fail "Failed to load launchd service"
    fi
  elif [[ -f "$PLIST_SRC" ]]; then
    skip "Launchd plist not installed — install with:"
    echo -e "    ${DIM}cp $PLIST_SRC $PLIST_DST${NC}"
    echo -e "    ${DIM}# Edit the plist to replace {{placeholders}} with actual paths${NC}"
    echo -e "    ${DIM}launchctl load $PLIST_DST${NC}"
  else
    skip "No launchd plist found — NanoClaw can be run manually: npm start"
  fi
fi

# Check if nanoclaw process is running (even without launchd)
if pgrep -f "node.*dist/index.js" &>/dev/null || pgrep -f "tsx.*src/index.ts" &>/dev/null; then
  NANO_PID=$(pgrep -f "node.*dist/index.js" 2>/dev/null || pgrep -f "tsx.*src/index.ts" 2>/dev/null)
  ok "NanoClaw process running (PID: $NANO_PID)"
else
  skip "NanoClaw process not running — start with: npm start (or npm run dev)"
fi

echo ""

# ── 5. Verify End-to-End ──
echo -e "${CYAN}5. Quick Verification${NC}"

# Container image
IMAGE="${AGENT_IMAGE:-nanoclaw-agent:latest}"
if [[ "$RUNTIME" == "docker" ]]; then
  if docker image inspect "$IMAGE" &>/dev/null 2>&1; then
    ok "Agent image '$IMAGE' exists"
  else
    fail "Agent image '$IMAGE' missing — rebuild: ./container/build.sh"
  fi
elif [[ "$RUNTIME" == "container" ]]; then
  if container images 2>/dev/null | grep -q "${IMAGE%%:*}"; then
    ok "Agent image '$IMAGE' exists"
  else
    fail "Agent image '$IMAGE' missing — rebuild: ./container/build.sh"
  fi
fi

# Logs directory
mkdir -p "$PROJECT_DIR/logs" 2>/dev/null
ok "Logs directory ready"

echo ""

# ── Summary ──
echo -e "${BOLD}╔══════════════════════════════════════════╗${NC}"
if [[ $ERRORS -eq 0 ]]; then
  echo -e "${BOLD}║  ${GREEN}All services started successfully!${NC}${BOLD}       ║${NC}"
else
  echo -e "${BOLD}║  ${YELLOW}Started with some issues (see above)${NC}${BOLD}    ║${NC}"
fi
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"

echo ""
echo -e "${DIM}Services running:${NC}"
[[ "${USE_OLLAMA:-}" == "true" ]] && echo -e "  ${DIM}• Ollama        → http://localhost:${OLLAMA_PORT:-11434}${NC}"
echo -e "  ${DIM}• RAG Server    → http://localhost:${RAG_PORT}${NC}"
echo -e "  ${DIM}• Docker        → $(docker info --format '{{.ServerVersion}}' 2>/dev/null || echo 'N/A')${NC}"
echo -e "  ${DIM}• CLI ready     → ./nanoclaw-cli${NC}"
echo ""

exit $ERRORS
