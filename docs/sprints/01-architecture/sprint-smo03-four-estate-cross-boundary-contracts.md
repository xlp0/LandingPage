# Sprint SMO-03: Universal 4-Modality MCard Content Browser and Cross-Estate Membrane Contracts

> **Status**: Graduated (2026-10-21) (`docs/sprints/01-architecture/`)
> **Program**: [Submodule Modularity, Universal MCard Content Browser, and Organizational Alignment (`Program SMO`)](./00-submodule-modularity-and-organizational-program-charter.md)
> **Sprint Code**: `SMO-03`
> **Invariants Enforced**: `INV-SMO-03` (Universal 4-Modality MCard Content Browser Contract), `INV-SMO-04` (Sandboxed Executable Membrane and Inert Code Inspection)

---

## 1. Context and Architectural Goal

In the current `LandingPage` codebase, two disconnected rendering paths exist.

1. [`LandingPage/js/renderers/RendererRegistry.js`](../../../js/renderers/RendererRegistry.js) registers nine content renderers (`CLMRenderer`, `MarkdownRenderer`, `LatexRenderer`, `ImageRenderer`, `TextRenderer`, `PDFRenderer`, `AudioRenderer`, `VideoRenderer`, `EmbedRenderer`), and [`LandingPage/js/redux/slices/content-renderer-slice.js`](../../../js/redux/slices/content-renderer-slice.js) defines `CONTENT_TYPES` (`markdown`, `image`, `video`, `audio`, `pdf`, `text`, `json`, `html`, `code`, `binary`, `unknown`).
2. [`LandingPage/js/landing-page-mcard.js`](../../../js/landing-page-mcard.js) (`renderPage(card)`) ignores `RendererRegistry.js` and [`LandingPage/js/external-portal-membrane.js`](../../../js/external-portal-membrane.js) completely. It checks only `contentType === 'text/html' ? card.content : '<pre class="mcard-page-body">...</pre>'`, which injects `text/html` directly into `host.innerHTML` without an iframe sandbox and collapses static media, markdown, LaTeX, and source code into raw `<pre>` blocks. Meanwhile, [`LandingPage/js/renderers/EmbedRenderer.js`](../../../js/renderers/EmbedRenderer.js) renders an `<iframe>` without `sandbox` or `referrerpolicy` attributes.

`SMO-03` unifies `LandingPage`'s browser projection layer with the 4-modality contract established in `SMO-01` and `SMO-02` and aligns it with `mcard-studio`'s `@mcard/studio/viewlets` registry and `workbenchExecutionPolicy.ts` (`ULR-07` and `ULR-08`).

---

## 2. Universal 4-Modality MCard Browser Contract

### 2.1 Modality 1: Static Media Files (`modality: 'media'`)
- **Supported Types**: `image/png`, `image/jpeg`, `image/gif`, `image/webp`, `image/svg+xml`, `audio/mpeg`, `audio/wav`, `audio/ogg`, `video/mp4`, `video/webm`, `application/pdf`, `model/gltf-binary` (`.glb`, `.stl`, `.obj`).
- **Projection Contract**:
  - `renderPage(card)` and `RendererRegistry` route static media MCards to `ImageRenderer`, `AudioRenderer`, `VideoRenderer`, `PDFRenderer`, or the 3D object viewer container (`data-modality="media"`), sourcing binary bytes from `/api/mcard/${card.hash}/raw` or a typed `data:${mimeType};base64,${card.contentBase64}` URI.
  - Zero scripts inside SVG or PDF payloads can execute in the parent document (`<img>` / `<audio controls>` / `<video controls>` / `<iframe sandbox="" src="...">`).

### 2.2 Modality 2: Text and Structured Documents (`modality: 'document'`)
- **Supported Types**: `text/markdown`, `text/plain`, `application/json`, `application/x-yaml`, `application/x-latex`.
- **Projection Contract**:
  - Routed to `MarkdownRenderer`, `LatexRenderer`, or `TextRenderer` (`data-modality="document"`).
  - HTML tags and unsafe URLs (`javascript:`, `data:text/html`) are escaped or sanitized before DOM insertion, and `[[hash]]` / `[[handle|label]]` MCard transclusion references resolve to clickable MCard navigation links.

### 2.3 Modality 3: Source Code and CLM Descriptors (`modality: 'code'`, Inert Inspection Law)
- **Supported Types**: `text/javascript`, `application/javascript`, `text/x-typescript`, `text/x-python`, `text/rust`, `text/css`, `application/sql`, `application/xml`, `application/clm` (`.clm`, Plan 9 `PCard` / `VCard` manifests), plus any `text/html` card inspected with `{ viewMode: 'source' }`.
- **Projection Contract (`INV-SMO-04` / `INV-ULR-07`)**:
  - Routed to `TextRenderer` with `lineNumbers: true` and `data-modality="code" data-execution="inert"` (or `CLMRenderer` in structural specification/implementation/verification read-only inspection mode).
  - Browsing or selecting a source code or `PCard` MCard never invokes `eval`, `new Function`, or `<script>` insertion, matching `inspectPublishedDescriptor` in `mcard-studio/src/services/workbenchExecutionPolicy.ts`.

### 2.4 Modality 4: Executable Web Pages and Interactive Portals (`modality: 'webapp'`, Sandboxed Membrane Law)
- **Supported Types**: `text/html` (inline single-page HTML MCard, interactive games/demos), `text/uri-list` (`external-url:` portal cards), `application/x-webapp`.
- **Projection Contract (`INV-SMO-04` / `INV-ULR-05`)**:
  - Raw `host.innerHTML = card.content` for `text/html` is prohibited.
  - **Inline HTML MCards (`text/html`)**: Rendered inside a sandboxed iframe (`<iframe class="mcard-webapp-frame" sandbox="allow-scripts allow-forms" referrerpolicy="no-referrer" srcdoc="..."></iframe>`) with a header bar toggle allowing the user to switch between **Sandboxed App View (`viewMode: 'webapp'`)** and **Inert Source View (`viewMode: 'source'`)**.
  - **External / Local Portal URL MCards (`text/uri-list` or `external-url:`)**: Resolved through [`js/external-portal-membrane.js`](../../../js/external-portal-membrane.js) (`renderSandboxedFrame`, `renderGatewayCard`, `renderOfflineNotice`) and SSRF-guarded `GET /api/mcard/probe-url` in [`server/mcard-api.mjs`](../../../server/mcard-api.mjs).
  - **Hardened `EmbedRenderer.js`**: [`js/renderers/EmbedRenderer.js`](../../../js/renderers/EmbedRenderer.js) validates URLs via `assertSafeUrl` and attaches `sandbox="allow-scripts allow-forms" referrerpolicy="no-referrer"` to every rendered `<iframe>`.

### 2.5 Deterministic 4-Modality Sample Corpus (`scripts/seed-portal-samples.mjs`) and `:5320` Workbench Target
- Expand or annotate [`scripts/seed-portal-samples.mjs`](../../../scripts/seed-portal-samples.mjs) so the seeded `data/samples/portal_samples.mcard.db` and `data/samples/portal_samples_manifest.yaml` declare each sample's `modality` (`media`, `document`, `code`, `webapp`) and exercise all four modalities deterministically while keeping existing sample handles intact for `mcard-studio`'s `ResponsiveViewportLabViewlet`.
- Ensure [`app-config.json`](../../../app-config.json) and `ALLOWED_FIXTURE_ORIGINS` in [`server/mcard-api.mjs`](../../../server/mcard-api.mjs) include `http://127.0.0.1:5320` and `http://localhost:5320` so `LandingPage`'s `responsive-lab.html` can mount and test `mcard-studio` directly.

---

## 3. Definition of Done (DoD) and Verification Commands

- [x] **DoD-SMO-03-01 (4-Modality Dispatcher & Zero Raw `innerHTML` HTML Injection)**:
  `renderPage(card, options)` in `js/landing-page-mcard.js` dispatches across `media`, `document`, `code` (inert line-numbered source), and `webapp` (sandboxed `iframe[srcdoc]` or `external-portal-membrane.js`), and `EmbedRenderer.js` enforces `sandbox="allow-scripts allow-forms"`:
  ```bash
  node --test tests/single-page-mcard.test.mjs
  ```
- [x] **DoD-SMO-03-02 (Deterministic Sample Corpus Seeding & Verification)**:
  `scripts/seed-portal-samples.mjs` seeds and verifies `portal_samples.mcard.db` and `portal_samples_manifest.yaml` with `verification: PASS`:
  ```bash
  node scripts/seed-portal-samples.mjs
  ```
- [x] **DoD-SMO-03-03 (Cross-Estate `mcard-studio` `:5320` Target & Unit Suite)**:
  `app-config.json` and `server/mcard-api.mjs` permit `http://127.0.0.1:5320` and `http://localhost:5320` fixture probing, and all unit tests in `LandingPage` pass:
  ```bash
  npm run test:unit
  ```
