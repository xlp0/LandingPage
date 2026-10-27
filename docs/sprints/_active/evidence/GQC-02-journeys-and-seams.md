# GQC-02 GUI Journeys and Reusable Test Seams Evidence

## Metadata

- Sprint ID `SPRINT-GQC-02`
- Execution Unit `PR-GQC-02`
- Trunk Baseline Commit `843cf65`
- Head Base Commit `99a21cc`
- Node Runtime `v24.21.0` (CI pinned to Node `24`)
- Playwright Dependency `^1.57.0`
- CLM Kernel Dependency `clm-kernel@0.0.12` (`clm-kernel/layer1`)

## 1. Coverage Registry and Layer 1 Net Envelope Proof (GQC-02.1, GQC-02.2)

`tests/gui-coverage.json` upgrades to `urn:gqc:gui-coverage-registry:v2` as a strict test index over canonical navigation and MCard sources without duplicating `NAVIGATION_ROUTES` from `js/nav.js`.

- **Workbench vs Target Separation** separates all 7 root HTML pages in `workbenchSurfaces` from 5 target definitions in `targetSurfaces` (`spa-test-target`, `probe-target-fixture`, `external-penpot-mpa-candidate`, `external-blocked-origin-github`, and `external-public-preflight-wikipedia`).
- **Traceability and Denominator** records 17 journeys with `journeyId`, `surfaceKind`, `surfaceId`, `targetType`, `targetHandle`, `pageId`, `placeId`, `functionalLinkId`, `transitionId`, `firing_sequence`, `sourceKind`, `sourceRef`, `workbenchPlaceId` (`null` pending `GQC-02A`), `workbenchTransitionIds` (`[]` pending `GQC-02A`), `priority`, `inP0SpaDenominator`, `optional`, `status`, `owner`, `testLayer`, `specPath`, `command`, `evidence`, and `observableOutcome`.
- **Scope Exclusions** keeps `p0SpaDenominatorCount` at `2` (`guided-spa-test` and `spa-failure-recovery`). PenPot MPA rows remain `optional` and excluded from the P0 SPA denominator. Authentication (`Zitadel`), P2P collaboration, WebLLM inference, offline PWA, and legacy `app.html` SPA classification remain `undecided`.
- **Closed Receipt Schema Preservation** keeps `urn:mcard:schema:responsive_test_run:v1` closed (`mutatesClosedSchema` is `false`) without requiring a persisted `NetMCard` prior to `SPRINT-GQC-05`.
- **Layer 1 Envelope Verification** validates `tests/fixtures/spa-test-target.graph.json` (`{ schema, netId, targetHandle, entryPlaceId, topology, bindings }`) through `parsePetriNetYaml` from `clm-kernel/layer1`, verifies the session P-invariant (`y^T * D = 0` and `verifyPInvariant(..., 1)`) via `IncidenceMatrix.fromTopology`, verifies 1-safe BFS reachability and error recovery (`p_spa_missing_transition -> t_spa_recover_overview -> p_spa_overview`), and replays every SPA journey `firing_sequence` through `ColoredPetriVM`.

## 2. Reusable Fixtures and Determinism Seams (GQC-02.2, GQC-02.3)

- **Deterministic Same-Origin SPA Fixture (`tests/fixtures/spa-test-target.html`)** renders two `view` Places (`p_spa_overview` and `p_spa_details`) and one `error` Place (`p_spa_missing_transition`) with zero external network fetches, 48px touch-ready buttons, ARIA landmarks, and a per-document `bootNonce` (`window.__spaBootNonce` and `data-boot-nonce`) that proves in-document Functional Link navigation never reloads the browser document.
- **Reusable Application Fixtures (`tests/fixtures/app-fixtures.js`)** exports isolated browser cleanup (`localStorage`, `sessionStorage`, cookies, and route teardown), external boundary stubs (`installExternalBoundaryStubs` for Zitadel OAuth, WebLLM model downloads, and frame-blocked third-party origins), `createIsolatedPersistenceHarness` backed by a temporary `CanonicalTriadBackend` SQLite file outside `data/mcard-api.db`, and `createResponsiveLabWorkbench` built strictly over URLs, ARIA roles, labels, and public IDs so journeys execute unchanged on the `GQC-02B.1` Astro host.
- **Approved Existing Spec Migration (`tests/features/penpot-navigation.spec.js`)** updated navigation from `/` to `/index.html?noredirect=1` and migrated imports to `../fixtures/app-fixtures.js`. Rationale recorded per `GQC-01` Section 8 item 2, because `/` redirects by design to `/responsive-lab.html` whereas the PenPot `#penpot-site-nav` bar renders on the `?noredirect=1` portal route.

## 3. Unit, Discovery, and Playwright Verification Results

| Check | Command | Exit Status | Result |
| --- | --- | --- | --- |
| Registry, Layer 1 VM, and isolated Triad unit suite | `node --test tests/unit/gui-coverage-registry.test.mjs` | `0` | `6/6 passed` (`328.5ms`) |
| Observability and SMO unit suites | `node --test 'tests/observability/**/*.test.*' tests/single-page-mcard.test.mjs` | `0` | `39/39 passed` (`1504.5ms`) |
| Playwright project discovery gate | `npm run check:playwright-discovery` | `0` | `smoke` 11 files (30 tests), `components` 14 files (18 tests), `features` 19 files (563 tests), `0` overlap |
| GQC-02 feature journeys + PenPot regression | `npx playwright test tests/features/spa-workbench-journey.spec.js tests/features/spa-failure-recovery.spec.js tests/features/penpot-navigation.spec.js --project=features` | `0` | `8/8 passed` (`0` retries) |
| Workbench entry and Responsive Lab smoke regression | `npx playwright test tests/smoke/landing-page.spec.js tests/smoke/root-responsive-lab.spec.js --project=smoke` | `0` | `7/7 passed` (`0` retries) |
| CI step summary publisher | `.github/workflows/playwright-quality.yml` summary step | `0` | `Verdict PASS`, `P0 SPA Denominator Coverage 2 / 2`, `Covered Journeys 11 / 17` |

Cross-sprint file boundary note for coordinator merge is recorded for `tests/unit/playwright-trust-contracts.test.mjs` lines 82 and 83 (owned by `PR-GQC-01`), which assert the pre-`GQC-02` `features` file count (`17` vs `19`) and total category file count (`42` vs `44`). That `GQC-01` file was left untouched to honor `PR-GQC-02` file boundaries.

## 4. Ten-Lane Live Chromium Verification Summary

All 10 live verification lanes executed against real Chromium processes with visual PNG artifacts stored in `/tmp/swarm-PR-GQC-02/worker-1/lane-1.png` through `lane-10.png` and structured metadata in `/tmp/swarm-PR-GQC-02/lanes-all.json`.

| Lane | Verification Scope | Status | Observed Outcome | Screenshot |
| --- | --- | --- | --- | --- |
| 1 | Trunk (`843cf65`) vs Head `/responsive-lab.html` parity | `PASS` | Matching heading (`Responsive UI Lab`), ready state, default `app.html` input, and Start control | `lane-1.png` (236,726 B) |
| 2 | Load `spa-test-target.html` via Responsive Lab URL controls | `PASS` | Fixture rendered inside `#mission-control-iframe` at `p_spa_overview` | `lane-2.png` (254,264 B) |
| 3 | Observe first and second SPA views against graph manifest | `PASS` | `page_spa_overview / p_spa_overview` and `page_spa_details / p_spa_details` matched `spa-test-target.graph.json` | `lane-3.png` (251,546 B) |
| 4 | Follow Functional Link without document reload | `PASS` | `t_spa_open_details` transitioned view while `data-boot-nonce` stayed identical | `lane-4.png` (250,600 B) |
| 5 | Apply and rotate `iphone-16-pro` builtin profile | `PASS` | Stage dimensions swapped `852x393 -> 393x852` matching `BUILTIN_DEVICES` with view visible | `lane-5.png` (253,139 B) |
| 6 | Record Functional Link action and save MCard run | `PASS` | `POST /api/test-runs` returned `201`, `#rec-saved-label` showed hash prefix, `netMCard` absent | `lane-6.png` (432,588 B) |
| 7 | Deterministic replay via `replayRun` | `PASS` | `verdict` equaled `pass`, destination `p_spa_details` and `t_spa_open_details` agreed without reload | `lane-7.png` (120,405 B) |
| 8 | Follow unmapped link into error Place | `PASS` | `role="alert"` named `p_spa_missing_transition` and `t_spa_invalid_unmapped` without claiming capture authorization | `lane-8.png` (265,727 B) |
| 9 | Keyboard-only target load, device setup, and capture | `PASS` | `Tab` order (`urlInput -> Clear URL -> Load Target`) and `Enter` actions persisted run (`201`) | `lane-9.png` (261,593 B) |
| 10 | Fresh `BrowserContext` storage, dialog, and network isolation | `PASS` | Zero leaked `localStorage`, `sessionStorage`, cookies, dialogs, or external requests | `lane-10.png` (250,617 B) |

## 5. Paired Trunk-vs-Head Performance Benchmark

Measured on Apple M4 Max (16 cores, Darwin arm64, Node `v24.21.0`, pre-run 1m/5m/15m load average `2.29 / 2.97 / 3.56`) at `1440x960` viewport using cold `BrowserContext` instances per sample, 1 discarded warmup per side, ABBA interleaving across 10 paired iterations, and `0` HTTP or page errors. Raw samples are archived at `/tmp/swarm-PR-GQC-02/perf-results.json`.

| Metric | Trunk `843cf65` p50 | Trunk p75 | Head `PR-GQC-02` p50 | Head p75 | Spread (Head) | p75 Delta |
| --- | --- | --- | --- | --- | --- | --- |
| Cold workbench nav-to-ready `/responsive-lab.html` (`n=10` paired) | 141.97 ms | 143.53 ms | 108.76 ms | 143.05 ms | 36.73 ms | -0.48 ms (-0.33%) |
| Head-only SPA fixture load via URL bar (`n=10` advisory) | n/a | n/a | 124.80 ms | 128.34 ms | 8.01 ms | head-only |
| Head-only SPA in-document Transition `t_spa_open_details` (`n=10` advisory) | n/a | n/a | 32.78 ms | 35.30 ms | 5.29 ms | head-only |
| Head-only full journey wall time (`n=10` advisory, separate) | n/a | n/a | 266.09 ms | 266.46 ms | 2.00 ms | head-only |

**Limiter explanation** shows cold workbench navigation-to-ready (`~109-143 ms`) is bounded by fresh `BrowserContext` initialization, loopback HTTP fetch plus ES module graph evaluation of `responsive-lab.html`, initial `app.html` iframe binding, and the double `requestAnimationFrame` gate that removes `body.lab-booting` (`~33 ms` two-frame floor at 60Hz, explaining the `~36 ms` spread between `107 ms` and `144 ms` phase alignments on both trunk and head). In-document SPA Transition execution (`p50 32.78 ms`, `p75 35.30 ms`) performs zero network I/O or document teardown and is bounded solely by Playwright cross-process click dispatch and DOM attribute polling.

## 6. BMAD Sign-Off and Remaining Risks for SPRINT-GQC-02A

- **Product Manager and Analyst** confirmed `guided-spa-test` and `spa-failure-recovery` as the sole P0 SPA denominator journeys (`2 / 2`), retained PenPot MPA as optional, and held auth, P2P, WebLLM, offline, and `app.html` SPA promotion as `undecided`.
- **Architect** verified that `tests/fixtures/spa-test-target.graph.json` conforms to the `GQC-02A` `{ topology, bindings }` envelope accepted unchanged by `clm-kernel/layer1` without adding test-only state to production modules or mutating `responsive_test_run:v1`.
- **UX Designer** verified accessible headings, landmarks, `role="alert"` error messaging without false capture-authorization claims, 48px touch targets, and keyboard-only `Tab` / `Enter` operation.
- **TEA Sign-Off** approved test-level allocation (pure net/registry invariants in `node:test` running in `<350 ms`, Triad API isolation via ephemeral Express + SQLite harness, and visible user journeys in Playwright Chromium with `0` arbitrary `waitForTimeout` calls in all new/edited `GQC-02` specs). Remaining `GQC-02A` scope is authoring the workbench site Petri net (`nets/site-navigation.net.json`) to populate `workbenchPlaceId` and `workbenchTransitionIds`.
