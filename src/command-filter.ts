/**
 * Command Allowlist/Blocklist Filter
 * Prevents execution of dangerous commands in containers
 */

import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';
import { SecurityAuditLogger, AuditEventType } from './security-audit.js';

export interface CommandFilterConfig {
  mode: 'allowlist' | 'blocklist' | 'audit-only';
  allowedCommands?: string[];
  blockedCommands?: string[];
  allowedPatterns?: RegExp[];
  blockedPatterns?: RegExp[];
}

const DEFAULT_ALLOWED_COMMANDS = [
  // File operations
  'ls', 'cat', 'head', 'tail', 'grep', 'find', 'wc', 'sort', 'uniq',
  // Text processing
  'sed', 'awk', 'cut', 'tr', 'paste',
  // Development
  'git', 'npm', 'node', 'python', 'python3', 'pip', 'pip3',
  'cargo', 'rustc', 'go', 'java', 'javac', 'make', 'cmake',
  // Build tools
  'tsc', 'tsx', 'webpack', 'vite', 'rollup',
  // Package managers
  'apt', 'brew', 'yum', 'apk',
  // File creation/editing
  'mkdir', 'touch', 'cp', 'mv', 'rm', 'echo', 'printf',
  // Compression
  'tar', 'zip', 'unzip', 'gzip', 'gunzip', 'bzip2',
  // Network (read-only)
  'curl', 'wget', 'dig', 'nslookup', 'ping',
  // System info (read-only)
  'pwd', 'whoami', 'env', 'printenv', 'date', 'uptime', 'df', 'du',
  // Process management (limited)
  'ps', 'kill', 'pkill',
];

const DEFAULT_BLOCKED_COMMANDS = [
  // System modification
  'reboot', 'shutdown', 'halt', 'poweroff', 'init',
  // User management
  'useradd', 'userdel', 'usermod', 'passwd', 'chsh',
  // Privilege escalation
  'sudo', 'su', 'doas',
  // Network exposure
  'nc', 'netcat', 'ncat', 'socat', 'telnet', 'ssh', 'scp', 'sftp',
  // Container escape attempts
  'docker', 'podman', 'kubectl', 'crictl',
  // Mounted filesystem modification (outside workspace)
  'mount', 'umount', 'fdisk', 'mkfs', 'dd',
  // Kernel modules
  'insmod', 'rmmod', 'modprobe',
  // Setuid/capabilities
  'chmod', 'chown', 'chgrp', 'setcap', 'getcap',
];

const DEFAULT_BLOCKED_PATTERNS = [
  // Reverse shells
  /bash\s+-i\s+>\s*&\s*\/dev\/tcp/i,
  /sh\s+-i\s+>\s*&\s*\/dev\/tcp/i,
  /nc.*-e\s+(\/bin\/)?bash/i,
  // Privilege escalation
  /sudo\s+/i,
  /su\s+-/i,
  // Container escape
  /\/var\/run\/docker\.sock/i,
  /\/proc\/self\/exe/i,
  // Credential theft
  /\/etc\/shadow/i,
  /\/root\/\.ssh/i,
  // Host access
  /\/host\//i,
  /\/hostos\//i,
];

export class CommandFilter {
  private config: CommandFilterConfig;
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(
      process.env.HOME || '/Users/user',
      '.config',
      'nanoclaw',
      'command-filter.json',
    );

    this.config = this.loadConfig();
  }

  private loadConfig(): CommandFilterConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        logger.info({ configPath: this.configPath }, 'Loaded command filter config');
        return {
          ...data,
          allowedPatterns: data.allowedPatterns?.map((p: string) => new RegExp(p, 'i')) || [],
          blockedPatterns: data.blockedPatterns?.map((p: string) => new RegExp(p, 'i')) || DEFAULT_BLOCKED_PATTERNS,
        };
      }
    } catch (err) {
      logger.warn({ err, configPath: this.configPath }, 'Failed to load command filter config, using defaults');
    }

    // Default configuration
    return {
      mode: 'allowlist',
      allowedCommands: DEFAULT_ALLOWED_COMMANDS,
      blockedCommands: DEFAULT_BLOCKED_COMMANDS,
      allowedPatterns: [],
      blockedPatterns: DEFAULT_BLOCKED_PATTERNS,
    };
  }

  /**
   * Save current configuration to disk
   */
  saveConfig(): void {
    try {
      const dir = path.dirname(this.configPath);
      fs.mkdirSync(dir, { recursive: true });
      
      const data = {
        ...this.config,
        allowedPatterns: this.config.allowedPatterns?.map(p => p.source) || [],
        blockedPatterns: this.config.blockedPatterns?.map(p => p.source) || [],
      };
      
      fs.writeFileSync(this.configPath, JSON.stringify(data, null, 2));
      logger.info({ configPath: this.configPath }, 'Saved command filter config');
    } catch (err) {
      logger.error({ err, configPath: this.configPath }, 'Failed to save command filter config');
    }
  }

  /**
   * Validate a shell command before execution
   */
  validateCommand(command: string, groupFolder: string): {
    allowed: boolean;
    reason?: string;
    suggestion?: string;
  } {
    const trimmedCommand = command.trim();
    if (!trimmedCommand) {
      return { allowed: false, reason: 'Empty command' };
    }

    // Extract the base command (first word)
    const baseCommand = this.extractBaseCommand(trimmedCommand);

    // Check blocked patterns first (highest priority)
    for (const pattern of this.config.blockedPatterns || []) {
      if (pattern.test(trimmedCommand)) {
        SecurityAuditLogger.logEvent({
          timestamp: new Date().toISOString(),
          eventType: AuditEventType.COMMAND_BLOCKED,
          groupFolder,
          severity: 'critical',
          details: {
            command: trimmedCommand,
            reason: 'Matched blocked pattern',
            pattern: pattern.source,
          },
        });

        logger.warn({ groupFolder, command: trimmedCommand, pattern: pattern.source }, 'Command blocked by pattern');
        
        return {
          allowed: false,
          reason: `Command matches blocked pattern: ${pattern.source}`,
          suggestion: 'This command pattern is not allowed for security reasons',
        };
      }
    }

    // Check explicitly blocked commands
    if (this.config.blockedCommands?.includes(baseCommand)) {
      SecurityAuditLogger.logEvent({
        timestamp: new Date().toISOString(),
        eventType: AuditEventType.COMMAND_BLOCKED,
        groupFolder,
        severity: 'critical',
        details: {
          command: trimmedCommand,
          reason: 'Explicitly blocked command',
          baseCommand,
        },
      });

      logger.warn({ groupFolder, command: trimmedCommand, baseCommand }, 'Blocked command execution attempt');

      return {
        allowed: false,
        reason: `Command '${baseCommand}' is blocked`,
        suggestion: 'This command is not allowed for security reasons',
      };
    }

    // In allowlist mode, check if command is allowed
    if (this.config.mode === 'allowlist') {
      const isAllowed = this.config.allowedCommands?.includes(baseCommand) ||
                        this.config.allowedPatterns?.some(p => p.test(trimmedCommand));

      if (!isAllowed) {
        SecurityAuditLogger.logEvent({
          timestamp: new Date().toISOString(),
          eventType: AuditEventType.COMMAND_BLOCKED,
          groupFolder,
          severity: 'warning',
          details: {
            command: trimmedCommand,
            reason: 'Not in allowlist',
            baseCommand,
          },
        });

        logger.warn({ groupFolder, command: trimmedCommand, baseCommand }, 'Command not in allowlist');

        return {
          allowed: false,
          reason: `Command '${baseCommand}' is not in the allowlist`,
          suggestion: 'Only pre-approved commands can be executed. Contact admin to add this command.',
        };
      }
    }

    // In audit-only mode, log but allow
    if (this.config.mode === 'audit-only') {
      SecurityAuditLogger.logEvent({
        timestamp: new Date().toISOString(),
        eventType: AuditEventType.COMMAND_EXECUTED,
        groupFolder,
        severity: 'info',
        details: {
          command: trimmedCommand,
          baseCommand,
          mode: 'audit-only',
        },
      });
    }

    return { allowed: true };
  }

  /**
   * Extract the base command from a shell command string
   */
  private extractBaseCommand(command: string): string {
    // Remove leading whitespace
    const trimmed = command.trim();
    
    // Handle piped commands - validate the first command
    const firstPipe = trimmed.split('|')[0].trim();
    
    // Handle chained commands - validate the first command
    const firstChain = firstPipe.split(/[;&]|&&|\|\|/)[0].trim();
    
    // Extract just the command name (ignore env vars, redirects, etc)
    const match = firstChain.match(/^(?:[A-Z_]+=\S+\s+)*(\S+)/);
    
    if (match) {
      const cmd = match[1];
      // Handle sudo, nice, etc prefixes
      if (['sudo', 'su', 'nice', 'nohup', 'time'].includes(cmd)) {
        const remaining = firstChain.substring(match[0].length).trim();
        const nextMatch = remaining.match(/^(\S+)/);
        return nextMatch ? nextMatch[1] : cmd;
      }
      return cmd;
    }
    
    return trimmed.split(/\s+/)[0];
  }

  /**
   * Get current configuration
   */
  getConfig(): CommandFilterConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<CommandFilterConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }
}

// Global instance
export const globalCommandFilter = new CommandFilter();
