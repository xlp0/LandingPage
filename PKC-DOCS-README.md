# PKC Design Documents Viewer

## Overview
This is a web-based viewer for the PKC (Personal Knowledge Container) design documentation with support for markdown rendering and mermaid diagrams.

## Files Structure

```
c:\inetpub\wwwroot\
├── pkc-docs-index.html          # Main landing page with document cards
├── pkc-viewer.html              # Dynamic markdown viewer with mermaid support
├── PKC-DOCS-README.md           # This file
└── pkc-docs\                    # Markdown files directory
    ├── web.config               # IIS configuration for markdown MIME types
    ├── MVP Cards Design Rationale.md
    ├── PKC as the Network.md
    ├── Personal Knowledge Container.md
    └── Yoneda Arithmetic.md
```

## Features

### 1. Modern Landing Page (`pkc-docs-index.html`)
- Beautiful gradient design with card-based navigation
- Individual cards for each document with descriptions
- File size indicators
- Responsive layout that works on all devices
- Direct links to viewer for each document

### 2. Markdown Viewer (`pkc-viewer.html`)
- **Full Markdown Support**: Renders all standard markdown including:
  - Headers, lists, tables
  - Code blocks with syntax highlighting
  - Blockquotes and inline code
  - Images and links
  
- **LaTeX Math Support**: Renders mathematical equations using KaTeX:
  - **Inline math**: `$equation$` - renders inline like $E = mc^2$
  - **Display math**: `$$equation$$` - renders centered on new line
  - Supports full LaTeX syntax including:
    - Greek letters (α, β, γ, etc.)
    - Fractions, superscripts, subscripts
    - Integrals, summations, limits
    - Matrices and arrays
    - All standard mathematical symbols
  
- **Mermaid Diagram Support**: Automatically renders mermaid diagrams including:
  - Flowcharts
  - Sequence diagrams
  - Class diagrams
  - State diagrams
  - And all other mermaid diagram types

- **Beautiful UI**:
  - Sticky navigation header
  - Clean typography
  - Color-coded elements
  - Responsive design
  
- **Document Metadata**: Displays frontmatter information (title, authors, dates, etc.)

## How to Use

### Accessing the Documents

1. **Start from the index page**:
   ```
   http://localhost/pkc-docs-index.html
   ```

2. **Click any document card** to open it in the viewer

3. **Use the "Back to Index" button** to return to the main page

### Direct Access to Specific Documents

You can also link directly to any document:

```
http://localhost/pkc-viewer.html?doc=MVP%20Cards%20Design%20Rationale.md
http://localhost/pkc-viewer.html?doc=PKC%20as%20the%20Network.md
http://localhost/pkc-viewer.html?doc=Personal%20Knowledge%20Container.md
http://localhost/pkc-viewer.html?doc=Yoneda%20Arithmetic.md
```

## Technical Details

### Libraries Used

1. **Marked.js** (v11.0.0)
   - Converts markdown to HTML
   - Handles code blocks and tables

2. **KaTeX** (v0.16.9)
   - Fast LaTeX math rendering
   - Supports full LaTeX syntax
   - Inline and display modes

3. **Mermaid.js** (v10)
   - Renders mermaid diagrams
   - Supports all diagram types

4. **Highlight.js** (v11.9.0)
   - Syntax highlighting for code blocks
   - Multiple language support

### Browser Compatibility

Works in all modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

### IIS Configuration

The `web.config` file in the `pkc-docs` folder ensures:
- Markdown files are served with correct MIME type (`text/markdown`)
- CORS headers are enabled for local development
- Static content is properly configured

## Customization

### Changing Colors

Edit the CSS in `pkc-docs-index.html` or `pkc-viewer.html`:

```css
/* Main gradient colors */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Card hover colors */
.doc-card:hover {
    transform: translateY(-8px);
}
```

### Adding More Documents

1. Copy markdown files to `c:\inetpub\wwwroot\pkc-docs\`
2. Add a new card in `pkc-docs-index.html`:

```html
<a href="pkc-viewer.html?doc=Your%20New%20Document.md" class="doc-card">
    <div class="icon">📄</div>
    <h2>Your Document Title</h2>
    <p>Document description here</p>
    <div class="meta">
        <span class="size">XX KB</span>
        <span class="view-btn">View Document →</span>
    </div>
</a>
```

## Troubleshooting

### Document Not Loading

1. **Check file exists**: Verify the markdown file is in `c:\inetpub\wwwroot\pkc-docs\`
2. **Check filename**: Ensure the filename matches exactly (case-sensitive)
3. **Check IIS**: Make sure IIS is running and serving files from wwwroot
4. **Browser console**: Open developer tools (F12) to see any errors

### Mermaid Diagrams Not Rendering

1. **Check syntax**: Verify mermaid diagram syntax is correct
2. **Network connection**: Mermaid.js is loaded from CDN
3. **Browser console**: Check for JavaScript errors

### Styling Issues

1. **Clear cache**: Hard refresh (Ctrl+F5) to clear browser cache
2. **Check CSS**: Verify no conflicting styles from other files

## Source Files Location

Original markdown files are stored at:
```
z:\PKC_DESIGN_PackagedMDs\
```

These files are copied to the web server directory for serving.

## Updates

To update the documents:

1. Edit the original files in `z:\PKC_DESIGN_PackagedMDs\`
2. Copy updated files to `c:\inetpub\wwwroot\pkc-docs\`

Or use PowerShell:

```powershell
Copy-Item "z:\PKC_DESIGN_PackagedMDs\*.md" -Destination "c:\inetpub\wwwroot\pkc-docs\" -Force
```

## LaTeX Math Examples

The viewer supports Obsidian-compatible LaTeX syntax:

### Inline Math
Use single dollar signs for inline equations:
```markdown
The equation $E = mc^2$ is Einstein's famous formula.
```

### Display Math
Use double dollar signs for centered equations:
```markdown
$$
\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right) \times V
$$
```

### Common LaTeX Patterns
- **Greek letters**: `$\alpha, \beta, \gamma$` → α, β, γ
- **Fractions**: `$\frac{a}{b}$` → a/b
- **Superscripts**: `$x^2$` → x²
- **Subscripts**: `$x_i$` → xᵢ
- **Integrals**: `$\int_0^\infty f(x) dx$`
- **Summations**: `$\sum_{i=1}^n i$`
- **Matrices**: `$\begin{bmatrix} a & b \\ c & d \end{bmatrix}$`

See the **LaTeX Rendering Test** document for comprehensive examples.

## Credits

- **Markdown Rendering**: Marked.js
- **LaTeX Math**: KaTeX
- **Diagram Rendering**: Mermaid.js
- **Code Highlighting**: Highlight.js
- **Design**: Custom CSS with gradient backgrounds

## License

The viewer interface is provided as-is for viewing PKC design documentation.

---

**Last Updated**: November 5, 2025
**Version**: 1.0
