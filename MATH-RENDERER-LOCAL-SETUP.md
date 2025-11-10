# Math Renderer - Local Dependencies Setup

## Overview

The professional math renderer uses **KaTeX** exclusively. All dependencies (JS, CSS, fonts) are stored locally in `js/libs/`.

## Local Files

### KaTeX
- **JS**: `js/libs/katex.min.js` (277 KB)
- **CSS**: `js/libs/katex.min.css` (23 KB)
- **Fonts**: `js/libs/fonts/` (60 font files, ~1.2 MB total)
  - Includes KaTeX_Main, KaTeX_AMS, KaTeX_Math, KaTeX_Caligraphic, KaTeX_Fraktur, etc.
  - Multiple formats: .woff2, .woff, .ttf for browser compatibility

## Why KaTeX?

1. **Complete local setup**: All dependencies including fonts are available locally
2. **Better font rendering**: Uses dedicated font files with proper font-face declarations
3. **Fast rendering**: KaTeX is synchronous and faster than MathJax
4. **Quality**: Professional typography with complete font support
5. **Lightweight**: Smaller footprint than MathJax (~300KB vs ~1MB)

## Rendering Flow

1. **Load KaTeX**: CSS, JS, and fonts loaded on initialization
2. **Render math**: Uses KaTeX for all inline and display math
3. **Error handling**: Display error messages if KaTeX fails to load or render

## Configuration

The renderer automatically:
- Loads KaTeX CSS and JS on initialization
- Configures inline math: `$...$` or `\(...\)`
- Configures display math: `$$...$$` or `\[...\]`
- Handles errors gracefully with visual feedback

## File Structure

```
js/libs/
├── katex.min.js              # KaTeX renderer (277 KB)
├── katex.min.css             # KaTeX styles (23 KB)
└── fonts/                    # KaTeX font files (~1.2 MB)
    ├── KaTeX_AMS-Regular.woff2
    ├── KaTeX_Main-Bold.woff2
    ├── KaTeX_Math-Italic.woff2
    └── ... (60 font files total)
```

## Benefits of Local Dependencies

1. **No CDN dependency**: Works offline and in air-gapped environments
2. **Consistent rendering**: Same fonts and behavior across all environments
3. **Better performance**: No external network requests
4. **Privacy**: No external connections for math rendering
5. **Reliability**: No risk of CDN downtime or changes

## CDN Dependencies Removed

The following CDN dependencies were successfully replaced with local files:
- ❌ `https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css`
- ❌ `https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js`
- ❌ `https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/fonts/*`

✅ All replaced with local files in `js/libs/` (~1.5 MB total)
