/**
 * Input Validation and Sanitization
 * Prevents injection attacks and validates message structure
 */

import { logger } from './logger.js';
import { SecurityAuditLogger, AuditEventType } from './security-audit.js';

export interface ValidationRules {
  maxLength?: number;
  minLength?: number;
  allowedCharacters?: RegExp;
  blockedPatterns?: RegExp[];
  allowHtml?: boolean;
  allowScripts?: boolean;
}

const DEFAULT_RULES: ValidationRules = {
  maxLength: 10000, // Chat message limit
  minLength: 1,
  allowHtml: false,
  allowScripts: false,
  blockedPatterns: [
    // Common injection patterns
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /eval\s*\(/gi,
    /window\./gi,
    /process\./gi,
    /require\s*\(/gi,
    /import\s+/gi,
    /exec\s*\(/gi,
    /spawn\s*\(/gi,
    /child_process/gi,
    /fs\./gi,
    /path\./gi,
    /os\./gi,
  ],
};

export class InputSanitizer {
  /**
   * Validate and sanitize message text
   */
  static validateMessageText(text: string, groupFolder: string): {
    isValid: boolean;
    sanitized: string;
    violations: string[];
  } {
    const violations: string[] = [];
    let sanitized = text;

    // Length checks
    if (text.length > DEFAULT_RULES.maxLength!) {
      violations.push(`Text exceeds max length (${text.length} > ${DEFAULT_RULES.maxLength})`);
    }
    if (text.length < DEFAULT_RULES.minLength!) {
      violations.push(`Text below min length (${text.length} < ${DEFAULT_RULES.minLength})`);
    }

    // Check for injection patterns
    for (const pattern of DEFAULT_RULES.blockedPatterns || []) {
      if (pattern.test(text)) {
        violations.push(`Blocked pattern detected: ${pattern.source}`);
        sanitized = sanitized.replace(pattern, '');
      }
    }

    // Check for suspicious control characters
    const controlCharCount = (text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g) || []).length;
    if (controlCharCount > 0) {
      violations.push(`Contains ${controlCharCount} suspicious control characters`);
      sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    }

    // Check for excessive Unicode
    const unicodeCount = (text.match(/[\u0080-\uFFFF]/g) || []).length;
    if (unicodeCount > text.length * 0.5) {
      violations.push(`Excessive Unicode characters (${unicodeCount}/${text.length})`);
    }

    // Remove HTML if not allowed
    if (!DEFAULT_RULES.allowHtml) {
      const htmlCount = (text.match(/<[^>]+>/g) || []).length;
      if (htmlCount > 0) {
        violations.push(`HTML tags detected (${htmlCount})`);
        sanitized = sanitized.replace(/<[^>]+>/g, '');
      }
    }

    const isValid = violations.length === 0;

    if (!isValid) {
      SecurityAuditLogger.logEvent({
        timestamp: new Date().toISOString(),
        eventType: AuditEventType.MESSAGE_VALIDATION_FAILED,
        groupFolder,
        severity: 'warning',
        details: {
          violations,
          textLength: text.length,
        },
      });

      logger.warn(
        { groupFolder, violations },
        'Message validation failed',
      );
    }

    return { isValid, sanitized, violations };
  }

  /**
   * Detect prompt injection attempts
   */
  static detectPromptInjection(text: string, groupFolder: string): {
    isInjection: boolean;
    injectionPatterns: string[];
  } {
    const injectionPatterns: string[] = [];

    // Common prompt injection patterns
    const patterns = [
      // System prompt leakage attempts
      /ignore previous|forget|disregard|cancel|override/i,
      /show your|reveal|tell me about|what are|display|print.*system/i,
      /you are now|you are actually|act as|pretend to be/i,
      /jailbreak|break free|bypass|circumvent/i,
      /\.env|config|credential|token|secret|key/i,
      /\/admin|\/debug|\/system/i,
      /\[system\]|\[instruction\]|\{system:|"system":/i,
    ];

    for (const pattern of patterns) {
      if (pattern.test(text)) {
        injectionPatterns.push(pattern.source);
      }
    }

    const isInjection = injectionPatterns.length > 0;

    if (isInjection) {
      SecurityAuditLogger.logEvent({
        timestamp: new Date().toISOString(),
        eventType: AuditEventType.MESSAGE_INJECTION_DETECTED,
        groupFolder,
        severity: 'warning',
        details: {
          patterns: injectionPatterns,
          textLength: text.length,
        },
      });

      logger.warn(
        { groupFolder, patterns: injectionPatterns },
        'Prompt injection attempt detected',
      );
    }

    return { isInjection, injectionPatterns };
  }

  /**
   * Validate JID format
   */
  static validateJid(jid: string): boolean {
    // WhatsApp JID format: number@s.whatsapp.net or number-number@g.us
    const jidPattern = /^\d+(-\d+)?@[a-z.]+$/;
    return jidPattern.test(jid);
  }

  /**
   * Validate group folder name
   */
  static validateGroupFolder(folder: string): boolean {
    // Only alphanumeric, underscore, and hyphen
    const folderPattern = /^[a-zA-Z0-9_-]+$/;
    return folderPattern.test(folder) && folder.length > 0 && folder.length <= 64;
  }

  /**
   * Escape text for safe output
   */
  static escapeForOutput(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Validate IPC message structure
   */
  static validateIpcMessage(data: unknown, groupFolder: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (typeof data !== 'object' || data === null) {
      return { isValid: false, errors: ['IPC message must be an object'] };
    }

    const message = data as Record<string, unknown>;

    // Type validation
    if (!['message', 'task'].includes(message.type as string)) {
      errors.push(`Invalid message type: ${message.type}`);
    }

    if (message.type === 'message') {
      if (typeof message.text !== 'string') {
        errors.push('Message field must be string');
      } else {
        const validation = this.validateMessageText(message.text as string, groupFolder);
        errors.push(...validation.violations);
      }

      if (!this.validateJid(message.chatJid as string)) {
        errors.push(`Invalid JID format: ${message.chatJid}`);
      }
    }

    if (message.type === 'task') {
      if (typeof message.taskName !== 'string' || !message.taskName) {
        errors.push('Task name must be a non-empty string');
      }
      if (message.schedule && typeof message.schedule !== 'string') {
        errors.push('Schedule must be a string (cron format)');
      }
    }

    if (errors.length > 0) {
      SecurityAuditLogger.logEvent({
        timestamp: new Date().toISOString(),
        eventType: AuditEventType.MESSAGE_VALIDATION_FAILED,
        groupFolder,
        severity: 'warning',
        details: { errors, messageType: message.type },
      });
    }

    return { isValid: errors.length === 0, errors };
  }
}
