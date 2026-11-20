# SPRINT-SSG-08 Verification baselines, Docker gate, and graduation

## Metadata

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-SSG-08` |
| Source of Truth | [`./ssg-plan.md`](./ssg-plan.md) and [`./INDEX.md`](./INDEX.md) |
| Handle | `urn:pcard:sprint:SPRINT-SSG-08` |
| Status | `DONE` |
| Depends on | `SPRINT-SSG-07` (`SPRINT-SSG-06` if `Flag 1` drops `SPRINT-SSG-07`) |
| Unblocks | Graduation of `Program SSG` to `docs/sprints/programs/ssg/` |
| Execution unit | `PR-SSG-08` |
| Poteto playbook | `autonomous-run` with `principle-encode-lessons-in-structure` and `principle-prove-it-works` |
| BMAD roles | Product Manager, Architect, Developer, TEA, Tech Writer, Scrum Master |
| Effort | 2 days (guess) |

## Outcome

Local Docker `bombadil-gate` and `scripts/bombadil/nightly.sh` enforce StageShow `check-css`, `sweep --strict`, scene `film --gate`, and Bombadil net/explorable-GUI checks continuously without touching `.github/workflows` (`SSG-D13`). All maintained architecture, testing, component, and Bombadil dashboard documentation reflects measured code symbols and `clm-kernel@0.0.23` provenance, the complete verification battery passes after final documentation edits, and Program SSG receives explicit operator approval to archive from `docs/sprints/_active/` into `docs/sprints/programs/ssg/`.

## Work sequence

1. Wire StageShow and font/sandbox determinism into local Docker services (`docker/bombadil/compose.yml`, `docker/bombadil/Dockerfile`, `scripts/bombadil/nightly.sh`, leaving `.github/workflows` unchanged):
   - Update `bombadil-gate` service (`profiles: ["manual"]`) command to execute `npm run build:astro && (if [ -f tools/stageshow/build-scenes.mjs ]; then node tools/stageshow/build-scenes.mjs --check; fi) && npm run stageshow:check-css && npm run check:bombadil-nets && npm run check:explorable-gui && npm run check:net && npm run docs:check && npm run test:unit && env SKIP_BUILD=1 npm run stageshow:sweep -- --strict`.
   - In `docker/bombadil/Dockerfile`, preserve existing `fonts-liberation` (`line 11`), set `ENV CHROME_PATH=/usr/bin/chromium` + `ENV STAGESHOW_NO_SANDBOX=1` alongside `fonts-dejavu-core` fallback metrics beside local WOFF2 webfonts (consuming `--no-sandbox` forwarding wired into `tools/stageshow/scripts/browser.mjs` during `SPRINT-SSG-00`).
   - Wrap all StageShow additions in `scripts/bombadil/nightly.sh` inside the failure-recording `step` helper (`scripts/bombadil/nightly.sh:14,39-51,83`, running all steps before exiting `1` on recorded failures at line `83` and passing `SKIP_BUILD=1` after line `54`): `step stageshow-check-css npm run stageshow:check-css`, `step stageshow-sweep env SKIP_BUILD=1 npm run stageshow:sweep -- --strict`, and `if [ -f public/stageshow/workbench-bombadil-pair/index.html ]; then step stageshow-portal-film env SKIP_BUILD=1 npm run stageshow:film -- '/public/stageshow/workbench-bombadil-pair/index.html' --out stageshow-output/portal-film.png --gate; fi`. Rebuild with `docker compose -f docker/bombadil/compose.yml down -v && docker compose -f docker/bombadil/compose.yml build` (refreshing the named `node_modules` volume for `postcss` in `package-lock.json`), and execute `docker compose -f docker/bombadil/compose.yml --profile manual run --rm bombadil-gate`.
2. Perform final full check on `tests/baselines/layout-baseline.json` (`rebaselines` complete), `src/net/workbench-net.yaml`, `docs/01-architecture/workbench-net.md` (`npm run docs:gen-net`), `tests/bombadil/generated/workbench-net.ts` (`npm run bombadil:nets`), `tests/gui-coverage.json`, and `tests/bombadil/scope.json`.
3. Update maintained documentation strictly matching measured symbol names, file counts, `8`-island map (or `7` if `Flag 2` is active), `12` built-in device presets, generated Place/Transition totals, StageShow design rubric, graduation status, and Bombadil dashboard handles (`docs/INDEX.md`, `docs/README.md`, `docs/01-architecture/README.md`, `docs/01-architecture/landing-page-architecture.md`, `docs/01-architecture/astro-host-and-islands.md`, `docs/06-components/README.md`, `docs/08-testing/README.md`, `docs/08-testing/BOMBADIL_PROPERTY_TESTING.md`, `docs/08-testing/DEVICE_SENSITIVE_TESTING_INFRASTRUCTURE.md`, `tests/README.md`, `tests/TEST_DOCUMENTATION.md`, `README.md`, and `CHANGELOG.md`).
4. Run the complete verification battery sequentially after final documentation and config edits (including default `node scripts/bombadil/canary.mjs` with `5` runs and `>= 4` min-violations), and record receipt tables inside `docs/sprints/_active/evidence/SSG-08-graduation.md`.
5. Obtain explicit operator graduation approval, append `SSG-graduation` row to [`./DECISIONS.tsv`](../../_active/DECISIONS.tsv), and execute archival to `docs/sprints/programs/ssg/`:
   - Move `ssg-plan.md` and `SPRINT-SSG-00..08` into `docs/sprints/programs/ssg/`, and move `docs/sprints/_active/evidence/SSG-*.md` into `docs/sprints/programs/ssg/evidence/`.
   - Create `docs/sprints/programs/ssg/INDEX.md` linking `./ssg-plan.md`, all executed SSG sprints (`SPRINT-SSG-00..08`, or `SPRINT-SSG-00..06` and `SSG-08` when `Flag 1` waives `SPRINT-SSG-07`), `./evidence/SSG-*.md`, and `../../_active/DECISIONS.tsv`.
   - Keep canonical `docs/sprints/_active/DECISIONS.tsv` in place and rewrite relative links inside moved files (`./DECISIONS.tsv` -> `../../_active/DECISIONS.tsv`, `../DECISIONS.tsv` -> `../../../_active/DECISIONS.tsv`, and increment repo-root relative prefixes by one level: `../../../` -> `../../../../` in moved root docs and `../../../../` -> `../../../../../` in moved `evidence/` docs).
   - Reset `docs/sprints/_active/INDEX.md` and `docs/sprints/_active/README.md` into standby state (`0` active sprints) and update `docs/sprints/INDEX.md` + `docs/sprints/README.md` (`Program SSG` graduated).

## Files

- Edit `scripts/bombadil/nightly.sh`, `docker/bombadil/compose.yml`, and `docker/bombadil/Dockerfile`
- Edit `src/net/workbench-net.yaml`, `docs/01-architecture/workbench-net.md`, `tests/bombadil/generated/workbench-net.ts`, `tests/gui-coverage.json`, and `tests/bombadil/scope.json`
- Edit `docs/INDEX.md`, `docs/README.md`, `docs/01-architecture/README.md`, `docs/01-architecture/landing-page-architecture.md`, `docs/01-architecture/astro-host-and-islands.md`, `docs/06-components/README.md`, `docs/08-testing/README.md`, `docs/08-testing/BOMBADIL_PROPERTY_TESTING.md`, `docs/08-testing/DEVICE_SENSITIVE_TESTING_INFRASTRUCTURE.md`, `tests/README.md`, `tests/TEST_DOCUMENTATION.md`, `README.md`, and `CHANGELOG.md`
- Create `docs/sprints/_active/evidence/SSG-08-graduation.md` and `docs/sprints/programs/ssg/INDEX.md` (at archival)
- Edit `docs/sprints/_active/DECISIONS.tsv`, `docs/sprints/_active/INDEX.md`, `docs/sprints/_active/README.md`, `docs/sprints/INDEX.md`, and `docs/sprints/README.md`

## BMAD responsibilities

### Product Manager

- Verify all acceptance criteria and Operator Scope Flags in `ssg-plan.md` are fulfilled before requesting graduation sign-off.

### Architect

- Verify Bombadil runner boundaries, `8`-island (or `7` if `Flag 2` is active) and `0`-island byte budgets, package parity, and `BOMBADIL_PROPERTY_TESTING.md` documentation accuracy.

### Developer

- Wire Docker `bombadil-gate` (`CHROME_PATH`, `STAGESHOW_NO_SANDBOX`) + `nightly.sh` commands, create `docs/sprints/programs/ssg/INDEX.md`, move evidence under `programs/ssg/evidence/`, and rewrite moved archival links (`../../_active/DECISIONS.tsv` plus one `../` on repo-root paths).

### TEA

- Execute the complete repository, StageShow, default Bombadil canary (`5` runs), Playwright, and Docker verification battery after final edits with zero skipped or relaxed assertions.

### Tech Writer

- Sync `docs/01-architecture/`, `docs/06-components/`, `docs/08-testing/`, `tests/`, `README.md`, and `CHANGELOG.md` strictly from verified symbols and gate outputs.

### Scrum Master

- Collect all executed SSG sprint (`SPRINT-SSG-00..08`, or `SPRINT-SSG-00..06` and `SSG-08` when `Flag 1` waives `SPRINT-SSG-07`) DoDs, matching `SSG-0N` evidence reports, EGM review receipts (`SSG-egm-review.md`), and `DECISIONS.tsv` rows into the graduation package and restore `_active/` standby docs.

## Acceptance criteria

- `docker compose -f docker/bombadil/compose.yml --profile manual run --rm bombadil-gate` passes on Linux/ARM64 with fresh build, `CHROME_PATH=/usr/bin/chromium`, `--no-sandbox` support, scene parity check (when `Flag 1` scene tooling is active), CSS clash check, strict sweep, and unit/net/GUI/docs checks.
- Maintained docs (including `BOMBADIL_PROPERTY_TESTING.md`) match shipped code and pass `npm run docs:check` with zero allowlist abuse on living docs.
- Complete build, unit, StageShow sweep/film, default Bombadil canary (`5` runs, `>= 4` min-violations), and Playwright suites (Chromium `smoke`, `components`, `features`, plus `smoke-firefox` and `smoke-webkit`) pass sequentially after final edits.
- Program SSG archives into `docs/sprints/programs/ssg/` (`programs/ssg/evidence/SSG-*.md` preserved, `_active/` standby restored) with zero broken links.

## Test design

- Sequential end-to-end verification run executed after the final documentation/configuration commit candidate, with full exit-code receipts stored in `docs/sprints/_active/evidence/SSG-08-graduation.md`.

## Non-goals

- Adding unrequested runtime UI features during verification and archival.
- Moving Playwright or StageShow CI gates into `.github/workflows` (`SSG-D13`).

## Definition of done

- [x] **DoD-SSG-08-01.** Local Docker gate executes Astro build, guarded scene `--check` (when `Flag 1` scene tooling is active), StageShow `check-css`, `sweep --strict`, and repo static/unit checks inside `bombadil-gate`. Verified by `docker compose -f docker/bombadil/compose.yml --profile manual run --rm bombadil-gate` (`exit 0`, `299/299` unit tests, `24/24` Linux Chromium sweep).
- [x] **DoD-SSG-08-02.** Package parity, net validation, explorable GUI lint, Bombadil net sync, Playwright discovery, and docs drift checks pass. Verified by `node scripts/check-package-source-parity.mjs && npm run check:net && npm run check:explorable-gui && npm run check:bombadil-nets && npm run check:playwright-discovery && npm run docs:check`.
- [x] **DoD-SSG-08-03.** Full build, unit tests, StageShow strict sweep, default Bombadil canary (`5` runs), and Chromium + Firefox + WebKit Playwright suites exit `0`. Verified by `npm run build && npm run test:unit && npm run stageshow:sweep -- --strict && node scripts/bombadil/canary.mjs && npm run test:smoke && npm run test:components && npm run test:features && npm run test:smoke:cross-browser`.
- [x] **DoD-SSG-08-04.** Operator graduation row is recorded in `DECISIONS.tsv` (explicit operator graduation approval on `2026-11-20`) and Program SSG files are archived into `docs/sprints/programs/ssg/` leaving `docs/sprints/_active/` in standby. Verified by `test -s docs/sprints/programs/ssg/INDEX.md && test -s docs/sprints/programs/ssg/evidence/SSG-08-graduation.md && test ! -e docs/sprints/_active/ssg-plan.md && grep -q 'SSG-graduation' docs/sprints/_active/DECISIONS.tsv && npm run docs:check`.
