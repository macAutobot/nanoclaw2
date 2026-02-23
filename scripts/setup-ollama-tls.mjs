#!/usr/bin/env node

/**
 * Setup Ollama TLS Encryption
 * Generates self-signed certificate and configures NanoClaw
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

console.log(`${BLUE}╔════════════════════════════════════════════════════════════════╗${RESET}`);
console.log(`${BLUE}║         NanoClaw - Ollama TLS Setup Wizard                    ║${RESET}`);
console.log(`${BLUE}╚════════════════════════════════════════════════════════════════╝${RESET}`);
console.log();

// Check if openssl is available
try {
  execSync('which openssl', { stdio: 'pipe' });
} catch (err) {
  console.error(`${RED}✗ Error: OpenSSL not found${RESET}`);
  console.error(`${YELLOW}  Install OpenSSL and try again${RESET}`);
  console.error(`${YELLOW}  macOS: brew install openssl${RESET}`);
  process.exit(1);
}

// Setup paths
const configDir = path.join(process.env.HOME, '.config', 'nanoclaw', 'ollama-tls');
const certPath = path.join(configDir, 'ollama-cert.pem');
const keyPath = path.join(configDir, 'ollama-key.pem');
const configPath = path.join(configDir, 'config.json');

// Create config directory
fs.mkdirSync(configDir, { recursive: true });

console.log(`${YELLOW}This wizard will:${RESET}`);
console.log(`  1. Generate a self-signed TLS certificate`);
console.log(`  2. Configure NanoClaw to use encrypted connections`);
console.log(`  3. Provide instructions for configuring Ollama`);
console.log();

// Check if certificate already exists
if (fs.existsSync(certPath)) {
  console.log(`${YELLOW}⚠️  Certificate already exists at: ${certPath}${RESET}`);
  console.log(`${YELLOW}   Do you want to regenerate it? (y/n)${RESET}`);
  
  // For non-interactive, skip
  console.log(`${YELLOW}   Skipping regeneration (delete file to regenerate)${RESET}`);
  console.log();
} else {
  console.log(`${GREEN}Step 1: Generating self-signed certificate...${RESET}`);
  
  try {
    // Generate private key and certificate
    execSync(
      `openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" ` +
      `-sha256 -days 365 -nodes ` +
      `-subj "/C=US/ST=State/L=City/O=NanoClaw/OU=Security/CN=ollama.local" ` +
      `-addext "subjectAltName=DNS:localhost,DNS:host.docker.internal,DNS:ollama.local,IP:127.0.0.1,IP:192.168.1.143"`,
      { stdio: 'pipe' }
    );
    
    console.log(`${GREEN}✓ Certificate generated${RESET}`);
    console.log(`  Cert: ${certPath}`);
    console.log(`  Key:  ${keyPath}`);
    console.log();
  } catch (err) {
    console.error(`${RED}✗ Failed to generate certificate${RESET}`);
    console.error(err.message);
    process.exit(1);
  }
}

// Create config
console.log(`${GREEN}Step 2: Configuring NanoClaw...${RESET}`);

const config = {
  enabled: true,
  selfSigned: true,
  certPath: certPath,
  keyPath: keyPath,
  caPath: certPath,
  verifyHost: false,
};

fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log(`${GREEN}✓ Configuration saved${RESET}`);
console.log(`  Config: ${configPath}`);
console.log();

// Instructions for Ollama
console.log(`${BLUE}╔════════════════════════════════════════════════════════════════╗${RESET}`);
console.log(`${BLUE}║  Step 3: Configure Ollama to Use TLS                          ║${RESET}`);
console.log(`${BLUE}╚════════════════════════════════════════════════════════════════╝${RESET}`);
console.log();
console.log(`${YELLOW}You need to configure Ollama to accept TLS connections:${RESET}`);
console.log();
console.log(`${GREEN}Option A: Run Ollama with TLS (Recommended)${RESET}`);
console.log(`  1. Stop Ollama if running:`);
console.log(`     ${BLUE}pkill ollama${RESET}`);
console.log();
console.log(`  2. Start Ollama with TLS:`);
console.log(`     ${BLUE}OLLAMA_HOST=0.0.0.0:11434 \\`);
console.log(`     OLLAMA_CERT="${certPath}" \\`);
console.log(`     OLLAMA_KEY="${keyPath}" \\`);
console.log(`     ollama serve${RESET}`);
console.log();
console.log(`${GREEN}Option B: Use systemd service (Linux)${RESET}`);
console.log(`  Create: /etc/systemd/system/ollama.service.d/override.conf`);
console.log(`  ${BLUE}[Service]`);
console.log(`  Environment="OLLAMA_CERT=${certPath}"`);
console.log(`  Environment="OLLAMA_KEY=${keyPath}"${RESET}`);
console.log();
console.log(`${GREEN}Option C: Use launchd (macOS)${RESET}`);
console.log(`  Add to Ollama plist:`);
console.log(`  ${BLUE}<key>EnvironmentVariables</key>`);
console.log(`  <dict>`);
console.log(`    <key>OLLAMA_CERT</key>`);
console.log(`    <string>${certPath}</string>`);
console.log(`    <key>OLLAMA_KEY</key>`);
console.log(`    <string>${keyPath}</string>`);
console.log(`  </dict>${RESET}`);
console.log();

// Update .env
console.log(`${BLUE}╔════════════════════════════════════════════════════════════════╗${RESET}`);
console.log(`${BLUE}║  Step 4: Update NanoClaw Configuration                        ║${RESET}`);
console.log(`${BLUE}╚════════════════════════════════════════════════════════════════╝${RESET}`);
console.log();

const envPath = path.join(path.dirname(__dirname), '.env');
if (fs.existsSync(envPath)) {
  let envContent = fs.readFileSync(envPath, 'utf-8');
  
  // Update OLLAMA_HOST to use https
  if (envContent.includes('OLLAMA_HOST=http://')) {
    envContent = envContent.replace(
      /OLLAMA_HOST=http:\/\//g,
      'OLLAMA_HOST=https://'
    );
    fs.writeFileSync(envPath, envContent);
    console.log(`${GREEN}✓ Updated OLLAMA_HOST to use https:// in .env${RESET}`);
  } else {
    console.log(`${YELLOW}⚠️  Add to .env: OLLAMA_HOST=https://your-ollama-host:11434${RESET}`);
  }
} else {
  console.log(`${YELLOW}⚠️  .env file not found${RESET}`);
  console.log(`${YELLOW}   Make sure to set: OLLAMA_HOST=https://your-ollama-host:11434${RESET}`);
}
console.log();

// Final instructions
console.log(`${GREEN}╔════════════════════════════════════════════════════════════════╗${RESET}`);
console.log(`${GREEN}║  Setup Complete! 🎉                                            ║${RESET}`);
console.log(`${GREEN}╚════════════════════════════════════════════════════════════════╝${RESET}`);
console.log();
console.log(`${GREEN}Next steps:${RESET}`);
console.log(`  1. Restart Ollama with TLS configuration`);
console.log(`  2. Test connection: ${BLUE}curl -k https://localhost:11434/api/tags${RESET}`);
console.log(`  3. Restart NanoClaw: ${BLUE}npm start${RESET}`);
console.log();
console.log(`${YELLOW}Security Note:${RESET}`);
console.log(`  - This is a self-signed certificate (suitable for development)`);
console.log(`  - For production, use a certificate from a trusted CA`);
console.log(`  - Certificate valid for 365 days`);
console.log();
console.log(`${BLUE}Documentation:${RESET} See OLLAMA_TLS_SETUP.md for more details`);
console.log();
