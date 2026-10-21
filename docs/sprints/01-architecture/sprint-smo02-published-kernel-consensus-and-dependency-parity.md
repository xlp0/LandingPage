# Sprint SMO-02: Published Latest `clm-kernel` (`0.0.10`) Consensus and Universal Type Judgment Parity

> **Status**: Graduated (2026-10-21) (`docs/sprints/01-architecture/`)
> **Program**: [Submodule Modularity, Universal MCard Content Browser, and Organizational Alignment (`Program SMO`)](./00-submodule-modularity-and-organizational-program-charter.md)
> **Sprint Code**: `SMO-02`
> **Invariants Enforced**: `INV-SMO-02` (Published Latest `clm-kernel` Consensus), `INV-SMO-03` (Universal 4-Modality MCard Classification)

---

## 1. Context and Architectural Goal

Two requirements govern how `LandingPage` consumes `clm-kernel`.

1. **Consensus Must Use the Published Latest `clm-kernel` (`0.0.10`) All the Time (`INV-SMO-02`)**.
   The latest published version of `clm-kernel` across npm, PyPI, and crates.io is `0.0.10` (while in-tree `clm` manifests advance on `workspace_version: "0.0.11"`). Both consumer submodules (`mcard-studio` and `LandingPage`) and the consensus guard ([`mcard-studio/scripts/check-kernel-version-consensus.mjs`](../../../../mcard-studio/scripts/check-kernel-version-consensus.mjs)) must track and enforce the published latest version (`0.0.10`) across:
   - [`mcard-studio/scripts/config/kernel-version-consensus.json`](../../../../mcard-studio/scripts/config/kernel-version-consensus.json) (`consensus_version: "0.0.10"`, `lockfile_pin: "0.0.10"`, `manifest_pin: "0.0.10"`, `nested_peer_range: ">=0.0.10 <0.1.0"`)
   - [`mcard-studio/package.json`](../../../../mcard-studio/package.json) and [`mcard-studio/package-lock.json`](../../../../mcard-studio/package-lock.json) (`"clm-kernel": "0.0.10"`)
   - [`mcard-studio/src/packages/mcard-studio/package.json`](../../../../mcard-studio/src/packages/mcard-studio/package.json) (`"clm-kernel": ">=0.0.10 <0.1.0"`)
   - [`LandingPage/package.json`](../../../package.json) and [`LandingPage/package-lock.json`](../../../package-lock.json) (`"clm-kernel": "0.0.10"`)
   - [`LandingPage/js/harness/recorder.js`](../../../js/harness/recorder.js) and test fixtures (`clmKernel: '0.0.10'`)
   - Live registry verification against `https://registry.npmjs.org/clm-kernel/latest` in `check-kernel-version-consensus.mjs` (unless explicitly run with `--offline` or `MCARD_OFFLINE_CONSENSUS=1` in air-gapped environments), plus on-disk `node_modules/clm-kernel/package.json` verification so installed packages can never drift silently from `kernel-version-consensus.json`.

2. **Universal 4-Modality Type Judgment via `clm-kernel@0.0.10` (`INV-SMO-03`)**.
   `clm-kernel@0.0.10` exports the 48-type SSOT `TypeInterpreter`, `detectMime`, `isBinary`, `classifyClm`, and `detectDialect`. Meanwhile, [`LandingPage/server/mcard-api.mjs`](../../../server/mcard-api.mjs) still uses a 15-line regex `detectContentType(content)` that recognizes only six MIME strings and knows nothing about static media magic bytes (`PNG`, `JPEG`, `GIF`, `WebP`, `PDF`, `MP3`, `MP4`, `GLB`), source code extensions/dialects (`.ts`, `.js`, `.py`, `.rs`, `.sql`, `.css`, `.clm`), or URL list cards (`text/uri-list`).
   `SMO-02` replaces that ad-hoc sniff function in `LandingPage/server/mcard-api.mjs` with `clm-kernel@0.0.10`'s `TypeInterpreter` and `detectMime` + `isBinary`, mapping every MCard deterministically to one of the four browser modalities (`media`, `document`, `code`, `webapp`).

---

## 2. Concrete Implementation Deliverables

### 2.1 Published Latest `clm-kernel@0.0.10` Alignment Across Consumer Estates
- Update [`mcard-studio/scripts/config/kernel-version-consensus.json`](../../../../mcard-studio/scripts/config/kernel-version-consensus.json), [`mcard-studio/package.json`](../../../../mcard-studio/package.json), [`mcard-studio/package-lock.json`](../../../../mcard-studio/package-lock.json), [`mcard-studio/src/packages/mcard-studio/package.json`](../../../../mcard-studio/src/packages/mcard-studio/package.json), [`LandingPage/package.json`](../../../package.json), [`LandingPage/package-lock.json`](../../../package-lock.json), and [`LandingPage/js/harness/recorder.js`](../../../js/harness/recorder.js) to `"0.0.10"`.
- Enhance [`mcard-studio/scripts/check-kernel-version-consensus.mjs`](../../../../mcard-studio/scripts/check-kernel-version-consensus.mjs) so that it:
  1. Verifies `node_modules/clm-kernel/package.json` on disk matches `consensus_version` (`0.0.10`).
  2. Verifies `LandingPage/package.json` and `LandingPage/package-lock.json` match `consensus_version` (`0.0.10`) when `LandingPage` is present in the parent workspace.
  3. Queries `https://registry.npmjs.org/clm-kernel/latest` by default (with graceful offline fallback only when network is unreachable in non-`--online` mode) and fails immediately if the published latest version on npm differs from `consensus_version`.

### 2.2 Universal 4-Modality Content Classification in [`LandingPage/server/mcard-api.mjs`](../../../server/mcard-api.mjs)
- Import `TypeInterpreter`, `detectMime`, and `isBinary` from `clm-kernel` (`0.0.10`) in [`server/mcard-api.mjs`](../../../server/mcard-api.mjs).
- Implement `classifyMCardContent(rawBytes, { handle = '', filename = '', mimeHint = '' } = {})` backed by `TypeInterpreter.createDefault().judge()` and `detectMime`:
  - Returns `{ mimeType, category, universe, isBinary, modality }` where `modality` is one of:
    - `'media'`: `image/*`, `audio/*`, `video/*`, `application/pdf`, `model/*`, `image/vnd.dxf`, or binary media payloads.
    - `'webapp'`: `text/html`, `text/uri-list`, `application/x-webapp`, or `external-url:` portal payloads.
    - `'code'`: `text/javascript`, `application/javascript`, `text/x-typescript`, `text/x-python`, `text/rust`, `text/x-sh`, `text/css`, `application/sql`, `application/xml`, `text/xml`, or CLM `.clm` / `PCard` / `VCard` manifests.
    - `'document'`: `text/markdown`, `text/plain`, `application/json`, `application/x-yaml`, `text/yaml`, `application/x-latex`, and structured prose.
- Expose `modality`, `category`, `universe`, and `isBinary` in `cardView(card)` returned by `GET /api/mcard/:hash`, `GET /api/mcard/landing`, and `GET /api/mcard`.

---

## 3. Definition of Done (DoD) and Verification Commands

- [x] **DoD-SMO-02-01 (Published Latest `clm-kernel@0.0.10` Consensus Gate)**:
  `check-kernel-version-consensus.mjs` verifies `0.0.10` across `mcard-studio`, `LandingPage`, `node_modules/clm-kernel`, and the live npm registry:
  ```bash
  node ../mcard-studio/scripts/check-kernel-version-consensus.mjs
  ```
- [x] **DoD-SMO-02-02 (Release Readiness & Consumer Consensus Test)**:
  `mcard-studio` release readiness and `release_upgrade_and_rollback.test.ts` pass at `clm-kernel@0.0.10`:
  ```bash
  npm --prefix ../mcard-studio run release:check && npx --prefix ../mcard-studio vitest run tests/mcard-studio/unit/package-cli/release_upgrade_and_rollback.test.ts
  ```
- [x] **DoD-SMO-02-03 (4-Modality `TypeInterpreter` Judgment in `LandingPage`)**:
  `LandingPage` unit and single-page MCard tests verify deterministic classification across Static Media, Text/Documents, Source Code, and Executable Web Pages:
  ```bash
  node --test tests/single-page-mcard.test.mjs && npm run test:unit
  ```
