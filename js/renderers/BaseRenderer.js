/**
 * Base Renderer Class
 * 
 * Abstract base class for all content renderers.
 * Each content type (markdown, image, pdf, etc.) should extend this class.
 */

export class BaseRenderer {
  constructor(contentType) {
    if (this.constructor === BaseRenderer) {
      throw new Error('BaseRenderer is abstract and cannot be instantiated directly');
    }
    this.contentType = contentType;
  }
  
  /**
   * Render content to HTML
   * @param {string|ArrayBuffer} content - The content to render
   * @param {Object} options - Rendering options
   * @returns {Promise<string>} - HTML string
   */
  async render(content, options = {}) {
    throw new Error('render() must be implemented by subclass');
  }
  
  /**
   * Check if this renderer can handle the given content type
   * @param {string} contentType - The content type to check
   * @returns {boolean}
   */
  canRender(contentType) {
    return contentType === this.contentType;
  }
  
  /**
   * Get renderer metadata
   * @returns {Object}
   */
  getMetadata() {
    return {
      contentType: this.contentType,
      name: this.constructor.name,
      version: '1.0.0'
    };
  }
  
  /**
   * Sanitize HTML to prevent XSS
   * @param {string} html - HTML to sanitize
   * @returns {string}
   */
  sanitizeHtml(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  }
  
  /**
   * Escape HTML entities
   * @param {string} text - Text to escape
   * @returns {string}
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

export default BaseRenderer;
