# Program BPV: Bombadil Property Verification and Explorable GUI (Graduated)

> **Program BPV Graduated — 2026-11-18.** All eight sprints (`SPRINT-BPV-00` through `SPRINT-BPV-07`) are completed, verified, and sealed into `docs/sprints/programs/bpv/` with explicit operator graduation approval on `2026-11-18`. Based on the clean full-budget local Docker nightly (`bombadil-output/nightly-2026-11-18T09-50-26Z`) and the clean shortened Docker nightly (`bombadil-output/nightly-2026-11-18T05-36-00Z`), the operator waived the remaining four calendar night waits for archival while keeping `landingpage-bombadil-bombadil-scheduler-1` running daily at `02:30` UTC.

| Field | Value |
| --- | --- |
| Audience | Scrum masters, BMAD role owners, developers, QA engineers, and operators |
| BMAD Owner | Product Manager (John) with Architect (Winston), UX Designer (Sally), Developer (Amelia), and TEA |
| Source of Truth | [`./bpv-plan.md`](./bpv-plan.md), [`../../_active/DECISIONS.tsv`](../../_active/DECISIONS.tsv), [`./evidence/BPV-pre-program-spike.md`](./evidence/BPV-pre-program-spike.md), and [`./evidence/BPV-07-graduation.md`](./evidence/BPV-07-graduation.md) |
| Status | **Graduated (`2026-11-18`)** (local Docker scheduler continues daily at `02:30` UTC) |
| Guide | [Property-Based Exploration of LandingPage with Bombadil](../../../08-testing/BOMBADIL_PROPERTY_TESTING.md) |

## Program summary

Program BPV adopted `@antithesishq/bombadil@0.7.10` to verify that every in-scope page loads to a declared state and remains inside `src/net/workbench-net.yaml` under random user actions, while cleaning up the GUI so autonomous exploration is safe and meaningful:

- Replaced six legacy readiness dialects with one body/island/recorder state contract (`js/harness/page-state.js` and `src/layouts/WorkbenchLayout.astro`) including cross-document firing hand-off and `history:<transitionId>` emission.
- Extracted pure route/place resolution (`src/net/net-core.mjs`), generated TypeScript projections (`scripts/gen-bombadil-nets.mjs` -> `tests/bombadil/generated/workbench-net.ts`), and added `triggerDrift()` validation (`selector` and `call`).
- Built `scripts/check-explorable-gui.mjs` (covering islands, in-scope Astro pages, native dialog bans, `data-effect` tags, and `aria-pressed` semantics) and promoted property-found regressions into Playwright (`tests/features/spa-history-flood.spec.js`, `tests/features/explorable-gui.spec.js`, `tests/features/lab-popout.spec.js`, `tests/features/page-state-contract.spec.js`, `tests/features/target-mirror.spec.js`).
- Added trace-to-net replay (`scripts/bombadil/trace-to-net.mjs`, `--bombadil-traces` in `scripts/check-net.mjs`) and local Docker nightly automation (`docker/bombadil/compose.yml`, `scripts/bombadil/nightly.sh`, `scripts/bombadil/nightly-scheduler.sh`).

## Sprint specifications (`BPV-00` .. `BPV-07`)

| Order | Sprint | Goal | Depends on | Specification |
| ---: | --- | --- | --- | --- |
| 1 | BPV-00 | Pin Bombadil, add a hermetic runner and prove a canary bug is found and shrunk on the SPA fixture. | None | [Toolchain, runner and SPA canary](./SPRINT-BPV-00-toolchain-runner-and-spa-canary.md) |
| 2 | BPV-01 | Fix the exploration scope and remove dead, duplicate and misleading GUI. | BPV-00 | [Scope and GUI subtraction](./SPRINT-BPV-01-scope-and-gui-subtraction.md) |
| 3 | BPV-02 | Extract a pure net core and generate every projection the specs need. | BPV-01 | [Net core and generated projections](./SPRINT-BPV-02-net-core-and-generated-projections.md) |
| 4 | BPV-03 | Give every page and island one self-reported state contract. | BPV-02 | [Page state contract](./SPRINT-BPV-03-page-state-contract.md) |
| 5 | BPV-04 | Make every control explorable, tag side effects and replace native dialogs. | BPV-03 | [Explorable controls](./SPRINT-BPV-04-explorable-controls.md) |
| 6 | BPV-05 | Verify that every in-scope page loads to a declared state with no errors. | BPV-04 | [Page-load verification](./SPRINT-BPV-05-page-load-verification.md) |
| 7 | BPV-06 | Explore the workbench routes, the recorder lifecycle and the mirrored target place. | BPV-05 | [Workbench interaction specs](./SPRINT-BPV-06-workbench-interaction-specs.md) |
| 8 | BPV-07 | Feed traces into coverage, run nightly, promote violations and request graduation. | BPV-06 | [Coverage, nightly runs and graduation](./SPRINT-BPV-07-coverage-nightly-and-graduation.md) |

## Graduation verification summary (2026-11-18)

| Check or Artifact | Outcome | Link |
| --- | --- | --- |
| Full-budget Docker nightly Run 1 (`nightly-2026-11-18T09-50-26Z`) | Clean (`Result: clean`, 9 steps exit `0`, canary `5/5`, `32/32` traces replayed after `deepLinkEntry` fix) | [`./evidence/BPV-07-graduation.md`](./evidence/BPV-07-graduation.md) |
| Shortened Docker nightly (`nightly-2026-11-18T05-36-00Z`) & `bombadil-gate` | Clean (`Result: clean`, `19` asserted + `2` explored of `66` workbench transitions) | [`./evidence/BPV-07-coverage.md`](./evidence/BPV-07-coverage.md) |
| Unit, docs, GUI, net, and Playwright suites at graduation | `test:unit` `274/274`, `docs:check` `252` files PASS, `check:bombadil-nets` PASS, `check:explorable-gui` PASS, `test:smoke` `30`, `test:components` `18`, `test:features` `602` passed / `16` skipped / `0` failed | [`../gqc/evidence/PROGRAM-EXECUTION-AUDIT.md`](../gqc/evidence/PROGRAM-EXECUTION-AUDIT.md) |
| Operator sign-off & scheduler status | Approved on `2026-11-18` (`DECISIONS.tsv` phase `BPV-graduation`); `landingpage-bombadil-bombadil-scheduler-1` remains active daily at `02:30` UTC | [`../../_active/DECISIONS.tsv`](../../_active/DECISIONS.tsv) |

## Related archives

- **Program GQC**: [docs/sprints/programs/gqc/INDEX.md](../gqc/INDEX.md) (Graduated 2026-11-18)
- **Program ERB**: [docs/sprints/08-testing/INDEX.md](../../08-testing/INDEX.md) (Graduated 2026-10-21)
- **Program SMO**: [docs/sprints/01-architecture/INDEX.md](../../01-architecture/INDEX.md) (Graduated 2026-10-21)
