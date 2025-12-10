# MCard Browser Implementation

> Simplified browser-compatible implementation following [mcard-js](https://www.npmjs.com/package/mcard-js) library patterns

## Overview

This directory contains a **lightweight browser implementation** of the MCard system that follows the API patterns and architecture of the full **mcard-js v2.1.2** library.

### Why Not Use mcard-js Directly?

The mcard-js library is designed for Node.js/TypeScript environments with full features including:
- Lambda Calculus runtime
- RAG (Retrieval-Augmented Generation)
- GraphRAG
- Multiple storage backends (SQLite, WASM)
- PTR (Polynomial Type Runtime) for multiple languages

For **browser-only deployments**, this simplified implementation provides:
- ✅ Core MCard functionality (SHA-256 hashing, content-addressable storage)
- ✅ IndexedDB storage
- ✅ Content type detection
- ✅ CLM (Cubical Logic Model) rendering and execution
- ✅ Zero build step (pure ES modules)
- ✅ Smaller bundle size

## Architecture Alignment

### API Compatibility

Our browser implementation matches the mcard-js API:

| Feature | mcard-js | Browser Implementation | Status |
|---------|----------|----------------------|--------|
| `MCard.create()` | ✅ | ✅ | **Compatible** |
| `MCard.getContent()` | ✅ | ✅ | **Compatible** |
| `MCard.getContentAsText()` | ✅ | ✅ | **Compatible** |
| `MCard.verify()` | ✅ | ✅ | **Compatible** |
| `StorageEngine.add()` | ✅ | ✅ | **Compatible** |
| `StorageEngine.get()` | ✅ | ✅ | **Compatible** |
| `StorageEngine.getPage()` | ✅ | ✅ | **Compatible** |
| `StorageEngine.searchByHash()` | ✅ | ✅ | **Compatible** |
| `ContentTypeInterpreter.detect()` | ✅ | ✅ | **Compatible** |
| PTR Runtime | ✅ | ⚠️ | **Simplified** |
| Lambda Calculus | ✅ | ❌ | **Not implemented** |
| RAG/GraphRAG | ✅ | ❌ | **Not implemented** |

### File Mapping

| Browser File | mcard-js Equivalent | Purpose |
|--------------|---------------------|---------|
| `MCard.js` | `model/MCard.ts` | Content-addressable card |
| `SimpleDB.js` | `storage/IndexedDBEngine.ts` | Browser storage |
| `ContentTypeDetector.js` | `model/detectors/ContentTypeInterpreter.ts` | Type detection |
| `MCardManager.js` | `model/CardCollection.ts` | Collection management |

## Usage

### Creating MCards

```javascript
import { MCard } from './MCard.js';

// From string
const card = await MCard.create('Hello, World!');

// From binary
const bytes = new Uint8Array([1, 2, 3]);
const card = await MCard.create(bytes);

// With metadata
const card = await MCard.create('content', {
  metadata: { author: 'Alice' }
});
```

### Storage Operations

```javascript
import { SimpleDB } from './SimpleDB.js';

const db = new SimpleDB();
await db.init();

// Add card
const hash = await db.add(card);

// Get card
const retrieved = await db.get(hash);

// Get all cards
const all = await db.getAll();

// Pagination
const page = await db.getPage(0, 20);
// { items: MCard[], total: number, page: number, pageSize: number }

// Search by hash prefix
const results = await db.searchByHash('abc123');
```

### Content Type Detection

```javascript
import { ContentTypeDetector } from './ContentTypeDetector.js';

const typeInfo = ContentTypeDetector.detect(card);
// { type: 'clm', displayName: 'CLM' }

// Categorize multiple cards
const categories = ContentTypeDetector.categorize(cards);
// { all: [], clm: [], markdown: [], text: [], ... }
```

## Migration Path

### From Browser Implementation to Full mcard-js

If you need advanced features (RAG, Lambda Calculus, multi-language PTR), migrate to the full library:

```bash
npm install mcard-js@2.1.2
```

```javascript
// Before (browser)
import { MCard } from './public/js/mcard/MCard.js';
import { SimpleDB } from './public/js/mcard/SimpleDB.js';

// After (mcard-js)
import { MCard, IndexedDBEngine } from 'mcard-js';

// API is compatible!
const card = await MCard.create('content');
const storage = new IndexedDBEngine();
await storage.init();
await storage.add(card);
```

### Bundler Setup

For production, use a bundler (Vite, Webpack) to use mcard-js in the browser:

```javascript
// vite.config.js
export default {
  resolve: {
    alias: {
      'mcard-js': 'mcard-js/dist/index.js'
    }
  }
}
```

## CLM Execution

### Current Implementation (Simplified)

```javascript
// CLMRenderer.js - Manual TypeScript stripping
stripTypeScript(code) {
  return code
    .replace(/\)\s*:\s*\w+\s*\{/g, ') {')
    .replace(/(\w+)\s*:\s*number(?=\s*[,;)\]=])/g, '$1')
    // ... more regex
}
```

### With mcard-js PTR Runtime

```javascript
import { PTRRuntime, CLMParser } from 'mcard-js';

const clm = CLMParser.parse(yamlContent);
const runtime = new PTRRuntime('javascript');
const result = await runtime.execute(clm, { input: 5 });
```

**Benefits:**
- ✅ Proper TypeScript transpilation
- ✅ Multi-language support (Python, Rust, C, WASM)
- ✅ Sandboxed execution
- ✅ Type checking
- ✅ Better error messages

## Design Principles

### 1. API Compatibility
All methods match mcard-js signatures for easy migration.

### 2. Browser-First
Uses Web APIs (crypto.subtle, IndexedDB) instead of Node.js APIs.

### 3. Zero Dependencies
No build step required for development.

### 4. Progressive Enhancement
Start simple, migrate to full library when needed.

## Testing

```javascript
// Verify hash integrity
const isValid = await card.verify();

// Test storage
const hash = await db.add(card);
const retrieved = await db.get(hash);
console.assert(retrieved.hash === hash);

// Test pagination
const page1 = await db.getPage(0, 10);
const page2 = await db.getPage(1, 10);
console.assert(page1.items.length <= 10);
```

## Performance

### Browser Implementation
- **Bundle size:** ~15KB (minified)
- **Dependencies:** 0
- **Load time:** <50ms

### Full mcard-js
- **Bundle size:** ~500KB (with all features)
- **Dependencies:** 42 packages
- **Features:** Lambda Calculus, RAG, GraphRAG, PTR

## Future Enhancements

### Planned
- [ ] WebAssembly CLM execution
- [ ] Service Worker caching
- [ ] Offline-first sync
- [ ] P2P card sharing

### Consider mcard-js for
- [ ] Server-side rendering
- [ ] Advanced type checking
- [ ] Multi-language CLM execution
- [ ] RAG/GraphRAG features
- [ ] Lambda Calculus runtime

## References

- **mcard-js npm:** https://www.npmjs.com/package/mcard-js
- **CLM Specification:** `/docs/mcard/CLM_Language_Specification_v2.md`
- **mcard-js Guide:** `/docs/mcard/how_to_use_mcard_js.md`
- **PTR Runtime:** `/docs/mcard/PTR_Runtime_Overview.md`

## License

MIT (same as mcard-js)
