# Program execution audit before graduation

| Field | Value |
| --- | --- |
| Audience | Operator, Scrum Master, and the BMAD role leads deciding on graduation |
| BMAD Owner | Scrum Master with TEA |
| Source of Truth | Every `SPRINT-*.md` in this folder, `DECISIONS.tsv`, and the gates re-run in this checkout on 2026-11-18 |
| Question | Are all sprints executed and reconciled, and what remains for graduation? |
| Verdict | **Graduated (`2026-11-18`).** All GQC (`00..07`) and BPV (`00..07`) sprints are executed, green on durable gates, approved for graduation by the operator, and archived in `docs/sprints/programs/gqc/` and `docs/sprints/programs/bpv/`. |

## Method

Each sprint was judged by its own Definition of Done, not by its status label. A line counts only when this checkout can reproduce its check. Where a check costs a Bombadil minute-budget run, the run was made here and the trace is named. Historical snapshots from earlier on `2026-11-18` (prior to the `layout-freeze` re-baseline, cross-browser smoke install, BPV-06/07 completion, and post-audit reconciliation) are preserved in chronological updates below.

## Program GQC

| Sprint | Declared | Verdict | Reproduced at reconciliation head |
| --- | --- | --- | --- |
| GQC-00 census and baseline | COMPLETED | Executed | `check:net` 32 places / 66 transitions; `docs:check` 252 files |
| GQC-01 Playwright trust | COMPLETED | Executed | `check:playwright-discovery` features 618 tests in 28 files; smoke 30 in 11; components 18 in 14 (`ciRetries: 0`) |
| GQC-02 GUI journeys and seams | COMPLETED | Executed | `test:smoke` 30 pass, `test:components` 18 pass, `test:features` 602 pass / 16 skip / 0 fail |
| GQC-02A Layer 1 net census | COMPLETED | Executed | `check:net` session P-invariant holds (`clm-kernel/petri` + `clm-kernel/store`) |
| GQC-02B Astro host and islands | COMPLETED | Executed | `npm run build` complete; `check:explorable-gui` pass; page-state contract passes |
| GQC-03 target policy and capture | COMPLETED | Executed | unit suite `274` pass, including target policy and capture lifecycle tests |
| GQC-04 GUI module ownership | COMPLETED | Executed | unit suite `274` pass; `check:explorable-gui` pass |
| GQC-05 package renderer and server | COMPLETED | Executed | unit suite `274` pass; `check:bombadil-nets` pass; `test:smoke` 30 pass |
| GQC-06 performance baselines | COMPLETED | Executed on recorded evidence | `place-bytes.mjs --enforce-zero-island-places` pass; report in `evidence/GQC-06-performance-report.md`; no re-measure of the paired baseline in this audit |
| GQC-07 docs and graduation | COMPLETED | Executed & graduated | `docs:check` pass (`252` files); `test:features` green (`602` pass, `16` skip, `0` fail); `test:smoke:cross-browser` `60/60`; operator approval closed `2026-11-18` |

GQC's sprint DoD items, graduation checklist, and operator graduation approval are met.

## Program BPV

| Sprint | Declared | Verdict | Reproduced at reconciliation head |
| --- | --- | --- | --- |
| BPV-00 toolchain and SPA canary | COMPLETED | Executed | `bombadil 0.7.10`; runner tests pass; canary fixture spec and nightly canary pass (`5/5`); `bombadil:spa` clean |
| BPV-01 scope and GUI subtraction | COMPLETED | Executed | `check:explorable-gui` pass; `src/pages/responsive-lab.astro` `223` lines; `explorable-gui` & `lab-popout` specs pass |
| BPV-02 net core and projections | COMPLETED | Executed | `check:bombadil-nets` pass; `tests/fixtures/net-core-golden.json`, `net-core`, `bombadil-nets` (incl. mutated scope & `call` trigger drift) tests pass |
| BPV-03 page state contract | COMPLETED | Executed | `page-state` (`history:` + hand-off) and `net-parity` tests pass; `page-state-contract.spec.js` passes |
| BPV-04 explorable controls | COMPLETED | Executed | `check:explorable-gui` (islands + in-scope Astro pages) pass; `aria-pressed` toggles fixed & tested; `0` native dialogs; `bombadil:lab-smoke` clean |
| BPV-05 page-load verification | COMPLETED | Executed | 3 full runs + nightly Run 1 clean; `test:features` green (`602` pass, `16` skip, `0` fail) |
| BPV-06 workbench interaction specs | COMPLETED | Executed | workbench spec, host mirror, `history:` emission and `trace-to-net.mjs` present; 10m run & nightly Run 1 clean (`214` / `>20` firings); DoD-06-01..05 pass ([evidence](../../bpv/evidence/BPV-06-workbench.md)) |
| BPV-07 coverage, nightly, graduation | COMPLETED | Executed & graduated | local Docker nightly (`docker/bombadil/`), [coverage](../../bpv/evidence/BPV-07-coverage.md) and [graduation](../../bpv/evidence/BPV-07-graduation.md) pass; `check-net.mjs --bombadil-traces` excludes `spa-canary*` and accounts for `100%` of traces (`replayed + failed === bombadilTraces`); graduated `2026-11-18` (operator waived remaining 4 nightly waits while scheduler continues daily) |

## Bombadil runs made in this audit

| Command | Exit | Result |
| --- | --- | --- |
| `npm run bombadil:page-load -- --time-limit 2m`, three times | 0, 0, 0 | 6 of 6 entry URLs each time, 0 violations, 0 console errors, 120 seconds per entry |
| `npm run bombadil:spa -- --time-limit 2m` | 0 | SPA fixture clean against the net properties |
| `npm run bombadil:lab-smoke -- --time-limit 2m` | 0 | Lab clean, no quiescence warning |
| seeded `never-ready`, `wrong-place`, `unknown-console-error` | 2, 2, 2 | each page-load property fires on its own seeded failure |

## Current graduation readiness & historical audit log

**Current status (2026-11-18 graduation):** All execution items, automated gates, and operator graduation approvals for both **Program GQC** and **Program BPV** are complete:
1. **Program GQC**: Operator graduation approved in [`GQC-07-docs-and-graduation.md`](./GQC-07-docs-and-graduation.md) and [`SPRINT-GQC-07-documentation-alignment-and-gates.md`](../SPRINT-GQC-07-documentation-alignment-and-gates.md); archived at `docs/sprints/programs/gqc/`.
2. **Program BPV**: Operator approved graduation in [`BPV-07-graduation.md`](../../bpv/evidence/BPV-07-graduation.md) based on clean full-budget Run 1 (`10:23:04Z` on `2026-11-18`) and the clean shortened Docker nightly (waiving the remaining 4 calendar night waits while `bombadil-scheduler` continues daily at `02:30` UTC); archived at `docs/sprints/programs/bpv/`.

### Historical Finding 1 (Initial 2026-11-18 audit — subsequently resolved)

Initially before BPV-05..07 completion and the `layout-freeze` re-baseline, graduation was `NO-GO` because:

1. BPV-06 and BPV-07 had not yet executed.
2. `test:features` failed `25` pre-Astro `layout-freeze` tests (`BPV-05` & `GQC-07` blocked).
3. Firefox/WebKit smoke browsers were not installed on this workstation.
4. `SPRINT-GQC-07` left operator approval open (still open by design).

### Historical Update 2026-11-18 (Re-baseline & BPV-05/06/07 completion)

Items 1 and 2 resolved. After fixing four freeze-caught defects and attributing the remaining pre-Astro shifts ([BPV-05 evidence](../../bpv/evidence/BPV-05-page-load.md)), the operator approved re-baselining `layout-freeze`, bringing `test:features` to `597` passed (`16` skipped, `0` failed at that point). BPV-06 and BPV-07 closed the same day.

### Update 2026-11-18, later (Browser matrix & nightly Run 1)

The GQC browser matrix closed: Firefox `1555` and WebKit `2370` ran `npm run test:smoke:cross-browser` (`60` of `60` in `37.4 s`, `30` per browser; [`cross-browser-2026-11-18.txt`](./cross-browser-2026-11-18.txt)). BPV's local Docker scheduler (`docker/bombadil/compose.yml`, `RUN_ON_START=1`) ran nightly Run 1 (`09:50:26Z` .. `10:23:04Z`, `Result: clean`, `nine` steps exit `0`, canary `5/5`, workbench `>20` firings; after adding `p_spa_missing_transition` as `deepLinkEntry`, `32` of `32` Run 1 traces replay with `0` rejected instead of the pre-fix `18/14` on-disk `coverage.md`).

### Final 2026-11-18 Post-Audit Reconciliation Verification

After resolving all BPV/GQC control (`aria-pressed`, page-level `data-testid`), `net-core` golden, `history:` cross-document firing, unresolved-trace attribution, `ciRetries: 0`, and `docs:check` living-doc gaps:

| Command | Result |
| --- | --- |
| `npm run test:smoke` | `30` passed |
| `npm run test:components` | `18` passed |
| `npm run test:features` | `602` passed, `16` skipped, `0` failed |
| `npm run test:smoke:cross-browser` | `60` passed (`30` Firefox and `30` WebKit) |
| `npm run check:playwright-discovery` | smoke `30` in `11` files, components `18` in `14` files, features `618` in `28`, `53` category files (`666` total), `0` cross-browser repeats |
| `npm run test:unit` | `274` passed, `0` failed |
| `npm run check:net` | PASS, `32` places and `66` transitions, session P-invariant holds (`explored=2`, `neverFired=45` with Bombadil traces) |
| `node scripts/check-net.mjs --bombadil-traces bombadil-output/nightly-2026-11-18T09-50-26Z` | PASS, `runs=9 bombadilTraces=32 replayed=32 failed=0` |
| `npm run check:bombadil-nets`, `npm run check:explorable-gui`, `npm run docs:check` | PASS (`docs:check`: `252` files, `14` allowlisted historical links, `106` netIds) |
