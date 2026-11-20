/**
 * Renderers Module
 * 
 * Central export point for all content renderers and the renderer registry.
 */

export { BaseRenderer } from './BaseRenderer.js';
export { MarkdownRenderer } from './MarkdownRenderer.js';
export { ImageRenderer } from './ImageRenderer.js';
export { TextRenderer } from './TextRenderer.js';
export { PDFRenderer } from './PDFRenderer.js';
export { default as rendererRegistry, RendererRegistryClass } from './RendererRegistry.js';

// Supported content types for MCard content rendering
export const CONTENT_TYPES = Object.freeze({
  MARKDOWN: 'markdown',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  PDF: 'pdf',
  TEXT: 'text',
  JSON: 'json',
  HTML: 'html',
  CODE: 'code',
  BINARY: 'binary',
  UNKNOWN: 'unknown',
});
