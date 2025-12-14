// PKC Module: LaTeX Renderer
// Purpose: Dedicated renderer for LaTeX math expressions using KaTeX
// Supports: Inline math ($...$) and display math ($$...$$)

export class LatexRenderer {
  constructor() {
    this.contentType = 'latex';
    this.katexLoaded = false;
    this.loadingPromise = null;
    console.log('[LatexRenderer] Initialized');
  }

  // Load KaTeX library
  async loadKaTeX() {
    if (this.katexLoaded) {
      console.log('[LatexRenderer] KaTeX already loaded');
      return;
    }

    if (this.loadingPromise) {
      console.log('[LatexRenderer] KaTeX loading in progress, waiting...');
      return this.loadingPromise;
    }

    console.log('[LatexRenderer] Loading KaTeX...');
    
    this.loadingPromise = (async () => {
      try {
        // Load KaTeX CSS
        if (!document.querySelector('link[href*="katex"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
          document.head.appendChild(link);
        }

        // Load KaTeX JS
        if (!window.katex) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('KaTeX failed to load'));
            document.head.appendChild(script);
          });
        }

        // Verify KaTeX is available
        if (!window.katex) {
          throw new Error('KaTeX not available after loading');
        }

        this.katexLoaded = true;
        console.log('[LatexRenderer] ✓ KaTeX loaded successfully');
      } catch (error) {
        console.error('[LatexRenderer] Failed to load KaTeX:', error);
        throw error;
      }
    })();

    return this.loadingPromise;
  }

  // Main render function
  async render(content, options = {}) {
    try {
      console.log('[LatexRenderer] Starting render...');
      
      // Load KaTeX if needed
      await this.loadKaTeX();

      if (!window.katex || !this.katexLoaded) {
        console.warn('[LatexRenderer] KaTeX not available, returning plain text');
        return `<pre>${this.escapeHtml(content)}</pre>`;
      }

      // Process the content
      let html = content;
      const mathExpressions = [];
      let mathIndex = 0;

      // First, process display math ($$...$$) - must be done before inline
      html = html.replace(/\$\$([^\$]+)\$\$/g, (match, math) => {
        console.log('[LatexRenderer] Found display math:', math.substring(0, 50) + '...');
        try {
          const rendered = katex.renderToString(math.trim(), {
            displayMode: true,
            throwOnError: false,
            strict: false,
            trust: false
          });
          const placeholder = `___LATEX_DISPLAY_${mathIndex}___`;
          mathExpressions.push({
            placeholder,
            html: `<div class="latex-display" style="text-align: center; margin: 1.5rem 0; overflow-x: auto; padding: 1rem; background: #f7fafc; border-radius: 8px;">${rendered}</div>`
          });
          mathIndex++;
          return placeholder;
        } catch (err) {
          console.error('[LatexRenderer] Display math error:', err);
          return `<div class="latex-error" style="color: #e53e3e; padding: 1rem; background: #fff5f5; border-radius: 4px; margin: 1rem 0;">Error rendering: ${this.escapeHtml(math)}</div>`;
        }
      });

      // Then, process inline math ($...$)
      html = html.replace(/\$([^\$\n]+)\$/g, (match, math) => {
        console.log('[LatexRenderer] Found inline math:', math);
        try {
          const rendered = katex.renderToString(math.trim(), {
            displayMode: false,
            throwOnError: false,
            strict: false,
            trust: false
          });
          const placeholder = `___LATEX_INLINE_${mathIndex}___`;
          mathExpressions.push({
            placeholder,
            html: `<span class="latex-inline">${rendered}</span>`
          });
          mathIndex++;
          return placeholder;
        } catch (err) {
          console.error('[LatexRenderer] Inline math error:', err);
          return `<span class="latex-error" style="color: #e53e3e;">${this.escapeHtml(math)}</span>`;
        }
      });

      // Convert line breaks to <br> for plain text parts
      html = html.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
      html = `<p>${html}</p>`;

      // Restore math expressions
      console.log(`[LatexRenderer] Restoring ${mathExpressions.length} math expressions`);
      for (const { placeholder, html: mathHtml } of mathExpressions) {
        const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedPlaceholder, 'g');
        html = html.replace(regex, mathHtml);
      }

      console.log('[LatexRenderer] ✓ Render complete');
      
      return `
        <div class="latex-content" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #2d3748;">
          ${html}
        </div>
      `;
    } catch (error) {
      console.error('[LatexRenderer] Render error:', error);
      return `
        <div class="latex-error" style="color: #e53e3e; padding: 1rem; background: #fff5f5; border-radius: 4px;">
          <strong>LaTeX Rendering Error:</strong><br>
          ${this.escapeHtml(error.message)}
        </div>
      `;
    }
  }

  // Helper to escape HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.LatexRenderer = LatexRenderer;
  console.log('[LatexRenderer] Class registered globally');
}
