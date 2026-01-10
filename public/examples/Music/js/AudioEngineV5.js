// AudioEngineV5 - Enhanced Audio Engine using FileLoaderV5
// Demonstrates reusable FileLoader integration

class AudioEngineV5 {
    constructor(store, config, fileLoader = null) {
        this.store = store;
        this.config = config;

        // Use provided FileLoader or create new one
        this.fileLoader = fileLoader || new FileLoaderV5({
            cache: true,
            timeout: 30000,
            retries: 3,
            baseUrl: './',
            onProgress: (progress) => {
                console.log(`Loading: ${progress.percentage.toFixed(1)}%`);
            },
            onError: (error, url) => {
                console.error(`Failed to load ${url}:`, error);
            }
        });

        this.osmd = null;
        this.synth = null;
        this.fft = null;
        this.noteWorker = null;
        this.allNotes = [];
        this.currentNoteIndex = 0;
        this.playbackTimeout = null;
        this.audioInitialized = false;
        this.currentSongId = null;
        this.currentSongTitle = '';
        this.currentSongComposer = '';

        // Performance metrics
        this.metrics = {
            renderTime: 0,
            workerTime: 0,
            loadTime: 0
        };

        this._initWorker();
    }

    _initWorker() {
        // Add cache-busting parameter to force worker reload
        this.noteWorker = new Worker('./js/workers/noteExtractor.worker.js?v=' + Date.now());
        this.noteWorker.onmessage = (e) => this.handleWorkerMessage(e.data);
    }

    handleWorkerMessage({ type, notes, error }) {
        if (type === 'NOTES_EXTRACTED') {
            this.allNotes = notes;
            this.currentNoteIndex = 0;

            const estimatedDuration = this.allNotes.length * this.config.NOTE_DURATION;

            this.store.dispatch(Actions.songLoaded({
                id: this.currentSongId,
                title: this.currentSongTitle,
                composer: this.currentSongComposer
            }));
            this.store.dispatch(Actions.setDuration(estimatedDuration));
            this.store.dispatch(Actions.setStatus('Ready'));

            console.log(`✅ Worker extracted ${notes.length} notes`);
        } else if (type === 'EXTRACTION_ERROR') {
            console.error('Worker extraction error:', error);
            this.store.dispatch(Actions.setStatus('Error: ' + error));
        }
    }

    async initAudio() {
        if (this.audioInitialized) return;

        try {
            // Don't wait for Tone.start() - it requires user gesture
            Tone.start().catch(e => {
                console.log("Tone.js will start on user interaction");
            });

            this.fft = new Tone.FFT(this.config.FFT_SIZE);

            this.synth = new Tone.PolySynth(Tone.Synth, this.config.SYNTH);
            this.synth.connect(this.fft);
            this.synth.toDestination();

            this.audioInitialized = true;
            console.log("Audio initialized successfully");
        } catch (e) {
            console.warn("Audio initialization failed:", e);
        }
    }

    /**
     * Load song using FileLoader
     * @param {string} songId - Song identifier
     */
    async loadSong(songId) {
        this.stop();
        const song = SONGS_DATA[songId];
        if (!song) {
            console.error(`Song not found: ${songId}`);
            return;
        }

        this.currentSongId = songId;
        this.currentSongTitle = song.title;
        this.currentSongComposer = song.composer;

        this.store.dispatch(Actions.startLoading({ id: songId, title: song.title }));
        this.store.dispatch(Actions.setStatus(`Loading "${song.title}"...`));

        try {
            // Initialize OSMD if not already done
            if (!this.osmd) {
                const container = document.getElementById('osmd-container');
                this.osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(container, this.config.OSMD_OPTIONS);
            }

            // Note: Songs use embedded XML, so FileLoader is not used here
            // FileLoader is ready for external file loading if needed
            const loadStart = performance.now();
            console.log(`📂 Loading MusicXML (embedded)`);

            // Simulate minimal load time for embedded XML
            this.metrics.loadTime = performance.now() - loadStart;

            // Render with OSMD
            const renderStart = performance.now();
            await this.osmd.load(song.xml);
            await this.osmd.render();
            this.metrics.renderTime = performance.now() - renderStart;

            console.log(`✅ Rendered in ${this.metrics.renderTime.toFixed(1)}ms`);

            this.osmd.cursor.show();
            this.osmd.cursor.reset();

            // Style cursor
            setTimeout(() => {
                if (this.osmd && this.osmd.cursor && this.osmd.cursor.cursorElement) {
                    const cursor = this.osmd.cursor.cursorElement;
                    cursor.style.zIndex = '100';
                    cursor.style.height = '120px';
                    cursor.style.width = '3px';
                    cursor.style.backgroundColor = '#33cc33';
                    cursor.style.opacity = '0.6';
                }
            }, 100);

            // Extract notes using Web Worker
            this.store.dispatch(Actions.setStatus('Extracting notes...'));
            const workerStart = performance.now();

            const cursorData = this.serializeCursorData();
            this.noteWorker.postMessage({
                type: 'EXTRACT_NOTES',
                data: {
                    cursorPositions: cursorData,
                    noteDuration: this.config.NOTE_DURATION
                }
            });

            this.metrics.workerTime = performance.now() - workerStart;

            console.log(`📊 Performance: Load=${this.metrics.loadTime.toFixed(1)}ms, Render=${this.metrics.renderTime.toFixed(1)}ms, Worker dispatch=${this.metrics.workerTime.toFixed(1)}ms`);

        } catch (error) {
            console.error('Failed to load song:', error);
            this.store.dispatch(Actions.loadError(error.message));
        }
    }

    /**
     * Preload songs for better performance
     * @param {Array<string>} songIds - Array of song IDs to preload
     */
    async preloadSongs(songIds) {
        console.log(`🔄 Preloading ${songIds.length} songs...`);

        const urls = songIds
            .map(id => SONGS_DATA[id])
            .filter(song => song)
            .map(song => song.xml);

        try {
            await this.fileLoader.preload(urls);
            console.log(`✅ Preloaded ${urls.length} songs`);
        } catch (error) {
            console.warn('Preload failed:', error);
        }
    }

    /**
     * Get FileLoader statistics
     */
    getLoaderStats() {
        return this.fileLoader.getStats();
    }

    serializeCursorData() {
        if (!this.osmd || !this.osmd.cursor) return null;

        const data = [];
        this.osmd.cursor.reset();

        while (!this.osmd.cursor.Iterator.EndReached) {
            const voices = this.osmd.cursor.VoicesUnderCursor();
            const notesAtPosition = [];

            for (const voice of voices) {
                for (const note of voice.Notes) {
                    if (!note.isRest() && note.Pitch) {
                        const pitch = note.Pitch;
                        notesAtPosition.push({
                            fundamentalNote: pitch.FundamentalNote,
                            octave: pitch.Octave,
                            accidental: pitch.Accidental || 0
                        });
                    }
                }
            }

            if (notesAtPosition.length > 0) {
                data.push(notesAtPosition);
            }

            this.osmd.cursor.next();
        }

        this.osmd.cursor.reset();
        return data;
    }

    async togglePlay() {
        const state = this.store.getState();

        if (state.playback.isPlaying) {
            this.pause();
        } else {
            await this.play();
        }
    }

    async play() {
        if (!this.audioInitialized) {
            await this.initAudio();
        }

        // Always restart from the beginning
        this.currentNoteIndex = 0;
        this.store.dispatch(Actions.setTime(0));
        if (this.osmd && this.osmd.cursor) {
            this.osmd.cursor.reset();
        }

        this.store.dispatch(Actions.setPlaying(true));
        this.store.dispatch(Actions.setStatus('Playing'));
        this.playNextNote();
    }

    pause() {
        this.store.dispatch(Actions.setPlaying(false));
        this.store.dispatch(Actions.setStatus('Paused'));

        if (this.playbackTimeout) {
            clearTimeout(this.playbackTimeout);
            this.playbackTimeout = null;
        }
    }

    stop() {
        this.pause();
        this.currentNoteIndex = 0;
        this.store.dispatch(Actions.setTime(0));
        this.store.dispatch(Actions.setStatus('Stopped'));

        if (this.osmd && this.osmd.cursor) {
            this.osmd.cursor.reset();
        }
    }

    playNextNote() {
        const state = this.store.getState();
        if (!state.playback.isPlaying) return;

        if (this.currentNoteIndex >= this.allNotes.length) {
            this.store.dispatch(Actions.setPlaying(false));
            this.store.dispatch(Actions.setStatus('Finished'));
            return;
        }

        const noteData = this.allNotes[this.currentNoteIndex];

        if (this.synth && noteData.notes && noteData.notes.length > 0) {
            try {
                const now = Tone.now();
                noteData.notes.forEach(pitch => {
                    this.synth.triggerAttackRelease(pitch, "8n", now);
                });
            } catch (e) {
                console.warn("Synth trigger failed:", e);
            }
        }

        if (this.osmd) {
            this.osmd.cursor.next();
        }

        this.currentNoteIndex++;

        if (this.currentNoteIndex % 2 === 0) {
            this.store.dispatch(Actions.setTime(this.currentNoteIndex * 0.5));
        }

        this.playbackTimeout = setTimeout(() => this.playNextNote(), 500);
    }

    getFFT() {
        return this.fft;
    }

    destroy() {
        this.stop();

        if (this.noteWorker) {
            this.noteWorker.terminate();
            this.noteWorker = null;
        }

        if (this.synth) {
            this.synth.dispose();
            this.synth = null;
        }

        if (this.fft) {
            this.fft.dispose();
            this.fft = null;
        }

        // FileLoader cleanup is optional - it can be reused
        // this.fileLoader.dispose();
    }
}
