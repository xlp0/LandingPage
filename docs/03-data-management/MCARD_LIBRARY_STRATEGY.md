# MCard Library Strategy and Three Hash Domains

| Field | Value |
| --- | --- |
| Audience | Architects and developers maintaining MCard storage, kernel pins, and browser compatibility modules |
| BMAD Owner | Architect (`bmad-agent-architect`) |
| Source of Truth | [`package.json`](../../package.json), [`server/mcard-api.mjs`](../../server/mcard-api.mjs), [`server/mcard-modality.mjs`](../../server/mcard-modality.mjs), and [`public/js/mcard-kernel/compat.js`](../../public/js/mcard-kernel/compat.js) |
| Consensus Kernel | `clm-kernel@0.0.13` |

## Published Kernel Pin (`clm-kernel@0.0.13`)

`LandingPage` consumes published `clm-kernel@0.0.13` across `package.json`, `package-lock.json`, `server/mcard-modality.mjs` (`KERNEL_PROVENANCE = 'clm-kernel@0.0.13'`), and `js/harness/recorder.js` (`DEFAULT_CLM_KERNEL_VERSION = '0.0.13'`). Historical `responsive_test_run:v1` records written under earlier `0.0.10` SMO milestones remain readable without rewriting.

## Three Distinct Hash Domains

1. **Triad Blake3 (`server/mcard-api.mjs`, `server/test-run-api.mjs`)** uses `clm-kernel@0.0.13` over raw bytes or `canonicalJson()` payloads in SQLite (`card`, `handle_registry`, `handle_history`). It is the sole authoritative hash for server MCards, `NetMCard`, `FiringReceiptMCard`, `responsive_test_run:v1`, and certification records.
2. **Browser Compatibility Hash (`public/js/mcard-kernel/compat.js`)** computes Web Crypto SHA-256 keys strictly for local IndexedDB entries inside `app.html` (`MCardManager`). It is never accepted as a server Triad Blake3 digest.
3. **PenPot Navigation Graph Hash (`scripts/penpot-zip.mjs`)** computes build-time SHA-256 digests over `design/landing-navigation.penpot` to guard `js/nav.js` against design drift.

See [LandingPage Architecture](../01-architecture/landing-page-architecture.md) and [MCard Modular Architecture](../01-architecture/MCARD_MODULAR_ARCHITECTURE.md) for package parity rules.
