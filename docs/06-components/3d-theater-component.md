# 🎭 3D Theater Component

## Overview
The 3D Theater Component is a high-performance visualization environment designed for interactive 3D content. It leverages **Three.js** for WebGL rendering and **Anime.js** for sophisticated animation timelines.

## Architecture
The Theater is now built using a **fully modular ESM (ES Modules)** architecture, separating concerns across multiple specialized files:

- **`js/main.js`**: Application entry point and orchestration.
- **`js/scene.js`**: Three.js engine setup (Renderer, Scene, Camera, Lighting).
- **`js/objects.js`**: Procedural geometry factory for 3D models.
- **`js/animations.js`**: Anime.js timeline and camera transition logic.
- **`js/ui.js`**: Event handling and UI state management.
- **`js/config.js`**: Centralized configuration for presets and object metadata.
- **`css/theater.css`**: Decoupled styling for the 3D environment.

## Features
- **Object Selection Dropdown**: Replaced the individual buttons with a sleek custom select menu for better scalability.
- **Procedural Geometry**: Supports on-the-fly generation of 3D models (e.g., Teapots, Microbes, Planets).
- **Physical Based Rendering (PBR)**: Uses `MeshPhysicalMaterial` for realistic surfaces.
- **Dynamic Lighting Engine**: Built-in lighting presets (Studio, Neon, Sunset, etc.) with smooth transitions.
- **Cinematic Camera**: Pre-set camera positions with eased transitions.
- **Interactive Micro-animations**: UI elements enhanced with Anime.js spring/elastic easing.

## Technical Specifications
- **Three.js Version**: r147
- **Anime.js Version**: 3.2.2
- **Module System**: Browser-native ESM (No build step required)
- **Performance**: GPU accelerated WebGL

## Implementation Details
The theater is implemented as a standalone interactive page in `examples/THREEJS_ANIMEJS/Theater_Example.html`. It serves as a blueprint for future CLM components that require 3D visualization capabilities.

### Error Handling & Robustness
The component includes a robust object-switching system with:
- **Try-Catch Blocks**: Prevents the UI from getting stuck if a specific 3D model fails to load.
- **State Management**: Uses an `isAnimating` flag to prevent command overlaps during transitions.

## Usage
To use or view the 3D theater:
1. Open `examples/THREEJS_ANIMEJS/Theater_Example.html` in a WebGL-capable browser.
2. Use the **Object** panel to switch models.
3. Pulse the **Animate** button to trigger the choreographed sequence.

## Related Documents
- [06-components/README.md](README.md)
- [01-architecture/MODULAR_ARCHITECTURE.md](../01-architecture/MODULAR_ARCHITECTURE.md)

## Status
- **Status**: Stable
- **Last Updated**: December 19, 2025
