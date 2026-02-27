#!/usr/bin/env node
/**
 * Standalone RAG indexing script.
 * Usage: npx tsx scripts/index-codebase.ts
 *
 * Starts the DB and RAG server internally, indexes the codebase, then exits.
 * Can also be pointed at an already-running server via RAG_SERVER_URL env var.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Bootstrap the host-side modules (same process, skips HTTP round-trip)
import { initDatabase } from '../src/db.js';
import { indexFile } from '../src/rag.js';

const ROOTS: Array<{ dir: string; exts: string[] }> = [
  { dir: 'src', exts: ['.ts'] },
  { dir: 'container/agent-runner/src', exts: ['.ts'] },
  { dir: 'container/skills', exts: ['.md'] },
  { dir: 'groups', exts: ['.md'] },
  { dir: 'docs', exts: ['.md'] },
];

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'auth-store', '__pycache__',
  'Personal_AI_Infrastructure', // unrelated external content in groups/cli/
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

async function main(): Promise<void> {
  // Initialize the database (creates store/messages.db if not present)
  initDatabase();
  console.log('[index-rag] Database ready');

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
        const n = await indexFile(relPath, content);
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
