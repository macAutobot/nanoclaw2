#!/bin/bash
# Docker Network Setup for NanoClaw Security
# Creates isolated network for agent containers

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up Docker network isolation for NanoClaw${NC}"

# Network names
ISOLATED_NETWORK="nanoclaw-isolated"
HOST_NETWORK="host"

# Check if isolated network exists
if docker network inspect "$ISOLATED_NETWORK" >/dev/null 2>&1; then
    echo -e "${YELLOW}Network $ISOLATED_NETWORK already exists${NC}"
else
    echo "Creating isolated network: $ISOLATED_NETWORK"
    
    # Create internal network (no internet access)
    docker network create \
        --driver bridge \
        --internal \
        --subnet=172.20.0.0/16 \
        --opt com.docker.network.bridge.name=nanoclaw0 \
        "$ISOLATED_NETWORK"
    
    echo -e "${GREEN}✓ Created isolated network${NC}"
fi

# Verify network is internal
IS_INTERNAL=$(docker network inspect "$ISOLATED_NETWORK" --format '{{.Internal}}')
if [ "$IS_INTERNAL" != "true" ]; then
    echo -e "${RED}ERROR: Network is not internal! Recreating...${NC}"
    docker network rm "$ISOLATED_NETWORK" || true
    docker network create \
        --driver bridge \
        --internal \
        --subnet=172.20.0.0/16 \
        "$ISOLATED_NETWORK"
fi

echo -e "${GREEN}✓ Network isolation configured${NC}"
echo ""
echo "Network Configuration:"
echo "  - Agent containers: $ISOLATED_NETWORK (no internet)"
echo "  - Main service: default bridge (with internet for WhatsApp)"
echo "  - Ollama access: via host network (host.docker.internal)"
echo ""
echo -e "${YELLOW}Note:${NC} Agent containers will be able to access:"
echo "  ✓ Ollama on host (if configured with host.docker.internal)"
echo "  ✓ Mounted volumes"
echo "  ✗ Internet (blocked)"
echo "  ✗ Other containers (isolated)"
