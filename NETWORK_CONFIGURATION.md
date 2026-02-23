# ⚠️ IMPORTANT: Network Isolation & Ollama Configuration

## Network Isolation Modes

NanoClaw supports two network isolation modes depending on your Ollama setup:

### Mode 1: Ollama on Same Machine (Full Isolation) ✅ Recommended
If Ollama runs on the same machine as NanoClaw:

**.env Configuration:**
```env
OLLAMA_HOST=http://host.docker.internal:11434
CONTAINER_RUNTIME=docker
```

**Network:** Fully isolated (no internet, no LAN access)
**Ollama Access:** Via host bridge
**Setup:** Run `./setup-network-isolation.sh`

---

### Mode 2: Ollama on Different Machine (Partial Isolation)
If Ollama runs on another machine (e.g., `192.168.1.143`):

**.env Configuration:**
```env
OLLAMA_HOST=http://192.168.1.143:11434
CONTAINER_RUNTIME=docker
```

**Network:** Requires LAN access for Ollama
**Solution:** Use network with restricted egress instead of internal

**Setup Script:** `setup-network-isolation-lan.sh`
```bash
#!/bin/bash
# Network Isolation with LAN access for external Ollama

set -e

ISOLATED_NETWORK="nanoclaw-isolated"

# Remove old internal network if exists
docker network rm "$ISOLATED_NETWORK" 2>/dev/null || true

# Create bridge network (NOT internal) with custom subnet
docker network create \
    --driver bridge \
    --subnet=172.20.0.0/16 \
    --opt com.docker.network.bridge.name=nanoclaw0 \
    "$ISOLATED_NETWORK"

echo "✓ Network created with LAN access"
echo ""
echo "⚠️  SECURITY NOTE:"
echo "  Containers can access LAN (for Ollama) but should add firewall rules"
echo "  to block internet egress. See NETWORK_FIREWALL.md for details."
```

---

## Current Configuration Detected

Your `.env` has:
```env
OLLAMA_HOST=http://192.168.1.143:11434
```

**This means Ollama is on a different machine!**

### Recommended Actions:

**Option A: Move Ollama to Same Machine (Most Secure)**
```bash
# Install Ollama locally
curl -fsSL https://ollama.ai/install.sh | sh

# Update .env
OLLAMA_HOST=http://host.docker.internal:11434

# Restart NanoClaw
./start.sh
```

**Option B: Use Network with LAN Access (Less Secure)**
```bash
# Create the LAN-accessible network script
cat > setup-network-isolation-lan.sh << 'EOF'
#!/bin/bash
set -e
ISOLATED_NETWORK="nanoclaw-isolated"
docker network rm "$ISOLATED_NETWORK" 2>/dev/null || true
docker network create \
    --driver bridge \
    --subnet=172.20.0.0/16 \
    "$ISOLATED_NETWORK"
echo "✓ Network created with LAN access for external Ollama"
EOF

chmod +x setup-network-isolation-lan.sh
./setup-network-isolation-lan.sh

# Restart NanoClaw
./start.sh
```

**Option C: Disable Network Isolation (Least Secure)**
Update `src/container-runner.ts` and comment out network isolation:
```typescript
// Network isolation (commented out for external Ollama)
// if (CONTAINER_RUNTIME === 'docker') {
//   args.push('--network', 'nanoclaw-isolated');
// }
```

---

## Security Trade-offs

| Mode | Internet Block | LAN Access | Ollama Access | Security Level |
|------|----------------|------------|---------------|----------------|
| **Full Isolation** | ✅ Yes | ❌ No | ✅ Via host | ⭐⭐⭐⭐⭐ Highest |
| **LAN Access** | ⚠️ Via LAN | ✅ Yes | ✅ Direct | ⭐⭐⭐⭐☆ High |
| **No Isolation** | ❌ No | ✅ Yes | ✅ Direct | ⭐⭐⭐☆☆ Medium |

---

## Testing Your Configuration

### Test 1: Can containers reach Ollama?
```bash
# Test with your Ollama host
docker run --rm --network nanoclaw-isolated alpine:latest \
  sh -c "ping -c 1 192.168.1.143 && echo 'CAN REACH OLLAMA'" || \
  echo "CANNOT REACH OLLAMA - Need LAN access mode"
```

### Test 2: Can containers reach internet?
```bash
# This should FAIL (good!)
docker run --rm --network nanoclaw-isolated alpine:latest \
  sh -c "ping -c 1 google.com" && \
  echo "⚠️  WARNING: Internet access detected" || \
  echo "✓ Internet blocked (good)"
```

---

## Current Status

Based on your setup:
- ✅ Network `nanoclaw-isolated` created
- ✅ Network is fully internal (most secure)
- ⚠️  Ollama is on different machine (192.168.1.143)
- ❌ Containers cannot reach external Ollama

**Action Required:** Choose Option A or Option B above to enable Ollama access.

---

## Recommended: Option A (Move Ollama Locally)

This provides the best security while maintaining full functionality:

1. **Install Ollama on NanoClaw machine:**
   ```bash
   curl -fsSL https://ollama.ai/install.sh | sh
   ```

2. **Pull your model:**
   ```bash
   ollama pull qwen2.5-coder:14b
   ```

3. **Update .env:**
   ```bash
   cd /Users/dizzydevil/nanoclaw
   sed -i.bak 's|OLLAMA_HOST=.*|OLLAMA_HOST=http://host.docker.internal:11434|' .env
   ```

4. **Restart:**
   ```bash
   ./start.sh
   ```

---

## Questions?

- Full isolation but Ollama unreachable? → Use Option A (install Ollama locally)
- Need external Ollama access? → Use Option B (LAN access mode)
- Still having issues? → Check [SECURITY_ENHANCEMENTS.md](SECURITY_ENHANCEMENTS.md)

**Last Updated:** February 13, 2026
