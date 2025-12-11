# The Cubical Logic Model (CLM) Language Specification

> Version 2.1.0 | A Local-First, Cubical Type Theory-Based DSL for Verifiable Computation

## 1. Introduction

The **Cubical Logic Model (CLM)** is a domain-specific language (DSL) grounded in YAML syntax, designed to define **Polynomial Cards (PCards)**—verifiable, executable units of logic that exist as three-dimensional constructs with clear separation between **Specification (Abstract)**, **Implementation (Concrete)**, and **Verification (Balanced)**.

**Every CLM file is a function.** Each function is searchable, composable, and executable across its three dimensions, forming a coordinate system for computable logic.

### CLM as Frontend to the Polynomial Type Runtime (PTR)

CLM serves as the **declarative frontend** to the **Polynomial Type Runtime (PTR)** (pronounced "Peter")—a universal execution engine that supports arbitrary language runtimes. See [PTR Runtime Overview](./PTR_Runtime_Overview.md) for complete documentation.

**Etymology**: PTR is pronounced "Peter", from Greek **Πέτρος (Petros)** meaning "rock" or "stone"—the bedrock foundation that CLM's cubical structures stand upon.

**Supported runtimes**:

| Runtime | Status | Platforms |
|---------|--------|-----------|
| **JavaScript/TypeScript** | ✅ Primary | Browser, Node.js, Deno, Bun |
| **Python** | ✅ Complete | Desktop, Server, Embedded |
| **Rust** | ✅ Complete | Desktop, Server, Embedded, WASM |
| **C** | ✅ Complete | Embedded, Desktop, Server |
| **WASM** | ✅ Complete | Browser, Edge, Embedded |
| **Lean** | ✅ Complete | Proof verification, Desktop |
| **Julia** | 📋 Planned | Scientific computing |
| **Java/Kotlin** | 📋 Planned | Android, Enterprise |

```
┌───────────────────────────────────────────────────────────────┐
│                 THE CLM + PTR + PKC STACK                     │
│          "Cubes resting on bedrock, contained in vessels"     │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│   ┌─────────────────────────────────────────────────────────┐ │
│   │              CLM (Cubical Logic Model)                  │ │
│   │                                                         │ │
│   │   Role: Front-end specification language                │ │
│   │   Form: YAML-based DSL, three-dimensional               │ │
│   │   Metaphor: The cubic/geometric structure               │ │
│   └───────────────────────┬─────────────────────────────────┘ │
│                           │                                   │
│                           ▼                                   │
│   ┌─────────────────────────────────────────────────────────┐ │
│   │             PTR (Polynomial Type Runtime)               │ │
│   │        Pronounced "Peter" — The rock foundation         │ │
│   │                                                         │ │
│   │   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌───────┐ │ │
│   │   │   JS   │ │ Python │ │  Rust  │ │   C    │ │ WASM  │ │ │
│   │   │Runtime │ │Runtime │ │Runtime │ │Runtime │ │Runtime│ │ │
│   │   └────────┘ └────────┘ └────────┘ └────────┘ └───────┘ │ │
│   │   ┌────────┐ ┌────────┐ ┌────────┐                      │ │
│   │   │  Lean  │ │ Julia  │ │  Java  │  ... extensible      │ │
│   │   │Runtime │ │Runtime │ │Runtime │                      │ │
│   │   └────────┘ └────────┘ └────────┘                      │ │
│   │                                                         │ │
│   │   Role: Executes CLM, type evaluation                   │ │
│   │   Metaphor: The rock foundation cubes stand upon        │ │
│   │   [IDENTICAL SEMANTICS GUARANTEED ACROSS RUNTIMES]      │ │
│   └───────────────────────┬─────────────────────────────────┘ │
│                           │                                   │
│                           ▼                                   │
│   ┌─────────────────────────────────────────────────────────┐ │
│   │        PKC (Personal Knowledge Container)               │ │
│   │                                                         │ │
│   │   Role: Storage, identity, distribution                 │ │
│   │   Components: MinIO, SQLite, Authentik, Mesh            │ │
│   │   Metaphor: The container that holds and transports     │ │
│   │                                                         │ │
│   │   Target Devices:                                       │ │
│   │   Personal Computer │ Browser │ Embedded │ Server       │ │
│   │   Mobile Device     │   IoT   │   Edge   │  Cloud       │ │
│   └─────────────────────────────────────────────────────────┘ │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Primary Deployment: Progressive Web Applications

The **initial and primary target** for CLM/PTR deployment is **Personal Computers running in Browsers** via **Progressive Web App (PWA)** standards:

```
┌─────────────────────────────────────────────────────────────┐
│              CLM/PTR AS PROGRESSIVE WEB APP                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Browser (Chrome, Firefox, Safari, Edge)                   │
│   ─────────────────────────────────────────                 │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              SERVICE WORKER (PTR Core)              │   │
│   │                                                     │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│   │  │   CLM       │  │   MCard     │  │   Event     │  │   │
│   │  │   Parser    │  │   Store     │  │   Queue     │  │   │
│   │  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│   │                                                     │   │
│   │  Features:                                          │   │
│   │  ✓ Offline Execution (no network required)          │   │
│   │  ✓ Background Processing (Service Worker threads)   │   │
│   │  ✓ Push Notifications (event triggers)              │   │
│   │  ✓ Installable (Add to Home Screen)                 │   │
│   │  ✓ Auto-Update (version management)                 │   │
│   └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│   ┌─────────────────────────────────────────────────────┐   │
│   │           LOCAL STORAGE (IndexedDB + OPFS)          │   │
│   │                                                     │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│   │  │  CLM Files  │  │   MCards    │  │ Cached Data │  │   │
│   │  │  (indexed)  │  │  (hashed)   │  │  (synced)   │  │   │
│   │  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   PWA Manifest:                                             │
│   - name: "CLM Runtime"                                     │
│   - start_url: "/"                                          │
│   - display: "standalone"                                   │
│   - offline_enabled: true                                   │
│   - service_worker: "/ptr-service-worker.js"                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Interactive Online/Offline Operation**: Users interact with CLM through the browser whether connected to the internet or not. The Service Worker intercepts all requests and serves from local cache when offline, synchronizing when connectivity returns.

This architecture enables:
- **Verifiable Execution** across all runtime environments
- **Polyglot Interoperability** with identical semantics
- **Local-First Data Sovereignty** with content-addressable storage
- **Excitable Medium Behavior** for event-driven agent systems

---

## 1.1. Foundational Principles

### Local-First Architecture

CLM is designed as a **Local-First** system where:

1. **Data Lives Locally** - All CLM files, MCards, and execution results are stored on the user's device first
2. **Offline-Capable** - Full functionality without network connectivity
3. **Sync When Available** - Optional synchronization via content-addressable hashes
4. **User Data Sovereignty** - Users own and control their data completely

```
┌─────────────────────────────────────────────────────────────┐
│                    LOCAL-FIRST STACK                        │
├─────────────────────────────────────────────────────────────┤
│  [Browser/Electron]  [Embedded Device]  [Desktop/Server]    │
│         │                   │                  │            │
│         ▼                   ▼                  ▼            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              CLM Runtime (PTR / "Peter")            │    │
│  │  - YAML Parser                                      │    │
│  │  - Dimension Resolver                               │    │
│  │  - Polyglot Executor                                │    │
│  └─────────────────────────────────────────────────────┘    │
│         │                   │                  │            │
│         ▼                   ▼                  ▼            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Storage Layer (Unified Interface)         │    │
│  │  - Hyperlinked Files (.clm, .yaml)                  │    │
│  │  - SQLite Database (IndexedDB in browsers)          │    │
│  │  - Content-Addressable Blobs (MCard hashes)         │    │
│  │  - S3-Compatible Storage (MinIO, AWS S3, etc.)      │    │
│  └─────────────────────────────────────────────────────┘    │
│         │                   │                  │            │
│         ▼                   ▼                  ▼            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         OBSERVABILITY SIDECAR (Security Layer)      │    │
│  │  - Metrics export (Prometheus/OpenTelemetry)        │    │
│  │  - Audit logging with encryption                    │    │
│  │  - Access control and secret management             │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**Storage Backends**:

| Environment | Primary Storage | Index Storage | Network Storage | Capability |
|-------------|-----------------|---------------|-----------------|------------|
| Browser | IndexedDB + OPFS | IndexedDB | S3 via fetch | Full CLM execution |
| Embedded | SQLite + Files | SQLite | MinIO/S3 | Full CLM execution |
| Desktop | Files + SQLite | SQLite | MinIO/S3 | Full CLM execution |
| Server | Files + PostgreSQL | PostgreSQL | MinIO/S3/GCS | Full CLM + multi-tenant |

### MCard: Universal Content-Addressable Storage

All CLM files and data content are stored as **MCards**—hash-indexed blobs that serve as the universal unit of storage:

```
┌─────────────────────────────────────────────────────────────┐
│                    MCARD STORAGE SYSTEM                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   MCard Structure:                                          │
│   ────────────────                                          │
│   ┌──────────────────────────────────────────────────────┐  │
│   │ hash: "sha256:a1b2c3d4..."  ← Primary Key (immutable)│  │
│   │ handle: "namespace/name"    ← Human-readable alias   │  │
│   │ content: <blob>             ← Any data type          │  │
│   │ content_type: "..."         ← MIME type              │  │
│   │ embedding: [...]            ← Semantic vector        │  │
│   │ metadata: {...}             ← Tags, timestamps       │  │
│   │ encrypted: true|false       ← Encryption status      │  │
│   └──────────────────────────────────────────────────────┘  │
│                                                             │
│   Storage Operations:                                       │
│   ───────────────────                                       │
│                                                             │
│   ┌────────────────┐    ┌────────────────┐                  │
│   │ LOCAL STORAGE  │◄──►│ NETWORK SYNC   │                  │
│   │                │    │                │                  │
│   │ • SQLite       │    │ • MinIO/S3     │                  │
│   │ • IndexedDB    │    │ • AWS S3       │                  │
│   │ • Files        │    │ • GCS/Azure    │                  │
│   └────────────────┘    └────────────────┘                  │
│          │                      │                           │
│          └──────────┬───────────┘                           │
│                     ▼                                       │
│   ┌─────────────────────────────────────────────────────┐   │
│   │            HASH-BASED OPERATIONS                    │   │
│   │                                                     │   │
│   │  • Data Transport: Transfer by hash, verify on recv │   │
│   │  • Data Verification: Hash ensures integrity        │   │
│   │  • Encryption: Encrypt blob, hash ciphertext        │   │
│   │  • Backup/Restore: Copy hashes, content follows     │   │
│   │  • Deduplication: Same content = same hash          │   │
│   │  • Redundancy: Replicate to multiple storage        │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**MCard Benefits**:
1. **Easy Data Transport** - Transfer content by hash reference, verify integrity automatically
2. **Data Verification** - Content hash guarantees data has not been modified
3. **Convenient Encryption** - Encrypt content, store encrypted blob, hash identifies ciphertext
4. **Backup/Restore** - Copy hash index, replicate content blobs
5. **Distributed Storage** - Same hash anywhere means same content
6. **Deduplication** - Identical content stored once regardless of how many references

### Observability Sidecars

All CLM runtimes (PTR instances) are designed with **Observability Sidecars** for monitoring and security. Observability is a **core architectural principle**, not an optional add-on.

**The Grafana Observability Stack**:

| Layer | Component | Purpose |
|-------|-----------|--------|
| **Browser/PWA** | **Grafana Faro** | Real User Monitoring, JS errors, Web Vitals, session replay |
| **Backend** | **Grafana Beyla** | eBPF-based auto-instrumentation, zero-code tracing |
| **Backend (Manual)** | **OpenTelemetry** | CLM-specific spans, custom metrics |
| **Ingestion** | **LGTM Stack** | Loki (logs), Grafana (viz), Tempo (traces), Mimir (metrics) |

```yaml
# Observability Sidecar Configuration
observability:
  # Browser Observability (Grafana Faro)
  faro:
    enabled: true
    collector_url: "https://faro.example.com/collect"
    app_name: "clm-runtime"
    instrumentation:
      tracing: true           # Distributed tracing
      errors: true            # JavaScript error tracking
      web_vitals: true        # Core Web Vitals (LCP, FID, CLS)
      session_recording: true # User session replay
      
  # Metrics export (Prometheus-compatible)
  metrics:
    enabled: true
    port: 9090
    path: "/metrics"
    labels:
      runtime: "${runtime.name}"
      clm_hash: "${clm.hash}"
    
  # Distributed tracing (OpenTelemetry)
  tracing:
    enabled: true
    exporter: "otlp"  # OpenTelemetry Protocol
    endpoint: "http://tempo:4317"
    service_name: "ptr-runtime"
    propagation: "w3c"  # W3C Trace Context for cross-boundary correlation
    
  # Audit logging (as MCards)
  audit:
    enabled: true
    events:
      - "clm.execute"
      - "clm.verify"
      - "mcard.create"
      - "mcard.access"
      - "network.request"
    storage:
      type: "mcard"  # Audit logs are also MCards
      encrypted: true
      collection: "audit_logs"
      
  # Security features
  security:
    redact_secrets: true
    require_auth: true
    encrypt_storage: true
    encryption_key_source: "env:CLM_ENCRYPTION_KEY"
```

**Grafana Faro for In-Browser Observability**:

Faro enables comprehensive observability for CLM running in browsers/PWAs:

```typescript
// Initialize Faro in CLM PWA
import { initializeFaro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

const faro = initializeFaro({
  url: 'https://faro.example.com/collect',
  app: { name: 'clm-runtime', version: '2.1.0' },
  instrumentations: [
    new TracingInstrumentation(),  // Distributed tracing
  ],
});

// Track CLM execution
faro.api.pushMeasurement({
  type: 'clm_execution',
  values: { duration: 45, hash: 'sha256:abc123' },
});
```

**Observability Features**:
| Feature | Purpose | Implementation |
|---------|---------|----------------|
| Metrics | Performance monitoring | Prometheus/OpenMetrics |
| Tracing | Request flow tracking | OpenTelemetry/Tempo, Faro |
| Audit Logs | Compliance & security | MCard-based, encrypted |
| Secret Redaction | Prevent credential leaks | Automatic in logs |
| Web Vitals | Browser performance | Grafana Faro |
| Error Tracking | JS/runtime errors | Grafana Faro |
| Session Replay | Debug user interactions | Grafana Faro |

### Cubical Type Theory Foundation

CLM is a **Computable Logic Model** based on **Cubical Type Theory (CTT)**, ensuring:

1. **Computational Semantics** - Every type has computational content
2. **Path Types** - Equality is represented as paths, enabling higher inductive types
3. **Univalence** - Equivalent types are equal (isomorphic structures are interchangeable)
4. **Deterministic Interpretation** - All runtimes (Python, Rust, JavaScript, etc.) MUST interpret CLM identically

```
CLM Type Hierarchy (Cubical Foundation)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Universe₀ (Base Types)
  │
  ├── Primitive: int, float, string, bool, bytes
  ├── Composite: list[T], dict[K,V], option[T]
  └── MCard: content-addressed type with hash identity
  
Universe₁ (Function Types)
  │
  ├── PCard: (inputs) → (outputs) with verification
  ├── CLM: abstract × concrete × balanced → PCard
  └── Agent: CLM + memory + tools → autonomous function
  
Universe₂ (Higher Types)
  │
  ├── Workflow: composition of PCards
  ├── Path[A,B]: equivalence proof between A and B
  └── Collection: indexed set of MCards
```

**Interpretation Guarantee**: Given a valid CLM definition, execution in Python, Rust, JavaScript, C, WASM, or Lean MUST produce **identical results** (within floating-point tolerance where applicable). This is enforced through:
- Shared test vectors in the `balanced` dimension
- Hash-based verification of outputs
- Formal semantics defined in this specification

### The Three-Dimensional Function Space

Every CLM file defines a **function** positioned in a three-dimensional space:

```
                    ABSTRACT (What)
                         │
                         │  Specification
                         │  Purpose & Contracts
                         │
                         ▼
            ┌────────────┼────────────┐
            │            │            │
            │     ┌──────┴──────┐     │
            │     │   CLM/PCard │     │
            │     │  (Function) │     │
            │     └──────┬──────┘     │
            │            │            │
  CONCRETE ◄─────────────┼────────────► BALANCED
  (How)                  │              (Why)
  Implementation         │              Verification
  Runtime & Code         │              Tests & Config
                         │
                         ▼
                    EXECUTION
```

**Dimensional Search**: CLM files can be discovered by querying any dimension:
- **By Abstract**: "Find all functions that compute derivatives"
- **By Concrete**: "Find all functions implemented in Rust"
- **By Balanced**: "Find all functions with >95% test coverage"

### Excitable Medium Paradigm

CLM functions behave as **Excitable Media**—they can exist in quiescent states and become active when stimulated by external events:

```
┌─────────────────────────────────────────────────────────────┐
│                    EXCITABLE CLM AGENT                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────┐     ┌─────────┐     ┌─────────┐               │
│   │ Event   │     │  CLM    │     │ Output  │               │
│   │ Queue   │────▶│ Function│────▶│ /Action │               │
│   └─────────┘     └─────────┘     └─────────┘               │
│        ▲               │               │                    │
│        │               ▼               │                    │
│   ┌─────────┐     ┌─────────┐          │                    │
│   │ Network │     │ Memory  │◀─────────┘                    │
│   │ Request │     │ (MCard) │                               │
│   └─────────┘     └─────────┘                               │
│                                                             │
│   States:                                                   │
│   ○ Quiescent  - Listening, no activity                     │
│   ◐ Excited    - Processing input                           │
│   ● Refractory - Cooling down, rate-limited                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Trigger Sources**:
- **Event Queues**: AMQP, Redis, Kafka messages
- **Network Requests**: HTTP webhooks, WebSocket messages
- **File Changes**: Watched directories
- **Schedules**: Cron-based triggers
- **Inter-CLM Calls**: One CLM invoking another

---

## 1.2. Content-Addressable Storage (MCard Schema)

All CLM data is indexed using the **MCard** content-addressable scheme:

```yaml
# MCard Structure
mcard:
  # Primary Identity (Content Hash)
  hash: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  
  # Human-Readable Handle
  handle: "arithmetic/addition/v1.0.0"
  
  # Semantic Vector (for similarity search)
  embedding:
    model: "text-embedding-3-small"
    dimensions: 1536
    vector: [0.023, -0.041, 0.089, ...]  # Stored separately
    
  # Content
  content_type: "application/x-clm+yaml"
  content: |
    abstract:
      purpose: "Add two numbers"
    ...
    
  # Metadata
  metadata:
    created_at: "2024-12-07T12:00:00Z"
    author: "system"
    tags: ["arithmetic", "basic", "verified"]
```

**Addressing Modes**:
| Mode | Syntax | Example |
|------|--------|---------|
| Hash | `mcard://sha256:abc123...` | Immutable, content-addressed |
| Handle | `handle://arithmetic/addition` | Mutable, human-friendly |
| Path | `file://./functions/add.clm` | Local filesystem |
| Collection | `collection://math/verified` | Query-based retrieval |

**Semantic Search**: The embedding vector enables natural language queries:
```yaml
# Query: "function that adds numbers"
# Returns MCards with similar semantic vectors
query:
  type: "semantic"
  text: "function that adds numbers"
  top_k: 10
  threshold: 0.8
```

---

## 1.3. Interactive Web Presentation

CLM files, being YAML-based, can be rendered as **Interactive Web Pages** in modern browsers:

```
┌──────────────────────────────────────────────────────────────┐
│  CLM Interactive Editor                          [▢] [─] [×] │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐ ┌─────────────────────────────────────┐ │
│  │ Navigator       │ │ Editor                              │ │
│  │                 │ │                                     │ │
│  │ ▼ abstract      │ │ abstract:                           │ │
│  │   └─ purpose    │ │   purpose: "Add two numbers"        │ │
│  │   └─ inputs     │ │   inputs:                           │ │
│  │   └─ outputs    │ │     a: { type: float }              │ │
│  │ ▼ concrete      │ │     b: { type: float }              │ │
│  │   └─ runtime    │ │   outputs:                          │ │
│  │   └─ code_file  │ │     sum: { type: float }            │ │
│  │ ▼ balanced      │ │                                     │ │
│  │   └─ test_cases │ │ concrete:                           │ │
│  │                 │ │   runtime: "python"                 │ │
│  └─────────────────┘ │   code_file: "module://add"         │ │
│                      │                                     │ │
│  ┌─────────────────┐ │ balanced:                           │ │
│  │ Execution Panel │ │   test_cases:                       │ │
│  │                 │ │     - given: {a: 1, b: 2}           │ │
│  │ [▶ Run] [⏹ Stop]│ │       then: {result: 3}             │ │
│  │                 │ └─────────────────────────────────────┘ │
│  │ Input:          │                                         │
│  │ a: [1.0    ]    │ ┌─────────────────────────────────────┐ │
│  │ b: [2.0    ]    │ │ Output / Results                    │ │
│  │                 │ │                                     │ │
│  │ Output:         │ │ ✓ Test 1: PASSED (3ms)              │ │
│  │ sum: 3.0        │ │ ✓ Test 2: PASSED (2ms)              │ │
│  │                 │ │                                     │ │
│  │ Hash:           │ │ Coverage: 100%                      │ │
│  │ sha256:abc1...  │ │ MCard: sha256:e3b0c44...            │ │
│  └─────────────────┘ └─────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**Browser Capabilities**:
- **Edit**: Live YAML editing with syntax highlighting and validation
- **Execute**: Run CLM functions via WASM/JS runtime
- **Visualize**: Graph view of function dependencies
- **Search**: Semantic and structural queries across collections
- **Store**: IndexedDB + Origin Private File System (OPFS) for persistence
- **Sync**: Optional peer-to-peer or server sync via content hashes

## 2. File Structure & Syntax

A CLM file is a valid YAML document that describes either a **Narrative Chapter** or a **Raw PCard**.

### 2.1. File Extensions
*   **.clm**: Preferred extension for individual PCard definitions.
*   **.yaml / .yml**: Standard extensions, often used for Chapters or configuration files.

### 2.2. Root Structure Variations

#### A. The Narrative Chapter (Standard)
Used for defining logic within the "Prologue of Spacetime" narrative framework.
```yaml
chapter:
  id: 1
  title: "Arithmetic Logic"
  mvp_card: "The Calculator"
  pkc_task: "Computation"

clm:
  abstract: { ... }
  concrete: { ... }
  balanced: { ... }
```

#### B. The Raw PCard (Simplified)
Used for atomic, reusable components (e.g., in `chapters/samples/`).
```yaml
type: PCard
metadata:
  name: "Sine Function"
  version: "1.0.0"

# Dimensions defined at the root
abstract: { ... }
concrete: { ... }
balanced: { ... }
```

## 3. The Three Dimensions (Grammar & Semantics)

### 3.1. Abstract Dimension (Thesis / WHAT)
Defines the **Concept**. This is the functional specification.

*   **`purpose`** / **`concept`**: (String) A human-readable description of what the logic does.
*   **`inputs`**: (Dict) Schema of accepted inputs.
    *   Keys are parameter names.
    *   Values describe types (`float`, `string`, `dict`) and constraints.
*   **`outputs`**: (Dict) Schema of expected results.
*   **`preconditions`**: (List[String]) Logical assertions that must be true before execution.
*   **`postconditions`**: (List[String]) Logical assertions guaranteed to be true after successful execution.

**Example:**
```yaml
abstract:
  purpose: "Calculate the sine of an angle."
  inputs:
    angle: { type: "float", description: "Angle in radians" }
  outputs:
    result: { type: "float", range: [-1.0, 1.0] }
```

### 3.2. Concrete Dimension (Antithesis / HOW)
Defines the **Manifestation**. This section binds the abstract requirements to a specific implementation.

*   **`runtime`**: (Required) Execution environment (e.g., `python`, `javascript`, `rust`, `c`, `wasm`, `lean`).
*   **`code_source`**: (One of the following is required):
    *   **`code_file`**: Path to source file (relative or `module://`).
    *   **`binary_path`**: Path to compiled executable.
    *   **`wasm_module`**: Path to .wasm file.
    *   **`code_hash`**: MCard hash of the implementation (CAS retrieval).
*   **`entry_point`**: (Optional) Specific function or symbol to invoke (e.g., `main`, `run_benchmark`).
*   **Process Definition** (Standardized Keywords):
    *   **`input_type`**: Type of input data (e.g., `directory`, `file`, `mcard`, `void`).
    *   **`process_type`**: Nature of the operation. Common values:
        *   `transform`: stateless data conversion.
        *   `benchmark`: performance analysis.
        *   `passthrough`: identity operation.
        *   `custom`: implementation-specific logic.
    *   **`output_type`**: Type of output artifact (e.g., `sqlite`, `json`, `report`, `mcard`).

**Example:**
```yaml
concrete:
  runtime: "python"
  code_file: "loader_logic.py"
  entry_point: "run_loader_benchmark"
  input_type: "directory"
  process_type: "benchmark"
  entry_point: "run_loader_benchmark"
  input_type: "directory"
  process_type: "benchmark"
  output_type: "sqlite"

### 2.3. Specialized Reserved Words (Standardized Operations)
To ensure consistent implementation of common I/O patterns, specific `builtin` reserved words are defined. Runtimes SHOULD implement these natively or via standardized libraries (like `mcard.file_io`).

*   **`builtin: load_content`**: Standardized file ingestion.
    *   **Behavior**: Recursively or non-recursively loads files from a directory or path.
    *   **Features**: Pathological content detection, soft-wrapping for minified text, binary detection, MIME type inference.
    *   **Config**: `recursive`, `include_problematic`, `soft_wrap`.

*   **`builtin: load_url`**: Standardized network ingestion.
    *   **Behavior**: Fetches content from a URL.
    *   **Features**: Timeout handling, User-Agent rotation (optional), content type detection.
    *   **Config**: `timeout`, `headers`.
```

### 3.3. Balanced Dimension (Synthesis / WHY)
Defines the **Expectation** and **Configuration**. This dimension provides the specific parameters for execution and verification.

*   **`input_arguments`**: (Dict) Static default parameters for inputs.
*   **`output_arguments`**: (Dict) Static default parameters for outputs.
*   **`expected_results`**: (Dict) General success criteria.
*   **`test_cases`**: (List) Table-driven verification scenarios.

**Test Case Structure:**
*   **`given`**: Input description or content.
*   **`when`**: Execution Context.
    *   **`params`**: Direct argument overrides for the entry point.
    *   **`context`**: Deep context overrides (e.g., swapping `output_arguments` for a test run).
*   **`then`**: Assertions.
    *   **`success`**: (Boolean) Did it run without error?
    *   **`result`**: (Any) Exact match expectation.
    *   **`epsilon`**: (Float) Tolerance for numeric comparison.

**Example:**
```yaml
balanced:
  # Static Defaults
  input_arguments:
    retrieval_count: 100
    
  test_cases:
    - description: "Benchmark Tech loading"
      given: "Start Benchmark"
      when:
        params:
          # Overrides default retrieval_count
          retrieval_count: 50
        context:
          # Injects specific output config
          output_arguments:
             db_path: "data/tech.db"
      then:
        success: true
```

## 4. Integration Features

### 4.1. MCard Collection & Content Addressing
The CLM language is deeply integrated with MCard's Content Addressable Storage (CAS):
*   **`algorithm`**: Defined properties can be hashed to create a unique **PCard Identity**.
*   **`code_hash`**: Allows the `concrete` dimension to point to an immutable blob in basic storage rather than a mutable file on disk.
*   **Input/Output**: Inputs (`given`) are converted to MCards before being passed to the runtime.

### 4.2. Context & Parameter Passing
The execution context flows through the CLM:
1.  **Global Context**: Provided by the runner/user (e.g., CLI args).
2.  **Balanced Defaults**: `input_arguments` and `output_arguments` from the CLM root are merged.
3.  **Test Case Context**: `when.context` merges and overrides defaults.
4.  **Test Case Params**: `when.params` provide direct function arguments.
5.  **Result**: The final context is available to the runtime logic.

### 4.3. URL & Path Resolution
*   **Relative Paths**: `code_file`, `binary_path`, and `wasm_module` are resolved relative to the referencing YAML file. This allows self-contained "Chapter Bundles".
*   **Future URL Support**: The `code_hash` field suggests a future capability to load code via `mcard://<hash>` URIs.

### 4.4. Recursive CLM Runtimes (Meta-Circular Interpretation)
The `runtime` field can point to another CLM definition (file or content), enabling meta-circular interpretation.
*   **Syntax**: `runtime: "path/to/meta_interpreter.clm"`
*   **Behavior**:
    1.  The PTR executes the target **Meta-CLM**.
    2.  The current PCard's definition is injected into the Meta-CLM's context.
    3.  The current PCard's input (`given`) is passed as the input to the Meta-CLM.
*   **Use Case**: Defining PCards that interpret other PCards, fostering higher-order logic composition (e.g., a "Validator" PCard that runs other PCards).

### 4.5. Language Agnostic Execution
The PTR is designed for **language agnostic execution**, which allows for many different language runtimes to load other language runtimes to run CLM code exactly the same way. This means:
*   **Uniform Interface**: A Python runtime can load a Lean runtime, which can load a Rust runtime, all through the same CLM interface.
*   **Consistent Behavior**: The execution model (Abstract/Concrete/Balanced) remains invariant regardless of the underlying language.
*   **Recursive Composition**: Runtimes can be composed recursively (as described in 4.4), enabling complex, multi-language systems to be built from simple, verifiable components.

## 5. Pragmatics & Execution Flow

1.  **Parsing**: The `CLMChapterLoader` reads the YAML. It detects if it's a Chapter or Raw PCard.
2.  **Assembly**: It constructs a `CLMConfiguration` object.
3.  **Runtime Selection**: Based on `concrete.runtime`, it selects a `SandboxedExecutor`.
4.  **Resource Loading**: Files referenced by `code_file` etc. are loaded into memory or prepared for the sandbox.
5.  **Test Iteration**: If `balanced.test_cases` exist, the `logic_func` wrapper iterates through them, injecting inputs and verifying `then` expectations.
6.  **Monadic Result**: The execution returns a `NarrativeMonad`, encapsulating the specific Result, the internal State change, and the Audit Log.

## 6. Suggestions for Language Improvement

Based on the analysis of the current implementation, the following improvements are recommended:

### A. [Implemented] Unify `logic_source` and `code_*`
(Supported via `code_file: module://...` syntax)

### B. Formalize `given` Inputs
The `given` field allows primitive strings, but MCard is about *Cards*.
*   **Suggestion**: Support structured `given` that clearly distinguishes between *Content Body* (string/bytes) and *Metadata/Header*.
    ```yaml
    given:
      content: "..."
      type: "application/json"
    ```

### C. Explicit Runtime Versioning
`runtime: python` is vague.
*   **Suggestion**: Support `runtime: python@3.9` or `runtime_config: { version: ">=3.9" }` to ensure reproducibility.

### D. Separation of Test Data
Embedding large test suites in YAML can be unwieldy.
*   **Suggestion**: Allow `balanced.test_cases` to point to an external file: `test_cases: "tests/suite_01.yaml"`.

### E. Standardized Error Handling
Currently, errors are often returned as strings like `"Error: ..."`.
*   **Suggestion**: Define a standard `error` schema in `abstract.outputs` so runtimes return structured error objects `{ "code": 500, "message": "..." }`.

### F. Composable Pipelines (Next Step)
While recursive runtimes enable vertical composition (interpreters), horizontal composition (pipelines) is missing.
*   **Suggestion**: Introduce a `pipeline` operation or `Chapter` type that links multiple PCards in a sequence, where the output of `Step N` becomes the input of `Step N+1`.
    ```yaml
    concrete:
      runtime: "pipeline"
      steps:
        - pcard: "step1_transform.clm"
        - pcard: "step2_validate.clm"
    ```

---

## 7. Network IO Extension

CLM supports network operations through builtin primitives and declarative resource definitions. See [CLM_Network_IO_Specification.md](./CLM_Network_IO_Specification.md) for complete details.

### 7.1. HTTP Operations

The `http_request` builtin provides standardized HTTP client capabilities:

```yaml
concrete:
  builtin: http_request
  config:
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
    url: "https://api.example.com/data"
    headers:
      Authorization: "Bearer ${secrets.API_KEY}"
      Content-Type: "application/json"
    body: "${input.payload}"
    timeout: 30000
    retry:
      max_attempts: 3
      backoff: "exponential"
    response_type: "json" | "text" | "binary" | "stream"
```

### 7.2. Declarative Resources

The `resources` section in `abstract` declares external data dependencies:

```yaml
abstract:
  purpose: "Fetch and transform API data"
  resources:
    users_api:
      type: "http"
      url: "https://api.example.com/users"
      cache_ttl: 3600
    config_file:
      type: "file"
      path: "config/settings.yaml"
    cached_result:
      type: "mcard"
      hash: "sha256:abc123..."
```

### 7.3. WebSocket & Streaming

```yaml
concrete:
  builtin: websocket_connect
  config:
    url: "wss://stream.example.com"
    protocols: ["graphql-ws"]
    on_message: "handler.clm"
    keepalive: 30000
```

### 7.4. Message Queue Integration

```yaml
concrete:
  builtin: queue_publish | queue_subscribe
  config:
    broker: "amqp://localhost:5672"
    exchange: "events"
    routing_key: "user.created"
    message: "${output.event}"
```

---

## 8. Agentic Workflow Extension

CLM can define autonomous agents through an optional fourth dimension. See [CLM_Agentic_Workflow_Specification.md](./CLM_Agentic_Workflow_Specification.md) for complete details.

### 8.1. The Agent Dimension

Extends the three-dimensional model with agent-specific configuration:

```yaml
clm:
  abstract:
    purpose: "Research a topic and provide findings"
    inputs:
      query: { type: "string" }
    outputs:
      findings: { type: "structured_report" }
      
  agent:
    model:
      provider: "openai" | "anthropic" | "ollama"
      name: "gpt-4"
      temperature: 0.7
      
    system_prompt: |
      You are a research assistant...
      
    tools:
      - name: "web_search"
        pcard: "tools/web_search.clm"
        description: "Search the web"
        
    memory:
      type: "mcard_collection"
      retrieval:
        strategy: "semantic"
        top_k: 5
        
    guardrails:
      max_iterations: 10
      max_tool_calls: 50
      
  concrete:
    runtime: "agent"
    entry_point: "execute_agent_loop"
    
  balanced:
    test_cases:
      - given: { query: "quantum computing" }
        then:
          success: true
```

### 8.2. Workflow Runtime

The `workflow` runtime orchestrates multi-step processes:

```yaml
concrete:
  runtime: "workflow"
  
  steps:
    - id: "research"
      pcard: "agents/researcher.clm"
      inputs:
        query: "${input.topic}"
        
    - id: "analyze"
      pcard: "agents/analyzer.clm"
      inputs:
        data: "${steps.research.result}"
      condition: "${steps.research.success}"
      
    - id: "synthesize"
      pcard: "agents/synthesizer.clm"
      parallel_with: ["validate"]
```

### 8.3. Control Flow

```yaml
steps:
  - id: "branch"
    type: "switch"
    on: "${steps.classify.category}"
    cases:
      "technical": { pcard: "handlers/technical.clm" }
      "billing": { pcard: "handlers/billing.clm" }
      default: { pcard: "handlers/general.clm" }
      
  - id: "refinement"
    type: "while"
    condition: "${quality_score} < 0.9"
    max_iterations: 5
    body:
      - pcard: "refine.clm"
```

### 8.4. Event Triggers

```yaml
concrete:
  runtime: "event_agent"
  
  triggers:
    - type: "http_webhook"
      path: "/api/webhook"
    - type: "schedule"
      cron: "0 */6 * * *"
    - type: "queue"
      channel: "task_queue"
      
  on_trigger:
    pcard: "event_processor.clm"
```

---

## 9. Variable Interpolation

CLM supports variable interpolation using `${...}` syntax throughout configuration values.

### 9.1. Variable Scopes

| Scope | Syntax | Description |
|-------|--------|-------------|
| Input | `${input.field}` | Values from `given` or input arguments |
| Output | `${output.field}` | Values from execution results |
| Steps | `${steps.id.field}` | Results from workflow steps |
| Context | `${context.field}` | Execution context values |
| Secrets | `${secrets.KEY}` | Secure credential references |
| Memory | `${memory.field}` | Agent memory values |
| Trigger | `${trigger.field}` | Event trigger payload |

### 9.2. Expression Support

```yaml
# Simple interpolation
url: "https://api.example.com/users/${input.user_id}"

# Nested access
data: "${steps.fetch.result.items[0].name}"

# Conditional (future)
message: "${input.name || 'Anonymous'}"
```

---

## 10. Security Model

### 10.1. Permission Declarations

```yaml
agent:
  permissions:
    network:
      allowed_domains: ["api.openai.com", "*.trusted.com"]
      blocked_domains: ["*.malicious.com"]
    tools:
      - name: "file_write"
        allowed: false
      - name: "web_search"
        rate_limit: "10/minute"
    data:
      pii_handling: "redact"
```

### 10.2. Audit Trail

```yaml
balanced:
  audit:
    enabled: true
    storage: "mcard"
    collection: "audit_logs/${agent_id}"
    capture:
      - llm_requests
      - tool_invocations
      - state_changes
    retention:
      days: 90
```

---

## 11. Implementation Status

| Feature | Status | Specification |
|---------|--------|---------------|
| Core CLM (Abstract/Concrete/Balanced) | ✅ Implemented | This document |
| Polyglot Runtimes | ✅ Implemented | Section 4.5 |
| `builtin: load_content` | ✅ Implemented | Section 2.3 |
| `builtin: load_url` | 🔄 Partial | Section 7.1 |
| `builtin: http_request` | 📋 Planned | [Network IO Spec](./CLM_Network_IO_Specification.md) |
| WebSocket Support | 📋 Planned | [Network IO Spec](./CLM_Network_IO_Specification.md) |
| Message Queues | 📋 Planned | [Network IO Spec](./CLM_Network_IO_Specification.md) |
| Agent Dimension | 📋 Planned | [Agentic Spec](./CLM_Agentic_Workflow_Specification.md) |
| Workflow Runtime | 📋 Planned | [Agentic Spec](./CLM_Agentic_Workflow_Specification.md) |
| Event Triggers | 📋 Planned | [Agentic Spec](./CLM_Agentic_Workflow_Specification.md) |

---

## Appendix A: Grammar Summary

```
CLM_FILE       ::= CHAPTER_FORMAT | RAW_PCARD_FORMAT
CHAPTER_FORMAT ::= chapter: CHAPTER_META clm: CLM_BODY
RAW_PCARD      ::= type: "PCard" metadata: META CLM_BODY

CLM_BODY       ::= abstract: ABSTRACT 
                   [agent: AGENT]
                   concrete: CONCRETE 
                   balanced: BALANCED

ABSTRACT       ::= purpose: STRING
                   [inputs: INPUT_SCHEMA]
                   [outputs: OUTPUT_SCHEMA]
                   [resources: RESOURCE_DECL]
                   [preconditions: LIST[STRING]]
                   [postconditions: LIST[STRING]]

AGENT          ::= model: MODEL_CONFIG
                   [system_prompt: STRING]
                   [tools: LIST[TOOL_DEF]]
                   [memory: MEMORY_CONFIG]
                   [guardrails: GUARDRAIL_CONFIG]
                   [permissions: PERMISSION_CONFIG]

CONCRETE       ::= runtime: RUNTIME_TYPE
                   (code_file | binary_path | wasm_module | code_hash | builtin): SOURCE
                   [entry_point: STRING]
                   [steps: LIST[STEP_DEF]]
                   [triggers: LIST[TRIGGER_DEF]]

BALANCED       ::= [input_arguments: DICT]
                   [output_arguments: DICT]
                   [expected_results: DICT]
                   [test_cases: LIST[TEST_CASE]]
                   [audit: AUDIT_CONFIG]

RUNTIME_TYPE   ::= "python" | "javascript" | "rust" | "c" | "wasm" | "lean" 
                 | "agent" | "workflow" | "event_agent" | "pipeline" | CLM_PATH
```

## Appendix B: Related Documents

- [CLM_Network_IO_Specification.md](./CLM_Network_IO_Specification.md) - Detailed Network IO specification
- [CLM_Agentic_Workflow_Specification.md](./CLM_Agentic_Workflow_Specification.md) - Detailed Agentic Workflow specification
- [CLM_Implementation_Roadmap.md](./CLM_Implementation_Roadmap.md) - Implementation timeline and priorities
