# GD0102: The type of the exported member is not supported

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
<td>GD0102</td>
</tr>
<tr>
<td><strong>Category</strong></td>
<td>Usage</td>
</tr>
<tr>
<td><strong>Fix is breaking or non-breaking</strong></td>
<td><p>Breaking - If the member type is changed</p>
<p>Non-breaking - If the <code>[Export]</code> attribute is removed</p></td>
</tr>
<tr>
<td><strong>Enabled by default</strong></td>
<td>Yes</td>
</tr>
</tbody>
</table>

## Cause

An unsupported type is specified for a member annotated with the `[Export]` attribute when a `Variant-compatible type <c_sharp_variant_compatible_types>` is expected.

## Rule description

Every exported member must be Variant-compatible so it can be marshalled by the engine.

``` csharp
class SomeType { }

// SomeType is not a valid member type because it doesn't derive from GodotObject,
// so it's not compatible with Variant.
[Export]
public SomeType InvalidProperty { get; set; }

// System.Int32 is a valid type because it's compatible with Variant.
[Export]
public int ValidProperty { get; set; }
```

## How to fix violations

To fix a violation of this rule, change the member's type to be Variant-compatible or remove the `[Export]` attribute.

## When to suppress warnings

Do not suppress a warning from this rule. Members with types that can't be marshalled will result in runtime errors.
