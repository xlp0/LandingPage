# Data Management and MCard Storage Engine

| Field | Value |
| --- | --- |
| Audience | Developers and architects working with the SQLite Triad, MCard APIs, and rendering pipelines |
| BMAD Owner | Architect (`bmad-agent-architect`) and Developer (`bmad-agent-dev`) |
| Source of Truth | [`server/mcard-api.mjs`](../../server/mcard-api.mjs), [`server/mcard-modality.mjs`](../../server/mcard-modality.mjs), and [`server/test-run-api.mjs`](../../server/test-run-api.mjs) |
| Consensus Kernel | `clm-kernel@0.0.13` |

## Canonical Storage and Hash Authority

1. **Three-Table SQLite Triad (`data/mcard-api.db`, `data/samples/portal_samples.mcard.db`)** stores immutable payloads and mutable handle pointers across `card`, `handle_registry`, and `handle_history`.
2. **Published `clm-kernel@0.0.13` Consensus** powers server Blake3 hashing, 4-modality detection (`media`, `document`, `code`, `webapp`), Layer 1 `NetMCard` snapshots, Layer 4 `FiringReceiptMCard` receipts, and `js/harness/recorder.js` (`clmKernel: '0.0.13'`), while keeping historical `0.0.10` `responsive_test_run:v1` records readable.
3. **Three Distinct Hash Domains** separate server Triad Blake3 (`server/mcard-api.mjs`), browser-local IndexedDB SHA-256 (`public/js/mcard-kernel/compat.js`), and build-time PenPot graph SHA-256 (`scripts/penpot-zip.mjs`).

## Documents in This Section

- [MCARD_LIBRARY_STRATEGY.md](./MCARD_LIBRARY_STRATEGY.md) covers `clm-kernel@0.0.13` consensus and the three hash domains.
- [MCARD_LIBRARY_USAGE.md](./MCARD_LIBRARY_USAGE.md) covers `/api/mcard` and `/api/test-runs` endpoints on port `3000` (`3001` in Playwright).
- [MCARD_LIBRARY_ISSUE.md](./MCARD_LIBRARY_ISSUE.md) records resolved binary-streaming, provenance, and closed-schema issues.
- [MCARD-JS-SETUP.md](./MCARD-JS-SETUP.md) and [MCARD-UPDATE-2.1.13.md](./MCARD-UPDATE-2.1.13.md) cover `mcard-js` vendor bundle setup and history.
- [CONTENT_RENDERING_SYSTEM.md](./CONTENT_RENDERING_SYSTEM.md), [full-text-search.md](./full-text-search.md), [DUAL-SEARCH-SUMMARY.md](./DUAL-SEARCH-SUMMARY.md), [SEARCH-IMPLEMENTATION-SUMMARY.md](./SEARCH-IMPLEMENTATION-SUMMARY.md), [EDIT-PANEL-FEATURE.md](./EDIT-PANEL-FEATURE.md), and [mcard-handles-filter.md](./mcard-handles-filter.md) cover search and rendering features.
- [mcard/README.md](./mcard/README.md), [mcard/CLM_Language_Specification_v2.md](./mcard/CLM_Language_Specification_v2.md), and [mcard/how_to_use_mcard_js.md](./mcard/how_to_use_mcard_js.md) provide deep-dive tutorials and CLM specs.
