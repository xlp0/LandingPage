// PKC Module: professional-math-renderer (client-side)
// Purpose: Professional LaTeX math rendering using KaTeX
// All dependencies (JS, CSS, fonts) loaded from local files

class ProfessionalMathRenderer {
    constructor() {
        this.katexLoaded = false;
        this.loadingPromise = this.loadKaTeX();
    }

    // Load KaTeX renderer (all local dependencies including fonts)
    async loadKaTeX() {
        try {
            // Load KaTeX CSS
            const katexCSS = document.createElement('link');
            katexCSS.rel = 'stylesheet';
            katexCSS.href = 'js/libs/katex.min.css';
            document.head.appendChild(katexCSS);

            // Load KaTeX JS
            const katexJS = document.createElement('script');
            katexJS.src = 'js/libs/katex.min.js';

            await new Promise((resolve, reject) => {
                katexJS.onload = resolve;
                katexJS.onerror = reject;
                document.head.appendChild(katexJS);
            });

            this.katexLoaded = true;
            console.log('KaTeX loaded successfully from local files');

        } catch (error) {
            console.error('Failed to load KaTeX:', error);
            throw error;
        }
    }

    // Render inline math
    async renderInlineMath(math) {
        try {
            // Wait for KaTeX to load
            await this.loadingPromise;

            // Render with KaTeX
            if (this.katexLoaded && window.katex) {
                return this.renderWithKaTeX(math, false);
            }

            // KaTeX not available - show error
            console.error('KaTeX not available');
            return `<span style="color: red; background: #fee; padding: 2px 4px; border-radius: 2px;">[KaTeX Error: ${math}]</span>`;

        } catch (error) {
            console.error('Math rendering error:', error);
            return `<span style="color: red; background: #fee; padding: 2px 4px; border-radius: 2px;">[Math Error: ${math}]</span>`;
        }
    }

    // Render display math
    async renderDisplayMath(math) {
        try {
            // Wait for KaTeX to load
            await this.loadingPromise;

            // Render with KaTeX
            if (this.katexLoaded && window.katex) {
                return this.renderWithKaTeX(math, true);
            }

            // KaTeX not available - show error
            console.error('KaTeX not available');
            return `<div style="color: red; background: #fee; padding: 1rem; border-radius: 4px; text-align: center;">[KaTeX Error: ${math}]</div>`;

        } catch (error) {
            console.error('Math rendering error:', error);
            return `<div style="color: red; background: #fee; padding: 1rem; border-radius: 4px; text-align: center;">[Math Error: ${math}]</div>`;
        }
    }

    // KaTeX rendering
    renderWithKaTeX(math, displayMode) {
        try {
            const temp = document.createElement(displayMode ? 'div' : 'span');
            katex.render(math, temp, {
                displayMode: displayMode,
                throwOnError: false,
                strict: false
            });
            
            if (displayMode) {
                return `<div style="text-align: center; margin: 1.5rem 0; overflow-x: auto;">${temp.innerHTML}</div>`;
            } else {
                return temp.innerHTML;
            }
        } catch (error) {
            console.error('KaTeX rendering error:', error);
            return displayMode ? 
                `<div style="color: red; background: #fee; padding: 1rem; border-radius: 4px; text-align: center;">[Math Error: ${math}]</div>` :
                `<span style="color: red; background: #fee; padding: 2px 4px; border-radius: 2px;">[Math Error: ${math}]</span>`;
        }
    }
}
