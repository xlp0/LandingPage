# MCard-JS User Guide

> **MCard-JS** is a TypeScript/JavaScript implementation of content-addressable storage that works in both browsers and Node.js. Store data with cryptographic fingerprints, search with vectors, and even run AI models locally.

---

## What is MCard-JS?

MCard-JS gives you:
- **Content addressing** - Every piece of data gets a unique SHA-256 hash
- **Multiple storage options** - Browser (IndexedDB) or Server (SQLite)
- **Handles** - Give human-readable names to your content (like `"latest-report"`)
- **Monads** - Functional programming patterns for safer code
- **AI features** - Vector search and local LLM integration

---

## Installation

```bash
npm install mcard-js
```

---

## Your First MCard in 30 Seconds

### In the Browser

```typescript
import { MCard, IndexedDBEngine, CardCollection } from 'mcard-js';

// Set up storage
const db = new IndexedDBEngine();
await db.init();
const collection = new CardCollection(db);

// Store something
const card = await MCard.create('Hello, World!');
await collection.add(card);

// Get it back
const retrieved = await collection.get(card.hash);
console.log(retrieved.getContentAsText());  // → "Hello, World!"
```

### In Node.js

```typescript
import { MCard } from 'mcard-js/model/MCard';
import { SqliteNodeEngine } from 'mcard-js/storage/SqliteNodeEngine';

// File-based or in-memory database
const db = new SqliteNodeEngine('./my-data.db');

// Store and retrieve
const card = await MCard.create('Hello from Node.js!');
await db.save(card);

const retrieved = await db.get(card.hash);
console.log(retrieved?.getContentAsText());

db.close();  // Always clean up!
```

---

## Understanding MCard

### What's Inside Each Card?

| Property | Description | Example |
|----------|-------------|---------|
| `hash` | Unique SHA-256 fingerprint | `"a591a6d40bf..."` |
| `content` | Your data as bytes | `Uint8Array[...]` |
| `g_time` | When the card was created | `"2024-12-07T10:30..."` |

### Creating Cards

```typescript
// From text
const textCard = await MCard.create('Hello, World!');

// From binary data
const bytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47]);  // PNG header
const binaryCard = await MCard.create(bytes);

// International text works perfectly
const unicodeCard = await MCard.create('Hello 世界! مرحبا 🎉');
```

### Reading Card Data

```typescript
card.hash                  // The unique hash
card.g_time                // Creation timestamp  
card.getContent()          // Raw bytes (Uint8Array)
card.getContentAsText()    // Decoded as UTF-8 string
card.toObject()            // Plain object for JSON serialization
```

---

## Storage Options

MCard-JS supports multiple storage backends depending on your environment:

### Browser: IndexedDB (Recommended)

Built into every modern browser, persistent across sessions:

```typescript
import { IndexedDBEngine } from 'mcard-js';

const db = new IndexedDBEngine();
await db.init();
```

### Browser: SQLite WASM

Full SQLite in the browser via WebAssembly:

```typescript
import { SqliteWasmEngine } from 'mcard-js';

const db = new SqliteWasmEngine();
await db.init();

// You can export the entire database as bytes
const backup = db.export();  // Uint8Array
```

### Node.js: SQLite (Synchronous)

High-performance native SQLite for Node.js using `better-sqlite3`:

```typescript
import { SqliteNodeEngine } from 'mcard-js';

// File-based (persistent)
const db = new SqliteNodeEngine('./mcard.db');

// In-memory (transient)
const memDb = new SqliteNodeEngine(':memory:');

// Initialize
db.setupDatabase();

// Synchronous methods (fast!)
db.addSync(card);
const retrieved = db.getSync(card.hash);
```

---

## Vector Search (AI-Powered)

Search by meaning using local embeddings. Note: `MCardVectorStore` is a separate import.

```typescript
import { MCardVectorStore } from 'mcard-js/storage/VectorStore';

// Configure the store
const vectorStore = new MCardVectorStore('./vectors.db', {
  embeddingModel: 'nomic-embed-text',
  dimensions: 768,
  ollamaBaseUrl: 'http://localhost:11434'
});

// Index content
await vectorStore.index(card.hash, 'MCard stores content securely...');

// Search
const results = await vectorStore.search('content storage', 5);

for (const res of results) {
  console.log(`[${res.score.toFixed(2)}] ${res.hash}`);
}

// Hybrid Search (Vectors + Full-Text)
const hybrid = await vectorStore.hybridSearch('storage', 5);
```

### Features
- **sqlite-vec support**: Automatically uses the extension if available
- **Fallback**: Brute-force cosine similarity if extension missing
- **Hybrid**: Merges vector scores with FTS5 text rank

---

## GraphRAG: Knowledge Graphs

(Coming soon to JS: full GraphRAG engine matching Python implementation)

---

## LLM Integration (Local AI)

Execute prompts using local models.

```typescript
// Import explicitly from the PTR module
import { LLMRuntime } from 'mcard-js/ptr/llm/LLMRuntime';

// Initialize with a provider (e.g., 'ollama')
const runtime = new LLMRuntime('ollama');

// Execute a prompt
// Usage: execute(prompt, context_object, config_overrides, working_dir)
const result = await runtime.execute(
  'What is the capital of France?', 
  {},      // context
  {},      // config
  './'     // working dir
);

console.log(result);
```

---

## Runtime & CLM

Run polyglot code snippets:

```typescript
import { CLMRunner } from 'mcard-js/ptr/node/CLMRunner';

const runner = new CLMRunner();
// See CLI documentation for full CLM execution details
```

---

## Development

```bash
npm install
npm test
npm run build
```

---

## Complete Example: Document Manager

```typescript
import { MCard, CardCollection, IndexedDBEngine } from 'mcard-js';

async function main() {
  // Initialize
  const db = new IndexedDBEngine();
  await db.init();
  const docs = new CardCollection(db);

  // Add some documents with handles
  const readme = await MCard.create('# Welcome\n\nThis is our project.');
  const changelog = await MCard.create('# Changelog\n\n## v1.0.0\nInitial release');
  
  await docs.addWithHandle(readme, 'readme');
  await docs.addWithHandle(changelog, 'changelog');

  // Update readme with new content
  const newReadme = await MCard.create('# Welcome\n\nUpdated documentation!');
  await docs.updateHandle('readme', newReadme);

  // Check the history
  const history = await docs.getHandleHistory('readme');
  console.log(`README has ${history.length} previous versions`);

  // Browse all documents
  const page = await docs.getPage(1, 10);
  console.log(`\n📚 ${page.totalItems} documents in the collection:`);
  
  for (const card of page.items) {
    const preview = card.getContentAsText().substring(0, 50);
    console.log(`  [${card.hash.slice(0, 8)}...] ${preview}...`);
  }
}

main();
```

---

## Quick Reference

| Task | Code |
|------|------|
| Create card | `await MCard.create('content')` |
| Get hash | `card.hash` |
| Get content | `card.getContentAsText()` |
| Store | `await collection.add(card)` |
| Retrieve | `await collection.get(hash)` |
| Use handle | `await collection.addWithHandle(card, 'name')` |
| Get by handle | `await collection.getByHandle('name')` |
| Safe get | `await collection.getM(hash)` (returns Maybe) |
| Count | `await collection.count()` |
| Paginate | `await collection.getPage(1, 10)` |

---

## Need Help?

- **Source Code**: [github.com/xlp0/MCard_TDD/tree/main/mcard-js](https://github.com/xlp0/MCard_TDD/tree/main/mcard-js)
- **npm Package**: [npmjs.com/package/mcard-js](https://www.npmjs.com/package/mcard-js)
- **Issues**: Report bugs on GitHub Issues

---

*MCard-JS is MIT licensed. TypeScript-first with full Node.js and browser support.*
