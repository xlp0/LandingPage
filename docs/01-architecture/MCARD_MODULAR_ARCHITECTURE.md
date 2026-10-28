# MCard Modular and Package Ownership Architecture

| Field | Value |
| --- | --- |
| Audience | Developers and architects maintaining MCard server persistence, browser compatibility shims, and `packages/*` workspaces |
| BMAD Owner | Architect (`bmad-agent-architect`) and Developer (`bmad-agent-dev`) |
| Source of Truth | [`server/mcard-api.mjs`](../../server/mcard-api.mjs), [`public/js/mcard-kernel/compat.js`](../../public/js/mcard-kernel/compat.js), [`scripts/package-source-parity.json`](../../scripts/package-source-parity.json), and [`scripts/check-package-source-parity.mjs`](../../scripts/check-package-source-parity.mjs) |
| Drift Gate | `node scripts/check-package-source-parity.mjs` and `npm run docs:check` |

## Server Kernel vs Browser Compatibility Boundary

`LandingPage` enforces a strict runtime boundary between server-side content addressing and browser-side UI modules.

1. **Server Authority (`clm-kernel@0.0.13`).** [`server/mcard-api.mjs`](../../server/mcard-api.mjs), [`server/mcard-modality.mjs`](../../server/mcard-modality.mjs), [`server/test-run-api.mjs`](../../server/test-run-api.mjs), and [`scripts/net-to-netmcard.mjs`](../../scripts/net-to-netmcard.mjs) run exclusively in Node and delegate Blake3 hashing, MIME/type interpretation, Layer 1 Petri net assembly (`NetMCard`), and Layer 4 firing receipts (`FiringReceiptMCard`) to `clm-kernel@0.0.13`.
2. **Browser Compatibility Layer (`public/js/mcard-kernel/`).** Legacy Mission Control (`/app.html`) loads [`public/js/mcard-kernel/MCardManager.js`](../../public/js/mcard-kernel/MCardManager.js) and [`public/js/mcard-kernel/compat.js`](../../public/js/mcard-kernel/compat.js) for browser-local IndexedDB card management. `compat.js` computes Web Crypto SHA-256 keys strictly for local IndexedDB entries and never substitutes for server Triad Blake3 digests.
3. **Zero Kernel Imports in Astro Islands.** None of the seven Preact islands in [`src/islands/`](../../src/islands/) or harness modules in [`js/harness/`](../../js/harness/) import `clm-kernel` or Node `crypto`.

## Canonical Three-Table SQLite Triad

All server-persisted MCards, test runs, Petri nets, firing receipts, and run-link cards share the same three-table SQLite schema in `data/mcard-api.db` (and `data/samples/portal_samples.mcard.db`).

| Table | Columns | Purpose |
| --- | --- | --- |
| `card` | `hash`, `content`, `g_time` | Immutable content-addressed payload store verified on read |
| `handle_registry` | `handle`, `hash`, `g_time` | Mutable pointer from stable logical handle (such as `landing_page` or `nav_run_link_<runHash>`) to current card `hash` |
| `handle_history` | `handle`, `hash`, `g_time` | Append-only audit log of prior handle bindings |

## Workspace Package Ownership (`packages/*` vs `js/*`)

[`scripts/package-source-parity.json`](../../scripts/package-source-parity.json) and [`scripts/check-package-source-parity.mjs`](../../scripts/check-package-source-parity.mjs) govern the four workspace packages under [`packages/`](../../packages/).

| Workspace Package | Root Runtime Counterpart | Ownership Classification | Enforcement Rule |
| --- | --- | --- | --- |
| `@pkc/markdown-renderer` (`packages/markdown-renderer`) | `js/modules/markdown-renderer/index.js` | `shared-source` | `packages/markdown-renderer/src/index.js` is canonical, builds to `dist/index.js`, and is re-exported in-repo |
| `@pkc/core` (`packages/core`) | `js/pkc-core.js` | `separate-product-variant` | Distinct lifecycle semantics (`js/pkc-core.js` enforces `owner`/`required` startup and reverse `stop()` teardown) |
| `@pkc/p2p` (`packages/p2p`) | `js/modules/p2p-serverless/` | `unmigrated-exact-copy-gated` | SHA-256 parity locked by `check-package-source-parity.mjs` until a dedicated build-pipeline sprint |
| `pkc-server` (`packages/server`) | `ws-server.js` | `unused-package-copy` | Root `ws-server.js` is the sole supported LandingPage server; `packages/server` is dormant and SHA-locked against accidental edits |

See [LandingPage Architecture](./landing-page-architecture.md) and [Data Management Overview](../03-data-management/README.md) for REST endpoint and sample corpus details.
