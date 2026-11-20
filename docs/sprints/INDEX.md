# Sprints Master Index

| Field | Value |
| --- | --- |
| Audience | Scrum masters, product managers, architects, developers, and operators |
| BMAD Owner | Scrum Master (`bmad-agent-pm` / Scrum Master) |
| Source of Truth | [`docs/sprints/_active/INDEX.md`](./_active/INDEX.md) and [`docs/sprints/_active/DECISIONS.tsv`](./_active/DECISIONS.tsv) |
| Status | `IDLE` (`0` active sprints; `5` graduated programs archived) |
| Drift Gate | `npm run docs:check` |

## Active program

- [**Active Sprint Workspace (`docs/sprints/_active/`)**](./_active/INDEX.md) (Standby with `0` active sprints as of `2026-11-20`; retains [`_active/INDEX.md`](./_active/INDEX.md) and the canonical append-only [`DECISIONS.tsv`](./_active/DECISIONS.tsv) ledger)

## Graduated programs

- [**Program SSG (`docs/sprints/programs/ssg/`)**](./programs/ssg/INDEX.md) (Graduated `2026-11-20`; StageShow `1.1.1` device frames and layout craft, Bombadil runner dashboard `8th` island, `12` built-in device presets, responsive tiers, and Shadow DOM portal showcase)
  - [SSG Program Index](./programs/ssg/INDEX.md)
  - [SSG Execution Plan](./programs/ssg/ssg-plan.md)
  - [SSG-08 Verification Baselines, Docker Gate, and Graduation](./programs/ssg/SPRINT-SSG-08-verification-baselines-and-graduation.md)
  - [SSG-08 Graduation Report](./programs/ssg/evidence/SSG-08-graduation.md)
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
