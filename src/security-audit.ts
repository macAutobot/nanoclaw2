/**
 * Security Audit Logging System
 * Tracks and logs security-relevant events for compliance and intrusion detection
 */

import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';

export enum AuditEventType {
  // Container events
  CONTAINER_SPAWN = 'CONTAINER_SPAWN',
  CONTAINER_EXIT = 'CONTAINER_EXIT',
  CONTAINER_ERROR = 'CONTAINER_ERROR',
  CONTAINER_TIMEOUT = 'CONTAINER_TIMEOUT',
  
  // IPC events
  IPC_MESSAGE_SENT = 'IPC_MESSAGE_SENT',
  IPC_MESSAGE_BLOCKED = 'IPC_MESSAGE_BLOCKED',
  IPC_TASK_EXECUTED = 'IPC_TASK_EXECUTED',
  IPC_TASK_BLOCKED = 'IPC_TASK_BLOCKED',
  IPC_UNAUTHORIZED_ACCESS = 'IPC_UNAUTHORIZED_ACCESS',
  
  // Mount events
  MOUNT_VALIDATION_FAILED = 'MOUNT_VALIDATION_FAILED',
  MOUNT_ACCESS_BLOCKED = 'MOUNT_ACCESS_BLOCKED',
  
  // Command execution
  COMMAND_EXECUTION = 'COMMAND_EXECUTION',
  COMMAND_EXECUTED = 'COMMAND_EXECUTED',
  COMMAND_BLOCKED = 'COMMAND_BLOCKED',
  
  // Authentication
  AUTH_FAILURE = 'AUTH_FAILURE',
  AUTH_SUCCESS = 'AUTH_SUCCESS',
  CREDENTIAL_ACCESS = 'CREDENTIAL_ACCESS',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Message validation
  MESSAGE_VALIDATION_FAILED = 'MESSAGE_VALIDATION_FAILED',
  MESSAGE_INJECTION_DETECTED = 'MESSAGE_INJECTION_DETECTED',
}

export interface AuditEvent {
  timestamp: string;
  eventType: AuditEventType;
  groupFolder: string;
  severity: 'info' | 'warning' | 'critical';
  details: Record<string, unknown>;
  sourceIp?: string;
  userId?: string;
}

const AUDIT_LOG_DIR = path.join(process.cwd(), 'data', 'audit-logs');

// Ensure audit log directory exists
fs.mkdirSync(AUDIT_LOG_DIR, { recursive: true });

export class SecurityAuditLogger {
  private static readonly MAX_LOG_SIZE = 100 * 1024 * 1024; // 100MB
  private static readonly ROTATION_PREFIX = 'audit-';
  private static readonly SUSPICIOUS_THRESHOLD = 5; // Actions in time window

  /**
   * Log a security-relevant event to audit logs
   */
  static logEvent(event: AuditEvent): void {
    const logEntry = JSON.stringify({
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    });

    const logFile = path.join(AUDIT_LOG_DIR, `${event.groupFolder}.json`);
    
    // Log to appropriate level based on severity
    if (event.severity === 'critical') {
      logger.error({ event: event.eventType, details: event.details }, logEntry);
    } else if (event.severity === 'warning') {
      logger.warn({ event: event.eventType, details: event.details }, logEntry);
    } else {
      logger.info({ event: event.eventType, details: event.details }, logEntry);
    }

    // Write to persistent audit log
    try {
      fs.appendFileSync(logFile, logEntry + '\n');
      this.checkAndRotateLog(logFile);
    } catch (err) {
      logger.error({ err }, 'Failed to write audit log');
    }
  }

  /**
   * Check for suspicious activity patterns
   */
  static detectSuspiciousActivity(
    groupFolder: string,
    eventType: AuditEventType,
    timeWindowMs: number = 60000, // 1 minute
  ): boolean {
    const logFile = path.join(AUDIT_LOG_DIR, `${groupFolder}.json`);
    
    if (!fs.existsSync(logFile)) return false;

    try {
      const lines = fs.readFileSync(logFile, 'utf-8').split('\n').filter(Boolean);
      const now = Date.now();
      const recentEvents = lines
        .map((line) => {
          try {
            const parsed = JSON.parse(line) as AuditEvent;
            return parsed;
          } catch {
            return null;
          }
        })
        .filter((e): e is AuditEvent => e !== null)
        .filter((e) => e.eventType === eventType)
        .filter((e) => {
          const eventTime = new Date(e.timestamp).getTime();
          return now - eventTime < timeWindowMs;
        });

      return recentEvents.length >= this.SUSPICIOUS_THRESHOLD;
    } catch (err) {
      logger.warn({ err }, 'Failed to check for suspicious activity');
      return false;
    }
  }

  /**
   * Get audit log entries for analysis
   */
  static getAuditLog(
    groupFolder: string,
    limit: number = 1000,
  ): AuditEvent[] {
    const logFile = path.join(AUDIT_LOG_DIR, `${groupFolder}.json`);
    
    if (!fs.existsSync(logFile)) return [];

    try {
      const lines = fs.readFileSync(logFile, 'utf-8').split('\n').filter(Boolean);
      return lines
        .slice(-limit)
        .map((line) => {
          try {
            return JSON.parse(line) as AuditEvent;
          } catch {
            return null;
          }
        })
        .filter((e) => e !== null) as AuditEvent[];
    } catch (err) {
      logger.error({ err }, 'Failed to read audit log');
      return [];
    }
  }

  /**
   * Rotate audit logs when they exceed max size
   */
  private static checkAndRotateLog(logFile: string): void {
    try {
      const stats = fs.statSync(logFile);
      if (stats.size > this.MAX_LOG_SIZE) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFile = logFile.replace(/\.json$/, `.${timestamp}.json`);
        fs.renameSync(logFile, rotatedFile);
        logger.info({ rotatedFile }, 'Rotated audit log');
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to rotate audit log');
    }
  }

  /**
   * Clear old audit logs (older than retentionDays)
   */
  static purgeOldLogs(retentionDays: number = 30): void {
    try {
      const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
      const files = fs.readdirSync(AUDIT_LOG_DIR);
      
      for (const file of files) {
        const filePath = path.join(AUDIT_LOG_DIR, file);
        const stats = fs.statSync(filePath);
        if (stats.mtime.getTime() < cutoffTime) {
          fs.unlinkSync(filePath);
          logger.info({ file }, 'Purged old audit log');
        }
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to purge old audit logs');
    }
  }
}

/**
 * Risk level classification for intrusion detection
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Intrusion Detection System
 * Detects patterns that indicate compromise or misuse
 */
export class IntrusionDetection {
  private static readonly UNAUTHORIZED_ACCESS_THRESHOLD = 10;
  private static readonly RAPID_SPAWN_THRESHOLD = 20; // per minute
  private static readonly COMMAND_ANOMALY_THRESHOLD = 50; // commands per container

  /**
   * Check if activity indicates intrusion
   */
  static analyzePattern(groupFolder: string): {
    isAnomalous: boolean;
    riskLevel: RiskLevel;
    indicators: string[];
  } {
    const events = SecurityAuditLogger.getAuditLog(groupFolder, 500);
    const indicators: string[] = [];
    let riskLevel: RiskLevel = 'low';

    // Check for excessive unauthorized access attempts
    const unauthorizedCount = events.filter(
      (e) => e.eventType === AuditEventType.IPC_UNAUTHORIZED_ACCESS,
    ).length;
    if (unauthorizedCount > this.UNAUTHORIZED_ACCESS_THRESHOLD) {
      indicators.push(`Excessive unauthorized access attempts (${unauthorizedCount})`);
      riskLevel = 'high';
    }

    // Check for rapid container spawning
    const lastMinute = events.filter((e) => {
      const eventTime = new Date(e.timestamp).getTime();
      return Date.now() - eventTime < 60000;
    });
    const spawnCount = lastMinute.filter(
      (e) => e.eventType === AuditEventType.CONTAINER_SPAWN,
    ).length;
    if (spawnCount > this.RAPID_SPAWN_THRESHOLD) {
      indicators.push(`Rapid container spawning detected (${spawnCount}/min)`);
      riskLevel = 'critical';
    }

    // Check for injection attempts
    const injectionCount = events.filter(
      (e) => e.eventType === AuditEventType.MESSAGE_INJECTION_DETECTED,
    ).length;
    if (injectionCount > 0) {
      indicators.push(`Message injection attempts detected (${injectionCount})`);
      riskLevel = 'critical';
    }

    // Check for rate limit violations
    const rateLimitCount = events.filter(
      (e) => e.eventType === AuditEventType.RATE_LIMIT_EXCEEDED,
    ).length;
    if (rateLimitCount > 3) {
      indicators.push(`Rate limit violations (${rateLimitCount})`);
      riskLevel = riskLevel === 'critical' ? 'critical' : 'medium';
    }

    return {
      isAnomalous: indicators.length > 0,
      riskLevel,
      indicators,
    };
  }
}
