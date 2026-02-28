# Overview of renderers

<div class="seealso">

This page gives an overview of Godot's renderers, focusing on the differences between their rendering features. For more technical details on the renderers, see `doc_internal_rendering_architecture`.

</div>

## Introduction

Godot 4 includes three renderers:

- **Forward+**. The most advanced renderer, suited for desktop platforms only. Used by default on desktop platforms. This renderer uses **Vulkan**, **Direct3D 12**, or **Metal** as the rendering driver, and it uses the **RenderingDevice** backend.
- **Mobile**. Fewer features, but renders simple scenes faster. Suited for mobile and desktop platforms. Used by default on mobile platforms. This renderer uses **Vulkan**, **Direct3D 12**, or **Metal** as the rendering driver, and it uses the **RenderingDevice** backend.
- **Compatibility**, sometimes called **GL Compatibility**. The least advanced renderer, suited for low-end desktop and mobile platforms. Used by default on the web platform. This renderer uses **OpenGL** as the rendering driver.

### Renderers, rendering drivers, and RenderingDevice

<figure>
<img src="img/renderers_rendering_layers.webp" alt="Diagram of rendering layers. The Compatibility renderer runs on the OpenGL driver. The Forward+ and Mobile renderers run on RenderingDevice, which can use Vulkan, Direct3D 12, or Metal as a rendering driver. :align: center Godot&#39;s rendering abstraction layers." />
</figure>

The *renderer*, or *rendering method*, determines which features are available. Most of the time, this is the only thing you need to think about. Godot's renderers are **Forward+**, **Mobile**, and **Compatibility**.

The *rendering driver* tells the GPU what to do, using a graphics API. Godot can use the **OpenGL**, **Vulkan**, **Direct3D 12**, and **Metal** rendering drivers. Not every GPU supports every rendering driver, and therefore not every GPU supports all renderers. Vulkan, Direct3D 12, and Metal are modern, low-level graphics APIs, and requires newer hardware. OpenGL is an older graphics API that runs on most hardware.

RenderingDevice is a *rendering backend*, an abstraction layer between the renderer and the rendering driver. It is used by the Forward+ and Mobile renderers, and these renderers are sometimes called "RenderingDevice-based renderers".

## Choosing a renderer

Choosing a renderer is a complex question, and depends on your hardware and the which platforms you are developing for. As a starting point:

Choose **Forward+** if:

> - You are developing for desktop.
> - You have relatively new hardware which supports Vulkan, Direct3D 12, or Metal.
> - You are developing a 3D game.
> - You want to use the most advanced rendering features.

Choose **Mobile** if:

> - You are developing for newer mobile devices, desktop XR, or desktop.
> - You have relatively new hardware which supports Vulkan, Direct3D 12, or Metal.
> - You are developing a 3D game.
> - You want to use advanced rendering features, subject to the limitations of mobile hardware.

Choose **Compatibility** if:

> - You are developing for older mobile devices, older desktop devices, or standalone XR. The Compatibility renderer supports the widest range of hardware.
> - You are developing for web. In this case, Compatibility is the only choice.
> - You have older hardware which does not support Vulkan. In this case, Compatibility is the only choice.
> - You are developing a 2D game, or a 3D game which does not need advanced rendering features.
> - You want the best performance possible on all devices and don't need advanced rendering features.

Keep in mind every game is unique, and this is only a starting point. For example, you might choose to use the Compatibility renderer even though you have the latest GPU, so you can support the widest range of hardware. Or you might want to use the Forward+ renderer for a 2D game, so you can use advanced features like compute shaders.

### Switching between renderers

In the editor, you can always switch between renderers by clicking on the renderer name in the upper-right corner of the editor.

Switching between renderers may require some manual tweaks to your scene, lighting, and environment, since each renderer is different. In general, switching between the Mobile and Forward+ renderers will require fewer adjustments than switching between the Compatibility renderer and the Forward+ or Mobile renderers.

Since Godot 4.4, when using Forward+ or Mobile, if Vulkan is not supported, the engine will fall back to Direct3D 12 and vice versa. If the attempted fallback driver is not supported either, the engine will then fall back to Compatibility when the RenderingDevice backend is not supported. This allows the project to run anyway, but it may look different than the intended appearance due to the more limited renderer. This behavior can be disabled in the project settings by unchecking `Rendering > Rendering Device > Fallback to OpenGL 3<class_ProjectSettings_property_rendering/rendering_device/fallback_to_opengl3>`.

## Feature comparison

This is not a complete list of the features of each renderer. If a feature is not listed here, it is available in all renderers, though it may be much faster on some renderers. For a list of *all* features in Godot, see `doc_list_of_features`.

Hardware with RenderingDevice support is hardware which can run Vulkan, Direct3D 12, or Metal.

### Overall comparison

<table style="width:98%;">
<colgroup>
<col style="width: 20%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<thead>
<tr>
<th>Feature</th>
<th>Compatibility</th>
<th>Mobile</th>
<th>Forward+</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>Required</strong> <strong>hardware</strong></td>
<td>Older or low-end.</td>
<td>Newer or high-end. Requires Vulkan, Direct3D 12, or Metal support.</td>
<td>Newer or high-end. Requires Vulkan, Direct3D 12, or Metal support.</td>
</tr>
<tr>
<td>Runs on new hardware</td>
<td colspan="3">✔️ Yes. | ✔️ Yes. | ✔️ Yes. |</td>
</tr>
<tr>
<td>Runs on old and low-end hardware</td>
<td colspan="3"><dl>
<dt>✔️ Yes. | ✔️ Yes, but slower than | ✔️ Yes, but slowest of |</dt>
<dd>
<div class="line-block">Compatibility. | all renderers.</div>
</dd>
</dl></td>
</tr>
<tr>
<td>Runs on hardware without RenderingDevice support</td>
<td colspan="3"><dl>
<dt>✔️ Yes. | ❌ No. | ❌ No. |</dt>
<dd>
<div class="line-block">                         |<br />
                         |<br />
                         |</div>
</dd>
</dl></td>
</tr>
<tr>
<td><strong>Target platforms</strong></td>
<td>Mobile, low-end desktop, web.</td>
<td>Mobile, desktop.</td>
<td>Desktop.</td>
</tr>
<tr>
<td>Desktop</td>
<td colspan="3">✔️ Yes. | ✔️ Yes. | ✔️ Yes. |</td>
</tr>
<tr>
<td>Mobile</td>
<td colspan="3"><dl>
<dt>✔️ Yes (low-end). | ✔️ Yes (high-end). | ⚠️ Supported, but poorly |</dt>
<dd>
<div class="line-block">                         | optimized. Use Mobile or<br />
                         | Compatibility instead.</div>
</dd>
</dl></td>
</tr>
<tr>
<td>XR</td>
<td colspan="3">✔️ Yes. Recommended for | ✔️ Yes. Recommended for | ⚠️ Supported, but poorly | standalone headsets. | desktop headsets. | optimized. Use Mobile or | | Compatibility instead.</td>
</tr>
<tr>
<td>Web</td>
<td colspan="3">✔️ Yes. | ❌ No. | ❌ No. |</td>
</tr>
<tr>
<td>2D Games</td>
<td colspan="3"><dl>
<dt>✔️ Yes. | ✔️ Yes, but | ✔️ Yes, but |</dt>
<dd>
<div class="line-block">Compatibility is usually | Compatibility is usually<br />
good enough for 2D. | good enough for 2D.</div>
</dd>
</dl></td>
</tr>
<tr>
<td>3D Games</td>
<td colspan="3">✔️ Yes. | ✔️ Yes. | ✔️ Yes. |</td>
</tr>
<tr>
<td><strong>Feature set</strong></td>
<td>2D and core 3D features.</td>
<td>Most rendering features.</td>
<td>All rendering features.</td>
</tr>
<tr>
<td>2D rendering features</td>
<td colspan="3"><dl>
<dt>✔️ Yes. | ✔️ Yes. | ✔️ Yes. |</dt>
<dd>
<div class="line-block">                         |</div>
</dd>
</dl></td>
</tr>
<tr>
<td>Core 3D rendering features</td>
<td colspan="3"><dl>
<dt>✔️ Yes. | ✔️ Yes. | ✔️ Yes. |</dt>
<dd>
<div class="line-block">                         |</div>
</dd>
</dl></td>
</tr>
<tr>
<td>Advanced rendering features</td>
<td>❌ No.</td>
<td colspan="2">⚠️ Yes, limited by | ✔️ Yes. All rendering | mobile hardware. | features are supported.</td>
</tr>
<tr>
<td>New features</td>
<td colspan="3">⚠️ Some new rendering | ✔️ Most new rendering | ✔️ All new features are | features are added to | features are added to | added to Forward+. As the Compatibility. Features | Mobile. Mobile usually | focus of new development, are added after Mobile | gets new features as | Forward+ gets features and Forward+. | Forward+ does. | first.</td>
</tr>
<tr>
<td>Rendering cost</td>
<td>Low base cost, but high scaling cost.</td>
<td>Medium base cost, and medium scaling cost.</td>
<td>Highest base cost, and low scaling cost.</td>
</tr>
<tr>
<td>Rendering driver</td>
<td>OpenGL.</td>
<td>Vulkan, Direct3D 12, or Metal.</td>
<td>Vulkan, Direct3D 12, or Metal.</td>
</tr>
</tbody>
</table>

### Lights and shadows

See `doc_lights_and_shadows` for more information.

<table style="width:98%;">
<colgroup>
<col style="width: 23%" />
<col style="width: 24%" />
<col style="width: 24%" />
<col style="width: 24%" />
</colgroup>
<thead>
<tr>
<th>Feature</th>
<th>Compatibility</th>
<th>Mobile</th>
<th>Forward+</th>
</tr>
</thead>
<tbody>
<tr>
<td>Lighting approach</td>
<td>Forward</td>
<td>Forward</td>
<td>Clustered Forward</td>
</tr>
<tr>
<td>Maximum OmniLights</td>
<td>8 per mesh. Can be increased.</td>
<td>8 per mesh, 256 per view.</td>
<td>512 per cluster. Can be increased.</td>
</tr>
<tr>
<td>Maximum SpotLights</td>
<td>8 per mesh. Can be increased.</td>
<td>8 per mesh, 256 per view.</td>
<td>512 per cluster. Can be increased.</td>
</tr>
<tr>
<td>Maximum DirectionalLights</td>
<td>8</td>
<td>8</td>
<td>8</td>
</tr>
<tr>
<td>PCSS for OmniLight and SpotLight</td>
<td>❌ Not supported.</td>
<td colspan="2"><dl>
<dt>✔️ Supported. | ✔️ Supported. |</dt>
<dd>
<div class="line-block"></div>
</dd>
</dl></td>
</tr>
<tr>
<td>PCSS for DirectionalLight</td>
<td>❌ Not supported.</td>
<td>❌ Not supported.</td>
<td>✔️ Supported. |</td>
</tr>
<tr>
<td>Light projector textures</td>
<td>❌ Not supported.</td>
<td colspan="2"><dl>
<dt>✔️ Supported. | ✔️ Supported. |</dt>
<dd>
<div class="line-block"></div>
</dd>
</dl></td>
</tr>
</tbody>
</table>

### Global Illumination

See `doc_introduction_to_global_illumination` for more information.

<table style="width:98%;">
<colgroup>
<col style="width: 23%" />
<col style="width: 24%" />
<col style="width: 24%" />
<col style="width: 24%" />
</colgroup>
<thead>
<tr>
<th>Feature</th>
<th>Compatibility</th>
<th>Mobile</th>
<th>Forward+</th>
</tr>
</thead>
<tbody>
<tr>
<td>ReflectionProbe</td>
<td colspan="3">✔️ Supported, 2 per | ✔️ Supported, 8 per | ✔️ Supported, unlimited. | mesh. | mesh. |</td>
</tr>
<tr>
<td>LightmapGI</td>
<td colspan="3">⚠️ Rendering of baked | ✔️ Supported. | ✔️ Supported. | lightmaps is supported. | | Baking requires hardware | | with RenderingDevice | | support. | |</td>
</tr>
<tr>
<td>VoxelGI</td>
<td>❌ Not supported.</td>
<td>❌ Not supported.</td>
<td>✔️ Supported. |</td>
</tr>
<tr>
<td>Screen-Space Indirect Lighting (SSIL)</td>
<td>❌ Not supported.</td>
<td>❌ Not supported.</td>
<td>✔️ Supported. |</td>
</tr>
<tr>
<td>Signed Distance Field Global Illumination (SDFGI)</td>
<td>❌ Not supported.</td>
<td>❌ Not supported.</td>
<td>✔️ Supported. |</td>
</tr>
</tbody>
</table>

### Environment and post-processing

See `doc_environment_and_post_processing` for more information.

<table style="width:98%;">
<colgroup>
<col style="width: 23%" />
<col style="width: 24%" />
<col style="width: 24%" />
<col style="width: 24%" />
</colgroup>
<thead>
<tr>
<th>Feature</th>
<th>Compatibility</th>
<th>Mobile</th>
<th>Forward+</th>
</tr>
</thead>
<tbody>
<tr>
<td>Fog (Depth and Height)</td>
<td colspan="3">✔️ Supported. | ✔️ Supported. | ✔️ Supported. |</td>
</tr>
<tr>
<td>Volumetric Fog</td>
<td>❌ Not supported.</td>
<td>❌ Not supported.</td>
<td>✔️ Supported. |</td>
</tr>
<tr>
<td>Tonemapping</td>
<td colspan="3">✔️ Supported. | ✔️ Supported. | ✔️ Supported. |</td>
</tr>
<tr>
<td>Screen-Space Reflections</td>
<td>❌ Not supported.</td>
<td>❌ Not supported.</td>
<td>✔️ Supported. |</td>
</tr>
<tr>
<td>Screen-Space Ambient Occlusion (SSAO)</td>
<td colspan="3"><dl>
<dt>✔️ Supported. | ❌ Not supported. | ✔️ Supported. |</dt>
<dd>
<div class="line-block">                         |</div>
</dd>
</dl></td>
</tr>
<tr>
<td>Screen-Space Indirect Lighting (SSIL)</td>
<td>❌ Not supported.</td>
<td>❌ Not supported.</td>
<td>✔️ Supported. |</td>
</tr>
<tr>
<td>Signed Distance Field Global Illumination (SDFGI)</td>
<td>❌ Not supported.</td>
<td>❌ Not supported.</td>
<td>✔️ Supported. |</td>
</tr>
<tr>
<td>Glow</td>
<td colspan="3">✔️ Supported. | ✔️ Supported. | ✔️ Supported. |</td>
</tr>
<tr>
<td>Adjustments</td>
<td colspan="3">✔️ Supported. | ✔️ Supported. | ✔️ Supported. |</td>
</tr>
<tr>
<td>Custom post-processing with fullscreen quad</td>
<td colspan="3"><dl>
<dt>✔️ Supported. | ✔️ Supported. | ✔️ Supported. |</dt>
<dd>
<div class="line-block">                         |</div>
</dd>
</dl></td>
</tr>
<tr>
<td>Custom post-processing with CompositorEffects</td>
<td>❌ Not supported.</td>
<td colspan="2"><dl>
<dt>✔️ Supported. | ✔️ Supported. |</dt>
<dd>
<div class="line-block"></div>
</dd>
</dl></td>
</tr>
</tbody>
</table>

### Antialiasing

See `doc_3d_antialiasing` for more information.

<table style="width:98%;">
<colgroup>
<col style="width: 19%" />
<col style="width: 26%" />
<col style="width: 26%" />
<col style="width: 26%" />
</colgroup>
<thead>
<tr>
<th>Feature</th>
<th>Compatibility</th>
<th>Mobile</th>
<th>Forward+</th>
</tr>
</thead>
<tbody>
<tr>
<td>MSAA 3D</td>
<td colspan="3">✔️ Supported. | ✔️ Supported. | ✔️ Supported. |</td>
</tr>
<tr>
<td>MSAA 2D</td>
<td>❌ Not supported.</td>
<td colspan="2">✔️ Supported. | ✔️ Supported. |</td>
</tr>
<tr>
<td>TAA</td>
<td>❌ Not supported.</td>
<td>❌ Not supported.</td>
<td>✔️ Supported. |</td>
</tr>
<tr>
<td>FSR2</td>
<td>❌ Not supported.</td>
<td>❌ Not supported.</td>
<td>✔️ Supported. |</td>
</tr>
<tr>
<td>FXAA</td>
<td>❌ Not supported.</td>
<td colspan="2">✔️ Supported. | ✔️ Supported. |</td>
</tr>
<tr>
<td>SSAA</td>
<td colspan="3">✔️ Supported. | ✔️ Supported. | ✔️ Supported. |</td>
</tr>
<tr>
<td>Screen-space roughness limiter</td>
<td>❌ Not supported.</td>
<td colspan="2"><dl>
<dt>✔️ Supported. | ✔️ Supported. |</dt>
<dd>
<div class="line-block"></div>
</dd>
</dl></td>
</tr>
</tbody>
</table>

### StandardMaterial features

See `doc_standard_material_3d` for more information.

| Feature                | Compatibility     | Mobile            | Forward+         |
|------------------------|-------------------|-------------------|------------------|
| Sub-surface scattering | ❌ Not supported. | ❌ Not supported. | ✔️ Supported. \| |

### Shader features

See `doc_shading_reference` for more information.

<table style="width:98%;">
<colgroup>
<col style="width: 23%" />
<col style="width: 24%" />
<col style="width: 24%" />
<col style="width: 24%" />
</colgroup>
<thead>
<tr>
<th>Feature</th>
<th>Compatibility</th>
<th>Mobile</th>
<th>Forward+</th>
</tr>
</thead>
<tbody>
<tr>
<td>Screen texture</td>
<td colspan="3">✔️ Supported. | ✔️ Supported. | ✔️ Supported. |</td>
</tr>
<tr>
<td>Depth texture</td>
<td colspan="3"><dl>
<dt>✔️ Supported. | ✔️ Supported. | ✔️ Supported. |</dt>
<dd>
<div class="line-block">                         |</div>
</dd>
</dl></td>
</tr>
<tr>
<td>Normal/Roughness buffer</td>
<td>❌ Not supported.</td>
<td>❌ Not supported.</td>
<td>✔️ Supported. |</td>
</tr>
<tr>
<td>Compute shaders</td>
<td>❌ Not supported.</td>
<td colspan="2">⚠️ Supported, but comes | ✔️ Supported. | with a performance | penalty on older devices.|</td>
</tr>
</tbody>
</table>

### Other features

<table style="width:98%;">
<colgroup>
<col style="width: 23%" />
<col style="width: 24%" />
<col style="width: 24%" />
<col style="width: 24%" />
</colgroup>
<thead>
<tr>
<th>Feature</th>
<th>Compatibility</th>
<th>Mobile</th>
<th>Forward+</th>
</tr>
</thead>
<tbody>
<tr>
<td>Variable rate shading</td>
<td>❌ Not supported.</td>
<td colspan="2"><dl>
<dt>✔️ Supported. | ✔️ Supported. |</dt>
<dd>
<div class="line-block"></div>
</dd>
</dl></td>
</tr>
<tr>
<td>Decals</td>
<td>❌ Not supported.</td>
<td colspan="2">✔️ Supported. | ✔️ Supported. |</td>
</tr>
<tr>
<td>Particle trails</td>
<td>❌ Not supported.</td>
<td colspan="2">✔️ Supported. | ✔️ Supported. |</td>
</tr>
<tr>
<td>Particle SDF collision</td>
<td>❌ Not supported.</td>
<td colspan="2">✔️ Supported. | ✔️ Supported. |</td>
</tr>
<tr>
<td>Depth of field blur</td>
<td>❌ Not supported.</td>
<td colspan="2">✔️ Supported. | ✔️ Supported. |</td>
</tr>
<tr>
<td>Adaptive and Mailbox VSync modes</td>
<td>❌ Not supported.</td>
<td colspan="2"><dl>
<dt>✔️ Supported. | ✔️ Supported. |</dt>
<dd>
<div class="line-block"></div>
</dd>
</dl></td>
</tr>
<tr>
<td>2D HDR Viewport</td>
<td>❌ Not supported.</td>
<td colspan="2">✔️ Supported. | ✔️ Supported. |</td>
</tr>
<tr>
<td>RenderingDevice access</td>
<td>❌ Not supported.</td>
<td colspan="2"><dl>
<dt>✔️ Supported. | ✔️ Supported. |</dt>
<dd>
<div class="line-block"></div>
</dd>
</dl></td>
</tr>
</tbody>
</table>
