// Web Worker for Note Extraction
// Offloads OSMD note extraction to background thread

self.onmessage = function(e) {
    const { type, data } = e.data;
    
    if (type === 'EXTRACT_NOTES') {
        try {
            const notes = extractNotesFromData(data);
            self.postMessage({
                type: 'NOTES_EXTRACTED',
                notes: notes,
                success: true
            });
        } catch (error) {
            self.postMessage({
                type: 'EXTRACTION_ERROR',
                error: error.message,
                success: false
            });
        }
    }
};

/**
 * Extract notes from serialized OSMD cursor data
 * @param {Object} data - Serialized cursor positions and note data
 * @returns {Array<{notes: string[], duration: number}>}
 */
function extractNotesFromData(data) {
    const allNotes = [];
    const { cursorPositions, noteDuration } = data;
    
    for (const position of cursorPositions) {
        const notesAtPosition = [];
        
        for (const noteData of position.notes) {
            if (!noteData.isRest && noteData.pitch) {
                const noteString = pitchToString(noteData.pitch);
                notesAtPosition.push(noteString);
            }
        }
        
        if (notesAtPosition.length > 0) {
            allNotes.push({
                notes: notesAtPosition,
                duration: noteDuration
            });
        }
    }
    
    return allNotes;
}

/**
 * Convert pitch data to Tone.js format (e.g., "C4", "F#5")
 * OSMD uses chromatic scale: 0=C, 2=D, 4=E, 5=F, 7=G, 9=A, 11=B
 */
function pitchToString(pitch) {
    const chromaticToNote = {
        0: 'C', 1: 'C#', 2: 'D', 3: 'D#', 4: 'E', 5: 'F',
        6: 'F#', 7: 'G', 8: 'G#', 9: 'A', 10: 'A#', 11: 'B'
    };
    
    const noteName = chromaticToNote[pitch.fundamentalNote];
    
    let accidental = '';
    if (pitch.accidental === 1) accidental = '#';
    else if (pitch.accidental === -1) accidental = 'b';
    
    const octave = pitch.octave + 3; // OCTAVE_OFFSET
    
    if (noteName.includes('#') && accidental) {
        return noteName[0] + accidental + octave;
    }
    
    return noteName + accidental + octave;
}
