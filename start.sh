#!/bin/bash
# NanoClaw Startup Script
# Ensures proper environment variables are set and security features enabled

cd "$(dirname "$0")"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Starting NanoClaw...${NC}"

# Set environment variables
export AGENT_IMAGE=nanoclaw-agent-ollama:latest
export CONTAINER_RUNTIME=docker

# Setup network isolation (if using Docker)
if [ "$CONTAINER_RUNTIME" = "docker" ]; then
  echo "Checking Docker network isolation..."
  if ! docker network inspect nanoclaw-isolated >/dev/null 2>&1; then
    echo -e "${YELLOW}Setting up network isolation...${NC}"
    ./setup-network-isolation.sh
  else
    echo -e "${GREEN}✓ Network isolation configured${NC}"
  fi
fi

echo -e "${GREEN}Starting NanoClaw service...${NC}"
AGENT_IMAGE=$AGENT_IMAGE CONTAINER_RUNTIME=$CONTAINER_RUNTIME npm start
