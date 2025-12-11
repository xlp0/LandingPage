# Landing Page Architecture

This Landing Page belongs to the GovTech/PKC directory and is explicitly designed as a lightweight, static-first experience that proves how rich media sharing and documentation browsing functionality can be delivered with minimal reliance on complex infrastructure. The architecture leans on permanent assets under `index.html`, documentation markdown, and locally provisioned JavaScript/WASM bundles so that every interaction works even when the page is opened via `file://`/localhost without additional services.

## Static Experience with Dynamic Capabilities

- **Static files as the base**: All UI, documentation, and navigation are served from static content in the repository, ensuring the environment loads instantly from any host with basic HTTP (or even file) access.
- **Local JS/WASM engines**: Browser modules (renderers, diagrams, WebRTC helpers) are shipped alongside the page so media rendering, math, and peer communication run without fetching remote binaries. This keeps the dependency graph minimal while letting the browser tap its existing compute resources.
- **Document-driven components**: Markdown guides and diagrams (including the WebRTC communication narratives) are embedded in the `docs/` tree and rely on the landing page’s own renderer, avoiding external APIs or CDN-hosted scripts.

## Mesh Networking with Minimal Coordination

The WebRTC design and handshake flow documents demonstrate a mesh-networking proof-of-concept that keeps peer discovery and connection orchestration simple. Instead of a centralized cluster, the project only needs lightweight coordination points (e.g., static signaling endpoints or simple discovery beacons) so Universal Plug and Play (UPnP) patterns like automatic peer readiness and offer/answer exchange can emerge from static assets alone. This ensures the landing page remains decoupled from the THKMesh platform while showcasing that even static web pages can bootstrap NAT traversal cues and broadcast channels when contextualized within any local network environment.

## Progressive Web App and Local Compute

To maximize persistence and offline resilience, the landing page adopts Progressive Web App (PWA) principles:

1. **Service Worker caching** preserves critical assets (HTML, CSS, JS, WASM) so the experience is instantly usable even on repeat loads with limited or no connectivity.
2. **IndexedDB/local storage** caches metadata, peer states, and user preferences generated during mesh sessions, proving that local compute can sustain collaborative experiences without hitting remote APIs.
3. **Background sync and periodic checks** can be layered to reconcile mesh signals when connectivity is restored, while the primary UX remains powered by client-side logic.

## Local-first Media and Browsing

Media sharing, documentation viewing, and diagram rendering are orchestrated by the landing page’s static modules. Instead of fetching content from external servers, clients rely on built-in data sources (markdown, LaTeX, Mermaid definitions) and local utilities to render P2P communications results. This reinforces the premise that advanced features can be served purely through static web pages combined with locally provisioned computing assets, keeping remote dependency to an absolute minimum.
