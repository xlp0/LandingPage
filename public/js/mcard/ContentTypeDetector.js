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
  // ✅ PERFORMANCE: Cache detection results by card hash
  static cache = new Map();
  
  /**
   * Cache and return result
   * @param {string} hash - Card hash
   * @param {Object} result - Detection result
   * @returns {Object}
   */
  static cacheResult(hash, result) {
    this.cache.set(hash, result);
    return result;
  }
  
  /**
   * Detect content type from MCard
   * @param {MCard} card
   * @returns {Object} {type: string, displayName: string}
   */
  static detect(card) {
    // ✅ Check cache first to avoid re-detecting same file
    const cacheKey = card.hash;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      console.log(`[ContentTypeDetector] ⚡ Cache hit for ${cacheKey.substring(0, 8)}: ${cached.type}`);
      return cached;
    }
    
    try {
      // ✅ PERFORMANCE: Read first 256 bytes for detection (MP3 ID3 tags can be large)
      // This prevents loading entire 100MB+ videos into memory
      const content = card.getContent();
      const sampleSize = Math.min(256, content.length);
      const bytes = new Uint8Array(content.slice(0, sampleSize));
      
      console.log(`[ContentTypeDetector] Checking ${sampleSize} bytes (file size: ${(content.length / 1024 / 1024).toFixed(2)} MB)`);
      
      // ✅ CHECK BINARY SIGNATURES FIRST (before trying text decode)
      // This prevents PDFs from being misidentified as text
      
      if (bytes.length >= 4) {
        // PDF: 25 50 44 46 (%PDF) - CHECK FIRST!
        if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
          console.log('[ContentTypeDetector] Detected PDF by magic bytes');
          return this.cacheResult(cacheKey, { type: 'pdf', displayName: 'PDF' });
        }
        
        // PNG: 89 50 4E 47
        if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
          return this.cacheResult(cacheKey, { type: 'image', displayName: 'PNG Image' });
        }
        
        // JPEG: FF D8 FF
        if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
          return this.cacheResult(cacheKey, { type: 'image', displayName: 'JPEG Image' });
        }
        
        // GIF: 47 49 46
        if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
          return this.cacheResult(cacheKey, { type: 'image', displayName: 'GIF Image' });
        }
        
        // Audio/Video checks
        if (bytes.length >= 12) {
          // WebP/WAV: 52 49 46 46 (RIFF)
          if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
            // Check if WebP
            if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
              return this.cacheResult(cacheKey, { type: 'image', displayName: 'WebP Image' });
            }
            // Check if WAV
            if (bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45) {
              console.log('[ContentTypeDetector] Detected WAV audio by magic bytes');
              return this.cacheResult(cacheKey, { type: 'audio', displayName: 'WAV Audio' });
            }
          }
          
          // MP3: Check for ID3 tag first (49 44 33 = "ID3")
          if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
            console.log('[ContentTypeDetector] Detected MP3 audio by ID3 tag');
            return this.cacheResult(cacheKey, { type: 'audio', displayName: 'MP3 Audio' });
          }
          
          // MP3: Check for MPEG frame sync (FF FB or FF F3 or FF F2)
          // Scan first 256 bytes for frame sync (ID3 tag might be at start)
          for (let i = 0; i < bytes.length - 1; i++) {
            if (bytes[i] === 0xFF && (bytes[i+1] === 0xFB || bytes[i+1] === 0xF3 || bytes[i+1] === 0xF2)) {
              console.log(`[ContentTypeDetector] Detected MP3 audio by MPEG frame sync at offset ${i}`);
              return this.cacheResult(cacheKey, { type: 'audio', displayName: 'MP3 Audio' });
            }
          }
          
          // OGG: 4F 67 67 53 (OggS)
          if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
            console.log('[ContentTypeDetector] Detected OGG audio by magic bytes');
            return this.cacheResult(cacheKey, { type: 'audio', displayName: 'OGG Audio' });
          }
          
          // FLAC: 66 4C 61 43 (fLaC)
          if (bytes[0] === 0x66 && bytes[1] === 0x4C && bytes[2] === 0x61 && bytes[3] === 0x43) {
            console.log('[ContentTypeDetector] Detected FLAC audio by magic bytes');
            return this.cacheResult(cacheKey, { type: 'audio', displayName: 'FLAC Audio' });
          }
          
          // AAC: FF F1 or FF F9 (ADTS header)
          if (bytes[0] === 0xFF && (bytes[1] === 0xF1 || bytes[1] === 0xF9)) {
            console.log('[ContentTypeDetector] Detected AAC audio by ADTS header');
            return this.cacheResult(cacheKey, { type: 'audio', displayName: 'AAC Audio' });
          }
          
          // AIFF: 46 4F 52 4D ... 41 49 46 46 (FORM...AIFF)
          if (bytes[0] === 0x46 && bytes[1] === 0x4F && bytes[2] === 0x52 && bytes[3] === 0x4D) {
            if (bytes.length >= 12 && bytes[8] === 0x41 && bytes[9] === 0x49 && bytes[10] === 0x46 && bytes[11] === 0x46) {
              console.log('[ContentTypeDetector] Detected AIFF audio');
              return this.cacheResult(cacheKey, { type: 'audio', displayName: 'AIFF Audio' });
            }
          }
          
          // AMR: 23 21 41 4D 52 (#!AMR)
          if (bytes[0] === 0x23 && bytes[1] === 0x21 && bytes[2] === 0x41 && bytes[3] === 0x4D && bytes[4] === 0x52) {
            console.log('[ContentTypeDetector] Detected AMR audio');
            return this.cacheResult(cacheKey, { type: 'audio', displayName: 'AMR Audio' });
          }
          
          // Opus in OGG container: Check for OpusHead
          if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
            // Look for OpusHead marker
            const opusCheck = String.fromCharCode(...bytes.slice(28, 36));
            if (opusCheck.includes('OpusHead')) {
              console.log('[ContentTypeDetector] Detected Opus audio');
              return this.cacheResult(cacheKey, { type: 'audio', displayName: 'Opus Audio' });
            }
          }
          
          // MP4/M4A/M4V/MOV: ftyp box
          if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
            const ftypString = String.fromCharCode(...bytes.slice(8, 12));
            const ftypLower = ftypString.toLowerCase().trim();
            
            // Also check compatible brands (bytes 16-23 for additional format info)
            const compatibleBrands = bytes.length >= 24 ? String.fromCharCode(...bytes.slice(16, 24)) : '';
            console.log(`[ContentTypeDetector] ftyp: "${ftypString}" (lowercase: "${ftypLower}"), compatible: "${compatibleBrands}"`);
            
            // Audio formats - Check for M4A/M4B (case-insensitive)
            if (ftypLower.includes('m4a') || ftypLower.includes('m4b')) {
              console.log('[ContentTypeDetector] Detected M4A audio by ftyp');
              return this.cacheResult(cacheKey, { type: 'audio', displayName: 'M4A Audio' });
            }
            
            // DASH audio files - Check if it's audio-only DASH
            // DASH files with "dash" ftyp but no video indicators are likely audio
            if (ftypLower.includes('dash')) {
              // Check file extension or compatible brands for audio indicators
              // If no video track indicators (avc1, hvc1, etc.), assume audio
              const hasVideoCodec = compatibleBrands.includes('avc1') || 
                                   compatibleBrands.includes('hvc1') || 
                                   compatibleBrands.includes('hev1');
              
              if (!hasVideoCodec) {
                console.log('[ContentTypeDetector] Detected DASH audio (no video codec in compatible brands)');
                return this.cacheResult(cacheKey, { type: 'audio', displayName: 'M4A Audio' });
              }
            }
            
            // Video formats
            
            // MOV/QuickTime formats (case-insensitive) - Check BEFORE MP4
            if (ftypLower.includes('qt') || ftypLower.includes('m4v') || ftypString.includes('M4V')) {
              console.log('[ContentTypeDetector] Detected MOV/QuickTime video');
              return this.cacheResult(cacheKey, { type: 'video', displayName: 'MOV Video' });
            }
            
            // 3GP formats
            if (ftypString.includes('3gp') || ftypString.includes('3g2')) {
              console.log('[ContentTypeDetector] Detected 3GP video');
              return this.cacheResult(cacheKey, { type: 'video', displayName: '3GP Video' });
            }
            
            // MP4 formats
            if (ftypString.includes('mp4') || ftypString.includes('isom') || 
                ftypString.includes('avc1') || ftypString.includes('iso2')) {
              console.log('[ContentTypeDetector] Detected MP4 video by ftyp');
              return this.cacheResult(cacheKey, { type: 'video', displayName: 'MP4 Video' });
            }
            
            // Default to video for unknown ftyp
            console.log('[ContentTypeDetector] Unknown ftyp, defaulting to MP4 video');
            return this.cacheResult(cacheKey, { type: 'video', displayName: 'MP4 Video' });
          }
          
          // WebM/MKV: 1A 45 DF A3 (EBML)
          if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) {
            // Check for webm or matroska
            const ebmlCheck = String.fromCharCode(...bytes.slice(0, Math.min(100, bytes.length)));
            if (ebmlCheck.includes('webm')) {
              console.log('[ContentTypeDetector] Detected WebM video');
              return this.cacheResult(cacheKey, { type: 'video', displayName: 'WebM Video' });
            }
            if (ebmlCheck.includes('matroska')) {
              console.log('[ContentTypeDetector] Detected MKV video');
              return this.cacheResult(cacheKey, { type: 'video', displayName: 'MKV Video' });
            }
            // Default to WebM
            return this.cacheResult(cacheKey, { type: 'video', displayName: 'WebM Video' });
          }
          
          // AVI: 52 49 46 46 ... 41 56 49 20 (RIFF...AVI )
          if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
            if (bytes.length >= 12 && bytes[8] === 0x41 && bytes[9] === 0x56 && bytes[10] === 0x49 && bytes[11] === 0x20) {
              console.log('[ContentTypeDetector] Detected AVI video');
              return this.cacheResult(cacheKey, { type: 'video', displayName: 'AVI Video' });
            }
          }
          
          // FLV: 46 4C 56 (FLV)
          if (bytes[0] === 0x46 && bytes[1] === 0x4C && bytes[2] === 0x56) {
            console.log('[ContentTypeDetector] Detected FLV video');
            return this.cacheResult(cacheKey, { type: 'video', displayName: 'FLV Video' });
          }
          
          // MPEG/MPG: 00 00 01 BA or 00 00 01 B3
          if (bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01) {
            if (bytes[3] === 0xBA || bytes[3] === 0xB3) {
              console.log('[ContentTypeDetector] Detected MPEG video');
              return this.cacheResult(cacheKey, { type: 'video', displayName: 'MPEG Video' });
            }
          }
          
          // WMV/WMA/ASF: 30 26 B2 75 8E 66 CF 11 (ASF header)
          if (bytes[0] === 0x30 && bytes[1] === 0x26 && bytes[2] === 0xB2 && bytes[3] === 0x75 &&
              bytes[4] === 0x8E && bytes[5] === 0x66 && bytes[6] === 0xCF && bytes[7] === 0x11) {
            // Check extended header to determine if audio or video
            // For simplicity, default to video (WMV is more common)
            console.log('[ContentTypeDetector] Detected WMV/ASF video');
            return this.cacheResult(cacheKey, { type: 'video', displayName: 'WMV Video' });
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
          return this.cacheResult(cacheKey, { type: 'clm', displayName: 'CLM' });
        }
        
        // Check for markdown patterns
        if (text.match(/^#+ |\*\*|\[.*\]\(.*\)/m)) {
          console.log('[ContentTypeDetector] Detected Markdown');
          return this.cacheResult(cacheKey, { type: 'markdown', displayName: 'Markdown' });
        }
        
        // Check for JSON
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
          try {
            JSON.parse(text);
            return this.cacheResult(cacheKey, { type: 'json', displayName: 'JSON' });
          } catch {}
        }
        
        // Default to text
        return this.cacheResult(cacheKey, { type: 'text', displayName: 'Text' });
      } catch {
        // Text decode failed, it's binary
        return this.cacheResult(cacheKey, { type: 'binary', displayName: 'Binary' });
      }
    } catch (error) {
      console.error('[ContentTypeDetector] Error detecting content type:', error);
      return this.cacheResult(card.hash, { type: 'unknown', displayName: 'Unknown' });
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
