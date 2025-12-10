# MCard-JS User Guide

> **MCard-JS v2.1.2** is a TypeScript/JavaScript implementation of content-addressable storage with **full Python parity**, **Lambda Calculus**, **RAG**, and **GraphRAG**. Works in both browsers and Node.js with cryptographic fingerprints, semantic search, and polyglot execution.

**Latest Features (v2.1.2):**
- ⭐ **Lambda Calculus Runtime** - Pure functional programming
- 🧠 **Full RAG Support** - Vector search, GraphRAG, embeddings
- 🔍 **Content Detection** - Full parity with Python implementation
- 🔄 **Semantic Versioning** - Version-aware handle resolution
- ✅ **155 Tests Passing** - Comprehensive coverage
- 🌐 **Published to npm** - `npm install mcard-js@2.1.8`

---

## Installation

```bash
# From npm
npm install mcard-js@2.1.8

# With optional dependencies (for Node.js)
npm install mcard-js better-sqlite3 sqlite-vec
```

---

## What is MCard-JS?

MCard-JS gives you:
- **Content addressing** - Every piece of data gets a unique SHA-256 hash
- **Smart Detection** - Automatically identifies JSON, Text, Binary, Code, and Media
- **Multiple storage options** - Browser (IndexedDB/WASM) or Server (Native SQLite)
- **Handles** - Give human-readable names to your content (like `"latest-report"`)
- **Monads** - Functional patterns (`Maybe`, `Either`, `Reader`, `State`, `Writer`) for robust code
- **AI features** - Vector search, RAG schemas, and local LLM integration

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

// Set up storage (persistent in browser)
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
import { MCard } from 'mcard-js';
import { SqliteNodeEngine } from 'mcard-js/storage/SqliteNodeEngine';

// File-based database
const db = new SqliteNodeEngine('./my-data.db');
db.setupDatabase(); // Initialize tables

// Store synchronously (fast!)
const card = await MCard.create('Hello from Node.js!');
db.addSync(card);

// Retrieve
const retrieved = db.getSync(card.hash);
console.log(retrieved?.getContentAsText());
```

---

## Understanding MCard

### What's Inside Each Card?

| Property | Description | Example |
|----------|-------------|---------|
| `hash` | Unique SHA-256 fingerprint | `"a591a6d40bf..."` |
| `content` | Your data as bytes | `Uint8Array[...]` |
| `g_time` | When the card was created | `"2024-12-07T10:30..."` |

### Smart Content Detection

MCard-JS automatically detects what kind of data you are storing:

```typescript
import { ContentTypeInterpreter } from 'mcard-js/model/detectors/ContentTypeInterpreter';

const jsonBytes = new TextEncoder().encode('{"key": "value"}');
const type = ContentTypeInterpreter.detect(jsonBytes);
console.log(type); // → "application/json"

// It distinguishes between:
// - application/json
// - text/plain
// - application/octet-stream (binary)
// - (And more coming via file loaders)
```

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

---

## Storage Options

### Browser: IndexedDB (Recommended)
Built into every modern browser, persistent across sessions.
```typescript
import { IndexedDBEngine } from 'mcard-js';
const db = new IndexedDBEngine();
await db.init();
```

### Browser: SQLite WASM
Full SQLite in the browser via WebAssembly. Great for complex queries but larger download.
```typescript
import { SqliteWasmEngine } from 'mcard-js';
const db = new SqliteWasmEngine();
await db.init();
```

### Node.js: Native SQLite
High-performance synchronous storage using `better-sqlite3`.

```typescript
import { SqliteNodeEngine } from 'mcard-js/storage/SqliteNodeEngine';

const db = new SqliteNodeEngine('./data.db');
db.setupDatabase();

// Sync methods are 10-50x faster for bulk operations
db.addSync(card);
const one = db.getSync(hash);
const many = db.getPageSync(1, 100);
const count = db.countSync();
```

---

## Working with Collections

Collections wrap storage engines to add higher-level features like Handles.

```typescript
const collection = new CardCollection(db);

// Standard Async API (universally compatible)
await collection.add(card);
const item = await collection.get(hash);

// Handles: Human-readable names
await collection.addWithHandle(card, 'latest-report');
const report = await collection.getByHandle('latest-report');

// Version History
const history = await collection.getHandleHistory('latest-report');
console.log(`Report has ${history.length} versions`);
```

---

## The Monadic API (Advanced)

Write safer, functional code using the included Monad library.

### Core Monads

| Monad | Use Case |
|-------|----------|
| `Maybe<T>` | Handling optional values without `null` checks |
| `Either<L, R>` | Error handling (Left=Error, Right=Success) |
| `IO<T>` | Encapsulating side-effects (lazy execution) |
| `Reader<E, T>` | Dependency injection (pass config implicitly) |
| `State<S, A>` | Managing state updates purely |
| `Writer<W, A>` | Logging/accumulating data alongside computation |

### Example: Dependency Injection with Reader

```typescript
import { Reader } from 'mcard-js/monads/Reader';

interface Config {
  dbPath: string;
  debug: boolean;
}

// A computation that needs Config
const getPath = Reader.ask<Config>().map(c => c.dbPath);

// Execute it with a specific config
const result = getPath.evaluate({ dbPath: './prod.db', debug: false });
console.log(result); // → "./prod.db"
```

### Example: Safe Retrieval with Maybe

```typescript
const maybeCard = await collection.getM(hash);

// Transform if exists, do nothing if missing
const title = maybeCard
  .map(c => c.getContentAsText())
  .map(text => text.substring(0, 20))
  .getOrElse('Untitled');
```

---

## Vector Search (AI-Powered)

Search by meaning using local embeddings.

```typescript
import { MCardVectorStore } from 'mcard-js/storage/VectorStore';

const vectorStore = new MCardVectorStore('./vectors.db', {
  embeddingModel: 'nomic-embed-text', // Default
  dimensions: 768,
  chunkSize: 512,
  enableHybridSearch: true // Vectors + Keywords
});

// Index content
await vectorStore.index(card.hash, 'MCard stores content securely...');

// Semantic Search
const results = await vectorStore.search('secure storage', 5);

// Hybrid Search (Best of both worlds)
const hybrid = await vectorStore.hybridSearch('secure storage', 5);
```

---

## GraphRAG: Knowledge Graphs

The necessary schemas are available to build knowledge graphs, compatible with the Python engine.

```typescript
import { initGraphSchemas } from 'mcard-js/storage/schema';
import { SqliteNodeEngine } from 'mcard-js/storage/SqliteNodeEngine';

const db = new SqliteNodeEngine('./graph.db');
const rawDb = db['db']; // Access underlying better-sqlite3 instance

// Initialize Graph tables (Nodes, Edges, Communities)
initGraphSchemas(rawDb);
```

(Full `GraphRAGEngine` logic coming soon to JS)

---

## LLM Integration

Execute prompts using local models (e.g. Ollama).

```typescript
import { LLMRuntime } from 'mcard-js/ptr/llm/LLMRuntime';

// Connect to Ollama (default)
const runtime = new LLMRuntime('ollama');

// Execute prompt
const answer = await runtime.execute(
  'Summarize this text',
  { text: 'Long content...' }, // context
  { model: 'llama3' },         // config override
  './'                         // working dir
);
```

---

## File Loader Runtime

Ingest directories efficiently.

```typescript
import { ContentTypeInterpreter } from 'mcard-js/model/detectors/ContentTypeInterpreter';

// Use detectors to filter files during ingestion
const isJson = ContentTypeInterpreter.detect(fileBytes) === 'application/json';
```

---

## Lambda Calculus Runtime ⭐ NEW!

Execute pure functional programs using Lambda Calculus.

```typescript
import { LambdaRuntime, LambdaTerm } from 'mcard-js/ptr/lambda';

const runtime = new LambdaRuntime();

// Parse and normalize lambda expression
const result = await runtime.normalize("(\\x.x) y");
console.log(result.prettyPrint);  // → "y"

// Beta reduction
const identity = LambdaTerm.parse("\\x.x");
const applied = LambdaTerm.app(identity, LambdaTerm.var("y"));
const reduced = applied.betaReduce();
console.log(reduced.prettyPrint());  // → "y"

// Church numerals
const two = LambdaTerm.parse("\\f.\\x.f (f x)");
const three = LambdaTerm.parse("\\f.\\x.f (f (f x))");
```

### Alpha, Beta, Eta Conversions

```typescript
import { 
  alphaRename, 
  betaReduce, 
  etaReduce,
  freeVariables 
} from 'mcard-js/ptr/lambda';

// Alpha conversion (variable renaming)
const term = LambdaTerm.parse("\\x.x");
const renamed = alphaRename(term, "x", "y");
console.log(renamed.prettyPrint());  // → "\\y.y"

// Check free variables
const term2 = LambdaTerm.parse("\\x.x y");
const fv = freeVariables(term2);
console.log(fv);  // → Set { 'y' }

// Eta reduction
const term3 = LambdaTerm.parse("\\x.f x");
const reduced = etaReduce(term3);
console.log(reduced.prettyPrint());  // → "f"
```

### Running Lambda CLMs

```bash
# Run lambda calculus examples
npm run clm:lambda

# Run all CLMs
npm run clm:all
```

---

## Semantic Versioning ⭐ NEW!

Version-aware handle resolution with semantic versioning support.

```typescript
import { 
  parseVersion, 
  compareVersions,
  findCompatibleVersion 
} from 'mcard-js/rag/semanticVersioning';

// Parse semantic versions
const v1 = parseVersion("1.2.3");
const v2 = parseVersion("1.2.4");

// Compare versions
console.log(compareVersions(v1, v2));  // → -1 (v1 < v2)

// Find compatible versions
const versions = ["1.0.0", "1.2.0", "1.2.3", "2.0.0"];
const compatible = findCompatibleVersion("^1.2.0", versions);
console.log(compatible);  // → "1.2.3"
```

### Versioned Handles

```typescript
import { MCard, CardCollection } from 'mcard-js';

const collection = new CardCollection(engine);

// Store multiple versions
const v1 = await MCard.create("Version 1 content");
const v2 = await MCard.create("Version 2 content");

await collection.addWithHandle(v1, "my-doc@1.0.0");
await collection.addWithHandle(v2, "my-doc@1.1.0");

// Retrieve specific version
const docV1 = await collection.getByHandle("my-doc@1.0.0");

// Get latest compatible version
const latest = await collection.getByHandle("my-doc@^1.0.0");  // Gets 1.1.0
```

---

## GraphRAG Engine ⭐ NEW!

Full GraphRAG implementation with entity extraction and knowledge graphs.

```typescript
import { GraphRAGEngine } from 'mcard-js/rag/GraphRAGEngine';
import { SqliteNodeEngine } from 'mcard-js/storage/SqliteNodeEngine';

// Initialize engine
const db = new SqliteNodeEngine('./graph.db');
const graphRAG = new GraphRAGEngine(db);

// Extract entities and relationships
const text = "Alice works at TechCorp. Bob is her colleague.";
const entities = await graphRAG.extractEntities(text);
console.log(entities);
// → [
//     { name: "Alice", type: "PERSON" },
//     { name: "TechCorp", type: "ORGANIZATION" },
//     { name: "Bob", type: "PERSON" }
//   ]

// Build knowledge graph
await graphRAG.buildGraph(text);

// Query the graph
const results = await graphRAG.query("Who works at TechCorp?");
console.log(results);
```

### Graph Components

```typescript
import { GraphStore, GraphExtractor } from 'mcard-js/rag/graph';

// Create graph store
const store = new GraphStore(db);

// Add nodes and edges
await store.addNode({ id: "alice", type: "PERSON", properties: { name: "Alice" } });
await store.addNode({ id: "techcorp", type: "ORG", properties: { name: "TechCorp" } });
await store.addEdge({ 
  source: "alice", 
  target: "techcorp", 
  type: "WORKS_AT" 
});

// Query graph
const neighbors = await store.getNeighbors("alice");
console.log(neighbors);
```

---

## Content Detection ⭐ NEW!

Full content type detection with Python parity.

```typescript
import { ContentTypeInterpreter } from 'mcard-js/model/ContentTypeInterpreter';

const interpreter = new ContentTypeInterpreter();

// Detect from bytes
const pngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, ...]);
const type = interpreter.detectContentType(pngBytes);
console.log(type);  // → { mimeType: "image/png", confidence: 1.0 }

// Detect programming languages
const pythonCode = 'def hello():\n    print("Hello")';
const langType = interpreter.detectContentType(
  new TextEncoder().encode(pythonCode)
);
console.log(langType);  // → { mimeType: "text/x-python", confidence: 0.9 }

// Supported types:
// - Images: PNG, JPEG, GIF, WebP, SVG
// - Documents: PDF, DOCX, XLSX
// - Data: JSON, XML, CSV, YAML
// - Code: Python, JavaScript, TypeScript, Rust, C, Java
// - 3D: OBJ, STL, GLTF
// - Media: WAV, MP3, AVI, MP4
```

---

## Handle-Vector Store ⭐ NEW!

Combine semantic search with handle-based retrieval.

```typescript
import { HandleVectorStore } from 'mcard-js/rag/HandleVectorStore';

const store = new HandleVectorStore('./vectors.db');

// Index with handle
await store.indexWithHandle(
  "my-doc@1.0.0",
  "Content about MCard storage...",
  { version: "1.0.0", author: "Alice" }
);

// Search by semantic similarity
const results = await store.searchByVector("storage systems", 5);

// Search by handle pattern
const versioned = await store.searchByHandle("my-doc@*");

// Hybrid search (semantic + handle)
const hybrid = await store.hybridSearch("storage", "my-doc@^1.0.0", 5);
```

---

## Development

```bash
npm install        # Install dependencies
npm test           # Run comprehensive test suite (155 tests)
npm run build      # Build for production
npm run clm:all    # Run all CLM examples
npm run clm:lambda # Run lambda calculus examples
```

---

## Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- tests/ptr/lambda/Lambda.test.ts
npm test -- tests/rag/GraphRAGEngine.test.ts
npm test -- tests/rag/HandleVectorStore.test.ts
npm test -- tests/ContentDetection.test.ts

# Run with coverage
npm test -- --coverage
```

---

## Feature Comparison: Python vs JavaScript

| Feature | Python | JavaScript | Status |
|---------|--------|------------|--------|
| Core MCard | ✅ | ✅ | Full parity |
| Handle System | ✅ | ✅ | Full parity |
| Content Detection | ✅ | ✅ | Full parity |
| Vector Search | ✅ | ✅ | Full parity |
| GraphRAG | ✅ | ✅ | Full parity |
| Lambda Calculus | ✅ | ✅ | Full parity |
| LLM Runtime | ✅ | ✅ | Full parity |
| Semantic Versioning | ✅ | ✅ | Full parity |
| Monadic API | ✅ | ✅ | Full parity |
| Database Schema | ✅ | ✅ | Unified |

---

## Quick Reference

| Task | Code |
|------|------|
| Create card | `await MCard.create("content")` |
| Get hash | `card.hash` |
| Get content | `card.getContentAsText()` |
| Store card | `await collection.add(card)` |
| Retrieve card | `await collection.get(hash)` |
| Search | `await collection.searchByString("query")` |
| Delete | `await collection.delete(hash)` |
| Count all | `await collection.count()` |

---

## Need Help?

- **npm Package**: [npmjs.com/package/mcard-js](https://www.npmjs.com/package/mcard-js)
- **Source Code**: [github.com/xlp0/MCard_TDD/tree/main/mcard-js](https://github.com/xlp0/MCard_TDD/tree/main/mcard-js)
- **Python Version**: [pypi.org/project/mcard](https://pypi.org/project/mcard/)
- **Issues**: Report bugs on GitHub Issues

---

*MCard-JS v2.1.2 is MIT licensed. Built for developers who care about data integrity and functional programming.*
