/**
 * Audio Renderer
 * 
 * Renders audio content with HTML5 audio player
 * Supports: MP3, WAV, OGG, FLAC, M4A, AAC, and more
 */

import { BaseRenderer } from './BaseRenderer.js';

export class AudioRenderer extends BaseRenderer {
  constructor() {
    super('audio');
  }
  
  /**
   * Detect audio format from magic bytes
   * @param {Uint8Array} content - Audio content
   * @returns {string} - Audio format (mp3, wav, ogg, etc.)
   */
  detectAudioFormat(content) {
    if (!content || content.length < 12) return 'unknown';
    
    const bytes = content instanceof Uint8Array ? content : new Uint8Array(content);
    
    // MP3: Check for ID3 tag first (49 44 33 = "ID3")
    if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
      console.log('[AudioRenderer] Detected MP3 by ID3 tag');
      return 'mp3';
    }
    
    // MP3: Check for MPEG frame sync (FF FB or FF F3 or FF F2)
    // Scan first 256 bytes for frame sync
    const scanSize = Math.min(256, bytes.length);
    for (let i = 0; i < scanSize - 1; i++) {
      if (bytes[i] === 0xFF && (bytes[i+1] === 0xFB || bytes[i+1] === 0xF3 || bytes[i+1] === 0xF2)) {
        console.log(`[AudioRenderer] Detected MP3 by MPEG frame sync at offset ${i}`);
        return 'mp3';
      }
    }
    
    // WAV: RIFF...WAVE
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
      if (bytes.length > 11 && bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45) {
        return 'wav';
      }
    }
    
    // OGG: OggS
    if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
      return 'ogg';
    }
    
    // FLAC: fLaC
    if (bytes[0] === 0x66 && bytes[1] === 0x4C && bytes[2] === 0x61 && bytes[3] === 0x43) {
      return 'flac';
    }
    
    // M4A/AAC: ftyp with M4A
    if (bytes.length > 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
      const ftypString = String.fromCharCode(...bytes.slice(8, 12));
      if (ftypString.includes('M4A')) return 'm4a';
      if (ftypString.includes('mp42')) return 'aac';
    }
    
    return 'unknown';
  }
  
  /**
   * Get MIME type for audio format
   * @param {string} format - Audio format
   * @returns {string} - MIME type
   */
  getMimeType(format) {
    const mimeTypes = {
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'flac': 'audio/flac',
      'm4a': 'audio/mp4',
      'aac': 'audio/aac',
      'webm': 'audio/webm',
      'opus': 'audio/opus'
    };
    return mimeTypes[format] || 'audio/mpeg';
  }
  
  /**
   * Render audio content to HTML
   * 
   * @param {ArrayBuffer|Uint8Array} content - Audio content
   * @param {Object} options - Rendering options
   * @param {string} options.fileName - File name
   * @returns {Promise<string>} - Rendered HTML
   */
  async render(content, options = {}) {
    try {
      const { fileName = 'audio' } = options;
      
      // Convert to Uint8Array if needed
      let audioData = content;
      if (content instanceof ArrayBuffer) {
        audioData = new Uint8Array(content);
      }
      
      // Detect audio format
      const format = this.detectAudioFormat(audioData);
      const mimeType = this.getMimeType(format);
      
      console.log(`[AudioRenderer] Detected format: ${format}, MIME: ${mimeType}`);
      
      // Create blob URL
      const blob = new Blob([audioData], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      
      // Calculate file size
      const sizeKB = (audioData.length / 1024).toFixed(2);
      const sizeMB = (audioData.length / (1024 * 1024)).toFixed(2);
      const sizeDisplay = audioData.length > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;
      
      // Format display name
      const formatDisplay = format.toUpperCase();
      
      // Generate unique ID for this audio
      const audioId = `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Return HTML with audio player
      const html = `
        <div class="audio-content" id="${audioId}">
          <div class="audio-header">
            <div class="audio-info">
              <i data-lucide="music" style="width: 20px; height: 20px; color: #dcdcaa;"></i>
              <div>
                <div class="audio-filename">${this.escapeHtml(fileName)}</div>
                <div class="audio-meta">
                  <span class="audio-format">${formatDisplay}</span>
                  <span class="audio-size">${sizeDisplay}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="audio-player-container">
            <audio 
              id="${audioId}-player"
              controls 
              preload="metadata"
              style="width: 100%; max-width: 600px;"
            >
              <source src="${blobUrl}" type="${mimeType}">
              Your browser does not support the audio element.
            </audio>
          </div>
          <div class="audio-actions">
            <button class="audio-btn" onclick="document.getElementById('${audioId}-player').currentTime = 0">
              <i data-lucide="rotate-ccw" style="width: 16px; height: 16px;"></i>
              Restart
            </button>
            <button class="audio-btn" onclick="window.downloadAudioBlob('${blobUrl}', '${this.escapeHtml(fileName)}')">
              <i data-lucide="download" style="width: 16px; height: 16px;"></i>
              Download
            </button>
          </div>
        </div>
        
        <style>
          .audio-content {
            background: #1e1e1e;
            border: 1px solid #3e3e42;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          
          .audio-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid #3e3e42;
          }
          
          .audio-info {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          
          .audio-filename {
            font-size: 16px;
            font-weight: 600;
            color: #e0e0e0;
            margin-bottom: 4px;
          }
          
          .audio-meta {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 12px;
            color: #888;
          }
          
          .audio-format {
            background: #dcdcaa;
            color: #1e1e1e;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 600;
          }
          
          .audio-size {
            color: #888;
          }
          
          .audio-player-container {
            display: flex;
            justify-content: center;
            margin: 20px 0;
          }
          
          audio {
            border-radius: 8px;
            background: #2a2a2a;
          }
          
          audio::-webkit-media-controls-panel {
            background: #2a2a2a;
          }
          
          .audio-actions {
            display: flex;
            gap: 12px;
            justify-content: center;
            margin-top: 20px;
          }
          
          .audio-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            background: transparent;
            border: 1px solid #3e3e42;
            border-radius: 6px;
            color: #e0e0e0;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
          }
          
          .audio-btn:hover {
            background: #3e3e42;
            border-color: #4fc3f7;
            color: #4fc3f7;
          }
        </style>
      `;
      
      // Register download function
      if (!window.downloadAudioBlob) {
        window.downloadAudioBlob = (url, filename) => {
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        };
      }
      
      return html;
    } catch (error) {
      console.error('[AudioRenderer] Render error:', error);
      return `
        <div class="audio-content error">
          <div class="audio-header">
            <span class="audio-filename">Error loading audio</span>
          </div>
          <div class="audio-error">
            <p>${this.escapeHtml(error.message)}</p>
          </div>
        </div>
      `;
    }
  }
}

export default AudioRenderer;
