# GD0203: The delegate signature of the signal must return void

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
<td>GD0203</td>
</tr>
<tr>
<td><strong>Category</strong></td>
<td>Usage</td>
</tr>
<tr>
<td><strong>Fix is breaking or non-breaking</strong></td>
<td><p>Breaking - If the return type is changed</p>
<p>Non-breaking - If the <code>[Signal]</code> attribute is removed</p></td>
</tr>
<tr>
<td><strong>Enabled by default</strong></td>
<td>Yes</td>
</tr>
</tbody>
</table>

## Cause

A delegate annotated with the `[Signal]` attribute has a return type when `void` was expected.

## Rule description

Every signal must return `void`. There can be multiple callbacks registered for each signal, if signal callbacks could return something it wouldn't be possible to determine which of the returned values to use.

``` csharp
// This signal delegate is invalid because it doesn't return void.
public int InvalidSignalEventHandler();

// This signal delegate is valid because it returns void.
public void ValidSignalEventHandler();
```

Take a look at the `C# signals <doc_c_sharp_signals>` documentation for more information about how to declare and use signals.

## How to fix violations

To fix a violation of this rule, change the delegate to return `void` or remove the `[Signal]` attribute from the delegate. Note that removing the attribute will mean the signal is not registered.

> [!TIP]
> If the signal doesn't need to interact with Godot, consider using [C# events](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/events/) directly. Pure C# events allow you to use any C# type for its parameters.

## When to suppress warnings

Do not suppress a warning from this rule. Signal delegates that return something will result in unexpected runtime errors.
