# BPV-05 page-load verification evidence

| Field | Value |
| --- | --- |
| Audience | TEA, Scrum Master, and the operator reviewing BPV graduation |
| BMAD Owner | TEA with Developer and Architect |
| Source of Truth | [SPRINT-BPV-05](../SPRINT-BPV-05-page-load-verification.md), `tests/bombadil/page-load.bombadil.ts`, `tests/bombadil/baseline.json` |
| Status | Complete on 2026-11-18. All five DoD items pass. DoD-BPV-05-05 closed after the layout-freeze re-baseline below. |

## What changed

| Item | Result |
| --- | --- |
| Generated boundary | `scripts/gen-bombadil-nets.mjs` now emits `ALLOW_URLS`, the boundary BPV-02 named and did not build. One host-wildcard match pattern per in-scope page and view, with the `scope.json` boundary routes removed. |
| Runner | `scripts/bombadil/run.mjs` gained the `page-load` target. It plans one bounded Bombadil run per generated `ENTRY_URLS` entry, gives each its own output directory, and keeps the server up for the whole set. It runs every entry, reports each failure, and exits non-zero if any failed. |
| Spec | `tests/bombadil/page-load.bombadil.ts` owns `pageSettles`, `placeIsDeclared`, `placeMatchesUrl`, `errorIsAnnounced`, `hasMainLandmark`, `noUnexpectedConsoleErrors`, `noUnexpectedHttpErrors`, plus the default `noUncaughtExceptions` and `noUnhandledPromiseRejections`. It drops `destructive`, `external`, `download` and `file-picker` clicks and exposes a custom `ScrollPage` action so read-only pages keep running. |
| Baseline | `tests/bombadil/baseline.json` is empty because three full runs measured zero console errors and zero 4xx/5xx resource failures. `scripts/bombadil/baseline.mjs` validates rows and classifies HTTP failures from the console signal. |
| Landmark | `src/pages/index.astro` wraps its content in one `<main>` with `display: contents`, so the portal gains the landmark and keeps its flex layout. `src/pages/fiber-conformance.astro` already declared `role="main"`. |
| Scripts | `package.json` adds `bombadil:page-load`. |
| Seeded failures | `tests/bombadil/fixtures/never-ready.html`, `wrong-place.html` and `unknown-console-error.html` prove each property fires when it should. |

## Verification

| Command | Result |
| --- | --- |
| `node --test tests/unit/bombadil-baseline.test.mjs` | PASS, 6 tests |
| `node --test tests/unit/bombadil-nets.test.mjs` | PASS, 8 tests |
| `node --test tests/unit/bombadil-runner.test.mjs` | PASS, 13 tests |
| `npm run test:unit` | PASS, 243 tests |
| `npm run bombadil:page-load -- --time-limit 2m` run 1 (`page-load-2026-11-17T17-56-20-856Z`) | exit 0, 6 of 6 entries, 0 violations |
| the same command, run 2 (`page-load-2026-11-17T18-10-29-498Z`) | exit 0, 6 of 6 entries, 0 violations |
| the same command, run 3 (`page-load-2026-11-17T18-22-31-358Z`) | exit 0, 6 of 6 entries, 0 violations |
| Trace sweep over the three runs | 0 console errors, 0 HTTP failures, 120 seconds per entry in each full run |
| `npx playwright test tests/features/page-state-contract.spec.js tests/features/fiber-conformance.spec.js --project=features` | PASS, 407 passed, 15 skipped |
| `npm run test:smoke` | PASS, 30 tests |
| `npm run test:components` | PASS, 18 tests |
| `npm run test:features` | FAIL, 570 passed, 16 skipped, 25 failed, all `tests/features/layout-freeze.spec.js` |

### Seeded failures

Each seeded page was run with the page-load spec and `--allow-url '*://*/tests/bombadil/fixtures/*'`. Each exited 2, and each reported only the property it seeds.

| Fixture | Violation | Exit |
| --- | --- | --- |
| `never-ready.html` | `pageSettles` | 2 |
| `wrong-place.html` | `placeMatchesUrl` | 2 |
| `unknown-console-error.html` | `noUnexpectedConsoleErrors` | 2 |

## Historical open item (resolved on 2026-11-18)

Prior to operator approval later on 2026-11-18, `test:features` had 25 `layout-freeze` failures against pre-GQC baselines from 2026-10-07 (`220 elements moved` for `app`, `94` for `index`, `137` for `responsive-lab`, and `324` for `fiber-inspector`). That open item was closed in BPV-05 on 2026-11-18 after fixing four freeze-caught defects and re-baselining `layout-freeze` with recorded attribution and operator approval (see the closure table below).

### Attribution of the 25 failures (2026-11-18)

The STY program has graduated (`docs/sprints/programs/sty/README.md`), so it has no owner left to run the re-baseline. The baseline file sets its own rule in every `rebaselines` entry: "an intentional, specified change is re-baselined with a record". EPIC-RVP re-baselined `responsive-lab` three times under that rule. `SPRINT-BPV-01` step 45 also plans a re-baseline once, recorded with an entry naming GQC-02B and BPV-01.

The spec's diff compares elements by position. Any new tag in `<head>` therefore shifts every later index, so the "N elements moved" counts say nothing about geometry. A scratch script aligned the baseline and the current DOM by their tag and class sequence, then compared the boxes of matched elements. The 25 failures resolve as follows.

| Page | Geometry after alignment | Cause |
| --- | --- | --- |
| `fiber-inspector` | Content moved 34.5 px down at every viewport. The intro sentence read "is markedunwitnessed". | **Two defects, now fixed.** BPV-03 gave `#panel-status` the text "Loading…" and never cleared it on success. Astro's HTML compression dropped the space before the `unwitnessed` span. After the fix, 0 boxes move. `tests/features/fiber-inspector.spec.js` gains two tests; each failed before its fix and passes after. |
| `app` | Mobile content moved 2 px down. The chat and edit panel titles were 3.5 px narrower. | **Two defects, now fixed.** BPV-04 turned `.mobile-back-btn` from a `div` into a `button`, and the button's default borders and font added 2 px. `public/css/mcard-manager.css` now resets them. Astro compression dropped the space after the icon in both titles, and `src/pages/app.astro` restores it with `{' '}`. After the fixes, only the visually hidden `#page-status` (1×1 px) differs. |
| `fiber-conformance` | Only `#page-status` and the `#harness` main landmark are new, and the page height is unchanged. | BPV-03 and BPV-05, as specified. |
| `index` | The page is 22.5 px shorter at desktop widths and 605 to 628 px shorter at phone widths. | The portal went from five cards to one in commit `9e08c3c` (2026-10-20, "streamline index navigation to responsive lab"). BPV-01 removed the alias buttons and regenerated the Penpot navigation to Home and Docs Index, and BPV-05 added the `main` landmark. Nothing is clipped: `scrollHeight` equals the lowest element at 360, 390 and 1280 px. |
| `responsive-lab` | 150 elements became 450. The dock is 142.5 px shorter, and the URL strip grew by 100.5 px. | GQC-02B islands, GQC-03 target chips, BPV-01 copy removal, BPV-04 dedup and relabels, and the BPV-04 `[hidden]` rule, which now hides the "💾 Saved" label in `IDLE`. |

After these fixes, every remaining move is attributed to a specified change. Until the re-capture, the 25 cases still failed, because the positional diff counts the new head tags.

### Re-baseline (2026-11-18, operator approved)

| Step | Result |
| --- | --- |
| Backup | The pre-capture file, sha1 `7e35c560`, was copied to the session scratchpad before the capture. |
| `STY_FREEZE=capture npx playwright test tests/features/layout-freeze.spec.js --project=features -g 'capture baseline'` | Pass. app 294, index 777, responsive-lab 450, fiber-inspector 329, fiber-conformance 19 and pkc-docs-index 48 elements per viewport. These match the aligned-diff counts above. |
| Determinism check | `pkc-docs-index`, which no change touched, re-captured box-for-box identical at all five viewports. |
| Record | The four earlier `rebaselines` entries are kept, and a fifth entry (2026-11-18, Program GQC and Program BPV) cites this table. The file stays in `compact-v1`, and its unchanged parts serialize byte-identical. |
| Mutation controls on `index@web` | `padding-1px` detected, `display` detected, `colour-only` moved no box. All three pass. |
| `npx playwright test tests/features/layout-freeze.spec.js --project=features`, twice | 30 passed, 1 skipped (capture), both runs |
| `npm run test:smoke && npm run test:components && npm run test:features` | exit 0. At BPV-05 close: 30, 18, and 597 passed with 16 skipped (post-remediation: 30, 18, and 602 passed with 16 skipped, 0 failed) |
| `npm run test:unit`, `npm run docs:check` | At BPV-05 close: 243 unit tests passed and `docs:check` passed (post-remediation: 274 unit tests and 250 Markdown files pass). |
| `npm run bombadil:page-load -- --time-limit 2m` after the fixes (`page-load-2026-11-18T02-41-22-933Z`) | exit 0. All six entries ran to the time limit with 0 violations and 0 quiescence warnings. |

The baseline lives in the root repository at `docs/sprints/programs/sty/style/layout-baseline.json`, which is a different git repository from `LandingPage`. A commit needs both.

One defect remains that the freeze cannot see, because the baseline was worse. At 360 and 390 px, `index`'s `.top-controls` starts at x = −36.5, so part of the Faro badge is off screen. In the baseline it started at x = −504.

## Limits

- The GitNexus index does not cover the new BPV files; `impact resolveRunPlan` returned `UNKNOWN`, and every caller was confirmed by text search instead (`tests/unit/bombadil-runner.test.mjs` and `package.json` only).
- A Bombadil spec in 0.7.10 runs in a sandbox with no `URLSearchParams`, so the place resolver parses the query string by hand.
- The spec cannot import a `.mjs` module, so its baseline matcher mirrors `scripts/bombadil/baseline.mjs`; the unit test owns the row rules and both use the same JSON.
