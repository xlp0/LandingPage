# BPV pre-program spike findings

| Field | Value |
| --- | --- |
| Audience | BPV sprint owners and reviewers |
| BMAD Owner | Developer (Amelia) with Architect (Winston) |
| Source of Truth | This file. The raw logs lived in a session scratch directory and are not committed. |
| Date | 2026-11-17 |
| Bombadil | `bombadil 0.7.10` from the `@antithesishq/bombadil` npm tarball |

This spike ran before the program was written, against a hermetic `node ws-server.js` with a temporary `MCARD_DB_PATH`. It made no repository edits. SPRINT-BPV-00 repeats the findings that matter inside the repository, so that every claim below becomes a rerunnable check.

## Measured findings

| # | Question | Result |
| ---: | --- | --- |
| 1 | Does `always(now(() => ... next(...)))` compose? | Yes. A counter jump of 5 was reported as a violation and the run exited 2. |
| 2 | Can a spec import a local TypeScript module? | Only with the extension. A relative import ending in `.ts` resolves. The same import without the extension fails with "Cannot resolve". |
| 3 | Can a spec import JSON? | Yes. `tests/fixtures/spa-test-target.graph.json` imports directly, so the SPA net needs no generator. |
| 4 | Can `extract` read a same-origin iframe? | Yes, through `contentDocument`. |
| 5 | Can default clicks reach controls inside an iframe? | No. A frame button was offered 430 times and no click landed. |
| 6 | What does `window.open` do to a run? | It stalls the run. Every later action hit a 5 second quiescence timeout, giving 8 states in 60 seconds. The planted violation was missed. |
| 7 | Can popups be filtered out? | Yes, by filtering `clicks` on `action.Click.fingerprint.testId`. The fingerprint carries `testId`, `id`, `role` and `accessibleName`. The violation was then found and nothing stalled. |
| 8 | Are `target="_blank"` anchors clicked? | No. They were clicked 0 times in 863 actions. |
| 9 | What happens to downloads? | They land in a downloads folder under the output path and the run continues. |
| 10 | What happens to `window.confirm`? | It is accepted automatically. Random clicks can really delete device presets through `js/harness/device-presets-ui.js`. |
| 11 | Is `trace.jsonl` usable? | Yes. Each line is one state with `action`, `state.url`, `snapshots` and `violations`. Custom extractors appear by their exported name. A place sequence can be recovered, but the format is undocumented. |
| 12 | Platforms | The npm package ships darwin-arm64, linux-arm64 and linux-x64 binaries only. Intel Macs need Docker. |

## Findings against the SPA fixture

**The adoption guide's Spec 1 went red on the real fixture.** After 360 actions in 11.6 seconds, a Back action moved the view from `p_spa_missing_transition` to `p_spa_details`. The SPA net declares no such arc. In the recorded trace, the states before the violation show the error view while `state.url` still reads `#overview`. So either the URL lags the view or the fixture's history entries disagree with its views. SPRINT-BPV-00 triages it.

**The guide's seeded bug went undetected.** With the `popstate` listener removed, 1378 actions including 101 Back actions finished clean. Comparing place pairs cannot see a view that stops following the URL. A property that the URL hash agrees with the reported place is needed.

## Findings against the workbench net

These were computed from `src/net/workbench-net.yaml`.

- 13 of the 31 place bindings at the time of the pre-program spike share the route `/responsive-lab.html`, because request-lifecycle places carry routes too (the net grew to 32 places in BPV-01 with `p_page_docs_index`).
- 10 of the 56 (input, output) place pairs map to more than one transition. Transition IDs cannot be recovered from place sequences alone.
- There is an arc from `p_page_responsive_lab` to `p_page_app` but none back. A default Back action after that navigation breaks a strict "moves follow the net" property.
- The guide's route generator keeps every binding with a string route and ignores `routeAliases` and query flags. `resolvePlaceForUrl` in `tests/fixtures/net-trace.js` filters to page, view and external places and honours both. The two already disagree.
- `computeTransitionCoverage` in `scripts/check-net.mjs` counts a replayed trace as asserted unless the trace sets `asserted: false`.
