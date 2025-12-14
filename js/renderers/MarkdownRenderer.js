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
    this.mermaidLoaded = false;
    this.katexLoaded = false;
    this.tikzLoaded = false;
  }
  
  /**
   * Load marked.js library dynamically
   */
  async loadMarked() {
    if (this.markedLoaded) return;
    
    if (!window.marked) {
      console.log('[MarkdownRenderer] Loading marked.js...');
      
      // Check if already loading
      if (window.__MARKED_LOADING__) {
        await window.__MARKED_LOADING__;
        this.markedLoaded = true;
        return;
      }
      
      window.__MARKED_LOADING__ = (async () => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/marked@11.0.0/marked.min.js';
        script.id = 'marked-js';
        document.head.appendChild(script);
        
        await new Promise((resolve, reject) => {
          script.onload = () => {
            console.log('[MarkdownRenderer] marked.js loaded successfully');
            resolve();
          };
          script.onerror = (error) => {
            console.error('[MarkdownRenderer] Failed to load marked.js:', error);
            reject(new Error('Failed to load marked.js from CDN'));
          };
        });
        
        // Wait for marked to be available
        let attempts = 0;
        while (!window.marked && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (!window.marked) {
          throw new Error('marked.js loaded but window.marked not available');
        }
        
        console.log('[MarkdownRenderer] window.marked is now available');
      })();
      
      await window.__MARKED_LOADING__;
      window.__MARKED_LOADING__ = null;
    }
    
    this.markedLoaded = true;
  }
  
  /**
   * Load Mermaid.js library dynamically
   */
  async loadMermaid() {
    if (this.mermaidLoaded) return;
    
    if (!window.mermaid) {
      console.log('[MarkdownRenderer] Loading mermaid.js...');
      
      // Check if already loading
      if (window.__MERMAID_LOADING__) {
        await window.__MERMAID_LOADING__;
        this.mermaidLoaded = true;
        return;
      }
      
      window.__MERMAID_LOADING__ = (async () => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
        script.id = 'mermaid-js';
        document.head.appendChild(script);
        
        await new Promise((resolve, reject) => {
          script.onload = () => {
            console.log('[MarkdownRenderer] mermaid.js loaded successfully');
            resolve();
          };
          script.onerror = (error) => {
            console.error('[MarkdownRenderer] Failed to load mermaid.js:', error);
            reject(new Error('Failed to load mermaid.js from CDN'));
          };
        });
        
        // Wait for mermaid to be available
        let attempts = 0;
        while (!window.mermaid && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (!window.mermaid) {
          throw new Error('mermaid.js loaded but window.mermaid not available');
        }
        
        // Initialize mermaid with dark theme
        window.mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            primaryColor: '#4a9eff',
            primaryTextColor: '#fff',
            primaryBorderColor: '#3e3e42',
            lineColor: '#666',
            secondaryColor: '#2d2d30',
            tertiaryColor: '#1e1e1e'
          }
        });
        
        console.log('[MarkdownRenderer] mermaid.js initialized');
      })();
      
      await window.__MERMAID_LOADING__;
      window.__MERMAID_LOADING__ = null;
    }
    
    this.mermaidLoaded = true;
  }
  
  /**
   * Load KaTeX library for LaTeX math rendering
   */
  async loadKaTeX() {
    if (this.katexLoaded) return;
    
    if (!window.katex) {
      console.log('[MarkdownRenderer] Loading KaTeX...');
      
      // Check if already loading
      if (window.__KATEX_LOADING__) {
        await window.__KATEX_LOADING__;
        this.katexLoaded = true;
        return;
      }
      
      window.__KATEX_LOADING__ = (async () => {
        // Load KaTeX CSS
        const katexCSS = document.createElement('link');
        katexCSS.rel = 'stylesheet';
        katexCSS.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
        document.head.appendChild(katexCSS);
        
        // Load KaTeX JS
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
        script.id = 'katex-js';
        document.head.appendChild(script);
        
        await new Promise((resolve, reject) => {
          script.onload = () => {
            console.log('[MarkdownRenderer] KaTeX loaded successfully');
            resolve();
          };
          script.onerror = (error) => {
            console.error('[MarkdownRenderer] Failed to load KaTeX:', error);
            reject(new Error('Failed to load KaTeX from CDN'));
          };
        });
        
        // Wait for katex to be available
        let attempts = 0;
        while (!window.katex && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (!window.katex) {
          throw new Error('KaTeX loaded but window.katex not available');
        }
        
        console.log('[MarkdownRenderer] window.katex is now available');
      })();
      
      await window.__KATEX_LOADING__;
      window.__KATEX_LOADING__ = null;
    }
    
    this.katexLoaded = true;
  }
  
  /**
   * Load TikZ renderer modules
   */
  async loadTikZ() {
    if (this.tikzLoaded) return;
    
    console.log('[MarkdownRenderer] Loading TikZ renderer...');
    
    // Check if already loading
    if (window.__TIKZ_LOADING__) {
      await window.__TIKZ_LOADING__;
      this.tikzLoaded = true;
      return;
    }
    
    window.__TIKZ_LOADING__ = (async () => {
      try {
        // Load tikz-renderer.js (fallback renderer)
        if (!window.TikZRenderer) {
          const tikzScript = document.createElement('script');
          tikzScript.src = '/js/modules/tikz-renderer.js';
          document.head.appendChild(tikzScript);
          
          await new Promise((resolve, reject) => {
            tikzScript.onload = resolve;
            tikzScript.onerror = reject;
          });
        }
        
        // Load professional-tikz-renderer.js
        if (!window.ProfessionalTikZRenderer) {
          const profTikzScript = document.createElement('script');
          profTikzScript.src = '/js/modules/professional-tikz-renderer.js';
          document.head.appendChild(profTikzScript);
          
          await new Promise((resolve, reject) => {
            profTikzScript.onload = resolve;
            profTikzScript.onerror = reject;
          });
        }
        
        console.log('[MarkdownRenderer] TikZ renderer loaded successfully');
      } catch (error) {
        console.warn('[MarkdownRenderer] TikZ renderer unavailable:', error);
        // Continue without TikZ support
      }
    })();
    
    await window.__TIKZ_LOADING__;
    window.__TIKZ_LOADING__ = null;
    this.tikzLoaded = true;
  }
  
  /**
   * Load highlight.js library dynamically
   */
  async loadHighlight() {
    if (this.highlightLoaded) return;
    
    // If already loaded globally, just mark as loaded
    if (window.hljs) {
      this.highlightLoaded = true;
      return;
    }
    
    // Check if already loading
    if (window.__HLJS_LOADING__) {
      await window.__HLJS_LOADING__;
      this.highlightLoaded = true;
      return;
    }
    
    // Set loading flag as a promise
    window.__HLJS_LOADING__ = (async () => {
      try {
        // Load CSS only once
        if (!document.querySelector('link[href*="highlight.js"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github-dark.min.css';
          document.head.appendChild(link);
        }
        
        // Load highlight.js core (ES module version)
        if (!document.getElementById('hljs-core')) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/es/core.min.js';
          script.type = 'module';
          script.id = 'hljs-core';
          script.textContent = `
            import hljs from 'https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/es/core.min.js';
            import javascript from 'https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/es/languages/javascript.min.js';
            import python from 'https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/es/languages/python.min.js';
            import json from 'https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/es/languages/json.min.js';
            import markdown from 'https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/es/languages/markdown.min.js';
            
            hljs.registerLanguage('javascript', javascript);
            hljs.registerLanguage('python', python);
            hljs.registerLanguage('json', json);
            hljs.registerLanguage('markdown', markdown);
            
            window.hljs = hljs;
          `;
          document.head.appendChild(script);
          
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
          });
        }
        
        // Wait for hljs to be available
        let attempts = 0;
        while (!window.hljs && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (!window.hljs) {
          throw new Error('highlight.js failed to load');
        }
        
        console.log('[MarkdownRenderer] Highlight.js loaded successfully');
      } catch (error) {
        console.error('[MarkdownRenderer] Failed to load highlight.js:', error);
        throw error;
      }
    })();
    
    await window.__HLJS_LOADING__;
    window.__HLJS_LOADING__ = null; // Clear the flag
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
    
    // Custom renderer for links
    const renderer = {
      link(href, title, text) {
        // Check if it's a hash-based link (format: hash:HASH)
        if (href.startsWith('hash:')) {
          const hash = href.substring(5); // Remove 'hash:' prefix
          return `<a 
            href="#" 
            class="mcard-hash-link" 
            data-hash="${hash}" 
            title="${title || 'Navigate to MCard: ' + hash.substring(0, 12) + '...'}"
            style="
              color: #4fc3f7;
              text-decoration: none;
              border-bottom: 1px dashed #4fc3f7;
              cursor: pointer;
              transition: all 0.2s;
            "
            onmouseover="this.style.borderBottom='1px solid #4fc3f7'"
            onmouseout="this.style.borderBottom='1px dashed #4fc3f7'"
          >${text}</a>`;
        }
        
        // Check if href looks like a hash (64 hex characters)
        // This allows standard markdown: [text](HASH) without hash: prefix
        const hashPattern = /^[a-f0-9]{64}$/i;
        if (hashPattern.test(href)) {
          return `<a 
            href="#" 
            class="mcard-hash-link" 
            data-hash="${href}" 
            title="${title || 'Navigate to MCard: ' + href.substring(0, 12) + '...'}"
            style="
              color: #4fc3f7;
              text-decoration: none;
              border-bottom: 1px dashed #4fc3f7;
              cursor: pointer;
              transition: all 0.2s;
            "
            onmouseover="this.style.borderBottom='1px solid #4fc3f7'"
            onmouseout="this.style.borderBottom='1px dashed #4fc3f7'"
          >${text}</a>`;
        }
        
        // Check if it's a handle link (already processed)
        if (href.startsWith('#mcard-')) {
          return `<a href="${href}" title="${title || ''}">${text}</a>`;
        }
        
        // Add target="_blank" for external links
        if (href.startsWith('http://') || href.startsWith('https://')) {
          return `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer">${text}</a>`;
        }
        
        // Default link
        return `<a href="${href}" title="${title || ''}">${text}</a>`;
      }
    };
    
    window.marked.use({ renderer });
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
      // Load marked.js (required)
      await this.loadMarked();
      
      // Try to load mermaid.js (optional)
      try {
        await this.loadMermaid();
      } catch (mermaidError) {
        console.warn('[MarkdownRenderer] Mermaid diagrams unavailable:', mermaidError.message);
      }
      
      // Try to load KaTeX (optional)
      try {
        await this.loadKaTeX();
      } catch (katexError) {
        console.warn('[MarkdownRenderer] LaTeX math unavailable:', katexError.message);
      }
      
      // Try to load TikZ (optional)
      try {
        await this.loadTikZ();
      } catch (tikzError) {
        console.warn('[MarkdownRenderer] TikZ diagrams unavailable:', tikzError.message);
      }
      
      // Try to load highlight.js (optional - markdown works without it)
      try {
        await this.loadHighlight();
      } catch (highlightError) {
        console.warn('[MarkdownRenderer] Syntax highlighting unavailable:', highlightError.message);
        // Continue without syntax highlighting
      }
      
      const { enableHandles = true } = options;
      
      // Process handles first if enabled
      let processedContent = content;
      if (enableHandles) {
        processedContent = this.processHandles(content, options);
      }
      
      // Process LaTeX math BEFORE markdown to prevent markdown from interfering
      // Replace with placeholders that markdown won't touch
      const mathPlaceholders = [];
      let mathIndex = 0;
      
      if (window.katex && this.katexLoaded) {
        // Process display math first ($$...$$)
        processedContent = processedContent.replace(/\$\$([^\$]+)\$\$/g, (match, math) => {
          try {
            const rendered = katex.renderToString(math, {
              displayMode: true,
              throwOnError: false,
              strict: false
            });
            const placeholder = `___MATH_DISPLAY_${mathIndex}___`;
            mathPlaceholders.push({
              placeholder,
              html: `<div class="math-display" style="text-align: center; margin: 1.5rem 0; overflow-x: auto; padding: 1rem; background: #f7fafc; border-radius: 8px;">${rendered}</div>`
            });
            mathIndex++;
            return placeholder;
          } catch (err) {
            console.error('[MarkdownRenderer] KaTeX display render error:', err);
            return match;
          }
        });
        
        // Process inline math ($...$)
        processedContent = processedContent.replace(/\$([^\$\n]+)\$/g, (match, math) => {
          try {
            const rendered = katex.renderToString(math, {
              displayMode: false,
              throwOnError: false,
              strict: false
            });
            const placeholder = `___MATH_INLINE_${mathIndex}___`;
            mathPlaceholders.push({
              placeholder,
              html: `<span class="math-inline">${rendered}</span>`
            });
            mathIndex++;
            return placeholder;
          } catch (err) {
            console.error('[MarkdownRenderer] KaTeX inline render error:', err);
            return match;
          }
        });
      }
      
      // Configure marked
      this.configureMarked(options);
      
      // Render markdown
      let html = window.marked.parse(processedContent);
      
      // Debug: Log if we have placeholders to restore
      if (mathPlaceholders.length > 0) {
        console.log(`[MarkdownRenderer] Restoring ${mathPlaceholders.length} math placeholders`);
      }
      
      // Restore math placeholders with global replace to handle all occurrences
      for (const { placeholder, html: mathHtml } of mathPlaceholders) {
        // Use regex with global flag to replace all occurrences
        // Also handle cases where markdown might have wrapped it in tags
        const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedPlaceholder, 'g');
        const beforeLength = html.length;
        html = html.replace(regex, mathHtml);
        const afterLength = html.length;
        
        if (beforeLength === afterLength) {
          console.warn(`[MarkdownRenderer] Failed to replace placeholder: ${placeholder}`);
          console.log('[MarkdownRenderer] HTML snippet:', html.substring(0, 500));
        } else {
          console.log(`[MarkdownRenderer] ✓ Replaced ${placeholder}`);
        }
      }
      
      // Create a temporary container to parse HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      // Process Mermaid diagrams if available
      if (window.mermaid && this.mermaidLoaded) {
        const mermaidBlocks = tempDiv.querySelectorAll('code.language-mermaid');
        
        for (let i = 0; i < mermaidBlocks.length; i++) {
          const block = mermaidBlocks[i];
          const mermaidCode = block.textContent;
          const id = `mermaid-${Date.now()}-${i}`;
          
          try {
            // Render mermaid diagram
            const { svg } = await window.mermaid.render(id, mermaidCode);
            
            // Replace code block with rendered SVG
            const pre = block.parentElement;
            const mermaidDiv = document.createElement('div');
            mermaidDiv.className = 'mermaid-diagram';
            mermaidDiv.style.cssText = 'background: #f7fafc; padding: 2rem; border-radius: 8px; margin: 1.5rem 0; text-align: center;';
            mermaidDiv.innerHTML = svg;
            pre.replaceWith(mermaidDiv);
          } catch (err) {
            console.error('[MarkdownRenderer] Mermaid render error:', err);
            // Leave the code block as-is if rendering fails
          }
        }
      }
      
      // Process TikZ diagrams if available
      if (window.ProfessionalTikZRenderer && this.tikzLoaded) {
        const tikzBlocks = tempDiv.querySelectorAll('code.language-tikz');
        const tikzRenderer = new window.ProfessionalTikZRenderer();
        
        for (let i = 0; i < tikzBlocks.length; i++) {
          const block = tikzBlocks[i];
          const tikzCode = block.textContent;
          
          try {
            // Render TikZ diagram
            const renderedSVG = await tikzRenderer.render(tikzCode);
            
            // Replace code block with rendered SVG
            const pre = block.parentElement;
            const tikzDiv = document.createElement('div');
            tikzDiv.className = 'tikz-diagram';
            tikzDiv.style.cssText = 'background: #f7fafc; padding: 1rem; border-radius: 8px; margin: 1.5rem 0; text-align: center; overflow-x: auto;';
            tikzDiv.innerHTML = renderedSVG;
            pre.replaceWith(tikzDiv);
          } catch (err) {
            console.error('[MarkdownRenderer] TikZ render error:', err);
            // Leave the code block as-is if rendering fails
          }
        }
      }
      
      html = tempDiv.innerHTML;
      
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
