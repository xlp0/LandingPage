/**
 * UI Components
 * Handles all UI rendering and interactions
 * 
 * ✅ NOW USING mcard-js LIBRARY!
 */

// ✅ Import from mcard-js library
import { ContentTypeInterpreter } from 'mcard-js';
import { ContentTypeDetector } from './ContentTypeDetector.js';

export class UIComponents {
  /**
   * Render file types sidebar
   * @param {MCard[]} allCards
   * @param {string} currentType
   * @param {Object} categories - Pre-categorized cards
   */
  static renderFileTypes(allCards, currentType, categories = null) {
    // If categories not provided, create basic structure
    if (!categories) {
      categories = { all: allCards };
    }
    const typeList = document.getElementById('typeList');
    
    if (!typeList) {
      console.error('[UIComponents] typeList element not found!');
      return;
    }
    
    // Helper to safely get count
    const getCount = (arr) => (arr && arr.length) || 0;
    
    const types = [
      { id: 'all', name: 'All Cards', icon: 'package', count: getCount(categories.all) },
      { id: 'with-handles', name: 'With Handles', icon: 'tag', count: getCount(categories.withHandles) },
      { id: 'apps', name: 'Apps', icon: 'grid', count: '', isExpandable: true },
      { id: 'clm', name: 'CLM', icon: 'box', count: getCount(categories.clm) },
      { id: 'markdown', name: 'Markdown', icon: 'file-text', count: getCount(categories.markdown) },
      { id: 'text', name: 'Text', icon: 'file-text', count: getCount(categories.text) },
      { id: 'images', name: 'Images', icon: 'image', count: getCount(categories.images) },
      { id: 'videos', name: 'Videos', icon: 'video', count: getCount(categories.videos) },
      { id: 'audio', name: 'Audio', icon: 'music', count: getCount(categories.audio) },
      { id: 'documents', name: 'Documents', icon: 'file', count: getCount(categories.documents) },
      { id: 'archives', name: 'Archives', icon: 'archive', count: getCount(categories.archives) },
      { id: 'other', name: 'Other', icon: 'folder', count: getCount(categories.other) }
    ];
    
    // External apps list
    const externalApps = [
      { id: 'calendar', name: 'Calendar', icon: 'calendar', action: 'showCalendar()' },
      { id: 'map', name: 'Map', icon: 'map', action: 'showMap()' }
    ];

    typeList.innerHTML = types.map(type => {
      // Special handling for Apps (expandable)
      if (type.isExpandable && type.id === 'apps') {
        const appsHtml = externalApps.map(app => `
          <div class="type-item app-item" onclick="${app.action}" title="${app.name}">
            <div class="type-item-content">
              <span class="type-icon" title="${app.name}"><i data-lucide="${app.icon}" style="width: 18px; height: 18px;"></i></span>
              <span class="type-name">${app.name}</span>
            </div>
            <span class="type-count" style="opacity: 0.5;"><i data-lucide="external-link" style="width: 12px; height: 12px;"></i></span>
          </div>
        `).join('');
        
        return `
          <div class="type-item apps-header" onclick="toggleApps()" title="${type.name}">
            <div class="type-item-content">
              <span class="type-icon" title="${type.name}"><i data-lucide="${type.icon}" style="width: 20px; height: 20px;"></i></span>
              <span class="type-name">${type.name}</span>
            </div>
            <span class="type-count"><i data-lucide="chevron-down" id="appsChevron" style="width: 16px; height: 16px; transition: transform 0.2s;"></i></span>
          </div>
          <div class="apps-submenu" id="appsSubmenu" style="display: none; padding-left: 12px;">
            ${appsHtml}
          </div>
        `;
      }
      
      // Normal card type
      return `
        <div class="type-item ${type.id === currentType ? 'active' : ''}" onclick="selectType('${type.id}')" title="${type.name}">
          <div class="type-item-content">
            <span class="type-icon" title="${type.name}"><i data-lucide="${type.icon}" style="width: 20px; height: 20px;"></i></span>
            <span class="type-name">${type.name}</span>
          </div>
          <span class="type-count">${type.count}</span>
        </div>
      `;
    }).join('');
    
    // Initialize Lucide icons
    if (window.lucide) {
      lucide.createIcons();
    }
  }
  
  /**
   * Render MCard list
   * @param {Array} cards
   * @param {Object} collection - CardCollection instance for handle lookup
   */
  static async renderCards(cards, collection = null) {
    const mcardList = document.getElementById('mcardList');
    if (!mcardList) return;
    
    if (cards.length === 0) {
      mcardList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i data-lucide="package" style="width: 64px; height: 64px; color: #ccc;"></i>
          </div>
          <p>No MCards in this category</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }
    
    // Fetch handles for all cards using IndexedDB index
    const cardHandles = new Map();
    if (collection && collection.engine.db) {
      try {
        const db = collection.engine.db;
        const tx = db.transaction('handles', 'readonly');
        const store = tx.objectStore('handles');
        const index = store.index('by-hash');
        
        for (const card of cards) {
          try {
            // Query by hash using the 'by-hash' index
            const handleRecords = await index.getAll(card.hash);
            if (handleRecords && handleRecords.length > 0) {
              cardHandles.set(card.hash, handleRecords[0].handle);
            }
          } catch (e) {
            // No handle for this card
          }
        }
      } catch (e) {
        console.warn('[UIComponents] Failed to fetch handles:', e);
      }
    }
    
    mcardList.innerHTML = cards.map(card => {
      // ✅ Use ContentTypeDetector for unified detection
      const typeInfo = ContentTypeDetector.detect(card);
      const type = typeInfo.type;
      const binaryContent = card.getContent();
      
      const icon = UIComponents.getFileIcon(type);
      const time = UIComponents.formatTime(card.g_time);
      const size = UIComponents.formatBytes(card.getContent().length);
      const badge = UIComponents.getTypeBadge(type, binaryContent);
      
      // Display names for types
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
      const displayName = displayNames[type] || type.toUpperCase();
      
      // ✅ Get handle for this card
      const handle = cardHandles.get(card.hash);
      const handleBadge = handle ? `<span style="background: #4ade80; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600;">@${handle}</span>` : '';
      
      return `
        <div class="mcard-item" onclick="viewCard('${card.hash}')">
          <div class="mcard-item-header">
            <div class="mcard-item-icon">${icon}</div>
            <div class="mcard-item-info">
              <div class="mcard-item-name" style="display: flex; align-items: center; gap: 6px;">
                <span>${displayName}</span>
                ${badge}
                ${handleBadge}
              </div>
              <div class="mcard-item-hash">${card.hash.substring(0, 16)}...</div>
            </div>
          </div>
          <div class="mcard-item-meta">
            <span style="display: flex; align-items: center; gap: 4px;"><i data-lucide="clock" style="width: 14px; height: 14px;"></i> ${time}</span>
            <span>${size}</span>
          </div>
        </div>
      `;
    }).join('');
    
    if (window.lucide) lucide.createIcons();
  }
  
  /**
   * Show loading state in viewer
   */
  static showLoading() {
    const viewerContent = document.getElementById('viewerContent');
    viewerContent.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 16px;">
        <div class="spinner"></div>
        <p style="color: #888; font-size: 14px;">Loading content...</p>
      </div>
    `;
  }
  
  /**
   * Show empty state in viewer
   */
  static showEmptyViewer() {
    const viewerContent = document.getElementById('viewerContent');
    const viewerTitle = document.getElementById('viewerTitle');
    const viewerActions = document.getElementById('viewerActions');
    
    viewerTitle.textContent = 'Select an MCard';
    viewerActions.style.display = 'none';
    viewerContent.innerHTML = `
      <div class="upload-section" id="uploadSection">
        <div class="upload-icon">
          <i data-lucide="upload-cloud" style="width: 64px; height: 64px; color: #667eea;"></i>
        </div>
        <h3>Upload Files</h3>
        <p>Drag and drop files here or click to browse</p>
        <button class="btn" onclick="document.getElementById('fileInput').click()">
          <i data-lucide="upload" style="width: 16px; height: 16px;"></i>
          Choose Files
        </button>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }
  
  /**
   * Get file icon based on detected type
   * @param {string} type
   * @returns {string}
   */
  static getFileIcon(type) {
    if (type === 'clm') return '<i data-lucide="box" style="width: 24px; height: 24px;"></i>';
    if (type === 'image') return '<i data-lucide="image" style="width: 24px; height: 24px;"></i>';
    if (type === 'pdf') return '<i data-lucide="file-text" style="width: 24px; height: 24px;"></i>';
    if (type === 'text' || type === 'markdown' || type === 'json') return '<i data-lucide="file-text" style="width: 24px; height: 24px;"></i>';
    if (type === 'binary') return '<i data-lucide="file" style="width: 24px; height: 24px;"></i>';
    return '<i data-lucide="file" style="width: 24px; height: 24px;"></i>';
  }
  
  /**
   * Format GTime to readable string
   * @param {GTime|string} gtime - GTime object or ISO string
   * @returns {string}
   */
  static formatTime(gtime) {
    if (!gtime) return 'Unknown';
    
    // ✅ Handle GTime object (has toISOString method)
    let timestamp;
    if (typeof gtime === 'object' && gtime.toISOString) {
      timestamp = gtime.toISOString();
    } else if (typeof gtime === 'string') {
      timestamp = gtime;
    } else {
      return 'Unknown';
    }
    
    // Parse and format
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      // If invalid date, show the raw GTime string
      return timestamp.substring(0, 19).replace('T', ' ');
    }
    
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }
  
  /**
   * Format bytes to human readable
   * @param {number} bytes
   * @returns {string}
   */
  static formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
  
  /**
   * Show toast notification
   * @param {string} message
   * @param {string} type - 'success' | 'error' | 'info'
   */
  static showToast(message, type = 'info') {
    // Remove existing toasts
    const existing = document.querySelectorAll('.toast');
    existing.forEach(t => t.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  
  /**
   * Update stats display
   * @param {number} count
   */
  static updateStats(count) {
    const statsEl = document.getElementById('stats');
    if (statsEl) {
      statsEl.textContent = `${count} MCard${count !== 1 ? 's' : ''}`;
    }
  }
  
  /**
   * Map library content type to our internal type
   * ✅ Uses library first, then checks magic bytes for images
   * @param {string} contentType - From ContentTypeInterpreter.detect()
   * @param {Uint8Array} binaryContent - Binary content for magic byte detection
   * @param {string} textContent - Text content for pattern matching
   * @returns {string}
   */
  static mapContentType(contentType, binaryContent = null, textContent = '') {
    const lowerType = contentType.toLowerCase();
    
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
    
    // ✅ TRUST THE LIBRARY FIRST
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
    
    // ✅ ENHANCE for text types
    if (lowerType.includes('text') && textContent) {
      // Check for CLM (YAML-based, highest priority for text)
      if ((textContent.includes('abstract:') && textContent.includes('concrete:') && textContent.includes('balanced:')) ||
          textContent.includes('clm:')) {
        return 'clm';
      }
      // Check for markdown patterns
      if (
        textContent.match(/^#{1,6}\s+/m) ||
        textContent.match(/\[.+\]\(.+\)/) ||
        textContent.match(/```[\s\S]*?```/) ||
        textContent.match(/^\s*[-*+]\s+/m) ||
        textContent.match(/^\s*\d+\.\s+/m)
      ) {
        return 'markdown';
      }
      return 'text';
    }
    
    return 'text'; // default
  }
  
  /**
   * Get type badge HTML with specific format detection
   * @param {string} type - Internal type (image, video, etc.)
   * @param {Uint8Array} binaryContent - Binary content for format detection
   * @returns {string}
   */
  static getTypeBadge(type, binaryContent = null) {
    // Detect specific format for images
    if (type === 'image' && binaryContent && binaryContent.length > 4) {
      const bytes = binaryContent instanceof Uint8Array ? binaryContent : new Uint8Array(binaryContent);
      // PNG: 89 50 4E 47
      if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
        return '<span style="background: #4ec9b0; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600;">PNG</span>';
      }
      // JPEG: FF D8 FF
      if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
        return '<span style="background: #4ec9b0; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600;">JPG</span>';
      }
      // GIF: 47 49 46
      if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
        return '<span style="background: #4ec9b0; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600;">GIF</span>';
      }
      // WebP: 52 49 46 46 (RIFF)
      if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
        return '<span style="background: #4ec9b0; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600;">WEBP</span>';
      }
    }
    
    // Detect specific format for videos
    if (type === 'video' && binaryContent && binaryContent.length > 12) {
      const bytes = binaryContent instanceof Uint8Array ? binaryContent : new Uint8Array(binaryContent);
      // MP4: Check for ftyp box
      if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
        return '<span style="background: #c586c0; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600;">MP4</span>';
      }
      // WebM: 1A 45 DF A3
      if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) {
        return '<span style="background: #c586c0; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600;">WEBM</span>';
      }
    }
    
    // Default badges for other types
    const badges = {
      'markdown': '<span style="background: #007acc; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600;">MD</span>',
      'text': '<span style="background: #6a9955; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600;">TXT</span>',
      'json': '<span style="background: #ce9178; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600;">JSON</span>',
      'pdf': '<span style="background: #f48771; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600;">PDF</span>',
      'clm': '<span style="background: #4fc3f7; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600;">CLM</span>'
    };
    return badges[type] || '';
  }
}
