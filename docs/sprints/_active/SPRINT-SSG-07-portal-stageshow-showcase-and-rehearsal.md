# SPRINT-SSG-07 Portal StageShow showcase and rehearsal

## Metadata

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-SSG-07` |
| Source of Truth | [`./ssg-plan.md`](./ssg-plan.md) and [`./INDEX.md`](./INDEX.md) |
| Handle | `urn:pcard:sprint:SPRINT-SSG-07` |
| Status | `PLANNED` |
| Depends on | `SPRINT-SSG-06` |
| Unblocks | `SPRINT-SSG-08` |
| Execution unit | `PR-SSG-07` |
| Poteto playbook | `prototype` for framing comparison, then `feature` with `principle-exhaust-the-design-space` and `principle-prove-it-works` |
| BMAD roles | Product Manager, UX Designer, Architect, Developer, TEA |
| Effort | 2 days (guess) |

## Outcome

The Sovereign MCard portal (`src/pages/index.astro` when `?noredirect=1`) hosts one focused, rehearsal-verified StageShow showcase scene (`workbench-bombadil-pair`, or dropped via `ssg-plan.md` Flag 1) compiled via `preact/compat` esbuild to `public/stageshow/workbench-bombadil-pair/` (`<= 35 KB` gzipped JS+CSS, already excluded from npm publish tarballs via `SPRINT-SSG-00`). Depicting a StageShow `Device pair` (`Window` workbench + straddling `Phone` satellite) triggering a Bombadil handle and resolving `p_spa_overview` -> `p_spa_details`, the scene builds dual outputs (`index.html` for standalone `film.mjs` / `jumps.mjs` rehearsal plus embeddable `scene.js` / `scene.css` with inline `tokens.css` variables, reactive Preact `<Stage theme={...} cursor={{ ..., ripple: false }}>` state mapping `'high-contrast' -> 'dark'` with explicit `.ss-stage` `--ss-*` token overrides subscribed to `lab:presentation-change` from initial `document.documentElement.dataset.theme`, and `window.__stageshow.theme` initial/standalone sync) and mounts inside `#portal-stageshow-showcase` using an open Shadow DOM host (`attachShadow({ mode: 'open' })`, appending `<link rel="stylesheet" href="/public/stageshow/workbench-bombadil-pair/scene.css">` inside `shadowRoot` and omitting `data-cursor` inside shadow DOM per `act.ts:206,222`) so `document.querySelectorAll('*')` DOM counts in `layout-freeze.spec.js` remain invariant across poster and hydrated modes while keeping `<astro-island>` count at `0` and `js/landing-page-mcard.js <= 250` lines.

## Work sequence

1. Run a StageShow framing comparison (`tools/stageshow/references/framing.md`, `Device pair` vs `Corner bleed`) inside `tools/stageshow/` before authoring final choreography, saving poster stills for UX sign-off (`principle-exhaust-the-design-space`).
2. Author Scene `tools/stageshow/scenes/workbench-bombadil-pair/` (`index.tsx`, `scene.css`, `REHEARSAL.md`):
   - Desktop composition (`720x340` wide stage) and redesigned `compact` phone composition (`358x320` below `600px`) using inline LandingPage `tokens.css` variables (`looks.md` reactive dark/light `<Stage theme={...}>` mapping plus `'high-contrast' -> 'dark'` `.ss-stage` `--ss-*` overrides synced via `lab:presentation-change` and initial `document.documentElement.dataset.theme` / `window.__stageshow.theme`).
   - Import focal preset dimensions (`393x852`, `1280x832`) from `js/device-registry.js` at build time so copy cannot drift, keep every visible real text string within `3` to `7` words beside `Bar` filler rows (`craft.md:9`), show `4` causal beats (`10` to `14` seconds) from triggering `urn:mcard:bombadil:trigger:spa` through Petri-net verification, and set `poster` on the settled payoff frame (`SKILL.md` step 7).
3. Compile the scene via `node tools/stageshow/build-scenes.mjs` producing dual artifacts (`index.html` for standalone `film`/`jumps` plus embeddable `scene.js` and `scene.css`), verify `npm pack --dry-run` excludes `public/stageshow/` (already configured in `SPRINT-SSG-00`), enforce total gzipped asset weight `<= 35 KB`, and verify `npm run stageshow:check-css` reports `0` class clashes across scenes, examples, and teaching CSS (passing positional paths + `--bundle` flags via `scripts/stageshow/run.mjs`).
4. Mount the showcase inside `#portal-stageshow-showcase` in `src/pages/index.astro` between the GovTech hero and `#single-page-mcard-host`:
   - Render a static HTML/CSS poster inside `#portal-stageshow-showcase` immediately with `0` `<astro-island>` tags and `js/landing-page-mcard.js <= 250` lines.
   - Mount live scene upgrades into an open Shadow DOM root (`attachShadow({ mode: 'open' })`) appending `<link rel="stylesheet" href="/public/stageshow/workbench-bombadil-pair/scene.css">` inside `shadowRoot`, passing `<Stage cursor={{ at: ..., ripple: false }}>` (`stage.tsx:45`), keeping `data-cursor` attributes off shadow-mounted elements (`act.ts:206,222`), and binding reactive `<Stage theme={...}>` state from initial `document.documentElement.dataset.theme` + `lab:presentation-change` events (`'high-contrast' -> 'dark'` with `.ss-stage` `--ss-*` overrides) plus `data-power-mode`, gating auto-play when `window.self === window.top && !matchMedia('(prefers-reduced-motion: reduce)').matches && document.documentElement.dataset.powerMode !== 'energy-saving'` while preserving light-DOM `querySelectorAll('*')` invariance.
5. Update `tests/features/layout-freeze.spec.js` `VOLATILE.index` (`:44`) to add `'#portal-stageshow-showcase *'` (masking internal light-DOM fallback poster descendants via `el.closest('#portal-stageshow-showcase *')` while keeping the outer `<section id="portal-stageshow-showcase">` container frozen), selectively re-capture `tests/baselines/layout-baseline.json` (`STY_FREEZE_PAGES=index`) with a `rebaselines` entry, and write `tests/features/portal-stageshow-showcase.spec.js`.
6. Execute full mechanical rehearsal across every `film.mjs` mode against `'/public/stageshow/workbench-bombadil-pair/index.html'` (`wide --gate`, `--width 390 --gate`, `--dark --gate`, `--reduced --still --gate`, `--states --gate`, and `stageshow:jumps -- --strict`), sign `tools/stageshow/scenes/workbench-bombadil-pair/REHEARSAL.md`, and write `docs/sprints/_active/evidence/SSG-07-portal-showcase.md` + [`./DECISIONS.tsv`](./DECISIONS.tsv).

## Files

- Create `tools/stageshow/scenes/workbench-bombadil-pair/` (`index.tsx`, `scene.css`, `REHEARSAL.md`)
- Create compiled static scene artifacts (`index.html`, `scene.js`, `scene.css`) under `public/stageshow/workbench-bombadil-pair/` (built via `node tools/stageshow/build-scenes.mjs`)
- Edit `tools/stageshow/build-scenes.mjs` (dual `index.html` + embeddable `scene.js`/`scene.css` emit) and `src/pages/index.astro`
- Create `tests/features/portal-stageshow-showcase.spec.js`
- Edit `tests/features/layout-freeze.spec.js` (`VOLATILE.index`) and `tests/baselines/layout-baseline.json`
- Create `docs/sprints/_active/evidence/SSG-07-portal-showcase.md` and append row to [`./DECISIONS.tsv`](./DECISIONS.tsv)

## BMAD responsibilities

### Product Manager

- Confirm every `3`-to-`7`-word focal label accurately communicates Responsive UI Lab, Bombadil handles, and Sovereign MCard verification (or execute Flag 1 drop if portal stays plain).

### UX Designer

- Own composition, bleed margins, `compact` `358x320` layout, `html[data-theme]` bridge, poster frame selection, and frame-by-frame motion sign-off in `REHEARSAL.md`.

### Architect

- Verify `index.html?noredirect=1` retains `0` `<astro-island>` elements, `0 B` `_astro/` JS (`place-bytes.mjs`), `<= 35 KB` gzipped scene size, invariant light-DOM node count (`attachShadow`), and `npm pack --dry-run` exclusion of `public/stageshow/`.

### Developer

- Implement the `preact/compat` `Device pair` scene (`index.html` + `scene.js`/`scene.css` outputs), static HTML poster fallback, open Shadow DOM mount, theme bridge, and reduced-motion/iframe/energy-saving guards.

### TEA

- Execute all `5` `stageshow:film -- --gate` passes, `stageshow:jumps -- --strict`, `build-scenes.mjs --check`, `npm pack --dry-run`, `portal-stageshow-showcase.spec.js`, and `layout-freeze.spec.js`.

## Acceptance criteria

- `/public/stageshow/workbench-bombadil-pair/index.html` passes `stageshow:film -- --gate` (`rehearsal passed`) at `1280px`, `--width 390`, `--dark`, `--reduced --still`, and `--states`, plus `stageshow:jumps -- --strict`, with signed `REHEARSAL.md` and matching `build-scenes.mjs --check`.
- `index.html?noredirect=1` renders `#portal-stageshow-showcase` with `0` `<astro-island>` elements, `<= 35 KB` gzipped showcase JS+CSS, `js/landing-page-mcard.js <= 250` lines, static poster when framed (`window.self !== window.top`) or under `prefers-reduced-motion` / `data-power-mode="energy-saving"`, and `0` console/CSP errors.
- `npm pack --dry-run` output contains zero files under `public/stageshow/`.

## Test design

- `tests/features/portal-stageshow-showcase.spec.js` verifies `#portal-stageshow-showcase` on `/index.html?noredirect=1` at `1280x800` and `358x800` (`0` overflow, `0` console errors), verifies compact swap below `600px`, verifies static poster under `reducedMotion: 'reduce'`, `data-power-mode="energy-saving"`, and inside Lab iframe embed, and verifies theme sync.
- Mechanical StageShow rehearsal runs every `film -- --gate` and `jumps -- --strict` invocation against `'/public/stageshow/workbench-bombadil-pair/index.html'`.

## Non-goals

- Adding animated `Act` loops inside `responsive-lab.html` interactive workbench controls.
- Bypassing `REHEARSAL.md` contact-sheet inspection.

## Definition of done

- [ ] **DoD-SSG-07-01.** Scene compiles under `<= 35 KB` gzipped with committed parity (`--check`), excluded from `npm pack --dry-run`, and zero CSS clashes. Verified by `node tools/stageshow/build-scenes.mjs && node tools/stageshow/build-scenes.mjs --check && npm run stageshow:check-css && ! npm pack --dry-run 2>&1 | grep -q 'public/stageshow/'`.
- [ ] **DoD-SSG-07-02.** Wide, `390px` compact, dark, reduced-motion, and `--states` passes print `rehearsal passed`, `jumps` exits `0`, and `REHEARSAL.md` is signed. Verified by `test -s tools/stageshow/scenes/workbench-bombadil-pair/REHEARSAL.md && npm run stageshow:film -- '/public/stageshow/workbench-bombadil-pair/index.html' --gate && npm run stageshow:film -- '/public/stageshow/workbench-bombadil-pair/index.html' --width 390 --gate && npm run stageshow:film -- '/public/stageshow/workbench-bombadil-pair/index.html' --dark --gate && npm run stageshow:film -- '/public/stageshow/workbench-bombadil-pair/index.html' --reduced --still --gate && npm run stageshow:film -- '/public/stageshow/workbench-bombadil-pair/index.html' --states --gate && npm run stageshow:jumps -- '/public/stageshow/workbench-bombadil-pair/index.html' --strict`.
- [ ] **DoD-SSG-07-03.** Portal maintains `0` Astro islands (`place-bytes.mjs`), `js/landing-page-mcard.js <= 250` lines, clean layout freeze, and passing showcase/landing suites. Verified by `node tests/performance/place-bytes.mjs --enforce-zero-island-places && npx playwright test tests/features/portal-stageshow-showcase.spec.js tests/features/layout-freeze.spec.js tests/smoke/landing-page.spec.js --project=features --project=smoke`.
- [ ] **DoD-SSG-07-04.** Evidence in `evidence/SSG-07-portal-showcase.md` and `DECISIONS.tsv` row are recorded with all core gates green. Verified by `test -s docs/sprints/_active/evidence/SSG-07-portal-showcase.md && grep -qE $'\tSSG-07\t' docs/sprints/_active/DECISIONS.tsv && node scripts/check-package-source-parity.mjs && npm run check:explorable-gui && npm run check:net && npm run check:bombadil-nets && npm run check:playwright-discovery && npm run docs:check && npm run build && npm run test:unit`.
