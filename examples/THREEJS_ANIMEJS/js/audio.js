export class AudioManager {
    constructor() {
        this.synth = null;
        this.polySynth = null;
        this.isInitialized = false;

        // Effects
        this.reverb = null;
        this.delay = null;

        // Presets for lighting/camera
        this.notes = {
            front: ["C4", "G4"],
            top: ["E4", "B4"],
            side: ["G4", "D5"],
            orbit: ["A4", "E5"],
            closeup: ["F4", "C5"],

            studio: ["C3", "E3", "G3", "B3"],
            soft: ["F3", "A3", "C4", "E4"],
            product: ["G3", "B3", "D4", "F#4"],
            sunset: ["D3", "F#3", "A3", "C#4"],
            neon: ["A2", "C3", "E3", "G3"],
            space: ["B2", "D#3", "F#3", "A#3"]
        };
    }

    async init() {
        if (this.isInitialized) return;

        // Initialize Synths
        this.synth = new Tone.MonoSynth({
            oscillator: { type: "triangle" },
            envelope: { release: 0.5 }
        }).toDestination();

        this.polySynth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "sine" },
            envelope: { attack: 0.1, release: 1 }
        });

        this.reverb = new Tone.Reverb({ decay: 4, wet: 0.3 }).toDestination();
        this.delay = new Tone.FeedbackDelay("8n", 0.4).connect(this.reverb);
        this.polySynth.connect(this.delay);

        this.isInitialized = true;
        console.log("🎵 Audio Manager Initialized");
    }

    async startAudioContext() {
        if (Tone.context.state !== 'running') {
            await Tone.start();
            console.log("🔊 Audio Context Started");
        }
    }

    playCameraSound(preset) {
        if (!this.isInitialized) return;
        this.startAudioContext();

        const note = this.notes[preset] || ["C5"];
        this.synth.triggerAttackRelease(note[1], "16n");
    }

    playLightingSound(preset) {
        if (!this.isInitialized) return;
        this.startAudioContext();

        const chords = this.notes[preset] || this.notes.studio;
        this.polySynth.triggerAttackRelease(chords, "2n");
    }

    playTheme() {
        if (!this.isInitialized) return;
        this.startAudioContext();

        const now = Tone.now();
        const sequence = ["C4", "E4", "G4", "B4", "C5", "B4", "G4", "E4"];

        sequence.forEach((note, i) => {
            this.synth.triggerAttackRelease(note, "8n", now + i * 0.2);
        });

        this.polySynth.triggerAttackRelease(["C3", "G3", "C4"], "1n", now);
    }

    playSwitchSound() {
        if (!this.isInitialized) return;
        this.startAudioContext();
        this.synth.triggerAttackRelease("G5", "32n");
    }
}
