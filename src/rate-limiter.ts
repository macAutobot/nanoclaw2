/**
 * Rate Limiter for Container Operations
 * Prevents abuse through DoS-like rapid spawning of containers
 */

import { logger } from './logger.js';
import { SecurityAuditLogger, AuditEventType } from './security-audit.js';

export interface RateLimitConfig {
  // Containers per minute per group
  containerSpawnsPerMinute?: number;
  // Message sends per minute per group
  messagesSendPerMinute?: number;
  // Task executions per minute per group
  tasksPerMinute?: number;
  // IPC operations per second per group
  ipcOpsPerSecond?: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private containerSpawns: Map<string, RateLimitEntry> = new Map();
  private messageSends: Map<string, RateLimitEntry> = new Map();
  private taskExecutions: Map<string, RateLimitEntry> = new Map();
  private ipcOperations: Map<string, RateLimitEntry> = new Map();

  private config: Required<RateLimitConfig> = {
    containerSpawnsPerMinute: 30, // Allow reasonable burst but prevent DoS
    messagesSendPerMinute: 60, // Allow fluent conversation
    tasksPerMinute: 10, // Reduce task spam
    ipcOpsPerSecond: 100, // High but detectable spike
  };

  constructor(config?: RateLimitConfig) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Check if container spawn is allowed
   */
  checkContainerSpawn(groupFolder: string): boolean {
    return this.checkLimit(
      this.containerSpawns,
      groupFolder,
      this.config.containerSpawnsPerMinute,
      60000,
      AuditEventType.RATE_LIMIT_EXCEEDED,
    );
  }

  /**
   * Check if message send is allowed
   */
  checkMessageSend(groupFolder: string): boolean {
    return this.checkLimit(
      this.messageSends,
      groupFolder,
      this.config.messagesSendPerMinute,
      60000,
      AuditEventType.RATE_LIMIT_EXCEEDED,
    );
  }

  /**
   * Check if task execution is allowed
   */
  checkTaskExecution(groupFolder: string): boolean {
    return this.checkLimit(
      this.taskExecutions,
      groupFolder,
      this.config.tasksPerMinute,
      60000,
      AuditEventType.RATE_LIMIT_EXCEEDED,
    );
  }

  /**
   * Check if IPC operation is allowed
   */
  checkIpcOperation(groupFolder: string): boolean {
    return this.checkLimit(
      this.ipcOperations,
      groupFolder,
      this.config.ipcOpsPerSecond,
      1000,
      AuditEventType.RATE_LIMIT_EXCEEDED,
    );
  }

  /**
   * Record a container spawn
   */
  recordContainerSpawn(groupFolder: string): void {
    this.recordOperation(this.containerSpawns, groupFolder, 60000);
  }

  /**
   * Record a message send
   */
  recordMessageSend(groupFolder: string): void {
    this.recordOperation(this.messageSends, groupFolder, 60000);
  }

  /**
   * Record a task execution
   */
  recordTaskExecution(groupFolder: string): void {
    this.recordOperation(this.taskExecutions, groupFolder, 60000);
  }

  /**
   * Record an IPC operation
   */
  recordIpcOperation(groupFolder: string): void {
    this.recordOperation(this.ipcOperations, groupFolder, 1000);
  }

  /**
   * Get current rate limit status
   */
  getStatus(groupFolder: string) {
    return {
      containerSpawns: this.getEntryCount(this.containerSpawns, groupFolder),
      messageSends: this.getEntryCount(this.messageSends, groupFolder),
      taskExecutions: this.getEntryCount(this.taskExecutions, groupFolder),
      ipcOperations: this.getEntryCount(this.ipcOperations, groupFolder),
    };
  }

  /**
   * Reset rate limits for a group (admin operation)
   */
  resetForGroup(groupFolder: string): void {
    this.containerSpawns.delete(groupFolder);
    this.messageSends.delete(groupFolder);
    this.taskExecutions.delete(groupFolder);
    this.ipcOperations.delete(groupFolder);
    logger.info({ groupFolder }, 'Rate limits reset');
  }

  /**
   * Generic rate limit check
   */
  private checkLimit(
    store: Map<string, RateLimitEntry>,
    groupFolder: string,
    maxCount: number,
    windowMs: number,
    eventType: AuditEventType,
  ): boolean {
    const now = Date.now();
    let entry = store.get(groupFolder);

    // Initialize or reset if window has passed
    if (!entry || now >= entry.resetTime) {
      entry = { count: 0, resetTime: now + windowMs };
      store.set(groupFolder, entry);
    }

    if (entry.count >= maxCount) {
      SecurityAuditLogger.logEvent({
        timestamp: new Date().toISOString(),
        eventType,
        groupFolder,
        severity: 'warning',
        details: {
          limit: maxCount,
          windowMs,
          exceeded: true,
        },
      });
      logger.warn(
        { groupFolder, limit: maxCount, windowMs },
        'Rate limit exceeded',
      );
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Record an operation
   */
  private recordOperation(
    store: Map<string, RateLimitEntry>,
    groupFolder: string,
    windowMs: number,
  ): void {
    const now = Date.now();
    let entry = store.get(groupFolder);

    if (!entry || now >= entry.resetTime) {
      entry = { count: 0, resetTime: now + windowMs };
      store.set(groupFolder, entry);
    }

    entry.count++;
  }

  /**
   * Get current count for an entry
   */
  private getEntryCount(store: Map<string, RateLimitEntry>, groupFolder: string): number {
    const entry = store.get(groupFolder);
    if (!entry) return 0;
    if (Date.now() >= entry.resetTime) return 0;
    return entry.count;
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter();
