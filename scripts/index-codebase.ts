#!/usr/bin/env node
/**
 * Standalone RAG indexing script.
 * Usage: npx tsx scripts/index-codebase.ts
 *
 * Walks src/, container/, docs/, groups/ and HTTPs each file to the
 * running rag-server at RAG_SERVER_URL (default http://localhost:7700).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

const RAG_SERVER_URL =
  process.env.RAG_SERVER_URL ?? 'http://localhost:7700';

const ROOTS: Array<{ dir: string; exts: string[] }> = [
  { dir: 'src', exts: ['.ts'] },
  { dir: 'container/agent-runner/src', exts: ['.ts'] },
  { dir: 'container/skills', exts: ['.md'] },
  { dir: 'groups', exts: ['.md'] },
  { dir: 'docs', exts: ['.md'] },
];

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'auth-store', '__pycache__',
]);
const SKIP_PATH_FRAGMENTS = ['store/', 'data/sessions', '.claude'];
const MAX_BYTES = 100 * 1024;

function* walk(root: string, exts: string[]): Generator<string> {
  if (!fs.existsSync(root)) return;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full, exts);
    } else if (exts.some((e) => entry.name.endsWith(e))) {
      yield full;
    }
  }
}

async function postIndex(relPath: string, content: string): Promise<number> {
  const res = await fetch(`${RAG_SERVER_URL}/index`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: relPath, content }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { chunks: number };
  return json.chunks;
}

// Health check
async function waitForServer(retries = 5): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(`${RAG_SERVER_URL}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      if (r.ok) return;
    } catch {
      // not ready yet
    }
    console.log(`[index-rag] waiting for RAG server (attempt ${i + 1}/${retries})…`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`RAG server not available at ${RAG_SERVER_URL}`);
}

async function main(): Promise<void> {
  console.log(`[index-rag] RAG server: ${RAG_SERVER_URL}`);
  await waitForServer();

  let files = 0;
  let chunks = 0;
  let skipped = 0;

  for (const { dir, exts } of ROOTS) {
    const absDir = path.join(PROJECT_ROOT, dir);
    for (const filePath of walk(absDir, exts)) {
      const relPath = path.relative(PROJECT_ROOT, filePath);
      if (SKIP_PATH_FRAGMENTS.some((f) => relPath.replace(/\\/g, '/').includes(f))) {
        continue;
      }
      try {
        const stat = fs.statSync(filePath);
        if (stat.size > MAX_BYTES) { skipped++; continue; }
        const content = fs.readFileSync(filePath, 'utf-8');
        const n = await postIndex(relPath, content);
        files++;
        chunks += n;
        process.stdout.write(`  ✓ ${relPath} (${n} chunks)\n`);
      } catch (err) {
        console.warn(`  ✗ ${relPath}: ${err}`);
        skipped++;
      }
    }
  }

  console.log(`\n[index-rag] Done — ${files} files, ${chunks} chunks (${skipped} skipped)`);
}

main().catch((err) => {
  console.error('[index-rag] Fatal:', err);
  process.exit(1);
});
