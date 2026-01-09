// NoteExtractor - Extracts playable notes from OSMD cursor

class NoteExtractor {
    constructor(config = MusicVisualizerConfig) {
        this.config = config;
    }

    /**
     * Convert OSMD pitch to Tone.js format (e.g., "C4", "F#5")
     * OSMD uses chromatic scale: 0=C, 2=D, 4=E, 5=F, 7=G, 9=A, 11=B
     */
    pitchToString(pitch) {
        // Map chromatic scale (0-11) to note names
        const chromaticToNote = {
            0: 'C', 1: 'C#', 2: 'D', 3: 'D#', 4: 'E', 5: 'F',
            6: 'F#', 7: 'G', 8: 'G#', 9: 'A', 10: 'A#', 11: 'B'
        };
        
        const noteName = chromaticToNote[pitch.FundamentalNote];
        
        // Apply accidental if present (overrides chromatic sharp)
        let accidental = '';
        if (pitch.Accidental === 1) accidental = '#';
        else if (pitch.Accidental === -1) accidental = 'b';
        
        const octave = pitch.Octave + this.config.OCTAVE_OFFSET;
        
        // If note already has sharp from chromatic and accidental is set, use accidental
        if (noteName.includes('#') && accidental) {
            return noteName[0] + accidental + octave;
        }
        
        return noteName + accidental + octave;
    }

    /**
     * Extract all notes from OSMD instance
     * @param {OpenSheetMusicDisplay} osmd - OSMD instance with loaded score
     * @returns {Array<{notes: string[], duration: number}>}
     */
    extractFromOSMD(osmd) {
        const allNotes = [];
        
        if (!osmd || !osmd.cursor) {
            console.warn('NoteExtractor: No OSMD instance or cursor');
            return allNotes;
        }

        osmd.cursor.reset();
        
        while (!osmd.cursor.Iterator.EndReached) {
            const voices = osmd.cursor.VoicesUnderCursor();
            const notesAtPosition = [];

            for (const voice of voices) {
                for (const note of voice.Notes) {
                    if (!note.isRest() && note.Pitch) {
                        notesAtPosition.push(this.pitchToString(note.Pitch));
                    }
                }
            }

            if (notesAtPosition.length > 0) {
                allNotes.push({
                    notes: notesAtPosition,
                    duration: this.config.NOTE_DURATION
                });
            }

            osmd.cursor.next();
        }

        osmd.cursor.reset();
        return allNotes;
    }
}
