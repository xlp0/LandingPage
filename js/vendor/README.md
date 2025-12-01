# Vendored Libraries

This directory contains local copies of external JavaScript libraries to ensure:
- **Offline capability**: Application works without internet connection
- **Version control**: Specific versions are locked and tracked
- **Performance**: No CDN latency or availability issues
- **Security**: No external dependencies that could be compromised

## Libraries

### Core Libraries

| Library | Version | Purpose | License |
|---------|---------|---------|---------|
| **anime.min.js** | Latest | Animation library | MIT |
| **tailwind.js** | Latest | CSS framework | MIT |
| **marked.min.js** | Latest | Markdown parser | MIT |

### Document Viewer Libraries

| Library | Version | Purpose | License |
|---------|---------|---------|---------|
| **katex/** | 0.16.9 | LaTeX math rendering | MIT |
| **mermaid/** | 10.x | Diagram rendering | MIT |
| **highlight/** | 11.9.0 | Code syntax highlighting | BSD-3-Clause |
| **tikzjax/** | 1.0 | TikZ diagram rendering | MIT |

## Updating Libraries

To update a library:

1. **Download the latest version:**
   ```bash
   # Example: Update Marked.js
   curl -L -o js/vendor/marked.min.js https://cdn.jsdelivr.net/npm/marked/marked.min.js
   ```

2. **Test thoroughly:**
   - Verify all functionality works
   - Check browser console for errors
   - Test on multiple browsers

3. **Commit the changes:**
   ```bash
   git add js/vendor/
   git commit -m "chore: Update [library name] to version [x.y.z]"
   ```

## Original CDN URLs

For reference, here are the original CDN URLs:

```html
<!-- Marked.js -->
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>

<!-- KaTeX -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>

<!-- Mermaid.js -->
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>

<!-- Highlight.js -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/github.min.css">
<script src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js"></script>

<!-- TikZJax -->
<link rel="stylesheet" type="text/css" href="https://tikzjax.com/v1/fonts.css">
<script src="https://tikzjax.com/v1/tikzjax.js"></script>
```

## File Structure

```
js/vendor/
├── README.md                    # This file
├── anime.min.js                 # Animation library
├── tailwind.js                  # CSS framework
├── marked.min.js                # Markdown parser
├── katex/
│   ├── katex.min.css           # KaTeX styles
│   ├── katex.min.js            # KaTeX core
│   └── auto-render.min.js      # Auto-rendering extension
├── mermaid/
│   └── mermaid.min.js          # Diagram rendering
├── highlight/
│   ├── github.min.css          # GitHub theme
│   └── highlight.min.js        # Syntax highlighter
└── tikzjax/
    ├── fonts.css               # TikZ fonts
    └── tikzjax.js              # TikZ to SVG compiler
```

## Notes

- All libraries are minified for production use
- Source maps are not included (add if needed for debugging)
- Libraries are loaded synchronously in the HTML head
- TikZJax includes WebAssembly binaries (loaded automatically)

## License Compliance

All vendored libraries are open source with permissive licenses (MIT, BSD-3-Clause).
See individual library repositories for full license texts.
