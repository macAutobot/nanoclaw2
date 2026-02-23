# NanoClaw Debugging and Development Guide

## Table of Contents
- [Container Debugging](#container-debugging)
- [Security Implications](#security-implications)
- [Upgrade Modifications](#upgrade-modifications)
- [RAG Integration](#rag-integration)
- [Tools System](#tools-system)
- [Task Management](#task-management)
- [Test Planning](#test-planning)
- [Development TODOs](#development-todos)

---

## Container Debugging

### Apple Container Runtime (Recommended for macOS)

Apple Container is the recommended container runtime for macOS as it avoids Docker socket security restrictions.

#### Prerequisites
```bash
# Install Apple Container (if not already installed)
brew install container

# Verify installation
container --version

# Start container system
container system start
```

#### Building the Agent Image
```bash
cd ~/nanoclaw

# Build the Ollama agent image with Apple Container
container build \
  -t nanoclaw-agent-ollama:latest \
  -f container/Dockerfile.ollama \
  .
```

#### Running NanoClaw with Debug Logging
```bash
# Set environment variables and start
export $(cat .env | grep -v '^#' | xargs)
export LOG_LEVEL=debug
npm start
```

#### Debugging Container Execution

**View Container Logs:**
```bash
# Most recent container log
ls -lt groups/main/logs/container-*.log | head -1 | awk '{print $NF}' | xargs cat

# All recent logs
tail -100 groups/main/logs/container-*.log
```

**Check Container Status:**
```bash
# List running containers
container ps

# View container system status
container system status
```

**Manual Container Test:**
```bash
# Create test input
echo '{"prompt":"test message","groupFolder":"main","chatJid":"test@s.whatsapp.net","isMain":true}' > /tmp/test-input.json

# Run container manually
cat /tmp/test-input.json | container run -i --rm \
  -e OLLAMA_HOST=http://192.168.1.143:11434 \
  -e OLLAMA_MODEL=qwen2.5-coder:14b \
  -v $(pwd)/groups/main:/workspace/group \
  nanoclaw-agent-ollama:latest
```

### Docker Runtime (Alternative)

**⚠️ Warning:** Docker on macOS has security restrictions when mounting `/var/run/docker.sock`, causing exit code 137.

#### Docker Debugging (Limited)
```bash
# Build with Docker
docker build -t nanoclaw-agent-ollama:latest -f container/Dockerfile.ollama .

# Run without socket mounting (read-only operations only)
docker run --rm -i \
  -e OLLAMA_HOST=http://host.docker.internal:11434 \
  -e OLLAMA_MODEL=qwen2.5-coder:14b \
  -v $(pwd)/groups/main:/workspace/group \
  nanoclaw-agent-ollama:latest
```

---

## Security Implications

### Current Security Model

#### Container Isolation
- **Volume Mounts:** Each group gets isolated directories
  - Project root: Read-only access to codebase
  - Group workspace: Read-write access to group-specific data
  - Session data: Isolated per-group Claude sessions
  - IPC directory: Per-group process communication
  - Environment: Filtered to only expose `CLAUDE_CODE_OAUTH_TOKEN` and `ANTHROPIC_API_KEY`

#### Mount Security
```typescript
// Location: src/container-runner.ts
// External mount allowlist stored OUTSIDE project root
export const MOUNT_ALLOWLIST_PATH = path.join(
  HOME_DIR,
  '.config',
  'nanoclaw',
  'mount-allowlist.json',
);
```

### Critical Security Issues to Address

#### 1. **Environment Variable Leakage**
**Risk:** `.env` file contains sensitive credentials that could be exposed in container logs.

**Current State:**
```typescript
// Only CLAUDE_CODE_OAUTH_TOKEN and ANTHROPIC_API_KEY are filtered
const allowedVars = ['CLAUDE_CODE_OAUTH_TOKEN', 'ANTHROPIC_API_KEY'];
```

**Recommended Fix:**
- Move all sensitive credentials to system keychain
- Use environment-specific `.env.local` files (gitignored)
- Implement secret rotation mechanism

#### 2. **Container Escape via IPC**
**Risk:** Malicious code in containers could exploit IPC mechanisms to escape isolation.

**Mitigation:**
- Validate all IPC message schemas
- Rate-limit IPC operations
- Audit IPC message handlers for injection vulnerabilities

#### 3. **Network Access Controls**
**Risk:** Containers have unrestricted network access to host services.

**Current State:**
```typescript
// Containers can access any host service via IP
OLLAMA_HOST=http://192.168.1.143:11434
```

**Recommended Fix:**
```bash
# Implement network policies (if using Docker)
docker network create --driver bridge --internal nanoclaw-isolated

# For Apple Container, use firewall rules
# /etc/pf.conf or macOS Application Firewall
```

#### 4. **WhatsApp Credential Storage**
**Risk:** WhatsApp authentication stored in plaintext files.

**Location:** `store/auth/creds.json` contains sensitive session data

**Recommended Fix:**
- Encrypt credentials at rest using system keychain API
- Implement credential rotation on suspicious activity
- Add 2FA for WhatsApp authentication refresh

#### 5. **Code Execution in Containers**
**Risk:** Agent containers have shell access and can execute arbitrary commands.

**Current State:**
```typescript
// ollama-runner.ts allows shell commands
// No sandboxing or command allowlisting
```

**Recommended Fix:**
- Implement command allowlist/blocklist
- Use seccomp profiles to restrict syscalls
- Add command audit logging
- Implement rate limiting on shell executions

### Security Checklist

- [ ] Encrypt sensitive credentials at rest
- [ ] Implement network segmentation
- [ ] Add rate limiting on container spawning
- [ ] Implement command audit logging
- [ ] Add intrusion detection for suspicious patterns
- [ ] Rotate WhatsApp session tokens periodically
- [ ] Implement container resource limits (CPU, memory, disk I/O)
- [ ] Add container runtime security monitoring
- [ ] Implement message validation and sanitization
- [ ] Add authentication for IPC endpoints

---

## Upgrade Modifications

### 1. Multi-Model Support

**Goal:** Support multiple LLM backends beyond Ollama.

**Implementation:**
```typescript
// src/config.ts
export const LLM_BACKEND = process.env.LLM_BACKEND || 'ollama'; // 'ollama' | 'openai' | 'anthropic' | 'local'

// src/llm-provider.ts (new file)
interface LLMProvider {
  generate(prompt: string, options: GenerateOptions): Promise<string>;
  stream(prompt: string, options: GenerateOptions): AsyncGenerator<string>;
}

class OllamaProvider implements LLMProvider { /* ... */ }
class OpenAIProvider implements LLMProvider { /* ... */ }
class AnthropicProvider implements LLMProvider { /* ... */ }
```

### 2. Multi-Runtime Support Enhancement

**Goal:** Better abstraction over container runtimes.

**Implementation:**
```typescript
// src/runtime-adapter.ts (new file)
interface ContainerRuntime {
  build(dockerfile: string, tag: string): Promise<void>;
  run(image: string, args: RunArgs): Promise<ContainerProcess>;
  stop(containerId: string): Promise<void>;
  logs(containerId: string): Promise<string>;
}

class AppleContainerAdapter implements ContainerRuntime { /* ... */ }
class DockerAdapter implements ContainerRuntime { /* ... */ }
class PodmanAdapter implements ContainerRuntime { /* ... */ }
```

### 3. Horizontal Scaling

**Goal:** Run multiple NanoClaw instances for high availability.

**Components:**
- Shared message queue (Redis/RabbitMQ)
- Distributed lock for message processing
- Load balancer for container agents
- Shared session store

**Architecture:**
```
┌─────────────┐     ┌─────────────┐
│ NanoClaw #1 │────▶│   Redis     │
└─────────────┘     │  Message    │
                    │   Queue     │
┌─────────────┐     │             │
│ NanoClaw #2 │────▶│             │
└─────────────┘     └─────────────┘
                          │
                          ▼
                    ┌─────────────┐
                    │  Postgres   │
                    │  Sessions   │
                    └─────────────┘
```

### 4. Web Dashboard

**Goal:** Monitor and control NanoClaw via web interface.

**Features:**
- Real-time message processing status
- Container execution logs viewer
- Group management UI
- Agent performance metrics
- Manual message retry/replay
- Configuration editor

**Tech Stack:**
- Backend: Express.js with WebSocket
- Frontend: React + TailwindCSS
- Database: SQLite or PostgreSQL

---

## RAG Integration

### Overview
Retrieval Augmented Generation (RAG) would allow agents to access and reason over large knowledge bases, documentation, and historical conversations.

### Architecture

```
┌──────────────────┐
│ WhatsApp Message │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Query Router    │
├──────────────────┤
│ Detect if RAG    │
│ context needed   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│  Vector Search   │────▶│  Vector Store    │
├──────────────────┤     │  (chromadb/     │
│ Embed query      │     │   qdrant)        │
│ Find top-k docs  │     └──────────────────┘
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Context Builder │
├──────────────────┤
│ Combine:         │
│ - Retrieved docs │
│ - Message history│
│ - System prompt  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ LLM Generation   │
└──────────────────┘
```

### Implementation Plan

#### 1. **Vector Database Setup**

**Option A: ChromaDB (Lightweight)**
```bash
npm install chromadb

# Run ChromaDB server
docker run -d -p 8000:8000 chromadb/chroma
```

**Option B: Qdrant (Production)**
```bash
docker run -d -p 6333:6333 qdrant/qdrant
```

#### 2. **Document Ingestion Pipeline**

```typescript
// src/rag/document-processor.ts
interface Document {
  id: string;
  content: string;
  metadata: {
    source: string;
    timestamp: number;
    groupFolder: string;
  };
}

class DocumentProcessor {
  async ingest(filePath: string, chunkSize: number = 1000): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8');
    const chunks = this.chunkText(content, chunkSize);
    
    for (const chunk of chunks) {
      const embedding = await this.embed(chunk);
      await this.vectorStore.upsert({
        id: generateId(),
        vector: embedding,
        metadata: { source: filePath, chunk }
      });
    }
  }
  
  private chunkText(text: string, size: number): string[] {
    // Smart chunking with overlap
    const chunks: string[] = [];
    const sentences = text.split(/[.!?]\s+/);
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > size) {
        chunks.push(currentChunk);
        currentChunk = sentence;
      } else {
        currentChunk += ' ' + sentence;
      }
    }
    
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
  }
  
  private async embed(text: string): Promise<number[]> {
    // Use Ollama for embeddings
    const response = await fetch(`${OLLAMA_HOST}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text', // or 'mxbai-embed-large'
        prompt: text
      })
    });
    
    const data = await response.json();
    return data.embedding;
  }
}
```

#### 3. **RAG Query Handler**

```typescript
// src/rag/retriever.ts
interface RetrievalResult {
  content: string;
  score: number;
  metadata: Record<string, any>;
}

class RAGRetriever {
  async retrieve(query: string, topK: number = 5): Promise<RetrievalResult[]> {
    const queryEmbedding = await this.embed(query);
    
    const results = await this.vectorStore.query({
      vector: queryEmbedding,
      topK,
      filter: {
        groupFolder: this.groupFolder // Isolate per-group
      }
    });
    
    return results.map(r => ({
      content: r.metadata.chunk,
      score: r.score,
      metadata: r.metadata
    }));
  }
  
  async augmentPrompt(originalPrompt: string, context: RetrievalResult[]): string {
    const contextBlock = context
      .map(c => `[Source: ${c.metadata.source}]\n${c.content}`)
      .join('\n\n---\n\n');
    
    return `Context from knowledge base:\n\n${contextBlock}\n\n---\n\nUser query: ${originalPrompt}`;
  }
}
```

#### 4. **Integration with Agent Runner**

```typescript
// container/agent-runner/src/index-ollama.ts
async function processPromptWithRAG(input: ContainerInput): Promise<string> {
  const retriever = new RAGRetriever(vectorStore, input.groupFolder);
  
  // Only use RAG for complex queries
  const useRAG = await shouldUseRAG(input.prompt);
  
  if (useRAG) {
    const context = await retriever.retrieve(input.prompt);
    const augmentedPrompt = await retriever.augmentPrompt(input.prompt, context);
    return await generateResponse(augmentedPrompt);
  } else {
    return await generateResponse(input.prompt);
  }
}

function shouldUseRAG(prompt: string): boolean {
  // Heuristics: use RAG for questions, lookups, complex queries
  const ragKeywords = ['how', 'what', 'where', 'when', 'explain', 'find', 'search'];
  return ragKeywords.some(kw => prompt.toLowerCase().includes(kw));
}
```

#### 5. **Auto-Indexing Conversations**

```typescript
// src/rag/conversation-indexer.ts
class ConversationIndexer {
  async indexMessage(message: WAMessage, groupFolder: string): Promise<void> {
    const content = message.message?.conversation || 
                   message.message?.extendedTextMessage?.text || '';
    
    if (content.length < 50) return; // Skip short messages
    
    const embedding = await this.embed(content);
    await this.vectorStore.upsert({
      id: message.key.id,
      vector: embedding,
      metadata: {
        source: 'whatsapp',
        groupFolder,
        timestamp: message.messageTimestamp,
        sender: message.key.participant || message.key.remoteJid
      }
    });
  }
}
```

### RAG Configuration

```typescript
// src/config.ts
export const RAG_ENABLED = process.env.RAG_ENABLED === 'true';
export const RAG_VECTOR_STORE = process.env.RAG_VECTOR_STORE || 'chromadb'; // 'chromadb' | 'qdrant'
export const RAG_EMBEDDING_MODEL = process.env.RAG_EMBEDDING_MODEL || 'nomic-embed-text';
export const RAG_TOP_K = parseInt(process.env.RAG_TOP_K || '5', 10);
export const RAG_CHUNK_SIZE = parseInt(process.env.RAG_CHUNK_SIZE || '1000', 10);
export const RAG_CHUNK_OVERLAP = parseInt(process.env.RAG_CHUNK_OVERLAP || '200', 10);
```

---

## Tools System

### Overview
A tools system allows agents to invoke external functions/APIs to gather information or take actions beyond text generation.

### Tool Definition Schema

```typescript
// src/tools/types.ts
interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ParameterSchema>;
    required: string[];
  };
  handler: (args: Record<string, any>) => Promise<ToolResult>;
}

interface ParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
}

interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}
```

### Built-in Tools

#### 1. **File Operations Tool**

```typescript
// src/tools/file-operations.ts
export const fileOperationsTool: ToolDefinition = {
  name: 'file_operations',
  description: 'Read, write, list files in the group workspace',
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        description: 'Operation to perform',
        enum: ['read', 'write', 'list', 'delete']
      },
      path: {
        type: 'string',
        description: 'File path relative to workspace'
      },
      content: {
        type: 'string',
        description: 'Content to write (for write operation)'
      }
    },
    required: ['operation', 'path']
  },
  handler: async (args) => {
    const workspacePath = '/workspace/group';
    const fullPath = path.join(workspacePath, args.path);
    
    // Security: prevent path traversal
    if (!fullPath.startsWith(workspacePath)) {
      return { success: false, error: 'Access denied: path outside workspace' };
    }
    
    switch (args.operation) {
      case 'read':
        const content = await fs.readFile(fullPath, 'utf-8');
        return { success: true, data: content };
      
      case 'write':
        await fs.writeFile(fullPath, args.content, 'utf-8');
        return { success: true };
      
      case 'list':
        const files = await fs.readdir(fullPath);
        return { success: true, data: files };
      
      case 'delete':
        await fs.unlink(fullPath);
        return { success: true };
      
      default:
        return { success: false, error: 'Unknown operation' };
    }
  }
};
```

#### 2. **Web Search Tool**

```typescript
// src/tools/web-search.ts
export const webSearchTool: ToolDefinition = {
  name: 'web_search',
  description: 'Search the web using DuckDuckGo or Google',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query'
      },
      numResults: {
        type: 'number',
        description: 'Number of results to return (default: 5)'
      }
    },
    required: ['query']
  },
  handler: async (args) => {
    const numResults = args.numResults || 5;
    
    // Use DuckDuckGo API (no API key needed)
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(args.query)}&format=json`
    );
    
    const data = await response.json();
    const results = data.RelatedTopics
      .slice(0, numResults)
      .map((topic: any) => ({
        title: topic.Text,
        url: topic.FirstURL
      }));
    
    return { success: true, data: results };
  }
};
```

#### 3. **Shell Command Tool**

```typescript
// src/tools/shell.ts
export const shellTool: ToolDefinition = {
  name: 'shell',
  description: 'Execute shell commands in the container',
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'Shell command to execute'
      }
    },
    required: ['command']
  },
  handler: async (args) => {
    const allowedCommands = ['ls', 'cat', 'grep', 'find', 'head', 'tail', 'wc'];
    const commandBase = args.command.split(' ')[0];
    
    // Security: allowlist commands
    if (!allowedCommands.includes(commandBase)) {
      return { success: false, error: `Command '${commandBase}' not allowed` };
    }
    
    try {
      const { stdout, stderr } = await execAsync(args.command, {
        cwd: '/workspace/group',
        timeout: 5000
      });
      
      return { success: true, data: { stdout, stderr } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
};
```

#### 4. **HTTP Request Tool**

```typescript
// src/tools/http.ts
export const httpTool: ToolDefinition = {
  name: 'http_request',
  description: 'Make HTTP requests to external APIs',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to request'
      },
      method: {
        type: 'string',
        description: 'HTTP method',
        enum: ['GET', 'POST', 'PUT', 'DELETE']
      },
      headers: {
        type: 'object',
        description: 'Request headers'
      },
      body: {
        type: 'string',
        description: 'Request body (JSON string)'
      }
    },
    required: ['url', 'method']
  },
  handler: async (args) => {
    const options: RequestInit = {
      method: args.method,
      headers: args.headers || {},
    };
    
    if (args.body) {
      options.body = args.body;
    }
    
    try {
      const response = await fetch(args.url, options);
      const data = await response.text();
      
      return {
        success: true,
        data: {
          status: response.status,
          headers: Object.fromEntries(response.headers),
          body: data
        }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
};
```

### Tool Registry

```typescript
// src/tools/registry.ts
class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  
  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }
  
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }
  
  listAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }
  
  getSystemPrompt(): string {
    const toolDescriptions = this.listAll().map(tool => {
      const params = JSON.stringify(tool.parameters, null, 2);
      return `Tool: ${tool.name}\nDescription: ${tool.description}\nParameters: ${params}`;
    }).join('\n\n');
    
    return `You have access to the following tools:\n\n${toolDescriptions}\n\nTo use a tool, respond with JSON:\n{"tool": "tool_name", "arguments": {...}}`;
  }
}

export const toolRegistry = new ToolRegistry();
toolRegistry.register(fileOperationsTool);
toolRegistry.register(webSearchTool);
toolRegistry.register(shellTool);
toolRegistry.register(httpTool);
```

### Tool Execution in Agent

```typescript
// container/agent-runner/src/tool-executor.ts
async function executeToolIfNeeded(response: string): Promise<string> {
  try {
    const toolCall = JSON.parse(response);
    
    if (toolCall.tool) {
      const tool = toolRegistry.get(toolCall.tool);
      if (!tool) {
        return `Error: Unknown tool '${toolCall.tool}'`;
      }
      
      const result = await tool.handler(toolCall.arguments);
      
      if (result.success) {
        return JSON.stringify(result.data);
      } else {
        return `Error: ${result.error}`;
      }
    }
  } catch {
    // Not a tool call, return as-is
  }
  
  return response;
}
```

---

## Task Management

### Overview
A task system allows users to schedule recurring tasks, reminders, and automated workflows.

### Task Schema

```typescript
// src/tasks/types.ts
interface Task {
  id: string;
  name: string;
  groupFolder: string;
  schedule: CronExpression | Interval;
  prompt: string;
  enabled: boolean;
  lastRun?: number;
  nextRun?: number;
  metadata?: Record<string, any>;
}

type CronExpression = string; // e.g., '0 9 * * *' for 9 AM daily
type Interval = { hours?: number; minutes?: number; seconds?: number };
```

### Task Database Schema

```sql
-- store/messages.db
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  group_folder TEXT NOT NULL,
  schedule TEXT NOT NULL,
  prompt TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  last_run INTEGER,
  next_run INTEGER,
  metadata TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_tasks_next_run ON tasks(next_run, enabled);
CREATE INDEX idx_tasks_group ON tasks(group_folder);
```

### Task Examples

#### 1. **Daily Summary Task**

```typescript
const dailySummaryTask: Task = {
  id: 'daily-summary-main',
  name: 'Daily Summary',
  groupFolder: 'main',
  schedule: '0 18 * * *', // 6 PM daily
  prompt: 'Summarize today\'s conversations and highlight any important action items.',
  enabled: true
};
```

#### 2. **Reminder Task**

```typescript
const reminderTask: Task = {
  id: 'standup-reminder',
  name: 'Standup Reminder',
  groupFolder: 'main',
  schedule: '0 9 * * 1-5', // 9 AM on weekdays
  prompt: 'Remind the team about standup meeting in 15 minutes.',
  enabled: true
};
```

#### 3. **Monitoring Task**

```typescript
const monitoringTask: Task = {
  id: 'monitor-ollama',
  name: 'Monitor Ollama Service',
  groupFolder: 'main',
  schedule: { minutes: 5 }, // Every 5 minutes
  prompt: 'Check if Ollama service is responding. If not, notify admin.',
  enabled: true,
  metadata: {
    alertThreshold: 3 // Alert after 3 consecutive failures
  }
};
```

### Task Scheduler Implementation

```typescript
// src/tasks/scheduler.ts
import cron from 'node-cron';
import { Database } from 'better-sqlite3';

class TaskScheduler {
  private db: Database;
  private runningTasks: Map<string, cron.ScheduledTask> = new Map();
  
  constructor(db: Database) {
    this.db = db;
  }
  
  async start(): Promise<void> {
    const tasks = this.db.prepare(
      'SELECT * FROM tasks WHERE enabled = 1'
    ).all() as Task[];
    
    for (const task of tasks) {
      this.scheduleTask(task);
    }
    
    logger.info({ count: tasks.length }, 'Task scheduler started');
  }
  
  private scheduleTask(task: Task): void {
    if (typeof task.schedule === 'string') {
      // Cron expression
      const cronTask = cron.schedule(task.schedule, async () => {
        await this.executeTask(task);
      });
      
      this.runningTasks.set(task.id, cronTask);
    } else {
      // Interval
      const intervalMs = 
        (task.schedule.hours || 0) * 3600000 +
        (task.schedule.minutes || 0) * 60000 +
        (task.schedule.seconds || 0) * 1000;
      
      const intervalId = setInterval(async () => {
        await this.executeTask(task);
      }, intervalMs);
      
      this.runningTasks.set(task.id, { stop: () => clearInterval(intervalId) } as any);
    }
    
    logger.info({ taskId: task.id, name: task.name }, 'Task scheduled');
  }
  
  private async executeTask(task: Task): Promise<void> {
    logger.info({ taskId: task.id, name: task.name }, 'Executing scheduled task');
    
    const now = Date.now();
    
    try {
      // Get registered group
      const group = await getRegisteredGroup(task.groupFolder);
      if (!group) {
        logger.error({ taskId: task.id }, 'Group not found for task');
        return;
      }
      
      // Create container input for scheduled task
      const input: ContainerInput = {
        prompt: task.prompt,
        groupFolder: task.groupFolder,
        chatJid: group.jid,
        isMain: group.name === 'main',
        isScheduledTask: true
      };
      
      // Run container agent
      const output = await runContainerAgent(
        group,
        input,
        (proc, name) => {
          logger.debug({ taskId: task.id, container: name }, 'Task container spawned');
        },
        async (result) => {
          if (result.status === 'success' && result.result) {
            // Send result to WhatsApp
            await sendMessage(group.jid, result.result);
          }
        }
      );
      
      // Update last run time
      this.db.prepare(
        'UPDATE tasks SET last_run = ?, updated_at = ? WHERE id = ?'
      ).run(now, now, task.id);
      
      logger.info({ taskId: task.id, status: output.status }, 'Task executed');
      
    } catch (error) {
      logger.error({ taskId: task.id, error }, 'Task execution failed');
    }
  }
  
  stop(): void {
    for (const [taskId, task] of this.runningTasks) {
      task.stop();
    }
    this.runningTasks.clear();
    logger.info('Task scheduler stopped');
  }
}
```

### Task Management API

```typescript
// src/tasks/manager.ts
class TaskManager {
  private db: Database;
  
  createTask(task: Omit<Task, 'id'>): Task {
    const id = `task-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const fullTask: Task = { ...task, id };
    
    this.db.prepare(`
      INSERT INTO tasks (id, name, group_folder, schedule, prompt, enabled, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      fullTask.id,
      fullTask.name,
      fullTask.groupFolder,
      JSON.stringify(fullTask.schedule),
      fullTask.prompt,
      fullTask.enabled ? 1 : 0,
      JSON.stringify(fullTask.metadata || {})
    );
    
    return fullTask;
  }
  
  updateTask(id: string, updates: Partial<Task>): void {
    const sets: string[] = [];
    const params: any[] = [];
    
    if (updates.name !== undefined) {
      sets.push('name = ?');
      params.push(updates.name);
    }
    if (updates.schedule !== undefined) {
      sets.push('schedule = ?');
      params.push(JSON.stringify(updates.schedule));
    }
    if (updates.prompt !== undefined) {
      sets.push('prompt = ?');
      params.push(updates.prompt);
    }
    if (updates.enabled !== undefined) {
      sets.push('enabled = ?');
      params.push(updates.enabled ? 1 : 0);
    }
    
    sets.push('updated_at = ?');
    params.push(Date.now());
    params.push(id);
    
    this.db.prepare(`
      UPDATE tasks SET ${sets.join(', ')} WHERE id = ?
    `).run(...params);
  }
  
  deleteTask(id: string): void {
    this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  }
  
  listTasks(groupFolder?: string): Task[] {
    if (groupFolder) {
      return this.db.prepare(
        'SELECT * FROM tasks WHERE group_folder = ? ORDER BY created_at DESC'
      ).all(groupFolder) as Task[];
    } else {
      return this.db.prepare(
        'SELECT * FROM tasks ORDER BY created_at DESC'
      ).all() as Task[];
    }
  }
}
```

---

## Test Planning

### Test Structure

```
tests/
├── unit/
│   ├── config.test.ts
│   ├── container-runner.test.ts
│   ├── message-processor.test.ts
│   └── task-scheduler.test.ts
├── integration/
│   ├── whatsapp-connection.test.ts
│   ├── container-execution.test.ts
│   ├── ollama-integration.test.ts
│   └── database-operations.test.ts
├── e2e/
│   ├── message-flow.test.ts
│   ├── scheduled-tasks.test.ts
│   └── multi-group.test.ts
└── fixtures/
    ├── messages.json
    ├── test-groups.json
    └── test-env.json
```

### Test Framework Setup

```bash
npm install --save-dev \
  jest \
  @types/jest \
  ts-jest \
  supertest \
  @testing-library/react \
  msw
```

```json
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

### Unit Tests

#### 1. **Config Tests**

```typescript
// tests/unit/config.test.ts
import { CONTAINER_RUNTIME, OLLAMA_HOST, AGENT_IMAGE } from '../../src/config';

describe('Configuration', () => {
  beforeEach(() => {
    // Reset environment
    delete process.env.CONTAINER_RUNTIME;
    delete process.env.OLLAMA_HOST;
  });
  
  test('should use default container runtime', () => {
    expect(CONTAINER_RUNTIME).toBe('container');
  });
  
  test('should override from environment', () => {
    process.env.CONTAINER_RUNTIME = 'docker';
    // Re-import to get new value
    jest.resetModules();
    const { CONTAINER_RUNTIME } = require('../../src/config');
    expect(CONTAINER_RUNTIME).toBe('docker');
  });
  
  test('should use default Ollama host', () => {
    expect(OLLAMA_HOST).toBe('http://192.168.1.143:11434');
  });
});
```

#### 2. **Container Runner Tests**

```typescript
// tests/unit/container-runner.test.ts
import { buildContainerArgs } from '../../src/container-runner';

describe('Container Runner', () => {
  test('should build container args with environment variables', () => {
    const mounts = [
      { hostPath: '/host/path', containerPath: '/container/path', readonly: true }
    ];
    
    const args = buildContainerArgs(mounts, 'test-container');
    
    expect(args).toContain('-e');
    expect(args).toContain('OLLAMA_HOST=http://192.168.1.143:11434');
    expect(args).toContain('-e');
    expect(args).toContain('OLLAMA_MODEL=qwen2.5-coder:14b');
  });
  
  test('should use readonly mounts for Apple Container', () => {
    process.env.CONTAINER_RUNTIME = 'container';
    const mounts = [
      { hostPath: '/host/path', containerPath: '/container/path', readonly: true }
    ];
    
    const args = buildContainerArgs(mounts, 'test-container');
    
    expect(args).toContain('--mount');
    expect(args.join(' ')).toMatch(/readonly/);
  });
});
```

### Integration Tests

#### 1. **Ollama Integration Test**

```typescript
// tests/integration/ollama-integration.test.ts
describe('Ollama Integration', () => {
  test('should connect to Ollama service', async () => {
    const response = await fetch('http://192.168.1.143:11434/api/version');
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.version).toBeDefined();
  });
  
  test('should generate text with Ollama', async () => {
    const response = await fetch('http://192.168.1.143:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5-coder:14b',
        prompt: 'Hello',
        stream: false
      })
    });
    
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.response).toBeDefined();
  }, 30000); // 30 second timeout for LLM
});
```

#### 2. **Container Execution Test**

```typescript
// tests/integration/container-execution.test.ts
import { runContainerAgent } from '../../src/container-runner';

describe('Container Execution', () => {
  test('should successfully run container agent', async () => {
    const group = {
      name: 'test',
      folder: 'test',
      jid: 'test@s.whatsapp.net'
    };
    
    const input = {
      prompt: 'Say hello',
      groupFolder: 'test',
      chatJid: 'test@s.whatsapp.net',
      isMain: false
    };
    
    let processStarted = false;
    const output = await runContainerAgent(
      group,
      input,
      (proc, name) => {
        processStarted = true;
        expect(name).toMatch(/nanoclaw-test-/);
      }
    );
    
    expect(processStarted).toBe(true);
    expect(output.status).toBe('success');
    expect(output.result).toBeDefined();
  }, 60000);
});
```

### E2E Tests

```typescript
// tests/e2e/message-flow.test.ts
describe('End-to-End Message Flow', () => {
  beforeAll(async () => {
    // Start NanoClaw
    // Mock WhatsApp connection
  });
  
  afterAll(async () => {
    // Stop NanoClaw
  });
  
  test('should process incoming message and respond', async () => {
    // 1. Simulate incoming WhatsApp message
    const message = {
      key: { remoteJid: 'test@s.whatsapp.net', id: 'test-123' },
      message: { conversation: '@Andy hello' },
      messageTimestamp: Date.now() / 1000
    };
    
    // 2. Inject into message queue
    await injectMessage(message);
    
    // 3. Wait for processing
    await waitFor(() => messageProcessed(message.key.id), 30000);
    
    // 4. Verify response sent
    const response = await getLastSentMessage('test@s.whatsapp.net');
    expect(response).toBeDefined();
    expect(response.length).toBeGreaterThan(0);
  }, 60000);
});
```

### Test Coverage Goals

- **Unit Tests:** 80%+ coverage
- **Integration Tests:** Critical paths covered
- **E2E Tests:** Major user flows tested

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: macos-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          OLLAMA_HOST: http://localhost:11434
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Development TODOs

### High Priority (P0)

- [ ] **Security: Encrypt credentials at rest**
  - Implement keychain integration for macOS
  - Encrypt `store/auth/creds.json` and session tokens
  - Add credential rotation mechanism

- [ ] **Container Resource Limits**
  - Add CPU and memory limits to container spawning
  - Implement timeout enforcement
  - Add disk usage monitoring

- [ ] **Error Recovery**
  - Implement exponential backoff with jitter
  - Add circuit breaker for Ollama failures
  - Implement graceful degradation

- [ ] **Logging & Monitoring**
  - Structured logging with context
  - Performance metrics collection
  - Alert system for critical errors

### Medium Priority (P1)

- [ ] **RAG Integration**
  - Set up ChromaDB or Qdrant
  - Implement document ingestion pipeline
  - Add automatic conversation indexing
  - Create RAG query interface

- [ ] **Tools System**
  - Implement tool registry
  - Add file operations tool
  - Add web search tool
  - Add HTTP request tool
  - Create tool execution framework

- [ ] **Task Scheduler**
  - Implement cron-based scheduling
  - Add interval-based tasks
  - Create task management UI
  - Add task execution logging

- [ ] **Multi-Model Support**
  - Abstract LLM provider interface
  - Add OpenAI integration
  - Add Anthropic Claude integration
  - Add model switching logic

- [ ] **Web Dashboard**
  - Set up Express + WebSocket server
  - Create React frontend
  - Implement real-time log viewer
  - Add group management UI
  - Add configuration editor

### Low Priority (P2)

- [ ] **Horizontal Scaling**
  - Implement message queue (Redis/RabbitMQ)
  - Add distributed locking
  - Create load balancer
  - Set up shared session store

- [ ] **Advanced Features**
  - Voice message transcription
  - Image processing with vision models
  - Video summarization
  - Multi-language support

- [ ] **Developer Experience**
  - CLI tool for NanoClaw management
  - VS Code extension for debugging
  - Interactive setup wizard
  - Better documentation with examples

- [ ] **Testing**
  - Write unit tests (80% coverage)
  - Write integration tests
  - Write E2E tests
  - Set up CI/CD pipeline

### Documentation TODOs

- [ ] API documentation (OpenAPI/Swagger)
- [ ] Architecture diagrams
- [ ] Deployment guides (Docker, Kubernetes)
- [ ] Troubleshooting guide
- [ ] Contributing guidelines
- [ ] Security best practices guide

### Bug Fixes

- [ ] Fix WhatsApp reconnection after network loss
- [ ] Fix container cleanup on SIGTERM
- [ ] Fix session persistence across restarts
- [ ] Fix message ordering in concurrent scenarios

### Performance Optimizations

- [ ] Cache Ollama embeddings
- [ ] Implement message batching
- [ ] Optimize database queries with indexes
- [ ] Reduce container startup time
- [ ] Implement connection pooling

---

## Additional Resources

### Useful Commands

```bash
# Check Ollama status
curl http://192.168.1.143:11434/api/version

# List container images
container images

# View container logs in real-time
tail -f groups/main/logs/container-*.log

# Database query
sqlite3 store/messages.db "SELECT * FROM registered_groups"

# Monitor system resources
top -pid $(pgrep -f "node.*nanoclaw")
```

### Environment Variables Reference

```bash
# Container Runtime
CONTAINER_RUNTIME=container  # 'docker' or 'container'
AGENT_IMAGE=nanoclaw-agent-ollama:latest

# Ollama Configuration
OLLAMA_HOST=http://192.168.1.143:11434
OLLAMA_MODEL=qwen2.5-coder:14b
USE_OLLAMA=true

# Logging
LOG_LEVEL=info  # 'debug', 'info', 'warn', 'error'

# Container Limits
CONTAINER_TIMEOUT=1800000  # 30 minutes
IDLE_TIMEOUT=1800000
MAX_CONCURRENT_CONTAINERS=5

# RAG (Future)
RAG_ENABLED=false
RAG_VECTOR_STORE=chromadb
RAG_EMBEDDING_MODEL=nomic-embed-text
RAG_TOP_K=5
```

### Community & Support

- **Issues:** Report bugs on GitHub Issues
- **Discussions:** Ask questions on GitHub Discussions
- **Security:** Report vulnerabilities privately to security@example.com

---

**Last Updated:** February 12, 2026
**Version:** 1.0.0
