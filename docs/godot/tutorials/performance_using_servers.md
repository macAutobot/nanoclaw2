# Optimization using Servers

Engines like Godot provide increased ease of use thanks to their high-level constructs and features. Most of them are accessed and used via the `scene system <doc_scene_tree>`. Using nodes and resources simplifies project organization and asset management in complex games.

There are several drawbacks to this:

- There is an extra layer of complexity.
- Performance is lower than when using simple APIs directly.
- It is not possible to `use multiple threads <doc_using_multiple_threads>` to control them.
- More memory is needed.

In most cases, this is not really a problem. Godot is well-optimized, and most operations are handled with signals, which means no polling is required. Still, sometimes, we want to extract better performance from the hardware when other avenues of optimization have been exhausted. For example, dealing with tens of thousands of instances for something that needs to be processed every frame can be a bottleneck.

This type of situation makes programmers regret they are using a game engine and wish they could go back to a more handcrafted, low-level implementation of game code.

Still, Godot is designed to work around this problem.

<div class="seealso">

You can see how using low-level servers works in action using the [Bullet Shower demo project](https://github.com/godotengine/godot-demo-projects/tree/master/2d/bullet_shower).

</div>

## Servers

One of the most interesting design decisions for Godot is the fact that the whole scene system is *optional*. While it is not possible to compile it out, it can be completely bypassed.

At the core, Godot uses the concept of Servers. They are low-level APIs to control rendering, physics, sound, etc. The scene system is built on top of them and uses them directly. The most common servers are:

- `class_RenderingServer`: Handles everything related to graphics.
- `class_PhysicsServer3D`: Handles everything related to 3D physics.
- `class_PhysicsServer2D`: Handles everything related to 2D physics.
- `class_AudioServer`: Handles everything related to audio.

Explore their APIs, and you will realize that all the functions provided are low-level implementations of everything Godot allows you to do using nodes.

## RIDs

The key to using servers is understanding Resource ID (`RID <class_RID>`) objects. These are opaque handles to the server implementation. They are allocated and freed manually. Almost every function in the servers requires RIDs to access the actual resource.

Most Godot nodes and resources contain these RIDs from the servers internally, and they can be obtained with different functions. In fact, anything that inherits `Resource <class_Resource>` can be directly casted to an RID. Not all resources contain an RID, though: in such cases, the RID will be empty. The resource can then be passed to server APIs as an RID.

> [!WARNING]
> Resources are reference-counted (see `RefCounted <class_RefCounted>`), and references to a resource's RID are *not* counted when determining whether the resource is still in use. Make sure to **keep a reference** to the resource outside the server. Otherwise, both the resource and its RID will be erased.

For nodes, there are many functions available:

- For CanvasItem, the `CanvasItem.get_canvas_item() <class_CanvasItem_method_get_canvas_item>` method will return the canvas item RID in the server.
- For CanvasLayer, the `CanvasLayer.get_canvas() <class_CanvasLayer_method_get_canvas>` method will return the canvas RID in the server.
- For Viewport, the `Viewport.get_viewport_rid() <class_Viewport_method_get_viewport_rid>` method will return the viewport RID in the server.
- For 2D, the `class_World2D` resource (obtainable in the `class_Viewport` and `CanvasItem <class_CanvasItem>` nodes) contains functions to get the *RenderingServer Canvas*, and the *PhysicsServer2D Space*. This allows creating 2D objects directly with the server API and using them.
- For 3D, the `class_World3D` resource (obtainable in the `class_Viewport` and `class_Node3D` nodes) contains functions to get the *RenderingServer Scenario*, and the *PhysicsServer Space*. This allows creating 3D objects directly with the server API and using them.
- The `class_VisualInstance3D` class, allows getting the scenario *instance* and *instance base* via the `VisualInstance3D.get_instance() <class_VisualInstance3D_method_get_instance>` and `VisualInstance3D.get_base() <class_VisualInstance3D_method_get_base>` respectively.

Try exploring the nodes and resources you are familiar with and find the functions to obtain the server *RIDs*.

It is not advised to control RIDs from objects that already have a node associated. Instead, server functions should always be used for creating and controlling new ones and interacting with the existing ones.

## Creating a sprite

This is an example of how to create a sprite from code and move it using the low-level `class_CanvasItem` API.

> [!NOTE]
> When creating canvas items using the RenderingServer, you should reset physics interpolation on the first frame using `RenderingServer.canvas_item_reset_physics_interpolation() <class_RenderingServer_method_canvas_item_reset_physics_interpolation>`. This ensures proper synchronization between the rendering and physics systems.
>
> If this is not done, the canvas item may appear to teleport in when the scene is loaded, rather than appearing directly at its intended location.

<div class="tabs">

.. code-tab:: gdscript GDScript

extends Node2D

\# RenderingServer expects references to be kept around. var texture

func <span id="ready">ready</span>():  
\# Create a canvas item, child of this node. var ci_rid = RenderingServer.canvas_item_create() \# Make this node the parent. RenderingServer.canvas_item_set_parent(ci_rid, get_canvas_item()) \# Draw a texture on it. \# Remember to keep this reference. texture = load("res://my_texture.png") \# Add it, centered. RenderingServer.canvas_item_add_texture_rect(ci_rid, Rect2(-texture.get_size() / 2, texture.get_size()), texture) \# Add the item, rotated 45 degrees and translated. var xform = Transform2D().rotated(deg_to_rad(45)).translated(Vector2(20, 30)) RenderingServer.canvas_item_set_transform(ci_rid, xform) \# Reset physics interpolation for this item. RenderingServer.canvas_item_reset_physics_interpolation(ci_rid)

<div class="code-tab">

csharp

</div>

public partial class MyNode2D : Node2D { // RenderingServer expects references to be kept around. private Texture2D <span id="texture">texture</span>;

> public override void <span id="ready">Ready</span>() { // Create a canvas item, child of this node. Rid ciRid = RenderingServer.CanvasItemCreate(); // Make this node the parent. RenderingServer.CanvasItemSetParent(ciRid, GetCanvasItem()); // Draw a texture on it. // Remember to keep this reference. <span id="texture">texture</span> = ResourceLoader.Load\<Texture2D\>("res://my_texture.png"); // Add it, centered. RenderingServer.CanvasItemAddTextureRect(ciRid, new Rect2(-<span id="texture.getsize">texture.GetSize</span>() / 2, <span id="texture.getsize">texture.GetSize</span>()), <span id="texture.getrid">texture.GetRid</span>()); // Add the item, rotated 45 degrees and translated. Transform2D xform = Transform2D.Identity.Rotated(Mathf.DegToRad(45)).Translated(new Vector2(20, 30)); RenderingServer.CanvasItemSetTransform(ciRid, xform); // Reset physics interpolation for this item. RenderingServer.CanvasItemResetPhysicsInterpolation(ciRid); }

}

</div>

The Canvas Item API in the server allows you to add draw primitives to it. Once added, they can't be modified. The Item needs to be cleared and the primitives re-added. This is not the case for setting the transform, which can be done as many times as desired.

Primitives are cleared this way:

<div class="tabs">

.. code-tab:: gdscript GDScript

RenderingServer.canvas_item_clear(ci_rid)

<div class="code-tab">

csharp

</div>

RenderingServer.CanvasItemClear(ciRid);

</div>

## Instantiating a Mesh into 3D space

The 3D APIs are different from the 2D ones, so the instantiation API must be used.

<div class="tabs">

.. code-tab:: gdscript GDScript

extends Node3D

\# RenderingServer expects references to be kept around. var mesh

func <span id="ready">ready</span>():  
\# Create a visual instance (for 3D). var instance = RenderingServer.instance_create() \# Set the scenario from the world. This ensures it \# appears with the same objects as the scene. var scenario = get_world_3d().scenario RenderingServer.instance_set_scenario(instance, scenario) \# Add a mesh to it. \# Remember to keep this reference. mesh = load("res://my_mesh.obj") RenderingServer.instance_set_base(instance, mesh) \# Move the mesh around. var xform = Transform3D(Basis(), Vector3(2, 3, 0)) RenderingServer.instance_set_transform(instance, xform)

<div class="code-tab">

csharp

</div>

public partial class MyNode3D : Node3D { // RenderingServer expects references to be kept around. private Mesh <span id="mesh">mesh</span>;

> public override void <span id="ready">Ready</span>() { // Create a visual instance (for 3D). Rid instance = RenderingServer.InstanceCreate(); // Set the scenario from the world. This ensures it // appears with the same objects as the scene. Rid scenario = GetWorld3D().Scenario; RenderingServer.InstanceSetScenario(instance, scenario); // Add a mesh to it. // Remember to keep this reference. <span id="mesh">mesh</span> = ResourceLoader.Load\<Mesh\>("res://my_mesh.obj"); RenderingServer.InstanceSetBase(instance, <span id="mesh.getrid">mesh.GetRid</span>()); // Move the mesh around. Transform3D xform = new Transform3D(Basis.Identity, new Vector3(2, 3, 0)); RenderingServer.InstanceSetTransform(instance, xform); }

}

</div>

## Creating a 2D RigidBody and moving a sprite with it

This creates a `class_RigidBody2D` using the `class_PhysicsServer2D` API, and moves a `class_CanvasItem` when the body moves.

<div class="tabs">

.. code-tab:: gdscript GDScript

\# PhysicsServer2D expects references to be kept around. var body var shape

func <span id="body_moved">body_moved</span>(state, index):  
\# Created your own canvas item; use it here. \# <span class="title-ref">ci_rid</span> from the sprite example above needs to be moved to a \# member variable (instead of within <span class="title-ref">\_ready()</span>) so it can be referenced here. RenderingServer.canvas_item_set_transform(ci_rid, state.transform)

func <span id="ready">ready</span>():  
\# Create the body. body = PhysicsServer2D.body_create() PhysicsServer2D.body_set_mode(body, PhysicsServer2D.BODY_MODE_RIGID) \# Add a shape. shape = PhysicsServer2D.rectangle_shape_create() \# Set rectangle extents. PhysicsServer2D.shape_set_data(shape, Vector2(10, 10)) \# Make sure to keep the shape reference! PhysicsServer2D.body_add_shape(body, shape) \# Set space, so it collides in the same space as current scene. PhysicsServer2D.body_set_space(body, get_world_2d().space) \# Move initial position. PhysicsServer2D.body_set_state(body, PhysicsServer2D.BODY_STATE_TRANSFORM, Transform2D(0, Vector2(10, 20))) \# Add the transform callback, when body moves \# The last parameter is optional, can be used as index \# if you have many bodies and a single callback. PhysicsServer2D.body_set_force_integration_callback(body, self, "\_body_moved", 0)

\# Also create a sprite using RenderingServer here. \# See the section above on creating a sprite. \# ...

<div class="code-tab">

csharp

</div>

using Godot;

public partial class MyNode2D : Node2D { private Rid <span id="canvasitem">canvasItem</span>;

> private void BodyMoved(PhysicsDirectBodyState2D state, int index) { // Created your own canvas item; use it here. // <span class="title-ref">ciRid</span> from the sprite example above needs to be moved to a // member variable (instead of within <span class="title-ref">\_Ready()</span>) so it can be referenced here. RenderingServer.CanvasItemSetTransform(<span id="canvasitem">canvasItem</span>, state.Transform); }
>
> public override void <span id="ready">Ready</span>() { // Create the body. var body = PhysicsServer2D.BodyCreate(); PhysicsServer2D.BodySetMode(body, PhysicsServer2D.BodyMode.Rigid); // Add a shape. var shape = PhysicsServer2D.RectangleShapeCreate(); // Set rectangle extents. PhysicsServer2D.ShapeSetData(shape, new Vector2(10, 10)); // Make sure to keep the shape reference! PhysicsServer2D.BodyAddShape(body, shape); // Set space, so it collides in the same space as current scene. PhysicsServer2D.BodySetSpace(body, GetWorld2D().Space); // Move initial position. PhysicsServer2D.BodySetState(body, PhysicsServer2D.BodyState.Transform, new Transform2D(0, new Vector2(10, 20))); // Add the transform callback, when body moves // The last parameter is optional, can be used as index // if you have many bodies and a single callback. PhysicsServer2D.BodySetForceIntegrationCallback(body, new Callable(this, MethodName.BodyMoved), 0);
>
> > // Also create a sprite using RenderingServer here. // See the section above on creating a sprite. // ...
>
> }

}

</div>

The 3D version should be very similar, as the 2D and 3D physics servers are identical (using `class_RigidBody3D` and `class_PhysicsServer3D` respectively).

## Getting data from the servers

Try to **never** request any information from `class_RenderingServer`, `class_PhysicsServer2D`, or `class_PhysicsServer3D` by calling functions unless you know what you are doing. These servers will often run asynchronously for performance and calling any function that returns a value will stall them and force them to process anything pending until the function is actually called. This will severely decrease performance if you call them every frame (and it won't be obvious why).

Because of this, most APIs in such servers are designed so it's not even possible to request information back, until it's actual data that can be saved.
