# Overridable functions

Godot's Node class provides virtual functions you can override to update nodes every frame or on specific events, like when they enter the scene tree.

This document presents the ones you'll use most often.

<div class="seealso">

Under the hood, these functions rely on Godot's low-level notifications system. To learn more about it, see `doc_godot_notifications`.

</div>

Two functions allow you to initialize and get nodes besides the class's constructor: `_enter_tree()` and `_ready()`.

When the node enters the Scene Tree, it becomes active and the engine calls its `_enter_tree()` method. That node's children may not be part of the active scene yet. As you can remove and re-add nodes to the scene tree, this function may be called multiple times throughout a node's lifetime.

Most of the time, you'll use `_ready()` instead. This function is called only once in a node's lifetime, after `_enter_tree()`. `_ready()` ensures that all children have entered the scene tree first, so you can safely call `get_node()` on them.

<div class="seealso">

To learn more about getting node references, read `doc_nodes_and_scene_instances`.

</div>

Another related callback is `_exit_tree()`, which the engine calls every time a node is about to exit the scene tree. This can be when you call `Node.remove_child()
<class_Node_method_remove_child>` or when you free a node.

<div class="tabs">

.. code-tab:: gdscript GDScript

\# Called every time the node enters the scene tree. func <span id="enter_tree">enter_tree</span>(): pass

\# Called when both the node and its children have entered the scene tree. func <span id="ready">ready</span>(): pass

\# Called when the node is about to leave the scene tree, after all its \# children received the <span id="exit_tree">exit_tree</span>() callback. func <span id="exit_tree">exit_tree</span>(): pass

<div class="code-tab">

csharp

</div>

// Called every time the node enters the scene tree. public override void <span id="entertree">EnterTree</span>() { base.\_EnterTree(); }

// Called when both the node and its children have entered the scene tree. public override void <span id="ready">Ready</span>() { base.\_Ready(); }

// Called when the node is about to leave the scene tree, after all its // children. public override void <span id="exittree">ExitTree</span>() { base.\_ExitTree(); }

</div>

The two virtual methods `_process()` and `_physics_process()` allow you to update the node, every frame and every physics frame respectively. For more information, read the dedicated documentation: `doc_idle_and_physics_processing`.

<div class="tabs">

.. code-tab:: gdscript GDScript

\# Called every frame. func <span id="process">process</span>(delta): pass

\# Called every physics frame. func <span id="physics_process">physics_process</span>(delta): pass

<div class="code-tab">

csharp

</div>

public override void <span id="process">Process</span>(double delta) { // Called every frame. base.\_Process(delta); }

public override void <span id="physicsprocess">PhysicsProcess</span>(double delta) { // Called every physics frame. base.\_PhysicsProcess(delta); }

</div>

Two more essential built-in node callback functions are `Node._unhandled_input() <class_Node_private_method__unhandled_input>` and `Node._input() <class_Node_private_method__input>`, which you use to both receive and process individual input events. The `_unhandled_input()` method receives every key press, mouse click, etc. that have not been handled already in an `_input()` callback or in a user interface component. You want to use it for gameplay input in general. The `_input()` callback allows you to intercept and process input events before `_unhandled_input()` gets them.

To learn more about inputs in Godot, see the `Input section <toc-learn-features-inputs>`.

<div class="tabs">

.. code-tab:: gdscript GDScript

\# Called once for every event. func <span id="unhandled_input">unhandled_input</span>(event): pass

\# Called once for every event before <span id="unhandled_input">unhandled_input</span>(), allowing you to \# consume some events. func <span id="input">input</span>(event): pass

<div class="code-tab">

csharp

</div>

// Called once for every event. public override void <span id="unhandledinput">UnhandledInput</span>(InputEvent @event) { base.\_UnhandledInput(@event); }

// Called once for every event before <span id="unhandledinput">UnhandledInput</span>(), allowing you to // consume some events. public override void <span id="input">Input</span>(InputEvent @event) { base.\_Input(@event); }

</div>

There are some more overridable functions like `Node._get_configuration_warnings()
<class_Node_private_method__get_configuration_warnings>`. Specialized node types provide more callbacks like `CanvasItem._draw() <class_CanvasItem_private_method__draw>` to draw programmatically or `Control._gui_input()
<class_Control_private_method__gui_input>` to handle clicks and input on UI elements.
