/**
 * VideoRenderer - Renders video content with HTML5 video player
 * Supports: MP4, WebM, OGG, and other common video formats
 */

import { BaseRenderer } from './BaseRenderer.js';

export class VideoRenderer extends BaseRenderer {
  constructor() {
    super('video');
  }

  /**
   * Detect video format by magic bytes
   * @param {Uint8Array} bytes - First bytes of the file
   * @returns {Object} { format: string, mimeType: string }
   */
  detectFormat(bytes) {
    // MP4/MOV/M4V/3GP: Check for ftyp box
    if (bytes.length > 11 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
      const ftypString = String.fromCharCode(...bytes.slice(8, 12));
      console.log(`[VideoRenderer] Detected ftyp: ${ftypString}`);
      
      if (ftypString.includes('qt') || ftypString.includes('M4V')) {
        return { format: 'mov', mimeType: 'video/quicktime' };
      }
      if (ftypString.includes('3gp') || ftypString.includes('3g2')) {
        return { format: '3gp', mimeType: 'video/3gpp' };
      }
      if (ftypString.includes('mp4') || ftypString.includes('isom') || 
          ftypString.includes('avc1') || ftypString.includes('iso2')) {
        return { format: 'mp4', mimeType: 'video/mp4' };
      }
      // Default to MP4 for unknown ftyp
      return { format: 'mp4', mimeType: 'video/mp4' };
    }
    
    // WebM/MKV: 1A 45 DF A3 (EBML)
    if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) {
      const ebmlCheck = String.fromCharCode(...bytes.slice(0, Math.min(100, bytes.length)));
      if (ebmlCheck.includes('webm')) {
        console.log('[VideoRenderer] Detected WebM by EBML header');
        return { format: 'webm', mimeType: 'video/webm' };
      }
      if (ebmlCheck.includes('matroska')) {
        console.log('[VideoRenderer] Detected MKV by EBML header');
        return { format: 'mkv', mimeType: 'video/x-matroska' };
      }
      // Default to WebM
      return { format: 'webm', mimeType: 'video/webm' };
    }
    
    // OGG: 4F 67 67 53 (OggS)
    if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
      console.log('[VideoRenderer] Detected OGG video by magic bytes');
      return { format: 'ogg', mimeType: 'video/ogg' };
    }
    
    // AVI: 52 49 46 46 ... 41 56 49 20 (RIFF...AVI )
    if (bytes.length > 11 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
      if (bytes[8] === 0x41 && bytes[9] === 0x56 && bytes[10] === 0x49 && bytes[11] === 0x20) {
        console.log('[VideoRenderer] Detected AVI by magic bytes');
        return { format: 'avi', mimeType: 'video/x-msvideo' };
      }
    }
    
    // FLV: 46 4C 56 (FLV)
    if (bytes[0] === 0x46 && bytes[1] === 0x4C && bytes[2] === 0x56) {
      console.log('[VideoRenderer] Detected FLV by magic bytes');
      return { format: 'flv', mimeType: 'video/x-flv' };
    }
    
    // MPEG/MPG: 00 00 01 BA or 00 00 01 B3
    if (bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01) {
      if (bytes[3] === 0xBA || bytes[3] === 0xB3) {
        console.log('[VideoRenderer] Detected MPEG by magic bytes');
        return { format: 'mpeg', mimeType: 'video/mpeg' };
      }
    }
    
    // WMV/ASF: 30 26 B2 75 8E 66 CF 11
    if (bytes.length > 7 && bytes[0] === 0x30 && bytes[1] === 0x26 && bytes[2] === 0xB2 && bytes[3] === 0x75 &&
        bytes[4] === 0x8E && bytes[5] === 0x66 && bytes[6] === 0xCF && bytes[7] === 0x11) {
      console.log('[VideoRenderer] Detected WMV/ASF by magic bytes');
      return { format: 'wmv', mimeType: 'video/x-ms-wmv' };
    }
    
    // Default to MP4 if unknown
    console.log('[VideoRenderer] Unknown format, defaulting to MP4');
    return { format: 'mp4', mimeType: 'video/mp4' };
  }

  /**
   * Format file size for display
   * @param {number} bytes
   * @returns {string}
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get format badge HTML
   * @param {string} format
   * @returns {string}
   */
  getFormatBadge(format) {
    const badges = {
      'mp4': '<span style="background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">MP4</span>',
      'webm': '<span style="background: #9b59b6; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">WebM</span>',
      'mkv': '<span style="background: #8e44ad; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">MKV</span>',
      'ogg': '<span style="background: #3498db; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">OGG</span>',
      'avi': '<span style="background: #f39c12; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">AVI</span>',
      'mov': '<span style="background: #1abc9c; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">MOV</span>',
      '3gp': '<span style="background: #16a085; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">3GP</span>',
      'flv': '<span style="background: #e67e22; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">FLV</span>',
      'mpeg': '<span style="background: #c0392b; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">MPEG</span>',
      'wmv': '<span style="background: #2980b9; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">WMV</span>'
    };
    return badges[format] || badges['mp4'];
  }

  /**
   * Render video content
   * @param {Uint8Array} binaryContent - Video binary data
   * @param {Object} metadata - Optional metadata
   * @returns {string} HTML string
   */
  render(binaryContent, metadata = {}) {
    const bytes = new Uint8Array(binaryContent);
    const { format, mimeType } = this.detectFormat(bytes);
    const fileSize = this.formatBytes(bytes.length);
    const formatBadge = this.getFormatBadge(format);
    
    console.log(`[VideoRenderer] Rendering ${format.toUpperCase()} video, size: ${fileSize}, MIME: ${mimeType}`);
    
    // Create blob URL for video
    const blob = new Blob([binaryContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    // Generate unique ID for this video player
    const videoId = `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return `
      <div class="video-renderer" style="
        max-width: 100%;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      ">
        <!-- Header -->
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 2px solid rgba(255, 255, 255, 0.1);
        ">
          <div style="display: flex; align-items: center; gap: 12px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"></polygon>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
            <div>
              <div style="color: #fff; font-size: 18px; font-weight: 600; margin-bottom: 4px;">
                Video Player
              </div>
              <div style="color: rgba(255, 255, 255, 0.6); font-size: 13px;">
                ${formatBadge} • ${fileSize}
              </div>
            </div>
          </div>
          
          <!-- Download Button -->
          <button onclick="window.downloadVideo('${url}', '${format}')" style="
            background: rgba(231, 76, 60, 0.2);
            border: 1px solid #e74c3c;
            color: #e74c3c;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
          " onmouseover="this.style.background='#e74c3c'; this.style.color='white';" 
             onmouseout="this.style.background='rgba(231, 76, 60, 0.2)'; this.style.color='#e74c3c';">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download
          </button>
        </div>
        
        <!-- Video Player -->
        <div style="
          position: relative;
          width: 100%;
          background: #000;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        ">
          <video 
            id="${videoId}"
            controls
            preload="metadata"
            style="
              width: 100%;
              max-height: 70vh;
              display: block;
              background: #000;
            "
          >
            <source src="${url}" type="${mimeType}">
            Your browser does not support the video tag.
          </video>
        </div>
        
        <!-- Info Footer -->
        <div style="
          margin-top: 16px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <div>
            <strong style="color: #fff;">Format:</strong> ${format.toUpperCase()} 
            <span style="margin: 0 8px;">•</span>
            <strong style="color: #fff;">Size:</strong> ${fileSize}
          </div>
          <div style="color: rgba(255, 255, 255, 0.5); font-size: 11px;">
            💡 Tip: Right-click video for more options
          </div>
        </div>
      </div>
      
      <script>
        // Download function
        window.downloadVideo = function(url, format) {
          const a = document.createElement('a');
          a.href = url;
          a.download = \`video-\${Date.now()}.\${format}\`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        };
        
        // Log video metadata when loaded
        const video = document.getElementById('${videoId}');
        video.addEventListener('loadedmetadata', function() {
          console.log('[VideoRenderer] Video loaded:', {
            duration: video.duration + 's',
            width: video.videoWidth + 'px',
            height: video.videoHeight + 'px',
            format: '${format}'
          });
        });
        
        // Cleanup blob URL when video is removed
        video.addEventListener('error', function(e) {
          console.error('[VideoRenderer] Video error:', e);
        });
      </script>
    `;
  }
}
