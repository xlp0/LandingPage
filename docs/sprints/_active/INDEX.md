# Active Sprint Index

| Field | Value |
| --- | --- |
| Audience | Scrum masters, BMAD role owners, developers, and operators |
| BMAD Owner | Scrum Master |
| Source of Truth | [`./DECISIONS.tsv`](./DECISIONS.tsv) and [`../INDEX.md`](../INDEX.md) |
| Status | `IDLE` (`0` active sprints; `Program SSG` graduated `2026-11-20`) |
| Consensus Kernel | `clm-kernel@0.0.24` |
| Drift Gate | `npm run docs:check` |

## Active program status

**Standby (`0` active sprints as of `2026-11-20`).**

Program SSG (`SPRINT-SSG-00` through `SPRINT-SSG-08`) graduated with operator approval on `2026-11-20` and was archived into [`docs/sprints/programs/ssg/`](../programs/ssg/INDEX.md). This directory retains [`./DECISIONS.tsv`](./DECISIONS.tsv) as the canonical append-only decision ledger for future sprint programs.

## Verification gates for active work

| Gate | Command | Scope |
| --- | --- | --- |
| StageShow CSS clash check | `npm run stageshow:check-css` | Verifies `0` class collisions across StageShow kit, examples, teaching pairs, and authored scene bundles (`85` CSS files, `4` explicit bundles) |
| StageShow host layout sweep | `npm run stageshow:sweep` | Captures `24` Chromium snapshots across `6` routes at `1440px`, `820px`, `390px`, and `358px` using ephemeral SQLite storage |
| Unit, observability, and contract suite | `npm run test:unit` | Runs all unit, observability, and contract tests on `clm-kernel@0.0.24` (`299` tests across `20` suites passing) |
| Docs, net, GUI, and build parity | `npm run check:net`, `npm run docs:check`, `npm run check:explorable-gui`, `npm run check:bombadil-nets`, `npm run build` | Enforces Petri net P-invariants, living-doc drift checks, `data-testid` / `data-effect` lint, and bundle parity |
| Playwright verification projects | `npm run test:smoke`, `npm run test:components`, `npm run test:features`, `npm run test:smoke:cross-browser` | Executes `--project=smoke`, `--project=components`, `--project=features`, `--project=smoke-firefox`, and `--project=smoke-webkit` |

## Graduated programs

| Program | Code | Archive | Graduation date | Status |
| --- | :---: | --- | :---: | :---: |
| StageShow Craft, Bombadil Dashboard Handles, and Coherent Layout | `SSG` | [programs/ssg](../programs/ssg/INDEX.md) | 2026-11-20 | Graduated |
| Bombadil Property Verification and Explorable GUI | `BPV` | [programs/bpv](../programs/bpv/INDEX.md) | 2026-11-18 | Graduated |
| Guided SPA Workbench, Astro Islands, Petri Net, and Docs Gates | `GQC` | [programs/gqc](../programs/gqc/INDEX.md) | 2026-11-18 | Graduated |
| Device-Sensitive Testing Infrastructure | `ERB` | [08-testing](../08-testing/INDEX.md) | 2026-10-21 | Graduated |
| Submodule Modularity and Universal MCard Browser | `SMO` | [01-architecture](../01-architecture/INDEX.md) | 2026-10-21 | Graduated |
