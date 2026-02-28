# Upgrading from Godot 4.1 to Godot 4.2

For most games and apps made with 4.1 it should be relatively safe to migrate to 4.2. This page intends to cover everything you need to pay attention to when migrating your project.

## Breaking changes

If you are migrating from 4.1 to 4.2, the breaking changes listed here might affect you. Changes are grouped by areas/systems.

> [!WARNING]
> The `class_Mesh` resource format has changed in 4.2 to allow for [vertex and attribute compression](https://github.com/godotengine/godot/pull/81138). This allows for improved rendering performance, especially on platforms constrained by memory bandwidth such as mobile.
>
> It is still possible to load the Godot 4.0-4.1 Mesh formats, but it is **not** possible to load the Godot 4.2 Mesh format in prior Godot versions. When opening a Godot project made with a version prior to 4.2, you may be presented with an upgrade dialog that offers two options:
>
> - **Restart & Upgrade:** Upgrades the mesh format for all meshes in the project and saves the result to disk. Once chosen, this option prevents downgrading the project to a Godot version prior to 4.2. Set up a version control system and push your changes *before* choosing this option!
> - **Upgrade Only:** Upgrades the mesh format in-memory without writing it to disk. This allows downgrading the project to a Godot version older than 4.2 if you need to do so in the future. The downside is that loading the project will be slower every time as the mesh format needs to be upgraded every time the project is loaded. These increased loading times will also affect the exported project. The number and complexity of Mesh resources determines how much loading times are affected.
>
> If this dialog doesn't appear, use **Project \> Tools \> Upgrade Mesh Surfaces…** at the top of the editor.

This article indicates whether each breaking change affects GDScript and whether the C# breaking change is *binary compatible* or *source compatible*:

- **Binary compatible** - Existing binaries will load and execute successfully without recompilation, and the runtime behavior won't change.
- **Source compatible** - Source code will compile successfully without changes when upgrading Godot.

### Core

| Change | GDScript Compatible | C# Binary Compatible | C# Source Compatible | Introduced |
|----|----|----|----|----|
| **Node** |  |  |  |  |
| Constant `NOTIFICATION_NODE_RECACHE_REQUESTED` removed | `❌ (This API breaks compatibility.)` | `✔️ (This API does not break compatibility.)` \| | ❌\| \` | GH-84419\`\_ |

### Animation

| Change | GDScript Compatible | C# Binary Compatible | C# Source Compatible | Introduced |
|----|----|----|----|----|
| **AnimationPlayer** |  |  |  |  |
| Method `_post_process_key_value` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Method `add_animation_library` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Method `advance` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Signal `animation_finished` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ❌\| \| | ❌\| \` | GH-80813\`\_ |
| Signal `animation_started` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ❌\| \| | ❌\| \` | GH-80813\`\_ |
| Signal `animation_libraries_updated` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Signal `animation_list_changed` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Property `audio_max_polyphony` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Signal `caches_cleared` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Method `clear_caches` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Method `find_animation` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Method `find_animation_library` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Method `get_animation` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Method `get_animation_library` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Method `get_animation_library_list` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Method `get_animation_list` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Method `has_animation` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Method `has_animation_library` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Property `method_call_mode` renamed to `callback_mode_method` and moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️ with compat\| \|✔ | ️ with compat\| \`GH | -80813\`\_ |
| Property `playback_active` renamed to `active` and moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️ with compat\| \|✔ | ️ with compat\| \`GH | -80813\`\_ |
| Property `playback_process_mode` renamed to `callback_mode_process` and moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️ with compat\| \|✔ | ️ with compat\| \`GH | -80813\`\_ |
| Method `remove_animation_library` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Method `rename_animation_library` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Property `reset_on_save` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Property `root_node` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Method `set_reset_on_save_enabled` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Method `seek` adds a new `update_only` optional parameter | `✔️ (This API does not break compatibility.)` \| | ✔️ with compat\| \|✔ | ️\| \`GH | -80813\`\_ |
| **AnimationTree** |  |  |  |  |
| Method `_post_process_key_value` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Property `active` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Method `advance` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Signal `animation_finished` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ❌\| \| | ❌\| \` | GH-80813\`\_ |
| Signal `animation_started` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ❌\| \| | ❌\| \` | GH-80813\`\_ |
| Property `audio_max_polyphony` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Method `get_root_motion_position` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Method `get_root_motion_position_accumulator` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Method `get_root_motion_rotation` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Method `get_root_motion_rotation_accumulator` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Method `get_root_motion_scale` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Method `get_root_motion_scale_accumulator` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Property `process_callback` renamed to `callback_mode_process` and moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️ with compat\| \|✔ | ️ with compat\| \`GH | -80813\`\_ |
| Property `root_motion_track` moved to base class `AnimationMixer` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -80813\`\_ |
| Property `tree_root` changes type from `AnimationNode` to `AnimationRootNode` | `✔️ (This API does not break compatibility.)` \| | ❌\| \| | ❌\| \` | GH-80813\`\_ |

### GUI nodes

| Change | GDScript Compatible | C# Binary Compatible | C# Source Compatible | Introduced |
|----|----|----|----|----|
| **PopupMenu** |  |  |  |  |
| Method `add_icon_shortcut` adds a new `allow_echo` optional parameter | `✔️ (This API does not break compatibility.)` \| | ✔️ with compat\| \|✔ | ️ with compat\| \`GH | -36493\`\_ |
| Method `add_shortcut` adds a new `allow_echo` optional parameter | `✔️ (This API does not break compatibility.)` \| | ✔️ with compat\| \|✔ | ️ with compat\| \`GH | -36493\`\_ |
| Method `clear` adds a new `free_submenus` optional parameter | `✔️ (This API does not break compatibility.)` \| | ✔️ with compat\| \|✔ | ️ with compat\| \`GH | -79965\`\_ |
| **RichTextLabel** |  |  |  |  |
| Method `add_image` adds new `key`, `pad`, `tooltip`, and `size_in_percent` optional parameters | `✔️ (This API does not break compatibility.)` | `✔️ (This API does not break compatibility. A compatibility method was added.)` \| | ✔️\| \`G | H-80410\`\_ |

### Rendering

| Change | GDScript Compatible | C# Binary Compatible | C# Source Compatible | Introduced |
|----|----|----|----|----|
| **ImporterMesh** |  |  |  |  |
| Method `add_surface` changes `flags` parameter type from `uint32` to `uint64` | `✔️ (This API does not break compatibility.)` \| | ✔️ with compat\| \|✔ | ️ with compat\| \`GH | -81138\`\_ |
| Method `get_surface_format` changes return type from `uint32` to `uint64` | `✔️ (This API does not break compatibility.)` \| | ❌\| \| | ❌\| \` | GH-81138\`\_ |
| **MeshDataTool** |  |  |  |  |
| Method `commit_to_surface` adds a new `compression_flags` optional parameter | `✔️ (This API does not break compatibility.)` \| | ✔️ with compat\| \|✔ | ️\| \`GH | -81138\`\_ |
| Method `get_format` changes return type from `uint32` to `uint64` | `✔️ (This API does not break compatibility.)` \| | ❌\| \| | ❌\| \` | GH-81138\`\_ |
| **RenderingDevice** |  |  |  |  |
| Enum field `BarrierMask.BARRIER_MASK_RASTER` changes value from `1` to `9` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -79911\`\_ |
| Enum field `BarrierMask.BARRIER_MASK_ALL_BARRIERS` changes value from `7` to `32767` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -79911\`\_ |
| Enum field `BarrierMask.BARRIER_MASK_NO_BARRIER` changes value from `8` to `32768` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -79911\`\_ |
| Method `shader_create_from_bytecode` adds a new `placeholder_rid` optional parameter | `✔️ (This API does not break compatibility.)` \| | ✔️ with compat\| \|✔ | ️\| \`GH | -79606\`\_ |
| Method `shader_get_vertex_input_attribute_ask` changes return type from `uint32` to `uint64` | `✔️ (This API does not break compatibility.)` \| | ❌\| \| | ❌\| \` | GH-81138\`\_ |
| **SurfaceTool** |  |  |  |  |
| Method `commit` changes `flags` parameter type from `uint32` to `uint64` | `✔️ (This API does not break compatibility.)` \| | ✔️ with compat\| \|✔ | ️ with compat\| \`GH | -81138\`\_ |

### Text

| Change | GDScript Compatible | C# Binary Compatible | C# Source Compatible | Introduced |
|----|----|----|----|----|
| **Font** |  |  |  |  |
| Method `set_fallbacks` replaced with `fallbacks` property | `✔️ (This API does not break compatibility.)` \| | ❌\| \| | ❌\| \` | GH-78266\`\_ |
| Method `get_fallbacks` replaced with `fallbacks` property | `✔️ (This API does not break compatibility.)` \| | ❌\| \| | ❌\| \` | GH-78266\`\_ |
| Method `find_variation` adds new `spacing_top`, `spacing_bottom`, `spacing_space`, and `spacing_glyph` optional parameters | `✔️ (This API does not break compatibility.)` | `✔️ (This API does not break compatibility. A compatibility method was added.)` \| | ✔️\| \`G | H-80954\`\_ |

### GraphEdit

| Change | GDScript Compatible | C# Binary Compatible | C# Source Compatible | Introduced |
|----|----|----|----|----|
| **GraphEdit** |  |  |  |  |
| Property `arrange_nodes_button_hidden` renamed to `show_arrange_button` | `❌ (This API breaks compatibility.)` | `✔️ (This API does not break compatibility. A compatibility method was added.)` \| | ✔️ with compat\| \`G | H-81582\`\_ |
| Method `get_zoom_hbox` renamed to `get_menu_hbox` | `❌ (This API breaks compatibility.)` | `✔️ (This API does not break compatibility. A compatibility method was added.)` \| | ✔️ with compat\| \`G | H-79308\`\_ |
| Property `snap_distance` renamed to `snapping_distance` | `❌ (This API breaks compatibility.)` | `✔️ (This API does not break compatibility. A compatibility method was added.)` \| | ✔️ with compat\| \`G | H-79308\`\_ |
| Property `use_snap` renamed to `snapping_enabled` | `❌ (This API breaks compatibility.)` | `✔️ (This API does not break compatibility. A compatibility method was added.)` \| | ✔️ with compat\| \`G | H-79308\`\_ |
| **GraphNode** |  |  |  |  |
| Property `comment` removed | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | [GH-79307](https://github.com/godotengine/godot/pull/79307) |
| Signal `close_request` renamed to `delete_request` and moved to base class `GraphElement` | `❌ (This API breaks compatibility.)` | `✔️ (This API does not break compatibility. A compatibility method was added.)` \| | ✔️ with compat\| \`G | H-79311\`\_ |
| Property `draggable` moved to base class `GraphElement` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -79311\`\_ |
| Property `draggable` moved to base class `GraphElement` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -79311\`\_ |
| Signal `dragged` moved to base class `GraphElement` | `✔️ (This API does not break compatibility.)` \| | ❌\| \| | ❌\| \` | GH-79311\`\_ |
| Method `get_connection_input_color` removed | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | [GH-79311](https://github.com/godotengine/godot/pull/79311) |
| Method `get_connection_input_count` removed | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | [GH-79311](https://github.com/godotengine/godot/pull/79311) |
| Method `get_connection_input_height` removed | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | [GH-79311](https://github.com/godotengine/godot/pull/79311) |
| Method `get_connection_input_position` removed | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | [GH-79311](https://github.com/godotengine/godot/pull/79311) |
| Method `get_connection_input_slot` removed | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | [GH-79311](https://github.com/godotengine/godot/pull/79311) |
| Method `get_connection_input_type` removed | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | [GH-79311](https://github.com/godotengine/godot/pull/79311) |
| Method `get_connection_output_color` removed | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | [GH-79311](https://github.com/godotengine/godot/pull/79311) |
| Method `get_connection_output_count` removed | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | [GH-79311](https://github.com/godotengine/godot/pull/79311) |
| Method `get_connection_output_height` removed | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | [GH-79311](https://github.com/godotengine/godot/pull/79311) |
| Method `get_connection_output_position` removed | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | [GH-79311](https://github.com/godotengine/godot/pull/79311) |
| Method `get_connection_output_slot` removed | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | [GH-79311](https://github.com/godotengine/godot/pull/79311) |
| Method `get_connection_output_type` removed | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | [GH-79311](https://github.com/godotengine/godot/pull/79311) |
| Property `language` removed | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | [GH-79311](https://github.com/godotengine/godot/pull/79311) |
| Signal `node_deselected` moved to base class `GraphElement` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -79311\`\_ |
| Signal `node_selected` moved to base class `GraphElement` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -79311\`\_ |
| Property `overlay` removed | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | [GH-79311](https://github.com/godotengine/godot/pull/79311) |
| Property `position_offset` moved to base class `GraphElement` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -79311\`\_ |
| Signal `position_offset_changed` moved to base class `GraphElement` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -79311\`\_ |
| Signal `raise_request` moved to base class `GraphElement` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -79311\`\_ |
| Property `resizable` moved to base class `GraphElement` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -79311\`\_ |
| Signal `resize_request` moved to base class `GraphElement` | `✔️ (This API does not break compatibility.)` \| | ❌\| \| | ❌\| \` | GH-79311\`\_ |
| Property `selectable` moved to base class `GraphElement` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -79311\`\_ |
| Property `selected` moved to base class `GraphElement` | `✔️ (This API does not break compatibility.)` \| | ✔️\| \|✔ | ️\| \`GH | -79311\`\_ |
| Property `show_close` removed | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | [GH-79311](https://github.com/godotengine/godot/pull/79311) |
| Property `text_direction` removed | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | `❌ (This API breaks compatibility.)` | [GH-79311](https://github.com/godotengine/godot/pull/79311) |

### TileMap

| Change | GDScript Compatible | C# Binary Compatible | C# Source Compatible | Introduced |
|----|----|----|----|----|
| **TileMap** |  |  |  |  |
| Property `cell_quadrant_size` renamed to `rendering_quadrant_size` | `❌ (This API breaks compatibility.)` | `✔️ (This API does not break compatibility. A compatibility method was added.)` \| | ✔️ with compat\| \`G | H-81070\`\_ |

### XR

| Change | GDScript Compatible | C# Binary Compatible | C# Source Compatible | Introduced |
|----|----|----|----|----|
| **XRInterface** |  |  |  |  |
| Property `environment_blend_mode` added | `✔️ (This API does not break compatibility.)` \| | ❌\| \| | ❌\| \` | GH-81561\`\_ |

> [!NOTE]
> This change breaks compatibility in C# because the new property conflicts with the name of an existing enum and the C# bindings generator gives priority to properties, so the enum type was renamed from `EnvironmentBlendMode` to `EnvironmentBlendModeEnum`.
