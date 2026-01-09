// UIManager - Handles DOM updates and waveform rendering

class UIManager {
    constructor(store, audioEngine, config = MusicVisualizerConfig) {
        this.store = store;
        this.audioEngine = audioEngine;
        this.config = config;

        // DOM Elements
        this.canvas = document.getElementById('waveform-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.elSongSelector = document.getElementById('songSelector');
        this.elStatusBar = document.getElementById('statusBar');
        this.elPlayBtn = document.getElementById('playBtn');
        this.elStopBtn = document.getElementById('stopBtn');
        this.elTimeCurrent = document.getElementById('currentTime');
        this.elTimeTotal = document.getElementById('totalTime');
        this.playIcon = document.getElementById('play-icon');
        this.pauseIcon = document.getElementById('pause-icon');

        // Subscribe to store
        this.unsubscribe = store.subscribe(() => this.render());

        // Initialize
        this.setupCanvas();
        this.initSongList();
        this.bindEvents();
        this.startWaveformLoop();
    }

    setupCanvas() {
        const container = this.canvas.parentElement;
        const dpr = window.devicePixelRatio || 1;
        
        const resize = () => {
            this.canvas.width = container.clientWidth * dpr;
            this.canvas.height = container.clientHeight * dpr;
            this.canvas.style.width = container.clientWidth + 'px';
            this.canvas.style.height = container.clientHeight + 'px';
            this.ctx.scale(dpr, dpr);
        };
        
        window.addEventListener('resize', resize);
        resize();
    }

    initSongList() {
        Object.keys(SONGS_DATA).forEach(key => {
            const song = SONGS_DATA[key];
            const btn = document.createElement('button');
            btn.className = 'song-btn';
            btn.textContent = song.title;
            btn.onclick = () => this.audioEngine.loadSong(key);
            this.elSongSelector.appendChild(btn);
        });
    }

    bindEvents() {
        this.elPlayBtn.onclick = () => this.audioEngine.togglePlay();
        this.elStopBtn.onclick = () => this.audioEngine.stop();
    }

    render() {
        const state = this.store.getState();
        const { playback, song } = state;

        // Status Bar
        if (song.isLoading) {
            this.elStatusBar.textContent = `Loading "${song.title}"...`;
        } else if (song.error) {
            this.elStatusBar.textContent = `Error: ${song.error}`;
        } else if (playback.isPlaying) {
            this.elStatusBar.textContent = `Playing: "${song.title}"`;
        } else if (song.currentSongId) {
            this.elStatusBar.textContent = `Ready: "${song.title}" by ${song.composer || 'Unknown'}`;
        } else {
            this.elStatusBar.textContent = 'Select a song to begin';
        }

        // Play Button State
        this.elPlayBtn.disabled = !song.currentSongId || song.isLoading;
        this.playIcon.style.display = playback.isPlaying ? 'none' : 'block';
        this.pauseIcon.style.display = playback.isPlaying ? 'block' : 'none';

        // Time Display
        this.elTimeCurrent.textContent = this.formatTime(playback.currentTime);
        this.elTimeTotal.textContent = this.formatTime(playback.duration);

        // Song Button Selection
        Array.from(this.elSongSelector.children).forEach(btn => {
            btn.classList.toggle('active', btn.textContent === song.title);
        });
    }

    formatTime(seconds) {
        const min = Math.floor(seconds / 60).toString().padStart(2, '0');
        const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${min}:${sec}`;
    }

    startWaveformLoop() {
        const animate = () => {
            this.drawWaveform();
            requestAnimationFrame(animate);
        };
        animate();
    }

    drawWaveform() {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        const fft = this.audioEngine.getFFT();

        this.ctx.fillStyle = this.config.WAVEFORM_BG_COLOR;
        this.ctx.fillRect(0, 0, width, height);

        if (!fft) return;

        const values = fft.getValue();
        const barCount = values.length;
        const barWidth = width / barCount;

        for (let i = 0; i < barCount; i++) {
            const db = values[i];
            const value = Math.max(0, (db + 100) / 100);
            const barHeight = value * height * 0.8;

            const hue = 180 + (value * 60);
            this.ctx.fillStyle = `hsla(${hue}, 70%, 60%, 0.8)`;
            this.ctx.fillRect(i * barWidth, height - barHeight, barWidth - 2, barHeight);
        }
    }

    destroy() {
        if (this.unsubscribe) this.unsubscribe();
    }
}
