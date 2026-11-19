# BPV-07 explored transition coverage

| Field | Value |
| --- | --- |
| Audience | TEA, Product Manager and Architect |
| BMAD Owner | TEA |
| Source of Truth | `node scripts/check-net.mjs --bombadil-traces <dir>`, [SPRINT-BPV-07](../SPRINT-BPV-07-coverage-nightly-and-graduation.md), decision BPV-D11 |
| Measured | 2026-11-18, one full local nightly run of every target |

## How it was measured

The nightly target script (since moved to [`scripts/bombadil/nightly.sh`](../../../../../scripts/bombadil/nightly.sh), which the local Docker service runs) was run on macOS arm64 with its default budgets:

- the canary: 5 runs of 2 minutes
- `spa`: 5 minutes
- `lab-smoke`: 5 minutes
- `page-load`: 2 minutes for each of 6 entries
- `workbench`: 10 minutes, then the 20-firing bound

The traces of `spa`, `lab-smoke`, `page-load` and `workbench` were then replayed with `check-net.mjs --bombadil-traces`. The canary is left out because it seeds a bug on purpose.

| Target | Exit | Violations | Quiescence warnings | Note |
| --- | --- | --- | --- | --- |
| canary | 1 | 0 | 0 | **Pre-fix snapshot (now excluded/fixed).** See finding 1; `findTraceFilesDeep({ excludeCanary: true })` excludes canary traces from coverage replay, and `nightly-2026-11-18T09-50-26Z` ran canary cleanly (5/5 seeded bugs found). |
| spa | 0 | 0 | 0 | |
| lab-smoke | 0 | 0 | 0 | |
| page-load | 0 | 0 | 3 | Pre-remediation snapshot: all three came from the portal's Home link (see finding 2; reverse cross-document Home-link arrivals now emit `history:` in `js/harness/page-state.js` and `t_link_docs_to_index` carries `triggerSource`). |
| workbench | 0 | 0 | 0 | 17,648 states |
| workbench firing bound | 0 | | | 266 firings logged, bound 20 |

## The numbers

| Net | Declared | Asserted | Explored only | Never fired | Asserted coverage |
| --- | ---: | ---: | ---: | ---: | ---: |
| `landingpage-workbench-net` | 66 | 19 | 2 | 45 | 28.8% |
| `spa-test-target-net` | 4 | 4 | 0 | 0 | 100.0% |

Asserted counts come only from the Playwright journeys in `tests/gui-coverage.json`. Explored-only transitions were fired by Bombadil and no asserted spec covers them: `t_link_lab_to_index` and `t_link_viewer_to_lab`, 277 firings each across the workbench, lab-smoke and page-load traces. They raise Fired and never Asserted (BPV-D11). The Architect check for that rule is `tests/unit/check-net.test.mjs`, "an explored-only trace raises the fired count and leaves the asserted count unchanged".

Exploration fired every SPA transition more than 950 times, but the SPA net was already fully asserted.

## Label for every never-fired workbench transition

Bombadil observes a transition only when the page-state contract logs it in `window.__netReport`. Today that happens for cross-document links and redirects, and for the SPA fixture's own steps. In-document request and policy transitions are not logged, so exploration cannot see them. Each never-fired transition has one label.

| Label | Meaning | Transitions |
| --- | --- | --- |
| Out of scope: boundary page | One end is a page that `tests/bombadil/scope.json` marks `boundary` (`/app.html`, `/pkc-docs-index.html`) or an external game. The scope file already records this. | `t_link_lab_to_app`, `t_link_app_to_index`, `t_link_viewer_to_docs`, `t_link_docs_to_index`, `t_open_external_monopoly`, `t_open_external_chess`, `t_open_external_go` |
| Out of scope: not logged | Request lifecycle, target policy and recovery steps happen inside one document and are not written to `window.__netReport`. BPV-06 lists request-lifecycle places as a non-goal. Asserted Playwright specs cover several of their siblings. | `t_req_post_nav_session`, `t_ok_post_nav_session`, `t_fail_post_nav_session`, `t_req_post_nav_fire`, `t_ok_post_nav_fire`, `t_fail_post_nav_fire`, `t_req_post_nav_link`, `t_ok_post_nav_link`, `t_fail_post_nav_link`, `t_req_put_mcard_landing`, `t_ok_put_mcard_landing`, `t_fail_put_mcard_landing`, `t_recover_put_mcard_landing`, `t_req_probe_handshake`, `t_ok_probe_handshake`, `t_fail_probe_handshake_timeout`, `t_fail_probe_handshake_unavailable`, `t_recover_handshake_timeout`, `t_recover_capture_unavailable`, `t_fail_get_app_config`, `t_fail_get_conformance_latest`, `t_fail_post_test_runs`, `t_recover_post_test_runs`, `t_fail_get_env`, `t_fail_get_mcard_landing`, `t_fail_get_clm_program_artifact`, `t_fail_get_clm_registry`, `t_recover_get_clm_registry`, `t_fail_get_fiber_inspector_harness`, `t_recover_get_fiber_inspector_harness`, `t_fail_get_fiber_conformance_harness`, `t_recover_get_fiber_conformance_harness`, `t_enter_target_blocked`, `t_recover_target_blocked`, `t_enter_target_unapproved`, `t_recover_target_unapproved`, `t_enter_capture_unavailable` |
| Needs weight (blocked by the driver) | The portal's Home link (`index.html`, no `noredirect`) redirects at once. The specs skip it because Bombadil 0.7.10's quiescence check races the second navigation (BPV-06 triage 7). It needs a weighted custom action that navigates and waits, or a Bombadil version that tolerates redirects. | `t_link_viewer_to_index` |
| Unreachable (net bug) | None left. The first replay found one, fixed below. | |

That is 7 + 37 + 1 = 45 never-fired transitions, each with a label.

## Findings from this measurement

1. **The canary had been broken since the fixture's popstate listener gained a nested `window.__netReport?.push({ ... });` call.** `make-canary.mjs` ended the removal at the first `});`, left a stray `}`, and the canary page threw a syntax error. Under Bombadil's script instrumentation the page never finished loading, so all 5 runs failed with "navigation timed out" and 0 detections. The removal now matches the `});` indented like the listener's first line. A unit test failed before the fix: it checks that every inline script of the rendered canary still parses. After the fix the canary detected its bug in 5 of 5 runs. `bombadil browser shrink` reproduced it 3 of 3 times at 3 actions, already minimal.
2. **The portal's Home link raced the page-load driver** (3 warnings), as it did in the workbench in BPV-06. `page-load.bombadil.ts` now skips links to the redirecting portal URL too.
3. **Net bug: `t_link_lab_to_index` had drifted.** Its binding said `p_view_index_mcard_viewer`, as decision BPV-01 "home link" requires, but its topology arc still ended at `p_page_index`. Every replayed lab-to-portal trace was rejected with `post-place-mismatch`. The arc now ends at `p_view_index_mcard_viewer`. `check-net.mjs` gains the rule `binding-topology-mismatch`, which failed on the old net in a unit test. All 88 earlier traces under `bombadil-output/` now replay.
4. **Closed by the Architect on 2026-11-18: the SPA error place is a declared deep-link entry.** A reload while at `#missing` restores `p_spa_missing_transition`, but the SPA net listed only `p_spa_overview` and `p_spa_details` as deep-link entries, so 23 of 46 SPA trace segments were rejected as `invalid-trace-entry-place`. `tests/fixtures/spa-test-target.graph.json` now sets `bindings.places.p_spa_missing_transition.deepLinkEntry` to `true`. The fixture's own `HASH_TO_PLACE` table maps `#missing-transition` to that place, and `tests/features/spa-history-flood.spec.js` navigates by hash on the strength of that mapping, so the net had disagreed with the shipped fixture rather than the fixture with the net. Declaring the entry changes net metadata only and no browser behaviour. Every trace in `bombadil-output/nightly-2026-11-18T09-50-26Z` now replays: 32 of 32, 0 rejected, up from 18 of 32. `check:net`, `check:bombadil-nets`, `docs:check` and 267 unit tests passed at BPV-07 close after the change (274 unit tests pass post-remediation).

## Explored coverage target

The Product Manager sets the explored target from this first measurement. The TEA's reading:

- The only cross-document links that exploration can fire inside the boundary are the two lab-to-portal links, and both fire hundreds of times.
- Raising explored coverage means logging in-document request and policy firings, or covering boundary pages. Each is a scope decision, not a matter of a longer run.

Until the Product Manager decides, the nightly reports the counts and gates on nothing but the 20-firing workbench bound.
