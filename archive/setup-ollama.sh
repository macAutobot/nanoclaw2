#!/bin/bash
# NanoClaw Ollama Setup Script
# Automates the setup of NanoClaw with local Ollama models

set -e

OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5-coder:14b}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=================================================="
echo "  NanoClaw Ollama Setup"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check Ollama installation
echo "Step 1: Checking Ollama installation..."
if command -v ollama &> /dev/null; then
    echo -e "${GREEN}✓${NC} Ollama is installed at: $(which ollama)"
else
    echo -e "${RED}✗${NC} Ollama is not installed"
    echo ""
    echo "Please install Ollama from: https://ollama.com/download"
    echo "Then run this script again."
    exit 1
fi

# Step 2: Check if Ollama is running
echo ""
echo "Step 2: Checking Ollama service..."
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Ollama service is running"
else
    echo -e "${YELLOW}⚠${NC} Ollama service may not be running"
    echo "Attempting to start Ollama..."
    ollama serve > /dev/null 2>&1 &
    sleep 3
    
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Ollama service started successfully"
    else
        echo -e "${RED}✗${NC} Could not start Ollama service"
        echo "Please start Ollama manually: ollama serve"
        exit 1
    fi
fi

# Step 3: Check if model is available
echo ""
echo "Step 3: Checking for model ${OLLAMA_MODEL}..."
if ollama list | grep -q "${OLLAMA_MODEL}"; then
    echo -e "${GREEN}✓${NC} Model ${OLLAMA_MODEL} is available"
else
    echo -e "${YELLOW}⚠${NC} Model ${OLLAMA_MODEL} not found"
    echo "Would you like to download it now? This will download ~9GB. (y/n)"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "Pulling ${OLLAMA_MODEL}..."
        ollama pull "${OLLAMA_MODEL}"
        echo -e "${GREEN}✓${NC} Model downloaded successfully"
    else
        echo "Skipping model download. Please run: ollama pull ${OLLAMA_MODEL}"
        exit 1
    fi
fi

# Step 4: Check Docker
echo ""
echo "Step 4: Checking Docker installation..."
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker is installed"
    
    if docker ps > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Docker daemon is running"
    else
        echo -e "${RED}✗${NC} Docker daemon is not running"
        echo "Please start Docker Desktop and run this script again."
        exit 1
    fi
else
    echo -e "${RED}✗${NC} Docker is not installed"
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Step 5: Create .env file
echo ""
echo "Step 5: Configuring environment..."
cd "$SCRIPT_DIR"

if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
# NanoClaw Ollama Configuration
USE_OLLAMA=true
OLLAMA_MODEL=${OLLAMA_MODEL}
OLLAMA_HOST=http://host.docker.internal:11434

# Container Configuration
AGENT_IMAGE=nanoclaw-agent-ollama:latest
CONTAINER_RUNTIME=docker

# Application Settings
NODE_ENV=production
LOG_LEVEL=info
TZ=UTC

# Database
DB_PATH=/app/data/nanoclaw.db
EOF
    echo -e "${GREEN}✓${NC} Created .env file"
else
    echo -e "${YELLOW}⚠${NC} .env file already exists"
    echo "Updating Ollama settings..."
    
    # Update or add Ollama settings
    if grep -q "OLLAMA_MODEL" .env; then
        sed -i.bak "s/OLLAMA_MODEL=.*/OLLAMA_MODEL=${OLLAMA_MODEL}/" .env
    else
        echo "OLLAMA_MODEL=${OLLAMA_MODEL}" >> .env
    fi
    
    if ! grep -q "USE_OLLAMA" .env; then
        echo "USE_OLLAMA=true" >> .env
    fi
    
    if ! grep -q "OLLAMA_HOST" .env; then
        echo "OLLAMA_HOST=http://host.docker.internal:11434" >> .env
    fi
    
    if ! grep -q "AGENT_IMAGE" .env; then
        echo "AGENT_IMAGE=nanoclaw-agent-ollama:latest" >> .env
    fi
    
    echo -e "${GREEN}✓${NC} Updated .env file"
fi

# Step 6: Build Docker images
echo ""
echo "Step 6: Building Docker images..."
echo "This may take 3-5 minutes..."

if docker-compose -f docker-compose.ollama.yml build; then
    echo -e "${GREEN}✓${NC} Docker images built successfully"
else
    echo -e "${RED}✗${NC} Failed to build Docker images"
    exit 1
fi

# Step 7: Verify images
echo ""
echo "Step 7: Verifying Docker images..."
if docker images | grep -q "nanoclaw-agent-ollama"; then
    echo -e "${GREEN}✓${NC} nanoclaw-agent-ollama:latest image found"
else
    echo -e "${RED}✗${NC} Agent image not found"
    exit 1
fi

if docker images | grep -q "nanoclaw"; then
    echo -e "${GREEN}✓${NC} nanoclaw:latest image found"
else
    echo -e "${RED}✗${NC} Main app image not found"
    exit 1
fi

# Final summary
echo ""
echo "=================================================="
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo "=================================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Authenticate with WhatsApp:"
echo "   docker-compose -f docker-compose.ollama.yml run --rm nanoclaw-ollama npm run auth"
echo ""
echo "2. Start NanoClaw:"
echo "   docker-compose -f docker-compose.ollama.yml up -d"
echo ""
echo "3. View logs:"
echo "   docker-compose -f docker-compose.ollama.yml logs -f nanoclaw-ollama"
echo ""
echo "4. Send a message to your WhatsApp self-chat:"
echo "   @Andy hello"
echo ""
echo "=================================================="
echo ""
echo "Configuration:"
echo "  Model: ${OLLAMA_MODEL}"
echo "  Ollama Host: http://localhost:11434"
echo "  Agent Image: nanoclaw-agent-ollama:latest"
echo ""
echo "For more information, see: OLLAMA_SETUP.md"
echo ""
