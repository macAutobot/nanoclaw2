# GD0101: The exported member is static

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
<td>GD0101</td>
</tr>
<tr>
<td><strong>Category</strong></td>
<td>Usage</td>
</tr>
<tr>
<td><strong>Fix is breaking or non-breaking</strong></td>
<td><p>Breaking - If the <code>static</code> keyword is removed</p>
<p>Non-breaking - If the <code>[Export]</code> attribute is removed</p></td>
</tr>
<tr>
<td><strong>Enabled by default</strong></td>
<td>Yes</td>
</tr>
</tbody>
</table>

## Cause

A static member is annotated with the `[Export]` attribute. Static members can't be exported.

## Rule description

Godot doesn't allow exporting static members.

``` csharp
// Static members can't be exported.
[Export]
public static int InvalidProperty { get; set; }

// Instance members can be exported.
[Export]
public int ValidProperty { get; set; }
```

## How to fix violations

To fix a violation of this rule, remove the `[Export]` attribute or remove the `static` keyword.

## When to suppress warnings

Do not suppress a warning from this rule. Static members can't be exported so they will be ignored by Godot, resulting in runtime errors.
