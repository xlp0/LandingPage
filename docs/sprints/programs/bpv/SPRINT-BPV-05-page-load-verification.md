# SPRINT-BPV-05 Page-load verification

## Metadata

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-BPV-05` |
| Handle | `urn:pcard:sprint:SPRINT-BPV-05` |
| Status | `COMPLETED` |
| Depends on | `SPRINT-BPV-04` |
| Unblocks | `SPRINT-BPV-06` |
| Execution unit | `PR-BPV-05` |
| Poteto playbook | `feature` with `principle-prove-it-works` and `principle-test-behavior-not-implementation` |
| BMAD roles | TEA, Developer, Architect, Product Manager |
| Effort | 2 days (guess) |

## Outcome

Every in-scope page is proven to load. After any user action that loads a document, the page reaches a declared ready or error state within a time bound. The page reports a place that agrees with its URL, raises no uncaught errors and logs no console error outside an agreed baseline. This is the program's first goal, and it runs on every start URL in `tests/bombadil/scope.json` with an `explore` or `load-only` scope.

These properties test what a user would notice, which is a page that never finishes loading, shows the wrong page, throws or fails a request. They do not test how a page reaches ready.

## Work sequence

1. Record any intentional console or HTTP error exceptions in `tests/bombadil/baseline.json` (`console` and `http` arrays validated by `scripts/bombadil/baseline.mjs`, each row requiring `id`, `owner`, `reason`, and non-empty `pattern`). Run each start URL with the default error properties and fix every unexpected console or HTTP error so `tests/bombadil/baseline.json` closes with zero required exceptions (`{"console": [], "http": []}`).
2. Find where Bombadil's default `noHttpErrorCodes` reads status codes, from the installed package's source. The default cannot take a baseline, so build `noUnexpectedHttpErrors` on the same signal, filtered by the baseline's HTTP rows.
3. Write `tests/bombadil/page-load.bombadil.ts` with these properties.
   - `pageSettles`. Whenever the page state is `loading`, it becomes `ready`, `error` or `redirecting` within 10 seconds.
   - `placeIsDeclared`. The body's `data-place-id` is one of the generated `PLACES`.
   - `placeMatchesUrl`. The reported place agrees with the resolver's place for the current URL. It is skipped while the page is `redirecting`.
   - `errorIsAnnounced`. When the page state is `error`, `data-page-error` is set and `#page-alert` has text.
   - `hasMainLandmark`. Once the page is ready, exactly one element matches `main, [role="main"]`.
   - `noUnexpectedConsoleErrors` and `noUnexpectedHttpErrors`. Every console error and HTTP error status matches a baseline row.
   - The default `noUncaughtExceptions` and `noUnhandledPromiseRejections`.
   Its actions are `defaultActions` filtered to drop clicks overlapping `skippedRects` (`[data-effect]`, `a[target="_blank"]`, and redirecting `/` or `/index.html` links without `noredirect`), plus custom `ScrollPage` actions (`pageScroll`) registered via `@antithesishq/bombadil/browser` so read-only pages continue advancing until settled.
4. Add a `main` landmark to `src/pages/index.astro`, the only in-scope page without one, measured on 2026-11-17. `src/pages/fiber-conformance.astro` already has `role="main"` on `#harness` and needs no change. Wrap the existing content without changing styles.
5. Extend `scripts/bombadil/run.mjs` with a `page-load` target that loops over the generated `ENTRY_URLS`. It passes each URL's generated `ALLOW_URLS` to `--allow-url`, so a same-tab link to `/app.html` or a Home link that redirects cannot carry the run out of scope. It gives each URL its own output directory and time budget and exits non-zero if any URL fails.
6. Triage every violation the first full run finds. Fix the page, or record a baseline row or a decision, and promote each fixed bug to a Playwright spec under `tests/features/`.

## Files

- Create `tests/bombadil/page-load.bombadil.ts`
- Create `tests/bombadil/baseline.json`
- Create `tests/unit/bombadil-baseline.test.mjs`
- Edit `scripts/bombadil/run.mjs`
- Edit `src/pages/index.astro`
- Edit `package.json` to add `bombadil:page-load`
- Edit `docs/sprints/_active/DECISIONS.tsv`

## BMAD responsibilities

### TEA

- Own the console and HTTP baseline. Every row needs an owner and a reason, and none may be a catch-all pattern.
- Run the full page-load target three times and report each run's duration and violations.

### Developer

- Fix the pages that fail to settle or that throw, rather than widening the time bound.

### Architect

- Review `placeMatchesUrl` against the history policy from BPV-02, so that a Back step is never reported as a wrong place.

### Product Manager

- Approve the 10 second settle bound for each page, or set a different bound per page in the scope file.

## Acceptance criteria

- Every `explore` and `load-only` start URL runs the page-load spec.
- Three consecutive full runs of 2 minutes per URL report no violation, or every violation has a promoted Playwright spec or a decision row.
- The baseline has no row without an owner and a reason, and no pattern that matches every message.
- Every in-scope page has exactly one element matching `main, [role="main"]`.

## Test design

- `tests/unit/bombadil-baseline.test.mjs` rejects rows without an owner or reason and rejects patterns that match an empty string.
- The spec's properties are checked against seeded failures before they are trusted. These are a scratch page that never leaves `loading`, one that reports the wrong place, and one that logs an unknown console error.

## Non-goals

- Interaction-level properties for the workbench, which are BPV-06.
- Performance budgets. The 10 second settle bound is a liveness bound, not a performance target.
- `/app.html` and the game pages, which are not start URLs.

## Definition of done

- [x] **DoD-BPV-05-01** The console and HTTP baseline is complete and well formed. Verified by `node --test tests/unit/bombadil-baseline.test.mjs`.
- [x] **DoD-BPV-05-02** Every in-scope page loads clean across a full page-load run. Verified by `npm run bombadil:page-load -- --time-limit 2m`.
- [x] **DoD-BPV-05-03** Every in-scope page has one `main` landmark and still passes its existing specs. Verified by `npx playwright test tests/features/page-state-contract.spec.js tests/features/fiber-conformance.spec.js --project=features`.
- [x] **DoD-BPV-05-04** The first full run's violations and their dispositions are recorded. Verified by `grep -q 'BPV-05.*page-load triage' docs/sprints/_active/DECISIONS.tsv`.
- [x] **DoD-BPV-05-05** The existing Playwright projects pass (post-remediation: smoke passed 30, components 18, and features 602 with 16 skipped and 0 failed). Earlier on 2026-11-18, smoke passed 30, components 18, and features 597 with 16 skipped and 0 failed after four freeze-caught defects were fixed and the layout freeze was re-baselined with a recorded attribution (operator approval 2026-11-18, see the evidence file). Verified by `npm run test:smoke && npm run test:components && npm run test:features`.
