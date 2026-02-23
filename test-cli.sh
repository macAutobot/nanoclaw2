#!/bin/bash
# Quick test of NanoClaw CLI
# Tests both Claude and Ollama modes

echo "======================================"
echo "  NanoClaw CLI Test"
echo "======================================"
echo ""

cd "$(dirname "$0")"

# Test 1: Help command
echo "Test 1: Help Command"
echo "------------------------------------"
./nanoclaw-cli --help
echo ""

# Test 2: Check environment
echo "Test 2: Environment Check"
echo "------------------------------------"
echo "Agent Image: ${AGENT_IMAGE:-nanoclaw-agent:latest}"
echo "Use Ollama: ${USE_OLLAMA:-false}"
echo "Ollama Model: ${OLLAMA_MODEL:-qwen2.5-coder:14b}"
echo ""

# Test 3: Check Docker images
echo "Test 3: Available Docker Images"
echo "------------------------------------"
docker images | grep nanoclaw | head -5
echo ""

# Test 4: Verify Ollama (if enabled)
if [ "$USE_OLLAMA" = "true" ]; then
    echo "Test 4: Ollama Status"
    echo "------------------------------------"
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "✓ Ollama is running"
        echo "Available models:"
        curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | head -5
    else
        echo "✗ Ollama is not running"
        echo "Start with: ollama serve"
    fi
    echo ""
fi

# Test 5: Simple query (if user confirms)
echo "Test 5: Run Sample Query?"
echo "------------------------------------"
echo "This will run: ./nanoclaw-cli \"what is 2+2?\""
echo ""
read -p "Run test query? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Running query..."
    echo ""
    ./nanoclaw-cli "what is 2+2?"
    echo ""
    echo "✓ Test query completed"
else
    echo "Skipped test query"
fi

echo ""
echo "======================================"
echo "  Tests Complete"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Try interactive mode: ./nanoclaw-cli"
echo "2. Run a query: ./nanoclaw-cli \"your question\""
echo "3. See full guide: cat CLI_GUIDE.md"
echo ""
