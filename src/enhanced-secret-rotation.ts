/**
 * Enhanced Secret Rotation with Automatic Refresh
 * Actually refreshes credentials, not just marks them for rotation
 */

import { execSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';
import { SecurityAuditLogger, AuditEventType, IntrusionDetection, RiskLevel } from './security-audit.js';
import { SessionEncryption } from './session-encryption.js';
import { globalOllamaTLS } from './ollama-tls.js';

export interface EnhancedRotationPolicy {
  // Rotate on intrusion detection at this risk level
  minRiskLevel: RiskLevel;
  // Rotate credentials periodically (days)
  periodicRotationDays?: number;
  // Rotate on failed auth attempts
  maxFailedAuthAttempts?: number;
  // Auto-generate new credentials where possible
  autoGenerateCredentials?: boolean;
  // Credentials to rotate
  credentials: CredentialConfig[];
}

export interface CredentialConfig {
  name: string;
  type: 'api-key' | 'token' | 'password' | 'tls-cert';
  canAutoRotate: boolean;
  rotationHandler?: () => Promise<string>;
}

const DEFAULT_CREDENTIALS: CredentialConfig[] = [
  {
    name: 'ANTHROPIC_API_KEY',
    type: 'api-key',
    canAutoRotate: false, // Requires manual intervention via Anthropic Console
  },
  {
    name: 'CLAUDE_CODE_OAUTH_TOKEN',
    type: 'token',
    canAutoRotate: false, // Requires OAuth flow
  },
  {
    name: 'INTERNAL_API_KEY',
    type: 'api-key',
    canAutoRotate: true, // Can generate new keys
  },
  {
    name: 'OLLAMA_TLS_CERT',
    type: 'tls-cert',
    canAutoRotate: true, // Can regenerate self-signed
  },
];

const DEFAULT_POLICY: EnhancedRotationPolicy = {
  minRiskLevel: 'critical',
  periodicRotationDays: 90,
  maxFailedAuthAttempts: 5,
  autoGenerateCredentials: true,
  credentials: DEFAULT_CREDENTIALS,
};

export class EnhancedSecretRotation {
  private policy: EnhancedRotationPolicy;
  private lastRotationTime: Map<string, Date> = new Map();
  private failedAuthAttempts: Map<string, number> = new Map();
  private sessionEncryption: SessionEncryption;
  private rotationInProgress: boolean = false;

  constructor(authStorePath: string, policy?: Partial<EnhancedRotationPolicy>) {
    this.policy = { ...DEFAULT_POLICY, ...policy };
    this.sessionEncryption = new SessionEncryption(authStorePath);
    this.loadRotationState();
  }

  /**
   * Load rotation state from disk
   */
  private loadRotationState(): void {
    try {
      const statePath = path.join(
        process.env.HOME || '/Users/user',
        '.config',
        'nanoclaw',
        'rotation-state.json',
      );

      if (fs.existsSync(statePath)) {
        const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
        
        // Restore last rotation times
        for (const [key, value] of Object.entries(state.lastRotationTime || {})) {
          this.lastRotationTime.set(key, new Date(value as string));
        }

        logger.info('Rotation state loaded');
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to load rotation state');
    }
  }

  /**
   * Save rotation state to disk
   */
  private saveRotationState(): void {
    try {
      const statePath = path.join(
        process.env.HOME || '/Users/user',
        '.config',
        'nanoclaw',
        'rotation-state.json',
      );

      fs.mkdirSync(path.dirname(statePath), { recursive: true });

      const state = {
        lastRotationTime: Object.fromEntries(
          Array.from(this.lastRotationTime.entries()).map(([k, v]) => [k, v.toISOString()])
        ),
        lastUpdate: new Date().toISOString(),
      };

      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    } catch (err) {
      logger.error({ err }, 'Failed to save rotation state');
    }
  }

  /**
   * Check if rotation is needed and execute
   */
  async checkAndRotate(groupFolder: string): Promise<void> {
    if (this.rotationInProgress) {
      logger.debug('Rotation already in progress, skipping');
      return;
    }

    try {
      this.rotationInProgress = true;

      // Check intrusion detection
      const analysis = IntrusionDetection.analyzePattern(groupFolder);
      
      if (analysis.isAnomalous && this.shouldRotateForRisk(analysis.riskLevel)) {
        logger.warn(
          { groupFolder, riskLevel: analysis.riskLevel, indicators: analysis.indicators },
          '🚨 SECURITY ALERT: Suspicious activity detected, initiating credential rotation'
        );

        await this.rotateAllCredentials('intrusion-detected', true);
      }

      // Check periodic rotation
      await this.checkPeriodicRotation();

    } finally {
      this.rotationInProgress = false;
    }
  }

  /**
   * Should rotate based on risk level
   */
  private shouldRotateForRisk(riskLevel: RiskLevel): boolean {
    const levels: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
    const currentIndex = levels.indexOf(riskLevel);
    const minIndex = levels.indexOf(this.policy.minRiskLevel);
    
    return currentIndex >= minIndex;
  }

  /**
   * Check periodic rotation
   */
  private async checkPeriodicRotation(): Promise<void> {
    if (!this.policy.periodicRotationDays) return;

    for (const credConfig of this.policy.credentials) {
      const lastRotation = this.lastRotationTime.get(credConfig.name);
      
      if (!lastRotation) {
        this.lastRotationTime.set(credConfig.name, new Date());
        continue;
      }

      const daysSinceRotation = (Date.now() - lastRotation.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceRotation >= this.policy.periodicRotationDays) {
        logger.info(
          { credential: credConfig.name, daysSinceRotation: Math.floor(daysSinceRotation) },
          'Periodic rotation interval reached'
        );
        
        await this.rotateCredential(credConfig, 'periodic');
      }
    }
  }

  /**
   * Record failed authentication
   */
  recordFailedAuth(credential: string): void {
    const current = this.failedAuthAttempts.get(credential) || 0;
    this.failedAuthAttempts.set(credential, current + 1);

    SecurityAuditLogger.logEvent({
      timestamp: new Date().toISOString(),
      eventType: AuditEventType.AUTH_FAILURE,
      groupFolder: 'system',
      severity: 'warning',
      details: {
        credential,
        failedAttempts: current + 1,
      },
    });

    if (this.policy.maxFailedAuthAttempts && current + 1 >= this.policy.maxFailedAuthAttempts) {
      logger.error(
        { credential, attempts: current + 1 },
        '🚨 CRITICAL: Max failed auth attempts reached'
      );

      // Find credential config
      const credConfig = this.policy.credentials.find(c => c.name === credential);
      if (credConfig) {
        this.rotateCredential(credConfig, 'failed-auth-threshold').catch(err => {
          logger.error({ err }, 'Failed to rotate credential after failed auth');
        });
      }
    }
  }

  /**
   * Rotate all credentials
   */
  async rotateAllCredentials(reason: string, includeNonAutoRotate: boolean = false): Promise<void> {
    logger.warn({ reason }, '🔄 Starting rotation of all credentials');

    const results: Array<{ name: string; success: boolean; error?: string }> = [];

    for (const credConfig of this.policy.credentials) {
      if (!includeNonAutoRotate && !credConfig.canAutoRotate) {
        logger.info({ credential: credConfig.name }, 'Skipping non-auto-rotatable credential');
        continue;
      }

      try {
        await this.rotateCredential(credConfig, reason);
        results.push({ name: credConfig.name, success: true });
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        results.push({ name: credConfig.name, success: false, error });
        logger.error({ err, credential: credConfig.name }, 'Credential rotation failed');
      }
    }

    // Rotate session encryption
    try {
      await this.sessionEncryption.rotateEncryptionKey();
      results.push({ name: 'session-encryption-key', success: true });
    } catch (err) {
      results.push({ 
        name: 'session-encryption-key', 
        success: false, 
        error: err instanceof Error ? err.message : String(err) 
      });
    }

    SecurityAuditLogger.logEvent({
      timestamp: new Date().toISOString(),
      eventType: AuditEventType.CREDENTIAL_ACCESS,
      groupFolder: 'system',
      severity: 'critical',
      details: {
        action: 'rotate-all',
        reason,
        results,
      },
    });

    const successCount = results.filter(r => r.success).length;
    logger.info({ successCount, total: results.length }, '✓ Credential rotation completed');
  }

  /**
   * Rotate a specific credential
   */
  private async rotateCredential(credConfig: CredentialConfig, reason: string): Promise<void> {
    logger.info({ credential: credConfig.name, reason }, 'Rotating credential');

    try {
      let newCredentialValue: string | null = null;

      // Use custom rotation handler if provided
      if (credConfig.rotationHandler) {
        newCredentialValue = await credConfig.rotationHandler();
      } else if (credConfig.canAutoRotate) {
        // Auto-generate based on type
        newCredentialValue = await this.autoGenerateCredential(credConfig);
      }

      if (newCredentialValue) {
        // Store in Keychain
        await this.storeCredentialInKeychain(credConfig.name, newCredentialValue);
        
        logger.info({ credential: credConfig.name }, '✓ Credential rotated and stored');
      } else {
        // Can't auto-rotate, mark for manual intervention
        logger.warn(
          { credential: credConfig.name },
          '⚠️  Manual rotation required - credential cannot be auto-generated'
        );
        
        this.markForManualRotation(credConfig.name, reason);
      }

      // Update rotation time
      this.lastRotationTime.set(credConfig.name, new Date());
      this.failedAuthAttempts.set(credConfig.name, 0);
      this.saveRotationState();

      SecurityAuditLogger.logEvent({
        timestamp: new Date().toISOString(),
        eventType: AuditEventType.CREDENTIAL_ACCESS,
        groupFolder: 'system',
        severity: 'info',
        details: {
          action: 'credential-rotated',
          credential: credConfig.name,
          reason,
          autoGenerated: !!newCredentialValue,
        },
      });

    } catch (err) {
      logger.error({ err, credential: credConfig.name }, 'Credential rotation failed');
      throw err;
    }
  }

  /**
   * Auto-generate a new credential
   */
  private async autoGenerateCredential(credConfig: CredentialConfig): Promise<string | null> {
    switch (credConfig.type) {
      case 'api-key':
        return this.generateApiKey();
      
      case 'token':
        return this.generateToken();
      
      case 'password':
        return this.generatePassword();
      
      case 'tls-cert':
        if (credConfig.name === 'OLLAMA_TLS_CERT') {
          await globalOllamaTLS.rotateCertificate();
          return 'rotated';
        }
        return null;
      
      default:
        return null;
    }
  }

  /**
   * Generate a secure API key
   */
  private generateApiKey(): string {
    const prefix = 'nck'; // NanoClaw Key
    const random = crypto.randomBytes(32).toString('base64url');
    return `${prefix}_${random}`;
  }

  /**
   * Generate a secure token
   */
  private generateToken(): string {
    return crypto.randomBytes(64).toString('base64url');
  }

  /**
   * Generate a secure password
   */
  private generatePassword(): string {
    const length = 32;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += chars.charAt(crypto.randomInt(0, chars.length));
    }
    
    return password;
  }

  /**
   * Store credential in macOS Keychain
   */
  private async storeCredentialInKeychain(name: string, value: string): Promise<void> {
    try {
      const serviceName = 'NanoClaw';
      const accountName = `main/${name}`;

      // Delete existing entry
      execSync(
        `security delete-generic-password -a "${accountName}" -s "${serviceName}" 2>/dev/null || true`,
        { stdio: 'pipe' }
      );

      // Add new entry
      execSync(
        `security add-generic-password -a "${accountName}" -s "${serviceName}" -w "${value}"`,
        { stdio: 'pipe' }
      );

      logger.info({ credential: name }, 'Credential stored in Keychain');
    } catch (err) {
      logger.error({ err, credential: name }, 'Failed to store credential in Keychain');
      throw err;
    }
  }

  /**
   * Mark credential for manual rotation
   */
  private markForManualRotation(name: string, reason: string): void {
    const alertPath = path.join(
      process.env.HOME || '/Users/user',
      '.config',
      'nanoclaw',
      'rotation-alerts.json',
    );

    try {
      let alerts: any[] = [];
      
      if (fs.existsSync(alertPath)) {
        alerts = JSON.parse(fs.readFileSync(alertPath, 'utf-8'));
      }

      alerts.push({
        credential: name,
        reason,
        timestamp: new Date().toISOString(),
        status: 'pending',
      });

      fs.mkdirSync(path.dirname(alertPath), { recursive: true });
      fs.writeFileSync(alertPath, JSON.stringify(alerts, null, 2));

      logger.warn(
        { credential: name, reason },
        '⚠️  MANUAL ROTATION REQUIRED - See rotation-alerts.json'
      );
    } catch (err) {
      logger.error({ err }, 'Failed to create rotation alert');
    }
  }

  /**
   * Force immediate rotation
   */
  async forceRotateAll(): Promise<void> {
    logger.warn('⚠️  Forcing immediate rotation of all credentials');
    await this.rotateAllCredentials('manual-force', true);
  }

  /**
   * Get rotation status
   */
  getRotationStatus(): Record<string, { 
    lastRotation?: Date; 
    daysSinceRotation?: number;
    daysUntilRotation?: number;
    failedAttempts: number;
    canAutoRotate: boolean;
  }> {
    const status: Record<string, any> = {};
    
    for (const credConfig of this.policy.credentials) {
      const lastRotation = this.lastRotationTime.get(credConfig.name);
      const daysSinceRotation = lastRotation 
        ? (Date.now() - lastRotation.getTime()) / (1000 * 60 * 60 * 24)
        : undefined;
      const daysUntilRotation = this.policy.periodicRotationDays && daysSinceRotation
        ? this.policy.periodicRotationDays - daysSinceRotation
        : undefined;

      status[credConfig.name] = {
        lastRotation,
        daysSinceRotation: daysSinceRotation ? Math.floor(daysSinceRotation) : undefined,
        daysUntilRotation: daysUntilRotation ? Math.floor(daysUntilRotation) : undefined,
        failedAttempts: this.failedAuthAttempts.get(credConfig.name) || 0,
        canAutoRotate: credConfig.canAutoRotate,
      };
    }
    
    return status;
  }
}
