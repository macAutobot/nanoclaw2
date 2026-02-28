# BBCode in RichTextLabel

## Introduction

`class_Label` nodes are great for displaying basic text, but they have limitations. If you want to change the color of the text, or its alignment, you can only do that to the entire label. You can't make a part of the text have another color, or have a part of the text centered. To get around these limitations, you would use a `class_RichTextLabel`.

`class_RichTextLabel` allows for complex formatting of text using a markup syntax or the built-in API. It uses BBCodes for the markup syntax, a system of tags that designate formatting rules for a part of the text. You may be familiar with them if you ever used forums (also known as <span class="title-ref">bulletin boards</span>, hence the "BB" in "BBCode").

Unlike Label, RichTextLabel also comes with its own vertical scrollbar. This scrollbar is automatically displayed if the text does not fit within the control's size. The scrollbar can be disabled by unchecking the **Scroll Active** property in the RichTextLabel inspector.

Note that the BBCode tags can also be used to some extent for other use cases:

- BBCode can be used to `format comments in the XML source of the class reference <doc_class_reference_bbcode>`.
- BBCode can be used in `GDScript documentation comments <doc_gdscript_documentation_comments_bbcode_and_class_reference>`.
- BBCode can be used when `printing rich text to the Output bottom panel <doc_output_panel_printing_rich_text>`.

<div class="seealso">

You can see how BBCode in RichTextLabel works in action using the [Rich Text Label with BBCode demo project](https://github.com/godotengine/godot-demo-projects/tree/master/gui/rich_text_bbcode).

</div>

## Using BBCode

By default, `class_RichTextLabel` functions like a normal `class_Label`. It has the `property_text <class_RichTextLabel_property_text>` property, which you can edit to have uniformly formatted text. To be able to use BBCode for rich text formatting, you need to turn on the BBCode mode by setting `bbcode_enabled <class_RichTextLabel_property_bbcode_enabled>`. After that, you can edit the `text <class_RichTextLabel_property_text>` property using available tags. Both properties are located at the top of the inspector after selecting a RichTextLabel node.

![image](img/bbcode_in_richtextlabel_inspector.webp)

For example, `BBCode [color=green]test[/color]` would render the word "test" with a green color.

![image](img/bbcode_in_richtextlabel_basic_example.webp)

Most BBCodes consist of 3 parts: the opening tag, the content and the closing tag. The opening tag delimits the start of the formatted part, and can also carry some configuration options. Some opening tags, like the `color` one shown above, also require a value to work. Other opening tags may accept multiple options (separated by spaces within the opening tag). The closing tag delimits the end of the formatted part. In some cases, both the closing tag and the content can be omitted.

Unlike BBCode in HTML, leading/trailing whitespace is not removed by a RichTextLabel upon display. Duplicate spaces are also displayed as-is in the final output. This means that when displaying a code block in a RichTextLabel, you don't need to use a preformatted text tag.

``` none
[tag]content[/tag]
[tag=value]content[/tag]
[tag option1=value1 option2=value2]content[/tag]
[tag][/tag]
[tag]
```

> [!NOTE]
> RichTextLabel doesn't support entangled BBCode tags. For example, instead of using:
>
>     [b]bold[i]bold italic[/b]italic[/i]
>
> Use:
>
>     [b]bold[i]bold italic[/i][/b][i]italic[/i]

## Handling user input safely

In a scenario where users may freely input text (such as chat in a multiplayer game), you should make sure users cannot use arbitrary BBCode tags that will be parsed by RichTextLabel. This is to avoid inappropriate use of formatting, which can be problematic if `[url]` tags are handled by your RichTextLabel (as players may be able to create clickable links to phishing sites or similar).

Using RichTextLabel's `[lb]` and/or `[rb]` tags, we can replace the opening and/or closing brackets of any BBCode tag in a message with those escaped tags. This prevents users from using BBCode that will be parsed as tags – instead, the BBCode will be displayed as text.

<figure class="align-center">
<img src="img/bbcode_in_richtextlabel_escaping_user_input.webp" alt="Example of unescaped user input resulting in BBCode injection (2nd line) and escaped user input (3rd line)" />
<figcaption aria-hidden="true">Example of unescaped user input resulting in BBCode injection (2nd line) and escaped user input (3rd line)</figcaption>
</figure>

The above image was created using the following script:

    extends RichTextLabel

    func _ready():
        append_chat_line("Player 1", "Hello world!")
        append_chat_line("Player 2", "Hello [color=red]BBCode injection[/color] (no escaping)!")
        append_chat_line_escaped("Player 2", "Hello [color=red]BBCode injection[/color] (with escaping)!")


    # Returns escaped BBCode that won't be parsed by RichTextLabel as tags.
    func escape_bbcode(bbcode_text):
        # We only need to replace opening brackets to prevent tags from being parsed.
        return bbcode_text.replace("[", "[lb]")


    # Appends the user's message as-is, without escaping. This is dangerous!
    func append_chat_line(username, message):
        append_text("%s: [color=green]%s[/color]\n" % [username, message])


    # Appends the user's message with escaping.
    # Remember to escape both the player name and message contents.
    func append_chat_line_escaped(username, message):
        append_text("%s: [color=green]%s[/color]\n" % [escape_bbcode(username), escape_bbcode(message)])

## Stripping BBCode tags

For certain use cases, it can be desired to remove BBCode tags from the string. This is useful when displaying the RichTextLabel's text in another Control that does not support BBCode (such as a tooltip):

``` 
extends RichTextLabel

func _ready():
    var regex = RegEx.new()
    regex.compile("\\[.*?\\]")
    var text_without_tags = regex.sub(text, "", true)
    # `text_without_tags` contains the text with all BBCode tags removed.
```

> [!NOTE]
> Removing BBCode tags entirely isn't advised for user input, as it can modify the displayed text without users understanding why part of their message was removed. `Escaping user input <doc_bbcode_in_richtextlabel_handling_user_input_safely>` should be preferred instead.

## Performance

In most cases, you can use BBCode directly as-is since text formatting is rarely a heavy task. However, with particularly large RichTextLabels (such as console logs spanning thousands of lines), you may encounter stuttering during gameplay when the RichTextLabel's text is updated.

There are several ways to alleviate this:

- Use the `append_text()` function instead of appending to the `text` property. This function will only parse BBCode for the added text, rather than parsing BBCode from the entire `text` property.
- Use `push_[tag]()` and `pop()` functions to add tags to RichTextLabel instead of using BBCode.
- Enable the **Threading \> Threaded** property in RichTextLabel. This won't speed up processing, but it will prevent the main thread from blocking, which avoids stuttering during gameplay. Only enable threading if it's actually needed in your project, as threading has some overhead.

## Using [push]()\[tag\]() and pop() functions instead of BBCode

If you don't want to use BBCode for performance reasons, you can use functions provided by RichTextLabel to create formatting tags without writing BBCode in the text.

Every BBCode tag (including effects) has a `push_[tag]()` function (where `[tag]` is the tag's name). There are also a few convenience functions available, such as `push_bold_italics()` that combines both `push_bold()` and `push_italics()` into a single tag. See the `RichTextLabel class reference <class_RichTextLabel>` for a complete list of `push_[tag]()` functions.

The `pop()` function is used to end *any* tag. Since BBCode is a tag *stack*, using `pop()` will close the most recently started tags first.

The following script will result in the same visual output as using `BBCode [color=green]test [i]example[/i][/color]`:

    extends RichTextLabel

    func _ready():
        append_text("BBCode ")  # Trailing space separates words from each other.
        push_color(Color.GREEN)
        append_text("test ")  # Trailing space separates words from each other.
        push_italics()
        append_text("example")
        pop()  # Ends the tag opened by `push_italics()`.
        pop()  # Ends the tag opened by `push_color()`.

> [!WARNING]
> Do **not** set the `text` property directly when using formatting functions. Appending to the `text` property will erase all modifications made to the RichTextLabel using the `append_text()`, `push_[tag]()` and `pop()` functions.

## Reference

<div class="seealso">

*Some* of these BBCode tags can be used in tooltips for `@export` script variables as well as in the XML source of the class reference. For more information, see `Class reference BBCode <doc_class_reference_bbcode>`.

</div>

<table>
<colgroup>
<col style="width: 60%" />
<col style="width: 40%" />
</colgroup>
<tbody>
<tr>
<td>Tag</td>
<td>Example</td>
</tr>
<tr>
<td><div class="line-block"><strong>b</strong><br />
Makes <code>{text}</code> use the bold (or bold italics) font of <code>RichTextLabel</code>.</div></td>
<td><code>[b]{text}[/b]</code></td>
</tr>
<tr>
<td><div class="line-block"><strong>i</strong><br />
Makes <code>{text}</code> use the italics (or bold italics) font of <code>RichTextLabel</code>.</div></td>
<td><code>[i]{text}[/i]</code></td>
</tr>
<tr>
<td><div class="line-block"><strong>u</strong><br />
Makes <code>{text}</code> underlined.</div></td>
<td><code>[u]{text}[/u]</code> <code>[u color={color}]{text}[/u]</code></td>
</tr>
<tr>
<td><div class="line-block"><strong>s</strong><br />
Makes <code>{text}</code> strikethrough.</div></td>
<td><code>[s]{text}[/s]</code> <code>[s color={color}]{text}[/s]</code></td>
</tr>
<tr>
<td><div class="line-block"><strong>code</strong><br />
Makes <code>{text}</code> use the mono font of <code>RichTextLabel</code>.</div></td>
<td><code>[code]{text}[/code]</code></td>
</tr>
<tr>
<td><div class="line-block"><strong>char</strong><br />
Adds Unicode character with hexadecimal UTF-32 <code>{codepoint}</code>.</div></td>
<td><code>[char={codepoint}]</code></td>
</tr>
<tr>
<td><div class="line-block"><strong>p</strong><br />
Adds new paragraph with <code>{text}</code>. Supports configuration options, see <code class="interpreted-text" role="ref">doc_bbcode_in_richtextlabel_paragraph_options</code>.</div></td>
<td><div class="line-block"><code>[p]{text}[/p]</code><br />
<code>[p {options}]{text}[/p]</code></div></td>
</tr>
<tr>
<td><div class="line-block"><strong>br</strong><br />
Adds line break in a text, without adding a new paragraph. If used within a list, this won't create a new list item, but will add a line break within the current item instead.</div></td>
<td><code>[br]</code></td>
</tr>
<tr>
<td><div class="line-block"><strong>hr</strong><br />
Adds new a horizontal rule to separate content. Supports configuration options, see <code class="interpreted-text" role="ref">doc_bbcode_in_richtextlabel_hr_options</code>.</div></td>
<td><div class="line-block"><code>[hr]</code><br />
<code>[hr {options}]</code></div></td>
</tr>
<tr>
<td><div class="line-block"><strong>center</strong><br />
Makes <code>{text}</code> horizontally centered.<br />
Same as <code>[p align=center]</code>.</div></td>
<td><code>[center]{text}[/center]</code></td>
</tr>
<tr>
<td><div class="line-block"><strong>left</strong><br />
Makes <code>{text}</code> horizontally left-aligned.<br />
Same as <code>[p align=left]</code>.</div></td>
<td><code>[left]{text}[/left]</code></td>
</tr>
<tr>
<td><div class="line-block"><strong>right</strong><br />
Makes <code>{text}</code> horizontally right-aligned.<br />
Same as <code>[p align=right]</code>.</div></td>
<td><code>[right]{text}[/right]</code></td>
</tr>
<tr>
<td><div class="line-block"><strong>fill</strong><br />
Makes <code>{text}</code> fill the full width of <code>RichTextLabel</code>.<br />
Same as <code>[p align=fill]</code>.</div></td>
<td><code>[fill]{text}[/fill]</code></td>
</tr>
<tr>
<td><div class="line-block"><strong>indent</strong><br />
Indents <code>{text}</code> once. The indentation width is the same as with <code>[ul]</code> or <code>[ol]</code>, but without a bullet point.</div></td>
<td><code>[indent]{text}[/indent]</code></td>
</tr>
<tr>
<td><div class="line-block"><strong>url</strong><br />
Creates a hyperlink (underlined and clickable text). Can contain optional <code>{text}</code> or display <code>{link}</code> as is. Supports configuration options, see <code class="interpreted-text" role="ref">doc_bbcode_in_richtextlabel_url_options</code>.<br />
<strong>Must be handled with the "meta_clicked" signal to have an effect,</strong> see <code class="interpreted-text" role="ref">doc_bbcode_in_richtextlabel_handling_url_tag_clicks</code>.</div></td>
<td><div class="line-block"><code>[url]{link}[/url]</code><br />
<code>[url={link}]{text}[/url]</code><br />
<code>[url {options}]{text}[/url]</code></div></td>
</tr>
<tr>
<td><div class="line-block"><strong>hint</strong><br />
Creates a tooltip hint that is displayed when hovering the text with the mouse. While not required, it's recommended to put tooltip text between double or single quotes. Note that it is not possible to escape quotes using <code>\"</code> or <code>\'</code>. To use single quotes for apostrophes in the hint string, you must use double quotes to surround the string.</div></td>
<td><div class="line-block"><code>[hint="{tooltip text displayed on hover}"]{text}[/hint]</code></div></td>
</tr>
<tr>
<td><div class="line-block"><strong>img</strong><br />
Inserts an image from the <code>{path}</code> (can be any valid <code class="interpreted-text" role="ref">class_Texture2D</code> resource).<br />
If <code>{width}</code> is provided, the image will try to fit that width maintaining the aspect ratio.<br />
If both <code>{width}</code> and <code>{height}</code> are provided, the image will be scaled to that size.<br />
Add <code>%</code> to the end of <code>{width}</code> or <code>{height}</code> value to specify it as percentages of the control width instead of pixels.<br />
If <code>{valign}</code> configuration is provided, the image will try to align to the surrounding text, see <code class="interpreted-text" role="ref">doc_bbcode_in_richtextlabel_image_and_table_alignment</code>.<br />
Supports configuration options, see <code class="interpreted-text" role="ref">doc_bbcode_in_richtextlabel_image_options</code>.</div></td>
<td><div class="line-block"><code>[img]{path}[/img]</code><br />
<code>[img={width}]{path}[/img]</code><br />
<code>[img={width}x{height}]{path}[/img]</code><br />
<code>[img={valign}]{path}[/img]</code><br />
<code>[img {options}]{path}[/img]</code></div></td>
</tr>
<tr>
<td><div class="line-block"><strong>font</strong><br />
Makes <code>{text}</code> use a font resource from the <code>{path}</code>.<br />
Supports configuration options, see <code class="interpreted-text" role="ref">doc_bbcode_in_richtextlabel_font_options</code>.</div></td>
<td><div class="line-block"><code>[font={path}]{text}[/font]</code><br />
<code>[font {options}]{text}[/font]</code></div></td>
</tr>
<tr>
<td><div class="line-block"><strong>font_size</strong><br />
Use custom font size for <code>{text}</code>.</div></td>
<td><code>[font_size={size}]{text}[/font_size]</code></td>
</tr>
<tr>
<td><div class="line-block"><strong>dropcap</strong><br />
Use a different font size and color for <code>{text}</code>, while making the tag's contents span multiple lines if it's large enough.<br />
A <a href="https://www.computerhope.com/jargon/d/dropcap.htm">drop cap</a> is typically one uppercase character, but <code>[dropcap]</code> supports containing multiple characters. <code>margins</code> values are comma-separated and can be positive, zero or negative. Values must <strong>not</strong> be separated by spaces; otherwise, the values won't be parsed correctly. Negative top and bottom margins are particularly useful to allow the rest of the paragraph to display below the dropcap.</div></td>
<td><code>[dropcap font={font} font_size={size} color={color} outline_size={size} outline_color={color} margins={left},{top},{right},{bottom}]{text}[/dropcap]</code></td>
</tr>
<tr>
<td><div class="line-block"><strong>opentype_features</strong><br />
Enables custom OpenType font features for <code>{text}</code>. Features must be provided as a comma-separated <code>{list}</code>. Values must <strong>not</strong> be separated by spaces; otherwise, the list won't be parsed correctly.</div></td>
<td><div class="line-block"><code>[opentype_features={list}]</code><br />
<code>{text}</code><br />
<code>[/opentype_features]</code></div></td>
</tr>
<tr>
<td><div class="line-block"><strong>lang</strong><br />
Overrides the language for <code>{text}</code> that is set by the <strong>BiDi &gt; Language</strong> property in <code class="interpreted-text" role="ref">class_RichTextLabel</code>. <code>{code}</code> must be an ISO <code class="interpreted-text" role="ref">language code &lt;doc_locales&gt;</code>. This can be used to enforce the use of a specific script for a language without starting a new paragraph. Some font files may contain script-specific substitutes, in which case they will be used.</div></td>
<td><code>[lang={code}]{text}[/lang]</code></td>
</tr>
<tr>
<td><div class="line-block"><strong>color</strong><br />
Changes the color of <code>{text}</code>. Color must be provided by a common name (see <code class="interpreted-text" role="ref">doc_bbcode_in_richtextlabel_named_colors</code>) or using the HEX format (e.g. <code>#ff00ff</code>, see <code class="interpreted-text" role="ref">doc_bbcode_in_richtextlabel_hex_colors</code>).</div></td>
<td><code>[color={code/name}]{text}[/color]</code></td>
</tr>
<tr>
<td><div class="line-block"><strong>bgcolor</strong><br />
Draws the color behind <code>{text}</code>. This can be used to highlight text. Accepts same values as the <code>color</code> tag. By default, there is a slight padding which is controlled by the <code>text_highlight_h_padding</code> and <code>text_highlight_v_padding</code> theme items in the RichTextLabel node. Set padding to <code>0</code> to avoid potential overlapping issues when there are background colors on neighboring lines/columns.</div></td>
<td><code>[bgcolor={code/name}]{text}[/bgcolor]</code></td>
</tr>
<tr>
<td><div class="line-block"><strong>fgcolor</strong><br />
Draws the color in front of <code>{text}</code>. This can be used to "redact" text by using an opaque foreground color. Accepts same values as the <code>color</code> tag. By default, there is a slight padding which is controlled by the <code>text_highlight_h_padding</code> and <code>text_highlight_v_padding</code> theme items in the RichTextLabel node. Set padding to <code>0</code> to avoid potential overlapping issues when there are foreground colors on neighboring lines/columns.</div></td>
<td><code>[fgcolor={code/name}]{text}[/fgcolor]</code></td>
</tr>
<tr>
<td><div class="line-block"><strong>outline_size</strong><br />
Use custom font outline size for <code>{text}</code>.</div></td>
<td><div class="line-block"><code>[outline_size={size}]</code><br />
<code>{text}</code><br />
<code>[/outline_size]</code></div></td>
</tr>
<tr>
<td><div class="line-block"><strong>outline_color</strong><br />
Use custom outline color for <code>{text}</code>. Accepts same values as the <code>color</code> tag.</div></td>
<td><div class="line-block"><code>[outline_color={code/name}]</code><br />
<code>{text}</code><br />
<code>[/outline_color]</code></div></td>
</tr>
<tr>
<td><div class="line-block"><strong>table</strong><br />
Creates a table with the <code>{number}</code> of columns. Use the <code>cell</code> tag to define table cells.<br />
If <code>{valign}</code> configuration is provided, the table will try to align to the surrounding text, see <code class="interpreted-text" role="ref">doc_bbcode_in_richtextlabel_image_and_table_alignment</code>.<br />
If baseline alignment is used, the table is aligned to the baseline of the row with index <code>{alignment_row}</code> (zero-based).<br />
<code>{name}</code> is a table name for assistive apps (screen reader).</div></td>
<td><div class="line-block"><code>[table={number}]{cells}[/table]</code><br />
<code>[table={number},{valign}]{cells}[/table]</code><br />
<code>[table={number},{valign},{alignment_row}]{cells}[/table]</code><br />
<code>[table={number},{valign},{alignment_row} name={name}]{cells}[/table]</code></div></td>
</tr>
<tr>
<td><div class="line-block"><strong>cell</strong><br />
Adds a cell with <code>{text}</code> to the table.<br />
If <code>{ratio}</code> is provided, the cell will try to expand to that value proportionally to other cells and their ratio values.<br />
Supports configuration options, see <code class="interpreted-text" role="ref">doc_bbcode_in_richtextlabel_cell_options</code>.</div></td>
<td><div class="line-block"><code>[cell]{text}[/cell]</code><br />
<code>[cell={ratio}]{text}[/cell]</code><br />
<code>[cell {options}]{text}[/cell]</code></div></td>
</tr>
<tr>
<td><div class="line-block"><strong>ul</strong><br />
Adds an unordered list. List <code>{items}</code> must be provided by putting one item per line of text.<br />
The bullet point can be customized using the <code>{bullet}</code> parameter, see <code class="interpreted-text" role="ref">doc_bbcode_in_richtextlabel_unordered_list_bullet</code>.</div></td>
<td><div class="line-block"><code>[ul]{items}[/ul]</code><br />
<code>[ul bullet={bullet}]{items}[/ul]</code></div></td>
</tr>
<tr>
<td><div class="line-block"><strong>ol</strong><br />
Adds an ordered (numbered) list of the given <code>{type}</code> (see <code class="interpreted-text" role="ref">doc_bbcode_in_richtextlabel_list_types</code>). List <code>{items}</code> must be provided by putting one item per line of text.</div></td>
<td><code>[ol type={type}]{items}[/ol]</code></td>
</tr>
<tr>
<td><div class="line-block"><strong>lb</strong>, <strong>rb</strong><br />
Adds <code>[</code> and <code>]</code> respectively. Allows escaping BBCode markup.<br />
These are self-closing tags, which means you do not need to close them (and there is no <code>[/lb]</code> or <code>[/rb]</code> closing tag).</div></td>
<td><div class="line-block"><code>[lb]b[rb]text[lb]/b[rb]</code> will display as <code>[b]text[/b]</code>.</div></td>
</tr>
<tr>
<td><div class="line-block">Several Unicode control characters can be added using their own self-closing tags.<br />
This can result in easier maintenance compared to pasting those<br />
control characters directly in the text.</div></td>
<td><div class="line-block"><code>[lrm]</code> (left-to-right mark), <code>[rlm]</code> (right-to-left mark), <code>[lre]</code> (left-to-right embedding),<br />
<code>[rle]</code> (right-to-left embedding), <code>[lro]</code> (left-to-right override), <code>[rlo]</code> (right-to-left override),<br />
<code>[pdf]</code> (pop directional formatting), <code>[alm]</code> (Arabic letter mark), <code>[lri]</code> (left-to-right isolate),<br />
<code>[rli]</code> (right-to-left isolate), <code>[fsi]</code> (first strong isolate), <code>[pdi]</code> (pop directional isolate),<br />
<code>[zwj]</code> (zero-width joiner), <code>[zwnj]</code> (zero-width non-joiner), <code>[wj]</code> (word joiner),<br />
<code>[shy]</code> (soft hyphen)</div></td>
</tr>
</tbody>
</table>

> [!NOTE]
> Tags for bold (`[b]`) and italics (`[i]`) formatting work best if the appropriate custom fonts are set up in the RichTextLabelNode's theme overrides. If no custom bold or italic fonts are defined, [faux bold and italic fonts](https://fonts.google.com/knowledge/glossary/faux_fake_pseudo_synthesized) will be generated by Godot. These fonts rarely look good in comparison to hand-made bold/italic font variants.
>
> The monospaced (`[code]`) tag **only** works if a custom font is set up in the RichTextLabel node's theme overrides. Otherwise, monospaced text will use the regular font.
>
> There are no BBCode tags to control vertical centering of text yet.
>
> Options can be skipped for all tags.

### Paragraph options

- **align**

  |  |  |
  |----|----|
  | <span class="title-ref">Values</span> | `left` (or `l`), `center` (or `c`), `right` (or `r`), `fill` (or `f`) |
  | <span class="title-ref">Default</span> | `left` |

  Text horizontal alignment.

- **bidi_override**, **st**

  |  |  |
  |----|----|
  | <span class="title-ref">Values</span> | `default` (of `d`), `uri` (or `u`), `file` (or `f`), `email` (or `e`), `list` (or `l`), `none` (or `n`), `custom` (or `c`) |
  | <span class="title-ref">Default</span> | `default` |

  Structured text override.

- **justification_flags**, **jst**

  |  |  |
  |----|----|
  | <span class="title-ref">Values</span> | Comma-separated list of the following values (no space after each comma): `kashida` (or `k`), `word` (or `w`), `trim` (or `tr`), `after_last_tab` (or `lt`), `skip_last` (or `sl`), `skip_last_with_chars` (or `sv`), `do_not_skip_single` (or `ns`). |
  | <span class="title-ref">Default</span> | `word,kashida,skip_last,do_not_skip_single` |

  Justification (fill alignment) option. See `class_TextServer` for more details.

- **direction**, **dir**

  |  |  |
  |----|----|
  | <span class="title-ref">Values</span> | `ltr` (or `l`), `rtl` (or `r`), `auto` (or `a`) |
  | <span class="title-ref">Default</span> | Inherit |

  Base BiDi direction.

- **language**, **lang**

  |  |  |
  |----|----|
  | <span class="title-ref">Values</span> | ISO language codes. See `doc_locales` |
  | <span class="title-ref">Default</span> | Inherit |

  Locale override. Some font files may contain script-specific substitutes, in which case they will be used.

- **tab_stops**

  |  |  |
  |----|----|
  | <span class="title-ref">Values</span> | List of floating-point numbers, e.g. `10.0,30.0` |
  | <span class="title-ref">Default</span> | Width of the space character in the font |

  Overrides the horizontal offsets for each tab character. When the end of the list is reached, the tab stops will loop over. For example, if you set `tab_stops` to `10.0,30.0`, the first tab will be at `10` pixels, the second tab will be at `10 + 30 = 40` pixels, and the third tab will be at `10 + 30 + 10 = 50` pixels from the origin of the RichTextLabel.

### Handling `[url]` tag clicks

By default, `[url]` tags do nothing when clicked. This is to allow flexible use of `[url]` tags rather than limiting them to opening URLs in a web browser.

To handle clicked `[url]` tags, connect the `RichTextLabel` node's `meta_clicked <class_RichTextLabel_signal_meta_clicked>` signal to a script function.

For example, the following method can be connected to `meta_clicked` to open clicked URLs using the user's default web browser:

    # This assumes RichTextLabel's `meta_clicked` signal was connected to
    # the function below using the signal connection dialog.
    func _richtextlabel_on_meta_clicked(meta):
        # `meta` is not guaranteed to be a String, so convert it to a String
        # to avoid script errors at runtime.
        OS.shell_open(str(meta))

For more advanced use cases, it's also possible to store JSON in a `[url]` tag's option and parse it in the function that handles the `meta_clicked` signal. For example:

``` none
[url={"example": "value"}]JSON[/url]
```

### Horizontal rule options

- **color**

  |                                        |                                   |
  |----------------------------------------|-----------------------------------|
  | <span class="title-ref">Values</span>  | Color name or color in HEX format |
  | <span class="title-ref">Default</span> | `Color(1, 1, 1, 1)`               |

  Color tint of the rule (modulation).

- **height**

  |                                        |                |
  |----------------------------------------|----------------|
  | <span class="title-ref">Values</span>  | Integer number |
  | <span class="title-ref">Default</span> | `2`            |

  Target height of the rule in pixels, add `%` to the end of value to specify it as percentages of the control width instead of pixels.

- **width**

  |                                        |                |
  |----------------------------------------|----------------|
  | <span class="title-ref">Values</span>  | Integer number |
  | <span class="title-ref">Default</span> | `90%`          |

  Target width of the rule in pixels, add `%` to the end of value to specify it as percentages of the control width instead of pixels.

- **align**

  |  |  |
  |----|----|
  | <span class="title-ref">Values</span> | `left` (or `l`), `center` (or `c`), `right` (or `r`) |
  | <span class="title-ref">Default</span> | `left` |

  Horizontal alignment.

### URL options

- **underline**

  |                                        |                            |
  |----------------------------------------|----------------------------|
  | <span class="title-ref">Values</span>  | `always`, `never`, `hover` |
  | <span class="title-ref">Default</span> | `always`                   |

  URL underlining mode.

- **tooltip**

  |                                        |         |
  |----------------------------------------|---------|
  | <span class="title-ref">Values</span>  | String. |
  | <span class="title-ref">Default</span> |         |

  URL tooltip.

- **href**

  |                                        |         |
  |----------------------------------------|---------|
  | <span class="title-ref">Values</span>  | String. |
  | <span class="title-ref">Default</span> |         |

  URL target address.

### Image options

- **color**

  |                                        |                                   |
  |----------------------------------------|-----------------------------------|
  | <span class="title-ref">Values</span>  | Color name or color in HEX format |
  | <span class="title-ref">Default</span> | Inherit                           |

  Color tint of the image (modulation).

- **height**

  |                                        |                |
  |----------------------------------------|----------------|
  | <span class="title-ref">Values</span>  | Integer number |
  | <span class="title-ref">Default</span> | Inherit        |

  Target height of the image in pixels, add `%` to the end of value to specify it as percentages of the control width instead of pixels.

- **width**

  |                                        |                |
  |----------------------------------------|----------------|
  | <span class="title-ref">Values</span>  | Integer number |
  | <span class="title-ref">Default</span> | Inherit        |

  Target width of the image in pixels, add `%` to the end of value to specify it as percentages of the control width instead of pixels.

- **region**

  |                                        |                            |
  |----------------------------------------|----------------------------|
  | <span class="title-ref">Values</span>  | x,y,width,height in pixels |
  | <span class="title-ref">Default</span> | Inherit                    |

  Region rect of the image. This can be used to display a single image from a spritesheet.

- **pad**

  |                                        |                 |
  |----------------------------------------|-----------------|
  | <span class="title-ref">Values</span>  | `false`, `true` |
  | <span class="title-ref">Default</span> | `false`         |

  If set to `true`, and the image is smaller than the size specified by `width` and `height`, the image padding is added to match the size instead of upscaling.

- **tooltip**

  |                                        |        |
  |----------------------------------------|--------|
  | <span class="title-ref">Values</span>  | String |
  | <span class="title-ref">Default</span> |        |

  Image tooltip.

- **alt**

  |  |  |
  |----|----|
  | <span class="title-ref">Values</span> | see `doc_bbcode_in_richtextlabel_image_and_table_alignment` |
  | <span class="title-ref">Default</span> | `center,center` |

  Image alignment to the surrounding text.

- **alt**

  |                                        |        |
  |----------------------------------------|--------|
  | <span class="title-ref">Values</span>  | String |
  | <span class="title-ref">Default</span> |        |

  Image description for assistive apps (screen reader).

### Image and table vertical alignment

When a vertical alignment value is provided with the `[img]` or `[table]` tag the image/table will try to align itself against the surrounding text. Alignment is performed using a vertical point of the image and a vertical point of the text. There are 3 possible points on the image (`top`, `center`, and `bottom`) and 4 possible points on the text and table (`top`, `center`, `baseline`, and `bottom`), which can be used in any combination.

To specify both points, use their full or short names as a value of the image/table tag:

``` none
text [img=top,bottom]...[/img] text
text [img=center,center]...[/img] text
```

![image](img/bbcode_in_richtextlabel_image_align.webp)

``` none
text [table=3,center]...[/table] text  # Center to center.
text [table=3,top,bottom]...[/table] text # Top of the table to the bottom of text.
text [table=3,baseline,baseline,1]...[/table] text # Baseline of the second row (rows use zero-based indexing) to the baseline of text.
```

![image](img/bbcode_in_richtextlabel_table_align.webp)

You can also specify just one value (`top`, `center`, or `bottom`) to make use of a corresponding preset (`top-top`, `center-center`, and `bottom-bottom` respectively).

Short names for the values are `t` (`top`), `c` (`center`), `l` (`baseline`), and `b` (`bottom`).

### Font options

- **name**, **n**

  |                                        |                             |
  |----------------------------------------|-----------------------------|
  | <span class="title-ref">Values</span>  | A valid Font resource path. |
  | <span class="title-ref">Default</span> | Inherit                     |

  Font resource path.

- **size**, **s**

  |                                        |                   |
  |----------------------------------------|-------------------|
  | <span class="title-ref">Values</span>  | Number in pixels. |
  | <span class="title-ref">Default</span> | Inherit           |

  Custom font size.

- **glyph_spacing**, **gl**

  |                                        |                   |
  |----------------------------------------|-------------------|
  | <span class="title-ref">Values</span>  | Number in pixels. |
  | <span class="title-ref">Default</span> | Inherit           |

  Extra spacing for each glyph.

- **space_spacing**, **sp**

  |                                        |                   |
  |----------------------------------------|-------------------|
  | <span class="title-ref">Values</span>  | Number in pixels. |
  | <span class="title-ref">Default</span> | Inherit           |

  Extra spacing for the space character.

- **top_spacing**, **top**

  |                                        |                   |
  |----------------------------------------|-------------------|
  | <span class="title-ref">Values</span>  | Number in pixels. |
  | <span class="title-ref">Default</span> | Inherit           |

  Extra spacing at the top of the line.

- **bottom_spacing**, **bt**

  |                                        |                   |
  |----------------------------------------|-------------------|
  | <span class="title-ref">Values</span>  | Number in pixels. |
  | <span class="title-ref">Default</span> | Inherit           |

  Extra spacing at the bottom of the line.

- **embolden**, **emb**

  |                                        |                        |
  |----------------------------------------|------------------------|
  | <span class="title-ref">Values</span>  | Floating-point number. |
  | <span class="title-ref">Default</span> | `0.0`                  |

  Font embolden strength, if it is not equal to zero, emboldens the font outlines. Negative values reduce the outline thickness.

- **face_index**, **fi**

  |                                        |                 |
  |----------------------------------------|-----------------|
  | <span class="title-ref">Values</span>  | Integer number. |
  | <span class="title-ref">Default</span> | `0`             |

  An active face index in the TrueType / OpenType collection.

- **slant**, **sln**

  |                                        |                        |
  |----------------------------------------|------------------------|
  | <span class="title-ref">Values</span>  | Floating-point number. |
  | <span class="title-ref">Default</span> | `0.0`                  |

  Font slant strength, positive values slant glyphs to the right. Negative values to the left.

- **opentype_variation**, **otv**

  |  |  |
  |----|----|
  | <span class="title-ref">Values</span> | Comma-separated list of the OpenType variation tags (no space after each comma). |
  | <span class="title-ref">Default</span> |  |

  Font OpenType variation coordinates. See [OpenType variation tags](https://docs.microsoft.com/en-us/typography/opentype/spec/dvaraxisreg).

  Note: The value should be enclosed in `"` to allow using `=` inside it:

``` none
[font otv="wght=200,wdth=400"] # Sets variable font weight and width.
```

- **opentype_features**, **otf**

  |  |  |
  |----|----|
  | <span class="title-ref">Values</span> | Comma-separated list of the OpenType feature tags (no space after each comma). |
  | <span class="title-ref">Default</span> |  |

  Font OpenType features. See [OpenType features tags](https://docs.microsoft.com/en-us/typography/opentype/spec/featuretags).

  Note: The value should be enclosed in `"` to allow using `=` inside it:

``` none
[font otf="calt=0,zero=1"] # Disable contextual alternates, enable slashed zero.
```

### Named colors

For tags that allow specifying a color by name, you can use names of the constants from the built-in `class_Color` class. Named classes can be specified in a number of styles using different casings: `DARK_RED`, `DarkRed`, and `darkred` will give the same exact result.

See this image for a list of color constants:

![image](/img/color_constants.png)

[View at full size](https://raw.githubusercontent.com/godotengine/godot-docs/master/img/color_constants.png)

### Hexadecimal color codes

For opaque RGB colors, any valid 6-digit hexadecimal code is supported, e.g. `[color=#ffffff]white[/color]`. Shorthand RGB color codes such as `#6f2` (equivalent to `#66ff22`) are also supported.

For transparent RGB colors, any RGBA 8-digit hexadecimal code can be used, e.g. `[color=#ffffff88]translucent white[/color]`. Note that the alpha channel is the **last** component of the color code, not the first one. Short RGBA color codes such as `#6f28` (equivalent to `#66ff2288`) are supported as well.

### Cell options

- **shrink**

  |                                        |                 |
  |----------------------------------------|-----------------|
  | <span class="title-ref">Values</span>  | `false`, `true` |
  | <span class="title-ref">Default</span> | `true`          |

  If `true`, cell can shrink to its contents.

- **expand**

  |                                        |                |
  |----------------------------------------|----------------|
  | <span class="title-ref">Values</span>  | Integer number |
  | <span class="title-ref">Default</span> | 1              |

  Cell expansion ratio. This defines which cells will try to expand to proportionally to other cells and their expansion ratios.

- **border**

  |                                        |                                   |
  |----------------------------------------|-----------------------------------|
  | <span class="title-ref">Values</span>  | Color name or color in HEX format |
  | <span class="title-ref">Default</span> | Inherit                           |

  Cell border color.

- **bg**

  |                                        |                                   |
  |----------------------------------------|-----------------------------------|
  | <span class="title-ref">Values</span>  | Color name or color in HEX format |
  | <span class="title-ref">Default</span> | Inherit                           |

  Cell background color. For alternating odd/even row backgrounds, you can use `bg=odd_color,even_color`.

- **padding**

  |  |  |
  |----|----|
  | <span class="title-ref">Values</span> | 4 comma-separated floating-point numbers (no space after each comma) |
  | <span class="title-ref">Default</span> | `0,0,0,0` |

  Left, top, right, and bottom cell padding.

### Unordered list bullet

By default, the `[ul]` tag uses the `U+2022` "Bullet" Unicode glyph as the bullet character. This behavior is similar to web browsers. The bullet character can be customized using `[ul bullet={bullet}]`. If provided, this `{bullet}` parameter must be a string with no enclosing quotes (for example, `[bullet=*]`). You can add trailing spaces after the bullet character to increase the spacing between the bullet and the list item text.

See [Bullet (typography) on Wikipedia](https://en.wikipedia.org/wiki/Bullet_(typography)) for a list of common bullet characters that you can paste directly in the `bullet` parameter.

### Ordered list types

Ordered lists can be used to automatically mark items with numbers or letters in ascending order. This tag supports the following type options:

- `1` - Numbers, using language specific numbering system if possible.
- `a`, `A` - Lower and upper case Latin letters.
- `i`, `I` - Lower and upper case Roman numerals.

## Text effects

BBCode can also be used to create different text effects that can optionally be animated. Several customizable effects are provided out of the box, and you can easily create your own. By default, animated effects will pause `when the SceneTree is paused <doc_pausing_games>`. You can change this behavior by adjusting the RichTextLabel's **Process \> Mode** property.

All examples below mention the default values for options in the listed tag format.

> [!NOTE]
> Text effects that move characters' positions may result in characters being clipped by the RichTextLabel node bounds.
>
> You can resolve this by disabling **Control \> Layout \> Clip Contents** in the inspector after selecting the RichTextLabel node, or ensuring there is enough margin added around the text by using line breaks above and below the line using the effect.

### Pulse

![image](img/bbcode_in_richtextlabel_effect_pulse.webp)

Pulse creates an animated pulsing effect that multiplies each character's opacity and color. It can be used to bring attention to specific text. Its tag format is `[pulse freq=1.0 color=#ffffff40 ease=-2.0]{text}[/pulse]`.

`freq` controls the frequency of the half-pulsing cycle (higher is faster). A full pulsing cycle takes `2 * (1.0 / freq)` seconds. `color` is the target color multiplier for blinking. The default mostly fades out text, but not entirely. `ease` is the easing function exponent to use. Negative values provide in-out easing, which is why the default is `-2.0`.

### Wave

![image](img/bbcode_in_richtextlabel_effect_wave.webp)

Wave makes the text go up and down. Its tag format is `[wave amp=50.0 freq=5.0 connected=1]{text}[/wave]`.

`amp` controls how high and low the effect goes, and `freq` controls how fast the text goes up and down. A `freq` value of `0` will result in no visible waves, and negative `freq` values won't display any waves either. If `connected` is `1` (default), glyphs with ligatures will be moved together. If `connected` is `0`, each glyph is moved individually even if they are joined by ligatures. This can work around certain rendering issues with font ligatures.

### Tornado

![image](img/bbcode_in_richtextlabel_effect_tornado.webp)

Tornado makes the text move around in a circle. Its tag format is `[tornado radius=10.0 freq=1.0 connected=1]{text}[/tornado]`.

`radius` is the radius of the circle that controls the offset, `freq` is how fast the text moves in a circle. A `freq` value of `0` will pause the animation, while negative `freq` will play the animation backwards. If `connected` is `1` (default), glyphs with ligatures will be moved together. If `connected` is `0`, each glyph is moved individually even if they are joined by ligatures. This can work around certain rendering issues with font ligatures.

### Shake

![image](img/bbcode_in_richtextlabel_effect_shake.webp)

Shake makes the text shake. Its tag format is `[shake rate=20.0 level=5 connected=1]{text}[/shake]`.

`rate` controls how fast the text shakes, `level` controls how far the text is offset from the origin. If `connected` is `1` (default), glyphs with ligatures will be moved together. If `connected` is `0`, each glyph is moved individually even if they are joined by ligatures. This can work around certain rendering issues with font ligatures.

### Fade

![image](img/bbcode_in_richtextlabel_effect_fade.webp)

Fade creates a static fade effect that multiplies each character's opacity. Its tag format is `[fade start=4 length=14]{text}[/fade]`.

`start` controls the starting position of the falloff relative to where the fade command is inserted, `length` controls over how many characters should the fade out take place.

### Rainbow

![image](img/bbcode_in_richtextlabel_effect_rainbow.webp)

Rainbow gives the text a rainbow color that changes over time. Its tag format is `[rainbow freq=1.0 sat=0.8 val=0.8 speed=1.0]{text}[/rainbow]`.

`freq` determines how many letters the rainbow extends over before it repeats itself, `sat` is the saturation of the rainbow, `val` is the value of the rainbow. `speed` is the number of full rainbow cycles per second. A positive `speed` value will play the animation forwards, a value of `0` will pause the animation, and a negative `speed` value will play the animation backwards.

Font outlines are *not* affected by the rainbow effect (they keep their original color). Existing font colors are overridden by the rainbow effect. However, CanvasItem's **Modulate** and **Self Modulate** properties will affect how the rainbow effect looks, as modulation multiplies its final colors.

## Custom BBCode tags and text effects

You can extend the `class_RichTextEffect` resource type to create your own custom BBCode tags. Create a new script file that extends the `class_RichTextEffect` resource type and give the script a `class_name` so that the effect can be selected in the inspector. Add the `@tool` annotation to your GDScript file if you wish to have these custom effects run within the editor itself. The RichTextLabel does not need to have a script attached, nor does it need to be running in `tool` mode. The new effect can be registered in the Inspector by adding it to the **Markup \> Custom Effects** array, or in code with the `install_effect() <class_RichTextLabel_method_install_effect>` method:

<figure class="align-center">
<img src="img/bbcode_in_richtextlabel_selecting_custom_richtexteffect.webp" alt="Selecting a custom RichTextEffect after saving a script that extends RichTextEffect with a ``class_name``" />
<figcaption>Selecting a custom RichTextEffect after saving a script that extends RichTextEffect with a <code>class_name</code></figcaption>
</figure>

> [!WARNING]
> If the custom effect is not registered within the RichTextLabel's **Markup \> Custom Effects** property, no effect will be visible and the original tag will be left as-is.

There is only one function that you need to extend: `_process_custom_fx(char_fx)`. Optionally, you can also provide a custom BBCode identifier by adding a member name `bbcode`. The code will check the `bbcode` property automatically or will use the name of the file to determine what the BBCode tag should be.

### `_process_custom_fx`

This is where the logic of each effect takes place and is called once per glyph during the draw phase of text rendering. This passes in a `class_CharFXTransform` object, which holds a few variables to control how the associated glyph is rendered:

- `outline` is `true` if effect is called for drawing text outline.
- `range` tells you how far into a given custom effect block you are in as an index.
- `elapsed_time` is the total amount of time the text effect has been running.
- `visible` will tell you whether the glyph is visible or not and will also allow you to hide a given portion of text.
- `offset` is an offset position relative to where the given glyph should render under normal circumstances.
- `color` is the color of a given glyph.
- `glyph_index` and `font` is glyph being drawn and font data resource used to draw it.
- Finally, `env` is a `class_Dictionary` of parameters assigned to a given custom effect. You can use `get() <class_Dictionary_method_get>` with an optional default value to retrieve each parameter, if specified by the user. For example `[custom_fx spread=0.5 color=#FFFF00]test[/custom_fx]` would have a float `spread` and Color `color` parameters in its `env` Dictionary. See below for more usage examples.

The last thing to note about this function is that it is necessary to return a boolean `true` value to verify that the effect processed correctly. This way, if there's a problem with rendering a given glyph, it will back out of rendering custom effects entirely until the user fixes whatever error cropped up in their custom effect logic.

Here are some examples of custom effects:

### Ghost

    @tool
    extends RichTextEffect
    class_name RichTextGhost

    # Syntax: [ghost freq=5.0 span=10.0][/ghost]

    # Define the tag name.
    var bbcode = "ghost"

    func _process_custom_fx(char_fx):
        # Get parameters, or use the provided default value if missing.
        var speed = char_fx.env.get("freq", 5.0)
        var span = char_fx.env.get("span", 10.0)

        var alpha = sin(char_fx.elapsed_time * speed + (char_fx.range.x / span)) * 0.5 + 0.5
        char_fx.color.a = alpha
        return true

### Matrix

    @tool
    extends RichTextEffect
    class_name RichTextMatrix

    # Syntax: [matrix clean=2.0 dirty=1.0 span=50][/matrix]

    # Define the tag name.
    var bbcode = "matrix"

    # Gets TextServer for retrieving font information.
    func get_text_server():
        return TextServerManager.get_primary_interface()

    func _process_custom_fx(char_fx):
        # Get parameters, or use the provided default value if missing.
        var clear_time = char_fx.env.get("clean", 2.0)
        var dirty_time = char_fx.env.get("dirty", 1.0)
        var text_span = char_fx.env.get("span", 50)

        var value = get_text_server().font_get_char_from_glyph_index(char_fx.font, 1, char_fx.glyph_index)

        var matrix_time = fmod(char_fx.elapsed_time + (char_fx.range.x / float(text_span)), \
                               clear_time + dirty_time)

        matrix_time = 0.0 if matrix_time < clear_time else \
                      (matrix_time - clear_time) / dirty_time

        if matrix_time > 0.0:
            value = int(1 * matrix_time * (126 - 65))
            value %= (126 - 65)
            value += 65
        char_fx.glyph_index = get_text_server().font_get_glyph_index(char_fx.font, 1, value, 0)
        return true

This will add a few new BBCode commands, which can be used like so:

``` none
[center][ghost]This is a custom [matrix]effect[/matrix][/ghost] made in
[pulse freq=5.0 height=2.0][pulse color=#00FFAA freq=2.0]GDScript[/pulse][/pulse].[/center]
```
