# Sprint Specifications Directory

| Field | Value |
| --- | --- |
| Audience | Scrum masters, product managers, developers, and operators |
| BMAD Owner | Scrum Master |
| Source of Truth | [`docs/sprints/INDEX.md`](./INDEX.md) and [`docs/sprints/_active/INDEX.md`](./_active/INDEX.md) |
| Status | `ACTIVE` (`Program DCI`; `6` graduated programs archived) |
| Drift Gate | `npm run docs:check` |

This directory houses sprint planning, execution specifications, evidence reports, and graduated archives for the `LandingPage` repository.

## Directory Structure

- [**`_active/`**](./_active/INDEX.md) is active (`Program DCI`, `SPRINT-DCI-00..02` complete and `SPRINT-DCI-03` in progress) and holds the canonical append-only [`DECISIONS.tsv`](./_active/DECISIONS.tsv) decision ledger and [**Program DCI plan**](./_active/dci-plan.md).
- [**`programs/slc/`**](./programs/slc/INDEX.md) archives graduated **Program SLC** (`SPRINT-SLC-00..04`, graduated `2026-11-20` with operator approval; see [`SLC-04-auth-and-graduation.md`](./programs/slc/evidence/SLC-04-auth-and-graduation.md)).
- [**`programs/ssg/`**](./programs/ssg/INDEX.md) archives graduated **Program SSG** (`SPRINT-SSG-00..08`, graduated `2026-11-20` with operator approval; see [`SSG-08-graduation.md`](./programs/ssg/evidence/SSG-08-graduation.md)).
- [**`programs/bpv/`**](./programs/bpv/INDEX.md) archives graduated **Program BPV** (`SPRINT-BPV-00..07`, graduated `2026-11-18` with operator approval; see [`BPV-07-graduation.md`](./programs/bpv/evidence/BPV-07-graduation.md); `bombadil-scheduler` remains active daily at `02:30` UTC).
- [**`programs/gqc/`**](./programs/gqc/INDEX.md) archives graduated **Program GQC** (`SPRINT-GQC-00..07`, graduated `2026-11-18` with operator approval; see [`GQC-07-docs-and-graduation.md`](./programs/gqc/evidence/GQC-07-docs-and-graduation.md)).
- [**`08-testing/`**](./08-testing/INDEX.md) archives graduated **Program ERB** (`ERB-00..06`, 2026-10-21).
- [**`01-architecture/`**](./01-architecture/INDEX.md) archives graduated **Program SMO** (`SMO-00..05`, 2026-10-21; historical `clm-kernel@0.0.10` records preserved unchanged, superseded in living code and docs by `clm-kernel@0.0.26`).

## Sprint Program Ledger

| Program | Code | Sprints | Directory | Status |
| :--- | :---: | :---: | :--- | :---: |
| **Post-SSG Local Cleanup and Subtraction** | `SLC` | `SLC-00..SLC-04` | [programs/slc](./programs/slc/INDEX.md) | Graduated (`2026-11-20`) |
| **StageShow Craft, Bombadil Dashboard, and Coherent Layout** | `SSG` | `SSG-00..SSG-08` | [programs/ssg](./programs/ssg/INDEX.md) | Graduated (`2026-11-20`) |
| **Bombadil Property Verification and Explorable GUI** | `BPV` | `BPV-00..BPV-07` | [programs/bpv](./programs/bpv/INDEX.md) | Graduated (`2026-11-18`) |
| **Guided SPA Workbench, Astro Islands, Petri Net, and Docs Gates** | `GQC` | `GQC-00..GQC-07` | [programs/gqc](./programs/gqc/INDEX.md) | Graduated (`2026-11-18`) |
| **Device-Sensitive Test Infrastructure** | `ERB` | `ERB-00..ERB-06` | [08-testing](./08-testing/INDEX.md) | Graduated (`2026-10-21`) |
| **Submodule Modularity and Universal MCard Browser** | `SMO` | `SMO-00..SMO-05` | [01-architecture](./01-architecture/INDEX.md) | Graduated (`2026-10-21`) |
