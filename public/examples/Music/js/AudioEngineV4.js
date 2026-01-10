// AudioEngine V4 - Enhanced with Web Worker for note extraction
// Offloads CPU-intensive note extraction to background thread

class AudioEngineV4 {
    constructor(store, config = MusicVisualizerConfig) {
        this.store = store;
        this.config = config;
        this.osmd = null;
        this.synth = null;
        this.fft = null;
        this.audioInitialized = false;
        this.allNotes = [];
        this.currentNoteIndex = 0;
        this.playbackTimeout = null;
        
        // Web Worker for note extraction
        this.noteWorker = new Worker('./js/workers/noteExtractor.worker.js');
        this.noteWorker.onmessage = this.handleWorkerMessage.bind(this);
        
        // Performance metrics
        this.metrics = {
            noteExtractionTime: 0,
            renderTime: 0,
            workerTime: 0
        };
    }

    handleWorkerMessage(e) {
        const { type, notes, error } = e.data;
        
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
            await Tone.start();
            console.log("Tone.js started, state:", Tone.context.state);
            
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

    async loadSong(songId) {
        const song = SONGS_DATA[songId];
        if (!song) return;

        this.currentSongId = songId;
        this.currentSongTitle = song.title;
        this.currentSongComposer = song.composer;

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

            const loadStart = performance.now();
            await this.osmd.load(song.xml);
            await this.osmd.render();
            this.metrics.renderTime = performance.now() - loadStart;

            this.osmd.cursor.show();
            this.osmd.cursor.reset();
            
            // Style cursor for visibility
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
                data: cursorData
            });
            
            this.metrics.workerTime = performance.now() - workerStart;
            
            console.log(`📊 Performance: Render=${this.metrics.renderTime.toFixed(2)}ms, Worker dispatch=${this.metrics.workerTime.toFixed(2)}ms`);

        } catch (e) {
            console.error("Error loading song:", e);
            this.store.dispatch(Actions.setStatus('Error loading song'));
        }
    }

    serializeCursorData() {
        const cursorPositions = [];
        
        this.osmd.cursor.reset();
        
        while (!this.osmd.cursor.Iterator.EndReached) {
            const voices = this.osmd.cursor.VoicesUnderCursor();
            const notesAtPosition = [];

            for (const voice of voices) {
                for (const note of voice.Notes) {
                    notesAtPosition.push({
                        isRest: note.isRest(),
                        pitch: note.Pitch ? {
                            fundamentalNote: note.Pitch.FundamentalNote,
                            octave: note.Pitch.Octave,
                            accidental: note.Pitch.Accidental
                        } : null
                    });
                }
            }

            cursorPositions.push({ notes: notesAtPosition });
            this.osmd.cursor.next();
        }

        this.osmd.cursor.reset();
        
        return {
            cursorPositions: cursorPositions,
            noteDuration: this.config.NOTE_DURATION
        };
    }

    async togglePlay() {
        if (!this.audioInitialized) {
            await this.initAudio();
        }

        const state = this.store.getState();
        
        if (state.playback.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
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
        this.store.dispatch(Actions.setStatus('Ready'));
        if (this.osmd) {
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
        }
        if (this.synth) {
            this.synth.dispose();
        }
        if (this.fft) {
            this.fft.dispose();
        }
    }
}
