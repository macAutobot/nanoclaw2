allow_comments  
False

# User interface (UI)

In this section of the tutorial, we explain the basics of creating a graphical user interface (GUI) in Godot.

## UI building blocks

Like everything else in Godot, the user interface is built using nodes, specifically `Control <class_Control>` nodes. There are many different types of controls which are useful for creating specific types of GUIs. For simplicity, we can separate them into two groups: content and layout.

Typical content controls include:

- `Buttons <class_Button>`
- `Labels <class_Label>`
- `LineEdits <class_LineEdit>` and `TextEdits <class_TextEdit>`

Typical layout controls include:

- `BoxContainers <class_BoxContainer>`
- `MarginContainers <class_MarginContainer>`
- `ScrollContainers <class_ScrollContainer>`
- `TabContainers <class_TabContainer>`
- `Popups <class_Popup>`

The following pages explain the basics of using such controls.

<div id="toc-gui-basics" class="toctree" maxdepth="1">

size_and_anchors gui_containers custom_gui_controls gui_navigation control_node_gallery

</div>

## GUI skinning and themes

Godot features an in-depth skinning/theming system for control nodes. The pages in this section explain the benefits of that system and how to set it up in your projects.

<div id="toc-gui-skinning" class="toctree" maxdepth="1">

gui_skinning gui_using_theme_editor gui_theme_type_variations gui_using_fonts

</div>

## Control node tutorials

The following articles cover specific details of using particular control nodes.

<div id="toc-control-nodes-tutorials" class="toctree" maxdepth="1">

bbcode_in_richtextlabel

</div>

## Creating applications

Godot can also be used to create applications (rather than games).

<div id="toc-applications" class="toctree" maxdepth="1">

creating_applications

</div>
