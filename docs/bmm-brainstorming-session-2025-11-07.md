# PKC-LandingPage — Brainstorming Session Results

Date: 2025-11-07
Session: Modular Architecture (Static → Server Networking → P2P libP2P)
Facilitator: BMM Analyst (Mary)

## 1) First Principles (Foundations)

- Static sites must run anywhere by copying files (no server dependency).
- Progressive enhancement: base UX must fully work without JS/networking.
- Features add as optional modules with graceful degradation if unavailable.
- Clear separation between content, presentation, and behavior.
- Module interfaces must be explicit and versioned (contract-first).
- State belongs to the user first (local-first), then optionally syncs.
- No module should require global singletons; modules are discoverable/registrable.
- Deterministic builds: identical directory → identical behavior.
- Security by default: least privilege, CSP, no eval, no inline scripts.
- Accessibility and performance are non-negotiable baselines.

## 2) Mind Map (Outline)

Center: PKC-LandingPage

- Rendering
  - Markdown viewer (Marked + KaTeX + Mermaid)
  - Theme + CSS tokens
  - Content index (cards)
- Module System
  - Registry (manifest + runtime loader)
  - Capability flags (feature detection)
  - Lifecycle: register → init → activate → teardown
- Networking (Server-Assisted)
  - HTTP APIs (optional)
  - WebSocket gateway (optional)
  - Discovery: health + feature flags
- P2P (Client ↔ Client via libP2P)
  - Transport: WebRTC
  - Discovery: Bootstrap + DHT (browser-compatible)
  - Topics: presence, chat, doc-announce
  - Security: keys, authZ policies (future)
- Local-First
  - Storage: IndexedDB / OPFS
  - Sync strategies: CRDT-ready envelope (future)
- Ops & Serving
  - Nginx/IIS/Apache configs
  - CI: link check, HTML validate
- Docs & Examples
  - How-to run
  - Module authoring guide

## 3) Morphological Analysis

Parameters × Options

- Load Strategy
  - Eager (baseline), Deferred on route, On-demand (user action)
- Module Packaging
  - ES Modules, IIFE bundle, Web Worker
- Capability Detection
  - `navigator.onLine`, WebRTC support, Service Worker, Storage
- Registry Source
  - Static JSON manifest, Inline list, Build-time JSON (future)
- Communication Pattern
  - DOM Events, Custom EventBus, BroadcastChannel, PostMessage
- Persistence
  - None, IndexedDB, OPFS
- Security
  - CSP strict, Module allowlist, Signature check (future)
- P2P Discovery
  - Hardcoded bootstrap, Rendezvous server, DHT

Candidate Combinations

- C1 (Baseline Static): Eager + ES Modules + DOM Events + None + CSP strict
- C2 (Server Networking): Deferred + ES Modules + EventBus + IndexedDB + allowlist
- C3 (P2P Alpha): On-demand + ES Modules + BroadcastChannel + IndexedDB + Rendezvous/WebRTC bootstrap

## 4) Proposed Modular Skeleton

- /js/pkc-core.js — registry + capability detection + lifecycle hooks
- /js/modules/
  - markdown-renderer/ (baseline)
  - net-gateway/ (server WebSocket adapter)
  - p2p-libp2p/ (lazy-loaded, behind feature flag)
- /modules.json — manifest with module ids, entrypoints, deps, enabled flags
- /css/tokens.css — design tokens used by all modules

Registry API (sketch):
```js
PKC.register({ id, when: () => boolean, deps: [], init(ctx){}, start(ctx){}, stop(){}})
PKC.capabilities = { webrtc: boolean, websocket: boolean, storage: { idb: boolean, opfs: boolean } }
```

## 5) Incremental Roadmap

1. Baseline
   - Extract `pkc-core` and a minimal `markdown-renderer` module
   - Add `modules.json` and lazy loader
   - Ship strict CSP and A11y check
2. Server Networking (optional)
   - Add `net-gateway` with WS echo demo (feature-detected)
   - Provide nginx example for WS proxy (doc only)
3. P2P Alpha (optional)
   - Add `p2p-libp2p` (WebRTC transport, presence topic)
   - Rendezvous bootstrap service (doc-only or public demo)
4. Local-First envelope (prep)
   - Define CRDT-ready message envelope schema
   - Persist presence history in IndexedDB

## 6) Open Questions

- Bootstrap: host our own rendezvous or use a public one initially?
- Manifest trust: signed module manifests vs allowlist?
- Offline path: service worker in baseline or phase 2?

## 7) Immediate Next Actions

- Create `/js/pkc-core.js` with registry + capability detection
- Split current viewer features into `markdown-renderer` module
- Add `/modules.json` and loader in `index.html`
- Write `MODULES.md` (authoring + lifecycle contract)

---
Generated for PKC-LandingPage. This document is a living artifact; update as design evolves.
