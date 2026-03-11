# NanoClaw CLI - Command-Line Interface

## Overview

The NanoClaw CLI allows you to interact with the AI agent directly from your terminal, without needing WhatsApp. Perfect for testing, development, and quick queries.

## Features

✅ **Interactive Mode** - Chat with the agent in your terminal  
✅ **Single Query Mode** - Run one-off commands  
✅ **Session Persistence** - Maintains conversation context  
✅ **Works with Both Modes** - Claude and Ollama versions  
✅ **File Operations** - Full access to file system  
✅ **Command Execution** - Run shell commands via the agent  

## Installation

The CLI is already set up in your NanoClaw installation. No additional installation needed!

## Usage

### Interactive Mode (Recommended)

Start an interactive chat session:

```bash
cd ~/nanoclaw
./nanoclaw-cli
```

Or using npm:

```bash
npm run cli
```

You'll see:

```
============================================================
  NanoClaw CLI - Interactive Mode
============================================================

ℹ Agent Image: nanoclaw-agent-ollama:latest
ℹ Mode: Ollama (Local)
ℹ Model: qwen2.5-coder:14b

Type your messages and press Enter. Type "exit" or "quit" to leave.
Type "new" to start a new session (clear context).
Type "help" for more commands.

> 
```

### Single Query Mode

Run a one-off query:

```bash
./nanoclaw-cli "what is 2+2?"
```

```bash
./nanoclaw-cli "list files in the current directory"
```

```bash
./nanoclaw-cli "create a Python script that prints hello world"
```

## Interactive Mode Commands

Once in interactive mode, you can use these commands:

| Command | Description |
|---------|-------------|
| `help` | Show help message |
| `status` | Show current session status |
| `new` | Start a new session (clear context) |
| `exit` or `quit` | Exit the CLI |

Any other input is sent to the agent as a query.

## Examples

### Example 1: Basic Chat

```bash
$ ./nanoclaw-cli

> hello, who are you?

I'm Andy, your AI assistant running in NanoClaw. I can help you with
coding tasks, file operations, and system commands. What can I help 
you with today?

> what files are in this directory?

Let me check that for you.

[agent runs: ls -la]

Here are the files in the current directory:
- Dockerfile
- docker-compose.yml
- package.json
- README.md
...
```

### Example 2: Code Generation

```bash
$ ./nanoclaw-cli

> create a Python script that calculates fibonacci numbers

I'll create a fibonacci.py script for you.

[agent creates file]

✓ Created fibonacci.py with the following implementation:
...

> now run it

[agent runs: python fibonacci.py]

Output: 0, 1, 1, 2, 3, 5, 8, 13, 21...
```

### Example 3: Single Queries

```bash
# Quick calculation
$ ./nanoclaw-cli "what is 123 * 456?"

$ ./nanoclaw-cli "check git status"

$ ./nanoclaw-cli "find all Python files in this directory"
```

## Configuration

### Environment Variables

The CLI uses the same environment variables as the main application:

| Variable | Description | Default |
|----------|-------------|---------|
| `AGENT_IMAGE` | Docker image to use | `nanoclaw-agent:latest` |
| `USE_OLLAMA` | Use Ollama mode | `false` |
| `OLLAMA_MODEL` | Ollama model name | `qwen2.5-coder:14b` |
| `OLLAMA_HOST` | Ollama API host | `http://host.docker.internal:11434` |

These are automatically loaded from your `.env` file.

### Switching Between Claude and Ollama

The CLI automatically detects which mode to use based on your `.env` file:

**For Ollama:**
```env
USE_OLLAMA=true
AGENT_IMAGE=nanoclaw-agent-ollama:latest
OLLAMA_MODEL=qwen2.5-coder:14b
```

**For Claude:**
```env
USE_OLLAMA=false
AGENT_IMAGE=nanoclaw-agent:latest
ANTHROPIC_API_KEY=your_key_here
```

## How It Works

### Architecture

```
Terminal → CLI Script → Docker Container → Agent (Ollama/Claude) → Response
```

1. **CLI Script** (`cli.mjs`) - Node.js script that handles user input
2. **Docker Container** - Spawns agent container with proper mounts
3. **Agent** - Runs your query (Ollama or Claude version)
4. **Response** - Parsed and displayed in terminal

### Session Management

- Sessions are stored in `groups/cli/.sessions/`
- Each interactive session maintains context across multiple queries
- Use the `new` command to start fresh
- Single queries don't create persistent sessions

### File Access

The CLI has access to the `groups/cli/` directory, which includes:
- Working directory: `/workspace/group`
- CLAUDE.md memory file
- Session history
- Any files you create

## Advanced Usage

### Custom Docker Image

Use a different agent image:

```bash
AGENT_IMAGE=my-custom-agent:latest ./nanoclaw-cli
```

### Different Ollama Model

Switch models on the fly:

```bash
OLLAMA_MODEL=qwen2.5-coder:7b ./nanoclaw-cli "quick question"
```

### Debugging

Enable verbose output:

```bash
DEBUG=1 ./nanoclaw-cli
```

## Comparison: CLI vs WhatsApp

| Feature | WhatsApp | CLI |
|---------|----------|-----|
| **Access** | Mobile/Desktop WhatsApp | Terminal |
| **Speed** | Depends on network | Local (fast) |
| **Testing** | Requires phone | Easy testing |
| **Automation** | Limited | Scriptable |
| **Groups** | Multiple groups | Single CLI group |
| **Persistence** | Full history | Session-based |
| **Best For** | Daily use, mobile | Development, testing |

## Troubleshooting

### Issue: "docker: command not found"

**Solution**: Make sure Docker is installed and running:
```bash
docker --version
docker ps
```

### Issue: "Cannot connect to Ollama"

**Solution**: Verify Ollama is running:
```bash
curl http://localhost:11434/api/tags
# Or start it:
ollama serve
```

### Issue: Agent container fails to start

**Solution**: Check if the image exists:
```bash
docker images | grep nanoclaw
```

Build if missing:
```bash
docker-compose -f docker-compose.ollama.yml build
```

### Issue: No response from agent

**Cause**: Container may have crashed

**Solution**: Check container logs:
```bash
docker ps -a | grep nanoclaw-cli
docker logs [container-id]
```

### Issue: "Permission denied"

**Solution**: Make sure scripts are executable:
```bash
chmod +x nanoclaw-cli cli.mjs
```

## Tips & Best Practices

### 1. Use Interactive Mode for Development

Interactive mode is great for:
- Testing features
- Debugging code
- Exploring capabilities
- Long conversations

### 2. Use Single Query Mode for Scripts

Single query mode is perfect for:
- Shell scripts
- CI/CD pipelines
- Cron jobs
- Quick lookups

### 3. Start Fresh When Needed

If the agent seems confused or context is too long:
```bash
> new
```

### 4. Check Session Status

Monitor your session:
```bash
> status
```

### 5. Combine with Other Tools

```bash
# Use in scripts
result=$(./nanoclaw-cli "analyze this code: $(cat script.py)")
echo "$result"

# Pipe input
cat requirements.txt | ./nanoclaw-cli "explain these dependencies"

# Chain commands
./nanoclaw-cli "create test.py" && python test.py
```

## Integration with Scripts

### Bash Script Example

```bash
#!/bin/bash
# automated-code-review.sh

files=$(git diff --name-only HEAD~1)

for file in $files; do
    echo "Reviewing $file..."
    ./nanoclaw-cli "review this code for bugs: $(cat $file)"
done
```

### Python Script Example

```python
#!/usr/bin/env python3
import subprocess

def ask_agent(question):
    result = subprocess.run(
        ['./nanoclaw-cli', question],
        capture_output=True,
        text=True
    )
    return result.stdout

response = ask_agent("what is the capital of France?")
print(response)
```

## Keyboard Shortcuts (Interactive Mode)

- `Ctrl+C` - Cancel current input (doesn't exit)
- `Ctrl+D` - Exit CLI (same as typing "exit")
- `↑` / `↓` - Navigate command history
- `Tab` - (No autocomplete yet - future feature)

## Future Enhancements

Planned features:

- [ ] Streaming responses for real-time output
- [ ] Command history with search
- [ ] Tab completion
- [ ] Multi-line input support
- [ ] Syntax highlighting for code blocks
- [ ] Export conversation to file
- [ ] Load context from file

## Help Command

Run the help command for quick reference:

```bash
./nanoclaw-cli --help
```

Output:
```
NanoClaw CLI - Command-line interface for the agent

Usage:
  nanoclaw-cli              Interactive mode
  nanoclaw-cli "prompt"     Single query
  nanoclaw-cli -h, --help   Show this help

Examples:
  nanoclaw-cli
  nanoclaw-cli "list files in current directory"
  nanoclaw-cli "what is 2+2?"

Environment Variables:
  AGENT_IMAGE     Docker image to use
  USE_OLLAMA      Set to "true" for Ollama mode
  OLLAMA_MODEL    Ollama model to use
  OLLAMA_HOST     Ollama API host
```

## Quick Reference

```bash
# Interactive mode
./nanoclaw-cli

# Single query
./nanoclaw-cli "your question here"

# Help
./nanoclaw-cli --help

# Using npm
npm run cli

# Check what's running
docker ps | grep nanoclaw

# View CLI group files
ls -la groups/cli/
```

## Summary

The NanoClaw CLI provides a powerful way to interact with your AI assistant directly from the terminal. Whether you're:

- 🧪 **Testing** new features
- 💻 **Developing** integrations
- ⚡ **Running** quick queries
- 🤖 **Automating** workflows

The CLI makes it easy and fast!

---

**Pro Tip**: Add an alias to your shell for even quicker access:

```bash
# Add to ~/.zshrc or ~/.bashrc
alias andy='~/nanoclaw/nanoclaw-cli'

# Then just:
$ andy "what time is it?"
```

---

**Created**: February 12, 2026  
**Compatible with**: Ollama and Claude modes  
**Status**: ✅ Ready to use
