# LandingPage Active Sprint Workspace

| Field | Value |
| --- | --- |
| Audience | Scrum masters, BMAD role leads, developers, and operators |
| BMAD Owner | Scrum Master |
| Source of Truth | [`./INDEX.md`](./INDEX.md), [`./ssg-plan.md`](./ssg-plan.md), [`./DECISIONS.tsv`](./DECISIONS.tsv), [`./evidence/SSG-egm-review.md`](./evidence/SSG-egm-review.md), and [`../INDEX.md`](../INDEX.md) |
| Status | `ACTIVE` (`Program SSG`: `SPRINT-SSG-00` `IN_PROGRESS`; `SPRINT-SSG-01..08` `PLANNED`) |
| Consensus Kernel | `clm-kernel@0.0.24` |
| Drift Gate | `npm run docs:check` |

## Workspace status

**Active program in flight (`2026-11-19`) is Program SSG (`SPRINT-SSG-00` through `SPRINT-SSG-08`).**

Program SSG models Responsive UI Lab and host layouts after StageShow `1.1.1` craft (pinned at `.agents/skills/stageshow/` and `tools/stageshow/`) while turning LandingPage into an interactive Bombadil property-testing dashboard driven by Triad event-triggering handles (`urn:mcard:bombadil:*`), `/api/test-runs/bombadil/*` REST + `fetch` SSE endpoints, and `window.__lab.bombadil` events. Across `1440px`, `820px`, `390px`, and `358px`, every preset, orientation switch, parametric hardware bezel, operating mode, Bombadil dashboard action, and host route enforces `1:1` inner viewport geometry and bidirectional bounds checks.

## Active artifacts

- **Program plan.** [`./ssg-plan.md`](./ssg-plan.md)
- **Pre-program spike and `24`-snapshot baseline.** [`./evidence/SSG-pre-program-spike.md`](./evidence/SSG-pre-program-spike.md)
- **EGM multi-agent review ledger.** [`./evidence/SSG-egm-review.md`](./evidence/SSG-egm-review.md)
- **Active sprint (`IN_PROGRESS`).** [`./SPRINT-SSG-00-stageshow-installation-and-layout-gate.md`](./SPRINT-SSG-00-stageshow-installation-and-layout-gate.md)
- **Active decision ledger.** [`./DECISIONS.tsv`](./DECISIONS.tsv)

## Graduated archives

- **Program BPV.** [`docs/sprints/programs/bpv/INDEX.md`](../programs/bpv/INDEX.md) (`2026-11-18`, with local Docker `bombadil-scheduler` running daily at `02:30` UTC)
- **Program GQC.** [`docs/sprints/programs/gqc/INDEX.md`](../programs/gqc/INDEX.md) (`2026-11-18`)
- **Program ERB.** [`docs/sprints/08-testing/INDEX.md`](../08-testing/INDEX.md) (`2026-10-21`)
- **Program SMO.** [`docs/sprints/01-architecture/INDEX.md`](../01-architecture/INDEX.md) (`2026-10-21`)

Review [`./INDEX.md`](./INDEX.md) for the full `SSG-00`..`SSG-08` dependency sequence and verified gate commands.
