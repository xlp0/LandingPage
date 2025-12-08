/**
 * Image Renderer
 * 
 * Renders image content (JPEG, PNG, GIF, WebP, SVG)
 */

import { BaseRenderer } from './BaseRenderer.js';

export class ImageRenderer extends BaseRenderer {
  constructor() {
    super('image');
  }
  
  /**
   * Render image content to HTML
   * 
   * @param {ArrayBuffer|string} content - Image content (ArrayBuffer or base64)
   * @param {Object} options - Rendering options
   * @param {string} options.mimeType - Image MIME type
   * @param {string} options.fileName - Original filename
   * @param {string} options.alt - Alt text for image
   * @returns {Promise<string>} - Rendered HTML
   */
  async render(content, options = {}) {
    try {
      const { mimeType = 'image/png', fileName = 'image', alt = fileName } = options;
      
      let imageUrl;
      
      // Handle Uint8Array (from MCard)
      if (content instanceof Uint8Array) {
        const blob = new Blob([content], { type: mimeType });
        imageUrl = URL.createObjectURL(blob);
      }
      // Handle ArrayBuffer
      else if (content instanceof ArrayBuffer) {
        const blob = new Blob([content], { type: mimeType });
        imageUrl = URL.createObjectURL(blob);
      }
      // Handle base64 string
      else if (typeof content === 'string' && content.startsWith('data:')) {
        imageUrl = content;
      }
      // Handle base64 without data URI prefix
      else if (typeof content === 'string') {
        imageUrl = `data:${mimeType};base64,${content}`;
      }
      else {
        throw new Error('Invalid image content format');
      }
      
      return `
        <div class="image-content">
          <div class="image-container">
            <img 
              src="${imageUrl}" 
              alt="${this.escapeHtml(alt)}"
              class="rendered-image"
              loading="lazy"
            />
          </div>
          <div class="image-info">
            <span class="image-filename">${this.escapeHtml(fileName)}</span>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('[ImageRenderer] Render error:', error);
      throw new Error(`Failed to render image: ${error.message}`);
    }
  }
}

export default ImageRenderer;
