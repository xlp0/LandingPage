/**
 * Embed Renderer
 * 
 * Renders embed content (iframes for Google Slides, YouTube, etc.)
 * Expects JSON content with { type: "embed", title, url, ... }
 */

import { BaseRenderer } from './BaseRenderer.js';

export class EmbedRenderer extends BaseRenderer {
  constructor() {
    super('embed');
  }

  /**
   * Render embed content to HTML
   * 
   * @param {string} content - JSON string with embed configuration
   * @param {Object} options - Rendering options
   * @returns {Promise<string>} - Rendered HTML
   */
  async render(content, options = {}) {
    try {
      const config = JSON.parse(content);
      const title = this.escapeHtml(config.title || 'Embedded Content');
      const url = config.url || '';
      const width = config.width || '100%';
      const height = config.height || '100%';
      const description = config.description ? this.escapeHtml(config.description) : '';

      if (!url) {
        return `<div style="padding: 40px; text-align: center; color: #f48771;">
          <p>No URL provided for embed</p>
        </div>`;
      }

      return `
        <div class="embed-content" style="display: flex; flex-direction: column; height: 100%; width: 100%;">
          <div class="embed-body" style="flex: 1; min-height: 0;">
            <iframe 
              src="${this.escapeHtml(url)}" 
              frameborder="0" 
              width="${width}" 
              height="${height}" 
              allowfullscreen="true" 
              mozallowfullscreen="true" 
              webkitallowfullscreen="true"
              style="border: 0; width: 100%; height: 100%; display: block;"
              loading="lazy"
            ></iframe>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('[EmbedRenderer] Render error:', error);
      throw new Error(`Failed to render embed: ${error.message}`);
    }
  }
}

export default EmbedRenderer;
