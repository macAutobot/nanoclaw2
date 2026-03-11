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
const CONTAINER_RUNTIME = process.env.CONTAINER_RUNTIME || 'container'; // 'docker' or 'container' (Apple Container)
const GROUPS_DIR = path.resolve(process.cwd(), 'groups');
const CLI_GROUP = 'cli';

// RAG server URL (host-side — not the container-internal address)
const RAG_HOST_URL = process.env.RAG_HOST_URL || 'http://localhost:7700';

// Agent modes
const MODES = {
  default: { label: 'Default', color: '\x1b[0m', description: 'Full agent — plans and builds' },
  plan:    { label: 'Plan',    color: '\x1b[35m', description: 'Research & plan only — no file changes' },
  build:   { label: 'Build',   color: '\x1b[32m', description: 'Implementation only — writes code' },
  review:  { label: 'Review',  color: '\x1b[33m', description: 'Code review — reads & critiques' },
};
let CURRENT_MODE = 'default';
const RAG_SCORE_THRESHOLD = 0.55;
const RAG_MAX_INJECT_CHUNKS = 4;
const RAG_MAX_CHUNK_PREVIEW = 600;

// Verbose mode - show agent's step-by-step progress
let VERBOSE_MODE = process.env.VERBOSE === 'true' || process.argv.includes('-v') || process.argv.includes('--verbose');

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

/**
 * Detect the default container-internal host address for reaching the macOS host.
 * Docker uses host.docker.internal; Apple Container VMs use the gateway 192.168.64.1.
 */
function containerHostAddress() {
  return CONTAINER_RUNTIME === 'docker' ? 'host.docker.internal' : '192.168.64.1';
}

function buildContainerArgs(cliGroupDir, sessionId) {
  const hostAddr = containerHostAddress();
  const isDocker = CONTAINER_RUNTIME === 'docker';
  const args = [
    'run',
    '--rm',
    '-i',
    '--name', `nanoclaw-cli-${Date.now()}`,
  ];

  // Docker-only flags
  if (isDocker) {
    args.push('--add-host', 'host.docker.internal:host-gateway');
  }

  // Volume mounts — Docker uses -v, Apple Container uses --mount for ro and -v for rw
  args.push('-v', `${cliGroupDir}:/workspace/group`);

  // Add session directory if exists
  const sessionDir = path.join(cliGroupDir, '.sessions');
  if (fs.existsSync(sessionDir)) {
    args.push('-v', `${sessionDir}:/workspace/group/.sessions`);
  }

  // Add environment for Ollama if needed
  if (USE_OLLAMA) {
    const ollamaHost = process.env.CONTAINER_OLLAMA_HOST || `http://${hostAddr}:11434`;
    const ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5-coder:14b';
    args.push('-e', `OLLAMA_HOST=${ollamaHost}`);
    args.push('-e', `OLLAMA_MODEL=${ollamaModel}`);
  }

  // RAG server — always pass so rag_search / rag_index MCP tools work
  const ragServerUrl = process.env.RAG_SERVER_URL || `http://${hostAddr}:7700`;
  args.push('-e', `RAG_SERVER_URL=${ragServerUrl}`);

  args.push(CONTAINER_IMAGE);

  return args;
}

function parseMode(input) {
  // Check for /mode prefix: /plan, /build, /review, /default
  const modeMatch = input.match(/^\/(?:plan|build|review|default)\b\s*/);
  if (modeMatch) {
    const mode = modeMatch[0].trim().slice(1); // remove /
    const rest = input.slice(modeMatch[0].length).trim();
    return { mode, prompt: rest || null };
  }
  return { mode: CURRENT_MODE, prompt: input };
}

function createContainerInput(prompt, sessionId, mode) {
  return JSON.stringify({
    prompt,
    sessionId,
    groupFolder: CLI_GROUP,
    chatJid: 'cli@local',
    isMain: true,
    isScheduledTask: false,
    mode: mode || CURRENT_MODE,
  });
}

/**
 * Build a <rag_context> block by querying the host RAG server.
 * Returns {context: string, stats: object} with RAG stats for display.
 */
async function buildRagContext(query) {
  try {
    const res = await fetch(`${RAG_HOST_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit: RAG_MAX_INJECT_CHUNKS + 2 }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { context: '', stats: null };
    const data = await res.json();
    const allResults = data.results || [];
    const relevant = allResults.filter(r => r.score >= RAG_SCORE_THRESHOLD);
    
    if (relevant.length === 0) {
      return { 
        context: '', 
        stats: { 
          searched: allResults.length, 
          matched: 0,
          included: 0,
          topScore: allResults.length > 0 ? allResults[0].score : 0
        } 
      };
    }
    
    const included = relevant.slice(0, RAG_MAX_INJECT_CHUNKS);
    const chunks = included
      .map(r => {
        const preview = r.content.length > RAG_MAX_CHUNK_PREVIEW
          ? r.content.slice(0, RAG_MAX_CHUNK_PREVIEW) + '…'
          : r.content;
        return `[${r.source_path} | score: ${r.score.toFixed(2)}]\n${preview}`;
      })
      .join('\n\n');
    
    const context = `<rag_context>\nThe following code/docs were retrieved as relevant context for this message.\nUse them to ground your answer — cite the source paths when referencing specific code.\n\n${chunks}\n</rag_context>\n\n`;
    
    return {
      context,
      stats: {
        searched: allResults.length,
        matched: relevant.length,
        included: included.length,
        topScore: included[0].score,
        sources: included.map(r => ({ path: r.source_path, score: r.score }))
      }
    };
  } catch {
    // RAG server not running — degrade silently
    return { context: '', stats: null };
  }
}

async function runQuery(prompt, sessionId, mode) {
  const startTime = Date.now();
  const activeMode = mode || CURRENT_MODE;
  const cliGroupDir = ensureCliGroup();
  const dockerArgs = buildContainerArgs(cliGroupDir, sessionId);
  
  // Show active mode if not default
  if (activeMode !== 'default') {
    const m = MODES[activeMode];
    log(`  🎯 Mode: ${m.label} — ${m.description}`, m.color);
  }

  // Inject RAG context — fails silently if server not running
  const ragStartTime = Date.now();
  const { context: ragContext, stats: ragStats } = await buildRagContext(prompt);
  const ragTime = Date.now() - ragStartTime;
  const promptWithContext = ragContext ? ragContext + prompt : prompt;
  
  // Display RAG routing information
  if (ragStats && ragStats.included > 0) {
    log('\n╭─ RAG Context ─────────────────────────────', colors.cyan);
    log(`│ Searched: ${ragStats.searched} sources`, colors.cyan);
    log(`│ Matched:  ${ragStats.matched} (threshold: ${(RAG_SCORE_THRESHOLD * 100).toFixed(0)}%)`, colors.cyan);
    log(`│ Injected: ${ragStats.included} chunks`, colors.cyan);
    log(`│ Top score: ${(ragStats.topScore * 100).toFixed(1)}%`, colors.cyan);
    log('│', colors.cyan);
    log('│ Sources included:', colors.cyan);
    ragStats.sources.forEach((s, i) => {
      const scorePercent = (s.score * 100).toFixed(1);
      const scoreMeter = '█'.repeat(Math.floor(s.score * 10)) + '░'.repeat(10 - Math.floor(s.score * 10));
      log(`│  ${i + 1}. [${scorePercent}%] ${scoreMeter} ${s.path}`, colors.cyan);
    });
    log('╰───────────────────────────────────────────', colors.cyan);
  } else if (ragStats && ragStats.matched === 0) {
    log(`  🔍 RAG: No relevant context found (searched ${ragStats.searched} sources, top score: ${(ragStats.topScore * 100).toFixed(1)}%)`, colors.dim);
  }
  
  return new Promise((resolve, reject) => {
    const agentStartTime = Date.now();
    const containerCmd = CONTAINER_RUNTIME === 'docker' ? 'docker' : 'container';
    const docker = spawn(containerCmd, dockerArgs);
    
    let stdout = '';
    let stderr = '';
    let inOutput = false;
    let outputBuffer = '';
    let firstOutputTime = null;
    let finalSessionId = sessionId; // Track session ID to resolve with

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
          if (!firstOutputTime) firstOutputTime = Date.now();
          try {
            const output = JSON.parse(outputBuffer);
            if (output.status === 'success' && output.result) {
              log('\n' + output.result, colors.reset);
              // Store session ID for later resolution in close handler
              if (output.newSessionId) {
                finalSessionId = output.newSessionId;
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
      const text = data.toString();
      stderr += text;
      
      // In verbose mode, show agent's step-by-step logs in real-time
      if (VERBOSE_MODE) {
        // Parse and format agent runner logs
        const lines = text.split('\n').filter(line => line.trim());
        for (let line of lines) {
          // Remove timestamps: [2024-01-28T12:34:56.789Z] or [12:34:56] or similar
          line = line.replace(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z?\]\s*/, '');
          line = line.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '');
          line = line.replace(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+/, '');
          
          if (line.includes('[agent-runner]') || line.includes('[ollama]')) {
            log('  ' + line, colors.dim);
          } else if (line.includes('Executing command') || line.includes('command')) {
            log('  🔧 ' + line, colors.yellow);
          } else if (line.includes('Calling Ollama')) {
            log('  🤖 ' + line, colors.cyan);
          } else if (line.includes('msg #')) {
            log('  📝 ' + line, colors.blue);
          } else if (line.includes('tool_use') || line.includes('Tool:')) {
            log('  🔨 ' + line, colors.green);
          } else if (line.trim()) {
            log('  ' + line, colors.dim);
          }
        }
      }
    });

    docker.on('close', (code) => {
      // Calculate timing metrics
      const totalTime = Date.now() - startTime;
      const agentTime = Date.now() - agentStartTime;
      const outputTime = firstOutputTime ? (Date.now() - firstOutputTime) : 0;
      
      // Display timing breakdown
      log('\n╭─ Timing ──────────────────────────────────', colors.dim);
      log(`│ RAG Retrieval:  ${ragTime}ms`, colors.dim);
      log(`│ Agent Process:  ${agentTime}ms`, colors.dim);
      log(`│ Output Format:  ${outputTime}ms`, colors.dim);
      log(`│ Total Time:     ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`, colors.dim);
      log('╰───────────────────────────────────────────', colors.dim);
      
      if (code !== 0) {
        logError(`Container exited with code ${code}`);
        if (stderr) {
          console.error(colors.dim + stderr + colors.reset);
        }
        reject(new Error(`Container failed with code ${code}`));
      } else {
        resolve(finalSessionId);
      }
    });

    docker.on('error', (err) => {
      logError(`Failed to start container: ${err.message}`);
      reject(err);
    });

    // Send the input
    const input = createContainerInput(promptWithContext, sessionId, activeMode);
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
  logInfo(`Runtime: ${CONTAINER_RUNTIME}`);
  logInfo(`Mode: ${USE_OLLAMA ? 'Ollama (Local)' : 'Claude Agent SDK'}`);
  if (USE_OLLAMA) {
    logInfo(`Model: ${process.env.OLLAMA_MODEL || 'qwen2.5-coder:14b'}`);
  }
  logInfo(`Verbose: ${VERBOSE_MODE ? 'ON (showing step-by-step)' : 'OFF'}`);
  logInfo(`Mode: ${MODES[CURRENT_MODE].label} (use /plan, /build, /review, or /default)`);
  log('');
  log('Type your messages and press Enter. Type "exit" or "quit" to leave.', colors.dim);
  log('Type "new" to start a new session (clear context).', colors.dim);
  log('Type "help" for more commands.', colors.dim);
  log('Prefix with /plan, /build, or /review for one-shot mode switching.', colors.dim);
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
      log('  verbose     - Toggle verbose mode (show step-by-step)', colors.dim);
      log('  status      - Show session status', colors.dim);
      log('  help        - Show this help message', colors.dim);
      log('');
      log('Agent Modes:', colors.bright);
      log('  /default    - Full agent: plans and builds (default)', colors.dim);
      log('  /plan       - Research & plan only, no file changes', colors.dim);
      log('  /build      - Implementation only, writes code', colors.dim);
      log('  /review     - Code review, reads & critiques', colors.dim);
      log('');
      log('  Use as prefix for one-shot: /plan create a platformer', colors.dim);
      log('  Use alone to switch sticky mode: /plan', colors.dim);
      log('');
      rl.prompt();
      return;
    }

    if (input === 'verbose') {
      VERBOSE_MODE = !VERBOSE_MODE;
      logSuccess(`Verbose mode ${VERBOSE_MODE ? 'enabled' : 'disabled'}`);
      if (VERBOSE_MODE) {
        log('  You will now see step-by-step progress while the agent works', colors.dim);
      }
      rl.prompt();
      return;
    }

    if (input === 'status') {
      log('\nSession Status:', colors.bright);
      log(`  Session ID: ${sessionId || 'none (new session)'}`, colors.dim);
      log(`  Messages: ${messageCount}`, colors.dim);
      log(`  Group: ${CLI_GROUP}`, colors.dim);
      log(`  Mode: ${MODES[CURRENT_MODE].label}`, MODES[CURRENT_MODE].color);
      log('');
      rl.prompt();
      return;
    }

    // Parse mode prefix (/plan, /build, /review, /default)
    const { mode: parsedMode, prompt: parsedPrompt } = parseMode(input);
    
    // If mode prefix with no prompt, switch sticky mode
    if (parsedMode !== CURRENT_MODE && !parsedPrompt) {
      CURRENT_MODE = parsedMode;
      const m = MODES[CURRENT_MODE];
      logSuccess(`Switched to ${m.label} mode — ${m.description}`);
      rl.prompt();
      return;
    }
    if (parsedMode === CURRENT_MODE && !parsedPrompt && input.startsWith('/')) {
      // Already in this mode
      log(`  Already in ${MODES[CURRENT_MODE].label} mode`, colors.dim);
      rl.prompt();
      return;
    }

    // Run the query with mode
    const queryMode = parsedMode;
    const queryPrompt = parsedPrompt || input;
    
    try {
      log('', colors.dim); // Blank line before response
      const newSessionId = await runQuery(queryPrompt, sessionId, queryMode);
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

async function replMode() {
  log(`${colors.dim}NanoClaw REPL  (type "exit" to quit, "help" for commands)${colors.reset}`);
  ensureCliGroup();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${colors.green}>>> ${colors.reset}`,
  });

  let sessionId = undefined;
  let messageCount = 0;

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) { rl.prompt(); return; }

    if (input === 'exit' || input === 'quit') {
      process.exit(0);
    }
    if (input === 'new') {
      sessionId = undefined;
      messageCount = 0;
      log('Session cleared.', colors.dim);
      rl.prompt();
      return;
    }
    if (input === 'help') {
      log('  exit / quit   Leave the REPL', colors.dim);
      log('  new           Clear session context', colors.dim);
      log('  verbose       Toggle verbose output', colors.dim);
      log('  status        Session info', colors.dim);
      log('  /plan /build /review /default   Switch agent mode', colors.dim);
      rl.prompt();
      return;
    }
    if (input === 'verbose') {
      VERBOSE_MODE = !VERBOSE_MODE;
      log(`Verbose ${VERBOSE_MODE ? 'ON' : 'OFF'}`, colors.dim);
      rl.prompt();
      return;
    }
    if (input === 'status') {
      log(`  session: ${sessionId || '(none)'}  msgs: ${messageCount}  mode: ${MODES[CURRENT_MODE].label}`, colors.dim);
      rl.prompt();
      return;
    }

    const { mode: parsedMode, prompt: parsedPrompt } = parseMode(input);
    if (parsedMode !== CURRENT_MODE && !parsedPrompt) {
      CURRENT_MODE = parsedMode;
      log(`→ ${MODES[CURRENT_MODE].label}`, MODES[CURRENT_MODE].color);
      rl.prompt();
      return;
    }

    try {
      const newSessionId = await runQuery(parsedPrompt || input, sessionId, parsedMode);
      if (newSessionId) sessionId = newSessionId;
      messageCount++;
    } catch (err) {
      logError(err.message);
    }
    rl.prompt();
  });

  rl.on('close', () => process.exit(0));
}

async function singleQuery(prompt) {
  try {
    ensureCliGroup();
    const { mode, prompt: parsedPrompt } = parseMode(prompt);
    await runQuery(parsedPrompt || prompt, undefined, mode);
    process.exit(0);
  } catch (err) {
    logError(`Error: ${err.message}`);
    process.exit(1);
  }
}

// Main
const args = process.argv.slice(2);

const HAS_REPL = args.includes('--repl');
const filteredArgs = args.filter(a => a !== '-v' && a !== '--verbose' && a !== '--repl');

if (args[0] === '-h' || args[0] === '--help') {
  log('\nNanoClaw CLI - Command-line interface for the agent\n', colors.bright);
  log('Usage:', colors.bright);
  log('  nanoclaw-cli                 Interactive mode', colors.dim);
  log('  nanoclaw-cli --repl          REPL mode (minimal, fast iteration)', colors.dim);
  log('  nanoclaw-cli "prompt"        Single query', colors.dim);
  log('  nanoclaw-cli -v "prompt"     Single query (verbose)', colors.dim);
  log('  nanoclaw-cli -h, --help      Show this help', colors.dim);
  log('');
  log('Options:', colors.bright);
  log('  -v, --verbose   Show step-by-step progress (tool uses, thinking, etc.)', colors.dim);
  log('  --repl          REPL mode — minimal prompt, fast back-and-forth', colors.dim);
  log('');
  log('Examples:', colors.bright);
  log('  nanoclaw-cli', colors.dim);
  log('  nanoclaw-cli --repl', colors.dim);
  log('  nanoclaw-cli -v', colors.dim);
  log('  nanoclaw-cli "list files in current directory"', colors.dim);
  log('  nanoclaw-cli -v "create a snake game"', colors.dim);
  log('');
  log('Environment Variables:', colors.bright);
  log('  AGENT_IMAGE     Docker image to use (default: nanoclaw-agent:latest)', colors.dim);
  log('  USE_OLLAMA      Set to "true" for Ollama mode', colors.dim);
  log('  OLLAMA_MODEL    Ollama model to use (default: qwen2.5-coder:14b)', colors.dim);
  log('  CONTAINER_RUNTIME  Container runtime: docker or container (default: container)', colors.dim);
  log('  OLLAMA_HOST     Ollama API host on macOS (default: http://localhost:11434)', colors.dim);
  log('  CONTAINER_OLLAMA_HOST  Ollama host inside container (auto-detected from runtime)', colors.dim);
  log('  VERBOSE         Set to "true" to always show verbose output', colors.dim);
  log('');
  process.exit(0);
} else if (HAS_REPL) {
  replMode();
} else if (filteredArgs.length === 0) {
  // Interactive mode
  interactiveMode();
} else {
  // Single query mode
  const prompt = filteredArgs.join(' ');
  singleQuery(prompt);
}
