# GDScript documentation comments

In GDScript, comments can be used to document your code and add descriptions to the members of a script. There are two differences between a normal comment and a documentation comment. Firstly, a documentation comment should start with double hash symbols `##`. Secondly, it must immediately precede a script member, or for script descriptions, be placed at the top of the script. If an exported variable is documented, its description is used as a tooltip in the editor. This documentation can be generated as XML files by the editor.

## Documenting a script

Comments documenting a script must come before any member documentation. A suggested format for script documentation can be divided into three parts.

- A brief description of the script.
- Detailed description.
- Tutorials and deprecated/experimental marks.

To separate these from each other, the documentation comments use special tags. The tag must be at the beginning of a line (ignoring preceding white space) and must have the format `@`, followed by the keyword.

### Tags

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 74%" />
</colgroup>
<tbody>
<tr>
<td>Brief description</td>
<td>No tag. Lives at the very beginning of the documentation section.</td>
</tr>
<tr>
<td>Description</td>
<td>No tag. Use one blank line to separate the description from the brief.</td>
</tr>
<tr>
<td>Tutorial</td>
<td><div class="line-block"><code>@tutorial: https://example.com</code><br />
<code>@tutorial(The Title Here): https://example.com</code></div></td>
</tr>
<tr>
<td>Deprecated</td>
<td><div class="line-block"><code>@deprecated</code><br />
<code>@deprecated: Use [AnotherClass] instead.</code></div></td>
</tr>
<tr>
<td>Experimental</td>
<td><div class="line-block"><code>@experimental</code><br />
<code>@experimental: This class is unstable.</code></div></td>
</tr>
</tbody>
</table>

For example:

    extends Node2D
    ## A brief description of the class's role and functionality.
    ##
    ## The description of the script, what it can do,
    ## and any further detail.
    ##
    ## @tutorial:             https://example.com/tutorial_1
    ## @tutorial(Tutorial 2): https://example.com/tutorial_2
    ## @experimental

> [!WARNING]
> If there is any space in between the tag name and colon, for example `@tutorial  :`, it won't be treated as a valid tag and will be ignored.

> [!NOTE]
> When the description spans multiple lines, the preceding and trailing white spaces will be stripped and joined with a single space. To preserve the line break use `[br]`. See also [BBCode and class reference](#bbcode-and-class-reference) below.

## Documenting script members

Members that are applicable for documentation:

- Signal
- Enum
- Enum value
- Constant
- Variable
- Function
- Inner class

Documentation of a script member must immediately precede the member or its annotations if it has any. The description can have more than one line but every line must start with the double hash symbol `##` to be considered as part of the documentation.

### Tags

<table style="width:92%;">
<colgroup>
<col style="width: 20%" />
<col style="width: 70%" />
</colgroup>
<tbody>
<tr>
<td>Description</td>
<td>No tag.</td>
</tr>
<tr>
<td>Deprecated</td>
<td><div class="line-block"><code>@deprecated</code><br />
<code>@deprecated: Use [member another] instead.</code></div></td>
</tr>
<tr>
<td>Experimental</td>
<td><div class="line-block"><code>@experimental</code><br />
<code>@experimental: This method is incomplete.</code></div></td>
</tr>
</tbody>
</table>

For example:

    ## The description of the variable.
    ## @deprecated: Use [member other_var] instead.
    var my_var

Alternatively, you can use inline documentation comments:

    signal my_signal ## My signal.

    enum MyEnum { ## My enum.
        VALUE_A = 0, ## Value A.
        VALUE_B = 1, ## Value B.
    }

    const MY_CONST = 1 ## My constant.

    var my_var ## My variable.


    func my_func(): ## My func.
        pass


    class MyClass: ## My class.
        pass

The script documentation will update in the editor help window every time the script is updated. If any member variable or function name starts with an underscore, it will be treated as private. It will not appear in the documentation and will be ignored in the help window.

## Complete script example

    extends Node2D
    ## A brief description of the class's role and functionality.
    ##
    ## The description of the script, what it can do,
    ## and any further detail.
    ##
    ## @tutorial:             https://example.com/tutorial_1
    ## @tutorial(Tutorial 2): https://example.com/tutorial_2
    ## @experimental

    ## The description of a signal.
    signal my_signal

    ## This is a description of the below enum.
    enum Direction {
        ## Direction up.
        UP = 0,
        ## Direction down.
        DOWN = 1,
        ## Direction left.
        LEFT = 2,
        ## Direction right.
        RIGHT = 3,
    }

    ## The description of a constant.
    const GRAVITY = 9.8

    ## The description of the variable v1.
    var v1

    ## This is a multiline description of the variable v2.[br]
    ## The type information below will be extracted for the documentation.
    var v2: int

    ## If the member has any annotation, the annotation should
    ## immediately precede it.
    @export
    var v3 := some_func()


    ## As the following function is documented, even though its name starts with
    ## an underscore, it will appear in the help window.
    func _fn(p1: int, p2: String) -> int:
        return 0


    # The below function isn't documented and its name starts with an underscore
    # so it will treated as private and will not be shown in the help window.
    func _internal() -> void:
        pass


    ## Documenting an inner class.
    ##
    ## The same rules apply here. The documentation must
    ## immediately precede the class definition.
    ##
    ## @tutorial: https://example.com/tutorial
    ## @experimental
    class Inner:

        ## Inner class variable v4.
        var v4


        ## Inner class function fn.
        func fn(): pass

## `@deprecated` and `@experimental` tags

You can mark a class or any of its members as deprecated or experimental. This will add the corresponding indicator in the built-in documentation viewer. Optionally, you can provide a short message explaining why the API is not recommended. This can be especially useful for plugin and library creators.

![image](img/deprecated_and_experimental_tags.webp)

- **Deprecated** marks a non-recommended API that is subject to removal or incompatible change in a future major release. Usually the API is kept for backwards compatibility.
- **Experimental** marks a new unstable API that may be changed or removed in the current major branch. Using this API is not recommended in production code.

> [!NOTE]
> While technically you can use both `@deprecated` and `@experimental` tags on the same class/member, this is not recommended as it is against common conventions.

## BBCode and class reference

Godot's class reference supports BBCode-like tags. They add nice formatting to the text which could also be used in the documentation. See also `class reference bbcode <doc_class_reference_bbcode>`. Note that this is slightly different from the `RichTextLabel` `BBCode <doc_bbcode_in_richtextlabel>`.

Whenever you link to a member of another class, you need to specify the class name. For links to the same class, the class name is optional and can be omitted.

Here's the list of available tags:

<table style="width:99%;">
<colgroup>
<col style="width: 22%" />
<col style="width: 32%" />
<col style="width: 43%" />
</colgroup>
<thead>
<tr>
<th>Tag and Description</th>
<th>Example</th>
<th>Result</th>
</tr>
</thead>
<tbody>
<tr>
<td><div class="line-block"><code>[Class]</code><br />
Link to class</div></td>
<td><code>Move the [Sprite2D].</code></td>
<td>Move the <code class="interpreted-text" role="ref">class_Sprite2D</code>.</td>
</tr>
<tr>
<td><div class="line-block"><code>[annotation Class.name]</code><br />
Link to annotation</div></td>
<td><code>See [annotation @GDScript.@rpc].</code></td>
<td>See <code class="interpreted-text" role="ref">@GDScript.@rpc &lt;class_@GDScript_annotation_@rpc&gt;</code>.</td>
</tr>
<tr>
<td><div class="line-block"><code>[constant Class.name]</code><br />
Link to constant</div></td>
<td><code>See [constant Color.RED].</code></td>
<td>See <code class="interpreted-text" role="ref">Color.RED &lt;class_Color_constant_RED&gt;</code>.</td>
</tr>
<tr>
<td><div class="line-block"><code>[enum Class.name]</code><br />
Link to enum</div></td>
<td><code>See [enum Mesh.ArrayType].</code></td>
<td>See <code class="interpreted-text" role="ref">Mesh.ArrayType &lt;enum_Mesh_ArrayType&gt;</code>.</td>
</tr>
<tr>
<td><div class="line-block"><code>[member Class.name]</code><br />
Link to member (property)</div></td>
<td><code>Get [member Node2D.scale].</code></td>
<td>Get <code class="interpreted-text" role="ref">Node2D.scale &lt;class_Node2D_property_scale&gt;</code>.</td>
</tr>
<tr>
<td><div class="line-block"><code>[method Class.name]</code><br />
Link to method</div></td>
<td><code>Call [method Node3D.hide].</code></td>
<td>Call <code class="interpreted-text" role="ref">Node3D.hide() &lt;class_Node3D_method_hide&gt;</code>.</td>
</tr>
<tr>
<td><div class="line-block"><code>[constructor Class.name]</code><br />
Link to built-in constructor</div></td>
<td><code>Use [constructor Color.Color].</code></td>
<td>Use <code class="interpreted-text" role="ref">Color.Color &lt;class_Color_constructor_Color&gt;</code>.</td>
</tr>
<tr>
<td><div class="line-block"><code>[operator Class.name]</code><br />
Link to built-in operator</div></td>
<td><code>Use [operator Color.operator *].</code></td>
<td>Use <code class="interpreted-text" role="ref">Color.operator * &lt;class_Color_operator_mul_int&gt;</code>.</td>
</tr>
<tr>
<td><div class="line-block"><code>[signal Class.name]</code><br />
Link to signal</div></td>
<td><code>Emit [signal Node.renamed].</code></td>
<td>Emit <code class="interpreted-text" role="ref">Node.renamed &lt;class_Node_signal_renamed&gt;</code>.</td>
</tr>
<tr>
<td><div class="line-block"><code>[theme_item Class.name]</code><br />
Link to theme item</div></td>
<td><code>See [theme_item Label.font].</code></td>
<td>See <code class="interpreted-text" role="ref">Label.font &lt;class_Label_theme_font_font&gt;</code>.</td>
</tr>
<tr>
<td><div class="line-block"><code>[param name]</code><br />
Parameter name (as code)</div></td>
<td><code>Takes [param size] for the size.</code></td>
<td>Takes <code>size</code> for the size.</td>
</tr>
<tr>
<td><div class="line-block"><code>[br]</code><br />
Line break</div></td>
<td><div class="line-block"><code>Line 1.[br]</code><br />
<code>Line 2.</code></div></td>
<td><div class="line-block">Line 1.<br />
Line 2.</div></td>
</tr>
<tr>
<td><div class="line-block"><code>[lb]</code> <code>[rb]</code><br />
<code>[</code> and <code>]</code> respectively</div></td>
<td><code>[lb]b[rb]text[lb]/b[rb]</code></td>
<td>[b]text[/b]</td>
</tr>
<tr>
<td><div class="line-block"><code>[b]</code> <code>[/b]</code><br />
Bold</div></td>
<td><code>Do [b]not[/b] call this method.</code></td>
<td>Do <strong>not</strong> call this method.</td>
</tr>
<tr>
<td><div class="line-block"><code>[i]</code> <code>[/i]</code><br />
Italic</div></td>
<td><code>Returns the [i]global[/i] position.</code></td>
<td>Returns the <em>global</em> position.</td>
</tr>
<tr>
<td><div class="line-block"><code>[u]</code> <code>[/u]</code><br />
Underline</div></td>
<td><code>[u]Always[/u] use this method.</code></td>
<td><u>Always</u> use this method.</td>
</tr>
<tr>
<td><div class="line-block"><code>[s]</code> <code>[/s]</code><br />
Strikethrough</div></td>
<td><code>[s]Outdated information.[/s]</code></td>
<td><s>Outdated information.</s></td>
</tr>
<tr>
<td><div class="line-block"><code>[color]</code> <code>[/color]</code><br />
Color</div></td>
<td><code>[color=red]Error![/color]</code></td>
<td><span style="color:red;">Error!</span></td>
</tr>
<tr>
<td><div class="line-block"><code>[font]</code> <code>[/font]</code><br />
Font</div></td>
<td><code>[font=res://mono.ttf]LICENSE[/font]</code></td>
<td><span style="font-family:monospace;">LICENSE</span></td>
</tr>
<tr>
<td><div class="line-block"><code>[img]</code> <code>[/img]</code><br />
Image</div></td>
<td><code>[img width=32]res://icon.svg[/img]</code></td>
<td><img src="img/icon.svg" width="32" alt="image" /></td>
</tr>
<tr>
<td><div class="line-block"><code>[url]</code> <code>[/url]</code><br />
Hyperlink</div></td>
<td><div class="line-block"><code>[url]https://example.com[/url]</code><br />
<code>[url=https://example.com]Website[/url]</code></div></td>
<td><div class="line-block"><a href="https://example.com">https://example.com</a><br />
<a href="https://example.com">Website</a></div></td>
</tr>
<tr>
<td><div class="line-block"><code>[center]</code> <code>[/center]</code><br />
Horizontal centering</div></td>
<td><code>[center]2 + 2 = 4[/center]</code></td>
<td><center>2 + 2 = 4</center></td>
</tr>
<tr>
<td><div class="line-block"><code>[kbd]</code> <code>[/kbd]</code><br />
Keyboard/mouse shortcut</div></td>
<td><code>Press [kbd]Ctrl + C[/kbd].</code></td>
<td>Press <code class="interpreted-text" role="kbd">Ctrl + C</code>.</td>
</tr>
<tr>
<td><div class="line-block"><code>[code]</code> <code>[/code]</code><br />
Inline code fragment</div></td>
<td><code>Returns [code]true[/code].</code></td>
<td>Returns <code>true</code>.</td>
</tr>
<tr>
<td><div class="line-block"><code>[codeblock]</code><br />
<code>[/codeblock]</code><br />
Multiline code block</div></td>
<td><em>See below.</em></td>
<td><em>See below.</em></td>
</tr>
</tbody>
</table>

<div class="note">

<div class="title">

Note

</div>

1.  Currently only `class_@GDScript` has annotations.
2.  `[kbd]` disables BBCode until the parser encounters `[/kbd]`.
3.  `[code]` disables BBCode until the parser encounters `[/code]`.
4.  `[codeblock]` disables BBCode until the parser encounters `[/codeblock]`.

</div>

> [!WARNING]
> Use `[codeblock]` for pre-formatted code blocks. Inside `[codeblock]`, always use **four spaces** for indentation (the parser will delete tabs).

    ## Do something for this plugin. Before using the method
    ## you first have to [method initialize] [MyPlugin].[br]
    ## [color=yellow]Warning:[/color] Always [method clean] after use.[br]
    ## Usage:
    ## [codeblock]
    ## func _ready():
    ##     the_plugin.initialize()
    ##     the_plugin.do_something()
    ##     the_plugin.clean()
    ## [/codeblock]
    func do_something():
        pass

By default, `[codeblock]` highlights GDScript syntax. You can change it using the `lang` attribute. Currently supported options are:

- `[codeblock lang=text]` disables syntax highlighting;
- `[codeblock lang=gdscript]` highlights GDScript syntax;
- `[codeblock lang=csharp]` highlights C# syntax (only in .NET version).
