/**
 * NanoClaw Ollama Agent Runner
 * Alternative agent runner that uses Ollama local models instead of Claude
 * Compatible with qwen2.5-coder and other coding-capable models
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ContainerInput {
  prompt: string;
  sessionId?: string;
  groupFolder: string;
  chatJid: string;
  isMain: boolean;
  isScheduledTask?: boolean;
}

interface ContainerOutput {
  status: 'success' | 'error';
  result: string | null;
  newSessionId?: string;
  error?: string;
}

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const OUTPUT_START_MARKER = '---NANOCLAW_OUTPUT_START---';
const OUTPUT_END_MARKER = '---NANOCLAW_OUTPUT_END---';
const IPC_INPUT_DIR = '/workspace/ipc/input';
const IPC_INPUT_CLOSE_SENTINEL = path.join(IPC_INPUT_DIR, '_close');
const SESSION_DIR = '/workspace/group/.sessions';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:14b';
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://host.docker.internal:11434';

function log(msg: string): void {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ${msg}`);
}

function writeOutput(output: ContainerOutput): void {
  log(`Writing output: status=${output.status}, hasResult=${!!output.result}`);
  console.log(OUTPUT_START_MARKER);
  console.log(JSON.stringify(output));
  console.log(OUTPUT_END_MARKER);
}

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

function loadSession(sessionId: string): Message[] {
  const sessionPath = path.join(SESSION_DIR, `${sessionId}.json`);
  if (!fs.existsSync(sessionPath)) {
    return [];
  }
  try {
    const data = fs.readFileSync(sessionPath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    log(`Failed to load session ${sessionId}: ${err}`);
    return [];
  }
}

function saveSession(sessionId: string, messages: Message[]): void {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
  const sessionPath = path.join(SESSION_DIR, `${sessionId}.json`);
  fs.writeFileSync(sessionPath, JSON.stringify(messages, null, 2));
}

function generateSessionId(): string {
  return `ollama-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

function buildSystemPrompt(containerInput: ContainerInput): string {
  let systemPrompt = `You are Andy, a helpful AI assistant running inside NanoClaw.

🚨 CRITICAL RULE: TAKE ACTION, DO NOT EXPLAIN

YOU MUST DO THE WORK. Never give instructions for the user to follow.

When user says "create X":
- ❌ WRONG: "Here's how to create X: First install... Then run..."
- ✅ CORRECT: Write the files immediately with complete working code

When user says "debug X":
- ❌ WRONG: "You should check... You can run..."
- ✅ CORRECT: Read the files, run commands, identify and fix the issue

When user says "test X":
- ❌ WRONG: "To test this, run..."
- ✅ CORRECT: Run the test commands and show results

IF YOU WRITE "you should", "you can", "try running", or "install" — YOU ARE DOING IT WRONG.

Current context:
- Working directory: /workspace/group
- Group: ${containerInput.groupFolder}
- Python 3 is installed (use python3 command)
- You have nano, vim, curl, git
- You can write files directly using shell: cat > file.py << 'EOF'

Your tools:
1. Write files: cat > filename.py << 'EOF'\\n[code]\\nEOF
2. Read files: cat filename.py
3. Run Python: python3 script.py
4. Test commands: python3 -m py_compile file.py (syntax check)
5. Any bash command

Guidelines:
- CREATE files immediately when asked
- TEST code after creating it
- FIX errors when tests fail
- Keep iterating until it works
- Only then tell user it's ready`;

  // Load group-specific CLAUDE.md memory
  const claudeMdPath = '/workspace/group/CLAUDE.md';
  if (fs.existsSync(claudeMdPath)) {
    const claudeMd = fs.readFileSync(claudeMdPath, 'utf-8');
    systemPrompt += `\n\nGroup Memory (CLAUDE.md):\n${claudeMd}`;
  }

  // Load global memory for ALL groups (not just non-main)
  const globalClaudeMdPath = '/workspace/global/CLAUDE.md';
  if (fs.existsSync(globalClaudeMdPath)) {
    const globalClaudeMd = fs.readFileSync(globalClaudeMdPath, 'utf-8');
    systemPrompt += `\n\nGlobal Memory:\n${globalClaudeMd}`;
  }

  return systemPrompt;
}

async function executeShellCommand(command: string): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: '/workspace/group',
      maxBuffer: 1024 * 1024 * 10, // 10MB
      timeout: 60000, // 60 seconds
    });
    return stdout + (stderr ? `\nstderr: ${stderr}` : '');
  } catch (err: any) {
    return `Error executing command: ${err.message}\nstdout: ${err.stdout || ''}\nstderr: ${err.stderr || ''}`;
  }
}

function extractShellCommands(text: string): string[] {
  const commands: string[] = [];
  
  // Match markdown code blocks with bash/sh/shell
  const codeBlockRegex = /```(?:bash|sh|shell)\n([\s\S]*?)```/g;
  let match;
  
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const commandBlock = match[1].trim();
    if (commandBlock) {
      commands.push(commandBlock);
    }
  }
  
  return commands;
}

async function callOllama(messages: Message[]): Promise<string> {
  const requestBody = {
    model: OLLAMA_MODEL,
    messages: messages,
    stream: false,
    options: {
      temperature: 0.7,
      num_ctx: 8192,
    }
  };

  try {
    const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.message?.content || '';
  } catch (err: any) {
    log(`Ollama API error: ${err.message}`);
    throw err;
  }
}

async function runQuery(
  prompt: string,
  sessionId: string | undefined,
  containerInput: ContainerInput,
): Promise<{ newSessionId: string; result: string }> {
  
  // Load or create session
  const actualSessionId = sessionId || generateSessionId();
  const messages: Message[] = loadSession(actualSessionId);
  
  // Add system prompt if starting new session
  if (messages.length === 0) {
    messages.push({
      role: 'system',
      content: buildSystemPrompt(containerInput),
    });
  }
  
  // Add user prompt
  messages.push({
    role: 'user',
    content: prompt,
  });

  log(`Calling Ollama with model ${OLLAMA_MODEL}...`);
  
  // Call Ollama
  let assistantResponse = await callOllama(messages);
  
  // Extract and execute shell commands if present
  const commands = extractShellCommands(assistantResponse);
  if (commands.length > 0) {
    log(`Found ${commands.length} shell command(s) to execute`);
    
    let commandResults = '';
    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      log(`Executing command ${i + 1}/${commands.length}: ${cmd.substring(0, 100)}...`);
      
      const result = await executeShellCommand(cmd);
      commandResults += `\n\n### Command ${i + 1} Output:\n\`\`\`\n${result}\n\`\`\``;
    }
    
    // If there were command executions, get a follow-up response
    if (commandResults) {
      messages.push({
        role: 'assistant',
        content: assistantResponse,
      });
      
      messages.push({
        role: 'user',
        content: `The commands were executed. Here are the results:${commandResults}\n\nPlease provide a summary or next steps based on these results.`,
      });
      
      assistantResponse = await callOllama(messages);
    }
  }
  
  // Save assistant response
  messages.push({
    role: 'assistant',
    content: assistantResponse,
  });
  
  // Save session
  saveSession(actualSessionId, messages);
  
  return {
    newSessionId: actualSessionId,
    result: assistantResponse,
  };
}

async function main(): Promise<void> {
  let containerInput: ContainerInput;

  try {
    const stdinText = await readStdin();
    containerInput = JSON.parse(stdinText);
    
    log(`Starting Ollama agent runner`);
    log(`Model: ${OLLAMA_MODEL}`);
    log(`Group: ${containerInput.groupFolder}`);
    log(`Is main: ${containerInput.isMain}`);
    log(`Has session: ${!!containerInput.sessionId}`);
    
  } catch (err) {
    log(`Failed to parse container input: ${err}`);
    writeOutput({
      status: 'error',
      result: null,
      error: `Invalid container input: ${err instanceof Error ? err.message : String(err)}`,
    });
    process.exit(1);
  }

  try {
    // Verify Ollama is accessible
    log(`Testing Ollama connection to ${OLLAMA_HOST}...`);
    const testResponse = await fetch(`${OLLAMA_HOST}/api/tags`);
    if (!testResponse.ok) {
      throw new Error(`Cannot connect to Ollama at ${OLLAMA_HOST}`);
    }
    log('Ollama connection successful');

    // Run the query
    const { newSessionId, result } = await runQuery(
      containerInput.prompt,
      containerInput.sessionId,
      containerInput,
    );

    writeOutput({
      status: 'success',
      result,
      newSessionId,
    });

  } catch (err) {
    log(`Error during agent execution: ${err}`);
    writeOutput({
      status: 'error',
      result: null,
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (err) => {
  log(`Unhandled rejection: ${err}`);
  writeOutput({
    status: 'error',
    result: null,
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});

main();
