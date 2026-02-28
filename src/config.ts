import path from 'path';

export const ASSISTANT_NAME = process.env.ASSISTANT_NAME || 'Andy';
export const POLL_INTERVAL = 2000;
export const SCHEDULER_POLL_INTERVAL = 60000;

// Absolute paths needed for container mounts
const PROJECT_ROOT = process.cwd();
const HOME_DIR = process.env.HOME || '/Users/user';

// Mount security: allowlist stored OUTSIDE project root, never mounted into containers
export const MOUNT_ALLOWLIST_PATH = path.join(
  HOME_DIR,
  '.config',
  'nanoclaw',
  'mount-allowlist.json',
);
export const STORE_DIR = path.resolve(PROJECT_ROOT, 'store');
export const GROUPS_DIR = path.resolve(PROJECT_ROOT, 'groups');
export const DATA_DIR = path.resolve(PROJECT_ROOT, 'data');
export const MAIN_GROUP_FOLDER = 'main';

// Container runtime: 'docker' or 'container' (Apple Container)
export const CONTAINER_RUNTIME = process.env.CONTAINER_RUNTIME || 'container';
export const AGENT_IMAGE = process.env.AGENT_IMAGE || process.env.CONTAINER_IMAGE || 'nanoclaw-agent:latest';
export const CONTAINER_IMAGE = AGENT_IMAGE;

// Ollama configuration
// OLLAMA_HOST: used by the host process (RAG server, indexer, etc.)
// Use 127.0.0.1 instead of localhost to avoid IPv6 (::1) resolution issues
export const OLLAMA_HOST = process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434';
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:14b';
// CONTAINER_OLLAMA_HOST: passed into agent containers where host resolves differently
export const CONTAINER_OLLAMA_HOST =
  process.env.CONTAINER_OLLAMA_HOST ?? 'http://host.docker.internal:11434';
export const CONTAINER_TIMEOUT = parseInt(
  process.env.CONTAINER_TIMEOUT || '1800000',
  10,
);
export const CONTAINER_MAX_OUTPUT_SIZE = parseInt(
  process.env.CONTAINER_MAX_OUTPUT_SIZE || '10485760',
  10,
); // 10MB default
export const IPC_POLL_INTERVAL = 1000;
export const IDLE_TIMEOUT = parseInt(
  process.env.IDLE_TIMEOUT || '1800000',
  10,
); // 30min default — how long to keep container alive after last result
export const MAX_CONCURRENT_CONTAINERS = Math.max(
  1,
  parseInt(process.env.MAX_CONCURRENT_CONTAINERS || '5', 10) || 5,
);

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const TRIGGER_PATTERN = new RegExp(
  `^@${escapeRegex(ASSISTANT_NAME)}\\b`,
  'i',
);

// Timezone for scheduled tasks (cron expressions, etc.)
// Uses system timezone by default
export const TIMEZONE =
  process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone;

// RAG (Retrieval-Augmented Generation) configuration
export const EMBED_MODEL = process.env.EMBED_MODEL ?? 'nomic-embed-text';
export const RAG_PORT = parseInt(process.env.RAG_PORT ?? '7700', 10);
export const RAG_SERVER_URL = process.env.RAG_SERVER_URL ?? `http://localhost:${RAG_PORT}`;
