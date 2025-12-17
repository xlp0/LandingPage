/**
 * Content Type Detector
 * Detects content type from MCard content
 * 
 * Simplified browser implementation following mcard-js ContentTypeInterpreter patterns
 * Provides parity with Python implementation for common types
 * 
 * @see https://www.npmjs.com/package/mcard-js
 */

export class ContentTypeDetector {
  /**
   * Detect content type from MCard
   * @param {MCard} card
   * @returns {Object} {type: string, displayName: string}
   */
  static detect(card) {
    try {
      const content = card.getContent();
      const bytes = new Uint8Array(content);
      
      // ✅ CHECK BINARY SIGNATURES FIRST (before trying text decode)
      // This prevents PDFs from being misidentified as text
      
      if (bytes.length >= 4) {
        // PDF: 25 50 44 46 (%PDF) - CHECK FIRST!
        if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
          console.log('[ContentTypeDetector] Detected PDF by magic bytes');
          return { type: 'pdf', displayName: 'PDF' };
        }
        
        // PNG: 89 50 4E 47
        if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
          return { type: 'image', displayName: 'PNG Image' };
        }
        
        // JPEG: FF D8 FF
        if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
          return { type: 'image', displayName: 'JPEG Image' };
        }
        
        // GIF: 47 49 46
        if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
          return { type: 'image', displayName: 'GIF Image' };
        }
        
        // Audio/Video checks
        if (bytes.length >= 12) {
          // WebP/WAV: 52 49 46 46 (RIFF)
          if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
            // Check if WebP
            if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
              return { type: 'image', displayName: 'WebP Image' };
            }
            // Check if WAV
            if (bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45) {
              console.log('[ContentTypeDetector] Detected WAV audio by magic bytes');
              return { type: 'audio', displayName: 'WAV Audio' };
            }
          }
          
          // MP3: FF FB or FF F3 or FF F2
          if (bytes[0] === 0xFF && (bytes[1] === 0xFB || bytes[1] === 0xF3 || bytes[1] === 0xF2)) {
            console.log('[ContentTypeDetector] Detected MP3 audio by magic bytes');
            return { type: 'audio', displayName: 'MP3 Audio' };
          }
          
          // OGG: 4F 67 67 53 (OggS)
          if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
            console.log('[ContentTypeDetector] Detected OGG audio by magic bytes');
            return { type: 'audio', displayName: 'OGG Audio' };
          }
          
          // FLAC: 66 4C 61 43 (fLaC)
          if (bytes[0] === 0x66 && bytes[1] === 0x4C && bytes[2] === 0x61 && bytes[3] === 0x43) {
            console.log('[ContentTypeDetector] Detected FLAC audio by magic bytes');
            return { type: 'audio', displayName: 'FLAC Audio' };
          }
          
          // MP4/M4A: ftyp box
          if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
            const ftypString = String.fromCharCode(...bytes.slice(8, 12));
            if (ftypString.includes('M4A') || ftypString.includes('mp42')) {
              console.log('[ContentTypeDetector] Detected M4A audio by ftyp');
              return { type: 'audio', displayName: 'M4A Audio' };
            }
            return { type: 'video', displayName: 'MP4 Video' };
          }
          
          // WebM: 1A 45 DF A3
          if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) {
            return { type: 'video', displayName: 'WebM Video' };
          }
        }
      }
      
      // ✅ NOW try to decode as text (only if not binary)
      try {
        const text = card.getContentAsText();
        
        // Check for CLM FIRST (YAML-based with specific structure)
        if ((text.includes('specification:') || text.includes('Specification:')) && 
            (text.includes('implementation:') || text.includes('Implementation:')) && 
            (text.includes('verification:') || text.includes('Verification:') || 
             text.includes('balanced:') || text.includes('Balanced:'))) {
          console.log('[ContentTypeDetector] Detected CLM');
          return { type: 'clm', displayName: 'CLM' };
        }
        
        // Check for markdown patterns
        if (text.match(/^#+ |\*\*|\[.*\]\(.*\)/m)) {
          console.log('[ContentTypeDetector] Detected Markdown');
          return { type: 'markdown', displayName: 'Markdown' };
        }
        
        // Check for JSON
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
          try {
            JSON.parse(text);
            return { type: 'json', displayName: 'JSON' };
          } catch {}
        }
        
        // Default to text
        return { type: 'text', displayName: 'Text' };
      } catch {
        // Text decode failed, it's binary
        return { type: 'binary', displayName: 'Binary' };
      }
    } catch (error) {
      console.error('[ContentTypeDetector] Error detecting content type:', error);
      return { type: 'unknown', displayName: 'Unknown' };
    }
  }
  
  /**
   * Categorize cards by type
   * @param {MCard[]} cards
   * @returns {Object} Categories object
   */
  static categorize(cards) {
    const categories = {
      all: [],
      clm: [],
      markdown: [],
      text: [],
      images: [],
      videos: [],
      audio: [],
      documents: [],
      archives: [],
      other: []
    };

    cards.forEach(card => {
      const typeInfo = ContentTypeDetector.detect(card);
      const type = typeInfo.type;
      
      categories.all.push(card);
      
      // Categorize by detected type
      if (type === 'clm') {
        categories.clm.push(card);
      } else if (type === 'markdown') {
        categories.markdown.push(card);
      } else if (type === 'text' || type === 'json') {
        categories.text.push(card);
      } else if (type === 'image') {
        categories.images.push(card);
      } else if (type === 'audio') {
        categories.audio.push(card);
      } else if (type === 'video') {
        categories.videos.push(card);
      } else if (type === 'pdf') {
        categories.documents.push(card);
      } else {
        categories.other.push(card);
      }
    });

    return categories;
  }
}
