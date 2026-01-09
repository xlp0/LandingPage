# Waveform Visualizers

Audio waveform analysis and visualization tools using the Web Audio API and Canvas.

## 📁 Contents

### **WaveFormVisualizer.html**
A comprehensive audio waveform analyzer with library management capabilities.

#### Features
- **Audio Library Management**
  - Configurable audio file library
  - Track metadata display (title, type, description)
  - Visual selection interface
  - Support for multiple audio formats

- **Waveform Visualization**
  - Real-time amplitude visualization
  - Canvas-based rendering
  - Responsive design (auto-scales to container)
  - Frequency spectrum analysis ready

- **Playback Controls**
  - Play/Pause functionality
  - Load custom audio files
  - Browser-based audio decoding
  - Web Audio API integration

## 🎵 Audio Library

The visualizer supports a modular audio library system:

### Configuration
Audio files are configured in:
```
./audio/audio-library.js
```

Example library structure:
```javascript
const AUDIO_LIBRARY = [
  {
    id: 'track1',
    name: 'Example Track',
    type: 'mp3',
    description: 'Sample audio',
    data: './audio/track.mp3' // or data URI
  }
];
```

### Supported Formats
- MP3
- WAV
- OGG
- M4A
- FLAC
- Any format supported by browser's Audio API

## 🚀 Quick Start

### Run Locally
```bash
# Start server from repository root
python3 -m http.server 8000 --bind 0.0.0.0

# Access:
# http://localhost:8000/public/examples/WaveVisualizers/WaveFormVisualizer.html
```

### Adding Audio Files
1. Place audio files in `./audio/` directory
2. Update `audio-library.js` with file metadata
3. Reload the page

### Custom Audio
Click "Load Custom Audio" to analyze any local audio file without modifying the library.

## 🎨 Technical Architecture

### Component Structure
```
┌──────────────────────────────┐
│   WaveformVisualizer         │
├──────────────────────────────┤
│ AudioContext                 │  ← Web Audio API
│ AudioBuffer                  │  ← Decoded audio data
│ Canvas + 2D Context          │  ← Visualization
│ Library Management           │  ← UI/UX layer
└──────────────────────────────┘
```

### Key Technologies
- **Web Audio API**: Audio decoding and processing
- **Canvas API**: Waveform rendering
- **File API**: Custom file loading
- **ES6 Modules**: Class-based architecture

## 📊 Visualization Details

### Waveform Rendering
- **Method**: Amplitude domain visualization
- **Rendering**: Canvas 2D fill + stroke
- **Sampling**: Automatic downsampling for display
- **Style**: Cyan gradient with transparency

### Performance
- Responsive canvas sizing with device pixel ratio
- Efficient rendering using requestAnimationFrame
- Memory-conscious buffer management

## 🎯 Use Cases

1. **Audio Analysis**: Visualize audio file structure
2. **Music Production**: Waveform inspection
3. **Education**: Teach audio concepts
4. **Quality Control**: Identify audio characteristics
5. **Interactive Media**: Embed in applications

## 🔧 Customization

### Styling
The visualizer uses CSS custom properties:
```css
:root {
  --bg-primary: #0a0e14;
  --bg-secondary: #121820;
  --accent-cyan: #00d4ff;
  --accent-orange: #ff7b00;
}
```

### Waveform Colors
Modify in JavaScript:
```javascript
ctx.fillStyle = 'rgba(0, 212, 255, 0.2)';   // Fill
ctx.strokeStyle = 'rgba(0, 212, 255, 0.8)'; // Stroke
```

## 📈 Future Enhancements

Potential additions:
- [ ] Real-time recording visualization
- [ ] Spectrogram view (time-frequency)
- [ ] Zooming and panning
- [ ] Multiple waveform comparison
- [ ] Export capabilities
- [ ] Frequency analysis overlay

## 🌐 Browser Compatibility

- ✅ Chrome/Edge 56+
- ✅ Firefox 44+
- ✅ Safari 11+
- ✅ Opera 43+

Requires:
- Web Audio API support
- Canvas API support
- ES6+ JavaScript

## 📚 Resources

- [Web Audio API Specification](https://www.w3.org/TR/webaudio/)
- [Canvas API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [AudioContext Reference](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext)

---

**Last Updated**: January 9, 2026
