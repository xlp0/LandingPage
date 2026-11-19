# SPRINT-SSG-00 StageShow installation and layout gate

## Metadata

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-SSG-00` |
| Source of Truth | [`./ssg-plan.md`](./ssg-plan.md) and [`./INDEX.md`](./INDEX.md) |
| Handle | `urn:pcard:sprint:SPRINT-SSG-00` |
| Status | `IN_PROGRESS` |
| Depends on | None |
| Unblocks | `SPRINT-SSG-01` |
| Execution unit | `PR-SSG-00` |
| Poteto playbook | `feature` with `principle-build-the-lever` and `principle-prove-it-works` |
| BMAD roles | Product Manager, UX Designer, Architect, Developer, TEA |
| Effort | 2 days (guess) |

## Outcome

StageShow `1.1.1` is installed inside `tools/stageshow/` and `.agents/skills/stageshow/` without disturbing npm workspace publishing, Astro island counts, or Playwright test discovery (`"files"` in `package.json` explicitly excludes `public/stageshow/**` and `postcss` is declared in `devDependencies` alongside regenerated `package-lock.json` for Docker `npm ci`). `scripts/stageshow/run.mjs` executes deterministic layout, CSS clash, film (defaulting `--out stageshow-output/film.png` so `shots/` never dirties git), and jump checks against freshly built `dist/` bundles and ephemeral SQLite databases seeded via shared JSON `PUT /api/mcard/landing`, while enforcing bidirectional viewport bounds, `scrollWidth` parity, and page readiness in both `layout --strict` and `sweep --strict`. An isolated `preact/compat` esbuild compiler (`jsx-runtime` + `jsx-dev-runtime` + inline-SVG `lucide-react` shim) compiles StageShow demos into `public/stageshow/` without installing React `18`, and `docs/06-components/STAGESHOW_DESIGN_CONTRACT.md` codifies the transferable versus house-style rubric.

## Work sequence

1. Install upstream StageShow `1.1.1` (`benjitaylor/skills`, commit `299140fafd08df55a9c234e610c3f64af3f45531`, MIT license) into `tools/stageshow/` with `UPSTREAM.json` provenance, mirror `SKILL.md` and all `15` reference guides into `.agents/skills/stageshow/`, and update `tools/stageshow/scripts/browser.mjs` to fall back to Playwright Chromium when branded Chrome is absent. *(Completed and verified on `2026-11-19`.)*
2. Add `stageshow-output/` to `.gitignore`, create `scripts/stageshow/run.mjs` using `resolvePlaywrightServerContract()`, wire `stageshow:layout`, `stageshow:sweep`, `stageshow:film`, `stageshow:jumps`, and `stageshow:check-css` in `package.json`, add `tests/unit/stageshow-install.test.mjs`, and record the initial `24`-snapshot baseline sweep in [`./evidence/SSG-pre-program-spike.md`](./evidence/SSG-pre-program-spike.md). *(Completed and verified on `2026-11-19`.)*
3. Harden `withHermeticServer`, `runLayout`, `runFilm`, and `runSweep` in `scripts/stageshow/run.mjs` across all subcommands (`sweep`, `layout`, `film`, `jumps`), and record offline `fileHashes` in `tools/stageshow/UPSTREAM.json`:
   - Run `npm run build:astro` (and `node tools/stageshow/build-scenes.mjs` once scenes exist) before spawning `ws-server.js` unless `SKIP_BUILD=1` is set so StageShow checks never audit stale `dist/` artifacts.
   - Export a shared `seedPortalLanding(baseURL)` helper and invoke it right after `waitForHealth`, sending `PUT ${contract.baseURL}/api/mcard/landing` with `Content-Type: application/json` and body `JSON.stringify({ content: '# Sovereign MCard Portal\n\nStageShow verification fixture.' })` (omitting `url` because `server/mcard-api.mjs:348-355` passes any defined `url` through `validateExternalUrl`, rejecting relative paths with HTTP `400`) so `GET /api/mcard/landing` returns `200` against the ephemeral database without mutating tracked files under `data/samples/`.
   - Wire `--no-sandbox` forwarding and an optional `{ chromePath }` parameter (defaulting to `process.env.CHROME_PATH`) into `tools/stageshow/scripts/browser.mjs:13-23` when `process.env.STAGESHOW_NO_SANDBOX === '1'` or `process.getuid?.() === 0`, reuse one Chromium browser instance launched via `launch({ chromePath: await resolveChromePath(process.env) })` from `tools/stageshow/scripts/browser.mjs` (honoring `CHROME_PATH=/usr/bin/chromium`, local Playwright Chromium discovery when `CHROME_PATH` is unset, and `--no-sandbox`) across `24` fresh `browser.newContext({ viewport })` visits in `runSweep`, default `film` `--out` to `stageshow-output/film.png` when omitted (`film.mjs:186` otherwise writes tracked `shots/film.png`), extract `--width` (default `1280`), `--delay` (default `300`), and `--strict` from `parsed.args` inside `runLayout`, and run a Playwright probe via the same `launch()` browser in both `runSweep` and `runLayout` (`{ width, height: 1000 }` matching `tools/stageshow/scripts/layout.mjs:9,29` in `runLayout`) checking `document.body.dataset.pageState !== 'loading'`, `documentElement.scrollWidth <= innerWidth + 1`, and visible header/landmark control bounds (`r.left >= -1 && r.right <= innerWidth + 1`). Fail `--strict` (`exit 1`) on `totalFindings > 0 || totalErrors > 0 || totalClipped > 0 || totalOverflows > 0 || anyStatus !== 'no-issues-detected'`.
   - Record per-file SHA-256 `fileHashes` inside `tools/stageshow/UPSTREAM.json` (`scripts/browser.mjs`, `shims/`, `build-scenes.mjs`, and `scenes/` listed as `exempt`) so `tests/unit/stageshow-install.test.mjs` verifies upstream integrity offline.
   - Install `postcss` explicitly into root `package.json` `devDependencies` (`npm i -D postcss`, updating `package-lock.json` so Docker `npm ci` succeeds and `class-clash.mjs:36` resolves directly), keep `DEFAULT_CHECK_CSS_ARGS` (`scripts/stageshow/run.mjs:26-33` for `examples` and `teaching`, avoiding `:where(.ss-stage...)` `manual:` exit-2 warnings in `kit/stage.css`), extend `resolveDefaultCheckCssArgs([])` (`run.mjs:60-62`) to append both `'--bundle'` and positional `tools/stageshow/scenes/<scene>` paths for existing scene subdirectories detected via `fs.existsSync`, and update `tests/unit/stageshow-install.test.mjs:94` to assert `resolveDefaultCheckCssArgs([])` starts with `[...DEFAULT_CHECK_CSS_ARGS]` followed by each built scene pair.
4. Author `tools/stageshow/build-scenes.mjs`, `tools/stageshow/shims/lucide-react.mjs`, and package rules (optional along with item 5 and `DoD-SSG-00-05` if `Flag 1` drops `SPRINT-SSG-07` at kickoff):
   - Alias root `esbuild` to existing `preact@11.1.0` (`react -> preact/compat`, `react-dom -> preact/compat`, `react-dom/client -> preact/compat/client`, `react/jsx-runtime -> preact/compat/jsx-runtime`, `react/jsx-dev-runtime -> preact/compat/jsx-dev-runtime`, `lucide-react -> tools/stageshow/shims/lucide-react.mjs`), implementing uniform single-stroke inline SVGs for every `Icon` consumed by `tools/stageshow/kit/parts/Icon.tsx:3` and `kit/index.ts:36`.
   - Support `--check` in `build-scenes.mjs` to assert committed `public/stageshow/` bundles match compiled output, and exclude `public/stageshow/` from `package.json` `"files"` (`!public/stageshow/**`, or explicit `public/` subdirectories if `npm-packlist` retains negated globs, verified via `npm pack --dry-run`).
5. Author a minimal StageShow smoke fixture (`tools/stageshow/scenes/canary/index.tsx` and `scene.css`) compiled to `public/stageshow/canary/index.html` using `Stage`, `Window`, and `Phone`, and pass `stageshow:film -- '/public/stageshow/canary/index.html' --still --gate` plus `--width 390 --still --gate`.
6. Author `docs/06-components/STAGESHOW_DESIGN_CONTRACT.md` encoding StageShow transferable craft (`playground/viewer.tsx` anatomy, `5`-surface tokens, SVG icon rules, `1:1` inner pixels, `compact` redesigns, `Act` boundary) and link it from `docs/06-components/README.md`, then record closure evidence in `docs/sprints/_active/evidence/SSG-00-stageshow-gate.md` and `DECISIONS.tsv`.

## Files

- Created [`../../../tools/stageshow/UPSTREAM.json`](../../../tools/stageshow/UPSTREAM.json), [`../../../.agents/skills/stageshow/SKILL.md`](../../../.agents/skills/stageshow/SKILL.md), and `tools/stageshow/scripts/browser.mjs`
- Created [`../../../scripts/stageshow/run.mjs`](../../../scripts/stageshow/run.mjs), [`../../../tests/unit/stageshow-install.test.mjs`](../../../tests/unit/stageshow-install.test.mjs), and [`./evidence/SSG-pre-program-spike.md`](./evidence/SSG-pre-program-spike.md)
- Edit `package.json` (direct `postcss` in `devDependencies`, exclude `public/stageshow/**` from `"files"`), `package-lock.json`, `tools/stageshow/UPSTREAM.json` (`fileHashes` + `exempt`), `tools/stageshow/scripts/browser.mjs` (`STAGESHOW_NO_SANDBOX` / `getuid() === 0` `--no-sandbox` forwarding), `scripts/stageshow/run.mjs` (`withHermeticServer` auto-build + shared `seedPortalLanding`, default `--out stageshow-output/film.png`, single-browser `24`-context sweep, bidirectional `layout`/`sweep --strict`, positional + `--bundle` `check-css`), and `tests/unit/stageshow-install.test.mjs`
- Create `tools/stageshow/shims/lucide-react.mjs`, `tools/stageshow/build-scenes.mjs`, `tools/stageshow/scenes/canary/index.tsx`, `tools/stageshow/scenes/canary/scene.css`, and `public/stageshow/canary/index.html`
- Create `docs/06-components/STAGESHOW_DESIGN_CONTRACT.md` and edit `docs/06-components/README.md`
- Create `docs/sprints/_active/evidence/SSG-00-stageshow-gate.md` and append row to [`./DECISIONS.tsv`](./DECISIONS.tsv)

## BMAD responsibilities

### Product Manager

- Ratify the `SSG-D01` through `SSG-D13` architectural scope, Bombadil dashboard role, and StageShow transferable craft contract.

### UX Designer

- Audit the `24` baseline PNGs and codify StageShow visual standards (`viewer.tsx`, `craft.md`, `framing.md`, `looks.md`, `kit.md`, `motion.md`) inside `docs/06-components/STAGESHOW_DESIGN_CONTRACT.md`.

### Architect

- Verify zero React `18` dependencies exist in `tools/stageshow/`, `dist/client/_astro/`, or `package.json`, confirm `npm pack --dry-run` excludes `public/stageshow/`, and verify `PUT /api/mcard/landing` keeps tracked `data/` and `data/samples/` unmodified.

### Developer

- Implement `lucide-react` SVG shim, `postcss` devDep, `UPSTREAM.json` `fileHashes`, hermetic `seedPortalLanding` JSON `PUT`, auto-build pre-flight, strict bounds/`scrollWidth` assertions in `layout` and `sweep`, `preact/compat` scene compiler, and canary scene.

### TEA

- Confirm `tests/unit/stageshow-install.test.mjs` proves offline upstream hash parity on non-exempt files, clean `git status` after seeding, excluded `npm pack` files, and passing canary rehearsals at wide and `390px` widths.

## Acceptance criteria

- All non-exempt upstream files in `tools/stageshow/` match commit `299140fafd08df55a9c234e610c3f64af3f45531` SHA-256 digests stored in `UPSTREAM.json` (`scripts/browser.mjs`, `shims/`, `build-scenes.mjs`, and `scenes/` explicitly listed as exempt).
- `npm run stageshow:sweep` completes all `24` snapshots against fresh `dist/` builds with `0` `inconclusive` `/index.html?noredirect=1` statuses, `0` `/api/mcard/landing` `404` errors, and `0` tracked repo changes.
- Both `layout --strict` and `sweep --strict` report `clippedControls` and `overflowRoutes` accurately against baseline defects, failing (`exit 1`) when defects exist (`exit 1` before `SSG-01`/`SSG-06` fixes).
- `public/stageshow/canary/index.html` compiles via `preact/compat` esbuild (`jsx-runtime` + `lucide-react` shim) with `0` React installs, `npm pack --dry-run` excludes `public/stageshow/`, and `stageshow:film -- '/public/stageshow/canary/index.html' --still --gate` passes at wide and `390px` widths.

## Test design

- Expand `tests/unit/stageshow-install.test.mjs` (`:94` reconciled with `DEFAULT_CHECK_CSS_ARGS` + detected `tools/stageshow/scenes/<scene>` pairs) to assert offline upstream `fileHashes`, `withHermeticServer` JSON `PUT` landing seeding, `preact/compat` build determinism (`--check`), per-scene `--bundle` clash execution, and `runSweep`/`runLayout` strict exit behavior on synthetic clipped controls.
- Verify `! npm pack --dry-run 2>&1 | grep -q 'public/stageshow/'` and execute live canary checks at `1280px` and `--width 390` plus `npm run stageshow:sweep` showing `/index.html?noredirect=1` `errors=0`.

## Non-goals

- Modifying existing Astro pages, host stylesheets, `js/harness/*`, or Bombadil endpoints before `SPRINT-SSG-01`.
- Authoring full production StageShow portal scenes, which belong to `SPRINT-SSG-07`.

## Definition of done

- [x] **DoD-SSG-00-01.** Upstream StageShow `1.1.1` is installed under `tools/stageshow/` and `.agents/skills/stageshow/` with Chromium fallback and passes initial install tests. Verified by `node --test tests/unit/stageshow-install.test.mjs`.
- [x] **DoD-SSG-00-02.** Upstream and teaching stylesheets pass static class namespace analysis. Verified by `npm run stageshow:check-css`.
- [x] **DoD-SSG-00-03.** Baseline `24`-snapshot sweep across `6` routes and `4` widths is recorded in `SSG-pre-program-spike.md`. Verified by `npm run stageshow:sweep`.
- [ ] **DoD-SSG-00-04.** Ephemeral JSON seeding (`seedPortalLanding`), `build:astro` pre-flight, offline `UPSTREAM.json` `fileHashes`, bidirectional bounds/`scrollWidth` checks in `layout` and `sweep`, and `git status` cleanliness work (`errors=0` on portal). Verified by `npm run stageshow:sweep` showing `errors=0` on `/index.html?noredirect=1`, `node --test tests/unit/stageshow-install.test.mjs`, and `npm pack --dry-run` excluding `public/stageshow/`.
- [ ] **DoD-SSG-00-05.** Isolated `preact/compat` bundler (`jsx-runtime` + `lucide-react` shim) builds the StageShow canary scene to `public/stageshow/canary/index.html` and passes both wide and `390px` rehearsals (optional if `Flag 1` drops `SPRINT-SSG-07` at kickoff). Verified by `node tools/stageshow/build-scenes.mjs && node tools/stageshow/build-scenes.mjs --check && npm run stageshow:film -- '/public/stageshow/canary/index.html' --still --gate && npm run stageshow:film -- '/public/stageshow/canary/index.html' --width 390 --still --gate`.
- [ ] **DoD-SSG-00-06.** `docs/06-components/STAGESHOW_DESIGN_CONTRACT.md` is authored and linked from `docs/06-components/README.md`. Verified by `test -s docs/06-components/STAGESHOW_DESIGN_CONTRACT.md && grep -q 'STAGESHOW_DESIGN_CONTRACT.md' docs/06-components/README.md`.
- [ ] **DoD-SSG-00-07.** Sprint evidence and closure decision row (in addition to baseline row `136`) are recorded with all core static/unit gates passing. Verified by `test -s docs/sprints/_active/evidence/SSG-00-stageshow-gate.md && test "$(grep -cE $'\tSSG-00\t' docs/sprints/_active/DECISIONS.tsv)" -ge 2 && npm run stageshow:check-css && node scripts/check-package-source-parity.mjs && npm run check:explorable-gui && npm run check:net && npm run check:bombadil-nets && npm run check:playwright-discovery && npm run docs:check && npm run test:unit`.
