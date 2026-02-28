```skill
---
name: godot-game-dev
description: Expert guidance for creating games in Godot Engine. Covers GDScript, scene trees, nodes, signals, physics, animation, and game architecture patterns. Use when user asks to create games, needs Godot help, or wants game development advice.
allowed-tools: Bash(*), Write(*), Read(*), Edit(*), WebSearch(*)
---

# Godot Game Development Expert

## Core Principles

1. **Scene-based architecture** - Everything is a node in a tree
2. **Signals for communication** - Decouple components with signals
3. **GDScript for logic** - Python-like scripting language
4. **Resources for data** - Separate data from logic

## Workflow

### 1. Project Setup
```bash
# Create project structure
mkdir -p {project_name}/{scenes,scripts,assets/{sprites,sounds,fonts}}
cd {project_name}

# Create project.godot file
cat > project.godot << 'EOF'
config_version=5

[application]
config/name="{ProjectName}"
run/main_scene="res://scenes/main.tscn"
config/features=PackedStringArray("4.3")
EOF
```

### 2. Scene Creation Pattern
```gdscript
# scripts/main.gd
extends Node2D

# Signals - define at top
signal game_started
signal game_over(score: int)

# Export variables - appear in inspector
@export var speed: float = 200.0
@export var jump_force: float = -400.0

# Node references
@onready var sprite = $Sprite2D
@onready var animation = $AnimationPlayer

func _ready():
    # Initialize when scene loads
    game_started.emit()

func _process(delta):
    # Called every frame
    pass

func _physics_process(delta):
    # Called at fixed intervals for physics
    pass
```

### 3. Common Game Patterns

**Player Controller (2D):**
```gdscript
extends CharacterBody2D

@export var speed = 300.0
@export var jump_velocity = -400.0
var gravity = ProjectSettings.get_setting("physics/2d/default_gravity")

func _physics_process(delta):
    # Gravity
    if not is_on_floor():
        velocity.y += gravity * delta
    
    # Jump
    if Input.is_action_just_pressed("ui_accept") and is_on_floor():
        velocity.y = jump_velocity
    
    # Movement
    var direction = Input.get_axis("ui_left", "ui_right")
    velocity.x = direction * speed
    
    move_and_slide()
```

**State Machine:**
```gdscript
extends Node

enum State { IDLE, WALKING, JUMPING, ATTACKING }
var current_state = State.IDLE

func change_state(new_state: State):
    # Exit current state
    match current_state:
        State.IDLE: exit_idle()
        State.WALKING: exit_walking()
    
    # Enter new state
    current_state = new_state
    match current_state:
        State.IDLE: enter_idle()
        State.WALKING: enter_walking()
```

**Singleton/Autoload (Global State):**
```gdscript
# scripts/global.gd
extends Node

var score: int = 0
var high_score: int = 0

func add_score(amount: int):
    score += amount
    if score > high_score:
        high_score = score

func reset_game():
    score = 0
```

### 4. Testing Workflow
```bash
# Run game from command line
godot --path . scenes/main.tscn

# Run tests
godot --path . --script scripts/tests/test_player.gd
```

## Templates

### Simple 2D Platformer Structure
```
platformer/
├── project.godot
├── scenes/
│   ├── main.tscn          # Main game scene
│   ├── player.tscn        # Player character
│   ├── enemy.tscn         # Enemy prefab
│   └── ui/
│       └── hud.tscn       # UI overlay
├── scripts/
│   ├── player.gd
│   ├── enemy.gd
│   └── global.gd          # Autoload singleton
└── assets/
    ├── sprites/
    ├── sounds/
    └── fonts/
```

### Scene File (.tscn) Example
```
[gd_scene load_steps=3 format=3]

[ext_resource type="Script" path="res://scripts/player.gd" id="1"]
[ext_resource type="Texture2D" path="res://assets/sprites/player.png" id="2"]

[node name="Player" type="CharacterBody2D"]
script = ExtResource("1")

[node name="Sprite2D" type="Sprite2D" parent="."]
texture = ExtResource("2")

[node name="CollisionShape2D" type="CollisionShape2D" parent="."]
```

## Best Practices

✅ **DO```skill
---
name: godot-game-dev
description: Expert guidance for creating games in Godot Engine. Covers GDScript, scene trees, nodes, signals, physics, animation, and game architecture patterns. Use when user asks to create games, needs Godot help, or wants game development advice.
allowed-tools: Bash(*), Write(*), Read(*), Edit(*), WebSearch(*)
---

# Godot Game Development Expert

## Core Principles

1. **Scene-based architecture** - Everything is a node in a tree
2. **Signals for communication** - Decouple components with signals
3. **GDScript for logic** - Python-like scripting language
4. **Resources for data** - Separate data from logic

## Workflow

### 1. Project Setup
```bash
# Create project structure
mkdir -p {project_name}/{scenes,scripts,assets/{sprites,sounds,fonts}}
cd {project_name}

# Create project.godot file
cat > project.godot << 'EOF'
config_version=5

[application]
config/name="{ProjectName}"
run/main_scene="res://scenes/main.tscn"
config/features=PackedStringArray("4.3")
EOF
```

### 2. Scene Creation Pattern
```gdscript
# scripts/main.gd
extends Node2D

# Signals - define at top
signal game_started
signal game_over(score: int)

# Export variables - appear in inspector
@export var speed: float = 200.0
@export var jump_force: float = -400.0

# Node references
@onready var sprite = $Sprite2D
@onready var animation = $AnimationPlayer

func _ready():
    # Initialize when scene loads
    game_started.emit()

func _process(delta):
    # Called every frame
    pass

func _physics_process(delta):
    # Called at fixed intervals for physics
    pass
```

### 3. Common Game Patterns

**Player Controller (2D):**
```gdscript
extends CharacterBody2D

@export var speed = 300.0
@export var jump_velocity = -400.0
var gravity = ProjectSettings.get_setting("physics/2d/default_gravity")

func _physics_process(delta):
    # Gravity
    if not is_on_floor():
        velocity.y += gravity * delta
    
    # Jump
    if Input.is_action_just_pressed("ui_accept") and is_on_floor():
        velocity.y = jump_velocity
    
    # Movement
    var direction = Input.get_axis("ui_left", "ui_right")
    velocity.x = direction * speed
    
    move_and_slide()
```

**State Machine:**
```gdscript
extends Node

enum State { IDLE, WALKING, JUMPING, ATTACKING }
var current_state = State.IDLE

func change_state(new_state: State):
    # Exit current state
    match current_state:
        State.IDLE: exit_idle()
        State.WALKING: exit_walking()
    
    # Enter new state
    current_state = new_state
    match current_state:
        State.IDLE: enter_idle()
        State.WALKING: enter_walking()
```

**Singleton/Autoload (Global State):**
```gdscript
# scripts/global.gd
extends Node

var score: int = 0
var high_score: int = 0

func add_score(amount: int):
    score += amount
    if score > high_score:
        high_score = score

func reset_game():
    score = 0
```

### 4. Testing Workflow
```bash
# Run game from command line
godot --path . scenes/main.tscn

# Run tests
godot --path . --script scripts/tests/test_player.gd
```

## Templates

### Simple 2D Platformer Structure
```
platformer/
├── project.godot
├── scenes/
│   ├── main.tscn          # Main game scene
│   ├── player.tscn        # Player character
│   ├── enemy.tscn         # Enemy prefab
│   └── ui/
│       └── hud.tscn       # UI overlay
├── scripts/
│   ├── player.gd
│   ├── enemy.gd
│   └── global.gd          # Autoload singleton
└── assets/
    ├── sprites/
    ├── sounds/
    └── fonts/
```

### Scene File (.tscn) Example
```
[gd_scene load_steps=3 format=3]

[ext_resource type="Script" path="res://scripts/player.gd" id="1"]
[ext_resource type="Texture2D" path="res://assets/sprites/player.png" id="2"]

[node name="Player" type="CharacterBody2D"]
script = ExtResource("1")

[node name="Sprite2D" type="Sprite2D" parent="."]
texture = ExtResource("2")

[node name="CollisionShape2D" type="CollisionShape2D" parent="."]
```

## Best Practices

✅ **DO