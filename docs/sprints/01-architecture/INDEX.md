# Sprint Series SMO: Submodule Modularity & Universal MCard Browser (Graduated)

> Submodule Sovereignty → Binary-Safe Triad API → `clm-kernel@0.0.10` Consensus → 4-Modality Browser Dispatcher → Documentation Hygiene & Master Alignment

> **Program SMO Graduated — 2026-10-21.** All sprint specifications SMO-00 through SMO-05 are fully implemented, verified, and sealed into `docs/sprints/01-architecture/`. Verification evidence: **97/97 unit tests passing**, **24/24 single-page MCard tests passing**, **published `clm-kernel@0.0.10` exact-pin consensus 100% green against npm registry**, **deterministic 4-modality 6-sample corpus verified (`PASS`)**, **zero cross-submodule source imports**, and **100% documentation link integrity**.

---

## Executive Summary

`Program SMO` refines `LandingPage` into a sovereign, modular, and generalizable **Universal 4-Modality MCard Content Browser and Device-Sensitive Testing Workbench** that seamlessly fits the `MCard_TDD` monorepo alongside `mcard-studio@0.0.3` (`@mcard/studio@0.0.3`) and `clm-kernel@0.0.10`:

1. **Submodule Sovereignty and Monorepo Duality (`INV-SMO-01`)**. `LandingPage` operates identically whether cloned as a standalone Git repository or mounted as Submodule 3 within `MCard_TDD`. Zero runtime or test files import across `../clm` or `../mcard-studio` filesystem paths.
2. **Published Latest `clm-kernel@0.0.10` Consensus (`INV-SMO-02`)**. Both consumer submodules (`LandingPage` and `mcard-studio`) exact-pin `clm-kernel@0.0.10` in `package.json`, `package-lock.json`, and runtime fixtures, passing the live npm registry consensus check (`check-kernel-version-consensus.mjs`).
3. **Binary-Safe Canonical Triad Store & Raw Streaming (`INV-SMO-03`)**. `CanonicalTriadBackend` in `server/mcard-api.mjs` verifies digests over raw `Buffer` / `Uint8Array` bytes before UTF-8 decoding, preserving non-UTF-8 bytes for binary media files and streaming them safely via `GET /api/mcard/:hash/raw` with `X-Content-Type-Options: nosniff`.
4. **Universal 4-Modality Browser Projection (`INV-SMO-03`, `INV-SMO-04`)**. `js/landing-page-mcard.js`, `js/renderers/RendererRegistry.js`, `js/renderers/EmbedRenderer.js`, and `js/external-portal-membrane.js` project all content addresses across four explicit modalities:
   - **Modality 1 (Static Media)**: Binary media files (`image/*`, `audio/*`, `video/*`, `application/pdf`, 3D `.glb`) rendered with zero script execution.
   - **Modality 2 (Text & Structured Documents)**: Markdown, LaTeX, and text documents with sanitized markup and `[[hash]]` / `[[handle|label]]` transclusion resolution.
   - **Modality 3 (Source Code & CLM Descriptors)**: Inert line-numbered code view with zero script evaluation, enforcing the Inert Inspection Law (`INV-SMO-04` / `ULR-08`).
   - **Modality 4 (Executable Web Pages & Interactive Portals)**: Sandboxed iframe execution (`sandbox="allow-scripts allow-forms"`, omitting `allow-same-origin`) with `srcdoc` for inline HTML and `external-portal-membrane.js` with SSRF-guarded probing (`GET /api/mcard/probe-url`) for external portal cards.
5. **Documentation Hygiene & Architecture Canon (`INV-SMO-05`)**. Eliminated root markdown sprawl in `docs/`, created the authoritative architecture specification [`docs/01-architecture/UNIVERSAL_MCARD_BROWSER_ARCHITECTURE.md`](../../01-architecture/UNIVERSAL_MCARD_BROWSER_ARCHITECTURE.md), and synchronized `docs/INDEX.md` and `README.md`.

---

## Graduated Program SMO Sprints (`SMO-00` .. `SMO-05`)

| Sprint | Specification Document | Primary Focus & Deliverables | Verification Gate | Status |
| :--- | :--- | :--- | :--- | :---: |
| **SMO-00** | [`00-submodule-modularity-and-organizational-program-charter.md`](./00-submodule-modularity-and-organizational-program-charter.md) | Program Charter, 4-Modality browser taxonomy, invariants `INV-SMO-01..05`, and four-estate positioning | Program Charter Checklist & cross-estate review | ✅ Graduated |
| **SMO-01** | [`sprint-smo01-submodule-topology-and-monorepo-duality.md`](./sprint-smo01-submodule-topology-and-monorepo-duality.md) | Submodule topology, monorepo duality, binary-safe `CanonicalTriadBackend` byte verification, and streaming `GET /api/mcard/:hash/raw` | `node --test tests/single-page-mcard.test.mjs` | ✅ Graduated |
| **SMO-02** | [`sprint-smo02-published-kernel-consensus-and-dependency-parity.md`](./sprint-smo02-published-kernel-consensus-and-dependency-parity.md) | Published latest `clm-kernel@0.0.10` consensus across consumer submodules and `TypeInterpreter` / `detectMime` 4-modality classification in `server/mcard-modality.mjs` | `node ../mcard-studio/scripts/check-kernel-version-consensus.mjs` | ✅ Graduated |
| **SMO-03** | [`sprint-smo03-four-estate-cross-boundary-contracts.md`](./sprint-smo03-four-estate-cross-boundary-contracts.md) | Universal 4-modality browser dispatcher in `js/landing-page-mcard.js`, hardened `EmbedRenderer.js`, 4-modality sample corpus in `scripts/seed-portal-samples.mjs`, and `:5320` target allowlist | `node scripts/seed-portal-samples.mjs` + `single-page-mcard.test.mjs` | ✅ Graduated |
| **SMO-04** | [`sprint-smo04-documentation-hygiene-and-tier-reorganization.md`](./sprint-smo04-documentation-hygiene-and-tier-reorganization.md) | Relocate loose root docs into numbered tiers (`02-auth/`, `03-data/`, `06-components/games/`, `archive/`), author `UNIVERSAL_MCARD_BROWSER_ARCHITECTURE.md`, synchronize `docs/INDEX.md` | Zero loose root `.md` files; 100% link resolution | ✅ Graduated |
| **SMO-05** | [`sprint-smo05-master-readme-alignment-and-verification.md`](./sprint-smo05-master-readme-alignment-and-verification.md) | Master `README.md` overhaul for Universal MCard Browser & Testing Workbench, and full-program verification gate execution | `npm run test:unit` (97/97) + full SMO gate battery | ✅ Graduated |

---

## Program Invariants Record (`INV-SMO-01` .. `INV-SMO-05`)

- **`INV-SMO-01` (Submodule Sovereignty)**: Zero relative filesystem imports across `../clm` or `../mcard-studio` in `LandingPage` source or tests.
- **`INV-SMO-02` (Published Latest `clm-kernel` Consensus)**: Exact-pin parity to `0.0.10` across `package.json`, `package-lock.json`, and `recorder.js`, verified against the live npm registry.
- **`INV-SMO-03` (Universal 4-Modality MCard Content Browser Contract)**: Digest verification over raw bytes before string decoding; streaming `GET /api/mcard/:hash/raw`; `clm-kernel` `TypeInterpreter` classification across `media`, `document`, `code`, and `webapp`.
- **`INV-SMO-04` (Sandboxed Membrane and Inert Inspection Law)**: Zero raw `innerHTML` execution of untrusted HTML; sandboxed `iframe[sandbox="allow-scripts allow-forms"]` without `allow-same-origin`; inert syntax-escaped projection of source code.
- **`INV-SMO-05` (Documentation Hygiene and Contract D Modularity)**: Zero loose root markdown sprawl in `docs/`; 100% relative link integrity; all JavaScript modules obey Contract D (`<= 500` LOC).

---

## Authoritative Cross-Estate References

- **Universal Architecture Specification**: [`docs/01-architecture/UNIVERSAL_MCARD_BROWSER_ARCHITECTURE.md`](../../01-architecture/UNIVERSAL_MCARD_BROWSER_ARCHITECTURE.md)
- **Device-Sensitive Testing Infrastructure Guide**: [`docs/08-testing/DEVICE_SENSITIVE_TESTING_INFRASTRUCTURE.md`](../../08-testing/DEVICE_SENSITIVE_TESTING_INFRASTRUCTURE.md)
- **Graduated Program ERB Sprints Archive**: [`docs/sprints/08-testing/INDEX.md`](../08-testing/INDEX.md)
- **Parent Workspace Program RDS**: [`../../../../docs/sprints/programs/rds/README.md`](../../../../docs/sprints/programs/rds/README.md)
- **Workbench Program NP**: [`../../../../mcard-studio/docs/sprints/06-Shell-Runtime/README.md`](../../../../mcard-studio/docs/sprints/06-Shell-Runtime/README.md)
