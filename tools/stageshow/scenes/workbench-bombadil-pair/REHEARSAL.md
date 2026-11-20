# Rehearsal: workbench-bombadil-pair

Gold: `examples/device-pair` (`Device pair` at wide `>= 480px`, bottom-bleed compact window at `390px` instead of `Corner bleed`, paired with GovTech workbench `1280 x 832` desktop and `393 x 852` phone metrics from `BUILTIN_DEVICES`, reactive dark/high-contrast `lab:presentation-change` listener, and an explicit Shadow DOM CSS contract without `data-cursor`).

Beats: 1 `trigger` click transitions the Bombadil run badge (`Idle` to `Running`) and sweeps the verification progress bar across the desktop pane; 2 `transition` flips the mobile LockScreen notification (`SPA Overview / p_spa_overview` to `SPA Verified / p_spa_details`) and swaps the compact place pill; 3 `verified` completes the progress bar to 100% green and switches the status badge to `Verified`; 4 `ready` resets state back to `Idle` and `p_spa_overview`; loop duration 11.6s.

Captured: wide `720x340`, compact `390px` (`358x320`), dark look, reduced-motion still (`--reduced --still`), and script state sheet (`--states`).

Gate: `rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)`

Film results by mode.

- Wide (`--gate`) printed `rehearsal passed` and logged `manual: same-box content change` on `ss-notification__title` (`SPA Overview` to `SPA Verified`) and `ss-notification__body` (`p_spa_overview` to `p_spa_details`) at `3.48s [transition]`. Both are intentional single-line swaps inside a fixed-height `LockScreen` notification card verified across `rehearsal-pair-wide.png` and `rehearsal-pair-states.png`.
- Compact 390px (`--width 390 --gate`) printed `rehearsal passed` with zero jump, zero lopsided, and zero clipping findings after wrapping the compact `Badge` label in `<States align="center" states={{ p_spa_overview, p_spa_details }} />`.
- Dark (`--dark --gate`) printed `rehearsal passed` with readable text/border contrast across `ss-stage[data-theme="dark"]` and `ss-stage[data-look="high-contrast"]`.
- Reduced still (`--reduced --still --gate`) exited `0` (`1 frames, largest gap 0.0ms (complete)`), showing the settled `Verified` / `p_spa_details` poster frame.
- States (`--states --gate`) printed `rehearsal passed` across `open`, `trigger`, `transition`, `verified`, `ready`, and `end 20.01s`.
- Strict motion sweep (`stageshow:jumps --strict`) exited `0` (`1202 frames, 20.01s, largest gap 20.3ms (complete)`, `jumps: no-issues-detected`).

Review findings and design verification.

- Framing and bleeds keep the desktop window bleeding off the bottom edge and the satellite `Phone` bleeding off the bottom edge on wide (`28px` gutter top/left). Compact layout drops the satellite `Phone` and bleeds the focused workbench window off the bottom edge with the place badge pinned beside `393 x 852`.
- Density and typography use real labels on workbench status, progress, CTA (`Trigger handle`), and mobile notification, keeping neutral bars confined to sidebar and list scaffolding with zero sub-10px text warnings.
- Embed isolation mounts the scene inside an open ShadowRoot (`shadowRoot`) linked only to `scene.css`, using `cursors-slim.tsx` and compile-time `esbuild` `define` constants (`35,331 B` gzipped, under the `35,840 B` ceiling).

Assumptions:
- Host portal `index.astro` locks `#portal-stageshow-showcase` to `340px` height (`>= 600px`) and `320px` height (`< 600px`) so swapping between the SSR static poster and live Shadow DOM mount introduces zero CLS.

Unresolved:
- None.

Not checked:
- Standalone macOS Chromium runs of continuous `film.mjs --gate` exit `2` (`inconclusive`) because synchronous per-frame `page.screenshot()` stalls rAF past `27ms`; `--reduced --still --gate` exits `0`, `stageshow:jumps --strict` without screenshots exits `0` (`complete`), and visual frame-by-frame inspection of all five contact sheets confirmed smooth transitions.
