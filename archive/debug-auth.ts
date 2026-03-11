#!/usr/bin/env node
/**
 * WhatsApp Auth Debug - Simple connectivity test
 */

import { makeWASocket, Browsers, makeCacheableSignalKeyStore, useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';

const logger = pino({ level: 'debug' });

async function test() {
  console.log('\n📋 WhatsApp Connection Debug\n');
  
  const authDir = './store/auth-debug';
  fs.mkdirSync(authDir, { recursive: true });
  
  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  console.log('✓ Created auth state');
  console.log(`  Registered: ${state.creds.registered}`);
  console.log(`  Browser: ${JSON.stringify(state.creds.me)}`);
  
  console.log('\n🔌 Attempting connection...\n');

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: false,
    logger,
    browser: Browsers.ubuntu('Chrome'),
    connectTimeoutMs: 30_000,
    defaultQueryTimeoutMs: 30_000,
  });

  let hasQR = false;
  let connected = false;
  
  sock.ev.on('connection.update', (update) => {
    const { connection, qr, lastDisconnect } = update;
    
    if (qr) {
      hasQR = true;
      console.log('✓ QR Code received:');
      console.log(`  Length: ${qr.length} chars`);
      console.log(`  Data: ${qr.substring(0, 100)}...`);
    }
    
    if (connection === 'open') {
      connected = true;
      console.log('✓ Connected and logged in!');
      process.exit(0);
    }
    
    if (connection === 'close') {
      const reason = (lastDisconnect?.error as any)?.output?.statusCode;
      console.log(`✗ Connection closed`);
      console.log(`  Reason: ${reason}`);
      console.log(`  Error: ${lastDisconnect?.error?.message}`);
      
      if (!hasQR && !connected) {
        console.log('\n❌ Failed to get QR code');
        console.log('\nPossible causes:');
        console.log('  1. Network connectivity issue');
        console.log('  2. WhatsApp servers blocking connection');
        console.log('  3. DNS resolution failure');
        console.log('  4. Firewall/VPN blocking');
        process.exit(1);
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // Timeout after 15 seconds
  setTimeout(() => {
    console.log('\n⏱️  Timeout - no QR code within 15 seconds');
    console.log('\nTried with browser: Ubuntu Chrome');
    console.log('Connected: ' + connected);
    console.log('Has QR: ' + hasQR);
    process.exit(1);
  }, 15000);
}

test().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
