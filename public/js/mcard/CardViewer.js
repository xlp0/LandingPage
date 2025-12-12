/**
 * Card Viewer Component
 * Handles viewing and rendering individual cards
 * 
 * ✅ NOW USING mcard-js LIBRARY!
 */

// ✅ Import from mcard-js library
import { ContentTypeInterpreter } from 'mcard-js';
import { UIComponents } from './UIComponents.js';
import store from '../../../js/redux/store.js';
import { renderContent, extractHandles } from '../../../js/redux/slices/content-renderer-slice.js';
import rendererRegistry from '../../../js/renderers/RendererRegistry.js';

export class CardViewer {
  constructor() {
    this.currentCard = null;
  }
  
  /**
   * View a card
   * ✅ Uses ContentTypeInterpreter from library
   * @param {MCard} card
   * @param {Object} collection - MCard collection for handle lookup
   */
  async view(card, collection = null) {
    this.currentCard = card;
    
    const viewerTitle = document.getElementById('viewerTitle');
    const viewerContent = document.getElementById('viewerContent');
    const viewerActions = document.getElementById('viewerActions');
    
    // ✅ Use library's ContentTypeInterpreter
    const contentType = ContentTypeInterpreter.detect(card.getContent());
    const binaryContent = card.getContent(); // For magic byte detection
    const textContent = card.getContentAsText(); // For text pattern matching
    
    // Map to our internal type (pass both binary and text content)
    const detectedType = this.mapContentType(contentType, binaryContent, textContent);
    
    // Create typeInfo object with proper display name
    const displayNames = {
      'markdown': 'Markdown',
      'text': 'Text',
      'json': 'JSON',
      'image': 'Image',
      'pdf': 'PDF',
      'clm': 'CLM',
      'video': 'Video',
      'audio': 'Audio'
    };
    const typeInfo = { 
      type: detectedType, 
      displayName: displayNames[detectedType] || detectedType.toUpperCase() 
    };
    
    // Use our detected type directly (don't let Redux override it)
    const renderType = typeInfo.type;
    
    // Determine MIME type
    const mimeType = this.getMimeType(typeInfo.type);
    
    // Extension map
    const extensionMap = {
      'text': '.txt',
      'markdown': '.md',
      'json': '.json',
      'image': '.png',
      'pdf': '.pdf',
      'clm': '.clm.yaml'
    };
    const extension = extensionMap[typeInfo.type] || '';
    
    // Dispatch Redux action for tracking (optional)
    try {
      await store.dispatch(renderContent({
        hash: card.hash,
        content: textContent || '[Binary Content]',
        mimeType: mimeType,
        fileName: `${typeInfo.displayName}-${card.hash.substring(0, 8)}${extension}`
      }));
    } catch (error) {
      console.warn('[CardViewer] Redux dispatch failed:', error);
    }
    
    // Update title with full hash and copy button
    const contentTypeBadge = this.getContentTypeBadge(renderType, binaryContent);
    viewerTitle.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px; font-weight: 600;">${typeInfo.displayName}</span>
            ${contentTypeBadge}
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <code style="font-size: 11px; color: #888; font-family: 'Monaco', monospace;">${card.hash}</code>
            <button 
              onclick="window.mcardManager.copyHash('${card.hash}')" 
              style="
                background: transparent;
                border: 1px solid #3e3e42;
                border-radius: 4px;
                padding: 2px 8px;
                font-size: 10px;
                color: #888;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 4px;
                transition: all 0.2s;
              "
              onmouseover="this.style.borderColor='#4fc3f7'; this.style.color='#4fc3f7';"
              onmouseout="this.style.borderColor='#3e3e42'; this.style.color='#888';"
              title="Copy full hash"
            >
              <i data-lucide="copy" style="width: 10px; height: 10px;"></i>
              Copy Hash
            </button>
            <button 
              onclick="window.mcardManager.createHandle('${card.hash}')" 
              style="
                background: transparent;
                border: 1px solid #3e3e42;
                border-radius: 4px;
                padding: 2px 8px;
                font-size: 10px;
                color: #888;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 4px;
                transition: all 0.2s;
              "
              onmouseover="this.style.borderColor='#4ade80'; this.style.color='#4ade80';"
              onmouseout="this.style.borderColor='#3e3e42'; this.style.color='#888';"
              title="Create friendly name"
            >
              <i data-lucide="tag" style="width: 10px; height: 10px;"></i>
              Create Handle
            </button>
          </div>
        </div>
      </div>
    `;
    
    // ✅ Check if card has a handle and add Edit button
    let cardHandle = null;
    if (collection && collection.engine && collection.engine.db) {
      try {
        const db = collection.engine.db;
        const tx = db.transaction('handles', 'readonly');
        const store = tx.objectStore('handles');
        const index = store.index('by-hash');
        const handleRecords = await index.getAll(card.hash);
        if (handleRecords && handleRecords.length > 0) {
          cardHandle = handleRecords[0].handle;
        }
      } catch (e) {
        console.warn('[CardViewer] Failed to fetch handle:', e);
      }
    }
    
    // Update viewer actions with Edit button if card has handle
    if (cardHandle) {
      viewerActions.innerHTML = `
        <button class="btn" style="font-size: 12px; padding: 8px 16px; display: flex; align-items: center; gap: 6px;" onclick="window.mcardManager.editCard('${card.hash}', '${cardHandle}')">
          <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
          Edit
        </button>
        <button class="btn" style="font-size: 12px; padding: 8px 16px; display: flex; align-items: center; gap: 6px;" onclick="downloadCurrentCard()">
          <i data-lucide="download" style="width: 16px; height: 16px;"></i>
          Download
        </button>
        <button class="btn btn-secondary" style="font-size: 12px; padding: 8px 16px; display: flex; align-items: center; gap: 6px;" onclick="deleteCurrentCard()">
          <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
          Delete
        </button>
      `;
    } else {
      viewerActions.innerHTML = `
        <button class="btn" style="font-size: 12px; padding: 8px 16px; display: flex; align-items: center; gap: 6px;" onclick="downloadCurrentCard()">
          <i data-lucide="download" style="width: 16px; height: 16px;"></i>
          Download
        </button>
        <button class="btn btn-secondary" style="font-size: 12px; padding: 8px 16px; display: flex; align-items: center; gap: 6px;" onclick="deleteCurrentCard()">
          <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
          Delete
        </button>
      `;
    }
    viewerActions.style.display = 'flex';
    
    // Show loading state
    UIComponents.showLoading();
    
    // Render content
    try {
      // Initialize renderer registry if not already done
      if (!rendererRegistry.initialized) {
        console.log('[CardViewer] Initializing renderer registry...');
        await rendererRegistry.initialize();
        console.log('[CardViewer] Renderer registry initialized');
      }
      
      console.log('[CardViewer] Detected type:', renderType);
      console.log('[CardViewer] Has renderer:', rendererRegistry.hasRenderer(renderType));
      
      // ✅ Handle unknown binary files
      if (renderType === 'binary') {
        const sizeMB = (binaryContent.length / (1024 * 1024)).toFixed(2);
        viewerContent.innerHTML = `
          <div style="padding: 40px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 16px;">📦</div>
            <h3 style="color: #888; margin-bottom: 8px;">Binary File</h3>
            <p style="color: #888; margin-bottom: 8px;">Size: ${sizeMB} MB</p>
            <p style="color: #666; font-size: 14px; margin-bottom: 24px;">This file cannot be displayed in the browser.</p>
            <button 
              onclick="window.mcardManager.downloadCard('${card.hash}')"
              style="
                background: #4fc3f7;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
              "
            >
              Download File
            </button>
          </div>
        `;
        UIComponents.hideLoading();
        return;
      }
      
      if (rendererRegistry.hasRenderer(renderType)) {
        console.log('[CardViewer] Rendering with', renderType, 'renderer');
        
        // ✅ Use binary content for binary types, text content for text types
        const contentToRender = (renderType === 'image' || renderType === 'pdf' || renderType === 'video' || renderType === 'audio') 
          ? binaryContent 
          : textContent;
        
        // ✅ Safety check: Prevent rendering huge text files that freeze the browser
        const MAX_TEXT_SIZE = 1024 * 1024; // 1MB limit for text rendering
        if ((renderType === 'text' || renderType === 'markdown' || renderType === 'json') && 
            binaryContent.length > MAX_TEXT_SIZE) {
          const sizeMB = (binaryContent.length / (1024 * 1024)).toFixed(2);
          viewerContent.innerHTML = `
            <div style="padding: 40px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">📄</div>
              <h3 style="color: #f48771; margin-bottom: 8px;">File Too Large to Display</h3>
              <p style="color: #888; margin-bottom: 24px;">This file is ${sizeMB} MB. Text files larger than 1 MB cannot be displayed in the browser.</p>
              <button 
                onclick="window.mcardManager.downloadCard('${card.hash}')"
                style="
                  background: #4fc3f7;
                  color: white;
                  border: none;
                  padding: 12px 24px;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 14px;
                  font-weight: 600;
                "
              >
                Download File
              </button>
            </div>
          `;
          UIComponents.hideLoading();
          return;
        }
        
        const renderedHTML = await rendererRegistry.render(renderType, contentToRender, {
          fileName: `${typeInfo.displayName}-${card.hash.substring(0, 8)}`,
          mimeType: mimeType,
          enableHandles: true,
          onHandleClick: (targetHash) => {
            window.mcardManager.viewCard(targetHash);
          }
        });
        console.log('[CardViewer] Rendered HTML length:', renderedHTML.length);
        
        // Extract handles if markdown
        if (renderType === 'markdown' && typeof textContent === 'string') {
          await store.dispatch(extractHandles({
            content: textContent,
            hash: card.hash
          }));
        }
        
        viewerContent.innerHTML = renderedHTML;
        
        // Add hash link click handlers
        this.attachHashLinkHandlers();
        
        // Initialize Lucide icons
        if (window.lucide) {
          lucide.createIcons();
        }
      } else {
        viewerContent.innerHTML = `<pre style="padding: 20px; overflow: auto;">${this.escapeHtml(textContent)}</pre>`;
      }
    } catch (error) {
      console.error('[CardViewer] Rendering error:', error);
      viewerContent.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #f48771;">
          <p>Error rendering content</p>
          <p style="font-size: 12px; margin-top: 8px;">${error.message}</p>
        </div>
      `;
    }
  }
  
  /**
   * Attach click handlers for hash-based links
   */
  attachHashLinkHandlers() {
    const hashLinks = document.querySelectorAll('.mcard-hash-link');
    hashLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetHash = link.dataset.hash;
        if (targetHash) {
          window.mcardManager.viewCard(targetHash);
        }
      });
    });
  }
  
  /**
   * Get MIME type from content type
   * @param {string} type
   * @returns {string}
   */
  getMimeType(type) {
    const mimeMap = {
      'text': 'text/plain',
      'markdown': 'text/markdown',
      'json': 'application/json',
      'image': 'image/png',
      'pdf': 'application/pdf',
      'clm': 'application/x-yaml'
    };
    return mimeMap[type] || 'text/plain';
  }
  
  /**
   * Get content type badge HTML with specific format detection
   * @param {string} type - Internal type (image, video, etc.)
   * @param {Uint8Array} binaryContent - Binary content for format detection
   * @returns {string}
   */
  getContentTypeBadge(type, binaryContent = null) {
    // Detect specific format for images
    if (type === 'image' && binaryContent && binaryContent.length > 4) {
      const bytes = binaryContent instanceof Uint8Array ? binaryContent : new Uint8Array(binaryContent);
      // PNG: 89 50 4E 47
      if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
        return '<span style="background: #4ec9b0; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">PNG</span>';
      }
      // JPEG: FF D8 FF
      if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
        return '<span style="background: #4ec9b0; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">JPG</span>';
      }
      // GIF: 47 49 46
      if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
        return '<span style="background: #4ec9b0; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">GIF</span>';
      }
      // WebP: 52 49 46 46 (RIFF)
      if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
        return '<span style="background: #4ec9b0; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">WEBP</span>';
      }
      // Generic image
      return '<span style="background: #4ec9b0; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">IMG</span>';
    }
    
    // Detect specific format for videos
    if (type === 'video' && binaryContent && binaryContent.length > 12) {
      const bytes = binaryContent instanceof Uint8Array ? binaryContent : new Uint8Array(binaryContent);
      // MP4: Check for ftyp box
      if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
        return '<span style="background: #c586c0; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">MP4</span>';
      }
      // WebM: 1A 45 DF A3
      if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) {
        return '<span style="background: #c586c0; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">WEBM</span>';
      }
      // Generic video
      return '<span style="background: #c586c0; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">VIDEO</span>';
    }
    
    // Default badges for other types
    const badges = {
      'markdown': '<span style="background: #007acc; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">MD</span>',
      'text': '<span style="background: #6a9955; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">TXT</span>',
      'json': '<span style="background: #ce9178; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">JSON</span>',
      'pdf': '<span style="background: #f48771; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">PDF</span>',
      'clm': '<span style="background: #4fc3f7; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">CLM</span>',
      'audio': '<span style="background: #dcdcaa; color: #1e1e1e; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">AUDIO</span>'
    };
    return badges[type] || '';
  }
  
  /**
   * Escape HTML
   * @param {string} text
   * @returns {string}
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Get current card
   * @returns {MCard|null}
   */
  getCurrentCard() {
    return this.currentCard;
  }
  
  /**
   * Map library content type to our internal type
   * ✅ Uses library's ContentTypeInterpreter output first, then enhances with pattern matching
   * @param {string} contentType - From ContentTypeInterpreter.detect()
   * @param {Uint8Array} binaryContent - Binary content for magic byte detection
   * @param {string} textContent - Text content for pattern matching
   * @returns {string}
   */
  mapContentType(contentType, binaryContent = null, textContent = '') {
    const lowerType = contentType.toLowerCase();
    
    // ✅ Safety: Check if "text/plain" is actually binary (has many null bytes or high-byte chars)
    if (lowerType.includes('text') && binaryContent && binaryContent.length > 100) {
      const bytes = binaryContent instanceof Uint8Array ? binaryContent : new Uint8Array(binaryContent);
      let nullCount = 0;
      let highByteCount = 0;
      const sampleSize = Math.min(1000, bytes.length);
      
      for (let i = 0; i < sampleSize; i++) {
        if (bytes[i] === 0) nullCount++;
        if (bytes[i] > 127) highByteCount++;
      }
      
      // If >5% null bytes or >80% high bytes, it's probably binary
      if (nullCount > sampleSize * 0.05 || highByteCount > sampleSize * 0.8) {
        // Try to detect format by magic bytes
        if (bytes.length > 4) {
          // PNG
          if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'image';
          // JPEG
          if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'image';
          // GIF
          if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image';
          // WebP
          if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return 'image';
          // MP4
          if (bytes.length > 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return 'video';
          // WebM
          if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) return 'video';
          // PDF
          if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'pdf';
        }
        // Unknown binary - don't try to render as text
        return 'binary';
      }
    }
    
    // ✅ Check for images by magic bytes if library says "application/octet-stream"
    if (lowerType.includes('octet-stream') && binaryContent && binaryContent.length > 4) {
      const bytes = binaryContent instanceof Uint8Array ? binaryContent : new Uint8Array(binaryContent);
      // PNG: 89 50 4E 47
      if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
        return 'image';
      }
      // JPEG: FF D8 FF
      if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
        return 'image';
      }
      // GIF: 47 49 46
      if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
        return 'image';
      }
      // WebP: 52 49 46 46 (RIFF)
      if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
        return 'image';
      }
    }
    
    // ✅ TRUST THE LIBRARY FIRST for binary/structured types
    // These are reliably detected by the library
    if (lowerType.includes('image')) return 'image';
    if (lowerType.includes('video')) return 'video';
    if (lowerType.includes('audio')) return 'audio';
    if (lowerType.includes('pdf')) return 'pdf';
    if (lowerType.includes('json')) return 'json';
    if (lowerType.includes('markdown')) return 'markdown';
    
    // ✅ Check for YAML (library might detect it)
    if (lowerType.includes('yaml')) {
      // Check if it's a CLM file (YAML with CLM structure)
      if (textContent && (
        (textContent.includes('abstract:') && textContent.includes('concrete:') && textContent.includes('balanced:')) ||
        textContent.includes('clm:')
      )) {
        return 'clm';
      }
      // Regular YAML
      return 'yaml';
    }
    
    // ✅ ENHANCE for text-based types (library might say "text/plain")
    // Only do pattern matching for text content
    if (lowerType.includes('text') && textContent) {
      // Check for CLM (YAML-based, highest priority for text)
      if ((textContent.includes('abstract:') && textContent.includes('concrete:') && textContent.includes('balanced:')) ||
          textContent.includes('clm:')) {
        return 'clm';
      }
      
      // Check for markdown patterns
      if (
        textContent.match(/^#{1,6}\s+/m) ||      // Headers
        textContent.match(/\[.+\]\(.+\)/) ||     // Links
        textContent.match(/```[\s\S]*?```/) ||   // Code blocks
        textContent.match(/^\s*[-*+]\s+/m) ||    // Lists
        textContent.match(/^\s*\d+\.\s+/m)       // Numbered lists
      ) {
        return 'markdown';
      }
      
      // Plain text
      return 'text';
    }
    
    // Default fallback
    return 'text';
  }
}
