#!/bin/bash
# Network Isolation with LAN Access
# Use this when Ollama is on a different machine on your LAN

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ISOLATED_NETWORK="nanoclaw-isolated"

echo -e "${YELLOW}⚠️  WARNING: This setup allows LAN access${NC}"
echo -e "${YELLOW}   Containers will be able to reach devices on your local network${NC}"
echo -e "${YELLOW}   This is less secure than full isolation but needed for external Ollama${NC}"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Remove existing network
if docker network inspect "$ISOLATED_NETWORK" >/dev/null 2>&1; then
    echo "Removing existing network..."
    docker network rm "$ISOLATED_NETWORK"
fi

echo "Creating network with LAN access..."

# Create bridge network (not internal) with custom subnet
docker network create \
    --driver bridge \
    --subnet=172.20.0.0/16 \
    --opt com.docker.network.bridge.name=nanoclaw0 \
    --opt com.docker.network.driver.mtu=1500 \
    "$ISOLATED_NETWORK"

echo -e "${GREEN}✓ Network created${NC}"
echo ""
echo "Network Configuration:"
echo "  - Name: $ISOLATED_NETWORK"
echo "  - Type: Bridge (with LAN access)"
echo "  - Subnet: 172.20.0.0/16"
echo ""
echo -e "${GREEN}✓${NC} Containers can now access:"
echo "  ✓ LAN devices (including Ollama)"
echo "  ✓ Mounted volumes"
echo ""
echo -e "${YELLOW}⚠️${NC}  Containers can also access:"
echo "  ⚠️  Internet (via LAN gateway)"
echo ""
echo -e "${YELLOW}Recommendation:${NC} For better security, install Ollama locally"
echo "  See NETWORK_CONFIGURATION.md for details"
