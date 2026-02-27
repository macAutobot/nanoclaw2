/**
 * RAG (Retrieval-Augmented Generation) core module.
 * Handles text chunking, embedding via Ollama, and cosine-similarity search
 * over the rag_documents table in messages.db.
 */

import {
  deleteChunksBySource,
  getAllVectors,
  upsertRagChunk,
} from './db.js';
import { EMBED_MODEL, OLLAMA_HOST } from './config.js';
import { logger } from './logger.js';

// ---------------------------------------------------------------------------
// Cosine similarity
// ---------------------------------------------------------------------------

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

// ---------------------------------------------------------------------------
// Chunking
// ---------------------------------------------------------------------------

const MAX_CHUNK_CHARS = 1600; // ~400 tokens
const MAX_CHUNK_LINES = 60;

/**
 * Split a file's content into overlapping text chunks.
 * Strategy differs by extension:
 *   .ts/.js/.mts/.mjs → also split on top-level export/function/class boundaries
 *   .md                → also split on ## headings
 *   other              → blank-line or line-window split only
 */
export function chunkText(content: string, sourcePath: string): string[] {
  const ext = sourcePath.split('.').pop() ?? '';
  const lines = content.split('\n');
  const chunks: string[] = [];
  let buffer: string[] = [];

  function flushBuffer(): void {
    const text = buffer.join('\n').trim();
    if (text.length > 0) {
      chunks.push(text);
    }
    buffer = [];
  }

  const isCode = ['ts', 'js', 'mts', 'mjs', 'tsx', 'jsx'].includes(ext);
  const isMd = ext === 'md';

  const topLevelBoundary = /^(export |export default |async function |function |class |const [A-Z])/;
  const mdHeading = /^## /;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isBlankLine = line.trim() === '';

    // Natural boundary: flush buffered content first
    if (isCode && buffer.length > 0 && topLevelBoundary.test(line)) {
      flushBuffer();
    } else if (isMd && buffer.length > 0 && mdHeading.test(line)) {
      flushBuffer();
    } else if (isBlankLine && buffer.length > 0) {
      // Blank line between sections
      const currentText = buffer.join('\n');
      if (
        buffer.length >= MAX_CHUNK_LINES ||
        currentText.length >= MAX_CHUNK_CHARS
      ) {
        flushBuffer();
      } else {
        buffer.push(line);
      }
      continue;
    }

    buffer.push(line);

    // Hard limits
    const currentText = buffer.join('\n');
    if (
      buffer.length >= MAX_CHUNK_LINES ||
      currentText.length >= MAX_CHUNK_CHARS
    ) {
      flushBuffer();
    }
  }

  flushBuffer();

  return chunks.filter((c) => c.trim().length > 0);
}

// ---------------------------------------------------------------------------
// Embedding via Ollama
// ---------------------------------------------------------------------------

const EMBED_BATCH_SIZE = 20;

/**
 * Embed a batch of texts using Ollama's /api/embed endpoint.
 * Returns one Float32Array per input text.
 */
async function embedBatch(texts: string[]): Promise<Float32Array[]> {
  const url = `${OLLAMA_HOST}/api/embed`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Ollama embed failed ${response.status}: ${body}`);
  }

  const data = (await response.json()) as { embeddings: number[][] };

  return data.embeddings.map((vec) => Float32Array.from(vec));
}

/**
 * Embed a single text string. Convenience wrapper around embedBatch.
 */
export async function embedText(text: string): Promise<Float32Array> {
  const [vec] = await embedBatch([text]);
  return vec;
}

// ---------------------------------------------------------------------------
// Indexing
// ---------------------------------------------------------------------------

/**
 * Index a file: chunk it, embed chunks in batches, upsert into rag_documents.
 * Re-indexing a file replaces all of its previous chunks.
 */
export async function indexFile(
  sourcePath: string,
  content: string,
): Promise<number> {
  const chunks = chunkText(content, sourcePath);
  if (chunks.length === 0) return 0;

  // Remove stale chunks first
  deleteChunksBySource(sourcePath);

  // Embed in batches
  for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
    const batchTexts = chunks.slice(i, i + EMBED_BATCH_SIZE);
    let embeddings: Float32Array[];
    try {
      embeddings = await embedBatch(batchTexts);
    } catch (err) {
      logger.error({ err, sourcePath }, '[rag] embed batch failed, skipping file');
      return 0;
    }

    for (let j = 0; j < batchTexts.length; j++) {
      upsertRagChunk(sourcePath, i + j, batchTexts[j], embeddings[j]);
    }
  }

  logger.debug({ sourcePath, chunks: chunks.length }, '[rag] indexed');
  return chunks.length;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export interface RagResult {
  source_path: string;
  content: string;
  score: number;
}

/**
 * Semantic search over the rag_documents table.
 * Embeds the query, loads all vectors, returns top-k by cosine similarity.
 */
export async function searchRag(
  query: string,
  limit = 6,
): Promise<RagResult[]> {
  const qVec = await embedText(query);
  const rows = getAllVectors();

  if (rows.length === 0) return [];

  const scored = rows.map((row) => ({
    source_path: row.source_path,
    content: row.content,
    score: cosineSimilarity(qVec, row.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
