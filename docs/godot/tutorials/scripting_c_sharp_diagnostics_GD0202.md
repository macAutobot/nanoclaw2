# GD0202: The parameter of the delegate signature of the signal is not supported

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
<td>GD0202</td>
</tr>
<tr>
<td><strong>Category</strong></td>
<td>Usage</td>
</tr>
<tr>
<td><strong>Fix is breaking or non-breaking</strong></td>
<td><p>Breaking - If the parameter type is changed</p>
<p>Non-breaking - If the <code>[Signal]</code> attribute is removed</p></td>
</tr>
<tr>
<td><strong>Enabled by default</strong></td>
<td>Yes</td>
</tr>
</tbody>
</table>

## Cause

An unsupported type is specified for a parameter of a delegate annotated with the `[Signal]` attribute when a `Variant-compatible type <c_sharp_variant_compatible_types>` is expected.

## Rule description

Every signal parameter must be Variant-compatible so it can be marshalled when emitting the signal and invoking the callbacks.

``` csharp
class SomeType { }

// SomeType is not a valid parameter type because it doesn't derive from GodotObject,
// so it's not compatible with Variant.
public void InvalidSignalEventHandler(SomeType someType);

// System.Int32 is a valid type because it's compatible with Variant.
public void ValidSignalEventHandler(int someInt);
```

Take a look at the `C# signals <doc_c_sharp_signals>` documentation for more information about how to declare and use signals.

## How to fix violations

To fix a violation of this rule, change the parameter type to be Variant-compatible or remove the `[Signal]` attribute from the delegate. Note that removing the attribute will mean the signal is not registered.

> [!TIP]
> If the signal doesn't need to interact with Godot, consider using [C# events](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/events/) directly. Pure C# events allow you to use any C# type for its parameters.

## When to suppress warnings

Do not suppress a warning from this rule. Signal delegates with parameters that can't be marshalled will result in runtime errors when emitting the signal or invoking the callbacks.
