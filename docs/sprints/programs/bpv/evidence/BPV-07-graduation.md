# BPV-07 graduation evidence

| Field | Value |
| --- | --- |
| Audience | Operator, Product Manager and Scrum Master deciding on Program BPV graduation |
| BMAD Owner | Product Manager with TEA |
| Source of Truth | [bpv-plan.md](../bpv-plan.md) "Graduation", [SPRINT-BPV-07](../SPRINT-BPV-07-coverage-nightly-and-graduation.md), [BPV-07 coverage](./BPV-07-coverage.md) |
| Status | **Graduated on 2026-11-18 (operator approval).** All six graduation items are satisfied: items 1 and 3–6 are met, and for item 2 the operator approved graduation based on the clean full-budget local Docker nightly (`bombadil-output/nightly-2026-11-18T09-50-26Z`) and the clean shortened Docker nightly (`bombadil-output/nightly-2026-11-18T05-36-00Z`), waiving the remaining four calendar night waits while `bombadil-scheduler` remains active daily at `02:30` UTC. No CI runs on GitHub (operator ruling, 2026-11-18). |
| Date | 2026-11-18 |

## The graduation list

| # | Item | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Every in-scope row of `tests/bombadil/scope.json` has a spec that runs nightly. | **Met in the repository.** | `explore` rows: `target-spa-fixture` (`spa`), `workbench-responsive-lab` (`lab-smoke`, `workbench`, `page-load`), and `workbench-landing-portal` (`page-load`). `load-only` rows: sprint registry, fiber inspector and fiber conformance (`page-load`). `scripts/bombadil/nightly.sh`, run by the local `bombadil-scheduler` Docker service, runs all of them. |
| 2 | Five consecutive nightly runs are clean, or every violation in them is promoted to a Playwright spec with a decision row. | **Approved by operator (`2026-11-18` waiver of 4 remaining waits).** | `bombadil-scheduler` started 2026-11-18 with `RUN_ON_START=1` at full budgets. Run 1, `bombadil-output/nightly-2026-11-18T09-50-26Z/summary.md`, reports "Result: clean": build, both net checks, canary (5 of 5 seeded-bug detections), spa, lab-smoke, page-load, workbench and workbench-firings all exit 0 with 0 violations and 0 quiescence warnings (following the clean shortened nightly `bombadil-output/nightly-2026-11-18T05-36-00Z`). On `2026-11-18`, the operator approved graduation now and waived waiting for the remaining 4 calendar runs while `bombadil-scheduler` continues daily at `02:30` UTC. |
| 3 | The canary still detects and shrinks its seeded bug. | **Met locally.** | After the `make-canary.mjs` fix, `node scripts/bombadil/canary.mjs` detected the bug in 5 of 5 runs. `bombadil browser shrink` reproduced it 3 of 3 times at 3 actions. Before the fix the canary detected 0 of 5. |
| 4 | The GUI lint and the net drift check run in CI. | **Met on local Docker.** | The operator replaced GitHub CI with local Docker. Every nightly runs `check:bombadil-nets` and `check:explorable-gui`, and `bombadil-gate` in `docker/bombadil/compose.yml` ran `check:bombadil-nets`, `check:explorable-gui`, and `check:net` cleanly in the container on 2026-11-18 (subsequently extended in `compose.yml` to also run `docs:check` and `test:unit`). |
| 5 | The adoption guide's status changes from proposal to current. | **Met.** | `docs/08-testing/BOMBADIL_PROPERTY_TESTING.md` now says "Current" and describes the built runner, specs, contract, coverage, nightly workflow and promotion procedure. |
| 6 | `npm run docs:check` passes, and the smoke, components and features projects pass. | **Met locally.** | See "Verification" below. |

## Operator graduation approval (closed 2026-11-18)

1. The nightly series started on `2026-11-18` with `RUN_ON_START=1`: Run 1 (`09:50:26Z` .. `10:23:04Z`) exited `0` (`Result: clean`, `32/32` traces replaying after the `deepLinkEntry` fix), following the shortened Docker nightly (`05-36-00Z`, `Result: clean`). `bombadil-scheduler` continues running daily at `02:30` UTC; any future violations are shrunk, inspected, promoted under `tests/features/`, and recorded in `docs/sprints/_active/DECISIONS.tsv`.
2. Explored coverage measurement recorded in [BPV-07 coverage](./BPV-07-coverage.md) (`19` asserted + `2` explored of `66` workbench transitions; `4` of `4` SPA transitions).
3. Architect closed the SPA deep-link question (`p_spa_missing_transition.deepLinkEntry = true`), so all `32` traces in Run 1 replay cleanly.
4. On `2026-11-18`, the operator approved Program BPV graduation (waiving the remaining 4 calendar waits) and archival to `docs/sprints/programs/bpv/` (`DECISIONS.tsv` rows `BPV-07 graduation request` and `BPV-graduation`).

## Verification

Final gate run on 2026-11-18, after every BPV-07 change:

| Command | Result |
| --- | --- |
| `node --test tests/unit/bombadil-trace.test.mjs tests/unit/check-net.test.mjs` (DoD-07-01) | PASS, 24 tests |
| `node scripts/check-net.mjs --bombadil-traces bombadil-output && test -s docs/sprints/programs/bpv/evidence/BPV-07-coverage.md` (DoD-07-02) | exit 0 |
| DoD-07-03 as revised for local Docker (see the sprint) | exit 0 |
| `! grep -q 'Proposal' docs/08-testing/BOMBADIL_PROPERTY_TESTING.md && npm run docs:check` (DoD-07-04) | exit 0 |
| `npm run test:unit` | PASS, 266 tests at graduation check (274 tests post-remediation) |
| `npm run build:astro`, `check:net`, `check:bombadil-nets`, `check:explorable-gui`, `check:playwright-discovery`, `make-canary.mjs --check` | PASS |
| `test:smoke`, `test:components`, `test:features` | 30, 18 and 601 passed at graduation check, 16 skipped, 0 failed (post-remediation: 30, 18, and 602 passed, 16 skipped, 0 failed) |
| `node scripts/bombadil/canary.mjs` | 5 of 5 detections |
| `npm run bombadil:page-load -- --time-limit 1m` after the Home-link skip | exit 0, 6 of 6 entries, 0 violations. One quiescence line is the driver's own shutdown at the time limit ("time limit reached while waiting for driver"), not a stall. |

No CI runs on GitHub, by operator ruling. The local Docker results are in "Local Docker" below.

## Local Docker

| Check | Result |
| --- | --- |
| `docker compose -f docker/bombadil/compose.yml build` | Image `landingpage-bombadil:local` built: Node 24, Debian bookworm, Chromium 156 on linux/arm64, Bombadil 0.7.10 linux-arm64, `better-sqlite3` loads. |
| `docker compose -f docker/bombadil/compose.yml --profile manual run --rm bombadil-gate` | PASS on 2026-11-18 for `check:bombadil-nets`, `check:explorable-gui`, and `check:net` (`bombadil-gate` in `compose.yml` was subsequently extended to also run `docs:check` and `test:unit`, verified on host post-remediation) |
| A shortened nightly in the container: `TIME_LIMIT=1m`, `WORKBENCH_TIME_LIMIT=2m`, `PAGE_LOAD_TIME_LIMIT=30s`, `CANARY_TIME_LIMIT=1m` (`bombadil-output/nightly-2026-11-18T05-36-00Z`) | exit 0, "Result: clean". The build and both checks passed. The canary found its seeded bug in 5 of 5 runs. `spa`, `lab-smoke`, `page-load` and `workbench` ended with 0 violations and 0 quiescence warnings, and the workbench met its 20-firing bound. Coverage matched the host measurement: 19 asserted, 2 explored only and 45 never fired. |
| `bombadil-scheduler` | First trial start was stopped and removed, and it is not left running from that trial. `NIGHTLY_AT=25:99` is refused with exit 2. The real series started later the same day, below. |
| The host's `dist/` | Not touched; the container builds into its own volume. |

| First scheduled full-budget nightly in the container (`bombadil-output/nightly-2026-11-18T09-50-26Z`, started 09:50:26Z, finished 10:23:04Z) | exit 0, "Result: clean". All nine steps in `summary.md` exit 0 (`build`, `check-bombadil-nets`, `check-explorable-gui`, `canary`, `spa`, `lab-smoke`, `page-load`, `workbench`, `workbench-firings`). The canary detected its seeded bug 5 of 5. SPA coverage 4 of 4, workbench 19 asserted of 66. While the run's original `coverage-rejected.log` archived 14 pre-fix lines, replaying `bombadil-output/nightly-2026-11-18T09-50-26Z` after the deep-link fix replays 32 of 32 Bombadil traces with 0 rejected. |

The scheduler remains up and logged `next nightly in 58016s (at 02:30 UTC)`.
