# Inspector plugins

The inspector dock allows you to create custom widgets to edit properties through plugins. This can be beneficial when working with custom datatypes and resources, although you can use the feature to change the inspector widgets for built-in types. You can design custom controls for specific properties, entire objects, and even separate controls associated with particular datatypes.

This guide explains how to use the `class_EditorInspectorPlugin` and `class_EditorProperty` classes to create a custom interface for integers, replacing the default behavior with a button that generates random values between 0 and 99.

<figure class="align-center">
<img src="img/inspector_plugin_example.png" alt="The default behavior on the left and the end result on the right." />
<figcaption aria-hidden="true">The default behavior on the left and the end result on the right.</figcaption>
</figure>

## Setting up your plugin

Create a new empty plugin to get started.

<div class="seealso">

See `doc_making_plugins` guide to set up your new plugin.

</div>

Let's assume you've called your plugin folder `my_inspector_plugin`. If so, you should end up with a new `addons/my_inspector_plugin` folder that contains two files: `plugin.cfg` and `plugin.gd`.

As before, `plugin.gd` is a script extending `class_EditorPlugin` and you need to introduce new code for its `_enter_tree` and `_exit_tree` methods. To set up your inspector plugin, you must load its script, then create and add the instance by calling `add_inspector_plugin()`. If the plugin is disabled, you should remove the instance you have added by calling `remove_inspector_plugin()`.

> [!NOTE]
> Here, you are loading a script and not a packed scene. Therefore you should use `new()` instead of `instantiate()`.

<div class="tabs">

.. code-tab:: gdscript GDScript

\# plugin.gd @tool extends EditorPlugin

var plugin

func <span id="enter_tree">enter_tree</span>():  
plugin = preload("res://addons/my_inspector_plugin/my_inspector_plugin.gd").new() add_inspector_plugin(plugin)

func <span id="exit_tree">exit_tree</span>():  
remove_inspector_plugin(plugin)

<div class="code-tab">

csharp

</div>

// Plugin.cs \#if TOOLS using Godot;

\[Tool\] public partial class Plugin : EditorPlugin { private MyInspectorPlugin <span id="plugin">plugin</span>;

> public override void <span id="entertree">EnterTree</span>() { <span id="plugin">plugin</span> = new MyInspectorPlugin(); AddInspectorPlugin(<span id="plugin">plugin</span>); }
>
> public override void <span id="exittree">ExitTree</span>() { RemoveInspectorPlugin(<span id="plugin">plugin</span>); }

} \#endif

</div>

## Interacting with the inspector

To interact with the inspector dock, your `my_inspector_plugin.gd` script must extend the `class_EditorInspectorPlugin` class. This class provides several virtual methods that affect how the inspector handles properties.

To have any effect at all, the script must implement the `_can_handle()` method. This function is called for each edited `class_Object` and must return `true` if this plugin should handle the object or its properties.

> [!NOTE]
> This includes any `class_Resource` attached to the object.

You can implement four other methods to add controls to the inspector at specific positions. The `_parse_begin()` and `_parse_end()` methods are called only once at the beginning and the end of parsing for each object, respectively. They can add controls at the top or bottom of the inspector layout by calling `add_custom_control()`.

As the editor parses the object, it calls the `_parse_category()` and `_parse_property()` methods. There, in addition to `add_custom_control()`, you can call both `add_property_editor()` and `add_property_editor_for_multiple_properties()`. Use these last two methods to specifically add `class_EditorProperty`-based controls.

<div class="tabs">

.. code-tab:: gdscript GDScript

\# my_inspector_plugin.gd extends EditorInspectorPlugin

var RandomIntEditor = preload("res://addons/my_inspector_plugin/random_int_editor.gd")

func <span id="can_handle">can_handle</span>(object):  
\# We support all objects in this example. return true

func <span id="parse_property">parse_property</span>(object, type, name, hint_type, hint_string, usage_flags, wide):  
\# We handle properties of type integer. if type == TYPE_INT: \# Create an instance of the custom property editor and register \# it to a specific property path. add_property_editor(name, RandomIntEditor.new()) \# Inform the editor to remove the default property editor for \# this property type. return true else: return false

<div class="code-tab">

csharp

</div>

// MyInspectorPlugin.cs \#if TOOLS using Godot;

public partial class MyInspectorPlugin : EditorInspectorPlugin { public override bool <span id="canhandle">CanHandle</span>(GodotObject @object) { // We support all objects in this example. return true; }

> public override bool <span id="parseproperty">ParseProperty</span>(GodotObject @object, Variant.Type type,  
> string name, PropertyHint hintType, string hintString, PropertyUsageFlags usageFlags, bool wide)
>
> {  
> // We handle properties of type integer. if (type == Variant.Type.Int) { // Create an instance of the custom property editor and register // it to a specific property path. AddPropertyEditor(name, new RandomIntEditor()); // Inform the editor to remove the default property editor for // this property type. return true; }
>
> return false;
>
> }

} \#endif

</div>

## Adding an interface to edit properties

The `class_EditorProperty` class is a special type of `class_Control` that can interact with the inspector dock's edited objects. It doesn't display anything but can house any other control nodes, including complex scenes.

There are three essential parts to the script extending `class_EditorProperty`:

1.  You must define the `_init()` method to set up the control nodes' structure.
2.  You should implement the `_update_property()` to handle changes to the data from the outside.
3.  A signal must be emitted at some point to inform the inspector that the control has changed the property using `emit_changed`.

You can display your custom widget in two ways. Use just the default `add_child()` method to display it to the right of the property name, and use `add_child()` followed by `set_bottom_editor()` to position it below the name.

<div class="tabs">

.. code-tab:: gdscript GDScript

\# random_int_editor.gd extends EditorProperty

\# The main control for editing the property. var property_control = Button.new() \# An internal value of the property. var current_value = 0 \# A guard against internal changes when the property is updated. var updating = false

func <span id="init">init</span>():  
\# Add the control as a direct child of EditorProperty node. add_child(property_control) \# Make sure the control is able to retain the focus. add_focusable(property_control) \# Setup the initial state and connect to the signal to track changes. refresh_control_text() property_control.pressed.connect(<span id="on_button_pressed">on_button_pressed</span>)

func <span id="on_button_pressed">on_button_pressed</span>():  
\# Ignore the signal if the property is currently being updated. if (updating): return

\# Generate a new random integer between 0 and 99. current_value = randi() % 100 refresh_control_text() emit_changed(get_edited_property(), current_value)

func <span id="update_property">update_property</span>():  
\# Read the current value from the property. var new_value = get_edited_object()\[get_edited_property()\] if (new_value == current_value): return

\# Update the control with the new value. updating = true current_value = new_value refresh_control_text() updating = false

func refresh_control_text():  
property_control.text = "Value: " + str(current_value)

<div class="code-tab">

csharp

</div>

// RandomIntEditor.cs \#if TOOLS using Godot;

public partial class RandomIntEditor : EditorProperty { // The main control for editing the property. private Button <span id="propertycontrol">propertyControl</span> = new Button(); // An internal value of the property. private int <span id="currentvalue">currentValue</span> = 0; // A guard against internal changes when the property is updated. private bool <span id="updating">updating</span> = false;

> public RandomIntEditor() { // Add the control as a direct child of EditorProperty node. AddChild(<span id="propertycontrol">propertyControl</span>); // Make sure the control is able to retain the focus. AddFocusable(<span id="propertycontrol">propertyControl</span>); // Setup the initial state and connect to the signal to track changes. RefreshControlText(); <span id="propertycontrol.pressed">propertyControl.Pressed</span> += OnButtonPressed; }
>
> private void OnButtonPressed() { // Ignore the signal if the property is currently being updated. if (<span id="updating">updating</span>) { return; }
>
> > // Generate a new random integer between 0 and 99. <span id="currentvalue">currentValue</span> = (int)GD.Randi() % 100; RefreshControlText(); EmitChanged(GetEditedProperty(), <span id="currentvalue">currentValue</span>);
>
> }
>
> public override void <span id="updateproperty">UpdateProperty</span>() { // Read the current value from the property. var newValue = (int)GetEditedObject().Get(GetEditedProperty()); if (newValue == <span id="currentvalue">currentValue</span>) { return; }
>
> > // Update the control with the new value. <span id="updating">updating</span> = true; <span id="currentvalue">currentValue</span> = newValue; RefreshControlText(); <span id="updating">updating</span> = false;
>
> }
>
> private void RefreshControlText() { <span id="propertycontrol.text">propertyControl.Text</span> = \$"Value: {<span id="currentvalue">currentValue</span>}"; }

} \#endif

</div>

Using the example code above you should be able to make a custom widget that replaces the default `class_SpinBox` control for integers with a `class_Button` that generates random values.
