# Program DCI Archive Index

| Field | Value |
| --- | --- |
| Audience | Scrum masters, BMAD role owners, developers, architects, UX designers, and TEA engineers |
| BMAD Owner | Product Manager and Scrum Master |
| Source of Truth | [`./dci-plan.md`](./dci-plan.md) and [`../../_active/DECISIONS.tsv`](../../_active/DECISIONS.tsv) |
| Status | `Graduated (2026-11-26)` |
| Consensus Kernel | `clm-kernel@0.0.26` |
| Drift Gate | `npm run docs:check` |

## Graduation summary

Program DCI (`SPRINT-DCI-00` through `SPRINT-DCI-05`) completed all planned milestones between pinned start commit `7837fab779360ee8daaeb941ee06f809465e6260` and verification commit `1d614564de837c5017dea7aa0f62c52d7de64c88`, and graduated with explicit operator approval recorded in [`DECISIONS.tsv`](../../_active/DECISIONS.tsv) (`DCI-graduation`).

Every pull request preserved invariant `INV-DCI-05` (`0` added files in `src/islands/`, `0` added `fetch(` calls, and `0` `package.json` diffs):

- **`SPRINT-DCI-00` (`PR-DCI-00`, `a2dc11d`)**: Pinned baseline metrics on `7837fab`, executed all `14` graduation gates, and documented the `10`-row stored interface state table in [`../../../01-architecture/astro-host-and-islands.md`](../../../01-architecture/astro-host-and-islands.md).
- **`SPRINT-DCI-01` (`PR-DCI-01`, `c12edc7`)**: Removed `innerHTML` writes from [`src/pages/sprint-registry.astro`](../../../../src/pages/sprint-registry.astro), extracted [`js/ui/registry-view.js`](../../../../js/ui/registry-view.js), and added program grouping, filters, search, and URL deep links (`?state=`, `?program=`, `?q=`, `#sprint-...`) for `/sprint-registry.html`.
- **`SPRINT-DCI-02` (`PR-DCI-02`, `cc2631e`)**: Enforced `page-place-without-link` and `terminalReason` in [`scripts/check-net.mjs`](../../../../scripts/check-net.mjs), declared `11` cross-page navigation transitions in [`src/net/workbench-net.yaml`](../../../../src/net/workbench-net.yaml) (`38` Places, `96` Transitions), and mounted zero-script [`src/components/WorkbenchNav.astro`](../../../../src/components/WorkbenchNav.astro) across `index`, `responsive-lab`, `sprint-registry`, and `fiber-inspector`.
- **`SPRINT-DCI-03` (`PR-DCI-03`, `9c3b6a6`)**: Added pure codec [`js/harness/lab-url-state.js`](../../../../js/harness/lab-url-state.js), boot restore and `history.replaceState` synchronization (`device`, `w`, `h`, `orientation`, `mode`), `#lab-url-state-notice`, and `#btn-copy-lab-link` in Responsive Lab.
- **`SPRINT-DCI-04` (`PR-DCI-04`, `20d250f`)**: Widened [`scripts/check-explorable-gui.mjs`](../../../../scripts/check-explorable-gui.mjs) to scan `js/runtime/` and `js/landing-page-mcard.js`, replaced `globalThis.prompt?.()` and `alert()` with [`js/ui/open-url-dialog.js`](../../../../js/ui/open-url-dialog.js) and `#least-action-status`, and added [`js/harness/refusal-reasons.js`](../../../../js/harness/refusal-reasons.js) with accessible `aria-describedby` hints (`#stage-refusal-hint`, `#rec-start-reason`).
- **`SPRINT-DCI-05` (`PR-DCI-05`, `1d61456`)**: Re-ran all `14` graduation gates on one commit (`14/14` exited `0`), reviewed [`./dci-local-backlog.md`](./dci-local-backlog.md) (`5` candidates held with unmet entry conditions), and archived the program here.

## Program artifacts

| Artifact | Purpose | Status |
| --- | --- | :---: |
| [`dci-plan.md`](./dci-plan.md) | Program outcome, design decisions, scope flags, sequence, and graduation gates | `GRADUATED` |
| [`dci-local-backlog.md`](./dci-local-backlog.md) | Five held candidates and follow-up cleanups reviewed at graduation | `HELD` |
| [`SPRINT-DCI-00`](./SPRINT-DCI-00-pinned-baseline-and-stored-state.md) | Pinned baseline run and `## Stored interface state` table | `DONE` |
| [`SPRINT-DCI-01`](./SPRINT-DCI-01-sprint-registry-estate-map.md) | Safe DOM rendering and filterable sprint registry groups/deep links | `DONE` |
| [`SPRINT-DCI-02`](./SPRINT-DCI-02-navigation-closure.md) | `WorkbenchNav.astro` across four pages and Petri net link closure rule | `DONE` |
| [`SPRINT-DCI-03`](./SPRINT-DCI-03-linkable-lab-state.md) | Linkable Lab URL parameters and copy-link control | `DONE` |
| [`SPRINT-DCI-04`](./SPRINT-DCI-04-refusal-reasons-and-native-dialogs.md) | Stage/recorder refusal reasons and in-page dialog replacements | `DONE` |
| [`SPRINT-DCI-05`](./SPRINT-DCI-05-verification-and-graduation.md) | Full `14`-gate matrix, living docs, backlog review, and graduation archive | `DONE` |
| [`DCI-pre-program-study.md`](./evidence/DCI-pre-program-study.md) | Pre-program telemetry and UI baseline measurements | `FINAL` |
| [`DCI-egm-review.md`](./evidence/DCI-egm-review.md) | Elephant-Goldfish planning review rounds and resolutions | `FINAL` |
| [`DCI-00-pinned-baseline.md`](./evidence/DCI-00-pinned-baseline.md) | Pinned start commit gate receipt and baseline measures | `FINAL` |
| [`DCI-01-registry-estate-map.md`](./evidence/DCI-01-registry-estate-map.md) | Sprint registry safe rendering and feature verification evidence | `FINAL` |
| [`DCI-02-navigation-closure.md`](./evidence/DCI-02-navigation-closure.md) | Navigation closure, net rule, and baseline recapture evidence | `FINAL` |
| [`DCI-03-linkable-lab-state.md`](./evidence/DCI-03-linkable-lab-state.md) | URL state codec, copy-link, and restore verification evidence | `FINAL` |
| [`DCI-04-refusal-reasons.md`](./evidence/DCI-04-refusal-reasons.md) | Refusal reasons, dialog lint, and feature verification evidence | `FINAL` |
| [`DCI-05-graduation.md`](./evidence/DCI-05-graduation.md) | End-of-program `14`-gate receipt, `INV-DCI-05` audit, and backlog status | `FINAL` |

## Verification receipt (2026-11-26)

On verification commit `1d614564de837c5017dea7aa0f62c52d7de64c88`:

- `npm run stageshow:check-css`: `0` (`85` CSS files, `4` explicit bundles, `0` clashes)
- `npm run stageshow:sweep -- --strict`: `0` (`20` snapshots, `0` findings/errors/clipped/overflows)
- `node scripts/check-package-source-parity.mjs`: `0` (`pairs=4`, `uiCalls=22`)
- `npm run check:net`: `0` (`38` Places, `96` Transitions)
- `npm run check:explorable-gui`: `0` (`[explorable-gui] PASS`)
- `npm run check:bombadil-nets`: `0` (`[bombadil:nets] PASS`)
- `npm run check:playwright-discovery`: `0` (`56` spec files)
- `npm run docs:check`: `0` (`PASS`)
- `npm run build`: `0` (`5` Astro pages, `[gqc-net-parity] PASS`)
- `npm run test:unit`: `0` (`322` passed, `0` failed, `0` skipped)
- `npm run test:smoke`: `0` (`24` passed)
- `npm run test:components`: `0` (`18` passed)
- `npm run test:features`: `0` (`644` passed, `17` skipped)
- `npm run test:smoke:cross-browser`: `0` (`48` passed)

## Related archives

- Canonical ledger: [`../../_active/DECISIONS.tsv`](../../_active/DECISIONS.tsv)
- Sprints master index: [`../../INDEX.md`](../../INDEX.md)
- Previous graduated programs: [`../slc/INDEX.md`](../slc/INDEX.md), [`../ssg/INDEX.md`](../ssg/INDEX.md), [`../bpv/INDEX.md`](../bpv/INDEX.md), [`../gqc/INDEX.md`](../gqc/INDEX.md)
