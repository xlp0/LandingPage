// UIManagerV4 - Modular UI Manager with Dependency Injection
// Highly reusable, testable, and configurable

class UIManagerV4 {
    constructor(dependencies = {}) {
        // Validate required dependencies
        this._validateDependencies(dependencies);

        // Store dependencies
        this.store = dependencies.store;
        this.audioEngine = dependencies.audioEngine;
        this.visualizer = dependencies.visualizer;
        this.songsData = dependencies.songsData || SONGS_DATA;

        // Configuration with defaults
        this.config = {
            selectors: {
                songSelector: dependencies.selectors?.songSelector || 'songSelector',
                statusBar: dependencies.selectors?.statusBar || 'statusBar',
                playBtn: dependencies.selectors?.playBtn || 'playBtn',
                stopBtn: dependencies.selectors?.stopBtn || 'stopBtn',
                currentTime: dependencies.selectors?.currentTime || 'currentTime',
                totalTime: dependencies.selectors?.totalTime || 'totalTime',
                playIcon: dependencies.selectors?.playIcon || 'play-icon',
                pauseIcon: dependencies.selectors?.pauseIcon || 'pause-icon',
                perfMetrics: dependencies.selectors?.perfMetrics || 'perfMetrics',
                metricRender: dependencies.selectors?.metricRender || 'metricRender',
                metricWorker: dependencies.selectors?.metricWorker || 'metricWorker',
                metricTotal: dependencies.selectors?.metricTotal || 'metricTotal'
            },
            buttonAnimation: dependencies.buttonAnimation !== false,
            performanceMonitoring: dependencies.performanceMonitoring !== false,
            monitoringInterval: dependencies.monitoringInterval || 100
        };

        // DOM Elements cache
        this.elements = {};
        this._cacheElements();

        // State
        this.isDisposed = false;
        this.unsubscribe = null;
        this.monitoringIntervalId = null;
        this.visualizationFrameId = null;

        // Initialize
        this._init();
    }

    /**
     * Validate required dependencies
     * @private
     */
    _validateDependencies(deps) {
        if (!deps.store) throw new Error('UIManagerV4 requires a store dependency');
        if (!deps.audioEngine) throw new Error('UIManagerV4 requires an audioEngine dependency');
        if (!deps.visualizer) throw new Error('UIManagerV4 requires a visualizer dependency');
    }

    /**
     * Cache DOM elements
     * @private
     */
    _cacheElements() {
        const { selectors } = this.config;
        
        for (const [key, id] of Object.entries(selectors)) {
            const element = document.getElementById(id);
            if (!element) {
                console.warn(`Element not found: ${id}`);
            }
            this.elements[key] = element;
        }
    }

    /**
     * Initialize UI Manager
     * @private
     */
    _init() {
        // Subscribe to store changes
        this.unsubscribe = this.store.subscribe(() => this.render());

        // Initialize components
        this.initSongList();
        this.bindEvents();
        
        if (this.config.performanceMonitoring) {
            this.startPerformanceMonitoring();
        }
        
        this.startVisualizationLoop();
    }

    /**
     * Initialize song list buttons
     */
    initSongList() {
        if (!this.elements.songSelector) return;

        // Clear existing content (including loading indicator)
        this.elements.songSelector.innerHTML = '';

        const songKeys = Object.keys(this.songsData);
        songKeys.forEach((key, index) => {
            const song = this.songsData[key];
            const btn = this._createSongButton(key, song);
            this.elements.songSelector.appendChild(btn);
        });

        // Auto-select first song after buttons are created
        if (songKeys.length > 0) {
            setTimeout(() => {
                const firstKey = songKeys[0];
                this.audioEngine.loadSong(firstKey);
            }, 100);
        }
    }

    /**
     * Create a song button
     * @private
     */
    _createSongButton(key, song) {
        const btn = document.createElement('button');
        btn.className = 'px-5 py-2.5 rounded-full bg-slate-700/50 border border-slate-600 text-sm font-medium hover:bg-slate-600/50 hover:-translate-y-0.5 transition-all';
        btn.textContent = song.title;
        btn.dataset.songKey = key;
        
        btn.onclick = () => {
            if (this.config.buttonAnimation && typeof anime !== 'undefined') {
                anime({
                    targets: btn,
                    scale: [1, 0.95, 1],
                    duration: 200,
                    easing: 'easeInOutQuad'
                });
            }
            this.audioEngine.loadSong(key);
        };
        
        return btn;
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        if (this.elements.playBtn) {
            this.elements.playBtn.onclick = () => this.audioEngine.togglePlay();
        }
        
        if (this.elements.stopBtn) {
            this.elements.stopBtn.onclick = () => this.audioEngine.stop();
        }
    }

    /**
     * Render UI based on store state
     */
    render() {
        if (this.isDisposed) return;

        const state = this.store.getState();
        const { playback, song } = state;

        this._updateStatusBar(song, playback);
        this._updatePlayButton(song, playback);
        this._updateTimeDisplay(playback);
        this._updateSongButtons(song);
    }

    /**
     * Update status bar
     * @private
     */
    _updateStatusBar(song, playback) {
        if (!this.elements.statusBar) return;

        let statusText = 'Select a song to begin';

        if (song.isLoading) {
            statusText = `Loading "${song.title}"...`;
        } else if (song.error) {
            statusText = `Error: ${song.error}`;
        } else if (playback.isPlaying) {
            statusText = `Playing: "${song.title}"`;
        } else if (song.currentSongId) {
            statusText = `Ready: "${song.title}" by ${song.composer || 'Unknown'}`;
        }

        this.elements.statusBar.textContent = statusText;
    }

    /**
     * Update play button state
     * @private
     */
    _updatePlayButton(song, playback) {
        if (!this.elements.playBtn) return;

        this.elements.playBtn.disabled = !song.currentSongId || song.isLoading;
        
        if (this.elements.playIcon) {
            this.elements.playIcon.classList.toggle('hidden', playback.isPlaying);
        }
        
        if (this.elements.pauseIcon) {
            this.elements.pauseIcon.classList.toggle('hidden', !playback.isPlaying);
        }
    }

    /**
     * Update time display
     * @private
     */
    _updateTimeDisplay(playback) {
        if (this.elements.currentTime) {
            this.elements.currentTime.textContent = this.formatTime(playback.currentTime);
        }
        
        if (this.elements.totalTime) {
            this.elements.totalTime.textContent = this.formatTime(playback.duration);
        }
    }

    /**
     * Update song button selection state
     * @private
     */
    _updateSongButtons(song) {
        if (!this.elements.songSelector) return;

        const buttons = this.elements.songSelector.children;
        
        for (const btn of buttons) {
            const isSelected = btn.textContent === song.title;
            btn.classList.toggle('bg-gradient-to-r', isSelected);
            btn.classList.toggle('from-cyan-500', isSelected);
            btn.classList.toggle('to-purple-500', isSelected);
            btn.classList.toggle('border-cyan-400', isSelected);
            btn.classList.toggle('shadow-lg', isSelected);
            btn.classList.toggle('shadow-cyan-500/30', isSelected);
        }
    }

    /**
     * Format time in MM:SS
     */
    formatTime(seconds) {
        const min = Math.floor(seconds / 60).toString().padStart(2, '0');
        const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${min}:${sec}`;
    }

    /**
     * Start visualization loop
     */
    startVisualizationLoop() {
        const animate = () => {
            if (this.isDisposed) return;

            const fft = this.audioEngine.getFFT();
            if (fft) {
                const values = fft.getValue();
                this.visualizer.updateBars(values);
            }
            
            this.visualizationFrameId = requestAnimationFrame(animate);
        };
        
        animate();
    }

    /**
     * Start performance monitoring
     */
    startPerformanceMonitoring() {
        if (!this.elements.perfMetrics) return;

        this.monitoringIntervalId = setInterval(() => {
            if (this.isDisposed) return;

            const metrics = this.audioEngine.metrics;
            if (metrics && metrics.renderTime > 0) {
                this.elements.perfMetrics.classList.remove('hidden');
                
                if (this.elements.metricRender) {
                    this.elements.metricRender.textContent = `${metrics.renderTime.toFixed(1)}ms`;
                }
                
                if (this.elements.metricWorker) {
                    this.elements.metricWorker.textContent = `${metrics.workerTime.toFixed(1)}ms`;
                }
                
                if (this.elements.metricTotal) {
                    const total = metrics.renderTime + metrics.workerTime;
                    this.elements.metricTotal.textContent = `${total.toFixed(1)}ms`;
                }
            }
        }, this.config.monitoringInterval);
    }

    /**
     * Dispose and cleanup
     */
    dispose() {
        if (this.isDisposed) return;

        this.isDisposed = true;

        // Unsubscribe from store
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }

        // Clear intervals
        if (this.monitoringIntervalId) {
            clearInterval(this.monitoringIntervalId);
            this.monitoringIntervalId = null;
        }

        // Cancel animation frame
        if (this.visualizationFrameId) {
            cancelAnimationFrame(this.visualizationFrameId);
            this.visualizationFrameId = null;
        }

        // Clear event listeners
        if (this.elements.playBtn) {
            this.elements.playBtn.onclick = null;
        }
        
        if (this.elements.stopBtn) {
            this.elements.stopBtn.onclick = null;
        }

        // Clear song button listeners
        if (this.elements.songSelector) {
            const buttons = this.elements.songSelector.children;
            for (const btn of buttons) {
                btn.onclick = null;
            }
        }

        // Clear references
        this.elements = {};
        this.store = null;
        this.audioEngine = null;
        this.visualizer = null;
    }
}
