# Agent Customization Guide

This guide explains how to add applications and dependencies to the NanoClaw agent, and how to rebuild the Docker image.

---

## Quick Start

### 1. Edit the Dockerfile
Modify the appropriate Dockerfile:
- **For Ollama agent**: `container/Dockerfile.ollama`
- **For Claude Agent SDK**: `container/Dockerfile`

### 2. Add your application
See [Adding Applications](#adding-applications) below.

### 3. Rebuild the image
```bash
./scripts/rebuild-agent.sh
```

The script will ask which agent you want to rebuild and handle the build process.

---

## Adding Applications

### System Packages (apt-get)

The agent runs on **Debian Linux**, so you can add any Debian/Ubuntu packages.

**Ollama Dockerfile (container/Dockerfile.ollama):**

Find the `apt-get install` line and add packages:

```dockerfile
# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    python3 \
    python3-pip \
    your-new-package \
    another-package \
    && rm -rf /var/lib/apt/lists/*
```

**Claude Agent Dockerfile (container/Dockerfile):**

Same process - find and modify the `apt-get install` section.

### Python Packages (pip)

Python packages can be installed in the Dockerfile:

```dockerfile
RUN pip install package-name another-package
```

Or the agent can install them at runtime using bash:

```
Run: pip install requests numpy pandas
```

### Node.js Packages (npm)

Add to the agent-runner's `package.json`:

```bash
cd container/agent-runner
npm install package-name
```

### Examples

#### Add Git LFS (for large files)
```dockerfile
RUN apt-get update && apt-get install -y \
    curl \
    git \
    git-lfs \
    && rm -rf /var/lib/apt/lists/*
```

#### Add Java
```dockerfile
RUN apt-get update && apt-get install -y \
    default-jre \
    default-jdk \
    && rm -rf /var/lib/apt/lists/*
```

#### Add Rust compiler
```dockerfile
RUN apt-get update && apt-get install -y \
    curl \
    && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
    && rm -rf /var/lib/apt/lists/*
```

#### Add Docker CLI (for container-in-container)
```dockerfile
RUN apt-get update && apt-get install -y \
    docker.io \
    && rm -rf /var/lib/apt/lists/*
```

---

## Rebuilding the Image

### Using the Script (Recommended)

```bash
./scripts/rebuild-agent.sh
```

The script will:
1. Verify Docker is running
2. Ask which agent image to rebuild
3. Build with `--no-cache` to pick up new dependencies
4. Show build status with colors
5. Tell you when it's ready

### Manual Rebuild

If you prefer to rebuild manually:

**For Ollama agent:**
```bash
cd container
docker build -f Dockerfile.ollama -t nanoclaw-agent-ollama:latest --no-cache .
```

**For Claude Agent SDK:**
```bash
cd container
docker build -f Dockerfile -t nanoclaw-agent:latest --no-cache .
```

The `--no-cache` flag is important — it forces Docker to re-run all commands instead of using cached layers.

---

## Verifying the Installation

### Test in CLI

After rebuilding, test your new application:

```bash
./nanoclaw-cli
```

Then in the interactive prompt:

```
> which python3
> pip --version
> npm --version
```

### Test Directly with Docker

```bash
docker run --rm --entrypoint sh nanoclaw-agent-ollama:latest -c "python3 --version"
```

### Test in Agent Prompt

When the agent is running in WhatsApp/Telegram:

```
@Andy Run: python3 --version
```

---

## Build Process Explained

When you rebuild, Docker:

1. **Loads the Dockerfile** — Reads your modified instructions
2. **Checks the cache** — Normally uses cached layers (if unchanged)
3. **`--no-cache` override** — Forces rebuilding all layers
4. **Runs each instruction** — apt-get update, install packages, etc.
5. **Creates a new image** — Tags it with your image name
6. **Ready to use** — Next container run uses the new image

### Why `--no-cache`?

Docker's build cache can be aggressive. If you modify a line, Docker might still use the old cached result. The `--no-cache` flag guarantees a clean rebuild of all layers.

---

## Common Issues

### "Package not found"
If `apt-get install package-name` fails:
- Package name might be different in Debian
- Search online: `apt-cache search keyword`
- Or in Docker: `docker run --rm debian:bookworm apt-cache search keyword`

### "Command not found after rebuild"
- Verify the package actually installs the command
- Some packages install to unusual paths
- Check the package documentation

### Build takes too long
- First build takes longer (downloading base image, dependencies)
- Subsequent builds are faster if cached
- Python packages especially can take time to compile

### Docker daemon not running
On macOS, start Docker Desktop before running the script.

---

## Example: Adding Multiple Tools

Here's a real example — adding Python, Node, and git-lfs:

**container/Dockerfile.ollama:**
```dockerfile
FROM node:22-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    git-lfs \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
RUN pip install requests numpy pandas

# ... rest of Dockerfile
```

Then rebuild:
```bash
./scripts/rebuild-agent.sh
# Select: 1 (Ollama)
# Wait for build...
# Test: which python3, which git-lfs, npm --version
```

---

## What Gets Mounted in the Container?

The agent has access to:
- `/workspace/group` — Your group folder (read/write)
- `/workspace/global` — Global memory (read-only for non-main groups)
- `/workspace/ipc` — Task messages (read/write)
- `/home/node/.claude` — Claude Code settings
- Any additional mounts from `mount-allowlist.json`

The agent **cannot** access:
- Your Mac's file system (except explicitly mounted folders)
- Other containers or processes
- Network (unless explicitly allowed)
- Credentials or secrets (unless mounted)

This is intentional for security.

---

## Tips & Best Practices

✅ **Do:**
- Use layer caching intelligently — put frequently-changed commands at the end
- Install multiple packages in one `RUN` command to reduce layers
- Remove package managers' caches (`rm -rf /var/lib/apt/lists/*`) to keep images small
- Test with small changes before adding many packages
- Document why you added each package (in a comment)

❌ **Don't:**
- Run `apt-get update` in separate `RUN` commands (breaks caching)
- Install unnecessary packages (bloats the image)
- Forget `--no-cache` if changes didn't take effect
- Run the agent as root (Dockerfile uses `node` user for security)

---

## Image Size

Different images have different sizes:

- **nanoclaw-agent-ollama** — ~1GB (Node.js + Ollama support)
- **nanoclaw-agent** — ~2.4GB (Node.js + Claude Agent SDK)

Installing additional packages will increase the size slightly. Clean up unnecessary dependencies to keep it lean.

---

## Next Steps

- [DEBUGGING_AND_DEVELOPMENT.md](DEBUGGING_AND_DEVELOPMENT.md) — Troubleshoot agent issues
- [SDK_DEEP_DIVE.md](SDK_DEEP_DIVE.md) — Understand how the agent runs
- [SECURITY.md](SECURITY.md) — Learn about container isolation
