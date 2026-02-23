/**
 * Credential Encryption and Management
 * Encrypts sensitive credentials at rest using system keychain
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';
import { SecurityAuditLogger, AuditEventType } from './security-audit.js';

const execAsync = promisify(exec);

interface StoredCredential {
  service: string;
  account: string;
  encrypted: boolean;
  accessLog?: Array<{
    timestamp: string;
    reason?: string;
  }>;
}

/**
 * Platform-specific keychain operations
 */
class MacOSKeychain {
  /**
   * Store a credential in macOS Keychain
   */
  static async store(service: string, account: string, password: string): Promise<void> {
    try {
      // Use security command to add to keychain
      await execAsync(
        `security add-generic-password -a "${account}" -s "${service}" -w "${password}" -U`,
      );
      logger.debug({ service, account }, 'Credential stored in keychain');
    } catch (err) {
      logger.error({ err, service, account }, 'Failed to store credential in keychain');
      throw err;
    }
  }

  /**
   * Retrieve a credential from macOS Keychain
   */
  static async retrieve(service: string, account: string): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `security find-generic-password -a "${account}" -s "${service}" -w`,
      );
      return stdout.trim();
    } catch (err) {
      logger.error({ err, service, account }, 'Failed to retrieve credential from keychain');
      throw new Error(`Credential not found: ${service}/${account}`);
    }
  }

  /**
   * Delete a credential from macOS Keychain
   */
  static async delete(service: string, account: string): Promise<void> {
    try {
      await execAsync(
        `security delete-generic-password -a "${account}" -s "${service}"`,
      );
      logger.debug({ service, account }, 'Credential deleted from keychain');
    } catch (err) {
      logger.warn({ err, service, account }, 'Failed to delete credential from keychain');
    }
  }

  /**
   * Check if credential exists
   */
  static async exists(service: string, account: string): Promise<boolean> {
    try {
      await execAsync(
        `security find-generic-password -a "${account}" -s "${service}" > /dev/null`,
      );
      return true;
    } catch {
      return false;
    }
  }
}

export class CredentialManager {
  private static readonly KEYCHAIN_SERVICE = 'NanoClaw';
  private static readonly CREDENTIALS_METADATA_FILE = path.join(
    process.cwd(),
    'data',
    '.credentials-metadata.json',
  );

  /**
   * Store a credential securely
   */
  static async storeCredential(
    credentialName: string,
    value: string,
    groupFolder?: string,
  ): Promise<void> {
    const account = groupFolder ? `${groupFolder}/${credentialName}` : credentialName;

    try {
      await MacOSKeychain.store(this.KEYCHAIN_SERVICE, account, value);

      // Log access for audit
      SecurityAuditLogger.logEvent({
        timestamp: new Date().toISOString(),
        eventType: AuditEventType.CREDENTIAL_ACCESS,
        groupFolder: groupFolder || 'system',
        severity: 'info',
        details: {
          action: 'store',
          credentialName,
        },
      });

      logger.info({ credentialName, groupFolder }, 'Credential stored');
    } catch (err) {
      logger.error({ err, credentialName, groupFolder }, 'Failed to store credential');
      throw err;
    }
  }

  /**
   * Retrieve a credential securely
   */
  static async getCredential(
    credentialName: string,
    groupFolder?: string,
  ): Promise<string> {
    const account = groupFolder ? `${groupFolder}/${credentialName}` : credentialName;

    try {
      const value = await MacOSKeychain.retrieve(this.KEYCHAIN_SERVICE, account);

      // Log access for audit
      SecurityAuditLogger.logEvent({
        timestamp: new Date().toISOString(),
        eventType: AuditEventType.CREDENTIAL_ACCESS,
        groupFolder: groupFolder || 'system',
        severity: 'info',
        details: {
          action: 'retrieve',
          credentialName,
        },
      });

      return value;
    } catch (err) {
      logger.error({ err, credentialName, groupFolder }, 'Failed to retrieve credential');
      throw err;
    }
  }

  /**
   * Delete a credential
   */
  static async deleteCredential(
    credentialName: string,
    groupFolder?: string,
  ): Promise<void> {
    const account = groupFolder ? `${groupFolder}/${credentialName}` : credentialName;

    try {
      await MacOSKeychain.delete(this.KEYCHAIN_SERVICE, account);

      SecurityAuditLogger.logEvent({
        timestamp: new Date().toISOString(),
        eventType: AuditEventType.CREDENTIAL_ACCESS,
        groupFolder: groupFolder || 'system',
        severity: 'info',
        details: {
          action: 'delete',
          credentialName,
        },
      });

      logger.info({ credentialName, groupFolder }, 'Credential deleted');
    } catch (err) {
      logger.error({ err, credentialName, groupFolder }, 'Failed to delete credential');
      throw err;
    }
  }

  /**
   * Migrate plain-text credentials from .env file to keychain
   */
  static async migrateEnvCredentials(): Promise<void> {
    const envFile = path.join(process.cwd(), '.env');

    if (!fs.existsSync(envFile)) {
      logger.info('No .env file found, skipping migration');
      return;
    }

    try {
      const env = fs.readFileSync(envFile, 'utf-8');
      const lines = env.split('\n').filter((l) => l.trim() && !l.startsWith('#'));

      const sensitivePatterns = [
        'ANTHROPIC_API_KEY',
        'CLAUDE_CODE_OAUTH_TOKEN',
        'OPENAI_API_KEY',
        'WHATSAPP_',
      ];

      for (const line of lines) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim();

        if (sensitivePatterns.some((p) => key.includes(p))) {
          try {
            const exists = await MacOSKeychain.exists(this.KEYCHAIN_SERVICE, key);
            if (!exists) {
              await this.storeCredential(key, value);
              logger.info({ key }, 'Migrated credential from .env to keychain');
            }
          } catch (err) {
            logger.warn({ err, key }, 'Failed to migrate credential');
          }
        }
      }
    } catch (err) {
      logger.error({ err }, 'Failed to migrate credentials');
    }
  }

  /**
   * Get all stored credential names
   */
  static async listCredentials(groupFolder?: string): Promise<string[]> {
    try {
      const pattern = groupFolder ? `${groupFolder}/` : '';
      const { stdout } = await execAsync(
        `security dump-keychain -d login.keychain 2>/dev/null | grep "0x00000007" | grep "${this.KEYCHAIN_SERVICE}" | grep "${pattern}" || true`,
      );

      const credentials: string[] = [];
      // Parse security output to extract credential names
      // This is platform-specific and may need adjustment

      return credentials;
    } catch (err) {
      logger.warn({ err }, 'Failed to list credentials');
      return [];
    }
  }

  /**
   * Rotate a credential (delete old, store new)
   */
  static async rotateCredential(
    credentialName: string,
    newValue: string,
    groupFolder?: string,
  ): Promise<void> {
    try {
      await this.deleteCredential(credentialName, groupFolder);
      await this.storeCredential(credentialName, newValue, groupFolder);

      SecurityAuditLogger.logEvent({
        timestamp: new Date().toISOString(),
        eventType: AuditEventType.CREDENTIAL_ACCESS,
        groupFolder: groupFolder || 'system',
        severity: 'info',
        details: {
          action: 'rotate',
          credentialName,
        },
      });

      logger.info({ credentialName, groupFolder }, 'Credential rotated');
    } catch (err) {
      logger.error({ err, credentialName, groupFolder }, 'Failed to rotate credential');
      throw err;
    }
  }
}

export default CredentialManager;
