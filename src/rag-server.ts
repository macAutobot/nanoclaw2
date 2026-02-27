/**
 * RAG HTTP server — runs on the host at RAG_PORT (default 7700).
 * Agents inside containers reach it via host.docker.internal:7700.
 *
 * Routes:
 *   GET  /health     → { ok, indexed }
 *   POST /search     → { results: RagResult[] }
 *   POST /index      → { ok, chunks }
 *   POST /index-dir  → { ok, files }
 */

import http from 'http';
import fs from 'fs';
import path from 'path';

import { RAG_PORT } from './config.js';
import { getIndexedSources, initDatabase } from './db.js';
import { indexFile, searchRag } from './rag.js';
import { logger } from './logger.js';

// ---------------------------------------------------------------------------
// Tiny HTTP helpers
// ---------------------------------------------------------------------------

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function send(
  res: http.ServerResponse,
  status: number,
  body: unknown,
): void {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json),
  });
  res.end(json);
}

// ---------------------------------------------------------------------------
// Directory walker for /index-dir
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'auth-store',
  '.claude',
]);
const SKIP_PATH_SEGMENTS = ['store/', 'data/sessions'];
const MAX_FILE_SIZE = 100 * 1024; // 100 KB

function* walkDir(root: string): Generator<string> {
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      yield* walkDir(full);
    } else {
      yield full;
    }
  }
}

function shouldSkipPath(filePath: string): boolean {
  const normalised = filePath.replace(/\\/g, '/');
  return SKIP_PATH_SEGMENTS.some((seg) => normalised.includes(seg));
}

function isTextFile(filePath: string): boolean {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  return ['ts', 'js', 'mts', 'mjs', 'tsx', 'jsx', 'md', 'json', 'sh', 'txt'].includes(ext);
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

async function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  const { method, url } = req;

  // Health check
  if (method === 'GET' && url === '/health') {
    const sources = getIndexedSources();
    send(res, 200, { ok: true, indexed: sources.length });
    return;
  }

  // All other routes expect POST + JSON body
  if (method !== 'POST') {
    send(res, 405, { error: 'Method not allowed' });
    return;
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    send(res, 400, { error: 'Invalid JSON' });
    return;
  }

  // POST /search
  if (url === '/search') {
    const query = body.query as string | undefined;
    if (!query || typeof query !== 'string') {
      send(res, 400, { error: 'query is required' });
      return;
    }
    const limit = typeof body.limit === 'number' ? body.limit : 6;
    try {
      const results = await searchRag(query, limit);
      send(res, 200, { results });
    } catch (err) {
      logger.error({ err }, '[rag-server] /search error');
      send(res, 500, { error: String(err) });
    }
    return;
  }

  // POST /index  — single file
  if (url === '/index') {
    const filePath = body.path as string | undefined;
    const content = body.content as string | undefined;
    if (!filePath || typeof filePath !== 'string') {
      send(res, 400, { error: 'path is required' });
      return;
    }
    if (typeof content !== 'string') {
      send(res, 400, { error: 'content is required' });
      return;
    }
    try {
      const chunks = await indexFile(filePath, content);
      send(res, 200, { ok: true, chunks });
    } catch (err) {
      logger.error({ err, filePath }, '[rag-server] /index error');
      send(res, 500, { error: String(err) });
    }
    return;
  }

  // POST /index-dir  — walk a directory and index all text files
  if (url === '/index-dir') {
    const dir = body.dir as string | undefined;
    if (!dir || typeof dir !== 'string') {
      send(res, 400, { error: 'dir is required' });
      return;
    }
    if (!fs.existsSync(dir)) {
      send(res, 404, { error: `Directory not found: ${dir}` });
      return;
    }
    let files = 0;
    try {
      for (const filePath of walkDir(dir)) {
        if (shouldSkipPath(filePath)) continue;
        if (!isTextFile(filePath)) continue;
        const stat = fs.statSync(filePath);
        if (stat.size > MAX_FILE_SIZE) continue;
        const content = fs.readFileSync(filePath, 'utf-8');
        const relPath = path.relative(process.cwd(), filePath);
        await indexFile(relPath, content);
        files++;
      }
      send(res, 200, { ok: true, files });
    } catch (err) {
      logger.error({ err, dir }, '[rag-server] /index-dir error');
      send(res, 500, { error: String(err) });
    }
    return;
  }

  send(res, 404, { error: 'Not found' });
}

// ---------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------

let server: http.Server | null = null;

export function startRagServer(): Promise<void> {
  // Ensure DB is ready (safe to call multiple times — no-ops if already done)
  initDatabase();

  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      handleRequest(req, res).catch((err) => {
        logger.error({ err }, '[rag-server] unhandled error');
        if (!res.headersSent) send(res, 500, { error: 'Internal error' });
      });
    });

    server.listen(RAG_PORT, '0.0.0.0', () => {
      logger.info({ port: RAG_PORT }, '[rag-server] listening');
      resolve();
    });

    server.on('error', reject);
  });
}

export function stopRagServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!server) return resolve();
    server.close(() => resolve());
  });
}

// ---------------------------------------------------------------------------
// Direct-run entry point: node --import tsx/esm src/rag-server.ts
// ---------------------------------------------------------------------------

const isDirectRun =
  process.argv[1] &&
  new URL(import.meta.url).pathname === new URL(`file://${process.argv[1]}`).pathname;

if (isDirectRun) {
  startRagServer().catch((err) => {
    logger.error({ err }, '[rag-server] failed to start');
    process.exit(1);
  });
}
