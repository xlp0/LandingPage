// Configuration constants for SyncedMusicVisualizer

const MusicVisualizerConfig = {
    // Timing
    NOTE_DURATION: 0.5,           // seconds per note
    CLOCK_INTERVAL: 500,          // ms between clock updates
    
    // OSMD pitch conversion
    OCTAVE_OFFSET: 3,             // OSMD octave + offset = standard notation
    NOTE_NAMES: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    
    // Audio synthesis
    SYNTH: {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.5 },
        volume: -6
    },
    
    // FFT visualization
    FFT_SIZE: 64,
    WAVEFORM_BG_COLOR: '#0a0e14',
    
    // OSMD rendering
    OSMD_OPTIONS: {
        autoResize: true,
        backend: 'svg',
        drawingParameters: 'compact',
        followCursor: true,
        cursorsOptions: [{
            type: 0,
            color: '#33cc33',
            alpha: 0.5,
            follow: true
        }]
    }
};

// Freeze to prevent accidental modification
Object.freeze(MusicVisualizerConfig);
Object.freeze(MusicVisualizerConfig.SYNTH);
Object.freeze(MusicVisualizerConfig.OSMD_OPTIONS);
