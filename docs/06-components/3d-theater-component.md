# 🎭 3D Theater Component

## Overview
The 3D Theater Component is a high-performance visualization environment designed for interactive 3D content. It leverages **Three.js** for WebGL rendering and **Anime.js** for sophisticated animation timelines.

## Architecture
The Theater is built using a **fully modular ESM (ES Modules)** architecture with **data-driven object definitions**:

### JavaScript Modules
- **`js/main.js`**: Application entry point and orchestration.
- **`js/scene.js`**: Three.js engine setup (Renderer, Scene, Camera, Lighting).
- **`js/objects.js`**: Procedural geometry factory for 3D models.
- **`js/object-loader.js`**: Data-driven loader that creates Three.js objects from JSON definitions.
- **`js/animations.js`**: Anime.js timeline and camera transition logic.
- **`js/ui.js`**: Event handling and UI state management.
- **`js/config.js`**: Centralized configuration for presets and object metadata.
- **`js/audio.js`**: Synthesized audio engine using Tone.js.
- **`css/theater.css`**: Decoupled styling for the 3D environment.

### Data-Driven Object Definitions
All 3D objects are defined declaratively in JSON files located in `data/objects/`:

```
data/
├── objects/
│   ├── schema.json      # JSON Schema for object definitions
│   ├── teapot.json      # 🫖 Teapot geometry and materials
│   ├── table.json       # 🪑 Table with wood texture
│   ├── crystal.json     # 🔮 Crystal ball with glass
│   ├── earth.json       # 🌍 Earth with satellite textures
│   ├── solar.json       # ☀️ Solar system scene
│   └── microbes.json    # 🦠 Microscopic organisms
```

This separation allows adding new 3D objects by creating JSON files without modifying code.

## Features
- **Object Selection Dropdown**: Dynamically populated from `CONFIG.objects` registry.
- **Real Satellite Textures**: Earth uses 2K imagery from Solar System Scope.
- **Procedural Geometry**: Supports on-the-fly generation of 3D models.
- **Physical Based Rendering (PBR)**: Uses `MeshPhysicalMaterial` for realistic surfaces.
- **Dynamic Lighting Engine**: Built-in lighting presets (Studio, Neon, Sunset, etc.).
- **Cinematic Camera**: Pre-set camera positions with eased transitions.
- **Synthesized Audio Engine**: Integrated **Tone.js** for MIDI-like musical feedback.

## Technical Specifications
- **Three.js Version**: r147 (locally hosted in `/js/vendor/`)
- **Anime.js Version**: 3.2.2 (locally hosted in `/js/vendor/`)
- **Tone.js Version**: 14.7.77 (locally hosted in `/js/vendor/`)
- **Module System**: Browser-native ESM (No build step required)
- **Performance**: GPU accelerated WebGL + Web Audio API
- **Offline Support**: All libraries hosted locally for offline capability

## File Locations
```
public/examples/THREEJS_ANIMEJS/
├── Theater_Example.html    # Main viewer page
├── css/theater.css         # Component styling
├── js/                     # ES Modules
│   ├── main.js            # Entry point
│   ├── scene.js           # Three.js setup
│   ├── objects.js         # Object factory (legacy)
│   ├── object-loader.js   # Data-driven loader
│   ├── animations.js      # Anime.js logic
│   ├── ui.js              # UI events
│   ├── config.js          # Configuration
│   └── audio.js           # Tone.js audio
├── data/                   # JSON object definitions
│   └── objects/*.json
└── textures/               # Image textures
    ├── earth.jpg           # 2K Earth satellite map
    └── clouds.jpg          # 2K cloud layer
```

## Usage
To use or view the 3D theater:
1. Open `public/examples/THREEJS_ANIMEJS/Theater_Example.html` in a WebGL-capable browser.
2. Or access via the main landing page's **3D Viewer** button.
3. Use the **Object** dropdown to switch models.
4. Click **Animate** to trigger the choreographed sequence.

## Related Documents
- [06-components/README.md](README.md)
- [01-architecture/MODULAR_ARCHITECTURE.md](../01-architecture/MODULAR_ARCHITECTURE.md)

## Status
- **Status**: Stable
- **Last Updated**: December 19, 2025
