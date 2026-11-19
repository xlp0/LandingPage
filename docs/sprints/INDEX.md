# Sprints Master Index

| Field | Value |
| --- | --- |
| Audience | Scrum masters, product managers, architects, developers, and operators |
| BMAD Owner | Scrum Master (`bmad-agent-pm` / Scrum Master) |
| Source of Truth | [`docs/sprints/_active/INDEX.md`](./_active/INDEX.md) and [`docs/sprints/_active/DECISIONS.tsv`](./_active/DECISIONS.tsv) |
| Status | `ACTIVE` (`Program SSG` in flight; `4` graduated programs archived) |
| Drift Gate | `npm run docs:check` |

## Active program

- [**Active Sprint Workspace (`docs/sprints/_active/`)**](./_active/INDEX.md) (Active **Program SSG** `SPRINT-SSG-00..08` started `2026-11-19`; holds [`ssg-plan.md`](./_active/ssg-plan.md), [`SSG-pre-program-spike.md`](./_active/evidence/SSG-pre-program-spike.md), [`SSG-egm-review.md`](./_active/evidence/SSG-egm-review.md), and the canonical append-only [`DECISIONS.tsv`](./_active/DECISIONS.tsv) ledger)
  - [SSG Execution Plan](./_active/ssg-plan.md)
  - [SSG-00 StageShow Installation and Layout Gate](./_active/SPRINT-SSG-00-stageshow-installation-and-layout-gate.md)
  - [SSG-01 CSS and Chrome Subtraction](./_active/SPRINT-SSG-01-css-and-chrome-subtraction.md)
  - [SSG-02 Viewport and Device Domain Model](./_active/SPRINT-SSG-02-viewport-and-device-domain-model.md)
  - [SSG-03 StageShow Device Frames and Stage Geometry](./_active/SPRINT-SSG-03-stageshow-device-frames-and-stage.md)
  - [SSG-04 Bombadil Handles and Runner API](./_active/SPRINT-SSG-04-bombadil-handles-and-runner-api.md)
  - [SSG-05 StageShow Workbench Shell and Bombadil Dashboard](./_active/SPRINT-SSG-05-stageshow-workbench-and-bombadil-dashboard.md)
  - [SSG-06 Host Responsive Tiers and Compact Layouts](./_active/SPRINT-SSG-06-host-responsive-tiers-and-compact-layouts.md)
  - [SSG-07 Portal StageShow Showcase and Rehearsal](./_active/SPRINT-SSG-07-portal-stageshow-showcase-and-rehearsal.md)
  - [SSG-08 Verification Baselines, Docker Gate, and Graduation](./_active/SPRINT-SSG-08-verification-baselines-and-graduation.md)

## Graduated programs

- [**Program BPV (`docs/sprints/programs/bpv/`)**](./programs/bpv/INDEX.md) (Graduated `2026-11-18`; local Docker nightly scheduler continues daily at `02:30` UTC)
  - [BPV Program Index](./programs/bpv/INDEX.md)
  - [BPV Execution Plan](./programs/bpv/bpv-plan.md)
  - [BPV-07 Coverage, Nightly Runs, and Graduation](./programs/bpv/SPRINT-BPV-07-coverage-nightly-and-graduation.md)
  - [BPV-07 Graduation Report](./programs/bpv/evidence/BPV-07-graduation.md)
- [**Program GQC (`docs/sprints/programs/gqc/`)**](./programs/gqc/INDEX.md) (Graduated `2026-11-18` on `clm-kernel@0.0.23`)
  - [GQC Program Index](./programs/gqc/INDEX.md)
  - [GQC Execution Plan](./programs/gqc/gqc-plan.md)
  - [GQC-07 Documentation Alignment and Gates](./programs/gqc/SPRINT-GQC-07-documentation-alignment-and-gates.md)
  - [GQC-07 Evidence and Graduation Report](./programs/gqc/evidence/GQC-07-docs-and-graduation.md)
  - [Program Execution Audit](./programs/gqc/evidence/PROGRAM-EXECUTION-AUDIT.md)
- [**Program ERB (`docs/sprints/08-testing/`)**](./08-testing/INDEX.md) (Graduated 2026-10-21)
  - [SPRINT-ERB-00 Infrastructure Modularization](./08-testing/SPRINT-ERB-00-infrastructure-refactoring.md)
  - [SPRINT-ERB-01 Bounded Event Ring Buffer and Recording State Machine](./08-testing/SPRINT-ERB-01-ring-buffer-core.md)
  - [SPRINT-ERB-05 Device Capability Profiles and Fidelity Tiers](./08-testing/SPRINT-ERB-05-device-capability-profiles.md)
  - [SPRINT-ERB-02 Target Membrane Interceptor and Normalization](./08-testing/SPRINT-ERB-02-membrane-normalization.md)
  - [SPRINT-ERB-03 Device Telemetry Collector and Triad Persistence](./08-testing/SPRINT-ERB-03-mcard-clm-persistence.md)
  - [SPRINT-ERB-04 Deterministic Playwright Replay Driver and Sweeps](./08-testing/SPRINT-ERB-04-playwright-deterministic-replay.md)
  - [SPRINT-ERB-06 Device-Sensitive Conformance Suite and Certification](./08-testing/SPRINT-ERB-06-device-sensitive-conformance.md)
- [**Program SMO (`docs/sprints/01-architecture/`)**](./01-architecture/INDEX.md) (Graduated 2026-10-21; historical `clm-kernel@0.0.10` baseline, superseded in current docs and code by `clm-kernel@0.0.24`)
  - [SMO-00 Program Charter](./01-architecture/00-submodule-modularity-and-organizational-program-charter.md)
  - [SMO-01 Submodule Topology, Monorepo Duality, and Binary-Safe Triad API](./01-architecture/sprint-smo01-submodule-topology-and-monorepo-duality.md)
  - [SMO-02 Published Kernel Consensus (Historical `0.0.10`)](./01-architecture/sprint-smo02-published-kernel-consensus-and-dependency-parity.md)
  - [SMO-03 Four-Estate Cross-Boundary Contracts and 4-Modality Membrane](./01-architecture/sprint-smo03-four-estate-cross-boundary-contracts.md)
  - [SMO-04 Documentation Hygiene and Tier Reorganization](./01-architecture/sprint-smo04-documentation-hygiene-and-tier-reorganization.md)
  - [SMO-05 Master README Alignment and Full-Program Verification](./01-architecture/sprint-smo05-master-readme-alignment-and-verification.md)
