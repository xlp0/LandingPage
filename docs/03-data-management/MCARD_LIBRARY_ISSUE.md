# MCard Library Historical Issues and Verified Mitigations

| Field | Value |
| --- | --- |
| Audience | Maintainers diagnosing MCard ingestion, body-limit, or hash-verification behavior |
| BMAD Owner | Architect (`bmad-agent-architect`) and Developer (`bmad-agent-dev`) |
| Source of Truth | [`server/mcard-api.mjs`](../../server/mcard-api.mjs), [`js/harness/recorder.js`](../../js/harness/recorder.js), and [`scripts/build-mcard-bundle.js`](../../scripts/build-mcard-bundle.js) |
| Drift Gate | `npm run test:unit` and `npm run docs:check` |

## Resolved Integration Issues

1. **Binary Corruption During UTF-8 Coercion (`SMO-01`)**
   Resolved by verifying `clm-kernel@0.0.13` digests over raw `Buffer` bytes (`toRawBuffer`) in `CanonicalTriadBackend.get(hash)` and streaming media via `GET /api/mcard/:hash/raw` before any text decoding.
2. **Client vs Server Kernel Version Skew (`SPRINT-GQC-05`, `SPRINT-GQC-07`)**
   `js/harness/recorder.js` previously stamped `lab.clmKernel: '0.0.10'` after the server upgraded to `clm-kernel@0.0.12`. `recorder.js` now exports `DEFAULT_CLM_KERNEL_VERSION = '0.0.13'` (with injectable `clmKernelVersion`), while `validateTestRun` and `parseStoredTestRunRecord` continue reading historical `0.0.10` records without mutation.
3. **Closed `responsive_test_run:v1` Top-Level Schema vs Petri Net Linkage (`SPRINT-GQC-05`)**
   Adding navigation fields directly to `responsive_test_run:v1` would violate its closed 12-key contract. Navigation receipts instead link through a separate `urn:gqc:navigation-run-link:v1` MCard (`nav_run_link_<runHash>`) verified against the Triad.
4. **Browser Bundler Node Builtin Shims (`CLA-05`)**
   [`scripts/build-mcard-bundle.js`](../../scripts/build-mcard-bundle.js) uses an inline esbuild `node-noop` plugin for legacy vendor bundles, while Astro Preact islands never import `clm-kernel` or Node `crypto`.
