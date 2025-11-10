// PKC Module: professional-tikz-renderer (client-side)
// Purpose: TikZ diagram rendering
// Uses pre-rendered professional-quality SVGs with fallback to custom renderer

class ProfessionalTikZRenderer {
    constructor() {
        this.manifest = null;
        this.loadingPromise = this.loadManifest();
        console.log('TikZ renderer initialized (pre-rendered SVGs + fallback)');
    }

    // Load diagram manifest
    async loadManifest() {
        try {
            const response = await fetch('assets/tikz-diagrams/diagram-manifest.json');
            this.manifest = await response.json();
            console.log(`✓ Loaded manifest with ${this.manifest.diagrams.length} pre-rendered diagrams`);
        } catch (error) {
            console.warn('Could not load diagram manifest, will use fallback only:', error);
            this.manifest = { diagrams: [] };
        }
    }

    // Main rendering function
    async render(code) {
        try {
            // Wait for manifest to load
            await this.loadingPromise;

            // Normalize code for matching
            const normalizedCode = code.trim().replace(/\s+/g, ' ');

            // Check if we have a pre-rendered version
            const diagram = this.manifest.diagrams.find(d => {
                const normalizedDiagramCode = d.code.replace(/\s+/g, ' ');
                return normalizedCode.includes(normalizedDiagramCode) || normalizedDiagramCode.includes(normalizedCode);
            });

            if (diagram) {
                console.log(`✓ Using pre-rendered SVG: ${diagram.file}`);
                return await this.loadPrerenderedSVG(diagram.file);
            } else {
                console.log('No pre-rendered version found, using fallback renderer');
                return this.renderWithFallback(code);
            }
        } catch (error) {
            console.error('Error in render:', error);
            return this.renderWithFallback(code);
        }
    }

    // Load pre-rendered SVG
    async loadPrerenderedSVG(filename) {
        try {
            const response = await fetch(`assets/tikz-diagrams/${filename}`);
            const svgText = await response.text();
            
            // Wrap in a container with centering
            return `<div style="text-align: center; margin: 1.5rem 0;">${svgText}</div>`;
        } catch (error) {
            console.error(`Failed to load SVG ${filename}:`, error);
            throw error; // Will trigger fallback
        }
    }

    // Fallback renderer using our custom implementation
    renderWithFallback(code) {
        try {
            console.log('Using fallback TikZ renderer');
            console.log('TikZRenderer available:', typeof window.TikZRenderer);
            
            // Import our custom renderer dynamically
            if (window.TikZRenderer) {
                const fallbackRenderer = new window.TikZRenderer();
                return fallbackRenderer.render(code);
            } else {
                console.error('window.TikZRenderer is not defined! Script may not have loaded.');
                return this.renderError(code, new Error('TikZ renderer not loaded - check script order in HTML'));
            }
        } catch (error) {
            console.error('Fallback renderer error:', error);
            return this.renderError(code, error);
        }
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
