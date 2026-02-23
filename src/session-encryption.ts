/**
 * Session Encryption for WhatsApp Auth Store
 * Encrypts session data at rest using macOS Keychain
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';
import { logger } from './logger.js';
import { SecurityAuditLogger, AuditEventType } from './security-audit.js';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

export class SessionEncryption {
  private serviceName: string;
  private accountName: string;
  private authStorePath: string;

  constructor(authStorePath: string, serviceName = 'NanoClaw', accountName = 'session-encryption') {
    this.authStorePath = authStorePath;
    this.serviceName = serviceName;
    this.accountName = accountName;
  }

  /**
   * Get or create encryption key from macOS Keychain
   */
  private getOrCreateEncryptionKey(): Buffer {
    try {
      // Try to retrieve existing key
      const result = execSync(
        `security find-generic-password -a "${this.accountName}" -s "${this.serviceName}" -w`,
        { encoding: 'utf-8' }
      );
      
      const keyHex = result.trim();
      return Buffer.from(keyHex, 'hex');
    } catch (err) {
      // Key doesn't exist, create new one
      logger.info('Creating new session encryption key in Keychain');
      
      const key = crypto.randomBytes(KEY_LENGTH);
      const keyHex = key.toString('hex');
      
      execSync(
        `security add-generic-password -a "${this.accountName}" -s "${this.serviceName}" -w "${keyHex}"`,
        { stdio: 'pipe' }
      );
      
      SecurityAuditLogger.logEvent({
        timestamp: new Date().toISOString(),
        eventType: AuditEventType.CREDENTIAL_ACCESS,
        groupFolder: 'system',
        severity: 'info',
        details: {
          action: 'create',
          credential: 'session-encryption-key',
        },
      });
      
      return key;
    }
  }

  /**
   * Derive encryption key from master key and salt
   */
  private deriveKey(masterKey: Buffer, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha256');
  }

  /**
   * Encrypt session data
   */
  encryptSession(data: Buffer): Buffer {
    const masterKey = this.getOrCreateEncryptionKey();
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = this.deriveKey(masterKey, salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    // Format: [salt][iv][authTag][encrypted]
    return Buffer.concat([salt, iv, authTag, encrypted]);
  }

  /**
   * Decrypt session data
   */
  decryptSession(encryptedData: Buffer): Buffer {
    const masterKey = this.getOrCreateEncryptionKey();
    
    // Extract components
    const salt = encryptedData.subarray(0, SALT_LENGTH);
    const iv = encryptedData.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = encryptedData.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
    );
    const encrypted = encryptedData.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    
    const key = this.deriveKey(masterKey, salt);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  /**
   * Encrypt all files in auth-store directory
   */
  async encryptAuthStore(): Promise<void> {
    if (!fs.existsSync(this.authStorePath)) {
      logger.info({ path: this.authStorePath }, 'Auth store does not exist, nothing to encrypt');
      return;
    }

    const files = this.findSessionFiles(this.authStorePath);
    let encryptedCount = 0;

    for (const file of files) {
      try {
        // Skip already encrypted files
        if (file.endsWith('.enc')) {
          continue;
        }

        const data = fs.readFileSync(file);
        const encrypted = this.encryptSession(data);
        
        // Write encrypted file
        const encryptedPath = `${file}.enc`;
        fs.writeFileSync(encryptedPath, encrypted);
        
        // Remove original
        fs.unlinkSync(file);
        
        encryptedCount++;
        logger.debug({ file: path.basename(file) }, 'Encrypted session file');
      } catch (err) {
        logger.error({ err, file }, 'Failed to encrypt session file');
      }
    }

    if (encryptedCount > 0) {
      SecurityAuditLogger.logEvent({
        timestamp: new Date().toISOString(),
        eventType: AuditEventType.AUTH_SUCCESS,
        groupFolder: 'system',
        severity: 'info',
        details: {
          action: 'encrypt-auth-store',
          filesEncrypted: encryptedCount,
        },
      });

      logger.info({ count: encryptedCount }, 'Encrypted auth store files');
    }
  }

  /**
   * Decrypt all encrypted files in auth-store directory
   */
  async decryptAuthStore(): Promise<void> {
    if (!fs.existsSync(this.authStorePath)) {
      logger.info({ path: this.authStorePath }, 'Auth store does not exist, nothing to decrypt');
      return;
    }

    const files = this.findSessionFiles(this.authStorePath, '.enc');
    let decryptedCount = 0;

    for (const file of files) {
      try {
        const encrypted = fs.readFileSync(file);
        const decrypted = this.decryptSession(encrypted);
        
        // Write decrypted file
        const decryptedPath = file.replace(/\.enc$/, '');
        fs.writeFileSync(decryptedPath, decrypted);
        
        // Remove encrypted version
        fs.unlinkSync(file);
        
        decryptedCount++;
        logger.debug({ file: path.basename(file) }, 'Decrypted session file');
      } catch (err) {
        logger.error({ err, file }, 'Failed to decrypt session file');
      }
    }

    if (decryptedCount > 0) {
      SecurityAuditLogger.logEvent({
        timestamp: new Date().toISOString(),
        eventType: AuditEventType.AUTH_SUCCESS,
        groupFolder: 'system',
        severity: 'info',
        details: {
          action: 'decrypt-auth-store',
          filesDecrypted: decryptedCount,
        },
      });

      logger.info({ count: decryptedCount }, 'Decrypted auth store files');
    }
  }

  /**
   * Find session files recursively
   */
  private findSessionFiles(dir: string, extension?: string): string[] {
    const files: string[] = [];
    
    const search = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          search(fullPath);
        } else if (entry.isFile()) {
          // Include all files if no extension specified, or match extension
          if (!extension || entry.name.endsWith(extension)) {
            files.push(fullPath);
          }
        }
      }
    };
    
    search(dir);
    return files;
  }

  /**
   * Rotate encryption key (re-encrypt with new key)
   */
  async rotateEncryptionKey(): Promise<void> {
    logger.info('Rotating session encryption key');

    // Decrypt with old key
    await this.decryptAuthStore();

    // Delete old key from Keychain
    try {
      execSync(
        `security delete-generic-password -a "${this.accountName}" -s "${this.serviceName}"`,
        { stdio: 'pipe' }
      );
    } catch (err) {
      logger.warn({ err }, 'Failed to delete old encryption key');
    }

    // Encrypt with new key
    await this.encryptAuthStore();

    SecurityAuditLogger.logEvent({
      timestamp: new Date().toISOString(),
      eventType: AuditEventType.CREDENTIAL_ACCESS,
      groupFolder: 'system',
      severity: 'info',
      details: {
        action: 'rotate',
        credential: 'session-encryption-key',
      },
    });

    logger.info('Session encryption key rotated successfully');
  }

  /**
   * Check if auth store is encrypted
   */
  isEncrypted(): boolean {
    if (!fs.existsSync(this.authStorePath)) {
      return false;
    }

    const files = this.findSessionFiles(this.authStorePath);
    const encryptedFiles = files.filter(f => f.endsWith('.enc'));
    const unencryptedFiles = files.filter(f => !f.endsWith('.enc'));

    // Consider encrypted if we have any encrypted files and no unencrypted ones
    return encryptedFiles.length > 0 && unencryptedFiles.length === 0;
  }
}
