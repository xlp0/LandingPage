# Sprint SMO-05: Master README Alignment and Full-Program Verification

> **Status**: Graduated (2026-10-21) (`docs/sprints/01-architecture/`)
> **Program**: [Submodule Modularity, Universal MCard Content Browser, and Organizational Alignment (`Program SMO`)](./00-submodule-modularity-and-organizational-program-charter.md)
> **Sprint Code**: `SMO-05`
> **Invariants Enforced**: `INV-SMO-01` .. `INV-SMO-05`

---

## 1. Context and Architectural Goal

`LandingPage/README.md` is the primary entrypoint for developers and operators arriving at the `LandingPage` repository or navigating from [`MCard_TDD/README.md`](../../../../README.md) and [`mcard-studio/README.md`](../../../../mcard-studio/README.md). Currently, `LandingPage/README.md` describes legacy static landing pages and WebRTC demos without documenting:
1. How `LandingPage` operates as a **Universal 4-Modality MCard Content Browser** (browsing static media files, text and structured documents, inert source code and CLM descriptors, and sandboxed executable web pages as content-addressed MCards in the 3-table SQLite Triad).
2. How `LandingPage` enforces the **published latest `clm-kernel@0.0.10` consensus** alongside `mcard-studio@0.0.3` and `@mcard/studio@0.0.3`.
3. How `LandingPage`'s **Responsive UI Lab (`responsive-lab.html`)** and deterministic 4-modality sample corpus (`scripts/seed-portal-samples.mjs`) interoperate with `mcard-studio` (`:5320`).

`SMO-05` rewrites `LandingPage/README.md` to reflect the verified architecture delivered in `SMO-01` through `SMO-04` and executes the complete verification gate battery across the workspace.

---

## 2. Concrete Implementation Deliverables

### 2.1 Master `LandingPage/README.md` Overhaul
- Update [`LandingPage/README.md`](../../../README.md) to include:
  1. **Four-Estate Positioning Table**: `MCard_TDD` (parent orchestrator & canonical SQLite DDL), `clm` (`clm-kernel@0.0.10` published latest / `0.0.11` workspace), `mcard-studio` (`0.0.3` workbench & `@mcard/studio@0.0.3` library on `:5320`), and `LandingPage` (Universal 4-Modality MCard Content Browser & Device-Sensitive Testing Workbench on `:3000` / `:3001`).
  2. **Universal 4-Modality MCard Content Browser Summary**: Concrete table mapping Static Media (`image/*`, `audio/*`, `video/*`, `application/pdf`, 3D `.glb` via `GET /api/mcard/:hash/raw`), Text & Documents (`MarkdownRenderer`, `LatexRenderer`, `TextRenderer`, `[[hash]]` transclusion), Source Code & CLM (`TextRenderer` with line numbers and inert inspection), and Executable Web Pages (`iframe[sandbox="allow-scripts allow-forms"]` with `srcdoc` and `external-portal-membrane.js` 3-state `live` / `snapshot` / `offline` degradation).
  3. **Quick-Start & Verification Commands**: Standalone (`npm run dev`, `npm run test:unit`, `node --test tests/single-page-mcard.test.mjs`, `node scripts/seed-portal-samples.mjs`) and parent workspace (`make dev-landing`, `make test-landing`, `node mcard-studio/scripts/check-kernel-version-consensus.mjs`) commands.
  4. **Tiered Documentation Map**: Direct links to [`docs/INDEX.md`](../../INDEX.md), [`docs/01-architecture/UNIVERSAL_MCARD_BROWSER_ARCHITECTURE.md`](../../01-architecture/UNIVERSAL_MCARD_BROWSER_ARCHITECTURE.md), and [`docs/sprints/_active/INDEX.md`](./INDEX.md).

### 2.2 Full-Program End-to-End Verification Gate Battery
- Execute and record the verification results for `SMO-01` through `SMO-05`, confirming:
  - Published latest `clm-kernel@0.0.10` consensus holds across `mcard-studio`, `LandingPage`, `node_modules/clm-kernel`, and the live npm registry.
  - Binary-safe Triad storage, `GET /api/mcard/:hash/raw`, 4-modality `TypeInterpreter` classification, and 4-modality browser projection pass all unit and integration tests.
  - Zero loose root markdown files remain in `LandingPage/docs/`, and 100% of markdown links in `LandingPage/README.md`, `LandingPage/docs/INDEX.md`, and `LandingPage/docs/sprints/_active/*.md` resolve cleanly.

---

## 3. Definition of Done (DoD) and Verification Commands

- [x] **DoD-SMO-05-01 (`LandingPage/README.md` Link & Contract Verification)**:
  Every relative link in `LandingPage/README.md` resolves on disk and documents `clm-kernel@0.0.10`, `mcard-studio@0.0.3`, and the 4-modality MCard browser contract.
- [x] **DoD-SMO-05-02 (Master Program Verification Suite Green)**:
  ```bash
  node ../mcard-studio/scripts/check-kernel-version-consensus.mjs && \
  node scripts/seed-portal-samples.mjs && \
  node --test tests/single-page-mcard.test.mjs && \
  npm run test:unit
  ```
- [x] **DoD-SMO-05-03 (Program Charter Checklist Completion)**:
  All checklist items `DoD-SMO-00-01` through `DoD-SMO-00-05` in [`00-submodule-modularity-and-organizational-program-charter.md`](./00-submodule-modularity-and-organizational-program-charter.md) are verified.
