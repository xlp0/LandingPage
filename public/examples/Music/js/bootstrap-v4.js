// Bootstrap V4 - Modular Application Initialization
// Handles dependency injection and lifecycle management

class ApplicationBootstrap {
    constructor(config = {}) {
        this.config = {
            storeFactory: config.storeFactory || (() => MusicStore),
            configFactory: config.configFactory || (() => MusicVisualizerConfig),
            songsData: config.songsData || SONGS_DATA,
            visualizerConfig: config.visualizerConfig || {},
            uiManagerConfig: config.uiManagerConfig || {},
            autoInit: config.autoInit !== false
        };

        this.app = null;
        this.isBootstrapped = false;
    }

    /**
     * Bootstrap the application
     * @returns {Promise<Object>} Application instance
     */
    async bootstrap() {
        if (this.isBootstrapped) {
            console.log("App already bootstrapped, skipping");
            return this.app;
        }

        try {
            console.log("🚀 Bootstrapping V4 Application...");

            // Create store
            const store = this.config.storeFactory();
            const config = this.config.configFactory();

            // Initialize Three.js visualizer
            console.log("  ├─ Initializing 3D Visualizer...");
            const visualizer = new ThreeVisualizerV4(this.config.visualizerConfig);
            await visualizer.init();

            // Initialize audio engine
            console.log("  ├─ Initializing Audio Engine...");
            const audioEngine = new AudioEngineV4(store, config);
            await audioEngine.initAudio();

            // Initialize UI manager
            console.log("  ├─ Initializing UI Manager...");
            const uiManager = new UIManagerV4({
                store,
                audioEngine,
                visualizer,
                songsData: this.config.songsData,
                ...this.config.uiManagerConfig
            });
            console.log("  ├─ UI Manager initialized");

            // Create app instance
            this.app = {
                store,
                config,
                audioEngine,
                visualizer,
                uiManager,
                dispose: () => this.dispose()
            };

            // Expose globally
            window.app = this.app;
            this.isBootstrapped = true;

            console.log("✨ V4 App Bootstrapped Successfully");
            console.log("  └─ Web Workers + Performance Monitoring enabled");

            return this.app;

        } catch (error) {
            console.error("❌ Bootstrap failed:", error);
            throw error;
        }
    }

    /**
     * Dispose and cleanup application
     */
    dispose() {
        if (!this.isBootstrapped) return;

        console.log("🧹 Disposing V4 Application...");

        if (this.app) {
            // Dispose components in reverse order
            if (this.app.uiManager && typeof this.app.uiManager.dispose === 'function') {
                this.app.uiManager.dispose();
            }

            if (this.app.audioEngine && typeof this.app.audioEngine.destroy === 'function') {
                this.app.audioEngine.destroy();
            }

            if (this.app.visualizer && typeof this.app.visualizer.dispose === 'function') {
                this.app.visualizer.dispose();
            }
        }

        this.app = null;
        this.isBootstrapped = false;
        window.app = null;

        console.log("✅ Application disposed");
    }

    /**
     * Static factory method for quick bootstrap
     * @param {Object} config - Configuration options
     * @returns {Promise<Object>} Application instance
     */
    static async create(config = {}) {
        const bootstrap = new ApplicationBootstrap(config);
        return await bootstrap.bootstrap();
    }
}

// Auto-bootstrap on DOM ready (if not disabled)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        if (!window.app) {
            try {
                await ApplicationBootstrap.create();
                console.log("  └─ Auto-bootstrap completed successfully");
            } catch (error) {
                console.error("❌ Auto-bootstrap failed:", error);
            }
        }
    }, { once: true });
} else {
    // DOM already loaded, bootstrap immediately
    (async () => {
        if (!window.app) {
            try {
                await ApplicationBootstrap.create();
                console.log("  └─ Auto-bootstrap completed successfully");
            } catch (error) {
                console.error("❌ Auto-bootstrap failed:", error);
            }
        }
    })();
}
