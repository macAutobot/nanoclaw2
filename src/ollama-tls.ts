/**
 * Ollama TLS Configuration
 * Encrypts traffic between NanoClaw and Ollama server
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { execSync } from 'child_process';
import { logger } from './logger.js';
import { SecurityAuditLogger, AuditEventType } from './security-audit.js';

export interface OllamaTLSConfig {
  enabled: boolean;
  certPath?: string;
  keyPath?: string;
  caPath?: string;
  selfSigned?: boolean;
  verifyHost?: boolean;
}

const TLS_CONFIG_DIR = path.join(
  process.env.HOME || '/Users/user',
  '.config',
  'nanoclaw',
  'ollama-tls',
);

export class OllamaTLSManager {
  private config: OllamaTLSConfig;
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(TLS_CONFIG_DIR, 'config.json');
    this.config = this.loadConfig();
  }

  /**
   * Load TLS configuration
   */
  private loadConfig(): OllamaTLSConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to load Ollama TLS config, using defaults');
    }

    return {
      enabled: false,
      selfSigned: false,
      verifyHost: true,
    };
  }

  /**
   * Save TLS configuration
   */
  private saveConfig(): void {
    try {
      fs.mkdirSync(path.dirname(this.configPath), { recursive: true });
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      logger.info('Ollama TLS configuration saved');
    } catch (err) {
      logger.error({ err }, 'Failed to save Ollama TLS config');
    }
  }

  /**
   * Generate self-signed certificate for Ollama
   */
  async generateSelfSignedCert(): Promise<void> {
    logger.info('Generating self-signed certificate for Ollama TLS');

    fs.mkdirSync(TLS_CONFIG_DIR, { recursive: true });

    const certPath = path.join(TLS_CONFIG_DIR, 'ollama-cert.pem');
    const keyPath = path.join(TLS_CONFIG_DIR, 'ollama-key.pem');

    // Generate private key and self-signed certificate
    try {
      execSync(
        `openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" ` +
        `-sha256 -days 365 -nodes ` +
        `-subj "/C=US/ST=State/L=City/O=NanoClaw/OU=Security/CN=ollama.local" ` +
        `-addext "subjectAltName=DNS:localhost,DNS:host.docker.internal,IP:127.0.0.1,IP:192.168.1.143"`,
        { stdio: 'pipe' }
      );

      logger.info({ certPath, keyPath }, 'Self-signed certificate generated');

      this.config.enabled = true;
      this.config.selfSigned = true;
      this.config.certPath = certPath;
      this.config.keyPath = keyPath;
      this.config.caPath = certPath; // Self-signed cert is its own CA
      this.config.verifyHost = false; // Self-signed usually doesn't match hostname perfectly
      this.saveConfig();

      SecurityAuditLogger.logEvent({
        timestamp: new Date().toISOString(),
        eventType: AuditEventType.AUTH_SUCCESS,
        groupFolder: 'system',
        severity: 'info',
        details: {
          action: 'generate-tls-cert',
          type: 'self-signed',
          certPath,
        },
      });

      logger.info('✓ TLS certificate generated for Ollama');
      logger.warn('⚠️  You need to configure Ollama to use this certificate');
      logger.info('   See OLLAMA_TLS_SETUP.md for instructions');

    } catch (err) {
      logger.error({ err }, 'Failed to generate self-signed certificate');
      throw err;
    }
  }

  /**
   * Configure custom certificate (for production use)
   */
  configureCustomCert(certPath: string, keyPath: string, caPath?: string): void {
    if (!fs.existsSync(certPath)) {
      throw new Error(`Certificate file not found: ${certPath}`);
    }
    if (!fs.existsSync(keyPath)) {
      throw new Error(`Key file not found: ${keyPath}`);
    }

    this.config.enabled = true;
    this.config.selfSigned = false;
    this.config.certPath = certPath;
    this.config.keyPath = keyPath;
    this.config.caPath = caPath;
    this.config.verifyHost = true;
    this.saveConfig();

    logger.info({ certPath, keyPath }, 'Custom TLS certificate configured');

    SecurityAuditLogger.logEvent({
      timestamp: new Date().toISOString(),
      eventType: AuditEventType.AUTH_SUCCESS,
      groupFolder: 'system',
      severity: 'info',
      details: {
        action: 'configure-tls-cert',
        type: 'custom',
        certPath,
      },
    });
  }

  /**
   * Get HTTPS agent for Ollama requests
   */
  getHttpsAgent(): https.Agent | undefined {
    if (!this.config.enabled) {
      return undefined;
    }

    const options: https.AgentOptions = {
      rejectUnauthorized: this.config.verifyHost,
    };

    // Load certificate and key if provided
    if (this.config.certPath && fs.existsSync(this.config.certPath)) {
      options.cert = fs.readFileSync(this.config.certPath);
    }

    if (this.config.keyPath && fs.existsSync(this.config.keyPath)) {
      options.key = fs.readFileSync(this.config.keyPath);
    }

    // Load CA certificate if provided
    if (this.config.caPath && fs.existsSync(this.config.caPath)) {
      options.ca = fs.readFileSync(this.config.caPath);
    }

    return new https.Agent(options);
  }

  /**
   * Check if TLS is enabled and configured
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get configuration
   */
  getConfig(): OllamaTLSConfig {
    return { ...this.config };
  }

  /**
   * Disable TLS
   */
  disable(): void {
    this.config.enabled = false;
    this.saveConfig();
    logger.info('Ollama TLS disabled');
  }

  /**
   * Verify TLS configuration
   */
  async verifyConfiguration(): Promise<boolean> {
    if (!this.config.enabled) {
      logger.info('TLS not enabled, skipping verification');
      return false;
    }

    try {
      // Check certificate files exist
      if (this.config.certPath && !fs.existsSync(this.config.certPath)) {
        logger.error({ path: this.config.certPath }, 'Certificate file not found');
        return false;
      }

      if (this.config.keyPath && !fs.existsSync(this.config.keyPath)) {
        logger.error({ path: this.config.keyPath }, 'Key file not found');
        return false;
      }

      // Check certificate expiry
      if (this.config.certPath) {
        const certData = fs.readFileSync(this.config.certPath, 'utf-8');
        const expiryMatch = certData.match(/Not After : (.+)/);
        if (expiryMatch) {
          const expiryDate = new Date(expiryMatch[1]);
          const daysUntilExpiry = (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          
          if (daysUntilExpiry < 0) {
            logger.error('TLS certificate has expired');
            return false;
          }

          if (daysUntilExpiry < 30) {
            logger.warn({ daysUntilExpiry }, 'TLS certificate expiring soon');
          }

          logger.info({ daysUntilExpiry: Math.floor(daysUntilExpiry) }, 'TLS certificate valid');
        }
      }

      logger.info('✓ TLS configuration verified');
      return true;

    } catch (err) {
      logger.error({ err }, 'TLS verification failed');
      return false;
    }
  }

  /**
   * Get Ollama URL with correct protocol
   */
  getOllamaUrl(baseUrl: string): string {
    if (!this.config.enabled) {
      return baseUrl;
    }

    // Replace http:// with https://
    return baseUrl.replace(/^http:\/\//, 'https://');
  }

  /**
   * Rotate TLS certificate
   */
  async rotateCertificate(): Promise<void> {
    logger.info('Rotating Ollama TLS certificate');

    if (this.config.selfSigned) {
      // For self-signed, just regenerate
      await this.generateSelfSignedCert();
      logger.info('✓ Self-signed certificate rotated');
    } else {
      logger.warn('Custom certificate rotation requires manual renewal');
      logger.info('Please renew your certificate with your CA and update the configuration');
    }

    SecurityAuditLogger.logEvent({
      timestamp: new Date().toISOString(),
      eventType: AuditEventType.CREDENTIAL_ACCESS,
      groupFolder: 'system',
      severity: 'info',
      details: {
        action: 'rotate-tls-cert',
        type: this.config.selfSigned ? 'self-signed' : 'custom',
      },
    });
  }
}

// Global instance
export const globalOllamaTLS = new OllamaTLSManager();
