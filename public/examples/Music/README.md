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

#### 4. **Synchronized Music Visualizer**
Four versions available:
- `SyncedMusicVisualizer.html` - Monolithic version (all-in-one)
- `SyncedMusicVisualizerV2.html` - Modular version with 2D waveform
- `SyncedMusicVisualizerV3.html` - 3D version with interactive controls
- `SyncedMusicVisualizerV4.html` - **High-performance with Web Workers** (recommended)

**V1 & V2 Features**:
- **Integration**: OSMD + Tone.js + Redux + Canvas API
- **Dual-panel interface**: Sheet music (top) + Waveform (bottom)
- **Real-time synchronization**: Sheet cursor moves with audio playback
- **Audio synthesis**: Tone.js PolySynth with triangle oscillator
- **Visual feedback**: 64-band FFT frequency spectrum visualization
- **State management**: Plain Redux with playback and song reducers

**V3 New Features**:
- **3D Visualization**: Three.js-powered 3D audio bars with real-time FFT data
- **Interactive Camera**: OrbitControls for mouse drag rotation and zoom
- **Smooth Animations**: anime.js for fluid UI transitions
- **Modern Styling**: Tailwind CSS with gradient backgrounds
- **Enhanced Cursor**: Visible green cursor for score following
- **All Libraries Local**: No external CDN dependencies

**V4 Performance Features**:
- **Web Workers**: Offloads note extraction to background thread (non-blocking)
- **Performance Metrics**: Real-time display of render and processing times
- **Optimized Architecture**: AudioEngineV4 with async worker communication
- **Same Features as V3**: All 3D visualization and interactive controls
- **Measurable Improvements**: ~20ms render time, <1ms worker dispatch

**V5 Recommended Features**:
- **Universal File Loader**: Loads music files from any source
- **Caching**: Stores frequently used music files for faster access
- **Reusable Architecture**: Modular design for easy integration with other projects

**V5 Universal File Loader Features ⭐**
- **FileLoaderV5 Module**: Universal, reusable file loading system
- **Multi-Format Support**: XML, JSON, text, binary, images
- **Intelligent Caching**: Automatic caching with Map-based storage
- **Progress Tracking**: Real-time loading progress callbacks
- **Retry Logic**: Automatic retry with configurable delays
- **Request Deduplication**: Prevents duplicate simultaneous requests
- **Statistics Dashboard**: Monitor cache hits, requests, and performance
- **Fully Reusable**: Can be used in any project, not just music apps
- **Zero Dependencies**: Pure JavaScript, framework-agnostic

**Purpose**: Demonstrates integrated approach to music education and analysis with modern 3D visualization and high-performance architecture

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

### Synchronized Visualizer Architecture (V2 Modular)

```
SyncedMusicVisualizerV2.html (88 lines)
├── css/
│   └── visualizer.css        (218 lines) - Styles with CSS variables
└── js/
    ├── config.js             (32 lines)  - Centralized constants
    ├── store.js              (82 lines)  - Redux store setup
    ├── NoteExtractor.js      (59 lines)  - OSMD pitch conversion
    ├── AudioEngine.js        (189 lines) - Audio/playback logic
    ├── UIManager.js          (133 lines) - DOM/waveform rendering
    └── main.js               (25 lines)  - Bootstrap
```

```
┌─────────────────────────────────────────────────────────┐
│                    Redux Store (store.js)                │
│  ┌─────────────────┐  ┌─────────────────┐               │
│  │  playbackReducer│  │   songReducer   │               │
│  │  - isPlaying    │  │  - currentSongId│               │
│  │  - currentTime  │  │  - title        │               │
│  │  - duration     │  │  - composer     │               │
│  └────────┬────────┘  └────────┬────────┘               │
└───────────┼────────────────────┼────────────────────────┘
            │ subscribe()        │
    ┌───────▼────────┐   ┌───────▼────────┐
    │  AudioEngine   │   │   UIManager    │
    │  - OSMD        │   │  - DOM updates │
    │  - Tone.js     │   │  - Waveform    │
    │  - NoteExtract │   │  - Controls    │
    └────────────────┘   └────────────────┘
```

### Dependencies
- **Redux** v4.2.1 - State management (plain Redux, not Redux Toolkit)
- **OSMD** v1.8.6 - MusicXML rendering
- **Tone.js** v14.8.49 - Web Audio synthesis

### Key Features
- **Modular Architecture**: Separate files for config, store, audio, UI
- **Cursor Synchronization**: OSMD cursor advances in lockstep with note playback
- **Waveform Analysis**: Real-time FFT visualization using Tone.js FFT analyzer
- **Note Extraction**: `NoteExtractor` class converts OSMD pitch to Tone.js format
- **Deferred Audio Init**: Audio context initialized on first user gesture
- **Centralized Config**: All magic numbers in `config.js`

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

## 📝 Changelog

### January 10, 2026 - V5 Universal File Loader Edition (Latest) ⭐
- **Created** `FileLoaderV5.js` (450 lines) - Universal, reusable file loading module
- **Created** `AudioEngineV5.js` - Audio engine with FileLoader integration
- **Created** `SyncedMusicVisualizerV5.html` - Demonstrates FileLoader capabilities
- **Added** FILELOADER-README.md - Comprehensive documentation
- **Features**:
  - Multi-format support (XML, JSON, text, binary, images)
  - Intelligent caching with Map-based storage
  - Progress tracking with real-time callbacks
  - Automatic retry logic with configurable delays
  - Request deduplication (prevents duplicate loads)
  - Statistics dashboard (cache hits, requests, performance)
  - Timeout handling and error recovery
- **Reusability**: FileLoader can be used in ANY project, not just music apps
- **Zero Dependencies**: Pure JavaScript, framework-agnostic
- **Performance**: <1ms for cached files, automatic request optimization

### January 10, 2026 - V4 Web Workers Edition
- **Created** `SyncedMusicVisualizerV4.html` - High-performance version with Web Workers
- **Added** Web Worker for note extraction (`js/workers/noteExtractor.worker.js`)
- **Created** `AudioEngineV4.js` with async worker communication
- **Added** Performance metrics display panel showing:
  - OSMD render time (~20ms)
  - Worker dispatch time (<1ms)
  - Total load time
- **Implemented** Non-blocking note extraction in background thread
- **Enhanced** UI with performance badges and real-time metrics
- **Maintained** All V3 features (3D visualization, OrbitControls, animations)
- **Performance Gain**: Note extraction no longer blocks main thread

### January 9, 2026 - V3 3D Visualizer
- **Created** `SyncedMusicVisualizerV3.html` - 3D interactive version
- **Added** Three.js r128 for 3D visualization with 32 animated bars
- **Added** OrbitControls for mouse drag rotation and zoom (15-80 units)
- **Added** anime.js v3.2.2 for smooth UI animations
- **Added** Tailwind CSS runtime for modern gradient styling
- **Downloaded** all external libraries locally to `js/lib/`:
  - `three.min.js` (654 KB)
  - `OrbitControls.js` (26 KB)
  - `anime.min.js` (17 KB)
  - `tailwind.js` (Tailwind runtime)
- **Fixed** OSMD cursor visibility with custom styling (120px height, green color)
- **Enhanced** 3D bars react to FFT data with emissive lighting
- **Improved** side-by-side layout: sheet music + 3D visualization

### January 9, 2026 - V2 Modular Refactor
- **Created** `SyncedMusicVisualizerV2.html` - new modular version
- **Extracted** CSS to `css/visualizer.css` with CSS variables
- **Extracted** Redux store to `js/store.js`
- **Created** `js/config.js` for centralized constants
- **Created** `js/NoteExtractor.js` for OSMD pitch conversion
- **Created** `js/AudioEngine.js` for audio/playback logic
- **Created** `js/UIManager.js` for DOM and waveform rendering
- **Created** `js/main.js` for bootstrap
- **Reduced** HTML from 792 lines to 88 lines

### January 9, 2026 - Bug Fixes
- **Refactored** `SyncedMusicVisualizer.html` to use plain Redux instead of Redux Toolkit
- **Fixed** audio initialization - now defers until first user gesture
- **Fixed** note extraction octave mapping (OSMD octave +3 offset for standard notation)
- **Fixed** `playNextNote()` to iterate over `noteData.notes[]` array properly
- **Updated** waveform visualization to use Tone.js FFT analyzer

### January 8-9, 2026
- Initial development of all music notation examples
- Created ABC.js, OSMD, VexFlow, and SyncedMusicVisualizer demos

---

**Last Updated**: January 9, 2026  
**Created**: January 8, 2026
