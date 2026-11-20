# SPRINT-SLC-01 Legacy Example Games Subtraction

## Metadata

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-SLC-01` |
| Source of Truth | [`./slc-plan.md`](./slc-plan.md) and [`./INDEX.md`](./INDEX.md) |
| Handle | `urn:pcard:sprint:SPRINT-SLC-01` |
| Status | `DONE` |
| Depends on | `SPRINT-SLC-00` |
| Unblocks | `SPRINT-SLC-02` |
| Execution unit | `PR-SLC-01` |
| Decision Ref | `SLC-D03` |
| BMAD roles | Architect, UX Designer, Developer, TEA, Tech Writer |
| Effort | 1 day |

## Outcome

Remove legacy standalone board-game and 3D game examples (`public/examples/games/`, `public/examples/3DGames/`, `js/modules/tic-tac-toe-p2p/`, `docs/06-components/games/`), strip external game popup transitions (`p_external_games` and `t_open_external_{monopoly,chess,go}`) from `src/net/workbench-net.yaml` and `src/pages/app.astro`, regenerate Petri net documentation and TypeScript projections, preserve music/wave/theater examples (`public/examples/Music/`, `WaveVisualizers/`, `THREEJS_ANIMEJS/`, `location-map.html`), and update unit, benchmark, and Playwright test suites.

## Work sequence

1. Delete legacy game source directories and docs:
   - Remove `public/examples/games/`, `public/examples/3DGames/`, `js/modules/tic-tac-toe-p2p/`, and `docs/06-components/games/`.
   - Remove game view panels/buttons from `src/pages/app.astro` (keeping non-game views intact until `SPRINT-SLC-02`), and remove dead game link in `js/components/HeroContentComponent.js` plus stale game doc links in `docs/06-components/README.md`, `docs/INDEX.md`, `docs/functionalities/README.md`, `docs/functionalities/05-REALTIME-MULTIPLAYER-BOARD-GAMES.md`, and `public/examples/README.md` (if linked).
2. Remove `p_external_games` and `t_open_external_{monopoly,chess,go}` from `src/net/workbench-net.yaml`:
   - Regenerate `docs/01-architecture/workbench-net.md` via `npm run docs:gen-net` and `tests/bombadil/generated/workbench-net.ts` via `npm run bombadil:nets`.
3. Migrate tests referencing deleted game routes/places:
   - Update `tests/smoke/apps-menu.spec.js`, `tests/features/performance-baselines.spec.js`, `tests/performance/run-paired-benchmark.mjs`, `tests/fixtures/net-core-golden.json`, `tests/unit/net-trace-replay.test.mjs`, and `tests/unit/target-policy-and-config.test.mjs` so remaining non-game routes (`Music`, `/index.html`, `/responsive-lab.html`) cover all active app views and static assets.
4. Run full verification (`docs:check`, `check:net`, `check:bombadil-nets`, `check-package-source-parity.mjs`, `build`, `test:unit`, `test:smoke`, `stageshow:sweep --strict`), record `docs/sprints/_active/evidence/SLC-01-games-subtraction.md` and `DECISIONS.tsv`, and commit.

## Files

- Delete `public/examples/games/`, `public/examples/3DGames/`, `js/modules/tic-tac-toe-p2p/`, `docs/06-components/games/`
- Edit `src/pages/app.astro`, `src/net/workbench-net.yaml`, `docs/01-architecture/workbench-net.md`, `tests/bombadil/generated/workbench-net.ts`, `tests/smoke/apps-menu.spec.js`, `tests/features/performance-baselines.spec.js`, `tests/performance/run-paired-benchmark.mjs`, `tests/fixtures/net-core-golden.json`, `tests/unit/net-trace-replay.test.mjs`, `tests/unit/target-policy-and-config.test.mjs`, and game-referencing docs
- Create `docs/sprints/_active/evidence/SLC-01-games-subtraction.md`

## Acceptance criteria

- Zero references to deleted game routes remain in active code, `workbench-net.yaml`, or passing tests.
- `public/examples/Music/`, `WaveVisualizers/`, `THREEJS_ANIMEJS/`, and `location-map.html` remain preserved and verified.
- `check:net`, `docs:check`, `build`, `test:unit`, `test:smoke`, and `stageshow:sweep --strict` pass with protected files untouched.

## Non-goals

- Retiring `src/pages/app.astro` itself (deferred to `SPRINT-SLC-02`).
- Removing `public/examples/Music/`, `WaveVisualizers/`, or `THREEJS_ANIMEJS/`.

## Definition of done

- [x] **DoD-SLC-01-01.** Legacy game directories and docs (`public/examples/games/`, `public/examples/3DGames/` including `3DObjectViewer` submodule, `js/modules/tic-tac-toe-p2p/`, `docs/06-components/games/`) are deleted while `Music`, `WaveVisualizers`, `THREEJS_ANIMEJS`, and `location-map.html` remain present.
- [x] **DoD-SLC-01-02.** `workbench-net.yaml` (`39` places, `87` transitions), `workbench-net.md`, `workbench-net.ts`, `docs:check`, `check:net`, `build`, `test:unit` (`300/300`), `TEST_PORT=3011 test:smoke` (`29/29`), `performance-baselines.spec.js` (`7/7`), and `stageshow:sweep --strict` (`24/24`) pass.
- [x] **DoD-SLC-01-03.** Closure evidence is recorded in [`./evidence/SLC-01-games-subtraction.md`](./evidence/SLC-01-games-subtraction.md) and [`./DECISIONS.tsv`](./DECISIONS.tsv).
