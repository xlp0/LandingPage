// PKC Module: tikz-renderer (client-side)
// Purpose: High-quality TikZ diagram rendering in browser without external dependencies
// Supports: Advanced tikzcd commutative diagrams with proper styling

class TikZRenderer {
    constructor() {
        this.nodeCounter = 0;
        this.arrowIdCounter = 0;
    }

    // Main rendering function
    render(code) {
        console.log('TikZRenderer.render() called with:', code);
        
        try {
            // Check if this is already just the content (no begin/end tags)
            if (!code.includes('\\begin{tikzcd}')) {
                console.log('Rendering as TikZ-CD content (no begin/end tags)');
                return this.renderTikZCD(code);
            }
            
            // Extract tikzcd content if present
            const tikzcdMatch = code.match(/\\begin{tikzcd}([\s\S]*?)\\end{tikzcd}/);
            console.log('TikZ-CD match:', tikzcdMatch);
            
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

    // Render TikZ-CD commutative diagrams with high quality
    renderTikZCD(content) {
        const lines = content.trim().split('\\\\').map(line => line.trim());

        // Parse the grid more carefully
        const grid = [];
        let maxCols = 0;

        for (let line of lines) {
            if (line.trim()) {
                // Split by & but be careful with nested braces
                const cells = this.splitTikZCells(line);
                grid.push(cells);
                maxCols = Math.max(maxCols, cells.length);
            }
        }

        const rows = grid.length;
        const cols = maxCols;

        // Calculate dimensions
        const cellWidth = 140;
        const cellHeight = 100;
        const margin = 40;

        const svgWidth = cols * cellWidth + 2 * margin;
        const svgHeight = rows * cellHeight + 2 * margin;

        let svg = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" style="background: white; font-family: 'Computer Modern', 'Latin Modern Roman', serif;">`;

        // Add arrow markers
        svg += this.createArrowMarkers();

        // Draw grid and content
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < grid[row].length; col++) {
                const cell = grid[row][col];
                const x = margin + col * cellWidth + cellWidth / 2;
                const y = margin + row * cellHeight + cellHeight / 2;

                // Draw node text (remove arrows for display)
                const cleanText = this.extractNodeText(cell);
                if (cleanText) {
                    // Draw background circle for nodes
                    svg += `<circle cx="${x}" cy="${y}" r="22" fill="#f8f9fa" stroke="#6c757d" stroke-width="1.5"/>`;
                    svg += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-size="16" fill="#495057" font-weight="500">${this.escapeXml(cleanText)}</text>`;
                }

                // Draw arrows
                const arrows = this.extractArrows(cell);
                for (const arrow of arrows) {
                    const arrowSvg = this.renderArrow(arrow, row, col, x, y, cellWidth, cellHeight, margin);
                    if (arrowSvg) svg += arrowSvg;
                }
            }
        }

        svg += '</svg>';
        return svg;
    }

    // Split TikZ cells properly handling nested braces
    splitTikZCells(line) {
        const cells = [];
        let current = '';
        let braceLevel = 0;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '{') braceLevel++;
            else if (char === '}') braceLevel--;

            if (char === '&' && braceLevel === 0) {
                cells.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        if (current.trim()) cells.push(current.trim());
        return cells;
    }

    // Extract node text (removing arrows)
    extractNodeText(cell) {
        // Remove arrow commands and their arguments
        return cell.replace(/\\arrow\[[^\]]*\]/g, '').trim();
    }

    // Extract arrows from cell
    extractArrows(cell) {
        const arrows = [];
        const arrowRegex = /\\arrow\[([^\]]*)\]/g;
        let match;

        while ((match = arrowRegex.exec(cell)) !== null) {
            arrows.push(this.parseArrowSpec(match[1]));
        }

        return arrows;
    }

    // Parse arrow specification
    parseArrowSpec(spec) {
        const arrow = {
            direction: 'r', // default
            style: '',
            label: '',
            labelPos: '',
            tail: '',
            head: ''
        };

        // Parse direction
        if (spec.includes('r')) arrow.direction = 'r';
        else if (spec.includes('l')) arrow.direction = 'l';
        else if (spec.includes('d')) arrow.direction = 'd';
        else if (spec.includes('u')) arrow.direction = 'u';
        else if (spec.includes('rd')) arrow.direction = 'rd';
        else if (spec.includes('ru')) arrow.direction = 'ru';
        else if (spec.includes('ld')) arrow.direction = 'ld';
        else if (spec.includes('lu')) arrow.direction = 'lu';

        // Parse label (content in quotes or braces)
        const labelMatch = spec.match(/["']([^"']*)["']|\{([^}]*)\}/);
        if (labelMatch) {
            arrow.label = labelMatch[1] || labelMatch[2];
        }

        // Parse label position
        if (spec.includes('swap')) arrow.labelPos = 'swap';
        else if (spec.includes('left')) arrow.labelPos = 'left';
        else if (spec.includes('right')) arrow.labelPos = 'right';

        // Parse arrow style
        if (spec.includes('hook')) arrow.style = 'hook';
        else if (spec.includes('tail')) arrow.style = 'tail';
        else if (spec.includes('two heads')) arrow.style = 'two heads';
        else if (spec.includes('no head')) arrow.style = 'no head';
        else if (spec.includes('dash')) arrow.style = 'dash';

        return arrow;
    }

    // Render a single arrow
    renderArrow(arrow, row, col, x, y, cellWidth, cellHeight, margin) {
        const arrowId = `arrow-${this.arrowIdCounter++}`;

        // Calculate target position based on direction
        let targetX = x;
        let targetY = y;

        switch (arrow.direction) {
            case 'r':
                targetX = x + cellWidth;
                break;
            case 'l':
                targetX = x - cellWidth;
                break;
            case 'd':
                targetY = y + cellHeight;
                break;
            case 'u':
                targetY = y - cellHeight;
                break;
            case 'rd':
                targetX = x + cellWidth;
                targetY = y + cellHeight;
                break;
            case 'ru':
                targetX = x + cellWidth;
                targetY = y - cellHeight;
                break;
            case 'ld':
                targetX = x - cellWidth;
                targetY = y + cellHeight;
                break;
            case 'lu':
                targetX = x - cellWidth;
                targetY = y - cellHeight;
                break;
        }

        // Create curved path for diagonal arrows
        let pathData;
        if (['rd', 'ru', 'ld', 'lu'].includes(arrow.direction)) {
            // Create a smooth curve for diagonal arrows
            const midX = (x + targetX) / 2;
            const midY = (y + targetY) / 2;
            pathData = `M ${x} ${y} Q ${midX} ${y} ${midX} ${midY} Q ${targetX} ${midY} ${targetX} ${targetY}`;
        } else {
            pathData = `M ${x} ${y} L ${targetX} ${targetY}`;
        }

        // Determine marker based on arrow style
        let markerEnd = 'url(#arrowhead)';
        if (arrow.style === 'no head') markerEnd = 'none';
        else if (arrow.style === 'two heads') markerEnd = 'url(#arrowhead) url(#arrowhead)';

        let strokeDash = '';
        if (arrow.style === 'dash') strokeDash = 'stroke-dasharray="5,5"';

        // Draw the arrow path
        let svg = `<path d="${pathData}" stroke="#495057" stroke-width="2" fill="none" marker-end="${markerEnd}" ${strokeDash} id="${arrowId}"/>`;

        // Add label if present
        if (arrow.label) {
            const labelPos = this.calculateLabelPosition(x, y, targetX, targetY, arrow.labelPos);
            svg += `<text x="${labelPos.x}" y="${labelPos.y}" text-anchor="middle" dominant-baseline="middle" font-size="14" fill="#495057">${this.escapeXml(arrow.label)}</text>`;
        }

        return svg;
    }

    // Calculate label position
    calculateLabelPosition(x1, y1, x2, y2, pos) {
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        // Default position slightly above the line
        let offsetX = 0;
        let offsetY = -8;

        if (pos === 'swap') {
            offsetY = 8; // below the line
        } else if (pos === 'left') {
            offsetX = -10;
            offsetY = 0;
        } else if (pos === 'right') {
            offsetX = 10;
            offsetY = 0;
        }

        return { x: midX + offsetX, y: midY + offsetY };
    }

    // Create SVG arrow markers
    createArrowMarkers() {
        return `
        <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto" markerUnits="strokeWidth">
                <polygon points="0 0, 10 3.5, 0 7" fill="#495057"/>
            </marker>
            <marker id="arrowhead-reverse" markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto" markerUnits="strokeWidth">
                <polygon points="10 0, 0 3.5, 10 7" fill="#495057"/>
            </marker>
        </defs>`;
    }

    // Placeholder for full TikZ (not implemented yet)
    renderTikZPlaceholder(code) {
        return `<div style="background: #f7fafc; padding: 2rem; border-radius: 8px; border: 2px dashed #667eea; text-align: center;">
            <div style="color: #667eea; font-weight: bold; margin-bottom: 1rem; font-size: 1.2rem;">Full TikZ Diagram (Not Yet Supported)</div>
            <div style="background: #2d3748; color: #e2e8f0; padding: 1.5rem; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 0.9rem; overflow-x: auto; max-width: 100%; margin: 0 auto;">
                <pre style="margin: 0; white-space: pre-wrap;">${this.escapeHtml(code)}</pre>
            </div>
            <div style="margin-top: 1rem; font-size: 0.8rem; color: #666;">
                Currently only TikZ-CD commutative diagrams are supported with high-quality rendering
            </div>
        </div>`;
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

// Ensure TikZRenderer is available globally
if (typeof window !== 'undefined') {
    window.TikZRenderer = TikZRenderer;
    console.log('TikZRenderer class loaded and assigned to window');
}
