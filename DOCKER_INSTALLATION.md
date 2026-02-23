# NanoClaw Docker Installation Guide

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Building the Docker Images](#building-the-docker-images)
- [Running NanoClaw](#running-nanoclaw)
- [WhatsApp Authentication](#whatsapp-authentication)
- [Troubleshooting](#troubleshooting)
- [Important Notes](#important-notes)

## Overview

NanoClaw is a personal Claude assistant that runs securely in containers and connects via WhatsApp. This guide provides instructions for setting up NanoClaw using Docker.

**Repository**: https://github.com/qwibitai/nanoclaw

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Docker Desktop** (macOS/Linux)
   - Download from: https://www.docker.com/products/docker-desktop
   - Ensure Docker daemon is running

2. **Node.js 20+** (for local development, optional)
   - Download from: https://nodejs.org/

3. **Anthropic API Key**
   - Sign up at: https://console.anthropic.com/
   - Required for Claude Agent SDK functionality

4. **WhatsApp Account**
   - You'll need a phone number for WhatsApp authentication

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/qwibitai/nanoclaw.git
cd nanoclaw
```

### 2. Configure Environment Variables

Copy the example environment file and add your Anthropic API key:

```bash
cp .env.example .env
```

Edit `.env` and add your API key:

```env
ANTHROPIC_API_KEY=your_actual_api_key_here
CONTAINER_RUNTIME=docker
NODE_ENV=production
```

### 3. Build Docker Images

Build both the main application and agent container images:

```bash
docker-compose build
```

This will create two images:
- `nanoclaw:latest` - Main application
- `nanoclaw-agent:latest` - Agent execution container

**Build time**: Approximately 2-5 minutes depending on your connection and system.

## Configuration

### Environment Variables

The `.env` file contains important configuration options:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | - | Yes |
| `CONTAINER_RUNTIME` | Container runtime to use | `docker` | Yes |
| `NODE_ENV` | Node environment | `production` | No |
| `TZ` | Timezone | `UTC` | No |
| `LOG_LEVEL` | Logging verbosity | `info` | No |
| `DB_PATH` | SQLite database path | `/app/data/nanoclaw.db` | No |
| `AGENT_IMAGE` | Agent container image name | `nanoclaw-agent:latest` | No |

### Docker Compose Configuration

The `docker-compose.yml` file includes:

- **Volume Mounts**: Persistent storage for data, groups, and authentication
- **Docker Socket**: Access to Docker daemon for spawning agent containers
- **Network**: Isolated network for container communication
- **Health Checks**: Monitors application health

## Building the Docker Images

### Build All Images

```bash
docker-compose build
```

### Build Individual Images

Build only the main application:

```bash
docker build -t nanoclaw:latest -f Dockerfile .
```

Build only the agent container:

```bash
docker build -t nanoclaw-agent:latest -f container/Dockerfile container/
```

### Verify Built Images

```bash
docker images | grep nanoclaw
```

You should see:
```
nanoclaw-agent:latest   [IMAGE_ID]   [SIZE]
nanoclaw:latest         [IMAGE_ID]   [SIZE]
```

## Running NanoClaw

### Start the Services

Start all services in detached mode:

```bash
docker-compose up -d
```

### View Logs

Check application logs:

```bash
docker-compose logs -f nanoclaw
```

Or view logs from a specific container:

```bash
docker logs -f nanoclaw-app
```

### Stop the Services

```bash
docker-compose down
```

### Restart the Services

```bash
docker-compose restart
```

## WhatsApp Authentication

NanoClaw connects to WhatsApp using the Baileys library. You'll need to authenticate using a QR code.

### Interactive Authentication

1. Start the container with attached terminal:
   ```bash
   docker-compose run --rm nanoclaw npm run auth
   ```

2. A QR code will appear in your terminal

3. Open WhatsApp on your phone:
   - Go to Settings → Linked Devices
   - Tap "Link a Device"
   - Scan the QR code

4. Once authenticated, the credentials are saved in `./auth-store`

### Authentication Persistence

Authentication data is stored in `./auth-store` directory, which is mounted as a volume in docker-compose. This means your authentication persists across container restarts.

### Re-authentication

If you need to re-authenticate:

```bash
# Remove old auth data
rm -rf auth-store/*

# Run authentication again
docker-compose run --rm nanoclaw npm run auth
```

## Troubleshooting

### Issue: Container Runtime Error

**Error**: `Apple Container system is required but failed to start`

**Cause**: The current version of NanoClaw is designed for Apple Container runtime by default.

**Solutions**:

1. **Use Claude Code to Convert** (Recommended):
   ```bash
   claude
   # Then run: /convert-to-docker
   ```
   This applies the Docker conversion skill.

2. **Manual Code Modification**:
   - Modify `src/container-runner.ts` to use `docker` command instead of `container`
   - Update `src/index.ts` to remove Apple Container system checks

3. **Use Apple Container** (macOS only):
   - Install Apple Container: https://github.com/apple/container/releases
   - Change `CONTAINER_RUNTIME=apple-container` in `.env`

### Issue: Docker Socket Permission Denied

**Error**: `permission denied while trying to connect to the Docker daemon socket`

**Solution**:
```bash
# Add your user to the docker group (Linux)
sudo usermod -aG docker $USER
newgrp docker

# Or run with sudo (not recommended for production)
sudo docker-compose up -d
```

### Issue: Port Already in Use

**Error**: `port is already allocated`

**Solution**:
```bash
# Find process using the port
lsof -i :3000

# Kill the process or change the port in docker-compose.yml
```

### Issue: Database Locked

**Error**: `database is locked`

**Solution**:
```bash
# Stop all containers
docker-compose down

# Remove the database lock
rm -f data/nanoclaw.db-wal data/nanoclaw.db-shm

# Restart
docker-compose up -d
```

### Issue: Out of Disk Space

**Solution**:
```bash
# Clean up unused Docker resources
docker system prune -a --volumes

# Remove old images
docker image prune -a
```

## Important Notes

### ⚠️ Current Limitations

1. **Docker Support**: The base NanoClaw code is designed for Apple Container. Full Docker support requires applying the `/convert-to-docker` skill or manual code modifications.

2. **Claude Code Required**: The official setup process uses Claude Code for configuration and setup. Running without Claude Code requires manual configuration.

3. **Single User**: NanoClaw is designed for single-user operation, not multi-tenant deployments.

### 🔒 Security Considerations

1. **API Keys**: Never commit your `.env` file with real API keys to version control
2. **Docker Socket**: Mounting `/var/run/docker.sock` gives the container significant privileges
3. **WhatsApp Auth**: Keep your `auth-store` directory secure - it contains WhatsApp credentials
4. **Network**: Consider using firewall rules if exposing ports

### 📁 Directory Structure

```
nanoclaw/
├── Dockerfile              # Main application Dockerfile
├── docker-compose.yml      # Docker Compose configuration
├── .env                    # Environment variables (create from .env.example)
├── .env.example           # Example environment configuration
├── container/
│   └── Dockerfile         # Agent container Dockerfile
├── data/                  # SQLite database (created on first run)
├── groups/                # Group-specific data and memory
├── auth-store/           # WhatsApp authentication data
└── src/                  # Application source code
```

### 🚀 Next Steps

After successful setup:

1. **Configure Trigger Word**: Default is `@Andy`, change in code if desired
2. **Set Up Groups**: Add WhatsApp groups or contacts to monitor
3. **Create Scheduled Tasks**: Configure recurring tasks in your main channel
4. **Customize Behavior**: Modify the code to fit your needs (it's designed for this!)
5. **Add Skills**: Use Claude Code to add additional capabilities

### 📚 Additional Resources

- **Official Repository**: https://github.com/qwibitai/nanoclaw
- **Discord Community**: https://discord.gg/VGWXrf8x
- **Claude Code Docs**: https://code.claude.com/docs
- **Agent Swarms**: https://code.claude.com/docs/en/agent-teams

### 🆘 Getting Help

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review logs: `docker-compose logs -f`
3. Join the Discord community
4. Open an issue on GitHub

---

## Quick Reference Commands

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Authenticate WhatsApp
docker-compose run --rm nanoclaw npm run auth

# Check container status
docker ps

# Clean up
docker system prune -a
```

---

**Last Updated**: February 2026  
**Version**: 1.0  
**Docker Compose Version**: 3.8
