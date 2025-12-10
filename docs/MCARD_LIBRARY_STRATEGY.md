# MCard Library Integration Strategy

> **Goal:** Use ONLY the mcard-js library for all MCard operations across the entire application

## Executive Summary

**YES! We CAN use IndexedDB with the mcard-js library! ✅**

The library provides **THREE storage engines:**

1. ✅ **IndexedDBEngine** - Browser (IndexedDB)
2. ✅ **SqliteNodeEngine** - Node.js server (SQLite)
3. ✅ **SqliteWasmEngine** - Browser (SQLite WASM)

## Our Goal

**Replace ALL custom MCard code with the mcard-js library:**

```
❌ REMOVE: Custom implementations
   - /public/js/mcard/MCard.js
   - /public/js/mcard/SimpleDB.js
   - /public/js/mcard/ContentTypeDetector.js

✅ USE: mcard-js library everywhere
   - Browser: IndexedDBEngine
   - Server: SqliteNodeEngine
```

## Architecture Plan

### Dual Storage (Browser + Server)

```
┌─────────────────────────────────────────┐
│         BROWSER (Frontend)              │
├─────────────────────────────────────────┤
│  ✅ mcard-js library                    │
│  ├── MCard.create()                     │
│  ├── IndexedDBEngine (IndexedDB)       │
│  ├── ContentTypeInterpreter             │
│  └── All library features               │
│                                         │
│  Storage: IndexedDB (local)            │
└─────────────────────────────────────────┘
                    ↕ API Sync
┌─────────────────────────────────────────┐
│       NODE.JS SERVER (Backend)          │
├─────────────────────────────────────────┤
│  ✅ mcard-js library                    │
│  ├── MCard.create()                     │
│  ├── SqliteNodeEngine (SQLite)         │
│  ├── ContentTypeInterpreter             │
│  └── All library features               │
│                                         │
│  Storage: SQLite (persistent)          │
└─────────────────────────────────────────┘
```

## Available Storage Engines

### 1. IndexedDBEngine (Browser) ✅

**Location:** `mcard-js/dist/storage/IndexedDBEngine.js`

**Usage:**
```javascript
import { MCard, IndexedDBEngine } from 'mcard-js';

// Initialize
const storage = new IndexedDBEngine('mcard-storage');
await storage.init();

// Create and store
const card = await MCard.create('Hello World');
await storage.add(card);

// Retrieve
const retrieved = await storage.get(card.hash);

// List with pagination
const page = await storage.getPage(0, 20);

// Search
const results = await storage.searchByHash('abc');
```

**Features:**
- ✅ Browser-native IndexedDB
- ✅ Offline support
- ✅ Pagination (`getPage`)
- ✅ Search (`searchByHash`, `search`)
- ✅ Content handles (PTR pointers)
- ✅ Handle history tracking
- ✅ Full CRUD operations

### 2. SqliteNodeEngine (Server) ✅

**Location:** `mcard-js/dist/storage/SqliteNodeEngine.js`

**Usage:**
```javascript
import { MCard, SqliteNodeEngine } from 'mcard-js';

// Initialize
const storage = new SqliteNodeEngine('data/mcard.db');
await storage.init();

// Same API as IndexedDBEngine
const card = await MCard.create('Hello World');
await storage.add(card);
```

**Features:**
- ✅ Server-side SQLite
- ✅ Persistent storage
- ✅ Same API as IndexedDBEngine
- ✅ Production-ready

### 3. SqliteWasmEngine (Browser) ✅

**Location:** `mcard-js/dist/storage/SqliteWasmEngine.js`

**Usage:**
```javascript
import { MCard, SqliteWasmEngine } from 'mcard-js';

// Initialize with WASM
const storage = new SqliteWasmEngine();
await storage.init();

// Same API
const card = await MCard.create('Hello World');
await storage.add(card);
```

**Features:**
- ✅ SQLite in browser via WASM
- ✅ Better performance than IndexedDB
- ✅ SQL query capabilities
- ✅ Same API as other engines

## Implementation Plan

### Phase 1: Browser Integration ✅

**Goal:** Replace custom browser code with mcard-js IndexedDBEngine

**Files to Update:**
- `/public/js/mcard-manager-new.js` - Use IndexedDBEngine
- `/public/js/renderers/CLMRenderer.js` - Use library
- Remove custom implementations

**Steps:**
1. Import `IndexedDBEngine` from mcard-js
2. Replace `SimpleDB` with `IndexedDBEngine`
3. Replace custom `MCard` with library `MCard`
4. Replace `ContentTypeDetector` with `ContentTypeInterpreter`
5. Test all functionality

**Code Example:**
```javascript
// OLD (Custom)
import { MCard } from './mcard/MCard.js';
import { SimpleDB } from './mcard/SimpleDB.js';

// NEW (Library)
import { MCard, IndexedDBEngine, ContentTypeInterpreter } from 'mcard-js';

const storage = new IndexedDBEngine('mcard-storage');
await storage.init();
```

### Phase 2: Server Integration ✅ (In Progress)

**Goal:** Use mcard-js SqliteNodeEngine in Node.js backend

**Status:** ESM conversion in progress

**Current Issue:** Library imports failing due to missing `.js` extensions

**Solution:** Fix library imports or use bundler

### Phase 3: Sync Layer

**Goal:** Sync browser IndexedDB ↔ server SQLite

**API Endpoints:**
- `POST /api/mcard/sync/push` - Upload local MCards to server
- `POST /api/mcard/sync/pull` - Download server MCards to browser
- `GET /api/mcard/sync/status` - Check sync status

**Sync Strategy:**
```javascript
// Browser syncs with server
async function syncMCards() {
  const localStorage = new IndexedDBEngine('mcard-storage');
  await localStorage.init();
  
  // Get all local MCards
  const localCards = await localStorage.getAll();
  
  // Push to server
  for (const card of localCards) {
    await fetch('/api/mcard/sync/push', {
      method: 'POST',
      body: JSON.stringify({
        hash: card.hash,
        content: card.getContentAsText()
      })
    });
  }
  
  // Pull from server
  const response = await fetch('/api/mcard/sync/pull');
  const serverCards = await response.json();
  
  // Add to local storage
  for (const cardData of serverCards) {
    const card = await MCard.create(cardData.content);
    await localStorage.add(card);
  }
}
```

## Feature Comparison

### Custom Code vs Library

| Feature | Custom Code | mcard-js Library |
|---------|-------------|------------------|
| **Core** |
| MCard creation | ✅ Basic | ✅ Full featured |
| SHA-256 hashing | ✅ | ✅ |
| Content storage | ✅ | ✅ |
| **Storage** |
| IndexedDB | ✅ Custom | ✅ IndexedDBEngine |
| SQLite (Node) | ❌ | ✅ SqliteNodeEngine |
| SQLite (WASM) | ❌ | ✅ SqliteWasmEngine |
| **Search** |
| Hash search | ✅ Basic | ✅ Advanced |
| Content search | ❌ | ✅ Full-text |
| Pagination | ✅ Basic | ✅ Full featured |
| **Advanced** |
| Content handles | ❌ | ✅ PTR pointers |
| Handle history | ❌ | ✅ Version tracking |
| Content type | ✅ Basic | ✅ ContentTypeInterpreter |
| Lambda calculus | ❌ | ✅ Full runtime |
| RAG/GraphRAG | ❌ | ✅ Vector store |
| LLM integration | ❌ | ✅ Built-in |

## Benefits of Using Library

### 1. Feature Complete ✅

**Get for free:**
- PTR (Pointer) system for content handles
- Lambda calculus runtime
- RAG and GraphRAG capabilities
- LLM integration
- Vector store
- Advanced search
- Handle versioning

### 2. Consistent API ✅

**Same API across all environments:**
```javascript
// Browser
const browserStorage = new IndexedDBEngine('db');

// Server
const serverStorage = new SqliteNodeEngine('db.sqlite');

// Both use same methods
await storage.add(card);
await storage.get(hash);
await storage.getPage(0, 20);
```

### 3. Production Ready ✅

- ✅ Well-tested
- ✅ TypeScript support
- ✅ Proper error handling
- ✅ Performance optimized
- ✅ Maintained by library authors

### 4. Future Proof ✅

- ✅ Updates and bug fixes
- ✅ New features automatically
- ✅ Community support
- ✅ Documentation

## Migration Steps

### Step 1: Fix Server Import Issues

**Current Problem:** Library imports failing

**Solutions:**

**Option A: Fix import paths**
```javascript
// Add .js extensions to library imports
import { MCard } from 'mcard-js/dist/model/MCard.js';
```

**Option B: Use bundler (Recommended)**
```bash
npm install --save-dev esbuild

# Bundle for Node.js
esbuild server/mcard-api.mjs --bundle --platform=node --outfile=dist/mcard-api.js
```

**Option C: Patch library locally**
```bash
# Add .js extensions to library files
npm install patch-package
```

### Step 2: Update Browser Code

**File:** `/public/js/mcard-manager-new.js`

```javascript
// Replace imports
import { 
  MCard, 
  IndexedDBEngine, 
  ContentTypeInterpreter 
} from 'https://cdn.jsdelivr.net/npm/mcard-js@2.1.2/+esm';

// Initialize storage
const storage = new IndexedDBEngine('mcard-storage');
await storage.init();

// Use library methods
const card = await MCard.create(content);
await storage.add(card);
```

### Step 3: Update Renderers

**File:** `/public/js/renderers/CLMRenderer.js`

```javascript
import { ContentTypeInterpreter } from 'mcard-js';

// Use library for type detection
const contentType = ContentTypeInterpreter.detect(content);
```

### Step 4: Remove Custom Code

**Delete:**
- `/public/js/mcard/MCard.js`
- `/public/js/mcard/SimpleDB.js`
- `/public/js/mcard/ContentTypeDetector.js`

**Keep:**
- `/public/js/renderers/` (UI rendering)
- `/public/js/mcard-manager-new.js` (updated to use library)

### Step 5: Test Everything

**Browser Tests:**
```javascript
// Test IndexedDBEngine
const storage = new IndexedDBEngine('test-db');
await storage.init();

// Create
const card = await MCard.create('Test content');
await storage.add(card);

// Read
const retrieved = await storage.get(card.hash);
console.assert(retrieved.hash === card.hash);

// List
const page = await storage.getPage(0, 10);
console.assert(page.items.length > 0);

// Search
const results = await storage.searchByHash(card.hash.substring(0, 8));
console.assert(results.length > 0);
```

**Server Tests:**
```javascript
// Test SqliteNodeEngine
const storage = new SqliteNodeEngine('test.db');
await storage.init();

// Same tests as browser
```

## Current Status

### ✅ What Works

- [x] Library installed (`mcard-js@2.1.2`)
- [x] Server converted to ESM
- [x] IndexedDBEngine available
- [x] SqliteNodeEngine available
- [x] API structure defined

### ❌ What's Broken

- [ ] Server imports failing (missing .js extensions in library)
- [ ] Browser still using custom code
- [ ] No sync between browser and server

### 🔄 In Progress

- [ ] Fix server import issues
- [ ] Update browser to use IndexedDBEngine
- [ ] Remove custom implementations
- [ ] Implement sync layer

## Next Steps

### Immediate (Today)

1. **Fix server imports** - Get SqliteNodeEngine working
2. **Update browser code** - Use IndexedDBEngine
3. **Test both storages** - Verify functionality

### Short Term (This Week)

1. **Remove custom code** - Delete old implementations
2. **Implement sync** - Browser ↔ Server sync
3. **Update documentation** - New architecture docs

### Long Term (This Month)

1. **Advanced features** - Use PTR, Lambda, RAG
2. **Performance optimization** - Benchmark and optimize
3. **Production deployment** - Deploy with library

## Conclusion

**YES, we can use IndexedDB with the mcard-js library!**

The library provides:
- ✅ **IndexedDBEngine** for browser storage
- ✅ **SqliteNodeEngine** for server storage
- ✅ **Consistent API** across both
- ✅ **Advanced features** (PTR, Lambda, RAG)
- ✅ **Production ready** code

**Our strategy:**
1. Fix server imports (bundler or patch)
2. Replace browser custom code with IndexedDBEngine
3. Keep both storages (browser + server)
4. Implement sync layer
5. Use advanced features (PTR, RAG, etc.)

**We will use ONLY the library, no custom code! 🎯✨**
