# Polymorphic Content Rendering Pipeline

This document describes the content rendering architecture used by `LandingPage` and `MCard` display surfaces.

---

## 🎨 Overview

The content rendering system translates raw MCard payloads and documentation into rich, interactive visual representations:

```
┌────────────────────────────────────────────────────────┐
│                   Raw MCard / Payload                  │
└───────────────────────────┬────────────────────────────┘
                            │
            ┌───────────────▼───────────────┐
            │   Content Type Detector       │
            │ (MIME, Magic Bytes, Schema)   │
            └───────────────┬───────────────┘
                            │
    ┌───────────────────────┼───────────────────────┐
    │                       │                       │
┌───▼────────────┐  ┌───────▼────────────┐  ┌───────▼────────────┐
│ Markdown & Text│  │ Math & Equations   │  │ 3D & Graphics      │
│  - Marked.js   │  │  - KaTeX (fast)    │  │  - Three.js WebGL  │
│  - Code block  │  │  - MathJax (tex)   │  │  - SVG Canvas      │
└────────────────┘  └────────────────────┘  └────────────────────┘
```

---

## 🧩 Supported Renderers

1. **Markdown & Code (`js/renderers/markdown-renderer.js`)**:
   - Parses GitHub-flavored Markdown.
   - Code syntax highlighting with theme support.
2. **Mathematical Expressions (`js/renderers/math-renderer.js`)**:
   - Dual-engine fallback: fast client-side rendering with **KaTeX**, falling back to full TeX spec compliance with **MathJax 4**.
3. **Diagrams & Visualizations**:
   - Mermaid.js integration for flowchart and architecture rendering.
   - SVG vector rendering for navigational graphs and state machines.
4. **3D Theater & WebGL (`js/renderers/three-renderer.js`)**:
   - Embedded Three.js scene loader for 3D model cards and spatial data.

---

## 🔒 Security & Sanitization

- **DOMPurify**: All HTML outputs from Markdown rendering pass through strict sanitization to prevent XSS.
- **Iframe Membrane (`js/external-portal-membrane.js`)**: Untrusted external HTML and portal targets are isolated inside sandboxed `<iframe>` membranes.
