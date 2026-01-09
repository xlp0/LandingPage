// Main Bootstrap for SyncedMusicVisualizer

async function bootstrap() {
    if (window.app) return; // Prevent double init

    const audioEngine = new AudioEngine(MusicStore, MusicVisualizerConfig);
    await audioEngine.init();

    const uiManager = new UIManager(MusicStore, audioEngine, MusicVisualizerConfig);

    // Expose for debugging
    window.app = { 
        store: MusicStore, 
        audioEngine, 
        uiManager,
        config: MusicVisualizerConfig
    };
    
    console.log("App Bootstrapped Successfully");
}

// Handle DOMContentLoaded
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}
