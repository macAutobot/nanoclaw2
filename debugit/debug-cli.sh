#!/bin/bash
# NanoClaw CLI Debug Script
# Diagnoses why nanoclaw-cli isn't working
# Usage: ./debugit/debug-cli.sh

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

PASS=0
FAIL=0
WARN=0
ISSUES=()

pass() { echo -e "  ${GREEN}✓${NC} $1"; ((PASS++)); }
fail() { echo -e "  ${RED}✗${NC} $1"; ((FAIL++)); ISSUES+=("$1"); }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; ((WARN++)); }
section() { echo -e "\n${BOLD}${CYAN}── $1 ──${NC}"; }

echo -e "${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║     NanoClaw CLI Debug Report            ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"
echo -e "${DIM}$(date)${NC}"
echo -e "${DIM}Project: $PROJECT_DIR${NC}"

# ── 1. Environment File ──
section "1. Environment (.env)"

if [[ -f .env ]]; then
  pass ".env file exists"
  
  # Source it for checks — use eval to handle edge cases
  while IFS='=' read -r key value; do
    [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
    key=$(echo "$key" | xargs)
    export "$key=$value"
  done < .env

  if [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
    KEY_PREFIX="${ANTHROPIC_API_KEY:0:10}..."
    pass "ANTHROPIC_API_KEY set ($KEY_PREFIX)"
  else
    warn "ANTHROPIC_API_KEY not set (needed for Claude mode)"
  fi

  if [[ "${USE_OLLAMA:-}" == "true" ]]; then
    warn "USE_OLLAMA=true — using Ollama (local LLM) instead of Claude"
  else
    pass "USE_OLLAMA not set or false — using Claude API"
  fi

  echo -e "  ${DIM}CONTAINER_RUNTIME=${CONTAINER_RUNTIME:-not set}${NC}"
  echo -e "  ${DIM}AGENT_IMAGE=${AGENT_IMAGE:-not set}${NC}"
  echo -e "  ${DIM}OLLAMA_MODEL=${OLLAMA_MODEL:-not set}${NC}"
else
  fail ".env file missing — create one from .env.example or set variables"
fi

# ── 2. Node.js ──
section "2. Node.js"

if command -v node &>/dev/null; then
  NODE_VER=$(node --version)
  NODE_MAJOR=$(echo "$NODE_VER" | sed 's/v//' | cut -d. -f1)
  if (( NODE_MAJOR >= 20 )); then
    pass "Node.js $NODE_VER (>= 20 required)"
  else
    fail "Node.js $NODE_VER too old (>= 20 required)"
  fi
else
  fail "Node.js not found"
fi

if [[ -d node_modules ]]; then
  pass "node_modules exists"
else
  fail "node_modules missing — run: npm install"
fi

if [[ -f node_modules/.package-lock.json ]] || [[ -f package-lock.json ]]; then
  pass "Lock file present"
else
  warn "No package-lock.json found"
fi

# ── 3. CLI Files ──
section "3. CLI Files"

if [[ -f nanoclaw-cli ]]; then
  pass "nanoclaw-cli exists"
  if [[ -x nanoclaw-cli ]]; then
    pass "nanoclaw-cli is executable"
  else
    fail "nanoclaw-cli not executable — run: chmod +x nanoclaw-cli"
  fi
else
  fail "nanoclaw-cli not found"
fi

if [[ -f cli.mjs ]]; then
  pass "cli.mjs exists"
else
  fail "cli.mjs missing"
fi

# ── 4. Container Runtime ──
section "4. Container Runtime"

RUNTIME="${CONTAINER_RUNTIME:-container}"
echo -e "  ${DIM}Configured runtime: $RUNTIME${NC}"

if [[ "$RUNTIME" == "docker" ]]; then
  if command -v docker &>/dev/null; then
    pass "Docker CLI found at $(which docker)"
    if docker info &>/dev/null 2>&1; then
      pass "Docker daemon is running"
    else
      fail "Docker daemon not running — start Docker Desktop or: sudo systemctl start docker"
    fi
  else
    fail "Docker not installed but CONTAINER_RUNTIME=docker"
  fi
elif [[ "$RUNTIME" == "container" ]]; then
  if command -v container &>/dev/null; then
    pass "Apple Container CLI found at $(which container)"
  else
    fail "Apple Container CLI not found but CONTAINER_RUNTIME=container"
  fi
fi

# ── 5. Agent Image ──
section "5. Agent Image"

IMAGE="${AGENT_IMAGE:-nanoclaw-agent:latest}"
echo -e "  ${DIM}Expected image: $IMAGE${NC}"

if [[ "$RUNTIME" == "docker" ]]; then
  if docker image inspect "$IMAGE" &>/dev/null 2>&1; then
    pass "Docker image '$IMAGE' exists"
    SIZE=$(docker image inspect "$IMAGE" --format='{{.Size}}' 2>/dev/null)
    echo -e "  ${DIM}Image size: $((SIZE / 1024 / 1024))MB${NC}"
  else
    fail "Docker image '$IMAGE' not found — build with: ./container/build.sh"
  fi
elif [[ "$RUNTIME" == "container" ]]; then
  if container images 2>/dev/null | grep -q "${IMAGE%%:*}"; then
    pass "Container image '$IMAGE' exists"
  else
    fail "Container image '$IMAGE' not found — build with: ./container/build.sh"
  fi
fi

# ── 6. Ollama (if USE_OLLAMA=true) ──
section "6. Ollama Connectivity"

if [[ "${USE_OLLAMA:-}" == "true" ]]; then
  # Always check localhost from the host — OLLAMA_HOST may be a docker-internal addr
  OLLAMA_URL="http://localhost:${OLLAMA_PORT:-11434}"
  echo -e "  ${DIM}Ollama URL (host-side): $OLLAMA_URL${NC}"
  echo -e "  ${DIM}OLLAMA_HOST in .env: ${OLLAMA_HOST:-not set}${NC}"

  if curl -s --connect-timeout 3 "$OLLAMA_URL/" &>/dev/null; then
    pass "Ollama is running at $OLLAMA_URL"
    
    # Check if model is available
    MODEL="${OLLAMA_MODEL:-qwen2.5-coder:14b}"
    MODELS=$(curl -s "$OLLAMA_URL/api/tags" 2>/dev/null)
    if echo "$MODELS" | grep -q "$MODEL"; then
      pass "Model '$MODEL' is available"
    else
      fail "Model '$MODEL' not found — run: ollama pull $MODEL"
      echo -e "  ${DIM}Available models:${NC}"
      echo "$MODELS" | grep -o '"name":"[^"]*"' | sed 's/"name":"//;s/"$//' | while read -r m; do
        echo -e "    ${DIM}  - $m${NC}"
      done
    fi
  else
    fail "Ollama NOT running at $OLLAMA_URL"
    echo -e "  ${RED}  This is the main problem! The agent container can't reach Ollama.${NC}"
    echo ""
    echo -e "  ${YELLOW}Fix options:${NC}"
    echo -e "    ${BOLD}Option A:${NC} Start Ollama"
    echo -e "      ${DIM}brew services start ollama${NC}"
    echo -e "      ${DIM}# or: ollama serve${NC}"
    echo ""
    echo -e "    ${BOLD}Option B:${NC} Switch to Claude API (you have an API key set)"
    echo -e "      ${DIM}Edit .env and set:${NC}"
    echo -e "      ${DIM}  USE_OLLAMA=false${NC}"
    echo -e "      ${DIM}  AGENT_IMAGE=nanoclaw-agent:latest${NC}"
  fi

  # Check Docker can reach host
  if [[ "$RUNTIME" == "docker" ]]; then
    echo ""
    echo -e "  ${DIM}Testing host.docker.internal from container...${NC}"
    DOCKER_HOST_TEST=$(docker run --rm --add-host host.docker.internal:host-gateway alpine:latest wget -qO- --timeout=3 http://host.docker.internal:11434/ 2>&1 || true)
    if [[ -n "$DOCKER_HOST_TEST" ]] && ! echo "$DOCKER_HOST_TEST" | grep -qi "error\|refused\|timeout"; then
      pass "Container can reach host.docker.internal:11434"
    else
      fail "Container CANNOT reach host.docker.internal:11434"
      echo -e "  ${DIM}  Docker host networking may need --add-host flag${NC}"
    fi
  fi
else
  pass "USE_OLLAMA is not true — skipping Ollama checks"
  echo -e "  ${DIM}Using Claude API via ANTHROPIC_API_KEY${NC}"
fi

# ── 7. RAG Server ──
section "7. RAG Server"

RAG_PORT="${RAG_PORT:-7700}"
if lsof -Pi ":$RAG_PORT" -sTCP:LISTEN -t &>/dev/null; then
  RAG_PID=$(lsof -Pi ":$RAG_PORT" -sTCP:LISTEN -t 2>/dev/null)
  pass "RAG server running on port $RAG_PORT (PID: $RAG_PID)"
else
  warn "RAG server not running on port $RAG_PORT (optional — CLI starts it automatically)"
fi

# ── 8. Groups Directory ──
section "8. Groups & Workspace"

if [[ -d groups/cli ]]; then
  pass "groups/cli directory exists"
  if [[ -f groups/cli/CLAUDE.md ]]; then
    pass "groups/cli/CLAUDE.md exists"
  else
    warn "groups/cli/CLAUDE.md missing — will be auto-created"
  fi
else
  warn "groups/cli not found — will be auto-created on first run"
fi

# ── 9. Quick Container Test ──
section "9. Container Smoke Test"

echo -e "  ${DIM}Running quick container test...${NC}"
if [[ "$RUNTIME" == "docker" ]]; then
  SMOKE=$(docker run --rm --entrypoint node "$IMAGE" -e "console.log('container-ok')" 2>&1 || true)
  if echo "$SMOKE" | grep -q "container-ok"; then
    pass "Container runs and node works inside"
  else
    fail "Container smoke test failed"
    echo -e "  ${DIM}Output: $SMOKE${NC}"
  fi
elif [[ "$RUNTIME" == "container" ]]; then
  SMOKE=$(container run --rm --entrypoint node "$IMAGE" -e "console.log('container-ok')" 2>&1 || true)
  if echo "$SMOKE" | grep -q "container-ok"; then
    pass "Container runs and node works inside"
  else
    fail "Container smoke test failed"
    echo -e "  ${DIM}Output: $SMOKE${NC}"
  fi
fi

# ── 10. Full CLI Dry Run ──
section "10. CLI Dry Run"

echo -e "  ${DIM}Running: ./nanoclaw-cli \"ping\" ...${NC}"
CLI_OUTPUT=$(./nanoclaw-cli "say hello" 2>&1 || true)
CLI_EXIT=$?

if echo "$CLI_OUTPUT" | grep -q "Container exited with code"; then
  EXIT_CODE=$(echo "$CLI_OUTPUT" | grep -o 'code [0-9]*' | head -1 | grep -o '[0-9]*')
  fail "CLI agent failed (container exit code $EXIT_CODE)"
  
  # Extract error from stderr
  ERROR_LINE=$(echo "$CLI_OUTPUT" | grep -i "error" | head -3)
  if [[ -n "$ERROR_LINE" ]]; then
    echo -e "  ${DIM}Error details:${NC}"
    echo "$ERROR_LINE" | while read -r line; do
      echo -e "    ${RED}$line${NC}"
    done
  fi
elif echo "$CLI_OUTPUT" | grep -q "NANOCLAW_OUTPUT_END"; then
  pass "CLI produced agent output"
else
  warn "CLI ran but output unclear"
  echo -e "  ${DIM}${CLI_OUTPUT:0:200}${NC}"
fi

# ── Summary ──
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║               Summary                    ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"
echo -e "  ${GREEN}Passed: $PASS${NC}  ${RED}Failed: $FAIL${NC}  ${YELLOW}Warnings: $WARN${NC}"

if (( FAIL > 0 )); then
  echo ""
  echo -e "${RED}${BOLD}Issues found:${NC}"
  for issue in "${ISSUES[@]}"; do
    echo -e "  ${RED}• $issue${NC}"
  done
  echo ""
  
  # Smart fix suggestions
  if printf '%s\n' "${ISSUES[@]}" | grep -qi "ollama.*not running"; then
    echo -e "${YELLOW}${BOLD}Root cause: Ollama is not running${NC}"
    echo -e "The CLI is configured to use Ollama (USE_OLLAMA=true) but the"
    echo -e "Ollama server isn't running on this machine."
    echo ""
    echo -e "${BOLD}Quick fixes:${NC}"
    echo -e "  ${GREEN}1. Start Ollama:${NC}"
    echo -e "     ${DIM}ollama serve${NC}"
    echo -e "     ${DIM}# or: brew services start ollama${NC}"
    echo ""
    echo -e "  ${GREEN}2. Switch to Claude API instead:${NC}"
    echo -e "     ${DIM}sed -i '' 's/USE_OLLAMA=true/USE_OLLAMA=false/' .env${NC}"
    echo -e "     ${DIM}sed -i '' 's/AGENT_IMAGE=nanoclaw-agent-ollama:latest/AGENT_IMAGE=nanoclaw-agent:latest/' .env${NC}"
    echo ""
  fi
  
  if printf '%s\n' "${ISSUES[@]}" | grep -qi "image.*not found"; then
    echo -e "${YELLOW}${BOLD}Missing container image:${NC}"
    echo -e "  ${DIM}./container/build.sh${NC}"
    echo ""
  fi
  
  if printf '%s\n' "${ISSUES[@]}" | grep -qi "node_modules"; then
    echo -e "${YELLOW}${BOLD}Dependencies missing:${NC}"
    echo -e "  ${DIM}npm install${NC}"
    echo ""
  fi

  exit 1
else
  echo ""
  echo -e "${GREEN}${BOLD}All checks passed!${NC} The CLI should be working."
  exit 0
fi
