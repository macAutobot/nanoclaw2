/**
 * Automated Secret Rotation
 * Rotates credentials on suspicious activity detection
 */

import { execSync } from 'child_process';
import { logger } from './logger.js';
import { SecurityAuditLogger, AuditEventType } from './security-audit.js';
import { IntrusionDetection, RiskLevel } from './security-audit.js';
import { SessionEncryption } from './session-encryption.js';

export interface RotationPolicy {
  // Rotate on intrusion detection at this risk level
  minRiskLevel: RiskLevel;
  // Rotate credentials periodically (days)
  periodicRotationDays?: number;
  // Rotate on failed auth attempts
  maxFailedAuthAttempts?: number;
  // Credentials to rotate
  credentials: string[];
}

const DEFAULT_POLICY: RotationPolicy = {
  minRiskLevel: 'critical',
  periodicRotationDays: 90, // 3 months
  maxFailedAuthAttempts: 5,
  credentials: ['ANTHROPIC_API_KEY', 'CLAUDE_CODE_OAUTH_TOKEN'],
};

export class SecretRotationManager {
  private policy: RotationPolicy;
  private lastRotationTime: Map<string, Date> = new Map();
  private failedAuthAttempts: Map<string, number> = new Map();
  private sessionEncryption: SessionEncryption;

  constructor(authStorePath: string, policy?: Partial<RotationPolicy>) {
    this.policy = { ...DEFAULT_POLICY, ...policy };
    this.sessionEncryption = new SessionEncryption(authStorePath);
  }

  /**
   * Check if rotation is needed based on suspicious activity
   */
  async checkAndRotate(groupFolder: string): Promise<void> {
    // Check intrusion detection
    const analysis = IntrusionDetection.analyzePattern(groupFolder);
    
    if (analysis.isAnomalous && this.shouldRotateForRisk(analysis.riskLevel)) {
      logger.warn(
        { groupFolder, riskLevel: analysis.riskLevel, indicators: analysis.indicators },
        'Suspicious activity detected, initiating credential rotation'
      );

      await this.rotateAllCredentials('intrusion-detected');
    }

    // Check periodic rotation
    await this.checkPeriodicRotation();
  }

  /**
   * Rotate credentials on suspicious activity
   */
  private shouldRotateForRisk(riskLevel: RiskLevel): boolean {
    const levels: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
    const currentIndex = levels.indexOf(riskLevel);
    const minIndex = levels.indexOf(this.policy.minRiskLevel);
    
    return currentIndex >= minIndex;
  }

  /**
   * Check if periodic rotation is needed
   */
  private async checkPeriodicRotation(): Promise<void> {
    if (!this.policy.periodicRotationDays) return;

    for (const credential of this.policy.credentials) {
      const lastRotation = this.lastRotationTime.get(credential);
      
      if (!lastRotation) {
        // First time, record current time
        this.lastRotationTime.set(credential, new Date());
        continue;
      }

      const daysSinceRotation = (Date.now() - lastRotation.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceRotation >= this.policy.periodicRotationDays) {
        logger.info(
          { credential, daysSinceRotation },
          'Periodic rotation interval reached'
        );
        
        await this.rotateCredential(credential, 'periodic');
      }
    }
  }

  /**
   * Record failed authentication attempt
   */
  recordFailedAuth(credential: string): void {
    const current = this.failedAuthAttempts.get(credential) || 0;
    this.failedAuthAttempts.set(credential, current + 1);

    if (this.policy.maxFailedAuthAttempts && current + 1 >= this.policy.maxFailedAuthAttempts) {
      logger.warn(
        { credential, attempts: current + 1 },
        'Max failed auth attempts reached, credential may be compromised'
      );

      SecurityAuditLogger.logEvent({
        timestamp: new Date().toISOString(),
        eventType: AuditEventType.AUTH_FAILURE,
        groupFolder: 'system',
        severity: 'critical',
        details: {
          credential,
          failedAttempts: current + 1,
          action: 'credential-rotation-recommended',
        },
      });
    }
  }

  /**
   * Rotate all managed credentials
   */
  private async rotateAllCredentials(reason: string): Promise<void> {
    logger.info({ reason }, 'Starting rotation of all credentials');

    for (const credential of this.policy.credentials) {
      await this.rotateCredential(credential, reason);
    }

    // Rotate session encryption key
    await this.sessionEncryption.rotateEncryptionKey();

    SecurityAuditLogger.logEvent({
      timestamp: new Date().toISOString(),
      eventType: AuditEventType.CREDENTIAL_ACCESS,
      groupFolder: 'system',
      severity: 'warning',
      details: {
        action: 'rotate-all',
        reason,
        credentials: this.policy.credentials,
      },
    });
  }

  /**
   * Rotate a specific credential
   */
  private async rotateCredential(credential: string, reason: string): Promise<void> {
    try {
      // For API keys, we can't automatically generate new ones
      // Instead, we:
      // 1. Delete the current key from Keychain
      // 2. Log a critical alert for manual rotation
      // 3. Prevent system from starting until new key is provided

      logger.warn(
        { credential, reason },
        'Credential rotation required - manual intervention needed'
      );

      SecurityAuditLogger.logEvent({
        timestamp: new Date().toISOString(),
        eventType: AuditEventType.CREDENTIAL_ACCESS,
        groupFolder: 'system',
        severity: 'critical',
        details: {
          action: 'rotation-required',
          credential,
          reason,
          message: 'Manual credential rotation required. Please update the credential in your credential provider.',
        },
      });

      // Mark credential as requiring rotation
      this.markForRotation(credential);
      
      // Update last rotation time
      this.lastRotationTime.set(credential, new Date());
      
      // Reset failed auth counter
      this.failedAuthAttempts.set(credential, 0);

    } catch (err) {
      logger.error({ err, credential }, 'Failed to rotate credential');
      
      SecurityAuditLogger.logEvent({
        timestamp: new Date().toISOString(),
        eventType: AuditEventType.AUTH_FAILURE,
        groupFolder: 'system',
        severity: 'critical',
        details: {
          action: 'rotation-failed',
          credential,
          reason,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }

  /**
   * Mark a credential as needing rotation
   */
  private markForRotation(credential: string): void {
    try {
      // Try to delete from Keychain to force re-entry
      const serviceName = 'NanoClaw';
      const accountName = `main/${credential}`;
      
      execSync(
        `security delete-generic-password -a "${accountName}" -s "${serviceName}" 2>/dev/null || true`,
        { stdio: 'pipe' }
      );

      logger.info({ credential }, 'Credential marked for rotation (deleted from Keychain)');
    } catch (err) {
      logger.debug({ err, credential }, 'Could not delete credential from Keychain (may not exist)');
    }
  }

  /**
   * Force immediate rotation of all credentials
   */
  async forceRotateAll(): Promise<void> {
    logger.warn('Forcing immediate rotation of all credentials');
    await this.rotateAllCredentials('manual-force');
  }

  /**
   * Get rotation status
   */
  getRotationStatus(): Record<string, { lastRotation?: Date; failedAttempts: number }> {
    const status: Record<string, { lastRotation?: Date; failedAttempts: number }> = {};
    
    for (const credential of this.policy.credentials) {
      status[credential] = {
        lastRotation: this.lastRotationTime.get(credential),
        failedAttempts: this.failedAuthAttempts.get(credential) || 0,
      };
    }
    
    return status;
  }
}
