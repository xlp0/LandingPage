// PKC Module: professional-tikz-renderer (client-side)
// Purpose: Professional TikZ rendering using TikZJax WebAssembly
// Uses real TeX compilation for authentic LaTeX output

class ProfessionalTikZRenderer {
    constructor() {
        this.tikzjaxLoaded = false;
        this.loadTikZJax();
    }

    // Load TikZJax library
    async loadTikZJax() {
        try {
            console.log('Loading TikZJax...');
            
            // Try multiple CDN sources for TikZJax
            const tikzjaxSources = [
                'https://tikzjax.com/v1/fonts.css',
                'https://cdn.jsdelivr.net/npm/tikzjax@1/fonts.css'
            ];

            // Load CSS first
            let cssLoaded = false;
            for (const cssUrl of tikzjaxSources) {
                try {
                    const css = document.createElement('link');
                    css.rel = 'stylesheet';
                    css.type = 'text/css';
                    css.href = cssUrl;
                    
                    await new Promise((resolve, reject) => {
                        css.onload = resolve;
                        css.onerror = reject;
                        document.head.appendChild(css);
                    });
                    
                    console.log(`TikZJax CSS loaded from: ${cssUrl}`);
                    cssLoaded = true;
                    break;
                } catch (error) {
                    console.warn(`Failed to load TikZJax CSS from ${cssUrl}:`, error);
                }
            }

            if (!cssLoaded) {
                throw new Error('Failed to load TikZJax CSS from all sources');
            }

            // Load JavaScript
            const jsSources = [
                'https://tikzjax.com/v1/tikzjax.js',
                'https://cdn.jsdelivr.net/npm/tikzjax@1/tikzjax.js'
            ];

            let jsLoaded = false;
            for (const jsUrl of jsSources) {
                try {
                    const script = document.createElement('script');
                    script.src = jsUrl;
                    
                    await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            reject(new Error('TikZJax loading timeout'));
                        }, 10000);
                        
                        script.onload = () => {
                            clearTimeout(timeout);
                            resolve();
                        };
                        script.onerror = () => {
                            clearTimeout(timeout);
                            reject(new Error('TikZJax script load failed'));
                        };
                        document.head.appendChild(script);
                    });
                    
                    console.log(`TikZJax JS loaded from: ${jsUrl}`);
                    jsLoaded = true;
                    break;
                } catch (error) {
                    console.warn(`Failed to load TikZJax JS from ${jsUrl}:`, error);
                }
            }

            if (jsLoaded) {
                this.tikzjaxLoaded = true;
                console.log('TikZJax loaded successfully');
            } else {
                throw new Error('Failed to load TikZJax JS from all sources');
            }

        } catch (error) {
            console.error('Error loading TikZJax:', error);
            this.tikzjaxLoaded = false;
        }
    }

    // Main rendering function
    async render(code) {
        console.log('ProfessionalTikZRenderer.render() called with:', code);
        
        try {
            // Wait for TikZJax to load
            if (!this.tikzjaxLoaded) {
                await this.waitForTikZJax();
            }

            // If TikZJax failed to load, use fallback renderer
            if (!this.tikzjaxLoaded) {
                console.log('TikZJax not available, using fallback renderer');
                return this.renderWithFallback(code);
            }

            // Check if this is already just the content (no begin/end tags)
            if (!code.includes('\\begin{tikzcd}') && !code.includes('\\begin{tikzpicture}')) {
                console.log('Rendering as TikZ-CD content (no begin/end tags)');
                code = `\\begin{tikzcd}\n${code}\n\\end{tikzcd}`;
            }

            // Create a temporary script element for TikZJax to process
            const tempScript = document.createElement('script');
            tempScript.type = 'text/tikz';
            tempScript.textContent = code;
            
            // Create a container for the script
            const container = document.createElement('div');
            container.style.display = 'none';
            container.appendChild(tempScript);
            document.body.appendChild(container);

            // Wait for TikZJax to process
            await this.waitForProcessing(tempScript);

            // Get the resulting SVG
            const svg = container.querySelector('svg');
            let result = '';

            if (svg) {
                // Clone and style the SVG
                const styledSvg = svg.cloneNode(true);
                styledSvg.style.maxWidth = '100%';
                styledSvg.style.height = 'auto';
                styledSvg.style.background = 'white';
                result = styledSvg.outerHTML;
            } else {
                result = this.renderError(code, new Error('TikZJax failed to produce output'));
            }

            // Clean up
            document.body.removeChild(container);

            return result;

        } catch (error) {
            console.error('Professional TikZ rendering error:', error);
            return this.renderWithFallback(code);
        }
    }

    // Fallback renderer using our custom implementation
    renderWithFallback(code) {
        try {
            console.log('Using fallback TikZ renderer');
            
            // Import our custom renderer dynamically
            if (window.TikZRenderer) {
                const fallbackRenderer = new window.TikZRenderer();
                return fallbackRenderer.render(code);
            } else {
                return this.renderError(code, new Error('No TikZ renderer available'));
            }
        } catch (error) {
            console.error('Fallback renderer error:', error);
            return this.renderError(code, error);
        }
    }

    // Wait for TikZJax to load
    waitForTikZJax() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (this.tikzjaxLoaded || window.tikzjax) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        });
    }

    // Wait for TikZJax to process a script element
    waitForProcessing(scriptElement) {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                // Check if script has been replaced with SVG
                if (scriptElement.nextSibling && scriptElement.nextSibling.tagName === 'SVG') {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 50);
        });
    }

    // Error display
    renderError(code, error) {
        return `<div style="background: #fee; padding: 1.5rem; border: 1px solid #fcc; border-radius: 8px; color: #c33; text-align: center;">
            <div style="font-weight: bold; margin-bottom: 1rem; font-size: 1.1rem;">TikZ Rendering Error</div>
            <div style="background: #2d3748; color: #e2e8f0; padding: 1rem; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 0.9rem; overflow-x: auto; margin-bottom: 1rem;">
                <pre style="margin: 0; white-space: pre-wrap;">${this.escapeHtml(code)}</pre>
            </div>
            <div style="font-size: 0.9rem;">${error.message}</div>
        </div>`;
    }

    // Utility functions
    escapeHtml(text) {
        return text.replace(/[<>&]/g, (char) => {
            switch (char) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
            }
        });
    }
}
