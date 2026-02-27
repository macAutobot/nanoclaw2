# How to Write Skills for NanoClaw

Skills teach the agent domain-specific knowledge and workflows. They're loaded on-demand when the agent searches for relevant expertise.

## File Structure

```
container/skills/
├── your-skill-name/
│   └── SKILL.md          # The skill definition
├── game-dev/
│   └── SKILL.md
└── agent-browser/
    └── SKILL.md
```

## Skill Format

Every skill is a markdown file with YAML frontmatter:

```markdown
````skill
---
name: your-skill-name
description: Brief description of when to use this skill. Include keywords that help the agent find it.
allowed-tools: Bash(*), Write(*), Read(*), Edit(*)
---

# Skill Title

Your detailed instructions here...
````
```

## YAML Frontmatter Fields

### `name` (required)
- Short identifier
- Lowercase, hyphens for spaces
- Example: `game-dev`, `api-testing`, `debug-containers`

### `description` (required)
- 1-2 sentences
- Include trigger keywords
- Tells the agent WHEN to use this skill
- Example: "Build complete, working games. Use when the user asks to create any game (Python, JavaScript, HTML5)."

### `allowed-tools` (optional)
- Whitelist of tools the skill needs
- Use wildcards: `Bash(*)` allows all bash commands
- Specific patterns: `Bash(agent-browser:*)` for agent-browser commands only
- Examples:
  - `Bash(*), Write(*), Read(*), Edit(*)`
  - `WebSearch, WebFetch`
  - `Bash(git:*), Bash(npm:*)`

## Writing Effective Skills

### 1. Be Action-Oriented

❌ BAD:
```markdown
When debugging, you should check logs...
```

✅ GOOD:
```markdown
1. Read the error message
2. Use `Bash(grep -r "error text" src/)`
3. Use `Read` to check the file
4. Use `Edit` to fix the bug
```

### 2. Provide Templates

Give the agent concrete examples to follow:

```markdown
## Example: Create API Client

Use `Write` to create:

\`\`\`python
import requests

class APIClient:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.headers = {"Authorization": f"Bearer {api_key}"}
    
    def get(self, endpoint):
        response = requests.get(f"{self.base_url}/{endpoint}", headers=self.headers)
        response.raise_for_status()
        return response.json()
\`\`\`
```

### 3. Define Clear Workflows

Use numbered steps or phases:

```markdown
## Workflow: Debug Production Issue

### Phase 1: Gather Info
1. `Bash(tail -100 /var/log/app.log)`
2. `Bash(systemctl status myapp)`
3. Note the error message and timestamp

### Phase 2: Find Root Cause
1. `rag_search("error message from logs")`
2. `Read` the relevant source file
3. Check recent changes: `Bash(git log -10 --oneline)`

### Phase 3: Fix
1. `Edit` to fix the bug
2. `Bash(systemctl restart myapp)`
3. `Bash(curl http://localhost:8080/health)` to verify
```

### 4. Include Common Patterns

```markdown
## Common Patterns

### Pattern: Retry with Backoff
\`\`\`python
import time

def retry(func, max_attempts=3):
    for attempt in range(max_attempts):
        try:
            return func()
        except Exception as e:
            if attempt == max_attempts - 1:
                raise
            time.sleep(2 ** attempt)
\`\`\`
```

### 5. List Anti-Patterns

Tell the agent what NOT to do:

```markdown
## Anti-Patterns

❌ DON'T just explain the solution
→ ✅ Write the actual code

❌ DON'T skip testing
→ ✅ Run tests after every change

❌ DON'T assume files exist
→ ✅ Check with `Bash(ls)` first
```

## Skill Examples by Use Case

### Domain Knowledge Skill
For teaching specific technology or framework:

```markdown
---
name: fastapi-dev
description: Build FastAPI web services. Use for REST API, async endpoints, Pydantic models.
allowed-tools: Bash(*), Write(*), Read(*), Edit(*)
---

# FastAPI Development

## Project Structure
\`\`\`
app/
├── main.py          # App entry point
├── models.py        # Pydantic models
├── routes/          # API endpoints
└── requirements.txt # Dependencies
\`\`\`

## Basic Template
[... include full working example ...]

## Common Tasks
[... list tasks with exact commands ...]
```

### Workflow Skill
For multi-step processes:

```markdown
---
name: deploy-app
description: Deploy applications to production. Use for deployment, CI/CD, release management.
allowed-tools: Bash(*)
---

# Deployment Workflow

## Pre-Deploy Checklist
1. ✅ Tests pass: `Bash(npm test)`
2. ✅ Build succeeds: `Bash(npm run build)`
3. ✅ Version bumped: Check package.json

## Deploy Steps
[... detailed steps ...]

## Rollback Procedure
[... rollback steps ...]
```

### Debugging Skill
For troubleshooting:

```markdown
---
name: debug-python
description: Debug Python applications. Use for exceptions, performance issues, memory leaks.
allowed-tools: Bash(*), Read(*), Edit(*)
---

# Python Debugging

## Common Issues

### Issue: ImportError
1. Check if module installed: `Bash(pip list | grep module_name)`
2. Check Python path: `Bash(python -c "import sys; print(sys.path)")`
3. Fix: `Bash(pip install module_name)`

[... more issues ...]
```

## Testing Your Skill

1. **Create the skill file:**
   ```bash
   mkdir -p container/skills/your-skill-name
   nano container/skills/your-skill-name/SKILL.md
   ```

2. **Rebuild the container:**
   ```bash
   ./container/build.sh
   ```

3. **Test the skill:**
   ```bash
   ./nanoclaw-cli "create a fastapi hello world"
   # The agent should find and use your skill
   ```

4. **Check if skill was loaded:**
   Look in agent logs for "Loading skill: your-skill-name"

## Tips

- **Be specific:** Generic advice like "write clean code" isn't helpful
- **Include commands:** Show exact bash commands, not just concepts
- **Test yourself:** Try following your own skill to see if it works
- **Keep it focused:** One skill = one domain. Don't make mega-skills.
- **Update regularly:** As you find better patterns, update the skill

## Skill Discovery

The agent finds skills via:
1. **Keyword matching** in the description
2. **Tool requirements** matching available tools
3. **Context** from the conversation

Make your description keyword-rich:
- ❌ "Helps with web stuff"
- ✅ "Build Flask web apps with SQLAlchemy. Use for REST APIs, databases, authentication, Jinja templates."

## Next Steps

1. Copy an existing skill as a template
2. Modify it for your domain
3. Rebuild container: `./container/build.sh`
4. Test it: `./nanoclaw-cli "task that should trigger your skill"`
5. Iterate based on results
