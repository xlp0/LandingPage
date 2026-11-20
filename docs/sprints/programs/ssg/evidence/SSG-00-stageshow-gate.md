# Program SSG Sprint `SPRINT-SSG-00` verification evidence

| Field | Value |
| --- | --- |
| Sprint | [`../SPRINT-SSG-00-stageshow-installation-and-layout-gate.md`](../SPRINT-SSG-00-stageshow-installation-and-layout-gate.md) |
| Decisions Ledger | [`../DECISIONS.tsv`](../../../_active/DECISIONS.tsv) |
| Design Contract | [`../../../06-components/STAGESHOW_DESIGN_CONTRACT.md`](../../../../06-components/STAGESHOW_DESIGN_CONTRACT.md) |
| Runner & Compiler | [`../../../../scripts/stageshow/run.mjs`](../../../../../scripts/stageshow/run.mjs), [`../../../../tools/stageshow/build-scenes.mjs`](../../../../../tools/stageshow/build-scenes.mjs) |
| Verified Date | `2026-11-20` |

## Deliverables completed in Tasks 3 to 6

- Installed `postcss` (`^8.5.33`) directly in `package.json` `devDependencies` with synchronized `package-lock.json`, kept `0` React `18` dependencies (`preact@11.1.0` only), and excluded `public/stageshow/` from npm package tarballs via `"!public/stageshow"` and `"!public/stageshow/**"`.
- Updated [`../../../../tools/stageshow/scripts/browser.mjs`](../../../../../tools/stageshow/scripts/browser.mjs) (`launch(options = {})`) to accept explicit `{ chromePath }` overrides and append `--no-sandbox` when `STAGESHOW_NO_SANDBOX === '1'` or `process.getuid?.() === 0`.
- Recorded SHA-256 `fileHashes` across all `371` non-exempt upstream files in [`../../../../tools/stageshow/UPSTREAM.json`](../../../../../tools/stageshow/UPSTREAM.json) with explicit `exempt` entries (`UPSTREAM.json`, `scripts/browser.mjs`, `shims/`, `build-scenes.mjs`, `scenes/`).
- Created the inline-SVG [`../../../../tools/stageshow/shims/lucide-react.mjs`](../../../../../tools/stageshow/shims/lucide-react.mjs) covering all `31` icons imported by `kit/parts/Icon.tsx`, plus [`../../../../tools/stageshow/build-scenes.mjs`](../../../../../tools/stageshow/build-scenes.mjs) compiling scenes via root `esbuild` aliased to `preact/compat` (`jsx-runtime` and `jsx-dev-runtime`) with `--check` determinism enforcement.
- Created [`../../../../tools/stageshow/scenes/canary/index.tsx`](../../../../../tools/stageshow/scenes/canary/index.tsx) and `scene.css`, compiled to `public/stageshow/canary/index.html` (`180820 B` raw, `52762 B` gzip).
- Hardened [`../../../../scripts/stageshow/run.mjs`](../../../../../scripts/stageshow/run.mjs) across `check-css` (appending `--bundle` and positional scene directories), `withHermeticServer` (`build:astro` and `build-scenes.mjs` pre-flight unless `SKIP_BUILD=1` plus shared `seedPortalLanding` JSON `PUT /api/mcard/landing` omitting `url`), `film` (defaulting `--out stageshow-output/film.png`), and single-browser `layout` / `24`-context `sweep` checks with readiness, `scrollWidth`, bidirectional `clippedControls`, and `--strict` exit `1`.
- Expanded [`../../../../tests/unit/stageshow-install.test.mjs`](../../../../../tests/unit/stageshow-install.test.mjs) to `9` unit tests and authored [`../../../06-components/STAGESHOW_DESIGN_CONTRACT.md`](../../../../06-components/STAGESHOW_DESIGN_CONTRACT.md) linked from [`../../../06-components/README.md`](../../../../06-components/README.md).

## Canary scene build and film rehearsal (`DoD-SSG-00-05`)

- `[Observed-CLI]` `node tools/stageshow/build-scenes.mjs` and `--check` built and verified `public/stageshow/canary/index.html` (`180820 B raw, 52762 B gzip`, exit `0`).
- `[Observed-CLI]` `npm run stageshow:film -- '/public/stageshow/canary/index.html' --still --gate` exited `0`, wrote `stageshow-output/film.png` without creating `shots/`, and printed `film: no-issues-detected` and `rehearsal passed`.
- `[Observed-CLI]` `npm run stageshow:film -- '/public/stageshow/canary/index.html' --width 390 --still --gate` exited `0` and printed `film: no-issues-detected` and `rehearsal passed` (`compact={{ below: 600, width: 358, height: 320 }}`).

## Hermetic 24-snapshot sweep and strict check (`DoD-SSG-00-04`)

Captured from `stageshow-output/sweep-2026-11-19T18-02-35-587Z/summary.json` (`[Observed-CLI]`). `seedPortalLanding` seeded `/api/mcard/landing` against ephemeral SQLite storage (`errors=0` across all `4` portal widths) while `git status --porcelain -- data/` remained empty. `SKIP_BUILD=1 npm run stageshow:sweep -- --strict` exited `1` on the un-fixed baseline defects (`totals: snapshots=24 findings=0 errors=0 clipped=42 overflows=7`).

| Route | Width (px) | Status | Controls | Containers | Findings | Errors | Clipped | Overflow |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | :---: |
| `/responsive-lab.html` | `1440` | `no-issues-detected` | `32` | `3` | `0` | `0` | `0` | `false` |
| `/responsive-lab.html` | `820` | `no-issues-detected` | `32` | `3` | `0` | `0` | `0` | `false` |
| `/responsive-lab.html` | `390` | `no-issues-detected` | `30` | `2` | `0` | `0` | `3` | `true` |
| `/responsive-lab.html` | `358` | `no-issues-detected` | `30` | `2` | `0` | `0` | `4` | `true` |
| `/index.html?noredirect=1` | `1440` | `no-issues-detected` | `4` | `2` | `0` | `0` | `0` | `false` |
| `/index.html?noredirect=1` | `820` | `no-issues-detected` | `4` | `2` | `0` | `0` | `0` | `false` |
| `/index.html?noredirect=1` | `390` | `no-issues-detected` | `4` | `2` | `0` | `0` | `1` | `false` |
| `/index.html?noredirect=1` | `358` | `no-issues-detected` | `4` | `2` | `0` | `0` | `1` | `false` |
| `/sprint-registry.html` | `1440` | `no-issues-detected` | `0` | `16` | `0` | `0` | `0` | `false` |
| `/sprint-registry.html` | `820` | `no-issues-detected` | `0` | `11` | `0` | `0` | `0` | `false` |
| `/sprint-registry.html` | `390` | `no-issues-detected` | `0` | `6` | `0` | `0` | `0` | `false` |
| `/sprint-registry.html` | `358` | `no-issues-detected` | `0` | `6` | `0` | `0` | `0` | `true` |
| `/fiber-inspector.html` | `1440` | `no-issues-detected` | `0` | `1` | `0` | `0` | `0` | `false` |
| `/fiber-inspector.html` | `820` | `no-issues-detected` | `0` | `1` | `0` | `0` | `0` | `true` |
| `/fiber-inspector.html` | `390` | `no-issues-detected` | `0` | `1` | `0` | `0` | `0` | `true` |
| `/fiber-inspector.html` | `358` | `no-issues-detected` | `0` | `1` | `0` | `0` | `0` | `true` |
| `/fiber-conformance.html` | `1440` | `no-issues-detected` | `0` | `1` | `0` | `0` | `0` | `false` |
| `/fiber-conformance.html` | `820` | `no-issues-detected` | `0` | `1` | `0` | `0` | `0` | `false` |
| `/fiber-conformance.html` | `390` | `no-issues-detected` | `0` | `1` | `0` | `0` | `0` | `false` |
| `/fiber-conformance.html` | `358` | `no-issues-detected` | `0` | `1` | `0` | `0` | `0` | `false` |
| `/app.html` | `1440` | `no-issues-detected` | `4` | `5` | `0` | `0` | `6` | `false` |
| `/app.html` | `820` | `no-issues-detected` | `4` | `5` | `0` | `0` | `6` | `false` |
| `/app.html` | `390` | `no-issues-detected` | `4` | `2` | `0` | `0` | `10` | `false` |
| `/app.html` | `358` | `no-issues-detected` | `4` | `2` | `0` | `0` | `11` | `true` |

## Packaging, unit, and static gate summary (`DoD-SSG-00-04..07`)

- `[Observed-CLI]` `npm pack --dry-run` exited `0` with `628` package notices, `0` matches for `public/stageshow`, and `public/css/tokens.css` included.
- `[Observed-CLI]` `node --test tests/unit/stageshow-install.test.mjs` passed `9` of `9` tests (`UPSTREAM.json` `371` hashes, `31`-icon SVG shim, `check-css` scene bundle args, `film` `--out` default, `build-scenes.mjs --check`, `seedPortalLanding` mock + hermetic `withHermeticServer`, and strict clipped/overflow failure on synthetic fixtures).
- `[Observed-CLI]` `npm run stageshow:check-css` exited `0` (`84 CSS files, 3 explicit bundles`, `0` overlapping class namespaces).
- `[Observed-CLI]` `node scripts/check-package-source-parity.mjs`, `npm run check:explorable-gui`, `npm run check:net`, `npm run check:bombadil-nets`, `npm run check:playwright-discovery`, `npm run docs:check` (`267` Markdown files), and `npm run test:unit` (`285` tests across `19` suites) all exited `0`.
