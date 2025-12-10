/**
 * UI Components
 * Handles all UI rendering and interactions
 * 
 * ✅ NOW USING mcard-js LIBRARY!
 */

// ✅ Import from mcard-js library
import { ContentTypeInterpreter } from 'mcard-js';

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
    
    const types = [
      { id: 'all', name: 'All Files', icon: 'package', count: categories.all.length },
      { id: 'clm', name: 'CLM', icon: 'box', count: categories.clm.length },
      { id: 'markdown', name: 'Markdown', icon: 'file-text', count: categories.markdown.length },
      { id: 'text', name: 'Text', icon: 'file-text', count: categories.text.length },
      { id: 'images', name: 'Images', icon: 'image', count: categories.images.length },
      { id: 'videos', name: 'Videos', icon: 'video', count: categories.videos.length },
      { id: 'audio', name: 'Audio', icon: 'music', count: categories.audio.length },
      { id: 'documents', name: 'Documents', icon: 'file', count: categories.documents.length },
      { id: 'archives', name: 'Archives', icon: 'archive', count: categories.archives.length },
      { id: 'other', name: 'Other', icon: 'folder', count: categories.other.length }
    ];

    typeList.innerHTML = types.map(type => `
      <div class="type-item ${type.id === currentType ? 'active' : ''}" onclick="window.mcardManager.selectType('${type.id}')">
        <div class="type-item-content">
          <span class="type-icon"><i data-lucide="${type.icon}" style="width: 20px; height: 20px;"></i></span>
          <span class="type-name">${type.name}</span>
        </div>
        <span class="type-count">${type.count}</span>
      </div>
    `).join('');
    
    // Initialize Lucide icons
    if (window.lucide) {
      lucide.createIcons();
    }
  }
  
  /**
   * Render card list
   * ✅ Uses ContentTypeInterpreter from library
   * @param {MCard[]} cards
   */
  static renderCardList(cards) {
    const mcardList = document.getElementById('mcardList');
    
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
    
    mcardList.innerHTML = cards.map(card => {
      // ✅ Use library's ContentTypeInterpreter
      const contentType = ContentTypeInterpreter.detect(card.getContent());
      const type = UIComponents.mapContentType(contentType);
      const icon = UIComponents.getFileIcon(type);
      const time = UIComponents.formatTime(card.g_time);
      const size = UIComponents.formatBytes(card.getContent().length);
      
      return `
        <div class="mcard-item" onclick="window.mcardManager.viewCard('${card.hash}')">
          <div class="mcard-item-header">
            <div class="mcard-item-icon">${icon}</div>
            <div class="mcard-item-info">
              <div class="mcard-item-name">${contentType}</div>
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
   * Format timestamp to relative time
   * @param {string} timestamp
   * @returns {string}
   */
  static formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return date.toLocaleDateString();
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
   * ✅ Helper for ContentTypeInterpreter output
   * @param {string} contentType
   * @returns {string}
   */
  static mapContentType(contentType) {
    const lowerType = contentType.toLowerCase();
    
    if (lowerType.includes('markdown')) return 'markdown';
    if (lowerType.includes('text')) return 'text';
    if (lowerType.includes('json')) return 'json';
    if (lowerType.includes('image')) return 'image';
    if (lowerType.includes('pdf')) return 'pdf';
    if (lowerType.includes('clm')) return 'clm';
    if (lowerType.includes('video')) return 'video';
    if (lowerType.includes('audio')) return 'audio';
    
    return 'text'; // default
  }
}
