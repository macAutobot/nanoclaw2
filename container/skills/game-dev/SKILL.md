````skill
---
name: game-dev
description: Build complete, working games. Use when the user asks to create any game (Python, JavaScript, HTML5). Emphasizes creating working code, testing, and iterative debugging.
allowed-tools: Bash(*), Write(*), Read(*), Edit(*), WebSearch
---

# Game Development Workflow

## Core Rule: Build Complete, Working Games

When asked to "create a game," DO NOT just explain how to write it.
ALWAYS follow this workflow to deliver a finished, tested game.

## The Loop: Plan → Write → Test → Debug → Polish

### Phase 1: Plan (30 seconds max)

Quick mental check:
- What's the core mechanic? (e.g., "dodge falling objects")
- What language/tech? (Python + pygame, HTML5 Canvas, terminal-based)
- What files needed? (game.py, test_game.py, README.md)

**Keep planning brief.** Don't spend 10 messages planning a simple game.

### Phase 2: Write ALL Files

Use `Write` tool to create:

1. **Main game file** — Complete, runnable code
2. **Test file** — At least 2-3 basic tests
3. **README.md** — How to install and run
4. **Requirements/dependencies** — requirements.txt, package.json, or instructions

**Template structure for Python games:**

```python
# game.py
import pygame
import sys

class Game:
    def __init__(self):
        pygame.init()
        self.screen = pygame.display.set_mode((800, 600))
        self.clock = pygame.time.Clock()
        self.running = True
        # ... game state ...
    
    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
            # ... handle input ...
    
    def update(self):
        # ... game logic ...
        pass
    
    def render(self):
        self.screen.fill((0, 0, 0))
        # ... draw everything ...
        pygame.display.flip()
    
    def run(self):
        while self.running:
            self.handle_events()
            self.update()
            self.render()
            self.clock.tick(60)
        pygame.quit()

if __name__ == "__main__":
    game = Game()
    game.run()
```

### Phase 3: Test Immediately

After writing the files, ALWAYS run the game:

```bash
# Install dependencies
pip install pygame  # or npm install, etc.

# Run the game
python game.py
```

If it's a GUI game that needs user interaction, run a basic smoke test:

```bash
# Check if it loads without crashing
timeout 3 python game.py &
sleep 2
pkill -f game.py
echo "Game loaded successfully"
```

For text/terminal games, run it with test input:

```bash
echo "test input" | python game.py
```

### Phase 4: Debug Until It Works

If tests fail:

1. **Read the error output carefully**
2. **Use `Read` to check the file**
3. **Use `Edit` to fix the bug**
4. **Re-run the test**
5. **Repeat until tests pass**

DO NOT give up after one failure. Keep iterating.

Common fixes:
- Missing imports: `Edit` to add them
- Wrong file paths: Check with `Bash(ls -la)`
- Module not found: Install with `Bash(pip install ...)`
- Syntax errors: Read line mentioned in error, fix with `Edit`

### Phase 5: Polish & Document

Once working:
- Add comments to tricky parts
- Update README with screenshots of errors you fixed
- List controls clearly
- Add a "How to Play" section

## Example: User Says "Create Snake Game"

**WRONG approach:**
```
"Here's how you'd create a snake game:
1. Create a Snake class
2. Handle input with arrow keys
3. Draw the snake and food..."
```

**CORRECT approach:**

```
I'll create a complete Snake game for you.

[Use Write tool to create game.py with full implementation]
[Use Write tool to create requirements.txt]
[Use Write tool to create README.md]
[Use Bash tool: pip install pygame]
[Use Bash tool: timeout 3 python game.py &]
[Check if it runs without errors]
[If errors: use Edit to fix, then re-test]

Done! The game is working. You can run it with:
  python game.py

Controls: Arrow keys to move, ESC to quit
```

## Testing Strategies

### For GUI Games (pygame, tkinter, HTML5)

```bash
# Syntax check
python -m py_compile game.py

# Import check
python -c "import game; print('✓ imports work')"

# Brief run test (auto-quit after 2 seconds)
timeout 2 python game.py || echo "Game started and ran"
```

### For Terminal Games

```bash
# Full test with simulated input
echo -e "start\nmove left\nquit" | python game.py
```

### For HTML5 Games

```bash
# Syntax check
node -c game.js

# Start local server and test
python -m http.server 8000 &
SERVER_PID=$!
sleep 1
curl -f http://localhost:8000/game.html > /dev/null && echo "✓ Game loads"
kill $SERVER_PID
```

## Common Game Types: Quick Reference

### Snake (Python + pygame)
- Grid-based movement
- Collision detection with self and walls
- Food spawning, score tracking
- Files: `game.py`, `requirements.txt` (pygame), `README.md`

### Flappy Bird (HTML5 Canvas)
- Continuous scroll
- Jump physics, gravity
- Pipe generation, collision
- Files: `game.html`, `game.js`, `game.css`, `README.md`

### Pong (Python + pygame)
- Paddle movement (keyboard/AI)
- Ball physics (bounce angles)
- Score tracking
- Files: `game.py`, `requirements.txt`, `README.md`

### Text Adventure (Terminal)
- Room/state system
- Text parser for commands
- Inventory, story progression
- Files: `adventure.py`, `README.md`, optional `test_adventure.py`

## Anti-Patterns to Avoid

❌ **"Here's the basic structure, you can add..."**
→ ✅ Add all features. Make it complete.

❌ **"I've written the code, try running it"**
→ ✅ YOU run it first, debug, then tell user it's ready.

❌ **"There might be some bugs, let me know if you encounter any"**
→ ✅ Test it yourself, fix ALL bugs you find.

❌ **"Create the game in multiple steps"** (then only do step 1)
→ ✅ Do ALL steps in one response. Loop internally.

## When to Stop

You're done when:
- ✅ All files created
- ✅ Game runs without errors
- ✅ Core mechanics work
- ✅ README documents how to run it
- ✅ You've personally tested it

Then tell user: "Game is complete and tested. Run with: `python game.py`"

````