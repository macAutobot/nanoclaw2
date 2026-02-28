# GD0110: The exported tool button is not a Callable

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
<td>GD0110</td>
</tr>
<tr>
<td><strong>Category</strong></td>
<td>Usage</td>
</tr>
<tr>
<td><strong>Fix is breaking or non-breaking</strong></td>
<td><p>Breaking - If the property's type is changed to <code>Callable</code></p>
<p>Non-breaking - If the <code>[ExportToolButton]</code> is replaced with <code>[Export]</code></p></td>
</tr>
<tr>
<td><strong>Enabled by default</strong></td>
<td>Yes</td>
</tr>
</tbody>
</table>

## Cause

A property of a type different from `Callable` is annotated with the `[ExportToolButton]` attribute.

## Rule description

The `[ExportToolButton]` attribute is used to create clickable buttons in the inspector so, the property must be a `Callable` that will be executed when clicking the button.

## How to fix violations

To fix a violation of this rule, change the type of the property to `Callable`. Alternatively, if you intended to export a normal property, replace the `[ExportToolButton]` attribute with `[Export]`.

## When to suppress warnings

Do not suppress a warning from this rule. The exported property must be a `Callable` so it can executed in the editor when clicking the button in the inspector.
