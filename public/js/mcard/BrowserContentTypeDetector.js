/**
 * Content Type Detector
 * Detects content type from MCard content
 * 
 * Simplified browser implementation following mcard-js ContentTypeInterpreter patterns
 * Provides parity with Python implementation for common types
 * 
 * @see https://www.npmjs.com/package/mcard-js
 */

import { ContentTypeInterpreter } from 'mcard-js';
import { BinarySignatureDetector } from '../vendor/mcard-js/model/detectors/BinaryDetector.js';
import { MarkdownDetector, XMLDetector } from '../vendor/mcard-js/model/detectors/MarkupDetectors.js';
import { JSONDetector, YAMLDetector } from '../vendor/mcard-js/model/detectors/DataFormatDetectors.js';

export class ContentTypeDetector {
  // ✅ PERFORMANCE: Cache detection results by card hash
  static cache = new Map();

  static binaryDetector = new BinarySignatureDetector();
  static markdownDetector = new MarkdownDetector();
  static xmlDetector = new XMLDetector();
  static jsonDetector = new JSONDetector();
  static yamlDetector = new YAMLDetector();

  // Cache version - increment this to invalidate all cached detections
  static CACHE_VERSION = 11; // v11: Added 'duplicate' event detection

  /**
   * Cache and return result
   * @param {string} hash - Card hash
   * @param {Object} result - Detection result
   * @returns {Object}
   */
  static cacheResult(hash, result) {
    this.cache.set(hash, { ...result, version: this.CACHE_VERSION });
    return result;
  }

  static getMimeTypeFromLibrary(bytes) {
    try {
      if (ContentTypeInterpreter && typeof ContentTypeInterpreter.detect === 'function') {
        return ContentTypeInterpreter.detect(bytes) || 'text/plain';
      }
    } catch (e) {
      console.warn('[ContentTypeDetector] Library detection failed, falling back:', e);
    }

    return 'text/plain';
  }

  static isUnstructuredBinary(bytes) {
    if (!bytes || bytes.length < 512)
      return false;

    let nullCount = 0;
    let controlCount = 0;
    const len = Math.min(bytes.length, 32 * 1024);
    for (let i = 0; i < len; i++) {
      const b = bytes[i];
      if (b === 0)
        nullCount++;
      if (b < 32 && b !== 9 && b !== 10 && b !== 13)
        controlCount++;
    }
    const nullRatio = nullCount / len;
    const controlRatio = controlCount / len;
    return nullRatio > 0.1 || controlRatio > 0.2;
  }

  static mimeToResult(mimeType) {
    if (!mimeType)
      return { type: 'unknown', displayName: 'Unknown' };

    const mt = String(mimeType).toLowerCase();

    if (mt === 'application/xml')
      return { type: 'text', displayName: 'XML' };

    if (mt === 'application/x-yaml')
      return { type: 'text', displayName: 'YAML' };

    if (mt === 'application/pdf')
      return { type: 'pdf', displayName: 'PDF' };

    if (mt === 'text/markdown')
      return { type: 'markdown', displayName: 'Markdown' };

    if (mt === 'application/json')
      return { type: 'json', displayName: 'JSON' };

    if (mt.startsWith('image/')) {
      if (mt === 'image/png')
        return { type: 'image', displayName: 'PNG Image' };
      if (mt === 'image/jpeg')
        return { type: 'image', displayName: 'JPEG Image' };
      if (mt === 'image/gif')
        return { type: 'image', displayName: 'GIF Image' };
      if (mt === 'image/bmp')
        return { type: 'image', displayName: 'BMP Image' };
      if (mt === 'image/x-icon')
        return { type: 'image', displayName: 'Icon' };
      if (mt === 'image/webp')
        return { type: 'image', displayName: 'WebP Image' };
      if (mt === 'image/svg+xml')
        return { type: 'image', displayName: 'SVG Image' };
      return { type: 'image', displayName: 'Image' };
    }

    if (mt.startsWith('audio/')) {
      if (mt === 'audio/wav')
        return { type: 'audio', displayName: 'WAV Audio' };
      if (mt === 'audio/mpeg')
        return { type: 'audio', displayName: 'MP3 Audio' };
      if (mt === 'audio/ogg')
        return { type: 'audio', displayName: 'OGG Audio' };
      if (mt === 'audio/flac')
        return { type: 'audio', displayName: 'FLAC Audio' };
      if (mt === 'audio/aac')
        return { type: 'audio', displayName: 'AAC Audio' };
      if (mt === 'audio/amr')
        return { type: 'audio', displayName: 'AMR Audio' };
      if (mt === 'audio/opus')
        return { type: 'audio', displayName: 'Opus Audio' };
      return { type: 'audio', displayName: 'Audio' };
    }

    if (mt.startsWith('video/')) {
      if (mt === 'video/mp4')
        return { type: 'video', displayName: 'MP4 Video' };
      if (mt === 'video/webm')
        return { type: 'video', displayName: 'WebM Video' };
      if (mt === 'video/quicktime')
        return { type: 'video', displayName: 'MOV Video' };
      if (mt === 'video/3gpp')
        return { type: 'video', displayName: '3GP Video' };
      if (mt === 'video/ogg')
        return { type: 'video', displayName: 'OGG Video' };
      if (mt === 'video/x-msvideo')
        return { type: 'video', displayName: 'AVI Video' };
      if (mt === 'video/x-flv')
        return { type: 'video', displayName: 'FLV Video' };
      if (mt === 'video/mpeg')
        return { type: 'video', displayName: 'MPEG Video' };
      if (mt === 'video/x-ms-wmv')
        return { type: 'video', displayName: 'WMV Video' };
      return { type: 'video', displayName: 'Video' };
    }

    if (mt.startsWith('text/'))
      return { type: 'text', displayName: 'Text' };

    return { type: 'binary', displayName: 'Binary' };
  }

  static detectClmFromText(text) {
    if (!text)
      return null;

    // Primary Pattern: CLM files have a top-level 'clm:' key in YAML format
    // The key must be at the start of a line
    const hasClmKey = /^clm:/m.test(text) || /\nclm:/m.test(text);

    if (hasClmKey) {
      return { type: 'clm', displayName: 'CLM' };
    }

    // Fallback Pattern 1: specification/implementation/verification structure
    const hasSpec = text.includes('specification:') || text.includes('Specification:');
    const hasImpl = text.includes('implementation:') || text.includes('Implementation:');
    const hasVerify = text.includes('verification:') || text.includes('Verification:');

    if (hasSpec && hasImpl && hasVerify) {
      return { type: 'clm', displayName: 'CLM' };
    }

    // Pattern 2: abstract/concrete/balanced structure (common in chapter files)
    const hasAbstract = text.includes('abstract:') || text.includes('Abstract:');
    const hasConcrete = text.includes('concrete:') || text.includes('Concrete:');
    const hasBalanced = text.includes('balanced:') || text.includes('Balanced:');

    if (hasAbstract && hasConcrete && hasBalanced) {
      return { type: 'clm', displayName: 'CLM' };
    }

    return null;
  }

  static detectDuplicateEvent(text) {
    if (!text) return null;

    try {
      // Duplication events are JSON with type: "duplicate"
      if (text.trim().startsWith('{') && text.includes('"type"') && text.includes('"duplicate"')) {
        const data = JSON.parse(text);
        if (data.type === 'duplicate') {
          return { type: 'duplicate', displayName: 'Duplicate Event' };
        }
      }
    } catch (e) {
      // Not JSON or parse error, ignore
    }

    return null;
  }

  static detectExtendedBinary(bytes) {
    if (!bytes || bytes.length < 4)
      return null;

    // MP3: ID3 tag first (49 44 33 = "ID3")
    if (bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
      return { mimeType: 'audio/mpeg', result: { type: 'audio', displayName: 'MP3 Audio' } };
    }

    // MP3: MPEG frame sync (FF FB / FF F3 / FF F2)
    for (let i = 0; i < bytes.length - 1; i++) {
      if (bytes[i] === 0xFF && (bytes[i + 1] === 0xFB || bytes[i + 1] === 0xF3 || bytes[i + 1] === 0xF2)) {
        return { mimeType: 'audio/mpeg', result: { type: 'audio', displayName: 'MP3 Audio' } };
      }
    }

    // OGG container (audio/video)
    if (bytes.length >= 4 && bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
      const opusCheck = bytes.length >= 36 ? String.fromCharCode(...bytes.slice(28, 36)) : '';
      if (opusCheck.includes('OpusHead')) {
        return { mimeType: 'audio/opus', result: { type: 'audio', displayName: 'Opus Audio' } };
      }
      return { mimeType: 'audio/ogg', result: { type: 'audio', displayName: 'OGG Audio' } };
    }

    // FLAC: 66 4C 61 43 (fLaC)
    if (bytes[0] === 0x66 && bytes[1] === 0x4C && bytes[2] === 0x61 && bytes[3] === 0x43) {
      return { mimeType: 'audio/flac', result: { type: 'audio', displayName: 'FLAC Audio' } };
    }

    // AAC: FF F1 or FF F9 (ADTS header)
    if (bytes[0] === 0xFF && (bytes[1] === 0xF1 || bytes[1] === 0xF9)) {
      return { mimeType: 'audio/aac', result: { type: 'audio', displayName: 'AAC Audio' } };
    }

    // AIFF: 46 4F 52 4D ... 41 49 46 46 (FORM...AIFF)
    if (bytes.length >= 12 && bytes[0] === 0x46 && bytes[1] === 0x4F && bytes[2] === 0x52 && bytes[3] === 0x4D &&
      bytes[8] === 0x41 && bytes[9] === 0x49 && bytes[10] === 0x46 && bytes[11] === 0x46) {
      return { mimeType: 'audio/aiff', result: { type: 'audio', displayName: 'AIFF Audio' } };
    }

    // AMR: 23 21 41 4D 52 (#!AMR)
    if (bytes.length >= 5 && bytes[0] === 0x23 && bytes[1] === 0x21 && bytes[2] === 0x41 && bytes[3] === 0x4D && bytes[4] === 0x52) {
      return { mimeType: 'audio/amr', result: { type: 'audio', displayName: 'AMR Audio' } };
    }

    // MP4/M4A/M4V/MOV: ftyp box
    if (bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
      const ftypString = String.fromCharCode(...bytes.slice(8, 12));
      const ftypLower = ftypString.toLowerCase().trim();
      const compatibleBrands = bytes.length >= 24 ? String.fromCharCode(...bytes.slice(16, 24)) : '';

      // Audio formats
      if (ftypLower.includes('m4a') || ftypLower.includes('m4b')) {
        return { mimeType: 'audio/mp4', result: { type: 'audio', displayName: 'M4A Audio' } };
      }
      if (ftypLower.includes('dash')) {
        const hasVideoCodec = compatibleBrands.includes('avc1') || compatibleBrands.includes('hvc1') || compatibleBrands.includes('hev1');
        if (!hasVideoCodec) {
          return { mimeType: 'audio/mp4', result: { type: 'audio', displayName: 'M4A Audio' } };
        }
      }

      // Video formats
      if (ftypLower.includes('qt') || ftypLower.includes('m4v') || ftypString.includes('M4V')) {
        return { mimeType: 'video/quicktime', result: { type: 'video', displayName: 'MOV Video' } };
      }
      if (ftypString.includes('3gp') || ftypString.includes('3g2')) {
        return { mimeType: 'video/3gpp', result: { type: 'video', displayName: '3GP Video' } };
      }
      if (ftypString.includes('mp4') || ftypString.includes('isom') || ftypString.includes('avc1') || ftypString.includes('iso2')) {
        return { mimeType: 'video/mp4', result: { type: 'video', displayName: 'MP4 Video' } };
      }

      return { mimeType: 'video/mp4', result: { type: 'video', displayName: 'MP4 Video' } };
    }

    // WebM/MKV: 1A 45 DF A3 (EBML)
    if (bytes.length >= 4 && bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) {
      const ebmlCheck = String.fromCharCode(...bytes.slice(0, Math.min(100, bytes.length)));
      if (ebmlCheck.includes('matroska')) {
        return { mimeType: 'video/x-matroska', result: { type: 'video', displayName: 'MKV Video' } };
      }
      return { mimeType: 'video/webm', result: { type: 'video', displayName: 'WebM Video' } };
    }

    // AVI: 52 49 46 46 ... 41 56 49 20 (RIFF...AVI )
    if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x41 && bytes[9] === 0x56 && bytes[10] === 0x49 && bytes[11] === 0x20) {
      return { mimeType: 'video/x-msvideo', result: { type: 'video', displayName: 'AVI Video' } };
    }

    // FLV: 46 4C 56 (FLV)
    if (bytes.length >= 3 && bytes[0] === 0x46 && bytes[1] === 0x4C && bytes[2] === 0x56) {
      return { mimeType: 'video/x-flv', result: { type: 'video', displayName: 'FLV Video' } };
    }

    // MPEG/MPG: 00 00 01 BA or 00 00 01 B3
    if (bytes.length >= 4 && bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && (bytes[3] === 0xBA || bytes[3] === 0xB3)) {
      return { mimeType: 'video/mpeg', result: { type: 'video', displayName: 'MPEG Video' } };
    }

    // WMV/ASF: 30 26 B2 75 8E 66 CF 11
    if (bytes.length >= 8 && bytes[0] === 0x30 && bytes[1] === 0x26 && bytes[2] === 0xB2 && bytes[3] === 0x75 &&
      bytes[4] === 0x8E && bytes[5] === 0x66 && bytes[6] === 0xCF && bytes[7] === 0x11) {
      return { mimeType: 'video/x-ms-wmv', result: { type: 'video', displayName: 'WMV Video' } };
    }

    return null;
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

      // Invalidate cache if version mismatch
      if (cached.version !== this.CACHE_VERSION) {
        console.log(`[ContentTypeDetector] 🔄 Cache invalidated for ${cacheKey.substring(0, 8)} (old version)`);
        this.cache.delete(cacheKey);
      } else {
        console.log(`[ContentTypeDetector] ⚡ Cache hit for ${cacheKey.substring(0, 8)}: ${cached.type}`);
        return cached;
      }
    }

    try {
      const rawContent = card.getContent();
      const contentBytes = typeof rawContent === 'string'
        ? null
        : (rawContent instanceof Uint8Array ? rawContent : new Uint8Array(rawContent));

      const libSample = typeof rawContent === 'string'
        ? rawContent.slice(0, 8192)
        : contentBytes.slice(0, Math.min(8192, contentBytes.length));

      const magicBytes = contentBytes
        ? contentBytes.slice(0, Math.min(256, contentBytes.length))
        : null;

      // 1) Signature-based binary detection (reuse mcard-js binary detector)
      const binaryMime = contentBytes
        ? this.binaryDetector.getMimeType(magicBytes)
        : null;

      if (binaryMime && binaryMime !== 'application/octet-stream') {
        return this.cacheResult(cacheKey, this.mimeToResult(binaryMime));
      }

      // 2) App-specific binary extensions (audio/video beyond library signatures)
      const extended = this.detectExtendedBinary(magicBytes);
      if (extended && extended.result)
        return this.cacheResult(cacheKey, extended.result);

      // 3) Text-like detection on decoded sample using mcard-js text detectors
      const isUnstructuredBinary = contentBytes
        ? this.isUnstructuredBinary(contentBytes.slice(0, Math.min(contentBytes.length, 32 * 1024)))
        : false;

      if (!isUnstructuredBinary) {
        const textSample = typeof libSample === 'string'
          ? libSample
          : new TextDecoder('utf-8', { fatal: false }).decode(libSample);

        const clm = this.detectClmFromText(textSample);
        if (clm)
          return this.cacheResult(cacheKey, clm);

        const duplicate = this.detectDuplicateEvent(textSample);
        if (duplicate)
          return this.cacheResult(cacheKey, duplicate);

        const lines = textSample.split('\n').slice(0, 20);
        const firstLine = lines[0] || '';

        if (this.markdownDetector.detect(textSample, lines, firstLine) > 0.5) {
          return this.cacheResult(cacheKey, { type: 'markdown', displayName: 'Markdown' });
        }

        if (this.jsonDetector.detect(textSample, lines, firstLine) > 0.5) {
          return this.cacheResult(cacheKey, { type: 'json', displayName: 'JSON' });
        }

        if (this.yamlDetector.detect(textSample, lines, firstLine) > 0.5) {
          return this.cacheResult(cacheKey, { type: 'text', displayName: 'YAML' });
        }

        if (this.xmlDetector.detect(textSample, lines, firstLine) > 0.5) {
          return this.cacheResult(cacheKey, { type: 'text', displayName: 'XML' });
        }

        // Fallback to plain text
        return this.cacheResult(cacheKey, { type: 'text', displayName: 'Text' });
      }

      // 4) Final fallback: minimal mcard-js bundled interpreter
      const mimeType = this.getMimeTypeFromLibrary(contentBytes || new Uint8Array());

      if (mimeType === 'text/plain')
        return this.cacheResult(cacheKey, { type: 'binary', displayName: 'Binary' });

      return this.cacheResult(cacheKey, this.mimeToResult(mimeType));
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
