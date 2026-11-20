# StageShow Design Contract

| Field | Value |
| --- | --- |
| Audience | UI engineers, UX designers, and TEA reviewers |
| BMAD Owner | UX Designer, Architect, and Developer |
| Upstream Source | [`tools/stageshow/UPSTREAM.json`](../../tools/stageshow/UPSTREAM.json), [`tools/stageshow/playground/viewer.tsx`](../../tools/stageshow/playground/viewer.tsx), [`tools/stageshow/playground/viewer.css`](../../tools/stageshow/playground/viewer.css), [`tools/stageshow/kit/stage.css`](../../tools/stageshow/kit/stage.css) |
| Craft References | [`craft.md`](../../tools/stageshow/references/craft.md), [`framing.md`](../../tools/stageshow/references/framing.md), [`looks.md`](../../tools/stageshow/references/looks.md), [`kit.md`](../../tools/stageshow/references/kit.md), [`motion.md`](../../tools/stageshow/references/motion.md) |
| Verification Runner | [`scripts/stageshow/run.mjs`](../../scripts/stageshow/run.mjs) |

This contract codifies how `LandingPage` applies StageShow `1.1.1` layout craft across the Responsive UI Lab workbench and host pages while isolating StageShow marketing-illustration patterns inside compiled `public/stageshow/` portal scenes.

## Workbench anatomy modeled on viewer.tsx

The Responsive UI Lab shell follows the three-zone composition defined in `tools/stageshow/playground/viewer.tsx` and `viewer.css`.

1. **Single-band header navbar.** One `header.lab-navbar` band (`44px` height, `scrollbar-gutter: stable` on root `html`) carries navigation and title on the left and arrangement, theme/power toggles, Mission Control, and pop-out actions on the right.
2. **Docked mode selector.** One segmented control tabs between `Explore`, `Guided`, `Bombadil`, and `Verify` panels using `[hidden]` visibility so controls never stack into redundant duplicate readouts (`"Say it once"`, `craft.md`).
3. **Three-part preview stage.** Mirroring `.pg-toolbar`, `.pg-canvas`, and `.pg-transport` in `viewer.tsx`, `main#lab-stage-container` stacks:
   - `.stage-toolbar` above the canvas holding target place, monospace `tabular-nums` dimensions, `Rotate`, `Scale` (`Fit` vs `Actual 1:1`), and `Safe-area guides`.
   - `.stage-well` holding one recessed `--lab-well` ground framing `.stage-scale-rig` -> parametric hardware bezel -> `content-box` `.stage-screen-slot` -> `#mission-control-iframe`.
   - `.stage-transport` directly below the well holding capture controls (`Start / Pause / Resume / Stop`, `0 ev` counter) and Bombadil job status across every workbench mode.

## Five-surface depth and shape tokens

StageShow defines five stepped surfaces in `tools/stageshow/kit/stage.css` and `references/looks.md` that map directly onto `--lab-*` tokens across dark, light, and high-contrast themes.

| StageShow token | Workbench role | Dark theme rule | Reference default (`looks.md`) |
| --- | --- | --- | --- |
| `--ss-canvas` | Base window or sidebar ground | Darkest workspace plane | `#f5f5f4` light equivalent |
| `--ss-well` | Recessed stage backdrop behind hardware frame | Sunken contrast plane around device | `--ss-well` gray well |
| `--ss-chrome` | Window chrome, toolbars, and inactive tracks | Step above canvas | Window chrome plane |
| `--ss-surface` | Primary card, active content column, and active tab thumb | Lightness step rather than thick borders (`craft.md`) | `#fff` light equivalent |
| `--ss-raised` | Floating popovers, transport pills, and satellite cards | Highest elevation step | `#fff` / `--ss-raised` |

Shape, density, and state tokens follow `tools/stageshow/kit/stage.css` lines `94-102`.

- **Radius scale.** `--ss-radius-sm` (`6px`) for menu rows and segmented thumbs, `--ss-radius-md` (`8px`) for fields and segmented tracks, `--ss-radius-lg` (`10px`) for popovers and toasts, `--ss-radius-window` (`12px`) for windows, and `--ss-radius-pill` (`999px`) for pills and badges.
- **Density baselines.** `--ss-control` (`34px`) for text inputs and primary field height, `--ss-row` (`26px`) for dense menu rows and segmented buttons (`28px` compact workbench buttons), and `12px` standard card/window inset (`8px` dense row padding).
- **Opaque active thumbs.** Selected segmented controls (`[aria-pressed="true"]`, `[aria-selected="true"]`) take a solid `--lab-surface` step (`viewer.css:26` and `craft.md`), never translucent washes that mud when overlapped.
- **Typographic restraint.** Sentence-case labels, no trailing colons on static labels, at most `1` large hero counter beside quiet secondary lines (`craft.md`), and `font-variant-numeric: tabular-nums` on dimensions, timers, and counters.

## Single-weight SVG icon rules

All icons inside workbench chrome, islands, and host navigation obey the `craft.md` icon rubric (`Icons and logos`).

- **One family and weight.** Interactive controls render inline SVGs from one consistent icon helper at `1.5px` stroke, even pixel square boxes (`14px` and `16px` UI icons), `flex: none` to prevent flex squeezing, and opaque `--lab-icon` / `--lab-icon-faint` tokens (`opacity` on `<svg>`, never duotone paths).
- **Small glyphs.** Marks at `14px` and smaller or inside tinted tiles use solid/filled paths so strokes never go wiry (`craft.md`).
- **Zero emojis or invented marks.** Emojis (`📱`, `🔍`, `⚡`, etc.) are permitted only inside real user content, never as interactive button or tab icons. Named controls use text wordmarks or real product icons rather than fabricated monograms.

## Inner device pixel and frame geometry (`INV-SSG-GEOM`)

Upstream `tools/stageshow/kit/Window` and `Phone` components are static or scripted illustrations with fixed aspect assumptions. Live viewport emulation on `/responsive-lab.html` enforces a stricter geometry contract.

- **Exact `1:1` inner layout pixels.** `.stage-screen-slot` uses `box-sizing: content-box` sized to exact `targetW x targetH` CSS pixels so `#mission-control-iframe.clientWidth === targetW` and `clientHeight === targetH`.
- **Bezels outside the screen box.** Hardware frames (`phone-ios`, `phone-android`, `tablet`, `browser-window`, `hairline-ruler`, `unframed`) wrap strictly outside `.stage-screen-slot`. Outer `.stage-scale-rig` scales `(targetW + chromeInsets.x, targetH + chromeInsets.y)` proportionally so scaled bezels never steal `38px` from iframe content or clip at viewport edges.
- **Safe-area overlays and `Actual (1:1)` panning.** Safe-area guides default to off and carry `pointer-events: none` so inner clicks stay unobstructed. Under `Actual (1:1)` mode, `.stage-well` centers overflowing frames safely via `margin: auto` so all four corners remain scrollable without flexbox center-clipping.

## Compact redesign rule (`< 600px`, `358px`)

As defined in `tools/stageshow/references/framing.md` (`Small formats and the page`) and `craft.md`, `compact` is an intentional alternate layout rather than a proportional squeeze.

- **Three explicit host tiers.** Desktop (`>= 1280px`) defaults to docked horizontal sidebar + stage; tablet (`600px` to `1279px`) stacks dock and stage vertically; compact (`< 600px`, tested down to `358px`) switches to single-column cards/drawers and a unified mobile bar with zero horizontal overflow (`documentElement.scrollWidth <= innerWidth + 1`).
- **Bidirectional control visibility.** Every visible button, link, tab, select, input, and header/nav badge must remain inside `[0, innerWidth]` (`r.left >= -1 && r.right <= innerWidth + 1`) unless housed inside an explicitly scrollable container whose own bounds fit within the viewport.

## Transferable craft versus house-style boundary

Compiled StageShow bundles built by [`tools/stageshow/build-scenes.mjs`](../../tools/stageshow/build-scenes.mjs) into `public/stageshow/` (via `preact/compat` and the local `lucide-react` SVG shim) follow StageShow illustration house style, whereas interactive operational surfaces keep authentic live data.

| Concern | Transferable craft (Workbench and host routes) | StageShow house style (`public/stageshow/` scenes) |
| --- | --- | --- |
| Copy and metrics | Exact device names, px readouts, Petri net IDs, and Bombadil run logs | `3` to `7` real strings paired with `Bar` skeleton lines (`craft.md`) |
| Framing and cropping | Unclipped clickable controls and exact `1:1` rectangular iframe bounds | Deliberate corner/edge bleed on desktop `Window` plus straddling `Phone` satellite (`framing.md`) |
| Motion and states | Instant UI state changes honoring `data-power-mode="energy-saving"` | `Act` scripted cursor loops with `StillContext` reduced-motion static posters (`motion.md`) |
| CSS isolation | Scoped tokens in `public/css/` with `@layer` awareness | Scene CSS scoped under one unique root class; `Stage` resets host typography inside `.ss-stage` |

## Verification gates

| Gate command | What it enforces |
| --- | --- |
| `npm run stageshow:check-css` | Confirms `0` class namespace collisions across StageShow examples, teaching pairs, and local scene bundles |
| `npm run stageshow:layout` | Audits single-URL box constraints, console/network errors, `scrollWidth` parity, and bidirectional control bounds (`--strict`) |
| `npm run stageshow:sweep` | Captures `24` Chromium snapshots across `6` host routes at `1440px`, `820px`, `390px`, and `358px` against seeded ephemeral storage |
| `npm run stageshow:film` | Runs frame-by-frame motion, framing, clipping, and poster rehearsal (`--still --gate` and motion sheets defaulting to `stageshow-output/film.png`) |
| `npm run stageshow:jumps` | Checks first-render stability and jump regressions on StageShow scenes |
