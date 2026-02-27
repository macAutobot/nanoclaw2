#!/usr/bin/env node
/**
 * NanoClaw CLI - Command-line interface for direct agent interaction
 * Allows testing and using the agent without WhatsApp
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const CONTAINER_IMAGE = process.env.AGENT_IMAGE || 'nanoclaw-agent:latest';
const USE_OLLAMA = process.env.USE_OLLAMA === 'true';
const GROUPS_DIR = path.resolve(process.cwd(), 'groups');
const CLI_GROUP = 'cli';

// RAG server URL (host-side — not the container-internal address)
const RAG_HOST_URL = process.env.RAG_HOST_URL || 'http://localhost:7700';
const RAG_SCORE_THRESHOLD = 0.55;
const RAG_MAX_INJECT_CHUNKS = 4;
const RAG_MAX_CHUNK_PREVIEW = 600;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logInfo(message) {
  log(`ℹ ${message}`, colors.cyan);
}

function ensureCliGroup() {
  const cliGroupDir = path.join(GROUPS_DIR, CLI_GROUP);
  if (!fs.existsSync(cliGroupDir)) {
    fs.mkdirSync(cliGroupDir, { recursive: true });
    
    // Create a basic CLAUDE.md for CLI context
    const claudeMd = `# CLI Session\n\nYou are interacting via command-line interface.\nUser is running commands directly from their terminal.\n`;
    fs.writeFileSync(path.join(cliGroupDir, 'CLAUDE.md'), claudeMd);
  }
  return cliGroupDir;
}

function buildDockerArgs(cliGroupDir, sessionId) {
  const args = [
    'run',
    '--rm',
    '-i',
    '--name', `nanoclaw-cli-${Date.now()}`,
    '-v', `${cliGroupDir}:/workspace/group`,
    '--add-host', 'host.docker.internal:host-gateway',
  ];

  // Add session directory if exists
  const sessionDir = path.join(cliGroupDir, '.sessions');
  if (fs.existsSync(sessionDir)) {
    args.push('-v', `${sessionDir}:/workspace/group/.sessions`);
  }

  // Add environment for Ollama if needed
  if (USE_OLLAMA) {
    const ollamaHost = process.env.OLLAMA_HOST || 'http://host.docker.internal:11434';
    const ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5-coder:14b';
    args.push('-e', `OLLAMA_HOST=${ollamaHost}`);
    args.push('-e', `OLLAMA_MODEL=${ollamaModel}`);
  }

  // RAG server — always pass so rag_search / rag_index MCP tools work
  const ragServerUrl = process.env.RAG_SERVER_URL || 'http://host.docker.internal:7700';
  args.push('-e', `RAG_SERVER_URL=${ragServerUrl}`);

  args.push(CONTAINER_IMAGE);

  return args;
}

function createContainerInput(prompt, sessionId) {
  return JSON.stringify({
    prompt,
    sessionId,
    groupFolder: CLI_GROUP,
    chatJid: 'cli@local',
    isMain: true,
    isScheduledTask: false,
  });
}

/**
 * Build a <rag_context> block by querying the host RAG server.
 * Returns empty string if the server is unreachable or no results meet threshold.
 */
async function buildRagContext(query) {
  try {
    const res = await fetch(`${RAG_HOST_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit: RAG_MAX_INJECT_CHUNKS + 2 }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return '';
    const data = await res.json();
    const relevant = (data.results || []).filter(r => r.score >= RAG_SCORE_THRESHOLD);
    if (relevant.length === 0) return '';
    const chunks = relevant
      .slice(0, RAG_MAX_INJECT_CHUNKS)
      .map(r => {
        const preview = r.content.length > RAG_MAX_CHUNK_PREVIEW
          ? r.content.slice(0, RAG_MAX_CHUNK_PREVIEW) + '…'
          : r.content;
        return `[${r.source_path} | score: ${r.score.toFixed(2)}]\n${preview}`;
      })
      .join('\n\n');
    return `<rag_context>\nThe following code/docs were retrieved as relevant context for this message.\nUse them to ground your answer — cite the source paths when referencing specific code.\n\n${chunks}\n</rag_context>\n\n`;
  } catch {
    // RAG server not running — degrade silently
    return '';
  }
}

async function runQuery(prompt, sessionId) {
  const cliGroupDir = ensureCliGroup();
  const dockerArgs = buildDockerArgs(cliGroupDir, sessionId);

  // Inject RAG context — fails silently if server not running
  const ragContext = await buildRagContext(prompt);
  const promptWithContext = ragContext ? ragContext + prompt : prompt;
  if (ragContext) {
    log('  [RAG context injected]', colors.dim);
  }
  
  return new Promise((resolve, reject) => {
    const docker = spawn('docker', dockerArgs);
    
    let stdout = '';
    let stderr = '';
    let inOutput = false;
    let outputBuffer = '';

    docker.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;

      // Look for output markers
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.includes('---NANOCLAW_OUTPUT_START---')) {
          inOutput = true;
          outputBuffer = '';
          continue;
        }
        if (line.includes('---NANOCLAW_OUTPUT_END---')) {
          inOutput = false;
          try {
            const output = JSON.parse(outputBuffer);
            if (output.status === 'success' && output.result) {
              log('\n' + output.result, colors.reset);
              if (output.newSessionId && output.newSessionId !== sessionId) {
                resolve(output.newSessionId);
              }
            }
          } catch (e) {
            // Continue accumulating
          }
          outputBuffer = '';
          continue;
        }
        if (inOutput) {
          outputBuffer += line;
        }
      }
    });

    docker.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    docker.on('close', (code) => {
      if (code !== 0) {
        logError(`Container exited with code ${code}`);
        if (stderr) {
          console.error(colors.dim + stderr + colors.reset);
        }
        reject(new Error(`Container failed with code ${code}`));
      } else {
        resolve(sessionId);
      }
    });

    docker.on('error', (err) => {
      logError(`Failed to start container: ${err.message}`);
      reject(err);
    });

    // Send the input
    const input = createContainerInput(promptWithContext, sessionId);
    docker.stdin.write(input);
    docker.stdin.end();
  });
}

async function interactiveMode() {
  log('\n' + '='.repeat(60), colors.bright);
  log('  NanoClaw CLI - Interactive Mode', colors.bright + colors.green);
  log('='.repeat(60), colors.bright);
  log('');
  logInfo(`Agent Image: ${CONTAINER_IMAGE}`);
  logInfo(`Mode: ${USE_OLLAMA ? 'Ollama (Local)' : 'Claude Agent SDK'}`);
  if (USE_OLLAMA) {
    logInfo(`Model: ${process.env.OLLAMA_MODEL || 'qwen2.5-coder:14b'}`);
  }
  log('');
  log('Type your messages and press Enter. Type "exit" or "quit" to leave.', colors.dim);
  log('Type "new" to start a new session (clear context).', colors.dim);
  log('Type "help" for more commands.', colors.dim);
  log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: colors.green + '> ' + colors.reset,
  });

  let sessionId = undefined;
  let messageCount = 0;

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();

    if (!input) {
      rl.prompt();
      return;
    }

    // Handle commands
    if (input === 'exit' || input === 'quit') {
      log('\nGoodbye!', colors.cyan);
      rl.close();
      process.exit(0);
    }

    if (input === 'new') {
      sessionId = undefined;
      messageCount = 0;
      logSuccess('Started new session (context cleared)');
      rl.prompt();
      return;
    }

    if (input === 'help') {
      log('\nAvailable commands:', colors.bright);
      log('  exit, quit  - Exit the CLI', colors.dim);
      log('  new         - Start a new session (clear context)', colors.dim);
      log('  help        - Show this help message', colors.dim);
      log('  status      - Show session status', colors.dim);
      log('');
      rl.prompt();
      return;
    }

    if (input === 'status') {
      log('\nSession Status:', colors.bright);
      log(`  Session ID: ${sessionId || 'none (new session)'}`, colors.dim);
      log(`  Messages: ${messageCount}`, colors.dim);
      log(`  Group: ${CLI_GROUP}`, colors.dim);
      log('');
      rl.prompt();
      return;
    }

    // Run the query
    try {
      log('', colors.dim); // Blank line before response
      const newSessionId = await runQuery(input, sessionId);
      if (newSessionId) {
        sessionId = newSessionId;
      }
      messageCount++;
      log(''); // Blank line after response
    } catch (err) {
      logError(`Error: ${err.message}`);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    log('\nGoodbye!', colors.cyan);
    process.exit(0);
  });
}

async function singleQuery(prompt) {
  try {
    ensureCliGroup();
    await runQuery(prompt, undefined);
    process.exit(0);
  } catch (err) {
    logError(`Error: ${err.message}`);
    process.exit(1);
  }
}

// Main
const args = process.argv.slice(2);

if (args.length === 0) {
  // Interactive mode
  interactiveMode();
} else if (args[0] === '-h' || args[0] === '--help') {
  log('\nNanoClaw CLI - Command-line interface for the agent\n', colors.bright);
  log('Usage:', colors.bright);
  log('  nanoclaw-cli              Interactive mode', colors.dim);
  log('  nanoclaw-cli "prompt"     Single query', colors.dim);
  log('  nanoclaw-cli -h, --help   Show this help', colors.dim);
  log('');
  log('Examples:', colors.bright);
  log('  nanoclaw-cli', colors.dim);
  log('  nanoclaw-cli "list files in current directory"', colors.dim);
  log('  nanoclaw-cli "what is 2+2?"', colors.dim);
  log('');
  log('Environment Variables:', colors.bright);
  log('  AGENT_IMAGE     Docker image to use (default: nanoclaw-agent:latest)', colors.dim);
  log('  USE_OLLAMA      Set to "true" for Ollama mode', colors.dim);
  log('  OLLAMA_MODEL    Ollama model to use (default: qwen2.5-coder:14b)', colors.dim);
  log('  OLLAMA_HOST     Ollama API host (default: http://host.docker.internal:11434)', colors.dim);
  log('');
  process.exit(0);
} else {
  // Single query mode
  const prompt = args.join(' ');
  singleQuery(prompt);
}
