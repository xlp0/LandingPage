# BPV-06 workbench interaction specs evidence

| Field | Value |
| --- | --- |
| Audience | BPV sprint owners, TEA and reviewers |
| BMAD Owner | Developer with Architect, TEA and UX Designer |
| Source of Truth | [SPRINT-BPV-06](../SPRINT-BPV-06-workbench-interaction-specs.md), `tests/bombadil/workbench.bombadil.ts`, `scripts/bombadil/trace-to-net.mjs` |
| Status | Complete on 2026-11-18. All five DoD items pass. |

## What changed

| Work | Result |
| --- | --- |
| Host mirror (BPV-D08) | `createViewportStage` gains `setTargetPlace`, which writes `data-target-place-id` and `data-target-boot-nonce` on `#viewport-scale-wrapper` and fills the `#stage-target-place` pill in the frame bar. `createSpaTestWorkflow` calls it from `emit()`, using the same `liveSpa` observation the guide shows, so there is no second source for the target's place. The pill reads "Target place: p_spa_overview" and is hidden when no place is observed. |
| Spec | `tests/bombadil/workbench.bombadil.ts` re-exports the page-load properties and adds `firingsAreDeclared`, `recorderStateIsKnown`, `recorderMovesAreLegal`, `targetMirrorIsDeclared` and `targetMirrorAgrees`. Its single exported generator weights workflow controls 4, framed-target clicks 3 and filtered default exploration 3. |
| Framed target | The `ClickFramedTarget` custom action clicks a random visible button of the SPA fixture through the frame's `contentDocument`. A 10 minute run puts the mirror in all three SPA places. |
| Runner | `npm run bombadil:workbench` starts the lab, bounded by the generated `ALLOW_URLS['/responsive-lab.html']`. |
| Firings | `scripts/bombadil/trace-to-net.mjs` prints the run's firing records and takes `--min-firings`. It reads a page-load output through its `entry-N` directories, so BPV-07 can reuse it. `tests/fixtures/bombadil/sample-trace.jsonl` pins the trace format with ten real lines. |
| Layout freeze | The pill is one new element on `responsive-lab`. The aligned diff finds no moved box at any viewport. The baseline was re-captured with a sixth `rebaselines` entry, and every other page re-captured identical. |

## Triage

Each violation the runs found, and how it was resolved.

| # | Violation or finding | Cause | Resolution |
| --- | --- | --- | --- |
| 1 | `firingsAreDeclared`: the lab logged `p_spa_overview -> p_page_responsive_lab` with no transition id. | The SPA fixture runs `page-state.js` inside the frame and shares the tab's `sessionStorage`. On a lab reload, the lab read the fixture's place as the previous document. | **Fixed.** `page-state.js` only reads and writes the cross-document hand-off in the top-level document. `tests/unit/page-state.test.mjs` "a framed document takes no part" failed before the fix. |
| 2 | Arrivals on the portal were never logged, so `t_link_lab_to_index` never appeared. | The portal declares two places and names its view in a page script, after `page-state.js` tried the hand-off with no place set. | **Fixed.** The hand-off waits for the first `setPlace` of the boot. A unit test failed before the fix. Runs now log both directions. |
| 3 | `recorderMovesAreLegal`: `FINALIZED -> RECORDING` in one action. | `Recorder.start()` from `FINALIZED` calls `reset()` and then starts, so one click makes two declared moves. | **Spec refined.** A declared reset followed by one declared move is legal. Every other jump still fails, and the seeded `IDLE -> PAUSED` fault is caught. |
| 4 | `targetMirrorAgrees`: the frame showed the fixture while the mirror was empty. | A rejected URL (`invalid-target`) leaves the old document in the frame while the lab's target is no longer the fixture. | **Spec refined.** "The fixture is the target" now also requires the guide's `data-target-type="spa"`. A frame that keeps showing stale content after a rejected URL is existing GQC-03 policy behaviour and is left as it is. |
| 5 | Framed clicks never changed the fixture. | `registerCustomAction` from the root `@antithesishq/bombadil` module never runs its handler in the page. Only the `@antithesishq/bombadil/browser` export does. | **Fixed** in both specs. `page-load.bombadil.ts`'s `ScrollPage` had the same defect and never scrolled before this fix. |
| 6 | Runs reached `/pkc-docs-index.html` and `/pkc-viewer.html`, outside the boundary. | Bombadil 0.7.10 reads the generated `*://*/` as "every path", and `*://*/index.html` refused `/index.html?noredirect=1`. Measured on a 60 second run with each pattern set. | **Fixed** in `scripts/gen-bombadil-nets.mjs`. Patterns end in `*`, and the root redirect page is not listed. `tests/unit/bombadil-nets.test.mjs` failed before the fix. The page-load target uses the same lists. |
| 7 | `quiescence timer` warnings: 2 in a 2 minute run with Reload, and 4 in 10 minutes from the portal's Home link. | The driver's quiescence check races a navigation that starts a second navigation: Reload, or `index.html` replacing itself with the lab. | **Spec scope.** Reload and links to a redirecting portal URL are skipped, as in the lab smoke. Back, Forward and the other links still give each run fresh documents. |
| 8 | UX finding, not a property: the portal's Penpot nav marks "Home" active but links to `index.html`, which redirects to the lab. | The Penpot flow names Home as `/index.html` while the root redirect sends top-level visits to the lab. | **Open for the UX Designer.** Either point Home at `index.html?noredirect=1` or stop marking it active on the portal. The generated nav was not edited here. |

## Seeded faults

Each fault was seeded by a scratch spec that re-exports the workbench spec and adds one custom action. The specs ran directly with `bombadil browser test --exit-on-violation --time-limit 60s` against the lab. None of these scratch specs is committed.

| Fault | Seeded action | Violation | Exit |
| --- | --- | --- | --- |
| Wrong firing | Push `t_link_lab_to_app` with the wrong destination into `window.__netReport` | `firingsAreDeclared` only | 2 |
| Illegal recorder move | Set `data-recorder-state` from `IDLE` to `PAUSED` | `recorderMovesAreLegal` only | 2 |
| Stale mirror | Keep rewriting the stage's place to `p_spa_details` | `targetMirrorAgrees` only | 2 |
| Undeclared mirror | Set the stage's place to `p_spa_bogus` | `targetMirrorIsDeclared` only | 2 |

## Verification

| Command | Result |
| --- | --- |
| `npx playwright test tests/features/target-mirror.spec.js --project=features` | PASS, 4 tests. Three failed before the mirror existed. |
| `node --test tests/unit/bombadil-trace.test.mjs` | PASS, 6 tests |
| `npm run test:unit` | PASS, 254 tests at BPV-06 close (274 tests post-remediation) |
| `npm run check:bombadil-nets`, `npm run check:explorable-gui`, `npm run docs:check` | PASS |
| `npx playwright test tests/features/layout-freeze.spec.js --project=features` after the re-capture | 30 passed, 1 skipped. `padding-1px` mutation still detected. |
| DoD-06-03 command, three consecutive 2 minute runs | exit 0 each. 0 warnings, 0 violations, 40, 38 and 55 firings |
| Earlier 10 minute run, before the redirect-link skip (`bombadil-output/bpv06-SJB1`) | 0 violations, 242 firings, 4 quiescence warnings, all from the Home link (triage 7) |
| DoD-06-02 command, final spec (`bombadil-output/bpv06-9ajd`) | exit 0. 0 violations, 0 warnings, 214 firings (bound 20). The mirror reached all three SPA places and the recorder all four states. |
| DoD-06-04 `grep -q 'BPV-06.*workbench triage' docs/sprints/_active/DECISIONS.tsv` | PASS |
| DoD-06-05: `npm run bombadil:spa -- --time-limit 2m && npm run bombadil:page-load -- --time-limit 1m && npm run test:features` | exit 0. spa clean, page-load 6 of 6 entries with 0 violations, and features 601 passed, 16 skipped, 0 failed |
| `npm run bombadil:lab-smoke -- --time-limit 2m`, `test:smoke`, `test:components` | Lab smoke clean with 0 quiescence warnings. Smoke and components pass 48. |

The 20-firing bound stays. Each 2 minute run already fires 38 to 66, and 10 minutes fire more than 200. The TEA can raise the bound in BPV-07 once coverage asks for more than the two lab links.

## Limits

- `bombadil-output/` is ignored by git, so traces stay on the machine that ran them.
- The workbench net fires only cross-document links in the lab, because no lab code calls `reportTransition`. So a run logs `t_link_lab_to_index` and `t_link_viewer_to_lab`. `t_link_lab_to_app` opens a new tab and is skipped.
- GitNexus `detect_changes` runs on the root repository's index. It cannot see this `LandingPage` repository's working tree, so the expected-symbol check used the unit, Playwright and Bombadil gates above instead.
