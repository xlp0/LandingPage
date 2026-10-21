# Sprint SMO-01: Submodule Topology, Monorepo Duality, and Binary-Safe Canonical Triad Store

> **Status**: Graduated (2026-10-21) (`docs/sprints/01-architecture/`)
> **Program**: [Submodule Modularity, Universal MCard Content Browser, and Organizational Alignment (`Program SMO`)](./00-submodule-modularity-and-organizational-program-charter.md)
> **Sprint Code**: `SMO-01`
> **Invariants Enforced**: `INV-SMO-01` (Submodule Sovereignty), `INV-SMO-03` (Binary-Safe Canonical Triad Store)

---

## 1. Context and Architectural Goal

For `LandingPage` to browse any content as an MCard (whether static binary media, text, source code, or executable web pages), its storage engine ([`server/mcard-api.mjs`](../../../server/mcard-api.mjs)) and repository boundary must satisfy two foundational laws.

1. **Submodule Duality (`INV-SMO-01`)**. `LandingPage` must execute identically when checked out standalone (`git clone https://github.com/xlp0/LandingPage.git`) and when mounted as a submodule at `MCard_TDD/LandingPage` orchestrated by the parent [`MCard_TDD/Makefile`](../../../../Makefile). Zero source or test files inside `LandingPage` may import relative paths across `../clm` or `../mcard-studio`.
2. **Binary-Safe Canonical Triad Storage (`INV-SMO-03`)**. In [`server/mcard-api.mjs`](../../../server/mcard-api.mjs), `CanonicalTriadBackend` persists records in the 3-table, 3-column Triad schema (`card(hash, content, g_time)`, `handle_registry(handle, current_hash, updated_at)`, `handle_history(handle, previous_hash, changed_at)`). Currently, `CanonicalTriadBackend.get(hash)` unconditionally decodes `row.content` as UTF-8 (`row.content.toString('utf8')`) before invoking `verifyRecord(row.hash, content, row.g_time)`. When `row.content` holds a binary static media file (`image/png`, `image/jpeg`, `image/webp`, `audio/mpeg`, `video/mp4`, `application/pdf`, or `model/gltf-binary`), UTF-8 decoding replaces non-UTF-8 byte sequences with `U+FFFD` (`\uFFFD`), corrupting the payload and causing `verifyRecord` to fail (`verified: false`).

`SMO-01` fixes `CanonicalTriadBackend` so byte verification always runs on the raw `Buffer` / `Uint8Array` stored in SQLite, preserves raw bytes on `getBytes(hash)` / `get(hash)`, and adds `GET /api/mcard/:hash/raw` so static media MCards stream cleanly to browser media renderers.

---

## 2. Concrete Implementation Deliverables

### 2.1 Standalone vs Parent Monorepo Boundary Verification
- Audit `LandingPage/server/`, `LandingPage/js/`, `LandingPage/scripts/`, and `LandingPage/tests/` to confirm zero `../clm` or `../mcard-studio` filesystem imports exist.
- Verify that `LandingPage/Makefile` and `MCard_TDD/Makefile` expose aligned lifecycle targets (`dev`, `test:unit`, `test:smoke`) that invoke `LandingPage`'s own `package.json` scripts without leaking parent workspace assumptions.

### 2.2 Binary-Safe Digest Verification and Raw Payload Access in [`server/mcard-api.mjs`](../../../server/mcard-api.mjs)
- Update `CanonicalTriadBackend.get(hash)` in [`server/mcard-api.mjs`](../../../server/mcard-api.mjs) so that:
  1. `rawBytes` (`Buffer.isBuffer(row.content) ? row.content : Buffer.from(row.content)`) is extracted first.
  2. `verifyRecord(row.hash, rawBytes, row.g_time)` computes `computeHash(algorithmOf(row.g_time), new Uint8Array(rawBytes))` directly over `rawBytes` before any string decoding.
  3. Binary payloads (`isBinaryContent(rawBytes)`) expose `contentBase64: rawBytes.toString('base64')`, `isBinary: true`, and `rawBytes`, while text payloads expose UTF-8 `content` and `isBinary: false`.
- Add `GET /api/mcard/:hash/raw` to [`server/mcard-api.mjs`](../../../server/mcard-api.mjs):
  - Looks up `hash` in `CanonicalTriadBackend`.
  - Returns HTTP `404` when absent or HTTP `422` if `card.verified !== true`.
  - Serves `rawBytes` with `Content-Type: <detectedMimeType>`, `Content-Length: <size>`, `X-Content-Type-Options: nosniff`, `Cache-Control: public, max-age=31536000, immutable`, and `Content-Security-Policy: default-src 'none'; img-src 'self' data: blob:; media-src 'self' data: blob:; style-src 'unsafe-inline'` so static media MCards render safely in `<img>`, `<audio>`, `<video>`, `<object>`, or 3D loaders without executing embedded scripts.

### 2.3 Unit and Integration Test Coverage in [`tests/single-page-mcard.test.mjs`](../../../tests/single-page-mcard.test.mjs)
- Add positive and negative tests proving:
  - Binary PNG/WebP/MP3/PDF/GLB byte sequences with non-UTF-8 bytes (`0x89, 0x50, 0x4E, 0x47, 0xFF, 0xFE, 0x00, ...`) round-trip through `CanonicalTriadBackend.put(buf)` and `get(hash)` with `verified === true` and exact byte equality.
  - `GET /api/mcard/:hash/raw` returns exact binary bytes, `X-Content-Type-Options: nosniff`, and HTTP `200`, while an unknown hash returns HTTP `404`.

---

## 3. Definition of Done (DoD) and Verification Commands

- [x] **DoD-SMO-01-01 (Zero Cross-Submodule Source Imports)**:
  ```bash
  ! grep -rnE "(\.\./)+clm/|(\.\./)+mcard-studio/" server/ js/ scripts/ tests/
  ```
- [x] **DoD-SMO-01-02 (Binary-Safe Canonical Triad Verification & Raw Media Route)**:
  `CanonicalTriadBackend` verifies digests over raw bytes before UTF-8 conversion and serves `GET /api/mcard/:hash/raw` with `X-Content-Type-Options: nosniff`:
  ```bash
  node --test tests/single-page-mcard.test.mjs
  ```
- [x] **DoD-SMO-01-03 (Unit Suite Green & Contract D Budget)**:
  All unit tests in `LandingPage/tests/unit/` pass and `server/mcard-api.mjs` remains `<= 500` LOC:
  ```bash
  npm run test:unit && awk 'END { if (NR > 500) exit 1 }' server/mcard-api.mjs
  ```
