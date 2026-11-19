# BPV-01 progress evidence

| Field | Value |
| --- | --- |
| Audience | BPV sprint owners and reviewers |
| BMAD Owner | Developer with TEA |
| Source of Truth | This file and [SPRINT-BPV-01](../SPRINT-BPV-01-scope-and-gui-subtraction.md) |
| Status | Complete on 2026-11-17. All five DoD items pass. (The 25 `layout-freeze` baselines remaining at BPV-01 closeout were subsequently re-baselined in BPV-05 with operator approval on 2026-11-18.) |

## Done on 2026-11-17

| Work | Result |
| --- | --- |
| Scope file | `tests/bombadil/scope.json` has one row for each of the 21 registry surfaces. `tests/unit/bombadil-scope.test.mjs` passes 4 of 4 tests. A mutation to an unresolvable start URL made it fail. |
| Dead code in the portal | `src/pages/index.astro` lost three hidden alias buttons, five listeners for missing ids, and `openMissionControlSplit` with its four listeners, for a net 61 lines removed. The inspector and navigator stay, because the page still mounts the navigator and `tests/features/style-audit.spec.js` uses the inspector. |
| Sprint copy in the lab | The "Sprint CDO-12" badge, the `#cors-notice-banner` aside, the "Certified" footer and the CSS only they used are gone, along with the `.cors-notice-*` rules in `public/css/semantic-tokens.css`. |
| Pop Out | The control is now a button. The old anchor opened two tabs per click, because its handler also called `window.open` without `preventDefault`. `tests/features/lab-popout.spec.js` failed on the old page with two tabs and passes on the fix. |
| Inline CSS | 1,060 lines moved verbatim to `public/css/responsive-lab.css`, so `src/pages/responsive-lab.astro` is 223 lines. Box and computed-style dumps of every visible element at 1440 and 390 pixels wide were identical before and after, and so was the 390 pixel screenshot. |
| Navigation renderer | `scripts/penpot-render.mjs` now also renders the navigation into `src/pages/index.astro`, which the server actually serves. Its output for `js/nav.js` and the root `index.html` was byte-identical on rerun. |
| Tests | `presentation-lattice` tests 6, 7, 8, 9 and 12 were deleted, and test 10's assertions on removed copy and test 11's alert copy were updated. `correctness-inspector` now opens the inspector through `window.__deployment_inspector` on `/?noredirect=1`. |

## Suite comparison against the BPV-00 baseline

| Run | Passed | Skipped | Failed |
| --- | ---: | ---: | ---: |
| Baseline at `3fb2cb8` | 593 | 16 | 35 |
| After this work | 597 | 16 | 28 |

At this mid-sprint checkpoint (before closure below), no test failed that had passed in the baseline, and 28 failures remained (3 resolved before BPV-01 closeout; the other 25 `layout-freeze` baselines were later re-baselined in BPV-05):

| Failure | Count | State |
| --- | ---: | --- |
| `tests/features/layout-freeze.spec.js` | 25 | Re-baseline after the remaining removals, in the root STY program. |
| `tests/features/penpot-navigation.spec.js` | 1 | Waits for the portal navigation decision. Rendering the Penpot design's two-page navigation made the build's net-parity gate fail, because the workbench net declares no place for `/pkc-docs-index.html`. The page keeps its current links until the design or the net changes. |
| `presentation-lattice` test 10 | 1 | Waits for the home link decision. "GovTech OS" goes to `/`, which redirects to the lab, so the test cannot return to the portal. |
| `presentation-lattice` test 5 | 1 | The 390 pixel overflow check at line 185 failed in both full runs and passes alone. On a fresh database the viewer at 390 pixels has no element past the viewport edge, measured after waits of 0, 100 and 600 ms. So the overflow depends on state that earlier tests leave behind, most likely cards they write to the shared test database. The cause is inferred, not established. |

Other gates passed. That covers `npm run test:unit` at 209 of 209, `npm run docs:check`, `npm run check:net`, `npm run check:playwright-discovery`, the package source parity check, the per-place JavaScript gate and `npm run build`.

## Closed on 2026-11-17

- **Three product decisions.** Recorded in `DECISIONS.tsv`. The default target is the SPA fixture, the home link is `/index.html?noredirect=1`, and the net stays the runtime link source while the Penpot flow renders through a declared Docs Index place.
- **The Faro badge.** Its title now follows `window.__faro_collector` through `data-faro-state`.
- **Test 5.** The overflow was `pre.mcard-page-body` and its `code` child in the mounted MCard at 390 pixels. `src/pages/index.astro` now constrains the card host and wraps code, and the assertion reports offending elements instead of a bare boolean.
- **Portal navigation.** `p_page_docs_index`, `t_link_viewer_to_docs` and `t_link_docs_to_index` were added, `scripts/penpot-render.mjs` rewrote the two-link flow into `src/pages/index.astro`, and `tests/features/penpot-navigation.spec.js` passes.

## Final suite state

| Run | Passed | Skipped | Failed |
| --- | ---: | ---: | ---: |
| Baseline at `3fb2cb8` | 593 | 16 | 35 |
| After BPV-01 | 600 | 16 | 25 |

At BPV-01 closeout, the 25 remaining failures were all `tests/features/layout-freeze.spec.js`, whose baselines predated the GQC Astro migration (`BPV-05` subsequently re-baselined them with operator approval on 2026-11-18 so the full suite passes with 0 failures). No other spec failed.

## Code review

An independent review of this round found no CRITICAL or HIGH defects. Two MEDIUM findings are fixed.

- **Pop Out exposed the workbench.** The tab opened with `window.open(current, '_blank')`, which leaves `window.opener` set, and the target URL can be any origin. The old anchor's `target="_blank"` had implied `noopener`. The call now passes `noopener,noreferrer`, and the Pop Out spec still passes.
- **The navigation renderer could skip the Astro page silently.** It now fails when `src/pages/index.astro` is missing, as well as when its markers are missing.

Two review notes are recorded for the Architect and not acted on.

- **No build step in the Docker image.** The `Dockerfile` copies the tree and runs `node ws-server.js` without an Astro build, and `dist/` is gitignored. Whether the image serves the current pages depends on a build step elsewhere in CI or the deploy pipeline. This predates BPV.
- **Stale root copy.** The root `index.html` still carries the controls removed from `src/pages/index.astro`. The server serves the Astro page, so the copy is unused, but it keeps drifting.
