# Using NanoClaw with Local Ollama Models

## Overview

This guide explains how to use NanoClaw with local Ollama models (like `qwen2.5-coder:14b`) instead of Claude Code/Anthropic API. This allows you to run NanoClaw completely offline without requiring an Anthropic API key.

## Benefits of Using Ollama

✅ **No API Costs** - Run completely free on your local hardware  
✅ **Privacy** - All data stays on your machine  
✅ **Offline Operation** - No internet required after model download  
✅ **Customizable** - Use any Ollama-compatible model  

## Prerequisites

### 1. Check if Ollama is Installed

```bash
which ollama
```

If not installed, download from: https://ollama.com/download

### 2. Check if qwen2.5-coder:14b is Available

```bash
ollama list
```

### 3. Pull the Model (if not present)

```bash
ollama pull qwen2.5-coder:14b
```

**Size**: ~9GB  
**Time**: 5-15 minutes depending on your connection

## Current Status on Your System

Based on the check:

```bash
✅ Ollama installed: /usr/local/bin/ollama
✅ Model downloading: qwen2.5-coder:14b (in progress)

Currently available models:
- llama2:latest (3.8 GB)
- mistral:latest (4.4 GB)  
- llama3.3:latest (42 GB)
```

## Setup Instructions

### Step 1: Ensure Ollama is Running

```bash
# Check if Ollama service is running
ps aux | grep ollama

# If not running, start it
ollama serve
```

Ollama typically runs on `http://localhost:11434` by default.

### Step 2: Test Ollama Connection

```bash
curl http://localhost:11434/api/tags
```

You should see a JSON response listing your models.

### Step 3: Configure NanoClaw for Ollama

Edit your `.env` file:

```bash
cd ~/nanoclaw
nano .env
```

Add or update these variables:

```env
# Use Ollama instead of Claude
USE_OLLAMA=true
OLLAMA_MODEL=qwen2.5-coder:14b
OLLAMA_HOST=http://host.docker.internal:11434

# Specify the Ollama agent image
AGENT_IMAGE=nanoclaw-agent-ollama:latest

# No need for ANTHROPIC_API_KEY when using Ollama
# ANTHROPIC_API_KEY=  # Leave empty or comment out

CONTAINER_RUNTIME=docker
NODE_ENV=production
TZ=UTC
LOG_LEVEL=info
```

### Step 4: Build the Ollama-Based Docker Images

```bash
cd ~/nanoclaw

# Build using the Ollama docker-compose configuration
docker-compose -f docker-compose.ollama.yml build
```

This creates:
- `nanoclaw:latest` - Main application
- `nanoclaw-agent-ollama:latest` - Agent container with Ollama integration

### Step 5: Start NanoClaw with Ollama

```bash
# Start services
docker-compose -f docker-compose.ollama.yml up -d

# View logs
docker-compose -f docker-compose.ollama.yml logs -f nanoclaw-ollama
```

### Step 6: Authenticate WhatsApp (First Time Only)

```bash
docker-compose -f docker-compose.ollama.yml run --rm nanoclaw-ollama npm run auth
```

Scan the QR code with WhatsApp to link your account.

## Using NanoClaw with Ollama

Once running, use NanoClaw exactly as you would with Claude:

### Via WhatsApp

```
@Andy what files are in my project?
@Andy create a new Python script that prints hello world
@Andy summarize the README.md file
```

### The Model's Capabilities

The `qwen2.5-coder:14b` model:
- ✅ Excellent for coding tasks
- ✅ Good for file operations and system commands
- ✅ Understands code in multiple languages
- ⚠️ May be less capable than Claude for complex reasoning
- ⚠️ No native tool use (implemented via prompt engineering)
- ⚠️ Slower on CPU-only systems (GPU recommended)

## Model Selection

### Available Models

You can use any Ollama model. Here are some coding-focused options:

| Model | Size | Best For |
|-------|------|----------|
| `qwen2.5-coder:14b` | 9GB | Balanced coding performance |
| `qwen2.5-coder:7b` | 4.7GB | Faster, lighter coding |
| `qwen2.5-coder:32b` | 20GB | Best quality (requires good hardware) |
| `codellama:13b` | 7.4GB | Alternative coding model |
| `deepseek-coder:6.7b` | 3.8GB | Lightweight coding |

### Switching Models

To use a different model:

1. Pull the model:
   ```bash
   ollama pull deepseek-coder:6.7b
   ```

2. Update `.env`:
   ```env
   OLLAMA_MODEL=deepseek-coder:6.7b
   ```

3. Restart NanoClaw:
   ```bash
   docker-compose -f docker-compose.ollama.yml restart
   ```

## Architecture

### How It Works

```
WhatsApp → NanoClaw App → Docker Agent Container
                              ↓
                         Ollama API (localhost:11434)
                              ↓
                         qwen2.5-coder:14b model
                              ↓
                         Response → WhatsApp
```

### Key Differences from Claude Version

| Feature | Claude Version | Ollama Version |
|---------|---------------|----------------|
| Dependencies | Claude Agent SDK | Node.js + Fetch API |
| Tool Use | Native tool support | Prompt-based command execution |
| Authentication | API key required | No authentication |
| Cost | Pay per token | Free (hardware cost) |
| Speed | Fast (cloud) | Varies (depends on hardware) |
| Context | 200K tokens | 8K-32K tokens (model dependent) |

## Troubleshooting

### Issue: Cannot Connect to Ollama

**Error**: `Cannot connect to Ollama at http://host.docker.internal:11434`

**Solutions**:

1. Verify Ollama is running:
   ```bash
   ps aux | grep ollama
   ```

2. Test connectivity from Docker:
   ```bash
   docker run --rm --add-host=host.docker.internal:host-gateway curlimages/curl \
     curl -v http://host.docker.internal:11434/api/tags
   ```

3. If Ollama isn't running:
   ```bash
   ollama serve
   ```

### Issue: Model Not Found

**Error**: `model 'qwen2.5-coder:14b' not found`

**Solution**:
```bash
# List available models
ollama list

# Pull the model
ollama pull qwen2.5-coder:14b

# Verify it's available
ollama list | grep qwen2.5-coder
```

### Issue: Slow Response Times

**Causes**:
- Running on CPU instead of GPU
- Model too large for your hardware
- Insufficient RAM

**Solutions**:

1. Use a smaller model:
   ```bash
   ollama pull qwen2.5-coder:7b
   ```
   Update `.env`: `OLLAMA_MODEL=qwen2.5-coder:7b`

2. Check Ollama resource usage:
   ```bash
   ollama ps
   ```

3. Consider GPU setup if available

### Issue: Container Runtime Error

**Error**: Still trying to use Apple Container

**Solution**: The main app needs to be configured to use Docker runtime. Make sure your main `Dockerfile` and `.env` are properly configured with `CONTAINER_RUNTIME=docker`.

### Issue: Out of Memory

**Error**: `OOM (Out of Memory)` or container crashes

**Solutions**:

1. Allocate more memory to Docker Desktop:
   - Open Docker Desktop Settings
   - Resources → Memory
   - Increase to at least 8GB (16GB recommended for 14B models)

2. Use a smaller model (see Model Selection above)

## Performance Comparison

### Hardware Requirements

| Model Size | RAM Required | CPU Time* | GPU Time* |
|------------|-------------|-----------|-----------|
| 7B | 8GB | ~3-5s | ~0.5-1s |
| 14B | 16GB | ~8-12s | ~1-2s |
| 32B | 32GB | ~20-30s | ~3-5s |

*Approximate response generation time per query

### Recommended Hardware

- **Minimum**: 8GB RAM, 4-core CPU, qwen2.5-coder:7b
- **Recommended**: 16GB RAM, 8-core CPU, qwen2.5-coder:14b
- **Optimal**: 32GB RAM, Apple M1/M2 or NVIDIA GPU, qwen2.5-coder:32b

## Switching Back to Claude

To switch back to Claude:

1. Stop Ollama services:
   ```bash
   docker-compose -f docker-compose.ollama.yml down
   ```

2. Update `.env`:
   ```env
   USE_OLLAMA=false
   ANTHROPIC_API_KEY=your_api_key_here
   AGENT_IMAGE=nanoclaw-agent:latest
   ```

3. Start with regular docker-compose:
   ```bash
   docker-compose up -d
   ```

## Limitations

### Current Limitations of Ollama Version

1. **No Native Tool Support**: Commands are extracted from markdown code blocks and executed
2. **Simpler Context Management**: Sessions are stored as JSON, not using Claude's sophisticated session management
3. **No MCP Servers**: Model Context Protocol servers not supported
4. **No Agent Teams**: Swarm/team features not available
5. **Smaller Context Window**: Typically 8K-32K tokens vs Claude's 200K
6. **No Streaming**: Responses are batch-processed, not streamed

### What Still Works

✅ WhatsApp integration  
✅ Multi-group isolation  
✅ File operations  
✅ Shell command execution  
✅ Session persistence  
✅ Scheduled tasks (with caveats)  
✅ Group-specific memory (CLAUDE.md)  

## Advanced Configuration

### Custom System Prompts

Edit `/Users/dizzydevil/nanoclaw/container/agent-runner/src/index-ollama.ts` to customize the system prompt:

```typescript
function buildSystemPrompt(containerInput: ContainerInput): string {
  let systemPrompt = `You are [Your Custom Name], a helpful AI assistant...`
  // ... customize further
}
```

### Environment Variables

All available environment variables for Ollama mode:

```env
# Ollama Configuration
USE_OLLAMA=true
OLLAMA_MODEL=qwen2.5-coder:14b
OLLAMA_HOST=http://host.docker.internal:11434

# Container Configuration
AGENT_IMAGE=nanoclaw-agent-ollama:latest
CONTAINER_RUNTIME=docker
CONTAINER_TIMEOUT=1800000

# Application Settings
NODE_ENV=production
LOG_LEVEL=info
TZ=UTC

# Database
DB_PATH=/app/data/nanoclaw.db
```

## Quick Reference Commands

```bash
# Check Ollama status
ollama list
ollama ps

# Build Ollama version
docker-compose -f docker-compose.ollama.yml build

# Start services
docker-compose -f docker-compose.ollama.yml up -d

# View logs
docker-compose -f docker-compose.ollama.yml logs -f nanoclaw-ollama

# Stop services
docker-compose -f docker-compose.ollama.yml down

# Restart services
docker-compose -f docker-compose.ollama.yml restart

# Test Ollama from shell
curl http://localhost:11434/api/tags

# Pull new model
ollama pull [model-name]
```

---

**Last Updated**: February 2026  
**Ollama Version**: Compatible with Ollama 0.1.0+  
**Tested Models**: qwen2.5-coder (7b, 14b, 32b), codellama, deepseek-coder
