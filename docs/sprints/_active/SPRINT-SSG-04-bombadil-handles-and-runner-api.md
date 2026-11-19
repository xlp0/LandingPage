# SPRINT-SSG-04 Bombadil handles and runner API

## Metadata

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-SSG-04` |
| Source of Truth | [`./ssg-plan.md`](./ssg-plan.md) and [`./INDEX.md`](./INDEX.md) |
| Handle | `urn:pcard:sprint:SPRINT-SSG-04` |
| Status | `PLANNED` |
| Depends on | `SPRINT-SSG-02` |
| Unblocks | `SPRINT-SSG-05` |
| Execution unit | `PR-SSG-04` |
| Poteto playbook | `feature` with `principle-build-the-lever` and `principle-boundary-discipline` |
| BMAD roles | Architect, Developer, Product Manager, TEA |
| Effort | 3 days (guess) |

## Outcome

LandingPage gains the complete backend, MCard handle storage, Petri net declarations, and browser programmatic/DOM event handles required to execute, monitor, stop, shrink, and inspect Bombadil runs from the workbench dashboard. Runs trigger safely by spawning `node scripts/bombadil/run.mjs <target> --time-limit <duration> --output-path <tmpDir>` via `child_process.spawn` (following `scripts/bombadil/canary.mjs:61-70`, inheriting `resolveRunPlan` and `runPlan(..., { handleSignals: true })` inside a piped subprocess while stripping inherited `MCARD_DB_PATH`/`PW_*` overrides and setting `BOMBADIL_CHILD_RUN=1` on all spawned target servers), protected by strict target allowlists, a single-flight mutex (`409`), loopback execution enabled by default unless `BOMBADIL_CHILD_RUN === '1'` or `BOMBADIL_ENABLE_RUNNER === '0'` (`{ childRun: true, triggerEnabled: false }` on child `/handles`, plus `403` defense-in-depth), and dynamically assigned ephemeral ports (`getFreePort`).

## Work sequence

1. Define Bombadil MCard schemas in `js/harness/test-run-schema.js` (`RECOGNIZED_RUN_SCHEMAS` extended without modifying closed `responsive_test_run:v1`) and handle bindings in `server/test-run-api.mjs`:
   - `BOMBADIL_TRIGGER_SCHEMA = 'urn:ssg:bombadil-trigger:v1'` bound to `urn:mcard:bombadil:trigger:<target>` (`target` in `'spa' | 'spa-canary' | 'lab-smoke' | 'page-load' | 'workbench'`, matching `TARGETS` in `scripts/bombadil/run.mjs:18-29`). Payload holds `{ schema, triggerId, handle, target, timeLimit, minFirings, requestedBy, requestedAt }`.
   - `BOMBADIL_RUN_SCHEMA = 'urn:ssg:bombadil-run:v1'` bound to `urn:mcard:bombadil:run:<runId>` and `urn:mcard:bombadil:latest:<target>`. Payload holds `{ schema, runId, triggerHash, target, status, exitCode, startedAt, finishedAt, durationMs, actionsCount, firingsCount, distinctTransitions, quiescenceWarnings, violations, outputDir, shrunkTracePath, reproduceCommand, shrinkCommand }`. Write `'queued'`/`'running'` run MCard upfront and bind `latest:<target>` on completion.
   - `BOMBADIL_COVERAGE_SCHEMA = 'urn:ssg:bombadil-coverage:v1'` bound to `urn:mcard:bombadil:coverage:latest`, storing `Asserted`, `ExploredOnly`, `NeverFired`, and `rejectedTraces` summaries per net computed by `scripts/check-net.mjs`.
2. Harden `scripts/bombadil/run.mjs` and author `server/bombadil-runner-service.mjs` reusing `TARGETS` from `scripts/bombadil/run.mjs`, the CLI subprocess spawn pattern from `scripts/bombadil/canary.mjs:61-70` (inheriting `resolveRunPlan` and `runPlan` with `handleSignals: true` inside the child process rather than calling `stdio: 'inherit'` `runPlan()` in-process inside Express), `scripts/bombadil/trace-to-net.mjs` (`findTraceFilesDeep` for multi-entry `page-load` `entry-*/trace.jsonl`), and `scripts/check-net.mjs` (zero edits to `ws-server.js` or `scripts/package-source-parity.json` server SHA locks):
   - In `scripts/bombadil/run.mjs:91,123`, preserve existing `resolveRunPlan` repository-DB refusal (`server-contract.js:57-59`) and CLI default `repoRoot/bombadil-output/...` (`tests/unit/bombadil-runner.test.mjs:49-75`), while scrubbing inherited `PORT`, `PW_REUSE_SERVER`, `PW_EPHEMERAL_MCARD_DB`, and `PW_SERVER_BOOT_GUARD` prior to calling `resolvePlaywrightServerContract` (as well as from `bombadilEnv` and `serverEnv`), stripping any `--import <url>` two-token pair or `--import=<url>` token referencing `server-contract.js` from `bombadilEnv.NODE_OPTIONS` (`server-contract.js:24-30`), and injecting `BOMBADIL_CHILD_RUN: '1'` across spawned target servers. Inside `server/bombadil-runner-service.mjs`, allocate `tmpDir` inside `os.tmpdir()` and spawn `process.execPath` (`node`) with `['scripts/bombadil/run.mjs', target, '--time-limit', timeLimit, '--output-path', tmpDir]` (`shell: false`, `stdio: ['ignore', 'pipe', 'pipe']`, `BOMBADIL_PORT` set from `getFreePort()`, and inherited `MCARD_DB_PATH` removed from child `env`).
   - Enforce single-flight job mutex (`409 Conflict` when another job is `queued` or `running`), allow loopback execution by default unless `process.env.BOMBADIL_CHILD_RUN === '1'` (returning `403`) or `process.env.BOMBADIL_ENABLE_RUNNER === '0'` (returning `403`), validate `target` against `TARGETS` keys and `timeLimit` against `/^(?:(?:[1-9]\d|[1-8]\d{2}|900)s|(?:1[0-5]|[1-9])m)$/`, reap active child PIDs on Express `SIGINT`/`SIGTERM`, and provide `stop()` sending `SIGTERM` (`5s` -> `SIGKILL`) to the `run.mjs` child PID so its `handleSignals` teardown stops both `bombadil` and its target server.
   - Implement `shrink(runId)` by spawning an isolated hermetic server (`BOMBADIL_CHILD_RUN=1`) and invoking `bombadil browser shrink --headless --output-path <outDir> --time-limit <duration> --trace <tracePath> [--allow-url <pattern>] [--no-sandbox] <origin> [<spec>]` (`@antithesishq/bombadil@0.7.10` CLI verified), passing `TARGETS[run.target].spec` as `<spec>` when defined so custom LTL properties and action generators execute during shrinking, reaping its PID on cancel, recording `<outDir>` in `shrunkTracePath`, and returning `400` for multi-entry targets like `page-load` that lack a single `<origin>` URL or when trace files are missing.
   - Parse stdout/stderr and tail `trace.jsonl` (or `entry-*/trace.jsonl`) incrementally to update action counts, violation counts, and current `Place`, persisting final `urn:ssg:bombadil-run:v1` (`urn:mcard:bombadil:run:<runId>` and `urn:mcard:bombadil:latest:<target>`) on exit and invoking `trace-to-net` and `check-net` coverage rollup into `urn:ssg:bombadil-coverage:v1` (`urn:mcard:bombadil:coverage:latest`) only when `target !== 'spa-canary'` so bug-seeded `spa-canary` runs never overwrite real coverage totals (`scripts/check-net.mjs:852` `excludeCanary`).
3. Extend `createTestRunRouter({ storage, targetEnvelopes = null, beforeLinkHandleBind = null, runnerService = null })` (`server/test-run-api.mjs`, defaulting `runnerService` lazily to `createBombadilRunnerService({ storage })` so SHA-locked `ws-server.js:180` needs zero edits) and register all `8` literal Bombadil routes **before** wildcard `router.get('/:hash')` (`line 641`) so `scripts/check-net.mjs:551-569` `extractMountedExpressEndpoints` sees every path directly:
   - `GET /api/test-runs/bombadil/handles` (lists trigger handle catalog, defaults, active job state, and `{ childRun: process.env.BOMBADIL_CHILD_RUN === '1', triggerEnabled }` so child Bombadil sessions render disabled buttons and avoid `403` noise under `noUnexpectedHttpErrors`)
   - `POST /api/test-runs/bombadil/trigger` (`handle`, `target`, `timeLimit`, `minFirings`, `requestedBy`; creates trigger MCard, spawns run, returns `202` with `runId`, `triggerHandle`, `triggerHash`, `runHandle`, `streamUrl`)
   - `POST /api/test-runs/bombadil/stop` (stops active `runId` and marks status `'stopped'`)
   - `POST /api/test-runs/bombadil/shrink` (runs hermetic shrink against a violated single-entry `runId` and updates MCard with shrunk trace path and steps)
   - `GET /api/test-runs/bombadil/runs` (returns `200` `{ runs: [] }` when empty) and `GET /api/test-runs/bombadil/run?runId=<id>` (query-parameterized so `resolveArgEndpoint` AST checks and literal endpoint matching pass)
   - `GET /api/test-runs/bombadil/coverage` (returns `200` `{ empty: true, nets: {} }` when idle, or latest coverage MCard)
   - `GET /api/test-runs/bombadil/stream` (returns `204 No Content` when no job is running; emits `progress`, `violation`, `complete`, and `'job-error'` events while active and closes immediately on terminal state)
   - Support injected stub `runnerService` or `BOMBADIL_ENABLE_RUNNER === '0'` in automated unit/Playwright harnesses (gating live subprocess tests in `tests/unit/bombadil-dashboard-api.test.mjs` behind `BOMBADIL_LIVE_UNIT=1`).
4. Create `js/harness/bombadil-client.js` and extend `js/harness/lab-api.js` (`window.__lab.bombadil`, keeping `window.__lab.version === 1`):
   - Expose `window.__lab.bombadil = { handles, trigger, stop, shrink, openTarget, status, runs, coverage, subscribe }`, restricting `openTarget` (`Load Target in Stage`) to single-page framed targets (`spa`, `spa-canary`).
   - Listen for inbound DOM `CustomEvent('lab:bombadil-command')` (`detail.action` in `'trigger' | 'stop' | 'shrink' | 'refresh' | 'open-target'`) and emit outbound DOM `CustomEvent('lab:bombadil-state')` (`detail: { runId, target, status, actionsCount, currentPlaceId, violations, triggerHandle }`).
   - Stream `/api/test-runs/bombadil/stream` via `fetch('/api/test-runs/bombadil/stream', { signal })` with `ReadableStream` SSE line framing **only** while `status === 'queued' || status === 'running'` (`AbortController` closes immediately on terminal state), ensuring every `fetch(...)` inside `js/harness/bombadil-client.js` passes explicit literal endpoint strings/templates (`/api/test-runs/bombadil/run?...`) and inline literal `method: 'POST'` inside POST calls (`scripts/check-package-source-parity.mjs:162-173,366-367`).
5. Model all `8` Bombadil API endpoints in `src/net/workbench-net.yaml` anchored on `p_page_responsive_lab` via explicit `kind: pending` Places (`p_pending_bombadil_handles`, `p_pending_bombadil_trigger`, `p_pending_bombadil_stop`, `p_pending_bombadil_shrink`, `p_pending_bombadil_runs`, `p_pending_bombadil_run`, `p_pending_bombadil_coverage`, `p_pending_bombadil_stream`) and `server-call-request` / `server-call-ok` / `server-call-fail` triples `(t_req_bombadil_<op>, t_ok_bombadil_<op>, t_fail_bombadil_<op>)` returning directly to `p_page_responsive_lab` (keeping client run states `idle | queued | running` inside `bombadil-client.js` and preserving 1-safe `sessionPInvariant: true` without unreached `p_error_*` places), regenerate `tests/bombadil/generated/workbench-net.ts` (`npm run bombadil:nets`) and `docs/01-architecture/workbench-net.md` (`npm run docs:gen-net`), and write `tests/unit/bombadil-dashboard-api.test.mjs`.
6. Record verification metrics in `docs/sprints/_active/evidence/SSG-04-bombadil-handles.md` and append completion row to [`./DECISIONS.tsv`](./DECISIONS.tsv).

## Files

- Create `server/bombadil-runner-service.mjs` and `js/harness/bombadil-client.js`
- Edit `scripts/bombadil/run.mjs`, `server/test-run-api.mjs`, `js/harness/test-run-schema.js`, and `js/harness/lab-api.js`
- Edit `src/net/workbench-net.yaml`, `docs/01-architecture/workbench-net.md`, `tests/bombadil/generated/workbench-net.ts`, and `tests/unit/test-run-schema.test.mjs`
- Create `tests/unit/bombadil-dashboard-api.test.mjs` and `docs/sprints/_active/evidence/SSG-04-bombadil-handles.md`
- Append row to [`./DECISIONS.tsv`](./DECISIONS.tsv)

## BMAD responsibilities

### Architect

- Verify `ws-server.js` remains untouched (`check-package-source-parity.mjs` SHA lock preserved), verify `/api/test-runs/bombadil/*` routes register above `/:hash` (`GQC-05` placement rule), and verify `BOMBADIL_CHILD_RUN=1` plus `MCARD_DB_PATH` isolation in `scripts/bombadil/run.mjs`.

### Developer

- Implement `server/bombadil-runner-service.mjs` spawning `scripts/bombadil/run.mjs` (inheriting `resolveRunPlan` / `runPlan`), MCard schemas, `/api/test-runs/bombadil/*` REST + `fetch` SSE endpoints, `js/harness/bombadil-client.js`, and `window.__lab.bombadil` / `lab:bombadil-*` event handles.

### Product Manager

- Sign off on the exposed Bombadil trigger handles (`spa`, `spa-canary`, `lab-smoke`, `page-load`, `workbench`), `openTarget` framed allowlist (`spa`, `spa-canary`), and `urn:mcard:bombadil:*` URN taxonomy.

### TEA

- Write isolated unit and HTTP integration tests covering trigger handle binding, `409` concurrent run rejection, `{ childRun, triggerEnabled: false }` + `403` child-recursion block, `run?runId=` & empty-state `200` GETs, `204` idle SSE / `'job-error'` events, hermetic `shrink` validation (`400` on `page-load`), and `lab:bombadil-command` dispatch.

## Acceptance criteria

- `POST /api/test-runs/bombadil/trigger` with `{ target: 'spa', timeLimit: '10s' }` persists `urn:mcard:bombadil:trigger:spa`, spawns `node scripts/bombadil/run.mjs spa --time-limit 10s --output-path <tmpDir>` on a free dynamic port with `BOMBADIL_CHILD_RUN=1` on the target server, persists `urn:mcard:bombadil:run:<runId>` + `latest:spa` + `coverage:latest`, and returns handle + hash receipts.
- Triggering while a run is active returns `409`; `GET /handles` inside a child server reports `{ childRun: true, triggerEnabled: false }` while `POST /trigger` returns `403`; invalid targets, multi-entry `shrink` on `page-load`, or invalid `timeLimit` values (`'2'`, shell metacharacters) return `400`; idle GETs return `200` empty payloads and idle `/stream` returns `204`.
- `window.__lab.bombadil.trigger({ handle: 'urn:mcard:bombadil:trigger:spa-canary' })` and `document.dispatchEvent(new CustomEvent('lab:bombadil-command', ...))` start a run, stream via `fetch` `ReadableStream`, and broadcast `lab:bombadil-state` transitions in order.
- `node scripts/check-package-source-parity.mjs`, `npm run check:net`, and `npm run check:bombadil-nets` recognize and validate every Bombadil API call in `js/harness/bombadil-client.js`.

## Test design

- `tests/unit/bombadil-dashboard-api.test.mjs` spins up `createTestRunRouter` with a temporary SQLite store and deterministic injected runner (plus optional live `spa-canary` subprocess test gated behind `BOMBADIL_LIVE_UNIT=1`) validating schemas, handle resolutions, mutex `409`, child `{ childRun, triggerEnabled }` + `403`, stop/hermetic-shrink handlers, `run?runId=` lookup, `204`/SSE `'job-error'` close behavior, and `lab:bombadil-*` client event roundtrips.
- `tests/unit/test-run-schema.test.mjs` verifies `urn:ssg:bombadil-trigger:v1`, `urn:ssg:bombadil-run:v1`, and `urn:ssg:bombadil-coverage:v1` validation and checks closed `responsive_test_run:v1` remains unchanged.

## Non-goals

- Rendering the Bombadil dashboard Preact island or `Explore | Guided | Bombadil | Verify` dock tabs (`SPRINT-SSG-05`).
- Running `bombadil:workbench` indefinitely during PR test suites (interactive dashboard runs use explicit operator handles and bounded durations).

## Definition of done

- [ ] **DoD-SSG-04-01.** MCard schemas, `run.mjs` env isolation, runner service (`409` mutex, `403` + `{ childRun, triggerEnabled: false }`, ephemeral ports, hermetic `shrink`), and `/api/test-runs/bombadil/*` REST + `fetch` SSE routes pass unit/integration verification. Verified by `node --test tests/unit/bombadil-dashboard-api.test.mjs tests/unit/test-run-schema.test.mjs`.
- [ ] **DoD-SSG-04-02.** `window.__lab.bombadil` and `lab:bombadil-*` CustomEvent handles align with `workbench-net.yaml` and pass package/UI-call parity checks (`ws-server.js` SHA unchanged). Verified by `node scripts/check-package-source-parity.mjs && npm run check:net && npm run check:bombadil-nets`.
- [ ] **DoD-SSG-04-03.** Evidence in `evidence/SSG-04-bombadil-handles.md` and `DECISIONS.tsv` row are recorded with all core gates passing. Verified by `test -s docs/sprints/_active/evidence/SSG-04-bombadil-handles.md && grep -qE $'\tSSG-04\t' docs/sprints/_active/DECISIONS.tsv && npm run stageshow:check-css && node scripts/check-package-source-parity.mjs && npm run check:explorable-gui && npm run check:net && npm run check:bombadil-nets && npm run check:playwright-discovery && npm run docs:check && npm run test:unit`.
