# 🎭 3D Theater Component

## Overview
The 3D Theater Component is a high-performance visualization environment designed for interactive 3D content. It leverages **Three.js** for WebGL rendering and **Anime.js** for sophisticated animation timelines.

## Features
- **Procedural Geometry**: Supports on-the-fly generation of 3D models (e.g., Teapots, Microbes, Planets).
- **Physical Based Rendering (PBR)**: Uses `MeshPhysicalMaterial` for realistic surfaces including metalness, roughness, and clearcoat properties.
- **Dynamic Lighting Engine**: Built-in lighting presets (Studio, Neon, Sunset, etc.) that can be transitioned smoothly via animation.
- **Cinematic Camera**: Pre-set camera positions with eased transitions for looking at objects from multiple angles.
- **Interactive Micro-animations**: UI buttons and object interactions enhanced with Anime.js spring/elastic easing.

## Technical Specifications
- **Three.js Version**: r147 (Upgraded for `CapsuleGeometry` support)
- **Anime.js Version**: 3.2.2
- **Performance**: High (utilizes GPU accelerated WebGL)

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
