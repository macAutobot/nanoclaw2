article_outdated  
True

<div class="meta" keywords="cheatsheet, cheat sheet, shortcut">

</div>

# Default editor shortcuts

Many Godot editor functions can be executed with keyboard shortcuts. This page lists functions which have associated shortcuts by default, but many others are available for customization in editor settings as well. To change keys associated with these and other actions navigate to **Editor \> Editor Settings \> Shortcuts**.

While some actions are universal, a lot of shortcuts are specific to individual tools. For this reason it is possible for some key combinations to be assigned to more than one function. The correct action will be performed depending on the context.

> [!NOTE]
> While Windows and Linux builds of the editor share most of the default settings, some shortcuts may differ for macOS version. This is done for better integration of the editor into macOS ecosystem. Users fluent with standard shortcuts on that OS should find Godot Editor's default key mapping intuitive.

## General editor actions

| Action name | Windows, Linux | macOS | Editor setting |
|----|----|----|----|
| Open 2D Workspace | `Ctrl + F1` | `Cmd + Ctrl + 1` | `editor/editor_2d` |
| Open 3D Workspace | `Ctrl + F2` | `Cmd + Ctrl + 2` | `editor/editor_3d` |
| Open Script Editor | `Ctrl + F3` | `Cmd + Ctrl + 3` | `editor/editor_script` |
| Search Help | `F1` | `Opt + Space` | `editor/editor_help` |
| Distraction Free Mode | `Ctrl + Shift + F11` | `Cmd + Shift + D` | `editor/distraction_free_mode` |
| Next Scene Tab | `Ctrl + Tab` | `Ctrl + Tab` | `editor/next_tab` |
| Previous Scene Tab | `Ctrl + Shift + Tab` | `Ctrl + Shift + Tab` | `editor/prev_tab` |
| Filter Files | `Ctrl + Alt + P` | `Opt + Cmd + P` | `editor/filter_files` |
| Open Scene | `Ctrl + O` | `Cmd + O` | `editor/open_scene` |
| Close Scene | `Ctrl + Shift + W` | `Cmd + W` | `editor/close_scene` |
| Reopen Closed Scene | `Ctrl + Shift + T` | `Cmd + Shift + T` | `editor/reopen_closed_scene` |
| Save Scene | `Ctrl + S` | `Cmd + S` | `editor/save_scene` |
| Save Scene As | `Ctrl + Shift + S` | `Cmd + Shift + S` | `editor/save_scene_as` |
| Save All Scenes | `Ctrl + Shift + Alt + S` | `Cmd + Shift + Opt + S` | `editor/save_all_scenes` |
| Quick Open | `Shift + Alt + O` | `Cmd + Ctrl + O` | `editor/quick_open` |
| Quick Open Scene | `Ctrl + Shift + O` | `Cmd + Shift + O` | `editor/quick_open_scene` |
| Quick Open Script | `Ctrl + Alt + O` | `Opt + Cmd + O` | `editor/quick_open_script` |
| Undo | `Ctrl + Z` | `Cmd + Z` | `editor/undo` |
| Redo | `Ctrl + Shift + Z` | `Cmd + Shift + Z` | `editor/redo` |
| Quit | `Ctrl + Q` | `Cmd + Q` | `editor/file_quit` |
| Quit to Project List | `Ctrl + Shift + Q` | `Shift + Opt + Q` | `editor/quit_to_project_list` |
| Take Screenshot | `Ctrl + F12` | `Cmd + F12` | `editor/take_screenshot` |
| Toggle Fullscreen | `Shift + F11` | `Cmd + Ctrl + F` | `editor/fullscreen_mode` |
| Play | `F5` | `Cmd + B` | `editor/play` |
| Pause Scene | `F7` | `Cmd + Ctrl + Y` | `editor/pause_scene` |
| Stop | `F8` | `Cmd + .` | `editor/stop` |
| Play Scene | `F6` | `Cmd + R` | `editor/play_scene` |
| Play Custom Scene | `Ctrl + Shift + F5` | `Cmd + Shift + R` | `editor/play_custom_scene` |
| Expand Bottom Panel | `Shift + F12` | `Shift + F12` | `editor/bottom_panel_expand` |
| Command Palette | `Ctrl + Shift + P` | `Cmd + Shift + P` | `editor/command_palette` |

## Bottom panels

Only bottom panels that are always available have a default shortcut assigned. Others must be manually bound in the Editor Settings if desired.

| Action name | Windows, Linux | macOS | Editor setting |
|----|----|----|----|
| Toggle Last Opened Panel | `Ctrl + J` | `Ctrl + J` | `editor/toggle_last_opened_bottom_panel` |
| Toggle Animation Bottom Panel | `Alt + N` | `Alt + N` | `bottom_panels/toggle_animation_bottom_panel` |
| Toggle Audio Bottom Panel | `Alt + A` | `Alt + A` | `bottom_panels/toggle_audio_bottom_panel` |
| Toggle Debugger Bottom Panel | `Alt + D` | `Alt + D` | `bottom_panels/toggle_debugger_bottom_panel` |
| Toggle FileSystem Bottom Panel | `Alt + F` | `Alt + F` | `bottom_panels/toggle_filesystem_bottom_panel` |
| Toggle Output Bottom Panel | `Alt + O` | `Alt + O` | `bottom_panels/toggle_output_bottom_panel` |
| Toggle Shader Editor Bottom Panel | `Alt + S` | `Alt + S` | `bottom_panels/toggle_shader_editor_bottom_panel` |

## 2D / CanvasItem editor

| Action name | Windows, Linux | macOS | Editor setting |
|----|----|----|----|
| Zoom In | `Ctrl + =` | `Cmd + =` | `canvas_item_editor/zoom_plus` |
| Zoom Out | `Ctrl + -` | `Cmd + -` | `canvas_item_editor/zoom_minus` |
| Zoom Reset | `Ctrl + 0` | `Cmd + 0` | `canvas_item_editor/zoom_reset` |
| Pan View | `Space` | `Space` | `canvas_item_editor/pan_view` |
| Select Mode | `Q` | `Q` | `canvas_item_editor/select_mode` |
| Move Mode | `W` | `W` | `canvas_item_editor/move_mode` |
| Rotate Mode | `E` | `E` | `canvas_item_editor/rotate_mode` |
| Scale Mode | `S` | `S` | `canvas_item_editor/scale_mode` |
| Ruler Mode | `R` | `R` | `canvas_item_editor/ruler_mode` |
| Use Smart Snap | `Shift + S` | `Shift + S` | `canvas_item_editor/use_smart_snap` |
| Use Grid Snap | `Shift + G` | `Shift + G` | `canvas_item_editor/use_grid_snap` |
| Multiply grid step by 2 | `Num *` | `Num *` | `canvas_item_editor/multiply_grid_step` |
| Divide grid step by 2 | `Num /` | `Num /` | `canvas_item_editor/divide_grid_step` |
| Always Show Grid | `G` | `G` | `canvas_item_editor/show_grid` |
| Show Helpers | `H` | `H` | `canvas_item_editor/show_helpers` |
| Show Guides | `Y` | `Y` | `canvas_item_editor/show_guides` |
| Center Selection | `F` | `F` | `canvas_item_editor/center_selection` |
| Frame Selection | `Shift + F` | `Shift + F` | `canvas_item_editor/frame_selection` |
| Preview Canvas Scale | `Ctrl + Shift + P` | `Cmd + Shift + P` | `canvas_item_editor/preview_canvas_scale` |
| Insert Key | `Ins` | `Ins` | `canvas_item_editor/anim_insert_key` |
| Insert Key (Existing Tracks) | `Ctrl + Ins` | `Cmd + Ins` | `canvas_item_editor/anim_insert_key_existing_tracks` |
| Make Custom Bones from Nodes | `Ctrl + Shift + B` | `Cmd + Shift + B` | `canvas_item_editor/skeleton_make_bones` |
| Clear Pose | `Shift + K` | `Shift + K` | `canvas_item_editor/anim_clear_pose` |

## 3D / Spatial editor

| Action name | Windows, Linux | macOS | Editor setting |
|----|----|----|----|
| Toggle Freelook | `Shift + F` | `Shift + F` | `spatial_editor/freelook_toggle` |
| Freelook Left | `A` | `A` | `spatial_editor/freelook_left` |
| Freelook Right | `D` | `D` | `spatial_editor/freelook_right` |
| Freelook Forward | `W` | `W` | `spatial_editor/freelook_forward` |
| Freelook Backwards | `S` | `S` | `spatial_editor/freelook_backwards` |
| Freelook Up | `E` | `E` | `spatial_editor/freelook_up` |
| Freelook Down | `Q` | `Q` | `spatial_editor/freelook_down` |
| Freelook Speed Modifier | `Shift` | `Shift` | `spatial_editor/freelook_speed_modifier` |
| Freelook Slow Modifier | `Alt` | `Opt` | `spatial_editor/freelook_slow_modifier` |
| Select Mode | `Q` | `Q` | `spatial_editor/tool_select` |
| Move Mode | `W` | `W` | `spatial_editor/tool_move` |
| Rotate Mode | `E` | `E` | `spatial_editor/tool_rotate` |
| Scale Mode | `R` | `R` | `spatial_editor/tool_scale` |
| Use Local Space | `T` | `T` | `spatial_editor/local_coords` |
| Use Snap | `Y` | `Y` | `spatial_editor/snap` |
| Snap Object to Floor | `PgDown` | `PgDown` | `spatial_editor/snap_to_floor` |
| Top View | `Num 7` | `Num 7` | `spatial_editor/top_view` |
| Bottom View | `Alt + Num 7` | `Opt + Num 7` | `spatial_editor/bottom_view` |
| Front View | `Num 1` | `Num 1` | `spatial_editor/front_view` |
| Rear View | `Alt + Num 1` | `Opt + Num 1` | `spatial_editor/rear_view` |
| Right View | `Num 3` | `Num 3` | `spatial_editor/right_view` |
| Left View | `Alt + Num 3` | `Opt + Num 3` | `spatial_editor/left_view` |
| Switch Perspective/Orthogonal View | `Num 5` | `Num 5` | `spatial_editor/switch_perspective_orthogonal` |
| Insert Animation Key | `K` | `K` | `spatial_editor/insert_anim_key` |
| Focus Origin | `O` | `O` | `spatial_editor/focus_origin` |
| Focus Selection | `F` | `F` | `spatial_editor/focus_selection` |
| Align Transform with View | `Ctrl + Alt + M` | `Opt + Cmd + M` | `spatial_editor/align_transform_with_view` |
| Align Rotation with View | `Ctrl + Alt + F` | `Opt + Cmd + F` | `spatial_editor/align_rotation_with_view` |
| 1 Viewport | `Ctrl + 1` | `Cmd + 1` | `spatial_editor/1_viewport` |
| 2 Viewports | `Ctrl + 2` | `Cmd + 2` | `spatial_editor/2_viewports` |
| 2 Viewports (Alt) | `Ctrl + Alt + 2` | `Opt + Cmd + 2` | `spatial_editor/2_viewports_alt` |
| 3 Viewports | `Ctrl + 3` | `Cmd + 3` | `spatial_editor/3_viewports` |
| 3 Viewports (Alt) | `Ctrl + Alt + 3` | `Opt + Cmd + 3` | `spatial_editor/3_viewports_alt` |
| 4 Viewports | `Ctrl + 4` | `Cmd + 4` | `spatial_editor/4_viewports` |

## Text editor

| Action name | Windows, Linux | macOS | Editor setting |
|----|----|----|----|
| Cut | `Ctrl + X` | `Cmd + X` | `script_text_editor/cut` |
| Copy | `Ctrl + C` | `Cmd + C` | `script_text_editor/copy` |
| Paste | `Ctrl + V` | `Cmd + V` | `script_text_editor/paste` |
| Select All | `Ctrl + A` | `Cmd + A` | `script_text_editor/select_all` |
| Find | `Ctrl + F` | `Cmd + F` | `script_text_editor/find` |
| Find Next | `F3` | `Cmd + G` | `script_text_editor/find_next` |
| Find Previous | `Shift + F3` | `Cmd + Shift + G` | `script_text_editor/find_previous` |
| Find in Files | `Ctrl + Shift + F` | `Cmd + Shift + F` | `script_text_editor/find_in_files` |
| Replace | `Ctrl + R` | `Opt + Cmd + F` | `script_text_editor/replace` |
| Replace in Files | `Ctrl + Shift + R` | `Cmd + Shift + R` | `script_text_editor/replace_in_files` |
| Undo | `Ctrl + Z` | `Cmd + Z` | `script_text_editor/undo` |
| Redo | `Ctrl + Y` | `Cmd + Y` | `script_text_editor/redo` |
| Move Up | `Alt + Up Arrow` | `Opt + Up Arrow` | `script_text_editor/move_up` |
| Move Down | `Alt + Down Arrow` | `Opt + Down Arrow` | `script_text_editor/move_down` |
| Delete Line | `Ctrl + Shift + K` | `Cmd + Shift + K` | `script_text_editor/delete_line` |
| Toggle Comment | `Ctrl + K` | `Cmd + K` | `script_text_editor/toggle_comment` |
| Fold/Unfold Line | `Alt + F` | `Ctrl + Cmd + F` | `script_text_editor/toggle_fold_line` |
| Duplicate Lines | `Ctrl + Alt + Down Arrow` | `Cmd + Shift + Down Arrow` | `script_text_editor/duplicate_lines` |
| Duplicate Selection | `Ctrl + Shift + D` | `Cmd + Shift + C` | `script_text_editor/duplicate_selection` |
| Select Down | `Ctrl + Shift + Down Arrow` | `Shift + Opt + Down Arrow` | `common/ui_text_caret_add_below` |
| Select Up | `Ctrl + Shift + Up Arrow` | `Shift + Opt + Up Arrow` | `common/ui_text_caret_add_above` |
| Select Next Occurrence | `Ctrl + D` | `Cmd + D` | `common/ui_text_add_selection_for_next_occurrence` |
| Complete Symbol | `Ctrl + Space` | `Ctrl + Space` | `script_text_editor/complete_symbol` |
| Evaluate Selection | `Ctrl + Shift + E` | `Cmd + Shift + E` | `script_text_editor/evaluate_selection` |
| Trim Trailing Whitespace | `Ctrl + Alt + T` | `Opt + Cmd + T` | `script_text_editor/trim_trailing_whitespace` |
| Uppercase | `Shift + F4` | `Shift + F4` | `script_text_editor/convert_to_uppercase` |
| Lowercase | `Shift + F5` | `Shift + F5` | `script_text_editor/convert_to_lowercase` |
| Capitalize | `Shift + F6` | `Shift + F6` | `script_text_editor/capitalize` |
| Convert Indent to Spaces | `Ctrl + Shift + Y` | `Cmd + Shift + Y` | `script_text_editor/convert_indent_to_spaces` |
| Convert Indent to Tabs | `Ctrl + Shift + I` | `Cmd + Shift + I` | `script_text_editor/convert_indent_to_tabs` |
| Auto Indent | `Ctrl + I` | `Cmd + I` | `script_text_editor/auto_indent` |
| Toggle Bookmark | `Ctrl + Alt + B` | `Opt + Cmd + B` | `script_text_editor/toggle_bookmark` |
| Go to Next Bookmark | `Ctrl + B` | `Cmd + B` | `script_text_editor/goto_next_bookmark` |
| Go to Previous Bookmark | `Ctrl + Shift + B` | `Cmd + Shift + B` | `script_text_editor/goto_previous_bookmark` |
| Go to Function | `Ctrl + Alt + F` | `Ctrl + Cmd + J` | `script_text_editor/goto_function` |
| Go to Line | `Ctrl + G` | `Cmd + L` | `script_text_editor/goto_line` |
| Toggle Breakpoint | `F9` | `Cmd + Shift + B` | `script_text_editor/toggle_breakpoint` |
| Remove All Breakpoints | `Ctrl + Shift + F9` | `Cmd + Shift + F9` | `script_text_editor/remove_all_breakpoints` |
| Go to Next Breakpoint | `Ctrl + .` | `Cmd + .` | `script_text_editor/goto_next_breakpoint` |
| Go to Previous Breakpoint | `Ctrl + ,` | `Cmd + ,` | `script_text_editor/goto_previous_breakpoint` |
| Contextual Help | `Alt + F1` | `Opt + Shift + Space` | `script_text_editor/contextual_help` |

## Script editor

| Action name | Windows, Linux | macOS | Editor setting |
|----|----|----|----|
| Find | `Ctrl + F` | `Cmd + F` | `script_editor/find` |
| Find Next | `F3` | `F3` | `script_editor/find_next` |
| Find Previous | `Shift + F3` | `Shift + F3` | `script_editor/find_previous` |
| Find in Files | `Ctrl + Shift + F` | `Cmd + Shift + F` | `script_editor/find_in_files` |
| Move Up | `Shift + Alt + Up Arrow` | `Shift + Opt + Up Arrow` | `script_editor/window_move_up` |
| Move Down | `Shift + Alt + Down Arrow` | `Shift + Opt + Down Arrow` | `script_editor/window_move_down` |
| Next Script | `Ctrl + Shift + .` | `Cmd + Shift + .` | `script_editor/next_script` |
| Previous Script | `Ctrl + Shift + ,` | `Cmd + Shift + ,` | `script_editor/prev_script` |
| Reopen Closed Script | `Ctrl + Shift + T` | `Cmd + Shift + T` | `script_editor/reopen_closed_script` |
| Save | `Ctrl + Alt + S` | `Opt + Cmd + S` | `script_editor/save` |
| Save All | `Ctrl + Shift + Alt + S` | `Cmd + Shift + Opt + S` | `script_editor/save_all` |
| Soft Reload Script | `Ctrl + Shift + R` | `Cmd + Shift + R` | `script_editor/reload_script_soft` |
| History Previous | `Alt + Left Arrow` | `Opt + Left Arrow` | `script_editor/history_previous` |
| History Next | `Alt + Right Arrow` | `Opt + Right Arrow` | `script_editor/history_next` |
| Close | `Ctrl + W` | `Cmd + W` | `script_editor/close_file` |
| Run | `Ctrl + Shift + X` | `Cmd + Shift + X` | `script_editor/run_file` |
| Toggle Scripts Panel | `Ctrl + \\` | `Cmd + \\` | `script_editor/toggle_scripts_panel` |
| Zoom In | `Ctrl + =` | `Cmd + =` | `script_editor/zoom_in` |
| Zoom Out | `Ctrl + -` | `Cmd + -` | `script_editor/zoom_out` |
| Reset Zoom | `Ctrl + 0` | `Cmd + 0` | `script_editor/reset_zoom` |

## Editor output

| Action name    | Windows, Linux     | macOS             | Editor setting        |
|----------------|--------------------|-------------------|-----------------------|
| Copy Selection | `Ctrl + C`         | `Cmd + C`         | `editor/copy_output`  |
| Clear Output   | `Ctrl + Shift + K` | `Cmd + Shift + K` | `editor/clear_output` |

## Debugger

| Action name | Windows, Linux | macOS | Editor setting       |
|-------------|----------------|-------|----------------------|
| Step Into   | `F11`          | `F11` | `debugger/step_into` |
| Step Over   | `F10`          | `F10` | `debugger/step_over` |
| Continue    | `F12`          | `F12` | `debugger/continue`  |

## File dialog

| Action name | Windows, Linux | macOS | Editor setting |
|----|----|----|----|
| Go Back | `Alt + Left Arrow` | `Opt + Left Arrow` | `file_dialog/go_back` |
| Go Forward | `Alt + Right Arrow` | `Opt + Right Arrow` | `file_dialog/go_forward` |
| Go Up | `Alt + Up Arrow` | `Opt + Up Arrow` | `file_dialog/go_up` |
| Refresh | `F5` | `F5` | `file_dialog/refresh` |
| Toggle Hidden Files | `Ctrl + H` | `Cmd + H` | `file_dialog/toggle_hidden_files` |
| Toggle Favorite | `Alt + F` | `Opt + F` | `file_dialog/toggle_favorite` |
| Toggle Mode | `Alt + V` | `Opt + V` | `file_dialog/toggle_mode` |
| Create Folder | `Ctrl + N` | `Cmd + N` | `file_dialog/create_folder` |
| Delete | `Del` | `Cmd + BkSp` | `file_dialog/delete` |
| Focus Path | `Ctrl + L` | `Cmd + Shift + G` | `file_dialog/focus_path` |
| Move Favorite Up | `Ctrl + Up Arrow` | `Cmd + Up Arrow` | `file_dialog/move_favorite_up` |
| Move Favorite Down | `Ctrl + Down Arrow` | `Cmd + Down Arrow` | `file_dialog/move_favorite_down` |

## FileSystem dock

| Action name | Windows, Linux | macOS        | Editor setting              |
|-------------|----------------|--------------|-----------------------------|
| Copy Path   | `Ctrl + C`     | `Cmd + C`    | `filesystem_dock/copy_path` |
| Duplicate   | `Ctrl + D`     | `Cmd + D`    | `filesystem_dock/duplicate` |
| Delete      | `Del`          | `Cmd + BkSp` | `filesystem_dock/delete`    |

## Scene tree dock

| Action name | Windows, Linux | macOS | Editor setting |
|----|----|----|----|
| Add Child Node | `Ctrl + A` | `Cmd + A` | `scene_tree/add_child_node` |
| Batch Rename | `Ctrl + F2` | `Cmd + F2` | `scene_tree/batch_rename` |
| Copy Node Path | `Ctrl + Shift + C` | `Cmd + Shift +  C` | `scene_tree/copy_node_path` |
| Delete | `Del` | `Cmd + BkSp` | `scene_tree/delete` |
| Force Delete | `Shift + Del` | `Shift + Del` | `scene_tree/delete_no_confirm` |
| Duplicate | `Ctrl + D` | `Cmd + D` | `scene_tree/duplicate` |
| Move Up | `Ctrl + Up Arrow` | `Cmd + Up Arrow` | `scene_tree/move_up` |
| Move Down | `Ctrl + Down Arrow` | `Cmd + Down Arrow` | `scene_tree/move_down` |

## Animation track editor

| Action name | Windows, Linux | macOS | Editor setting |
|----|----|----|----|
| Duplicate Selection | `Ctrl + D` | `Cmd + D` | `animation_editor/duplicate_selection` |
| Duplicate Transposed | `Ctrl + Shift + D` | `Cmd + Shift + D` | `animation_editor/duplicate_selection_transposed` |
| Delete Selection | `Del` | `Cmd + BkSp` | `animation_editor/delete_selection` |
| Go to Next Step | `Ctrl + Right Arrow` | `Cmd + Right Arrow` | `animation_editor/goto_next_step` |
| Go to Previous Step | `Ctrl + Left Arrow` | `Cmd + Left Arrow` | `animation_editor/goto_prev_step` |

## TileMap editor

| Action name | Windows, Linux | macOS | Editor setting |
|----|----|----|----|
| Select | `S` | `S` | `tiles_editor/selection_tool` |
| Cut Selection | `Ctrl + X` | `Cmd + X` | `tiles_editor/cut` |
| Copy Selection | `Ctrl + C` | `Cmd + C` | `tiles_editor/copy` |
| Paste Selection | `Ctrl + V` | `Cmd + V` | `tiles_editor/paste` |
| Delete Selection | `Del` | `Cmd + BkSp` | `tiles_editor/delete` |
| Cancel | `Esc` | `Esc` | `tiles_editor/cancel` |
| Paint | `D` | `D` | `tiles_editor/paint_tool` |
| Line | `L` | `L` | `tiles_editor/line_tool` |
| Rect | `R` | `R` | `tiles_editor/rect_tool` |
| Bucket | `B` | `B` | `tiles_editor/bucket_tool` |
| Picker | `P` | `P` | `tiles_editor/picker` |
| Eraser | `E` | `E` | `tiles_editor/eraser` |
| Flip Horizontally | `C` | `C` | `tiles_editor/flip_tile_horizontal` |
| Flip Vertically | `V` | `V` | `tiles_editor/flip_tile_vertical` |
| Rotate Left | `Z` | `Z` | `tiles_editor/rotate_tile_left` |
| Rotate Right | `X` | `X` | `tiles_editor/rotate_tile_right` |

## TileSet Editor

| Action name | Windows, Linux | macOS | Editor setting |
|----|----|----|----|
| Next Coordinate | `PgDown` | `PgDown` | `tileset_editor/next_shape` |
| Previous Coordinate | `PgUp` | `PgUp` | `tileset_editor/previous_shape` |
| Region Mode | `1` | `1` | `tileset_editor/editmode_region` |
| Collision Mode | `2` | `2` | `tileset_editor/editmode_collision` |
| Occlusion Mode | `3` | `3` | `tileset_editor/editmode_occlusion` |
| Navigation Mode | `4` | `4` | `tileset_editor/editmode_navigation` |
| Bitmask Mode | `5` | `5` | `tileset_editor/editmode_bitmask` |
| Priority Mode | `6` | `6` | `tileset_editor/editmode_priority` |
| Icon Mode | `7` | `7` | `tileset_editor/editmode_icon` |
| Z Index Mode | `8` | `8` | `tileset_editor/editmode_z_index` |

## GridMap Editor

| Action name     | Windows, Linux | macOS       | Editor setting             |
|-----------------|----------------|-------------|----------------------------|
| Previous Floor  | `1`            | `1`         | `grid_map/previous_floor`  |
| Next Floor      | `3`            | `3`         | `grid_map/next_floor`      |
| Edit X Axis     | `Shift + Z`    | `Shift + Z` | `grid_map/edit_x_axis`     |
| Edit Y Axis     | `Shift + X`    | `Shift + X` | `grid_map/edit_y_axis`     |
| Edit Z Axis     | `Shift + C`    | `Shift + C` | `grid_map/edit_z_axis`     |
| Transform       | `T`            | `T`         | `grid_map/transform_tool`  |
| Selection       | `Q`            | `Q`         | `grid_map/selection_tool`  |
| Erase           | `W`            | `W`         | `grid_map/erase_tool`      |
| Paint           | `E`            | `E`         | `grid_map/paint_tool`      |
| Pick            | `R`            | `R`         | `grid_map/pick_tool`       |
| Fill            | `Z`            | `Z`         | `grid_map/fill_tool`       |
| Move            | `X`            | `X`         | `grid_map/move_tool`       |
| Duplicate       | `C`            | `C`         | `grid_map/duplicate_tool`  |
| Delete          | `V`            | `V`         | `grid_map/delete_tool`     |
| Cursor Rotate X | `A`            | `A`         | `grid_map/cursor_rotate_x` |
| Cursor Rotate Y | `S`            | `S`         | `grid_map/cursor_rotate_y` |
| Cursor Rotate Z | `D`            | `D`         | `grid_map/cursor_rotate_z` |

## Project manager

| Action name | Windows, Linux | macOS | Editor setting |
|----|----|----|----|
| New Project | `Ctrl + N` | `Cmd + N` | `project_manager/new_project` |
| Import Project | `Ctrl + I` | `Cmd + I` | `project_manager/import_project` |
| Scan for Projects | `Ctrl + S` | `Cmd + S` | `project_manager/scan_projects` |
| Edit Project | `Ctrl + E` | `Cmd + E` | `project_manager/edit_project` |
| Run Project | `Ctrl + R` | `Cmd + R` | `project_manager/run_project` |
| Rename Project | `F2` | `Enter` | `project_manager/rename_project` |
| Remove Project | `Delete` | `Cmd + BkSp` | `project_manager/remove_project` |
