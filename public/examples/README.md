# PKC Examples Directory

This directory contains interactive examples demonstrating various capabilities of the PKC (Personal Knowledge Container) system.

## Directory Structure

### 📁 **Music**
JavaScript music notation libraries and synchronized visualizers:
- **ABC.js Viewer** - Text-based music notation rendering
- **OpenSheetMusicDisplay (OSMD)** - MusicXML sheet music rendering
- **VexFlow** - Music engraving library
- **Synchronized Visualizer** - Combined sheet music + waveform visualization

See [Music/README.md](./Music/README.md) for details.

### 📁 **WaveVisualizers**
Audio waveform visualization and analysis:
- Real-time frequency spectrum analysis
- Audio library management
- Canvas-based waveform rendering

See [WaveVisualizers/README.md](./WaveVisualizers/README.md) for details.

### 📁 **3DGames**
Interactive 3D experiences and games:
- **MorphismCube** - Category theory visualization using Three.js

See [3DGames/README.md](./3DGames/README.md) for details.

### 📁 **THREEJS_ANIMEJS**
3D theater and visualization engine:
- Interactive 3D object rendering
- Animation system with Anime.js
- Sound synthesis with Tone.js

See [THREEJS_ANIMEJS/README.md](./THREEJS_ANIMEJS/README.md) for details.

### 📁 **games**
Browser-based games:
- **Bali Adventure** - Explore Ubud Rice Terraces in a 2D RPG

## Running Examples

All examples are static HTML files that can be run directly in a web browser:

```bash
# Start a local server
python3 -m http.server 8000 --bind 0.0.0.0

# Access examples at:
# http://localhost:8000/public/examples/
```

## Technology Stack

- **Three.js** - 3D graphics library
- **Anime.js** - Animation engine
- **Tone.js** - Web audio framework
- **ABC.js** - Music notation library
- **OpenSheetMusicDisplay** - Sheet music rendering
- **VexFlow** - Music engraving

## Browser Requirements

- Modern browsers with ES6+ support
- WebGL support for 3D examples
- Web Audio API support for music examples

---

**Last Updated**: January 9, 2026
