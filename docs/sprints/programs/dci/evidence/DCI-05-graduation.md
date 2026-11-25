# DCI-05 Verification and Graduation Evidence

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-DCI-05` (`PR-DCI-05`) |
| Start Commit | `7837fab779360ee8daaeb941ee06f809465e6260` |
| End Verification Commit | `1d614564de837c5017dea7aa0f62c52d7de64c88` |
| Consensus Kernel | `clm-kernel@0.0.26` |
| Date | `2026-11-26` (`+08:00` local) |
| Graduation Status | `GRADUATED (2026-11-26)` (Operator approval recorded in `DCI-graduation` row of [`DECISIONS.tsv`](../../../_active/DECISIONS.tsv); archive sealed at `docs/sprints/programs/dci/`) |

## 1. End-State vs Baseline Comparison (`SPRINT-DCI-00` to `SPRINT-DCI-05`)

| Measure | Start of Program (`7837fab`) | End of Program (`1d61456`) |
| --- | --- | --- |
| Native dialog calls (`check:explorable-gui` scope) | `2` | `0` |
| Page Places with no arc in or none out, and no `terminalReason` | `3` | `0` |
| Same-origin links on registry and inspector (`test-config.js`) | `0` and `0` | `3` and `4` |
| `innerHTML` writes in `src/pages/sprint-registry.astro` | `2` | `0` |
| Query parameters that the Lab reads | `1` (`target`) | `6` (`target`, `device`, `w`, `h`, `orientation`, `mode`) |
| Island files that `PR-DCI-00..04` added | Not applicable | `0` |

## 2. Fourteen-Gate Matrix on Pinned Start vs Verification Commit

| Gate Command | Exit on `7837fab` | Exit on `1d61456` | Observed End Result |
| --- | :---: | :---: | --- |
| `npm run stageshow:check-css` | 0 | 0 | `85` CSS files, `4` explicit bundles, `0` overlapping class namespaces |
| `npm run stageshow:sweep -- --strict` | 0 | 0 | `snapshots=20`, `findings=0`, `errors=0`, `clipped=0`, `overflows=0` |
| `node scripts/check-package-source-parity.mjs` | 0 | 0 | `[parity-ok] pairs=4 uiCalls=22` |
| `npm run check:net` | 0 | 0 | `workbench-net.yaml` (`38` Places, `96` Transitions), `spa-test-target.graph.json` (`3`/`4`) |
| `npm run check:explorable-gui` | 0 | 0 | `[explorable-gui] PASS` (including `js/runtime` and `js/landing-page-mcard.js`) |
| `npm run check:bombadil-nets` | 0 | 0 | `[bombadil:nets] PASS` |
| `npm run check:playwright-discovery` | 0 | 0 | `smoke` (`24`/`9`), `components` (`18`/`14`), `features` (`661`/`33`), `56` unique |
| `npm run docs:check` | 0 | 0 | `[docs:check] PASS (files=296, allowlisted=13, netIds=142)` |
| `npm run build` | 0 | 0 | Astro `5` pages (`[gqc-net-parity] PASS`), `@pkc/core`, `@pkc/markdown-renderer` |
| `npm run test:unit` | 0 | 0 | `322` passed, `0` failed, `0` skipped |
| `npm run test:smoke` | 0 | 0 | `24 passed` (`24.1s`) |
| `npm run test:components` | 0 | 0 | `18 passed` (`9.9s`) |
| `npm run test:features` | 0 | 0 | `644 passed`, `17 skipped` (`1.5m`) |
| `npm run test:smoke:cross-browser` | 0 | 0 | `48 passed` (`31.8s`) |

## 3. `INV-DCI-05` Diff Invariant Per Pull Request Commit

| Pull Request Commit | Added Files in `src/islands/` | Added `fetch(` Calls | `package.json` Diffs |
| --- | :---: | :---: | :---: |
| `a2dc11d` (`PR-DCI-00`) | `0` | `0` | `0` |
| `c12edc7` (`PR-DCI-01`) | `0` | `0` | `0` |
| `cc2631e` (`PR-DCI-02`) | `0` | `0` | `0` |
| `9c3b6a6` (`PR-DCI-03`) | `0` | `0` | `0` |
| `20d250f` (`PR-DCI-04`) | `0` | `0` | `0` |

## 4. Living Docs and Backlog Review (`2026-11-26`)

- Updated [`../../../01-architecture/astro-host-and-islands.md`](../../../../01-architecture/astro-host-and-islands.md), [`../../../functionalities/09-RESPONSIVE-LAB-PENPOT-AND-DESIGN-SYSTEM.md`](../../../../functionalities/09-RESPONSIVE-LAB-PENPOT-AND-DESIGN-SYSTEM.md), and [`../../../00-getting-started/STATUS.md`](../../../../00-getting-started/STATUS.md); regenerated [`../../../01-architecture/workbench-net.md`](../../../../01-architecture/workbench-net.md) (`38` Places, `96` Transitions).
- Backlog entry conditions on `2026-11-26` ([`../dci-local-backlog.md`](../dci-local-backlog.md)):
  - **Candidate 1 (`PKC-06` island slot commit)**: Entry condition **unmet** (`LandingPage` `DoD-PKC-06-03` tests pass at `734f209`, but parent `DoD-PKC-06-03` box and owner intent for stage slot commits remain outside `LandingPage`).
  - **Candidate 2 (`Command line input path`)**: Entry condition **unmet** (requires Candidate 1 and a named user request).
  - **Candidate 3 (`Gesture capture and replay`)**: Entry condition **unmet** (no framed dragging target requested for viewport conformance).
  - **Candidate 4 (`Preset rail scrub preview`)**: Entry condition **unmet** (no tester request or external spike).
  - **Candidate 5 (`Graph of adjacent objects`)**: Entry condition **unmet** (no written state model or candidate set).
