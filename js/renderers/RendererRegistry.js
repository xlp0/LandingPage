/**
 * Renderer Registry
 * 
 * Central registry for all content renderers.
 * Manages renderer instances and routes content to the appropriate renderer based on type.
 */

import { MarkdownRenderer } from './MarkdownRenderer.js';
import { ImageRenderer } from './ImageRenderer.js';
import { TextRenderer } from './TextRenderer.js';
import { PDFRenderer } from './PDFRenderer.js';
import { CLMRenderer } from './CLMRenderer.js?v=2';
import { LatexRenderer } from './LatexRenderer.js';
import { AudioRenderer } from './AudioRenderer.js';
import { VideoRenderer } from './VideoRenderer.js';
import { EmbedRenderer } from './EmbedRenderer.js';

export class RendererRegistry {
  constructor() {
    this.renderers = new Map();
    this.initialized = false;
  }

  /**
   * Initialize all renderers
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Register all available renderers
      this.register(new CLMRenderer());
      this.register(new MarkdownRenderer());
      this.register(new LatexRenderer());
      this.register(new ImageRenderer());
      this.register(new TextRenderer());
      this.register(new PDFRenderer());
      this.register(new AudioRenderer());
      this.register(new VideoRenderer());
      this.register(new EmbedRenderer());

      this.initialized = true;
      console.log('[RendererRegistry] Initialized with renderers:', Array.from(this.renderers.keys()));
    } catch (error) {
      console.error('[RendererRegistry] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Register a renderer
   * @param {BaseRenderer} renderer - Renderer instance
   */
  register(renderer) {
    if (!renderer || !renderer.contentType) {
      throw new Error('Invalid renderer: must have contentType property');
    }

    this.renderers.set(renderer.contentType, renderer);
    console.log(`[RendererRegistry] Registered renderer for: ${renderer.contentType}`);
  }

  /**
   * Get renderer for content type
   * @param {string} contentType - Content type
   * @returns {BaseRenderer|null}
   */
  getRenderer(contentType) {
    return this.renderers.get(contentType) || null;
  }

  /**
   * Check if renderer exists for content type
   * @param {string} contentType - Content type
   * @returns {boolean}
   */
  hasRenderer(contentType) {
    return this.renderers.has(contentType);
  }

  /**
   * Render content using appropriate renderer
   * @param {string} contentType - Content type
   * @param {*} content - Content to render
   * @param {Object} options - Rendering options
   * @returns {Promise<string>} - Rendered HTML
   */
  async render(contentType, content, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const renderer = this.getRenderer(contentType);

    if (!renderer) {
      console.warn(`[RendererRegistry] No renderer found for type: ${contentType}`);
      // Fallback to text renderer
      const textRenderer = this.getRenderer('text');
      if (textRenderer) {
        return await textRenderer.render(
          typeof content === 'string' ? content : JSON.stringify(content, null, 2),
          { ...options, fileName: options.fileName || `unknown.${contentType}` }
        );
      }
      throw new Error(`No renderer available for content type: ${contentType}`);
    }

    try {
      return await renderer.render(content, options);
    } catch (error) {
      console.error(`[RendererRegistry] Render error for ${contentType}:`, error);
      throw error;
    }
  }

  /**
   * Get all registered content types
   * @returns {Array<string>}
   */
  getRegisteredTypes() {
    return Array.from(this.renderers.keys());
  }

  /**
   * Get renderer metadata
   * @param {string} contentType - Content type
   * @returns {Object|null}
   */
  getRendererMetadata(contentType) {
    const renderer = this.getRenderer(contentType);
    return renderer ? renderer.getMetadata() : null;
  }

  /**
   * Unregister a renderer
   * @param {string} contentType - Content type
   */
  unregister(contentType) {
    this.renderers.delete(contentType);
    console.log(`[RendererRegistry] Unregistered renderer for: ${contentType}`);
  }

  /**
   * Clear all renderers
   */
  clear() {
    this.renderers.clear();
    this.initialized = false;
    console.log('[RendererRegistry] Cleared all renderers');
  }
}

// Create singleton instance
const rendererRegistry = new RendererRegistry();

// Export singleton
export default rendererRegistry;

// Also export class for testing
export { RendererRegistry as RendererRegistryClass };
