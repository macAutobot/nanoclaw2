import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import {
  ASSISTANT_NAME,
  CONTAINER_RUNTIME,
  DATA_DIR,
  IDLE_TIMEOUT,
  MAIN_GROUP_FOLDER,
  POLL_INTERVAL,
  TRIGGER_PATTERN,
} from './config.js';
import { WhatsAppChannel } from './channels/whatsapp.js';
import {
  ContainerOutput,
  runContainerAgent,
  writeGroupsSnapshot,
  writeTasksSnapshot,
} from './container-runner.js';
import {
  getAllChats,
  getAllRegisteredGroups,
  getAllSessions,
  getAllTasks,
  getMessagesSince,
  getNewMessages,
  getRouterState,
  initDatabase,
  setRegisteredGroup,
  setRouterState,
  setSession,
  storeChatMetadata,
  storeMessage,
} from './db.js';
import { GroupQueue } from './group-queue.js';
import { startIpcWatcher } from './ipc.js';
import { startRagServer } from './rag-server.js';
import { indexFile, searchRag } from './rag.js';
import { formatMessages, formatOutbound } from './router.js';
import { startSchedulerLoop } from './task-scheduler.js';
import { NewMessage, RegisteredGroup } from './types.js';
import { logger } from './logger.js';
import { SessionEncryption } from './session-encryption.js';
import { EnhancedSecretRotation } from './enhanced-secret-rotation.js';
import { SecurityAuditLogger } from './security-audit.js';
import { globalOllamaTLS } from './ollama-tls.js';

// Re-export for backwards compatibility during refactor
export { escapeXml, formatMessages } from './router.js';

// ---------------------------------------------------------------------------
// RAG context injection
// ---------------------------------------------------------------------------

const RAG_SCORE_THRESHOLD = 0.55;
const RAG_MAX_INJECT_CHUNKS = 4;
const RAG_MAX_CHUNK_PREVIEW = 600; // chars per chunk in injected context

/**
 * Build a <rag_context> block from the most recent user messages.
 * Returns an empty string if RAG is unavailable, index is empty, or no
 * results meet the score threshold — so it always fails silently.
 */
async function buildRagContext(messages: NewMessage[]): Promise<string> {
  try {
    // Use the last 2 non-empty user messages as the search query
    const queryText = messages
      .filter((m) => !m.is_from_me && m.content.trim())
      .slice(-2)
      .map((m) => m.content.trim())
      .join(' ');

    if (!queryText) return '';

    const results = await searchRag(queryText, RAG_MAX_INJECT_CHUNKS + 2);
    const relevant = results.filter((r) => r.score >= RAG_SCORE_THRESHOLD);
    if (relevant.length === 0) return '';

    const chunks = relevant
      .slice(0, RAG_MAX_INJECT_CHUNKS)
      .map((r) => {
        const preview = r.content.length > RAG_MAX_CHUNK_PREVIEW
          ? r.content.slice(0, RAG_MAX_CHUNK_PREVIEW) + '…'
          : r.content;
        return `[${r.source_path} | score: ${r.score.toFixed(2)}]\n${preview}`;
      })
      .join('\n\n');

    return `<rag_context>
The following code/docs were retrieved as relevant context for this message.
Use them to ground your answer — cite the source paths when referencing specific code.

${chunks}
</rag_context>\n\n`;
  } catch {
    // RAG unavailable (Ollama down, DB not ready, etc.) — degrade silently
    return '';
  }
}

let lastTimestamp = '';
let sessions: Record<string, string> = {};
let registeredGroups: Record<string, RegisteredGroup> = {};
let lastAgentTimestamp: Record<string, string> = {};
let messageLoopRunning = false;

let whatsapp: WhatsAppChannel;
const queue = new GroupQueue();

function loadState(): void {
  lastTimestamp = getRouterState('last_timestamp') || '';
  const agentTs = getRouterState('last_agent_timestamp');
  try {
    lastAgentTimestamp = agentTs ? JSON.parse(agentTs) : {};
  } catch {
    logger.warn('Corrupted last_agent_timestamp in DB, resetting');
    lastAgentTimestamp = {};
  }
  sessions = getAllSessions();
  registeredGroups = getAllRegisteredGroups();
  logger.info(
    { groupCount: Object.keys(registeredGroups).length },
    'State loaded',
  );
}

function saveState(): void {
  setRouterState('last_timestamp', lastTimestamp);
  setRouterState(
    'last_agent_timestamp',
    JSON.stringify(lastAgentTimestamp),
  );
}

function registerGroup(jid: string, group: RegisteredGroup): void {
  registeredGroups[jid] = group;
  setRegisteredGroup(jid, group);

  // Create group folder
  const groupDir = path.join(DATA_DIR, '..', 'groups', group.folder);
  fs.mkdirSync(path.join(groupDir, 'logs'), { recursive: true });

  logger.info(
    { jid, name: group.name, folder: group.folder },
    'Group registered',
  );
}

/**
 * Get available groups list for the agent.
 * Returns groups ordered by most recent activity.
 */
export function getAvailableGroups(): import('./container-runner.js').AvailableGroup[] {
  const chats = getAllChats();
  const registeredJids = new Set(Object.keys(registeredGroups));

  return chats
    .filter((c) => c.jid !== '__group_sync__' && c.jid.endsWith('@g.us'))
    .map((c) => ({
      jid: c.jid,
      name: c.name,
      lastActivity: c.last_message_time,
      isRegistered: registeredJids.has(c.jid),
    }));
}

/** @internal - exported for testing */
export function _setRegisteredGroups(groups: Record<string, RegisteredGroup>): void {
  registeredGroups = groups;
}

/**
 * Process all pending messages for a group.
 * Called by the GroupQueue when it's this group's turn.
 */
async function processGroupMessages(chatJid: string): Promise<boolean> {
  const group = registeredGroups[chatJid];
  if (!group) return true;

  const isMainGroup = group.folder === MAIN_GROUP_FOLDER;

  const sinceTimestamp = lastAgentTimestamp[chatJid] || '';
  const missedMessages = getMessagesSince(
    chatJid,
    sinceTimestamp,
    ASSISTANT_NAME,
  );

  if (missedMessages.length === 0) return true;

  // For non-main groups, check if trigger is required and present
  if (!isMainGroup && group.requiresTrigger !== false) {
    const hasTrigger = missedMessages.some((m) =>
      TRIGGER_PATTERN.test(m.content.trim()),
    );
    if (!hasTrigger) return true;
  }

  const prompt = formatMessages(missedMessages);

  // Automatically inject relevant codebase context so the agent always has
  // grounding without needing to call rag_search explicitly.
  const ragContext = await buildRagContext(missedMessages);
  const promptWithContext = ragContext ? ragContext + prompt : prompt;

  // Advance cursor so the piping path in startMessageLoop won't re-fetch
  // these messages. Save the old cursor so we can roll back on error.
  const previousCursor = lastAgentTimestamp[chatJid] || '';
  lastAgentTimestamp[chatJid] =
    missedMessages[missedMessages.length - 1].timestamp;
  saveState();

  logger.info(
    { group: group.name, messageCount: missedMessages.length },
    'Processing messages',
  );

  // Track idle timer for closing stdin when agent is idle
  let idleTimer: ReturnType<typeof setTimeout> | null = null;

  const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      logger.debug({ group: group.name }, 'Idle timeout, closing container stdin');
      queue.closeStdin(chatJid);
    }, IDLE_TIMEOUT);
  };

  await whatsapp.setTyping(chatJid, true);
  let hadError = false;
  let outputSentToUser = false;

  const output = await runAgent(group, promptWithContext, chatJid, async (result) => {
    // Streaming output callback — called for each agent result
    if (result.result) {
      const raw = typeof result.result === 'string' ? result.result : JSON.stringify(result.result);
      // Strip <internal>...</internal> blocks — agent uses these for internal reasoning
      const text = raw.replace(/<internal>[\s\S]*?<\/internal>/g, '').trim();
      logger.info({ group: group.name }, `Agent output: ${raw.slice(0, 200)}`);
      if (text) {
        await whatsapp.sendMessage(chatJid, `${ASSISTANT_NAME}: ${text}`);
        outputSentToUser = true;
      }
      // Only reset idle timer on actual results, not session-update markers (result: null)
      resetIdleTimer();
    }

    if (result.status === 'error') {
      hadError = true;
    }
  });

  await whatsapp.setTyping(chatJid, false);
  if (idleTimer) clearTimeout(idleTimer);

  if (output === 'error' || hadError) {
    // If we already sent output to the user, don't roll back the cursor —
    // the user got their response and re-processing would send duplicates.
    if (outputSentToUser) {
      logger.warn({ group: group.name }, 'Agent error after output was sent, skipping cursor rollback to prevent duplicates');
      return true;
    }
    // Roll back cursor so retries can re-process these messages
    lastAgentTimestamp[chatJid] = previousCursor;
    saveState();
    logger.warn({ group: group.name }, 'Agent error, rolled back message cursor for retry');
    return false;
  }

  return true;
}

async function runAgent(
  group: RegisteredGroup,
  prompt: string,
  chatJid: string,
  onOutput?: (output: ContainerOutput) => Promise<void>,
): Promise<'success' | 'error'> {
  const isMain = group.folder === MAIN_GROUP_FOLDER;
  const sessionId = sessions[group.folder];

  // Update tasks snapshot for container to read (filtered by group)
  const tasks = getAllTasks();
  writeTasksSnapshot(
    group.folder,
    isMain,
    tasks.map((t) => ({
      id: t.id,
      groupFolder: t.group_folder,
      prompt: t.prompt,
      schedule_type: t.schedule_type,
      schedule_value: t.schedule_value,
      status: t.status,
      next_run: t.next_run,
    })),
  );

  // Update available groups snapshot (main group only can see all groups)
  const availableGroups = getAvailableGroups();
  writeGroupsSnapshot(
    group.folder,
    isMain,
    availableGroups,
    new Set(Object.keys(registeredGroups)),
  );

  // Wrap onOutput to track session ID from streamed results
  const wrappedOnOutput = onOutput
    ? async (output: ContainerOutput) => {
        if (output.newSessionId) {
          sessions[group.folder] = output.newSessionId;
          setSession(group.folder, output.newSessionId);
        }
        await onOutput(output);
      }
    : undefined;

  try {
    const output = await runContainerAgent(
      group,
      {
        prompt,
        sessionId,
        groupFolder: group.folder,
        chatJid,
        isMain,
      },
      (proc, containerName) => queue.registerProcess(chatJid, proc, containerName, group.folder),
      wrappedOnOutput,
    );

    if (output.newSessionId) {
      sessions[group.folder] = output.newSessionId;
      setSession(group.folder, output.newSessionId);
    }

    if (output.status === 'error') {
      logger.error(
        { group: group.name, error: output.error },
        'Container agent error',
      );
      return 'error';
    }

    return 'success';
  } catch (err) {
    logger.error({ group: group.name, err }, 'Agent error');
    return 'error';
  }
}

async function startMessageLoop(): Promise<void> {
  if (messageLoopRunning) {
    logger.debug('Message loop already running, skipping duplicate start');
    return;
  }
  messageLoopRunning = true;

  logger.info(`NanoClaw running (trigger: @${ASSISTANT_NAME})`);

  while (true) {
    try {
      const jids = Object.keys(registeredGroups);
      const { messages, newTimestamp } = getNewMessages(
        jids,
        lastTimestamp,
        ASSISTANT_NAME,
      );

      if (messages.length > 0) {
        logger.info({ count: messages.length }, 'New messages');

        // Advance the "seen" cursor for all messages immediately
        lastTimestamp = newTimestamp;
        saveState();

        // Deduplicate by group
        const messagesByGroup = new Map<string, NewMessage[]>();
        for (const msg of messages) {
          const existing = messagesByGroup.get(msg.chat_jid);
          if (existing) {
            existing.push(msg);
          } else {
            messagesByGroup.set(msg.chat_jid, [msg]);
          }
        }

        for (const [chatJid, groupMessages] of messagesByGroup) {
          const group = registeredGroups[chatJid];
          if (!group) continue;

          const isMainGroup = group.folder === MAIN_GROUP_FOLDER;
          const needsTrigger = !isMainGroup && group.requiresTrigger !== false;

          // For non-main groups, only act on trigger messages.
          // Non-trigger messages accumulate in DB and get pulled as
          // context when a trigger eventually arrives.
          if (needsTrigger) {
            const hasTrigger = groupMessages.some((m) =>
              TRIGGER_PATTERN.test(m.content.trim()),
            );
            if (!hasTrigger) continue;
          }

          // Pull all messages since lastAgentTimestamp so non-trigger
          // context that accumulated between triggers is included.
          const allPending = getMessagesSince(
            chatJid,
            lastAgentTimestamp[chatJid] || '',
            ASSISTANT_NAME,
          );
          const messagesToSend =
            allPending.length > 0 ? allPending : groupMessages;
          const formatted = formatMessages(messagesToSend);

          if (queue.sendMessage(chatJid, formatted)) {
            logger.debug(
              { chatJid, count: messagesToSend.length },
              'Piped messages to active container',
            );
            lastAgentTimestamp[chatJid] =
              messagesToSend[messagesToSend.length - 1].timestamp;
            saveState();
          } else {
            // No active container — enqueue for a new one
            queue.enqueueMessageCheck(chatJid);
          }
        }
      }
    } catch (err) {
      logger.error({ err }, 'Error in message loop');
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }
}

/**
 * Startup recovery: check for unprocessed messages in registered groups.
 * Handles crash between advancing lastTimestamp and processing messages.
 */
function recoverPendingMessages(): void {
  for (const [chatJid, group] of Object.entries(registeredGroups)) {
    const sinceTimestamp = lastAgentTimestamp[chatJid] || '';
    const pending = getMessagesSince(chatJid, sinceTimestamp, ASSISTANT_NAME);
    if (pending.length > 0) {
      logger.info(
        { group: group.name, pendingCount: pending.length },
        'Recovery: found unprocessed messages',
      );
      queue.enqueueMessageCheck(chatJid);
    }
  }
}

function ensureContainerSystemRunning(): void {
  if (CONTAINER_RUNTIME === 'docker') {
    // Docker runtime: verify Docker is accessible (non-fatal check)
    try {
      execSync('docker info', { stdio: 'pipe', timeout: 5000 });
      logger.debug('Docker runtime available');
      
      // Clean up orphaned Docker containers from previous runs
      try {
        const output = execSync('docker ps -a --filter "name=nanoclaw-" --format "{{.Names}}"', {
          stdio: ['pipe', 'pipe', 'pipe'],
          encoding: 'utf-8',
        });
        const orphans = output.trim().split('\n').filter(Boolean);
        for (const name of orphans) {
          try {
            execSync(`docker rm -f ${name}`, { stdio: 'pipe' });
          } catch { /* already removed */ }
        }
        if (orphans.length > 0) {
          logger.info({ count: orphans.length, names: orphans }, 'Cleaned up orphaned Docker containers');
        }
      } catch (err) {
        logger.warn({ err }, 'Failed to clean up orphaned Docker containers');
      }
    } catch (err) {
      // If Docker is not accessible, just warn - it might work when we actually try to run a container
      logger.warn({ err }, 'Docker not accessible at startup (will retry when running containers)');
    }
  } else {
    // Apple Container runtime
    try {
      execSync('container system status', { stdio: 'pipe' });
      logger.debug('Apple Container system already running');
    } catch {
      logger.info('Starting Apple Container system...');
      try {
        execSync('container system start', { stdio: 'pipe', timeout: 30000 });
        logger.info('Apple Container system started');
      } catch (err) {
        logger.error({ err }, 'Failed to start Apple Container system');
        console.error(
          '\n╔════════════════════════════════════════════════════════════════╗',
        );
        console.error(
          '║  FATAL: Apple Container system failed to start                 ║',
        );
        console.error(
          '║                                                                ║',
        );
        console.error(
          '║  Agents cannot run without Apple Container. To fix:           ║',
        );
        console.error(
          '║  1. Install from: https://github.com/apple/container/releases ║',
        );
        console.error(
          '║  2. Run: container system start                               ║',
        );
        console.error(
          '║  3. Restart NanoClaw                                          ║',
        );
        console.error(
          '╚════════════════════════════════════════════════════════════════╝\n',
        );
        throw new Error('Apple Container system is required but failed to start');
      }
    }

    // Kill and clean up orphaned NanoClaw containers from previous runs
    try {
      const output = execSync('container ls --format json', {
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf-8',
      });
      const containers: { status: string; configuration: { id: string } }[] = JSON.parse(output || '[]');
      const orphans = containers
        .filter((c) => c.status === 'running' && c.configuration.id.startsWith('nanoclaw-'))
        .map((c) => c.configuration.id);
      for (const name of orphans) {
        try {
          execSync(`container stop ${name}`, { stdio: 'pipe' });
        } catch { /* already stopped */ }
      }
      if (orphans.length > 0) {
        logger.info({ count: orphans.length, names: orphans }, 'Stopped orphaned containers');
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to clean up orphaned containers');
    }
  }
}

// ---------------------------------------------------------------------------
// Initial RAG index: runs on startup, non-blocking
// ---------------------------------------------------------------------------

const RAG_GLOB_ROOTS: Array<{ dir: string; exts: string[] }> = [
  { dir: 'src', exts: ['.ts'] },
  { dir: 'container/agent-runner/src', exts: ['.ts'] },
  { dir: 'container/skills', exts: ['.md'] },
  { dir: 'groups', exts: ['.md'] },
  { dir: 'docs', exts: ['.md'] },
];

const SKIP_DIRS_SET = new Set(['node_modules', '.git', 'dist', 'auth-store', '__pycache__', 'Personal_AI_Infrastructure']);
const MAX_RAG_FILE_BYTES = 100 * 1024;

function* walkRagDir(root: string, exts: string[]): Generator<string> {
  if (!fs.existsSync(root)) return;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (SKIP_DIRS_SET.has(entry.name)) continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      yield* walkRagDir(full, exts);
    } else if (exts.some((e) => entry.name.endsWith(e))) {
      yield full;
    }
  }
}

async function runInitialRagIndex(): Promise<void> {
  const projectRoot = process.cwd();
  let total = 0;
  for (const { dir, exts } of RAG_GLOB_ROOTS) {
    const absDir = path.join(projectRoot, dir);
    for (const filePath of walkRagDir(absDir, exts)) {
      try {
        const stat = fs.statSync(filePath);
        if (stat.size > MAX_RAG_FILE_BYTES) continue;
        const content = fs.readFileSync(filePath, 'utf-8');
        const relPath = path.relative(projectRoot, filePath);
        await indexFile(relPath, content);
        total++;
      } catch {
        // skip unreadable files silently
      }
    }
  }
  logger.info({ files: total }, '[rag] initial index complete');
}

async function main(): Promise<void> {
  ensureContainerSystemRunning();
  
  // Initialize security features
  logger.info('Initializing security features...');
  
  // Setup Docker network isolation
  if (CONTAINER_RUNTIME === 'docker') {
    try {
      // Check if isolated network exists
      execSync('docker network inspect nanoclaw-isolated', { stdio: 'pipe' });
      logger.info('✓ Docker network isolation configured');
    } catch {
      logger.warn('⚠️  Docker isolated network not found. Run ./setup-network-isolation.sh');
    }
  }
  
  // Initialize Ollama TLS
  const ollamaTLSEnabled = globalOllamaTLS.isEnabled();
  if (ollamaTLSEnabled) {
    const valid = await globalOllamaTLS.verifyConfiguration();
    if (valid) {
      logger.info('✓ Ollama TLS encryption enabled');
    } else {
      logger.warn('⚠️  Ollama TLS configuration invalid, falling back to HTTP');
      globalOllamaTLS.disable();
    }
  } else {
    logger.info('ℹ️  Ollama TLS not enabled (traffic unencrypted)');
    logger.info('   Run: npm run setup-ollama-tls to enable');
  }
  
  // Initialize session encryption
  const authStorePath = path.join(process.cwd(), 'auth-store');
  const sessionEncryption = new SessionEncryption(authStorePath);
  
  // Check if auth store needs encryption
  if (fs.existsSync(authStorePath) && !sessionEncryption.isEncrypted()) {
    logger.info('Encrypting WhatsApp auth store...');
    await sessionEncryption.encryptAuthStore();
    logger.info('✓ Auth store encrypted');
  } else if (sessionEncryption.isEncrypted()) {
    logger.info('✓ Auth store is encrypted');
    // Decrypt for use (will be re-encrypted on shutdown)
    await sessionEncryption.decryptAuthStore();
  }
  
  // Initialize enhanced secret rotation
  const secretRotation = new EnhancedSecretRotation(authStorePath);
  
  // Periodic security check (every 5 minutes)
  setInterval(async () => {
    try {
      await secretRotation.checkAndRotate(MAIN_GROUP_FOLDER);
    } catch (err) {
      logger.error({ err }, 'Error during security check');
    }
  }, 5 * 60 * 1000);
  
  // Cleanup old audit logs
  try {
    SecurityAuditLogger.purgeOldLogs(30); // 30 days retention
    logger.info('Audit log cleanup completed');
  } catch (err) {
    logger.warn({ err }, 'Failed to cleanup old audit logs');
  }
  
  initDatabase();
  logger.info('Database initialized');
  loadState();

  // Graceful shutdown handlers
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received');
    
    // Re-encrypt auth store before shutdown
    if (fs.existsSync(authStorePath) && !sessionEncryption.isEncrypted()) {
      logger.info('Re-encrypting auth store...');
      await sessionEncryption.encryptAuthStore();
    }
    
    await queue.shutdown(10000);
    await whatsapp.disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Create WhatsApp channel
  whatsapp = new WhatsAppChannel({
    onMessage: (chatJid, msg) => storeMessage(msg),
    onChatMetadata: (chatJid, timestamp) => storeChatMetadata(chatJid, timestamp),
    registeredGroups: () => registeredGroups,
  });

  // Connect — resolves when first connected
  await whatsapp.connect();

  // Start subsystems (independently of connection handler)
  startSchedulerLoop({
    registeredGroups: () => registeredGroups,
    getSessions: () => sessions,
    queue,
    onProcess: (groupJid, proc, containerName, groupFolder) => queue.registerProcess(groupJid, proc, containerName, groupFolder),
    sendMessage: async (jid, rawText) => {
      const text = formatOutbound(whatsapp, rawText);
      if (text) await whatsapp.sendMessage(jid, text);
    },
  });
  startIpcWatcher({
    sendMessage: (jid, text) => whatsapp.sendMessage(jid, text),
    registeredGroups: () => registeredGroups,
    registerGroup,
    syncGroupMetadata: (force) => whatsapp.syncGroupMetadata(force),
    getAvailableGroups,
    writeGroupsSnapshot: (gf, im, ag, rj) => writeGroupsSnapshot(gf, im, ag, rj),
  });

  // Start RAG server and run initial codebase index in background
  await startRagServer();
  runInitialRagIndex().catch((err) =>
    logger.warn({ err }, '[rag] initial index failed — run npm run index-rag manually'),
  );

  queue.setProcessMessagesFn(processGroupMessages);
  recoverPendingMessages();
  startMessageLoop();
}

// Guard: only run when executed directly, not when imported by tests
const isDirectRun =
  process.argv[1] &&
  new URL(import.meta.url).pathname === new URL(`file://${process.argv[1]}`).pathname;

if (isDirectRun) {
  main().catch((err) => {
    logger.error({ err }, 'Failed to start NanoClaw');
    process.exit(1);
  });
}
