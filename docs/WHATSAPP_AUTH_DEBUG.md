# WhatsApp Authentication Debugging Guide

## Issue Summary

`npm run auth` is failing with network connectivity issues to WhatsApp servers. The error is: **"Connection Failure"** in the WebSocket connection.

## What I've Fixed So Far

✅ **Downgraded Baileys** — Changed from `7.0.0-rc.9` to `6.7.21` (latest stable)  
✅ **Updated browser signature** — Changed from macOS Chrome to Ubuntu Chrome (WhatsApp can block some signatures)  
✅ **Added network timeouts** — Set longer connection timeouts and keepalive settings  
✅ **Added authentication timeout** — 3-minute timeout to prevent hanging

## Root Cause

The issue appears to be a **network connectivity problem** between your Mac and WhatsApp's web servers. This could be caused by:

1. **Firewall/Network blocking** — Corporate firewall, ISP throttling, or network shield
2. **Proxy requirement** — Your network requires an HTTP/HTTPS proxy
3. **VPN** — If using a VPN, WhatsApp might block it
4. **ISP blocking** — Some ISPs block WhatsApp connections
5. **DNS issues** — DNS not resolving WhatsApp domains correctly

## Solutions to Try

### 1. Check Network Connectivity

Test if your Mac can reach WhatsApp servers:

```bash
# Test DNS resolution
nslookup web.whatsapp.com
dig web.whatsapp.com

# Test HTTPS connection
curl -v https://web.whatsapp.com 2>&1 | head -20

# Test WebSocket (what Baileys uses)
curl -i https://web.whatsapp.com/ws 2>&1 | head -10
```

### 2. Try Different Network

If you're on a corporate/school network:
- **Try mobile hotspot** — Use your phone's hotspot instead
- **Try public WiFi** — Coffeeshop, library, etc.
- **Try different ISP** — If possible

### 3. Disable VPN or Proxy

If using a VPN:
```bash
# Temporarily disable VPN
# Then try: npm run auth
```

### 4. Use Pairing Code Instead of QR

The pairing code method might work better than QR:

```bash
npm run auth -- --pairing-code --phone 1234567890
```

(Replace with your phone number in international format without + or spaces)

### 5. Clear All Cache and Retry

```bash
# Clean everything
rm -rf store/auth store/qr-data.txt store/auth-status.txt

# Try again
npm run auth
```

### 6. Check Node.js Version

Your current version: `v23.10.0`

This is newer than recommended. Try using v20 or v22:

```bash
# If using nvm
nvm install 20
nvm use 20
npm run auth

# If using brew
brew install node@20
/usr/local/opt/node@20/bin/npm run auth
```

### 7. Test with Extended Timeout

The current timeout is 3 minutes. If your connection is just slow, try increasing it:

Edit `src/whatsapp-auth.ts` and change:
```typescript
180_000  // Change to 300_000 (5 minutes)
```

### 8. Check Family/Screen Time Settings

macOS Family controls might block WhatsApp:
- **System Settings → Screen Time** — Check if restrictions are enabled
- Disable if present, try auth again

## Advanced Network Debugging

### Use Verbose Logging

```bash
npm run auth -- --verbose 2>&1 | grep -E "(connected|error|failed)"
```

### Check WSS (WebSocket Secure) Connection

```bash
# Install websocat if needed
brew install websocat

# Try to connect to WhatsApp WebSocket
websocat "wss://web.whatsapp.com/ws" 2>&1 | head -20
```

### Monitor Network Traffic

```bash
# Show all network connections
netstat -an | grep ESTABLISHED

# Monitor specific ports
lsof -i -P -n | grep -i whatsapp

# tcpdump (requires sudo)
sudo tcpdump -i en0 host web.whatsapp.com -A 2>&1 | head -50
```

## If None of the Above Works

### Option A: Use Pairing Code on a Different Device

1. Boot a Linux VM or use WSL2 (if you have it)
2. Copy NanoClaw to the Linux system
3. Run auth there
4. Copy the `store/auth/` folder back to macOS

### Option B: Use the CLI with Existing Credentials

If you have WhatsApp Web open in a browser, you might be able to extract credentials. This is advanced but possible.

### Option C: Request Help

If stuck, gather this info and post on the NanoClaw issues:

```bash
# System info
system_profiler SPSoftwareDataType
system_profiler SPNetworkDataType

# Network diagnostic
networkQuality -c -v

# DNS info
scutil --dns | head -30

# Baileys version
npm list @whiskeysockets/baileys

# Node version
node --version

# Try auth with verbose output (first 100 lines)
npm run auth -- --verbose 2>&1 | head -100
```

## WhatsApp Authentication Methods

Your options after fixing the connection:

### Method 1: QR Code (Recommended)
```bash
npm run auth
```
- Fastest
- Scan with phone camera
- Expires in ~60 seconds

### Method 2: Pairing Code
```bash
npm run auth -- --pairing-code --phone YOUR_PHONE_NUMBER
```
- No camera needed
- Slower but more reliable
- Good for poor connections

### Method 3: Manual (Expert)
Delete `store/auth` and the connection will prompt for manual setup.

## After Authentication Works

Once you see the QR code or pairing code, WhatsApp authentication is working. Complete the setup by scanning/entering the code on your phone.

## Prevention for Future

Once authenticated, credentials are saved in `store/auth/`. To prevent authentication issues:
- **Don't delete `store/auth`** unless re-authenticating
- **Keep network stable** during setup
- **Run from stable WiFi** (not mobile hotspot during auth)

## Still Stuck?

If the connection still fails after trying these steps, it's likely a system-level network issue:

```bash
# Generate diagnostic bundle
mkdir -p /tmp/nanoclaw-debug
npm run auth -- --verbose 2>&1 > /tmp/nanoclaw-debug/auth.log &
sleep 30
curl -v https://web.whatsapp.com 2>&1 > /tmp/nanoclaw-debug/curl.log
ifconfig > /tmp/nanoclaw-debug/network.txt
netstat -an | grep EST > /tmp/nanoclaw-debug/connections.txt

# Share these files for debugging
echo "Debug files saved to /tmp/nanoclaw-debug/"
ls -lah /tmp/nanoclaw-debug/
```

This debug bundle will help identify the exact network issue.
