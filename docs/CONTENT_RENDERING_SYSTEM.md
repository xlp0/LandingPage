# Content Rendering System

## Overview

A comprehensive content rendering system for MCard Manager that supports multiple content types with Redux state management and handle-based hyperlinks for content-addressable navigation.

## Architecture

### 1. Redux Integration

The content rendering system integrates with the existing Redux store at `/js/redux/store.js`:

```javascript
// Added to existing store
import contentRendererReducer from './slices/content-renderer-slice.js';

const store = configureStore({
  reducer: {
    clm: clmReducer,
    auth: authReducer,
    cubicModels: cubicModelsReducer,
    contentRenderer: contentRendererReducer, // NEW
  }
});
```

### 2. Content Renderer Slice

**Location:** `/js/redux/slices/content-renderer-slice.js`

**Features:**
- **Type Detection**: Automatic content type detection from MIME type and file extension
- **Rendering State**: Manages rendering status, errors, and current content
- **Handle Extraction**: Extracts content-addressable hyperlinks from markdown
- **Navigation History**: Back/forward navigation through rendered content
- **Settings**: Configurable rendering options

**Supported Content Types:**
- `markdown` - Markdown with handle support
- `image` - JPEG, PNG, GIF, WebP, SVG
- `video` - MP4, WebM, OGG
- `audio` - MP3, WAV, OGG
- `pdf` - PDF documents
- `text` - Plain text
- `json` - JSON data
- `html` - HTML content
- `code` - Source code with syntax highlighting

**Async Thunks:**

```javascript
// Render content with type detection
dispatch(renderContent({
  hash: 'abc123...',
  content: '# Hello World',
  mimeType: 'text/markdown',
  fileName: 'hello.md'
}));

// Extract handles from markdown
dispatch(extractHandles({
  content: 'See [[hash123|My Document]]',
  hash: 'current-hash'
}));
```

**Selectors:**
```javascript
selectCurrentContent(state)
selectCurrentType(state)
selectCurrentHash(state)
selectIsRendering(state)
selectHandles(state)
selectCanNavigateBack(state)
selectCanNavigateForward(state)
```

## 3. Renderer System

### Directory Structure

```
js/renderers/
├── index.js                 # Main export
├── BaseRenderer.js          # Abstract base class
├── MarkdownRenderer.js      # Markdown with handles
├── ImageRenderer.js         # Image rendering
├── TextRenderer.js          # Plain text
├── PDFRenderer.js           # PDF documents
└── RendererRegistry.js      # Renderer management
```

### Base Renderer

All renderers extend `BaseRenderer`:

```javascript
class MyRenderer extends BaseRenderer {
  constructor() {
    super('my-content-type');
  }
  
  async render(content, options = {}) {
    // Return HTML string
    return '<div>Rendered content</div>';
  }
}
```

### Markdown Renderer

**Key Features:**

1. **GitHub Flavored Markdown** (via marked.js)
2. **Code Syntax Highlighting** (via highlight.js)
3. **Handle Support** - Content-addressable hyperlinks

**Handle Format:**

```markdown
[[hash]] - Short form (shows truncated hash)
[[hash|Label]] - With custom label
```

**Example:**

```markdown
# My Document

This references another MCard: [[a1b2c3d4e5f6...64chars|My Other Doc]]

You can also use short form: [[a1b2c3d4e5f6...64chars]]
```

**Rendered Output:**

```html
<a href="#mcard-a1b2c3d4..." 
   class="mcard-handle" 
   data-hash="a1b2c3d4..."
   title="MCard: a1b2c3d4...">
  My Other Doc
</a>
```

**Usage:**

```javascript
import { MarkdownRenderer } from './js/renderers/MarkdownRenderer.js';

const renderer = new MarkdownRenderer();
const html = await renderer.render(markdownContent, {
  enableHandles: true,
  onHandleClick: (hash) => {
    // Navigate to MCard with this hash
    viewCard(hash);
  },
  handleClass: 'mcard-handle'
});
```

### Renderer Registry

**Location:** `/js/renderers/RendererRegistry.js`

Central registry for all renderers:

```javascript
import rendererRegistry from './js/renderers/RendererRegistry.js';

// Initialize (auto-registers all renderers)
await rendererRegistry.initialize();

// Render content
const html = await rendererRegistry.render('markdown', content, {
  fileName: 'doc.md',
  enableHandles: true
});

// Check if renderer exists
if (rendererRegistry.hasRenderer('pdf')) {
  // ...
}

// Get registered types
const types = rendererRegistry.getRegisteredTypes();
// ['markdown', 'image', 'text', 'pdf']
```

## 4. Handle System

### What are Handles?

Handles are content-addressable hyperlinks that reference other MCards by their SHA-256 hash. They enable building a web of interconnected documents.

### Handle Format

```
[[<64-char-hex-hash>]]
[[<64-char-hex-hash>|<label>]]
```

### Handle Extraction

The Redux slice can extract all handles from markdown:

```javascript
const handles = await dispatch(extractHandles({
  content: markdownContent,
  hash: currentHash
}));

// Returns:
[
  {
    fullMatch: '[[abc123...|My Doc]]',
    targetHash: 'abc123...',
    label: 'My Doc',
    position: 42
  }
]
```

### Handle Navigation

When a user clicks a handle:

1. Extract the target hash from `data-hash` attribute
2. Load the MCard with that hash from IndexedDB
3. Dispatch `renderContent` with the new content
4. Update navigation history

```javascript
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('mcard-handle')) {
    e.preventDefault();
    const hash = e.target.dataset.hash;
    
    // Load and render the target MCard
    const card = await db.get(hash);
    dispatch(renderContent({
      hash: card.hash,
      content: card.content,
      mimeType: getMetadata(hash).fileType,
      fileName: getMetadata(hash).fileName
    }));
  }
});
```

## 5. Styling

**Location:** `/public/css/content-renderers.css`

Comprehensive styles for all content types:

- **Markdown**: Headers, links, code blocks, tables, blockquotes
- **Handles**: Special styling for content-addressable links
- **Images**: Responsive image containers
- **Text**: Monospace with optional line numbers
- **PDF**: Page-by-page rendering with labels
- **Code**: Syntax highlighting (VS Code dark theme)

**Include in HTML:**

```html
<link rel="stylesheet" href="/css/content-renderers.css">
```

## 6. Integration with MCard Manager

### Step 1: Import Dependencies

```javascript
// In mcard-manager.js
import store from '../js/redux/store.js';
import { renderContent, extractHandles } from '../js/redux/slices/content-renderer-slice.js';
import rendererRegistry from '../js/renderers/RendererRegistry.js';
```

### Step 2: Initialize Renderer Registry

```javascript
// On page load
async function initRenderers() {
  await rendererRegistry.initialize();
  console.log('[MCard] Renderers initialized:', 
    rendererRegistry.getRegisteredTypes());
}
```

### Step 3: Render Content in Viewer

```javascript
async function viewCard(hash) {
  try {
    const card = await db.get(hash);
    const metadata = getMetadata(hash);
    
    // Dispatch render action
    const result = await store.dispatch(renderContent({
      hash: card.hash,
      content: card.content,
      mimeType: metadata.fileType,
      fileName: metadata.fileName
    }));
    
    // Get rendered HTML
    const state = store.getState();
    const contentType = state.contentRenderer.currentType;
    
    // Render using registry
    const html = await rendererRegistry.render(
      contentType,
      card.content,
      {
        fileName: metadata.fileName,
        mimeType: metadata.fileType,
        enableHandles: true,
        onHandleClick: (targetHash) => viewCard(targetHash)
      }
    );
    
    // Display in viewer
    const viewerContent = document.getElementById('viewerContent');
    viewerContent.innerHTML = `
      <div class="rendered-content">
        ${html}
      </div>
    `;
    
    // Initialize Lucide icons
    if (window.lucide) {
      lucide.createIcons();
    }
    
    // Extract handles if markdown
    if (contentType === 'markdown') {
      await store.dispatch(extractHandles({
        content: card.content,
        hash: card.hash
      }));
    }
    
  } catch (error) {
    console.error('[MCard] View error:', error);
    showToast('Failed to render content', 'error');
  }
}
```

### Step 4: Handle Navigation

```javascript
// Add click handler for handles
document.addEventListener('click', async (e) => {
  if (e.target.classList.contains('mcard-handle')) {
    e.preventDefault();
    const targetHash = e.target.dataset.hash;
    
    if (targetHash) {
      await viewCard(targetHash);
    }
  }
});

// Add back/forward navigation
window.navigateBack = () => {
  store.dispatch(navigateBack());
  const state = store.getState();
  if (state.contentRenderer.currentHash) {
    viewCard(state.contentRenderer.currentHash);
  }
};

window.navigateForward = () => {
  store.dispatch(navigateForward());
  const state = store.getState();
  if (state.contentRenderer.currentHash) {
    viewCard(state.contentRenderer.currentHash);
  }
};
```

## 7. Example Usage

### Creating a Markdown MCard with Handles

```javascript
// Create a markdown document
const markdownContent = `
# My Research Notes

## Introduction

This document references several other MCards:

- Background: [[a1b2c3d4e5f6...64chars|Literature Review]]
- Methods: [[b2c3d4e5f6a7...64chars|Methodology]]
- Results: [[c3d4e5f6a7b8...64chars]]

## Code Example

\`\`\`javascript
console.log('Hello, MCard!');
\`\`\`

## External Links

Visit [GitHub](https://github.com) for more info.
`;

// Create MCard
const card = await MCard.create(markdownContent);
await db.put(card);

// Store metadata
storeMetadata(card.hash, {
  fileName: 'research-notes.md',
  fileType: 'text/markdown',
  fileSize: markdownContent.length
});

// Render it
await viewCard(card.hash);
```

## 8. API Reference

### Redux Actions

```javascript
// Render content
dispatch(renderContent({ hash, content, mimeType, fileName }))

// Extract handles
dispatch(extractHandles({ content, hash }))

// Navigation
dispatch(navigateBack())
dispatch(navigateForward())
dispatch(clearContent())
dispatch(clearHistory())

// Settings
dispatch(updateSettings({ enableHandles: true }))
```

### Renderer Registry

```javascript
// Initialize
await rendererRegistry.initialize()

// Render
await rendererRegistry.render(contentType, content, options)

// Check renderer
rendererRegistry.hasRenderer(contentType)

// Get renderer
const renderer = rendererRegistry.getRenderer(contentType)

// Get metadata
const meta = rendererRegistry.getRendererMetadata(contentType)

// Get types
const types = rendererRegistry.getRegisteredTypes()
```

### Markdown Renderer

```javascript
const renderer = new MarkdownRenderer();

// Render with handles
const html = await renderer.render(content, {
  enableHandles: true,
  onHandleClick: (hash) => { },
  handleClass: 'mcard-handle'
});

// Extract handles
const handles = renderer.extractHandles(content);
```

## 9. Benefits

### Content-Addressable Hyperlinks
- **Immutable References**: Links never break because they reference content by hash
- **Deduplication**: Same content = same hash = same MCard
- **Verification**: Can verify content integrity by rehashing

### Type-Based Rendering
- **Automatic Detection**: MIME type + file extension → correct renderer
- **Extensible**: Easy to add new renderers
- **Consistent**: Same rendering logic across the app

### Redux Integration
- **State Management**: Centralized rendering state
- **History**: Built-in back/forward navigation
- **Debugging**: Redux DevTools support
- **Predictable**: All state changes through actions

### Developer Experience
- **Modular**: Each renderer is independent
- **Testable**: Easy to unit test renderers
- **Documented**: Clear API and examples
- **Extensible**: Simple to add new content types

## 10. Next Steps

1. **Integrate into MCard Manager**: Update `viewCard()` function
2. **Add Navigation UI**: Back/forward buttons in viewer header
3. **Test Handle Navigation**: Create test markdown files with handles
4. **Add More Renderers**: Video, audio, JSON viewers
5. **Optimize Performance**: Lazy load renderer dependencies
6. **Add Search**: Search within rendered content
7. **Export Functionality**: Export rendered HTML

## 11. File Checklist

- ✅ `/js/redux/slices/content-renderer-slice.js` - Redux slice
- ✅ `/js/redux/store.js` - Updated with content renderer
- ✅ `/js/renderers/BaseRenderer.js` - Base class
- ✅ `/js/renderers/MarkdownRenderer.js` - Markdown + handles
- ✅ `/js/renderers/ImageRenderer.js` - Image rendering
- ✅ `/js/renderers/TextRenderer.js` - Text rendering
- ✅ `/js/renderers/PDFRenderer.js` - PDF rendering
- ✅ `/js/renderers/RendererRegistry.js` - Registry
- ✅ `/js/renderers/index.js` - Main export
- ✅ `/public/css/content-renderers.css` - Styles
- ⏳ Integration with MCard Manager (next step)

---

**Status**: Infrastructure complete, ready for integration! 🎉
