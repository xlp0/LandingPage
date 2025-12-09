/**
 * Card Viewer Component
 * Handles viewing and rendering individual cards
 */

import { ContentTypeDetector } from './ContentTypeDetector.js';
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
   * @param {MCard} card
   */
  async view(card) {
    this.currentCard = card;
    
    const viewerTitle = document.getElementById('viewerTitle');
    const viewerContent = document.getElementById('viewerContent');
    const viewerActions = document.getElementById('viewerActions');
    
    const typeInfo = ContentTypeDetector.detect(card);
    const content = card.getContentAsText();
    
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
        content: content,
        mimeType: mimeType,
        fileName: `${typeInfo.displayName}-${card.hash.substring(0, 8)}${extension}`
      }));
    } catch (error) {
      console.warn('[CardViewer] Redux dispatch failed:', error);
    }
    
    // Update title with full hash and copy button
    const contentTypeBadge = this.getContentTypeBadge(renderType);
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
          </div>
        </div>
      </div>
    `;
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
      
      if (rendererRegistry.hasRenderer(renderType)) {
        console.log('[CardViewer] Rendering with', renderType, 'renderer');
        const renderedHTML = await rendererRegistry.render(renderType, content, {
          fileName: `${typeInfo.displayName}-${card.hash.substring(0, 8)}`,
          mimeType: typeInfo.type,
          enableHandles: true,
          onHandleClick: (targetHash) => {
            window.mcardManager.viewCard(targetHash);
          }
        });
        console.log('[CardViewer] Rendered HTML length:', renderedHTML.length);
        
        // Extract handles if markdown
        if (renderType === 'markdown' && typeof content === 'string') {
          await store.dispatch(extractHandles({
            content: content,
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
        viewerContent.innerHTML = `<pre style="padding: 20px; overflow: auto;">${this.escapeHtml(content)}</pre>`;
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
   * Get content type badge HTML
   * @param {string} type
   * @returns {string}
   */
  getContentTypeBadge(type) {
    const badges = {
      'markdown': '<span style="background: #007acc; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">MD</span>',
      'text': '<span style="background: #6a9955; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">TXT</span>',
      'json': '<span style="background: #ce9178; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">JSON</span>',
      'image': '<span style="background: #4ec9b0; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">IMG</span>',
      'pdf': '<span style="background: #f48771; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">PDF</span>',
      'clm': '<span style="background: #4fc3f7; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">CLM</span>'
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
}
