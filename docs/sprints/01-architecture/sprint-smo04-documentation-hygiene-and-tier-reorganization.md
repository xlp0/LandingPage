# Sprint SMO-04: Documentation Hygiene, Universal MCard Browser Canon, and Tier Reorganization

> **Status**: Graduated (2026-10-21) (`docs/sprints/01-architecture/`)
> **Program**: [Submodule Modularity, Universal MCard Content Browser, and Organizational Alignment (`Program SMO`)](./00-submodule-modularity-and-organizational-program-charter.md)
> **Sprint Code**: `SMO-04`
> **Invariants Enforced**: `INV-SMO-05` (Documentation Hygiene, 100% Link Integrity, and Tiered Organization)

---

## 1. Context and Architectural Goal

`LandingPage/docs/` currently mixes its numbered documentation tiers (`00-getting-started/` through `11-standards/`) with 16 loose root-level markdown files and legacy folders (`CHESS_GAME_DOCUMENTATION.md`, `DND_BALI_GAME_DOCUMENTATION.md`, `GO_GAME_DOCUMENTATION.md`, `MONOPOLY_GAME_DOCUMENTATION.md`, `GOOGLE_OAUTH_SETUP_GUIDE.md`, `ZITADEL_INTEGRATION_GUIDE.md`, `ZITADEL_SETUP_INSTRUCTIONS.md`, `MCARD-JS-SETUP.md`, `MCARD_LIBRARY_ISSUE.md`, `MCARD_LIBRARY_STRATEGY.md`, `MCARD_LIBRARY_USAGE.md`, `PHASE1_COMPLETE.md`, `PKC_ZITADEL_Game_Board_Planning.md`, `REORGANIZATION_PROPOSAL.md`, `Dungeons and Dragons/`). In addition, `LandingPage/docs/01-architecture/` lacks a canonical specification describing how `LandingPage` functions as a Universal 4-Modality MCard Content Browser and Device-Sensitive Testing Workbench.

`SMO-04` eliminates root documentation sprawl in `LandingPage/docs/`, authors the canonical architecture specification for the Universal 4-Modality MCard Content Browser, and updates `docs/INDEX.md` and `docs/README.md` so every markdown link resolves cleanly.

---

## 2. Concrete Implementation Deliverables

### 2.1 Canonical Architecture Specification (`docs/01-architecture/UNIVERSAL_MCARD_BROWSER_ARCHITECTURE.md`)
- Create `LandingPage/docs/01-architecture/UNIVERSAL_MCARD_BROWSER_ARCHITECTURE.md` documenting:
  1. The 3-table Canonical Triad SQLite store (`card`, `handle_registry`, `handle_history`) and binary-safe raw byte verification (`GET /api/mcard/:hash/raw`) in [`server/mcard-api.mjs`](../../../server/mcard-api.mjs).
  2. The `clm-kernel@0.0.10` `TypeInterpreter` / `detectMime` judgment pipeline and its mapping to the four content modalities (`media`, `document`, `code`, `webapp`).
  3. The browser projection and security contracts in [`js/landing-page-mcard.js`](../../../js/landing-page-mcard.js), [`js/renderers/RendererRegistry.js`](../../../js/renderers/RendererRegistry.js), [`js/renderers/EmbedRenderer.js`](../../../js/renderers/EmbedRenderer.js), and [`js/external-portal-membrane.js`](../../../js/external-portal-membrane.js) (zero-script static media, sanitized documents with `[[hash]]` transclusion, inert source-code inspection, and sandboxed `iframe[srcdoc]` / URL membrane execution).
  4. Interoperability with `mcard-studio@0.0.3` (`@mcard/studio@0.0.3` viewlets, `ResponsiveViewportLabViewlet`, and `?card=<hash>&handle=<handle>` deep links).

### 2.2 Relocation of Loose Root Documentation into Numbered Tiers
- Relocate loose root files in `LandingPage/docs/` into their authoritative tiers using `git mv`:
  - **Authentication (`docs/02-authentication/`)**: `GOOGLE_OAUTH_SETUP_GUIDE.md`, `ZITADEL_INTEGRATION_GUIDE.md`, `ZITADEL_SETUP_INSTRUCTIONS.md`.
  - **Data Management (`docs/03-data-management/`)**: `MCARD-JS-SETUP.md`, `MCARD_LIBRARY_STRATEGY.md`, `MCARD_LIBRARY_USAGE.md`.
  - **Components & Interactive Applets (`docs/06-components/games/`)**: `CHESS_GAME_DOCUMENTATION.md`, `DND_BALI_GAME_DOCUMENTATION.md`, `GO_GAME_DOCUMENTATION.md`, `MONOPOLY_GAME_DOCUMENTATION.md`, and `Dungeons and Dragons/` (normalized to `docs/06-components/games/dnd/`).
  - **Historical Archive (`docs/archive/`)**: `MCARD_LIBRARY_ISSUE.md`, `PHASE1_COMPLETE.md`, `PKC_ZITADEL_Game_Board_Planning.md`, `REORGANIZATION_PROPOSAL.md`.
- Retain only `README.md`, `INDEX.md`, `STATUS.md`, and `bmm-workflow-status.yaml` at the root of `LandingPage/docs/`.

### 2.3 `docs/INDEX.md` and `docs/README.md` Synchronization
- Update [`LandingPage/docs/INDEX.md`](../../INDEX.md) and [`LandingPage/docs/README.md`](../../README.md) so every relocated document, numbered tier (`00` through `11`), and active sprint (`docs/sprints/_active/`) is indexed with valid relative links.

---

## 3. Definition of Done (DoD) and Verification Commands

- [x] **DoD-SMO-04-01 (Zero Unindexed Root Markdown Sprawl in `LandingPage/docs/`)**:
  Only `README.md`, `INDEX.md`, and `STATUS.md` remain as root `.md` files in `LandingPage/docs/`:
  ```bash
  test "$(find docs -maxdepth 1 -name '*.md' ! -name 'README.md' ! -name 'INDEX.md' ! -name 'STATUS.md' | wc -l | tr -d ' ')" = "0"
  ```
- [x] **DoD-SMO-04-02 (Universal MCard Browser Architecture Spec Present)**:
  ```bash
  test -f docs/01-architecture/UNIVERSAL_MCARD_BROWSER_ARCHITECTURE.md
  ```
- [x] **DoD-SMO-04-03 (100% Relative Link Resolution in `docs/INDEX.md` and `docs/README.md`)**:
  Every relative markdown link in `LandingPage/docs/INDEX.md` and `LandingPage/docs/README.md` resolves to an existing path on disk.
