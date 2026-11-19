# BPV-03 page state contract evidence

| Field | Value |
| --- | --- |
| Audience | BPV sprint owners and reviewers |
| BMAD Owner | Architect with Developer and TEA |
| Source of Truth | [SPRINT-BPV-03](../SPRINT-BPV-03-page-state-contract.md), `js/harness/page-state.js`, `src/layouts/WorkbenchLayout.astro` |
| Status | Complete on 2026-11-17 |

## Contract

| Where | Attribute | Values |
| --- | --- | --- |
| `<body>` | `data-net-id` | `landingpage-workbench-net` or `spa-test-target-net` |
| `<body>` | `data-place-id` | The active place. Set by the layout for a single-place page, by the page for a multi-place page |
| `<body>` | `data-place-ids` | The full declared list, which `setPlace` enforces |
| `<body>` | `data-page-state` | `loading`, `redirecting`, `ready`, `busy`, `error` |
| `<body>` | `data-page-error` | Present only in `error` |
| `<body>` | `data-boot-nonce` | New value on every document load |
| `<body>` | `data-nav-arcs` | `from>to>transitionId` pairs, used for the cross-document firing hand-off |
| island root | `data-island-state` | `mounting`, `ready`, `busy`, `empty`, `error` |
| recording ribbon | `data-recorder-state` | `IDLE`, `RECORDING`, `PAUSED`, `FINALIZED` |

`window.__netReport` is a bounded array of `{ seq, transitionId, fromPlaceId, toPlaceId }`. The cap is 200, and `seq` is monotonic.

## What changed

| Work | Result |
| --- | --- |
| Layout | `WorkbenchLayout.astro` takes required `placeIds`, writes the body contract, emits `#page-status` and `#page-alert` live regions, and loads `page-state.js` before page scripts. `data-nav-arcs` is generated from the checked net, so the browser holds no second link registry. |
| State module | `js/harness/page-state.js` owns `setPageState`, `setPlace`, `reportTransition`, `islandState` and `getReports`. It validates states and rejects a place outside the page's declared list. |
| Dialects removed | `lab-booting`, `data-harness-ready`, `harnessReady`, `data-workflow-ready`, `data-toolbar-ready`, `data-mcard-result-state`, `data-ready`, `dataset.ready` and `popstate_sync` are gone from `src`, `js` and `tests`. The lab CSS keys off `body[data-page-state="loading"]`. |
| Cross-document firing | The page stores its place and nonce on `pagehide`. The arriving page reports the firing when exactly one declared arc joins the two places, and records a null transition id when none or several do. |
| Net parity | `checkDeclaredPlaceIds` fails the build when a page omits `placeIds`, names an undeclared place, is bound to a different page, or leaves a route place undeclared. |
| SPA fixture | The body carries the contract, Back and Forward resolve a declared transition id (`t_spa_back_overview`, `t_spa_recover_overview`), and the Bombadil spec reads the body instead of the app root. |
| Docs | `docs:check` passed at 243 Markdown files at BPV-03 closure (250 Markdown files post-remediation). |

## Verification

| Command | Result |
| --- | --- |
| `node --test tests/unit/page-state.test.mjs` | PASS, 5 tests |
| `node --test tests/unit/net-parity.test.mjs` | PASS, 9 tests |
| `npm run build:astro` | PASS, net parity and the placeIds check |
| `npx playwright test tests/features/page-state-contract.spec.js --project=features` | PASS, 10 tests |
| `npm run test:smoke` + `test:components` + `test:features` | 610 passed, 16 skipped, 25 failed at BPV-03 closure (`layout-freeze`, subsequently re-baselined in BPV-05 with operator approval on 2026-11-18 so the full suite passes with 0 failures). |
| `node tests/performance/place-bytes.mjs --enforce-zero-island-places` | PASS, 7 page places, 6 island-free, 0 violations |
| `npm run bombadil:spa -- --time-limit 2m` | Clean, exit 0 |
| `npm run check:net` | PASS, 32 places, 66 transitions |

## Limits

- The layout reads the net at build time, so adding a page requires a rebuild before `data-nav-arcs` reflects it. That is the same lifecycle as the net-parity check.
- A cross-document firing with two declared arcs between the same places records a null transition id on purpose. BPV-02 keeps those arcs out of the generated history set for the same reason, while unambiguous reverse cross-document arrivals emit `history:${reverseMatches[0].transitionId}` in `js/harness/page-state.js`.
- `js/harness/page-state.js` is a shared module, not an island. `place-bytes` counts no island bytes for the island-free places because it only sums island bundles.
