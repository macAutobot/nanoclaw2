#!/bin/bash
# Rebuild NanoClaw Agent Container
# Use this script after modifying Dockerfile.ollama to rebuild the agent image with new applications/dependencies

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  NanoClaw Agent Image Rebuild Script   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if Docker is running
echo -e "${YELLOW}Checking Docker...${NC}"
if ! docker info >/dev/null 2>&1; then
  echo -e "${RED}✗ Docker is not running. Please start Docker and try again.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"
echo ""

# Get the Ollama or standard agent choice
echo -e "${YELLOW}Which agent image do you want to rebuild?${NC}"
echo "1. Ollama (local models) - ${BLUE}nanoclaw-agent-ollama:latest${NC}"
echo "2. Claude Agent SDK - ${BLUE}nanoclaw-agent:latest${NC}"
echo ""
read -p "Enter choice (1 or 2): " choice
echo ""

case $choice in
  1)
    DOCKERFILE="container/Dockerfile.ollama"
    IMAGE_NAME="nanoclaw-agent-ollama:latest"
    ;;
  2)
    DOCKERFILE="container/Dockerfile"
    IMAGE_NAME="nanoclaw-agent:latest"
    ;;
  *)
    echo -e "${RED}✗ Invalid choice${NC}"
    exit 1
    ;;
esac

# Verify Dockerfile exists
if [ ! -f "$DOCKERFILE" ]; then
  echo -e "${RED}✗ Dockerfile not found: $DOCKERFILE${NC}"
  exit 1
fi

echo -e "${YELLOW}Building: ${BLUE}$IMAGE_NAME${NC}"
echo -e "${YELLOW}Dockerfile: ${BLUE}$DOCKERFILE${NC}"
echo ""

# Build with --no-cache to pick up any new dependencies
echo -e "${YELLOW}Starting build (this may take a few minutes)...${NC}"
echo ""

if [ -d "container" ]; then
  cd container
fi

if docker build -f "$(basename $DOCKERFILE)" -t "$IMAGE_NAME" --no-cache . ; then
  echo ""
  echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║     Build Successful!                  ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${GREEN}✓ Image ready: $IMAGE_NAME${NC}"
  echo ""
  echo -e "${BLUE}Next steps:${NC}"
  echo "  1. Test the agent: ./nanoclaw-cli"
  echo "  2. Or run your scheduled tasks: npm start"
  echo ""
else
  echo ""
  echo -e "${RED}✗ Build failed${NC}"
  exit 1
fi
