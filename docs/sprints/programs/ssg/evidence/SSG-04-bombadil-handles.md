# Program SSG Sprint `SPRINT-SSG-04` verification evidence

| Field | Value |
| --- | --- |
| Sprint | [`../SPRINT-SSG-04-bombadil-handles-and-runner-api.md`](../SPRINT-SSG-04-bombadil-handles-and-runner-api.md) |
| Decisions Ledger | [`../DECISIONS.tsv`](../../../_active/DECISIONS.tsv) |
| Design Contract | [`../../../06-components/STAGESHOW_DESIGN_CONTRACT.md`](../../../../06-components/STAGESHOW_DESIGN_CONTRACT.md) |
| Verified Date | `2026-11-20` |

## Bombadil schemas, subprocess isolation, and runner API (`DoD-SSG-04-01`)

- Extended [`../../../../js/harness/test-run-schema.js`](../../../../../js/harness/test-run-schema.js) with `BOMBADIL_TRIGGER_SCHEMA` (`urn:ssg:bombadil-trigger:v1`), `BOMBADIL_RUN_SCHEMA` (`urn:ssg:bombadil-run:v1`), `BOMBADIL_COVERAGE_SCHEMA` (`urn:ssg:bombadil-coverage:v1`), `BOMBADIL_TARGETS`, `BOMBADIL_RUN_STATUSES`, `BOMBADIL_TIME_LIMIT_RE`, and validator dispatch inside `validateTestRun()` while leaving closed `responsive_test_run:v1` fields untouched.
- Hardened [`../../../../scripts/bombadil/run.mjs`](../../../../../scripts/bombadil/run.mjs) with `stripServerContractImport()` and env scrubbing in `resolveRunPlan()`, clearing inherited `PORT`, `PW_REUSE_SERVER`, `PW_EPHEMERAL_MCARD_DB`, `PW_SERVER_BOOT_GUARD`, and `server-contract.js` `NODE_OPTIONS` tokens from `bombadilEnv` while setting `BOMBADIL_CHILD_RUN=1` on spawned target servers and preserving repository-DB refusal.
- Created [`../../../../server/bombadil-runner-service.mjs`](../../../../../server/bombadil-runner-service.mjs) and registered all `8` literal Bombadil REST + SSE routes in [`../../../../server/test-run-api.mjs`](../../../../../server/test-run-api.mjs) before `/:hash` without altering `ws-server.js` (`GET /bombadil/handles`, `POST /bombadil/trigger`, `POST /bombadil/stop`, `POST /bombadil/shrink`, `GET /bombadil/runs`, `GET /bombadil/run?runId=`, `GET /bombadil/coverage`, `GET /bombadil/stream`).
- Verified single-flight `409` mutex, `{ childRun, triggerEnabled: false }` + `403` child recursion protection, ephemeral port allocation via `getFreePort()`, temp output directories under `os.tmpdir()`, non-canary coverage rollup into `urn:mcard:bombadil:coverage:latest`, `204` idle SSE / `'job-error'` terminal events, `SIGTERM` stop handling, and isolated hermetic `shrink` (`400` on multi-entry `page-load` and missing trace).
- `[Observed-CLI]` `node --test tests/unit/bombadil-dashboard-api.test.mjs tests/unit/test-run-schema.test.mjs tests/unit/bombadil-runner.test.mjs` passed `36/36` across `3` suites (`794.7ms`).

## Browser event handles, Petri net alignment, and parity gates (`DoD-SSG-04-02`)

- Created [`../../../../js/harness/bombadil-client.js`](../../../../../js/harness/bombadil-client.js) and wired it into [`../../../../js/harness/lab-api.js`](../../../../../js/harness/lab-api.js) and [`../../../../js/harness/lab-runtime.js`](../../../../../js/harness/lab-runtime.js), exposing `window.__lab.bombadil`, handling inbound `lab:bombadil-command`, dispatching outbound `lab:bombadil-state`, restricting `openTarget` to single-page framed targets (`spa` and `spa-canary`), and streaming SSE via `fetch` `ReadableStream` only during active runs.
- Added `8` `kind: pending` places (`p_pending_bombadil_*`) and `24` transitions (`t_req_bombadil_*`, `t_ok_bombadil_*`, `t_fail_bombadil_*`) anchored on `p_page_responsive_lab` inside [`../../../../src/net/workbench-net.yaml`](../../../../../src/net/workbench-net.yaml), and regenerated [`../../../../tests/bombadil/generated/workbench-net.ts`](../../../../../tests/bombadil/generated/workbench-net.ts) and [`../../../01-architecture/workbench-net.md`](../../../../01-architecture/workbench-net.md) (`40` places, `90` transitions).
- `[Observed-CLI]` `node scripts/check-package-source-parity.mjs && npm run check:net && npm run check:bombadil-nets` passed (`[parity-ok] pairs=4 uiCalls=22`, `landingpage-workbench-net places=40 transitions=90 reachableMarkings=39 sessionPInvariant=true`, `[bombadil:nets] PASS`).
- `[Observed-CLI]` `npx playwright test tests/features/responsive-lab-islands.spec.js --project=features` passed `9/9` (`25.9s`), verifying zero client `clm-kernel` leaks and baseline return across `50` transitions.

## Core static, unit, and build gates (`DoD-SSG-04-03`)

- `[Observed-CLI]` Verified `stageshow:check-css`, `node scripts/check-package-source-parity.mjs`, `npm run check:explorable-gui`, `npm run check:net`, `npm run check:bombadil-nets`, `npm run check:playwright-discovery`, `npm run docs:check`, `npm run test:unit`, `npm run build`, untouched `ws-server.js` / `src/pages/fiber-conformance.astro`, and empty `git status --porcelain -- data/`.
