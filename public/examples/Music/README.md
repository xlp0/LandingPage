# Music Notation and Visualization Examples

This directory contains interactive music notation libraries and synchronized audio-visual demonstrations using browser-based technologies.

## 📚 Contents

### Music Notation Libraries

#### 1. **ABC.js Music Sheet Viewer** (`ABCMusic.html`)
- **Library**: [ABC.js](https://github.com/paulrosen/abcjs) v6.4.1
- **Features**:
  - Text-based ABC notation rendering
  - Interactive playback with cursor tracking
  - Support for two-stave (piano) scores
  - Includes 5 classical pieces: Twinkle Twinkle, Ode to Joy, Greensleeves, Minuet in G, Pachelbel Canon
- **Technology**: Pure JavaScript with ABC notation parsing

#### 2. **OpenSheetMusicDisplay Player** (`OSMD.html`)
- **Library**: [OpenSheetMusicDisplay](https://opensheetmusicdisplay.github.io/) v1.8.6
- **Features**:
  - Professional MusicXML rendering
  - Real-time cursor synchronization
  - Audio synthesis with Tone.js
  - Supports complex musical notation
- **Music Files**: Uses `.musicxml` files (Twinkle, Ode to Joy, Minuet, Scale)

#### 3. **VexFlow Music Renderer** (`VexMusic.html`)
- **Library**: [VexFlow](https://www.vexflow.com/) v4.2.3
- **Features**:
  - Low-level music engraving
  - Precise notation control
  - Stave and note rendering
  - Support for various musical elements (clefs, time signatures, etc.)

#### 4. **Synchronized Music Visualizer** (`SyncedMusicVisualizer.html`)
- **Integration**: OSMD + Tone.js + Canvas API
- **Features**:
  - **Dual-panel interface**: Sheet music (top) + Waveform (bottom)
  - **Real-time synchronization**: Sheet cursor moves with audio waveform
  - **Audio synthesis**: Tone.js polyphonic synthesis from MusicXML
  - **Visual feedback**: 64-band frequency spectrum visualization
  - **Interactive controls**: Play/Pause/Stop with time display
- **Purpose**: Demonstrates integrated approach to music education and analysis

## 🎵 Music Files

### MusicXML Files
- `twinkle.musicxml` - Twinkle Twinkle Little Star
- `ode.musicxml` - Ode to Joy (Beethoven)
- `minuet.musicxml` - Minuet in G (Petzold/Bach)
- `scale.musicxml` - Musical scale exercises

### JavaScript Data
- `songs-data.js` - Centralized song metadata and file mappings used by visualizers

## 🚀 Quick Start

### Run Locally
```bash
# Start server in the repository root
python3 -m http.server 8000 --bind 0.0.0.0

# Access examples:
# ABC.js:        http://localhost:8000/public/examples/Music/ABCMusic.html
# OSMD:          http://localhost:8000/public/examples/Music/OSMD.html
# VexFlow:       http://localhost:8000/public/examples/Music/VexMusic.html
# Synchronized:  http://localhost:8000/public/examples/Music/SyncedMusicVisualizer.html
```

### Browser Requirements
- Modern browser with ES6+ support
- Web Audio API for playback
- Canvas API for visualizations

## 📖 Library Comparison

| Feature | ABC.js | OSMD | VexFlow |
|---------|--------|------|---------|
| **Input Format** | ABC notation (text) | MusicXML | Programmatic API |
| **Ease of Use** | Very Easy | Easy | Advanced |
| **Notation Coverage** | Good | Excellent | Excellent |
| **Playback** | Built-in | Via Tone.js | Manual |
| **Customization** | Medium | High | Very High |
| **Best For** | Quick prototypes | Professional scores | Custom engraving |

## 🎯 Use Cases

### ABC.js
- Educational music documentation
- Quick notation sharing
- Folk music and lead sheets
- Embedding music in markdown/wikis

### OpenSheetMusicDisplay
- Classical music rendering
- Music education platforms
- Digital sheet music libraries
- Professional publication

### VexFlow
- Custom music applications
- Music theory visualization
- Interactive notation tools
- Research and analysis

### Synchronized Visualizer
- Music pedagogy
- Audio-visual learning tools
- Performance analysis
- Research demonstrations

## 🔧 Technical Details

### Synchronized Visualizer Architecture

```javascript
// Component Stack
┌─────────────────────────────┐
│   SyncedMusicVisualizer     │  ← Main Class
├─────────────────────────────┤
│ OSMD (Sheet Music)          │  ← Rendering
│ Tone.js (Audio Synthesis)   │  ← Playback
│ Canvas + AnalyserNode       │  ← Visualization
└─────────────────────────────┘
```

### Key Features
- **Cursor Synchronization**: OSMD cursor advances in lockstep with note playback
- **Waveform Analysis**: Real-time frequency domain visualization (FFT)
- **Note Extraction**: Parses MusicXML via OSMD to generate playback sequence
- **Smart Layout**: Responsive grid with music sheet + waveform panels

## 📚 Resources

- **ABC Notation**: [ABC Notation Standard](http://abcnotation.com/)
- **MusicXML**: [MusicXML Specification](https://www.musicxml.com/)
- **Tone.js**: [Web Audio Framework](https://tonejs.github.io/)
- **OpenSheetMusicDisplay**: [OSMD GitHub](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay)

## 🎨 Design Principles

1. **Educational Focus**: Clear visual feedback for learning
2. **Progressive Enhancement**: Works without playback, better with it
3. **Modular Design**: Each example is self-contained
4. **Accessibility**: Keyboard controls and semantic HTML
5. **Performance**: Optimized rendering and audio synthesis

---

**Last Updated**: January 9, 2026  
**Created**: Based on conversation history showing development from January 8-9, 2026
