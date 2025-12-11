# mcard-js Setup and Update Guide

## Overview

This document explains how mcard-js is integrated into the project, why we use a browser-only bundle, and how to update it in the future.

---

## Current Setup

### Version
```
mcard-js: v2.1.11
```

### Bundle Location
```
public/js/vendor/mcard-js.bundle.js (36.3KB)
```

### Import Map Configuration
```javascript
{
  "mcard-js": "http://localhost:8765/js/vendor/mcard-js.bundle.js"
}
```

The import map auto-detects the BASE_URL, so it works in any environment:
- `http://localhost:8765` → Development
- `https://dev.pkc.pub` → Staging
- `https://henry.pkc.pub` → Production

---

## Why Use a Bundle?

### The Problem with Modular mcard-js

The mcard-js library (v2.1.0+) has a modular structure with 150+ files:

```
node_modules/mcard-js/dist/
├── index.js                    # Main entry (uses bare imports)
├── model/
│   ├── MCard.js               # import './Handle'
│   ├── CardCollection.js      # import './MCard'
│   └── Handle.js              # import '../util/Loader'
├── storage/
│   ├── IndexedDBEngine.js     # Browser-safe ✅
│   ├── SqliteNodeEngine.js    # Node.js only ❌
│   └── SqliteWasmEngine.js    # Browser-safe ✅
├── util/
│   ├── FileIO.js              # import 'fs/promises' ❌
│   └── Loader.js              # import 'path' ❌
└── ... (150+ more files)
```

**Issues:**
1. **Bare imports without `.js` extensions** - Browsers require explicit extensions
2. **Node.js dependencies** - `fs`, `crypto`, `path`, `module` don't exist in browsers
3. **150+ HTTP requests** - One per module file
4. **Import map complexity** - Would need to map every internal module

---

## Our Solution: Browser-Only Bundle

### Build Entry Point

We created `build-mcard-bundle.js` that exports only browser-safe modules:

```javascript
/**
 * Browser-only bundle entry point for mcard-js
 * Excludes Node.js-specific modules
 */

// Core models (browser-safe)
export { MCard } from './node_modules/mcard-js/dist/model/MCard.js';
export { CardCollection } from './node_modules/mcard-js/dist/model/CardCollection.js';
export { ContentHandle, validateHandle, HandleValidationError } from './node_modules/mcard-js/dist/model/Handle.js';
export { GTime } from './node_modules/mcard-js/dist/model/GTime.js';
export { ContentTypeInterpreter } from './node_modules/mcard-js/dist/model/detectors/ContentTypeInterpreter.js';

// Browser storage (IndexedDB only)
export { IndexedDBEngine } from './node_modules/mcard-js/dist/storage/IndexedDBEngine.js';

// Hash utilities
export { HashValidator } from './node_modules/mcard-js/dist/hash/HashValidator.js';

// Monads (browser-safe)
export { Maybe } from './node_modules/mcard-js/dist/monads/Maybe.js';
export { Either } from './node_modules/mcard-js/dist/monads/Either.js';
export { IO } from './node_modules/mcard-js/dist/monads/IO.js';
export { Reader } from './node_modules/mcard-js/dist/monads/Reader.js';
export { Writer } from './node_modules/mcard-js/dist/monads/Writer.js';
export { State } from './node_modules/mcard-js/dist/monads/State.js';
```

### What's Included

✅ **Core Models**
- `MCard` - Content-addressed card
- `CardCollection` - Collection management
- `ContentHandle` - Mutable pointers to cards
- `GTime` - Timestamp utilities
- `ContentTypeInterpreter` - MIME type detection

✅ **Browser Storage**
- `IndexedDBEngine` - Browser-native storage

✅ **Hash Utilities**
- `HashValidator` - Content hash validation

✅ **Monads**
- `Maybe`, `Either`, `IO`, `Reader`, `Writer`, `State`

### What's Excluded

❌ **Node.js-Only Modules**
- `SqliteNodeEngine` - Requires Node.js `fs` and `better-sqlite3`
- `SqliteWasmEngine` - Could work but adds 2MB+ to bundle
- `FileIO` utilities - Requires Node.js `fs/promises`
- `Loader` utilities - Requires Node.js `path`
- PTR Node modules - Require Node.js networking

❌ **RAG Features**
- GraphRAG engine - Requires external LLM APIs
- Vector stores - Large dependencies
- Embedding providers - External services

---

## Build Process

### Build Script

Added to `package.json`:

```json
{
  "scripts": {
    "build:mcard": "esbuild build-mcard-bundle.js --bundle --format=esm --outfile=public/js/vendor/mcard-js.bundle.js --platform=browser"
  }
}
```

### Build Command

```bash
npm run build:mcard
```

### What esbuild Does

1. **Reads** `build-mcard-bundle.js`
2. **Resolves** all imports from `node_modules/mcard-js/`
3. **Bundles** all dependencies into single file
4. **Tree-shakes** unused code
5. **Outputs** `public/js/vendor/mcard-js.bundle.js`

### Build Output

```
public/js/vendor/mcard-js.bundle.js  36.3kb

⚡ Done in 9ms
```

---

## Usage in Code

### Import Syntax

Your application code uses standard ES module imports:

```javascript
import { 
  MCard, 
  CardCollection, 
  IndexedDBEngine,
  validateHandle,
  ContentTypeInterpreter 
} from 'mcard-js';
```

### How It Works

1. **Import map resolves** `'mcard-js'` → `http://localhost:8765/js/vendor/mcard-js.bundle.js`
2. **Browser loads** the bundle (single HTTP request)
3. **Bundle exports** all the modules you imported
4. **Your code** uses them normally

### Example: MCard Manager

```javascript
// public/js/mcard/MCardManager.js
import { 
  MCard, 
  CardCollection, 
  IndexedDBEngine,
  validateHandle,
  HandleValidationError,
  ContentTypeInterpreter 
} from 'mcard-js';

class MCardManager {
  constructor() {
    this.engine = new IndexedDBEngine('mcard-manager');
    this.collection = new CardCollection(this.engine);
    this.interpreter = new ContentTypeInterpreter();
  }

  async addCard(content, contentType) {
    const card = new MCard(contentType, content);
    const hash = await this.collection.add(card);
    return hash;
  }

  async createHandle(hash, handleName) {
    try {
      validateHandle(handleName);
      await this.collection.engine.registerHandle(handleName, hash);
    } catch (error) {
      if (error instanceof HandleValidationError) {
        console.error('Invalid handle:', error.message);
      }
      throw error;
    }
  }
}
```

---

## Updating mcard-js

### Step-by-Step Update Process

#### 1. Update the Package

```bash
# Check current version
npm list mcard-js

# Check latest version
npm view mcard-js version

# Update to latest
npm update mcard-js

# Or update to specific version
npm install mcard-js@2.2.0
```

#### 2. Review Changes

Check the mcard-js changelog for breaking changes:

```bash
# View package info
npm view mcard-js

# Or check GitHub releases
# https://github.com/your-org/mcard-js/releases
```

#### 3. Update Build Entry Point (if needed)

If new browser-safe modules are available, add them to `build-mcard-bundle.js`:

```javascript
// Example: New module in v2.2.0
export { NewFeature } from './node_modules/mcard-js/dist/model/NewFeature.js';
```

#### 4. Rebuild the Bundle

```bash
npm run build:mcard
```

**Expected output:**
```
public/js/vendor/mcard-js.bundle.js  XX.XKB

⚡ Done in Xms
```

#### 5. Test Locally

```bash
# Restart Docker
docker-compose restart

# Open browser
open http://localhost:8765/mcard-manager.html

# Check console for errors
# Test MCard Manager functionality
```

#### 6. Commit and Deploy

```bash
git add package.json package-lock.json build-mcard-bundle.js public/js/vendor/mcard-js.bundle.js
git commit -m "chore: Update mcard-js to vX.X.X"
git push origin main
```

---

## Troubleshooting

### Bundle Build Fails

**Error:** `Could not resolve "fs/promises"`

**Cause:** Trying to bundle Node.js-only modules

**Solution:** Exclude the problematic module from `build-mcard-bundle.js`

---

### Import Errors in Browser

**Error:** `Failed to load module script: Expected a JavaScript module script`

**Cause:** Bundle not properly built or wrong path in import map

**Solution:**
1. Rebuild bundle: `npm run build:mcard`
2. Check import map in browser console
3. Verify file exists: `ls -lh public/js/vendor/mcard-js.bundle.js`

---

### 404 Errors for mcard-js

**Error:** `GET http://localhost:8765/js/vendor/mcard-js.bundle.js 404 (Not Found)`

**Cause:** Bundle not copied to Docker container

**Solution:**
1. Rebuild Docker image: `docker-compose up --build -d`
2. Or restart container: `docker-compose restart`

---

### Outdated Bundle

**Symptom:** Code works locally but fails in Docker

**Cause:** Bundle not rebuilt after npm update

**Solution:**
```bash
npm run build:mcard
docker-compose restart
```

---

## Version History

| Version | Date | Bundle Size | Notes |
|---------|------|-------------|-------|
| 2.1.9 | Dec 9, 2025 | 31KB | Initial bundled version |
| 2.1.11 | Dec 11, 2025 | 36.3KB | Updated with browser-only bundle |

---

## Architecture Decisions

### Why Not Use Modular Imports?

**Option 1: Modular with import maps**
```javascript
// Would need 150+ import map entries
{
  "mcard-js": "/js/vendor/mcard-js/index.js",
  "mcard-js/model/MCard": "/js/vendor/mcard-js/model/MCard.js",
  "mcard-js/model/Handle": "/js/vendor/mcard-js/model/Handle.js",
  // ... 150+ more entries
}
```

**Problems:**
- ❌ 150+ HTTP requests
- ❌ Complex import map
- ❌ Node.js modules still fail
- ❌ Bare imports without .js still fail

**Option 2: Bundle (Current)**
```javascript
// Single import map entry
{
  "mcard-js": "/js/vendor/mcard-js.bundle.js"
}
```

**Benefits:**
- ✅ 1 HTTP request
- ✅ Simple import map
- ✅ No Node.js modules
- ✅ Works everywhere

---

### Why Not Use CDN?

**CDN Option:**
```html
<script type="importmap">
{
  "mcard-js": "https://cdn.jsdelivr.net/npm/mcard-js@2.1.11/+esm"
}
</script>
```

**Problems:**
- ❌ External dependency
- ❌ Privacy concerns
- ❌ Network latency
- ❌ CDN downtime risk
- ❌ Version control issues
- ❌ Doesn't work offline

**Self-Hosted (Current):**
- ✅ Full control
- ✅ Privacy preserved
- ✅ Fast local loading
- ✅ Works offline
- ✅ Version locked
- ✅ No external dependencies

---

## Best Practices

### 1. Always Rebuild Bundle After Updates

```bash
npm update mcard-js && npm run build:mcard
```

### 2. Test Before Deploying

```bash
npm run build:mcard
docker-compose restart
# Test in browser
```

### 3. Commit Bundle with Package Updates

```bash
git add package.json package-lock.json public/js/vendor/mcard-js.bundle.js
git commit -m "chore: Update mcard-js to vX.X.X"
```

### 4. Document Breaking Changes

If updating causes breaking changes, document them:

```markdown
## Breaking Changes in v2.2.0
- `MCard.constructor()` signature changed
- `validateHandle()` now throws different error types
- Update your code accordingly
```

### 5. Keep Build Entry Point Updated

When new browser-safe features are added to mcard-js, add them to `build-mcard-bundle.js` to make them available.

---

## Related Documentation

- **Self-Hosted CDN:** `/docs/SELF-HOSTED-CDN.md`
- **CSS Standards:** `/docs/rules/css.md`
- **Environment Detection:** `/public/js/config/env-detector.js`
- **Auto Import Map:** `/public/js/config/auto-import-map.js`

---

## Summary

✅ **mcard-js v2.1.11** integrated with browser-only bundle
✅ **36.3KB** single-file bundle
✅ **Zero external dependencies** - fully self-hosted
✅ **Auto-detection** - works in any environment
✅ **Simple updates** - `npm update && npm run build:mcard`
✅ **No Node.js modules** - browser-safe only
✅ **Fast loading** - single HTTP request
✅ **Offline support** - all resources local

**Update process: 3 commands, 30 seconds. Deploy anywhere. 🎯✨**
