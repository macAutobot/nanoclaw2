# GD0401: The class must derive from Godot.GodotObject or a derived class

<table>
<thead>
<tr>
<th></th>
<th>Value</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>Rule ID</strong></td>
<td>GD0401</td>
</tr>
<tr>
<td><strong>Category</strong></td>
<td>Usage</td>
</tr>
<tr>
<td><strong>Fix is breaking or non-breaking</strong></td>
<td><p>Breaking - If changing the inheritance chain</p>
<p>Non-breaking - If removing the <code>[GlobalClass]</code> attribute</p></td>
</tr>
<tr>
<td><strong>Enabled by default</strong></td>
<td>Yes</td>
</tr>
</tbody>
</table>

## Cause

A type annotated with the `[GlobalClass]` attribute does not derive from `GodotObject`.

## Rule description

The `[GlobalClass]` has no effect for types that don't derive from `GodotObject`. Every `global class <doc_c_sharp_global_classes>` must ultimately derive from `GodotObject` so it can be marshalled.

``` csharp
// This type is not registered as a global class because it doesn't derive from GodotObject.
[GlobalClass]
class SomeType { }

// This type is a global class because it derives from Godot.Node
// which ultimately derives from GodotObject.
[GlobalClass]
class MyNode : Node { }

// This type is a global class because it derives from Godot.Resource
// which ultimately derives from GodotObject.
[GlobalClass]
class MyResource : Resource { }
```

## How to fix violations

To fix a violation of this rule, change the type to derive from `GodotObject` or remove the `[GlobalClass]` attribute.

## When to suppress warnings

Do not suppress a warning from this rule. Adding the `[GlobalClass]` to a type that doesn't derive from `GodotObject` is an easy mistake to make and this warning helps users realize that it may result in unexpected errors.
