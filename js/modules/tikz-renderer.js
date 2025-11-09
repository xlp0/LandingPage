// PKC Module: tikz-renderer (client-side)
// Purpose: Basic TikZ diagram rendering in browser without external dependencies
// Supports: Simple tikzcd commutative diagrams

class TikZRenderer {
    constructor() {
        this.nodeCounter = 0;
    }

    // Main rendering function
    render(code) {
        try {
            // Extract tikzcd content if present
            const tikzcdMatch = code.match(/\\begin{tikzcd}([\s\S]*?)\\end{tikzcd}/);
            if (tikzcdMatch) {
                return this.renderTikZCD(tikzcdMatch[1]);
            }

            // For now, return a placeholder for full TikZ
            return this.renderTikZPlaceholder(code);

        } catch (error) {
            console.error('TikZ rendering error:', error);
            return this.renderError(code, error);
        }
    }

    // Render TikZ-CD commutative diagrams
    renderTikZCD(content) {
        const lines = content.trim().split('\\\\').map(line => line.trim());
        const rows = lines.length;
        const cols = Math.max(...lines.map(line => line.split('&').length));

        // Parse the grid
        const grid = [];
        for (let i = 0; i < rows; i++) {
            const cells = lines[i].split('&').map(cell => cell.trim());
            grid.push(cells);
        }

        // Create SVG
        const svgWidth = cols * 120;
        const svgHeight = rows * 80;
        let svg = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" style="background: white;">`;

        // Draw nodes
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < grid[row].length; col++) {
                const cell = grid[row][col];
                const x = col * 120 + 60;
                const y = row * 80 + 40;

                // Draw node text (remove arrows for now)
                const cleanText = cell.replace(/\\arrow\[.*?\]/g, '').trim();
                if (cleanText) {
                    svg += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="serif" font-size="16">${this.escapeXml(cleanText)}</text>`;
                }
            }
        }

        // Draw arrows (simplified)
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < grid[row].length; col++) {
                const cell = grid[row][col];
                const arrowMatches = cell.match(/\\arrow\[([^\]]*)\]/g);

                if (arrowMatches) {
                    for (const arrow of arrowMatches) {
                        const direction = this.parseArrowDirection(arrow);
                        if (direction) {
                            const startX = col * 120 + 60;
                            const startY = row * 80 + 40;
                            const endX = direction.col !== undefined ? direction.col * 120 + 60 : startX;
                            const endY = direction.row !== undefined ? direction.row * 80 + 40 : startY;

                            // Draw arrow line
                            svg += `<line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="black" stroke-width="2" marker-end="url(#arrowhead)"/>`;

                            // Add arrowhead marker
                            if (!svg.includes('marker id="arrowhead"')) {
                                svg = svg.replace('<svg', '<svg><defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="black"/></marker></defs>');
                            }
                        }
                    }
                }
            }
        }

        svg += '</svg>';
        return svg;
    }

    // Parse arrow direction (simplified)
    parseArrowDirection(arrow) {
        if (arrow.includes('r')) return { col: 1 }; // right
        if (arrow.includes('l')) return { col: -1 }; // left
        if (arrow.includes('d')) return { row: 1 }; // down
        if (arrow.includes('u')) return { row: -1 }; // up
        return null;
    }

    // Placeholder for full TikZ (not implemented yet)
    renderTikZPlaceholder(code) {
        return `<div style="background: #f7fafc; padding: 1rem; border-radius: 8px; border: 2px dashed #667eea;">
            <div style="color: #667eea; font-weight: bold; margin-bottom: 0.5rem;">Full TikZ Diagram (Not Yet Supported)</div>
            <div style="background: #2d3748; color: #e2e8f0; padding: 1rem; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 0.9rem;">
                <pre style="margin: 0; white-space: pre-wrap;">${this.escapeHtml(code)}</pre>
            </div>
            <div style="margin-top: 0.5rem; font-size: 0.8rem; color: #666;">
                Currently only TikZ-CD commutative diagrams are supported
            </div>
        </div>`;
    }

    // Error display
    renderError(code, error) {
        return `<div style="background: #fee; padding: 1rem; border: 1px solid #fcc; border-radius: 4px; color: #c33;">
            <strong>TikZ Rendering Error:</strong> ${error.message}<br>
            <pre style="margin-top: 0.5rem; font-size: 0.8rem; white-space: pre-wrap;">${this.escapeHtml(code)}</pre>
        </div>`;
    }

    // Utility functions
    escapeXml(text) {
        return text.replace(/[<>&'"]/g, (char) => {
            switch (char) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case "'": return '&#39;';
                case '"': return '&quot;';
            }
        });
    }

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
