# 🚀 NanoClaw Quick Start Guide

## Three Ways to Use NanoClaw

### 1. 📱 WhatsApp (Recommended for Daily Use)
Interact with your AI assistant via WhatsApp messages on your phone.

### 2. 💻 Command Line (Great for Development)
Use the terminal CLI for quick queries and testing.

### 3. 🔧 Docker Container (Advanced)
Direct container interaction for custom integrations.

---

## Getting Started

### Prerequisites

- ✅ Docker installed and running
- ✅ Node.js 20+
- ✅ Either:
  - Anthropic API key (for Claude mode), OR
  - Ollama + qwen2.5-coder:14b (for local mode)

### Choose Your Mode

#### Option A: Claude Mode (Cloud, Requires API Key)
```bash
cp .env.example .env
# Edit .env and add:
# ANTHROPIC_API_KEY=your_key_here
# USE_OLLAMA=false
```

#### Option B: Ollama Mode (Local, Free)
```bash
# Ensure Ollama is running
ollama serve

# Pull the model (if not already)
ollama pull qwen2.5-coder:14b

# Run automated setup
./setup-ollama.sh
```

---

## Method 1: WhatsApp Interface

### Setup

```bash
# Build images
docker-compose build  # For Claude
# OR
docker-compose -f docker-compose.ollama.yml build  # For Ollama

# Authenticate WhatsApp
docker-compose run --rm nanoclaw npm run auth
# Scan QR code with WhatsApp

# Start services
docker-compose up -d  # For Claude
# OR
docker-compose -f docker-compose.ollama.yml up -d  # For Ollama
```

### Usage

Open WhatsApp and message yourself (in your self-chat):

```
@Andy hello
@Andy list files in my project
@Andy create a Python script that calculates fibonacci numbers
@Andy schedule a daily 9am reminder to review my tasks
```

### View Logs

```bash
docker-compose logs -f nanoclaw
```

---

## Method 2: Command-Line Interface ⭐ NEW!

### Interactive Mode

```bash
cd ~/nanoclaw
./nanoclaw-cli
```

Then just chat:

```
> hello, who are you?
> what files are in this directory?
> create a test.py file
> exit
```

### Single Query Mode

```bash
./nanoclaw-cli "what is 2+2?"
./nanoclaw-cli "list files in current directory"
./nanoclaw-cli "explain this code: $(cat script.py)"
```

### CLI Commands

Inside interactive mode:

- `help` - Show available commands
- `status` - Show session info
- `new` - Start new session (clear context)
- `exit` or `quit` - Exit CLI

### Tips

- **Fast Testing**: Use CLI for rapid iteration
- **No Phone Needed**: Perfect for development
- **Scriptable**: Integrate into shell scripts
- **Session Persistence**: Context maintained across queries

---

## Method 3: Direct Container Usage (Advanced)

For custom integrations:

```bash
# Build container input
cat > input.json << 'EOF'
{
  "prompt": "Hello, what's 2+2?",
  "groupFolder": "test",
  "chatJid": "test@g.us",
  "isMain": false
}
EOF

# Run agent container
docker run --rm -i \
  -v $(pwd)/groups/test:/workspace/group \
  nanoclaw-agent:latest < input.json
```

---

## Configuration Files

### `.env` - Main Configuration

```env
# For Ollama (Local)
USE_OLLAMA=true
OLLAMA_MODEL=qwen2.5-coder:14b
OLLAMA_HOST=http://host.docker.internal:11434
AGENT_IMAGE=nanoclaw-agent-ollama:latest

# For Claude (API)
# USE_OLLAMA=false
# ANTHROPIC_API_KEY=your_key_here
# AGENT_IMAGE=nanoclaw-agent:latest

# Common Settings
CONTAINER_RUNTIME=docker
NODE_ENV=production
LOG_LEVEL=info
```

### File Locations

```
nanoclaw/
├── .env                    # Your configuration
├── nanoclaw-cli           # CLI wrapper script
├── cli.mjs                # CLI implementation
├── docker-compose.yml     # Claude version
├── docker-compose.ollama.yml  # Ollama version
├── data/                  # Database
├── groups/                # Group-specific data
│   ├── main/             # Main group (your private chat)
│   ├── cli/              # CLI sessions
│   └── [other-groups]/   # WhatsApp groups
└── auth-store/           # WhatsApp authentication
```

---

## Quick Commands Reference

### Setup & Build

```bash
# Clone (if not already)
git clone https://github.com/qwibitai/nanoclaw.git
cd nanoclaw

# Ollama setup (automated)
./setup-ollama.sh

# Manual build - Claude
docker-compose build

# Manual build - Ollama
docker-compose -f docker-compose.ollama.yml build
```

### Running Services

```bash
# Start (Claude)
docker-compose up -d

# Start (Ollama)
docker-compose -f docker-compose.ollama.yml up -d

# Stop
docker-compose down

# Restart
docker-compose restart

# View logs
docker-compose logs -f
```

### CLI Usage

```bash
# Interactive mode
./nanoclaw-cli

# Or with npm
npm run cli

# Single query
./nanoclaw-cli "your question"

# Help
./nanoclaw-cli --help

# Test CLI
./test-cli.sh
```

### WhatsApp

```bash
# Initial authentication
docker-compose run --rm nanoclaw npm run auth

# Re-authenticate (if needed)
rm -rf auth-store/*
docker-compose run --rm nanoclaw npm run auth
```

### Ollama Management

```bash
# List models
ollama list

# Pull a model
ollama pull qwen2.5-coder:14b

# Check Ollama status
curl http://localhost:11434/api/tags

# Start Ollama
ollama serve
```

---

## Comparison: WhatsApp vs CLI

| Feature | WhatsApp | CLI |
|---------|----------|-----|
| **Mobile Access** | ✅ Yes | ❌ No |
| **Desktop Access** | ✅ WhatsApp Desktop | ✅ Terminal |
| **Speed** | Normal | ⚡ Fast (local) |
| **Testing** | Awkward | ✅ Easy |
| **Automation** | Limited | ✅ Scriptable |
| **Multiple Groups** | ✅ Yes | Single session |
| **Best For** | Daily use | Development |

---

## Troubleshooting

### Docker Issues

```bash
# Check Docker is running
docker ps

# Check images
docker images | grep nanoclaw

# Remove old containers
docker-compose down
docker system prune
```

### Ollama Issues

```bash
# Check Ollama is running
ps aux | grep ollama

# Test Ollama
curl http://localhost:11434/api/tags

# Start Ollama
ollama serve

# Verify model
ollama list | grep qwen2.5-coder
```

### WhatsApp Issues

```bash
# Check logs
docker-compose logs nanoclaw | tail -50

# Re-authenticate
rm -rf auth-store/*
docker-compose run --rm nanoclaw npm run auth
```

### CLI Issues

```bash
# Check scripts are executable
ls -la nanoclaw-cli cli.mjs

# Make executable if needed
chmod +x nanoclaw-cli cli.mjs

# Check environment
cat .env

# Test without running
./nanoclaw-cli --help
```

---

## Next Steps

### 1. Choose Your Interface

- **Daily use**: Set up WhatsApp
- **Development**: Use CLI
- **Both**: Set up WhatsApp, use CLI for testing

### 2. Configure Your Agent

- Edit `groups/main/CLAUDE.md` for custom memory
- Adjust system prompts for your needs
- Set up scheduled tasks

### 3. Learn More

- **[CLI_GUIDE.md](CLI_GUIDE.md)** - Comprehensive CLI documentation
- **[OLLAMA_SETUP.md](OLLAMA_SETUP.md)** - Local model setup guide
- **[DOCKER_INSTALLATION.md](DOCKER_INSTALLATION.md)** - Docker details
- **[README.md](README.md)** - Full project documentation

### 4. Customize

NanoClaw is designed to be modified. The codebase is small enough to understand and change:

```bash
# Main files to explore:
src/index.ts           # Main application loop
src/container-runner.ts  # Container management
cli.mjs                # CLI interface
container/agent-runner/  # Agent implementations
```

---

## Support & Community

- **Issues**: [GitHub Issues](https://github.com/qwibitai/nanoclaw/issues)
- **Discord**: [Join Discord](https://discord.gg/VGWXrf8x)
- **Docs**: Check the `/docs` folder

---

## Quick Start Checklist

- [ ] Prerequisites installed (Docker, Node.js, Ollama/API key)
- [ ] Repository cloned
- [ ] Environment configured (`.env` file)
- [ ] Docker images built
- [ ] Ollama model downloaded (if using Ollama)
- [ ] WhatsApp authenticated (if using WhatsApp)
- [ ] CLI tested (`./nanoclaw-cli --help`)
- [ ] First query successful!

---

**🎉 You're all set! Enjoy your personal AI assistant!**

Choose your interface and start chatting:
- 📱 WhatsApp: Message yourself "@Andy hello"
- 💻 CLI: Run `./nanoclaw-cli` and start typing
- 🚀 Both: Use whatever is most convenient!

---

*Last updated: February 12, 2026*
