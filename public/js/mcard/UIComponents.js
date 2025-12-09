/**
 * UI Components
 * Handles all UI rendering and interactions
 */

import { ContentTypeDetector } from './ContentTypeDetector.js';

export class UIComponents {
  /**
   * Render file types sidebar
   * @param {MCard[]} allCards
   * @param {string} currentType
   */
  static renderFileTypes(allCards, currentType) {
    const categories = ContentTypeDetector.categorize(allCards);
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
      const typeInfo = ContentTypeDetector.detect(card);
      const preview = card.getContentAsText().substring(0, 100);
      const size = card.getContent().length;
      
      return `
        <div class="mcard-item" onclick="window.mcardManager.viewCard('${card.hash}')">
          <div class="mcard-item-header">
            <span class="mcard-type-badge">${typeInfo.displayName}</span>
            <span class="mcard-hash-short">${card.hash.substring(0, 12)}...</span>
          </div>
          <div class="mcard-item-preview">${preview}${preview.length >= 100 ? '...' : ''}</div>
          <div class="mcard-item-footer">
            <span class="mcard-size">${UIComponents.formatBytes(size)}</span>
            <span class="mcard-time">${new Date(card.g_time).toLocaleDateString()}</span>
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
}
