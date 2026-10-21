# 💾 Data Management & MCard Storage Engine

This directory documents the data management subsystem, content-addressed storage (CAS), the canonical SQLite Triad engine, and the polymorphic content rendering pipeline.

---

## 🎯 Architecture & Data Flow

Within the `MCard_TDD` framework, `LandingPage` fulfills two critical data responsibilities:
1. **Single-Page MCard Distillation (`SMR-09`)**: Emits the landing page as an immutable, content-addressed MCard (`urn:mcard:content:landing_page`) via `js/landing-page-mcard.js`.
2. **Canonical Triad SQLite Engine (`data/mcard-api.db`)**: Stores both the 6-sample portal corpus (`data/samples/portal_samples.mcard.db`) and responsive test-run telemetry sessions using the canonical 3-table schema (`cards`, `handles`, `blobs`).

---

## 📚 Documents in This Section

### Strategy & Monorepo Consensus
- **[MCARD_LIBRARY_STRATEGY.md](MCARD_LIBRARY_STRATEGY.md)** — Monorepo kernel consensus (`clm-kernel@0.0.9`), zero duplicate hash providers, and Triad SQLite schema.
- **[MCARD_LIBRARY_USAGE.md](MCARD_LIBRARY_USAGE.md)** — Usage patterns for distillation, card queries, and `/api/test-runs` REST endpoints.
- **[MCARD_LIBRARY_ISSUE.md](MCARD_LIBRARY_ISSUE.md)** — Past issues and verified mitigations (100KB body limit, ESM migration, hash alignment).
- **[MCARD-JS-SETUP.md](MCARD-JS-SETUP.md)** — Historical setup guide and migration to unified kernel imports.
- **[MCARD-UPDATE-2.1.13.md](MCARD-UPDATE-2.1.13.md)** — Historical library update records.

### Content Rendering & Search
- **[CONTENT_RENDERING_SYSTEM.md](CONTENT_RENDERING_SYSTEM.md)** — Polymorphic rendering pipeline (Markdown, KaTeX/MathJax, Three.js 3D, Mermaid, SVG).
- **[full-text-search.md](full-text-search.md)** — Full-text search over card contents and titles.
- **[DUAL-SEARCH-SUMMARY.md](DUAL-SEARCH-SUMMARY.md)** — Integrated search across local IndexedDB and server SQLite.
- **[SEARCH-IMPLEMENTATION-SUMMARY.md](SEARCH-IMPLEMENTATION-SUMMARY.md)** — Search indexing architecture.
- **[EDIT-PANEL-FEATURE.md](EDIT-PANEL-FEATURE.md)** — In-browser MCard content authoring and editing panel.
- **[mcard-handles-filter.md](mcard-handles-filter.md)** — Handle pointer filtering and resolution logic.

### Deep Dives
- **[mcard/](mcard/)** — MCard specification folder:
  - `CLM_Language_Specification_v2.md` — Cubical Logic Model formal language spec v2.
  - `how_to_use_mcard_js.md` — Developer tutorial for card creation and querying.

---

## 🧭 Related Functional Tiers

- [**01-architecture/**](../01-architecture/README.md) — Four-Estate monorepo architecture.
- [**08-testing/**](../08-testing/README.md) — Test-run schema validation and Blake3 content addressing (`INV-ERB-04`).
- [**06-components/**](../06-components/README.md) — UI components consuming MCard data.
