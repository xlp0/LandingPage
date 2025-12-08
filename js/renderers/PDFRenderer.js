/**
 * PDF Renderer
 * 
 * Renders PDF content using PDF.js
 */

import { BaseRenderer } from './BaseRenderer.js';

export class PDFRenderer extends BaseRenderer {
  constructor() {
    super('pdf');
    this.pdfLoaded = false;
  }
  
  /**
   * Load PDF.js library dynamically
   */
  async loadPDFJS() {
    if (this.pdfLoaded) return;
    
    if (!window.pdfjsLib) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
      document.head.appendChild(script);
      
      await new Promise((resolve, reject) => {
        script.onload = () => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
            'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
          resolve();
        };
        script.onerror = reject;
      });
    }
    
    this.pdfLoaded = true;
  }
  
  /**
   * Render PDF content to HTML
   * 
   * @param {ArrayBuffer} content - PDF content as ArrayBuffer
   * @param {Object} options - Rendering options
   * @param {number} options.scale - Render scale (default: 1.5)
   * @param {number} options.maxPages - Maximum pages to render (default: 10)
   * @returns {Promise<string>} - Rendered HTML
   */
  async render(content, options = {}) {
    try {
      const { fileName = 'document.pdf' } = options;
      
      // Create unique ID for this PDF
      const pdfId = `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Return placeholder HTML - actual rendering happens after DOM insertion
      const html = `
        <div class="pdf-content" id="${pdfId}" data-pdf-content="${pdfId}">
          <div class="pdf-header">
            <span class="pdf-filename">${this.escapeHtml(fileName)}</span>
            <span class="pdf-status">Click to load PDF</span>
          </div>
          <div class="pdf-pages" id="${pdfId}-pages">
            <div class="pdf-placeholder">
              <i data-lucide="file-text" style="width: 64px; height: 64px;"></i>
              <p>PDF Document</p>
              <button class="btn" onclick="window.loadPDF('${pdfId}')">
                <i data-lucide="eye" style="width: 16px; height: 16px;"></i>
                Load PDF
              </button>
            </div>
          </div>
        </div>
      `;
      
      // Store content for lazy loading
      if (!window.__PDF_CONTENT__) {
        window.__PDF_CONTENT__ = {};
      }
      window.__PDF_CONTENT__[pdfId] = { content, options };
      
      // Register load function
      window.loadPDF = async (id) => {
        const pdfData = window.__PDF_CONTENT__[id];
        if (pdfData) {
          await this.renderPDFPages(pdfData.content, id, pdfData.options);
        }
      };
      
      return html;
    } catch (error) {
      console.error('[PDFRenderer] Render error:', error);
      return `
        <div class="pdf-content error">
          <div class="pdf-header">
            <span class="pdf-filename">Error loading PDF</span>
          </div>
          <div class="pdf-error">
            <p>${this.escapeHtml(error.message)}</p>
          </div>
        </div>
      `;
    }
  }
  
  /**
   * Render PDF pages to canvas elements
   */
  async renderPDFPages(content, pdfId, options) {
    try {
      await this.loadPDFJS();
      
      const { scale = 1.5, maxPages = 10 } = options;
      
      // Load PDF document
      const loadingTask = window.pdfjsLib.getDocument({ data: content });
      const pdf = await loadingTask.promise;
      
      const container = document.getElementById(`${pdfId}-pages`);
      if (!container) return;
      
      // Update status
      const status = document.querySelector(`#${pdfId} .pdf-status`);
      if (status) {
        status.textContent = `Loading ${pdf.numPages} pages...`;
      }
      
      // Clear placeholder
      container.innerHTML = '';
      
      // Render pages
      const pagesToRender = Math.min(pdf.numPages, maxPages);
      for (let pageNum = 1; pageNum <= pagesToRender; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.className = 'pdf-page-canvas';
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Create page container
        const pageDiv = document.createElement('div');
        pageDiv.className = 'pdf-page';
        pageDiv.appendChild(canvas);
        
        // Add page number
        const pageLabel = document.createElement('div');
        pageLabel.className = 'pdf-page-label';
        pageLabel.textContent = `Page ${pageNum}`;
        pageDiv.appendChild(pageLabel);
        
        container.appendChild(pageDiv);
        
        // Render page
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
      }
      
      // Update status
      if (status) {
        status.textContent = `${pagesToRender} of ${pdf.numPages} pages`;
        if (pdf.numPages > maxPages) {
          status.textContent += ` (showing first ${maxPages})`;
        }
      }
      
      // Initialize Lucide icons
      if (window.lucide) {
        lucide.createIcons();
      }
    } catch (error) {
      console.error('[PDFRenderer] Page render error:', error);
      const container = document.getElementById(`${pdfId}-pages`);
      if (container) {
        container.innerHTML = `
          <div class="pdf-error">
            <p>Error rendering PDF: ${this.escapeHtml(error.message)}</p>
          </div>
        `;
      }
    }
  }
}

export default PDFRenderer;
