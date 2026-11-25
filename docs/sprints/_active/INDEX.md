# Active Sprint Index

| Field | Value |
| --- | --- |
| Audience | Scrum masters, BMAD role owners, developers, and operators |
| BMAD Owner | Scrum Master |
| Source of Truth | [`./DECISIONS.tsv`](./DECISIONS.tsv) and [`../INDEX.md`](../INDEX.md) |
| Status | `IDLE` (`0` active sprints; `Program SLC` graduated `2026-11-20`; `Program DCI` proposed `2026-11-24`) |
| Consensus Kernel | `clm-kernel@0.0.26` |
| Drift Gate | `npm run docs:check` |

## Active program status

**Standby (`0` active sprints as of `2026-11-20`).**

Program SLC (`SPRINT-SLC-00` through `SPRINT-SLC-04`) graduated with operator approval on `2026-11-20` and was archived into [`docs/sprints/programs/slc/`](../programs/slc/INDEX.md). This directory retains [`./DECISIONS.tsv`](./DECISIONS.tsv) as the canonical append-only decision ledger for future sprint programs.

## Proposed program

Program DCI (Declared reach, Closed navigation, and Interface state) was proposed on `2026-11-24` and revised after two EGM review rounds. The operator confirmed its six-sprint scope on `2026-11-25` local time. No sprint has started. The program waits for Flag 1 and Flag 2 of the plan. The workspace status stays `IDLE` until `SPRINT-DCI-00` starts.

| Order | Sprint | Goal | Status |
| ---: | --- | --- | :---: |
| Plan | [`dci-plan.md`](./dci-plan.md) | Outcome, design decisions, scope flags, risks, sequence, and graduation rules | `PLANNED` |
| 1 | [`SPRINT-DCI-00`](./SPRINT-DCI-00-pinned-baseline-and-stored-state.md) | Pinned start commit, a run of every gate, and the stored-state table | `PLANNED` |
| 2 | [`SPRINT-DCI-01`](./SPRINT-DCI-01-sprint-registry-estate-map.md) | Groups, filters, search, and deep links on the sprint registry, with safe rendering | `PLANNED` |
| 3 | [`SPRINT-DCI-02`](./SPRINT-DCI-02-navigation-closure.md) | A nav on four pages and a net rule for pages without links | `PLANNED` |
| 4 | [`SPRINT-DCI-03`](./SPRINT-DCI-03-linkable-lab-state.md) | Device, size, orientation, and mode in the Lab URL | `PLANNED` |
| 5 | [`SPRINT-DCI-04`](./SPRINT-DCI-04-refusal-reasons-and-native-dialogs.md) | A visible reason for each disabled stage control, and no native dialog | `PLANNED` |
| 6 | [`SPRINT-DCI-05`](./SPRINT-DCI-05-verification-and-graduation.md) | Full gate matrix, living docs, and the archive | `PLANNED` |
| Held | [`dci-local-backlog.md`](./dci-local-backlog.md) | Five candidates with entry conditions and one to-do list, including the drag and command-line work | `HELD` |

Planning evidence is in [`evidence/DCI-pre-program-study.md`](./evidence/DCI-pre-program-study.md) and [`evidence/DCI-egm-review.md`](./evidence/DCI-egm-review.md).

## Verification gates for active work

| Gate | Command | Scope |
| --- | --- | --- |
| StageShow CSS clash check | `npm run stageshow:check-css` | Verifies `0` class collisions across StageShow kit, examples, teaching pairs, and authored scene bundles (`85` CSS files, `4` explicit bundles) |
| StageShow host layout sweep | `npm run stageshow:sweep` | Captures `20` Chromium snapshots across `5` routes at `1440px`, `820px`, `390px`, and `358px` using ephemeral SQLite storage |
| Unit, observability, and contract suite | `npm run test:unit` | Runs all unit, observability, and contract tests on `clm-kernel@0.0.26` (`304` tests across `20` suites passing) |
| Docs, net, GUI, and build parity | `npm run check:net`, `npm run docs:check`, `npm run check:explorable-gui`, `npm run check:bombadil-nets`, `npm run build` | Enforces Petri net P-invariants, living-doc drift checks, `data-testid` / `data-effect` lint, and bundle parity |
| Playwright verification projects | `npm run test:smoke`, `npm run test:components`, `npm run test:features`, `npm run test:smoke:cross-browser` | Executes `--project=smoke`, `--project=components`, `--project=features`, `--project=smoke-firefox`, and `--project=smoke-webkit` |

## Graduated programs

| Program | Code | Archive | Graduation date | Status |
| --- | :---: | --- | :---: | :---: |
| Post-SSG Local Cleanup and Subtraction | `SLC` | [programs/slc](../programs/slc/INDEX.md) | 2026-11-20 | Graduated |
| StageShow Craft, Bombadil Dashboard Handles, and Coherent Layout | `SSG` | [programs/ssg](../programs/ssg/INDEX.md) | 2026-11-20 | Graduated |
| Bombadil Property Verification and Explorable GUI | `BPV` | [programs/bpv](../programs/bpv/INDEX.md) | 2026-11-18 | Graduated |
| Guided SPA Workbench, Astro Islands, Petri Net, and Docs Gates | `GQC` | [programs/gqc](../programs/gqc/INDEX.md) | 2026-11-18 | Graduated |
| Device-Sensitive Testing Infrastructure | `ERB` | [08-testing](../08-testing/INDEX.md) | 2026-10-21 | Graduated |
| Submodule Modularity and Universal MCard Browser | `SMO` | [01-architecture](../01-architecture/INDEX.md) | 2026-10-21 | Graduated |
