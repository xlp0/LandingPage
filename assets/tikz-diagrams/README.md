# Pre-Rendered TikZ Diagrams

This directory contains **pre-rendered professional-quality TikZ diagrams** generated using real LaTeX.

## Why Pre-Rendering?

**Benefits:**
- ✅ **Perfect Quality** - Authentic LaTeX output, identical to academic publications
- ✅ **Fast Loading** - No client-side compilation, instant display
- ✅ **Works Offline** - No CDN dependencies
- ✅ **Reliable** - No browser compatibility issues

**Trade-off:**
- Must regenerate SVGs when diagrams change
- Adds ~100KB total for 7 diagrams

## Workflow

### 1. Create/Edit Diagram

Edit or create a `.tex` file in this directory:

```latex
\documentclass[tikz,border=2pt]{standalone}
\usepackage{tikz-cd}
\begin{document}
\begin{tikzcd}
A \arrow[r, "f"] & B
\end{tikzcd}
\end{document}
```

### 2. Convert to SVG

Run the conversion script:

```bash
cd assets/tikz-diagrams
./convert-to-svg.sh
```

This will:
- Compile all `.tex` files using LaTeX
- Generate SVG files using dvisvgm
- Clean up intermediate files

### 3. Update Manifest

Edit `diagram-manifest.json` to add your new diagram:

```json
{
  "id": "my-diagram",
  "file": "diagram-my-diagram.svg",
  "code": "A \\arrow[r, \"f\"] & B"
}
```

The `code` field should match the TikZ-CD code in your markdown (for auto-detection).

### 4. Use in Markdown

In your markdown file:

```markdown
## My Diagram

\`\`\`tikzcd
A \arrow[r, "f"] & B
\`\`\`
```

The renderer will automatically:
1. Check if a pre-rendered SVG exists
2. If yes → Load the professional SVG
3. If no → Fall back to custom renderer

## Requirements

**For Conversion (One-time):**
- LaTeX distribution (MacTeX, TeX Live, or MiKTeX)
- `pdflatex` command
- `dvisvgm` command (usually included)

**Installation (Mac):**
```bash
brew install --cask mactex-no-gui
```

**For Viewing (Always):**
- Just a web browser
- No LaTeX needed for end users

## Current Diagrams

1. `diagram-01-simple-square.svg` - Simple commutative square
2. `diagram-02-pullback.svg` - Pullback diagram
3. `diagram-03-triangle.svg` - Triangle with natural transformation
4. `diagram-04-complex.svg` - Complex multi-arrow diagram
5. `diagram-05-pullback-math.svg` - Pullback with mathematical notation
6. `diagram-06-isomorphism.svg` - Isomorphism and identity arrows
7. `diagram-07-full-tikz.svg` - Full TikZ (beyond TikZ-CD)

## Architecture

```
Markdown File
    ↓
professional-tikz-renderer.js
    ↓
Checks diagram-manifest.json
    ↓
┌─────────────┬────────────────┐
│ Match found │ No match found │
↓             ↓                │
Load SVG      Use fallback     │
(Professional) (Basic quality) │
└─────────────┴────────────────┘
```

## File Sizes

- Each SVG: ~8-20KB
- Total for 7 diagrams: ~100KB
- Manifest JSON: ~2KB

**Result:** Professional quality with minimal overhead!
