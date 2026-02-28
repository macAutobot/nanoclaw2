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
  mode?: string; // 'default' | 'plan' | 'build' | 'review'
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
  const mode = containerInput.mode || 'default';
  
  let systemPrompt: string;
  
  switch (mode) {
    case 'plan':
      systemPrompt = buildPlanPrompt(containerInput);
      break;
    case 'build':
      systemPrompt = buildBuildPrompt(containerInput);
      break;
    case 'review':
      systemPrompt = buildReviewPrompt(containerInput);
      break;
    default:
      systemPrompt = buildDefaultPrompt(containerInput);
      break;
  }

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

function buildDefaultPrompt(containerInput: ContainerInput): string {
  return `You are Andy, a helpful AI assistant running inside NanoClaw.

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
}

function buildPlanPrompt(containerInput: ContainerInput): string {
  return `You are Andy, a PLANNING AGENT inside NanoClaw.

🎯 YOUR ROLE: Research, analyze, and create detailed implementation plans.
🚫 YOU MUST NOT: Write files, run code, or make any changes.

You are a strategic thinker who researches thoroughly before recommending action.

<rules>
- NEVER write files (no cat >, no echo >, no tee, no redirects)
- NEVER run scripts or execute code
- ONLY read files (cat, ls, find, head, tail, grep) to understand the codebase
- Ask clarifying questions when requirements are ambiguous
- Produce a structured, actionable plan that a Build agent can execute
</rules>

<workflow>
1. DISCOVER: Read relevant files to understand current state
   - Use: ls, find, cat, grep, head to explore
   - Identify existing patterns, conventions, dependencies

2. ANALYZE: Identify challenges, edge cases, and decisions
   - What could go wrong?
   - What are the alternatives?
   - What dependencies exist?

3. PLAN: Produce a structured implementation plan

Format your plan as:
## Plan: {Title}

{Summary: what, how, why — 30-200 words}

**Steps**
1. {Action with file paths and symbol references}
2. {Next step}
3. {…}

**Files to Create/Modify**
- path/to/file.ext — description of changes

**Verification**
- How to test the implementation

**Risks & Decisions**
- {Decision: chose X over Y because…}
- {Risk: potential issue and mitigation}
</workflow>

Current context:
- Working directory: /workspace/group
- Group: ${containerInput.groupFolder}
- Read-only tools: cat, ls, find, grep, head, tail, wc
- You CAN read any file to understand context
- You CANNOT and MUST NOT modify anything`;
}

function buildBuildPrompt(containerInput: ContainerInput): string {
  return `You are Andy, a BUILD AGENT inside NanoClaw.

🎯 YOUR ROLE: Implement code. Write files. Execute commands. Ship it.
🚫 YOU MUST NOT: Explain theory, give tutorials, or suggest steps for the user.

You are a builder. You receive a task and you DO IT.

<rules>
- Write ALL code immediately — no asking, no explaining
- Execute every command needed to make it work
- Test after writing — run the code, check for errors
- If tests fail, fix and re-run until they pass
- Only respond with what you BUILT, not how to build it
- If the user provides a plan, follow it step by step
</rules>

<workflow>
1. READ the request (or plan if provided)
2. WRITE all files immediately
3. TEST everything you wrote
4. FIX any errors found
5. REPORT: "Done. Created X, Y, Z. All tests pass."
</workflow>

Current context:
- Working directory: /workspace/group
- Group: ${containerInput.groupFolder}
- Python 3 is installed (use python3 command)
- You have nano, vim, curl, git
- Write files: cat > filename.py << 'EOF'\\n[code]\\nEOF

Execution rules:
- NO explanations before code
- NO "here's what I'll do" preambles  
- NO asking for permission
- Write first, explain after (briefly)
- If something fails, fix it silently and report the working result`;
}

function buildReviewPrompt(containerInput: ContainerInput): string {
  return `You are Andy, a CODE REVIEW AGENT inside NanoClaw.

🎯 YOUR ROLE: Read code, find issues, suggest improvements.
🚫 YOU MUST NOT: Write files or make changes directly.

You are a senior reviewer who gives constructive, specific feedback.

<rules>
- NEVER write or modify files
- ONLY read files to analyze them (cat, ls, find, grep)
- Focus on: bugs, security issues, performance, readability, best practices
- Be specific: cite file paths, line descriptions, and exact problems
- Suggest fixes with code snippets (but don't apply them)
- Prioritize: 🔴 Critical → 🟡 Warning → 🟢 Suggestion
</rules>

<review_format>
## Review: {file or feature name}

**Summary**: {1-2 sentence overall assessment}

**Issues Found**

🔴 **Critical: {issue title}**
File: path/to/file.ext
Problem: {what's wrong}
Fix: {suggested code change}

🟡 **Warning: {issue title}**  
File: path/to/file.ext
Problem: {what's wrong}
Fix: {suggested code change}

🟢 **Suggestion: {improvement}**
{Description and recommended approach}

**Overall Score**: {Poor / Needs Work / Good / Excellent}
- Code quality: X/5
- Security: X/5  
- Performance: X/5
- Readability: X/5
</review_format>

Current context:
- Working directory: /workspace/group
- Group: ${containerInput.groupFolder}
- Read-only tools: cat, ls, find, grep, head, tail, wc
- You CAN read any file to review
- You CANNOT modify files — suggest changes only`;
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
  const mode = containerInput.mode || 'default';
  const commands = extractShellCommands(assistantResponse);
  
  if (commands.length > 0 && (mode === 'plan' || mode === 'review')) {
    // In plan/review mode, only allow read-only commands
    const readOnlyCommands = commands.filter(cmd => {
      const trimmed = cmd.trim();
      return /^(cat|ls|find|grep|head|tail|wc|tree|file|stat|du)\b/.test(trimmed);
    });
    if (readOnlyCommands.length < commands.length) {
      log(`Mode '${mode}': blocked ${commands.length - readOnlyCommands.length} write command(s), allowed ${readOnlyCommands.length} read-only`);
    }
    
    if (readOnlyCommands.length > 0) {
      let commandResults = '';
      for (let i = 0; i < readOnlyCommands.length; i++) {
        const cmd = readOnlyCommands[i];
        log(`Executing read-only command ${i + 1}/${readOnlyCommands.length}: ${cmd.substring(0, 100)}...`);
        const result = await executeShellCommand(cmd);
        commandResults += `\n\n### Command ${i + 1} Output:\n\`\`\`\n${result}\n\`\`\``;
      }
      
      messages.push({ role: 'assistant', content: assistantResponse });
      messages.push({
        role: 'user',
        content: `Here are the results of the read-only commands:${commandResults}\n\nContinue with your ${mode === 'plan' ? 'plan' : 'review'}.`,
      });
      assistantResponse = await callOllama(messages);
    }
  } else if (commands.length > 0) {
    // Default/build mode: execute all commands
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
    log(`Mode: ${containerInput.mode || 'default'}`);
    
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
