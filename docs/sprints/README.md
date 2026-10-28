# Sprint Specifications Directory

| Field | Value |
| --- | --- |
| Audience | Scrum masters, product managers, developers, and operators |
| BMAD Owner | Scrum Master |
| Source of Truth | [`docs/sprints/INDEX.md`](./INDEX.md) and [`docs/sprints/_active/INDEX.md`](./_active/INDEX.md) |
| Drift Gate | `npm run docs:check` |

This directory houses sprint planning, execution specifications, evidence reports, and graduated archives for the `LandingPage` repository.

## Directory Structure

- [**`_active/`**](./_active/INDEX.md) holds **Program GQC** (`SPRINT-GQC-00..07`), where all ten execution units are completed with committed evidence in [`_active/evidence/`](./_active/evidence/GQC-07-docs-and-graduation.md) and remain in `_active/` awaiting explicit operator graduation approval.
- [**`01-architecture/`**](./01-architecture/INDEX.md) archives graduated **Program SMO** (`SMO-00..05`, 2026-10-21; historical `clm-kernel@0.0.10` records preserved unchanged, superseded in living code and docs by `clm-kernel@0.0.12`).
- [**`08-testing/`**](./08-testing/INDEX.md) archives graduated **Program ERB** (`ERB-00..06`, 2026-10-21).

## Sprint Program Ledger

| Program | Code | Sprints | Directory | Status |
| :--- | :---: | :---: | :--- | :---: |
| **Submodule Modularity and Universal MCard Browser** | `SMO` | `SMO-00..SMO-05` | [01-architecture](./01-architecture/INDEX.md) | Graduated (2026-10-21) |
| **Device-Sensitive Test Infrastructure** | `ERB` | `ERB-00..ERB-06` | [08-testing](./08-testing/INDEX.md) | Graduated (2026-10-21) |
| **Guided SPA Workbench, Astro Islands, Petri Net, and Docs Gates** | `GQC` | `GQC-00..GQC-07` | [_active](./_active/INDEX.md) | Completed in `_active/` (Awaiting Operator Graduation) |
