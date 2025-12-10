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
      
      // Try to decode as text
      try {
        const text = card.getContentAsText();
        
        // Check for CLM FIRST (YAML-based with specific structure)
        // CLM files may have markdown-like comments, so check this before markdown
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
        // Not text, check binary signatures
        const bytes = new Uint8Array(content);
        
        // PNG: 89 50 4E 47
        if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
          return { type: 'image', displayName: 'PNG Image' };
        }
        
        // JPEG: FF D8 FF
        if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
          return { type: 'image', displayName: 'JPEG Image' };
        }
        
        // PDF: 25 50 44 46
        if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
          return { type: 'pdf', displayName: 'PDF' };
        }
        
        // GIF: 47 49 46 38
        if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
          return { type: 'image', displayName: 'GIF Image' };
        }
        
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
      } else if (type === 'pdf') {
        categories.documents.push(card);
      } else {
        categories.other.push(card);
      }
    });

    return categories;
  }
}
