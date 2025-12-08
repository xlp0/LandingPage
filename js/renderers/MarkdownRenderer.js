/**
 * Markdown Renderer with Handle Support
 * 
 * Renders markdown content with support for content-addressable hyperlinks (handles).
 * Handles are in the format: [[hash]] or [[hash|label]]
 * 
 * Uses marked.js for markdown parsing and highlight.js for code syntax highlighting.
 */

import { BaseRenderer } from './BaseRenderer.js';

export class MarkdownRenderer extends BaseRenderer {
  constructor() {
    super('markdown');
    this.markedLoaded = false;
    this.highlightLoaded = false;
  }
  
  /**
   * Load marked.js library dynamically
   */
  async loadMarked() {
    if (this.markedLoaded) return;
    
    if (!window.marked) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/marked@11.0.0/marked.min.js';
      document.head.appendChild(script);
      
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });
    }
    
    this.markedLoaded = true;
  }
  
  /**
   * Load highlight.js library dynamically
   */
  async loadHighlight() {
    if (this.highlightLoaded) return;
    
    if (!window.hljs) {
      // Load CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github-dark.min.css';
      document.head.appendChild(link);
      
      // Load JS
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/core.min.js';
      document.head.appendChild(script);
      
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });
      
      // Load common languages
      const languages = ['javascript', 'python', 'java', 'cpp', 'css', 'html', 'json', 'markdown'];
      for (const lang of languages) {
        const langScript = document.createElement('script');
        langScript.src = `https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/languages/${lang}.min.js`;
        document.head.appendChild(langScript);
        await new Promise((resolve) => {
          langScript.onload = resolve;
        });
      }
    }
    
    this.highlightLoaded = true;
  }
  
  /**
   * Process handles in markdown content
   * Converts [[hash]] or [[hash|label]] to clickable links
   * 
   * @param {string} content - Markdown content with handles
   * @param {Object} options - Rendering options
   * @returns {string} - Processed markdown with handle links
   */
  processHandles(content, options = {}) {
    const { onHandleClick = null, handleClass = 'mcard-handle' } = options;
    
    // Regex to match [[hash]] or [[hash|label]]
    const handleRegex = /\[\[([a-f0-9]{64})(?:\|([^\]]+))?\]\]/g;
    
    return content.replace(handleRegex, (match, hash, label) => {
      const displayLabel = label || `${hash.substring(0, 8)}...`;
      const dataAttr = onHandleClick ? `data-hash="${hash}"` : '';
      const href = onHandleClick ? '#' : `#mcard-${hash}`;
      
      return `<a href="${href}" class="${handleClass}" ${dataAttr} title="MCard: ${hash}">${displayLabel}</a>`;
    });
  }
  
  /**
   * Configure marked.js with custom renderer
   */
  configureMarked(options = {}) {
    const { enableHandles = true } = options;
    
    // Configure marked options
    window.marked.setOptions({
      breaks: true,
      gfm: true,
      headerIds: true,
      mangle: false,
      pedantic: false,
      sanitize: false,
      smartLists: true,
      smartypants: true,
      xhtml: false,
      highlight: (code, lang) => {
        if (window.hljs && lang && window.hljs.getLanguage(lang)) {
          try {
            return window.hljs.highlight(code, { language: lang }).value;
          } catch (err) {
            console.error('Highlight error:', err);
          }
        }
        return code;
      }
    });
    
    // Custom renderer for links if handles are enabled
    if (enableHandles) {
      const renderer = new window.marked.Renderer();
      const originalLink = renderer.link.bind(renderer);
      
      renderer.link = (href, title, text) => {
        // Check if it's a handle link (already processed)
        if (href.startsWith('#mcard-')) {
          return originalLink(href, title, text);
        }
        
        // Add target="_blank" for external links
        if (href.startsWith('http://') || href.startsWith('https://')) {
          return `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer">${text}</a>`;
        }
        
        return originalLink(href, title, text);
      };
      
      window.marked.use({ renderer });
    }
  }
  
  /**
   * Render markdown content to HTML
   * 
   * @param {string} content - Markdown content
   * @param {Object} options - Rendering options
   * @param {boolean} options.enableHandles - Enable handle processing (default: true)
   * @param {Function} options.onHandleClick - Callback for handle clicks
   * @param {string} options.handleClass - CSS class for handle links
   * @returns {Promise<string>} - Rendered HTML
   */
  async render(content, options = {}) {
    try {
      // Load dependencies
      await this.loadMarked();
      await this.loadHighlight();
      
      const { enableHandles = true } = options;
      
      // Process handles first if enabled
      let processedContent = content;
      if (enableHandles) {
        processedContent = this.processHandles(content, options);
      }
      
      // Configure marked
      this.configureMarked(options);
      
      // Render markdown
      const html = window.marked.parse(processedContent);
      
      // Wrap in container with styling
      return `
        <div class="markdown-content">
          ${html}
        </div>
      `;
    } catch (error) {
      console.error('[MarkdownRenderer] Render error:', error);
      throw new Error(`Failed to render markdown: ${error.message}`);
    }
  }
  
  /**
   * Extract all handles from markdown content
   * 
   * @param {string} content - Markdown content
   * @returns {Array} - Array of handle objects
   */
  extractHandles(content) {
    const handleRegex = /\[\[([a-f0-9]{64})(?:\|([^\]]+))?\]\]/g;
    const handles = [];
    let match;
    
    while ((match = handleRegex.exec(content)) !== null) {
      handles.push({
        fullMatch: match[0],
        hash: match[1],
        label: match[2] || null,
        position: match.index
      });
    }
    
    return handles;
  }
  
  /**
   * Get renderer metadata
   */
  getMetadata() {
    return {
      ...super.getMetadata(),
      supportedFeatures: [
        'GitHub Flavored Markdown',
        'Code syntax highlighting',
        'Content-addressable handles',
        'Tables',
        'Task lists',
        'Strikethrough',
        'Autolinks'
      ],
      handleFormat: '[[hash]] or [[hash|label]]'
    };
  }
}

export default MarkdownRenderer;
