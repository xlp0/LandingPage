/**
 * Text Renderer
 * 
 * Renders plain text content with syntax highlighting for code
 */

import { BaseRenderer } from './BaseRenderer.js';

export class TextRenderer extends BaseRenderer {
  constructor() {
    super('text');
  }
  
  /**
   * Render text content to HTML
   * 
   * @param {string} content - Text content
   * @param {Object} options - Rendering options
   * @param {boolean} options.preserveWhitespace - Preserve whitespace (default: true)
   * @param {boolean} options.lineNumbers - Show line numbers (default: false)
   * @returns {Promise<string>} - Rendered HTML
   */
  async render(content, options = {}) {
    try {
      const { 
        preserveWhitespace = true, 
        lineNumbers = false,
        fileName = 'text.txt'
      } = options;
      
      const escapedContent = this.escapeHtml(content);
      const lines = escapedContent.split('\n');
      
      let html = '';
      
      if (lineNumbers) {
        html = lines.map((line, index) => {
          return `<div class="text-line"><span class="line-number">${index + 1}</span><span class="line-content">${line || ' '}</span></div>`;
        }).join('');
      } else {
        html = escapedContent;
      }
      
      return `
        <div class="text-content">
          <div class="text-header">
            <span class="text-filename">${this.escapeHtml(fileName)}</span>
            <span class="text-lines">${lines.length} lines</span>
          </div>
          <pre class="text-body ${preserveWhitespace ? 'preserve-whitespace' : ''}">${html}</pre>
        </div>
      `;
    } catch (error) {
      console.error('[TextRenderer] Render error:', error);
      throw new Error(`Failed to render text: ${error.message}`);
    }
  }
}

export default TextRenderer;
