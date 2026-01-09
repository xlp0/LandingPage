# @pkc/markdown-renderer

Markdown renderer with LaTeX math support for browser environments.

## Installation

```bash
npm install @pkc/core @pkc/markdown-renderer katex
```

Note: KaTeX must be installed as a peer dependency.

## Features

- **Markdown Rendering**: Full markdown support
- **LaTeX Math**: Inline and display math equations using KaTeX
- **Obsidian Compatible**: Works with Obsidian-style `$...$` syntax
- **Browser Optimized**: Lightweight, browser-focused implementation

## Usage

```javascript
import { PKC } from '@pkc/core';
import MarkdownRenderer from '@pkc/markdown-renderer';

// Initialize with PKC
await PKC.init({
  modules: [
    {
      id: 'markdown',
      entry: () => MarkdownRenderer,
      enabled: true
    }
  ]
});

const renderer = window.pkc.modules['markdown'];

// Render markdown with LaTeX
const html = await renderer.render(`
# Hello World

Einstein's formula: $E = mc^2$

Display equation:

$$
\\int_0^\\infty f(x) dx
$$
`);

document.getElementById('content').innerHTML = html;
```

## Supported Syntax

### Inline Math
```markdown
The formula $E = mc^2$ is famous.
```

### Display Math
```markdown
$$
\\sum_{i=1}^n i = \\frac{n(n+1)}{2}
$$
```

## License

ISC
