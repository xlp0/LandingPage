// AudioEngine - Handles OSMD, Tone.js, and playback logic

class AudioEngine {
    constructor(store, config = MusicVisualizerConfig) {
        this.store = store;
        this.config = config;
        this.osmd = null;
        this.synth = null;
        this.fft = null;
        this.allNotes = [];
        this.currentNoteIndex = 0;
        this.playbackTimeout = null;
        this.clockTimer = null;
        this.audioInitialized = false;
        this.noteExtractor = new NoteExtractor(config);

        // Subscribe to store changes
        this.unsubscribe = store.subscribe(() => this.handleStateChange());
        this.lastState = store.getState();
    }

    async init() {
        // Audio setup deferred until user gesture
        this.audioInitialized = false;
    }

    async initAudio() {
        if (this.audioInitialized) return;
        
        try {
            await Tone.start();
            console.log("Tone.js started, state:", Tone.context.state);

            // FFT for visualization
            this.fft = new Tone.FFT(this.config.FFT_SIZE);

            // Create synth with config settings
            this.synth = new Tone.PolySynth(Tone.Synth, this.config.SYNTH);
            this.synth.connect(this.fft);
            this.synth.toDestination();

            this.audioInitialized = true;
            console.log("Audio initialized successfully");
        } catch (e) {
            console.warn("Audio initialization failed:", e);
        }
    }

    handleStateChange() {
        const state = this.store.getState();
        const prev = this.lastState;
        this.lastState = state;

        if (state.playback.isPlaying !== prev.playback.isPlaying) {
            if (state.playback.isPlaying) {
                this.startInternalPlayback();
            } else {
                this.pauseInternalPlayback();
            }
        }
    }

    async loadSong(songId) {
        const song = SONGS_DATA[songId];
        if (!song) return;

        this.store.dispatch(Actions.startLoading({ title: song.title }));
        this.store.dispatch(Actions.setStatus('Loading...'));
        this.stop();

        try {
            if (!this.osmd) {
                this.osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(
                    'osmd-container',
                    this.config.OSMD_OPTIONS
                );
            }

            await this.osmd.load(song.xml);
            await this.osmd.render();

            this.osmd.cursor.show();
            this.osmd.cursor.reset();
            
            // Style cursor for visibility (OSMD default is 1px tall, z-index -1)
            // Use setTimeout because OSMD may reset styles after show()
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

            this.allNotes = this.noteExtractor.extractFromOSMD(this.osmd);
            this.currentNoteIndex = 0;

            const estimatedDuration = this.allNotes.length * this.config.NOTE_DURATION;

            this.store.dispatch(Actions.songLoaded({
                id: songId,
                title: song.title,
                composer: song.composer
            }));
            this.store.dispatch(Actions.setDuration(estimatedDuration));
            this.store.dispatch(Actions.setTime(0));
            this.store.dispatch(Actions.setStatus('Ready'));
        } catch (err) {
            console.error("Error loading song:", err);
            this.store.dispatch(Actions.loadError(err.message));
        }
    }

    async togglePlay() {
        await this.initAudio();

        const state = this.store.getState();
        if (state.playback.isPlaying) {
            this.store.dispatch(Actions.setPlaying(false));
            this.store.dispatch(Actions.setStatus('Paused'));
        } else {
            if (state.song.currentSongId) {
                this.store.dispatch(Actions.setPlaying(true));
                this.store.dispatch(Actions.setStatus('Playing'));
            }
        }
    }

    stop() {
        this.store.dispatch(Actions.resetPlayback());
        this.pauseInternalPlayback();
        this.currentNoteIndex = 0;
        if (this.osmd && this.osmd.cursor) {
            this.osmd.cursor.reset();
        }
    }

    // --- Internal Playback ---

    startInternalPlayback() {
        if (this.currentNoteIndex >= this.allNotes.length) {
            this.currentNoteIndex = 0;
            if (this.osmd) this.osmd.cursor.reset();
        }
        this.playNextNote();
        this.startClock();
    }

    pauseInternalPlayback() {
        if (this.playbackTimeout) clearTimeout(this.playbackTimeout);
        if (this.clockTimer) clearInterval(this.clockTimer);
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

        // Play notes
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

        // Advance cursor
        if (this.osmd) {
            this.osmd.cursor.next();
        }

        this.currentNoteIndex++;

        // Schedule next note
        const interval = this.config.NOTE_DURATION * 1000;
        this.playbackTimeout = setTimeout(() => this.playNextNote(), interval);
    }

    startClock() {
        if (this.clockTimer) clearInterval(this.clockTimer);
        this.clockTimer = setInterval(() => {
            const time = this.currentNoteIndex * this.config.NOTE_DURATION;
            this.store.dispatch(Actions.setTime(time));
        }, this.config.CLOCK_INTERVAL);
    }

    getFFT() {
        return this.fft;
    }

    destroy() {
        this.pauseInternalPlayback();
        if (this.unsubscribe) this.unsubscribe();
        if (this.synth) this.synth.dispose();
        if (this.fft) this.fft.dispose();
    }
}
