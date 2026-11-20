# Program SSG: StageShow Craft, Bombadil Dashboard Handles, and Coherent Layout (Graduated)

> **Program SSG Graduated (2026-11-20).** All nine sprints (`SPRINT-SSG-00` through `SPRINT-SSG-08`, with Operator Scope Flags `Flag 1` portal showcase and `Flag 2` `BombadilDashboardIsland` both enabled) are completed, verified, and sealed into `docs/sprints/programs/ssg/` with explicit operator graduation approval recorded in `DECISIONS.tsv` on `2026-11-20`.

| Field | Value |
| --- | --- |
| Audience | Scrum masters, BMAD role owners, developers, UX designers, QA engineers, and operators |
| BMAD Owner | Product Manager (John) with UX Designer (Sally), Architect (Winston), Developer (Amelia), TEA, and Tech Writer |
| Source of Truth | [`./ssg-plan.md`](./ssg-plan.md), [`./ssg-local-backlog.md`](./ssg-local-backlog.md), [`../../_active/DECISIONS.tsv`](../../_active/DECISIONS.tsv), [`./evidence/SSG-pre-program-spike.md`](./evidence/SSG-pre-program-spike.md), [`./evidence/SSG-egm-review.md`](./evidence/SSG-egm-review.md), and [`./evidence/SSG-08-graduation.md`](./evidence/SSG-08-graduation.md) |
| Status | **Graduated (`2026-11-20`)** |
| Consensus Kernel | `clm-kernel@0.0.24` |
| Guides | [StageShow Design Contract](../../../06-components/STAGESHOW_DESIGN_CONTRACT.md) and [Bombadil Property Testing Guide](../../../08-testing/BOMBADIL_PROPERTY_TESTING.md) |

## Program summary

Program SSG installed StageShow `1.1.1` (`tools/stageshow/` and `.agents/skills/stageshow/`), modeled Responsive UI Lab and all LandingPage host pages after StageShow device/workbench craft, and turned LandingPage into an interactive Bombadil property-testing dashboard:

- Installed StageShow `1.1.1` with `postcss`, excluded `public/stageshow/` from npm tarballs, wired `UPSTREAM.json` SHA-256 verification and `--no-sandbox` container forwarding, built `tools/stageshow/build-scenes.mjs` (`preact/compat`) + the `lucide-react` SVG shim, hardened `scripts/stageshow/run.mjs` (`check-css`, `layout --strict`, `sweep --strict`, `film --gate`, `jumps --strict`), and codified [`STAGESHOW_DESIGN_CONTRACT.md`](../../../06-components/STAGESHOW_DESIGN_CONTRACT.md).
- Subtracted duplicate CSS tokens/rules and duplicate conformance listeners across `tokens.css`, `semantic-tokens.css`, `responsive-lab.css`, `mcard-manager.css`, and non-Lab host routes (`index.astro`, `sprint-registry.astro`, `fiber-inspector.astro`, `app.astro`), eliminating narrow/mobile clip and overflow while keeping `fiber-conformance.astro` untouched.
- Unified 2D viewport geometry (`js/harness/viewport-geometry.js`) and reconciled `12` built-in presets (`js/device-registry.js`), enforced closed `responsive_test_run:v1` persistence projections (`interrupted-capture:v1` quarantine and memoized conformance fetches), and placed `6` parametric `data-frame-style` hardware bezels strictly outside exact `1:1` `.stage-screen-slot` pixels inside StageShow's 3-slot stage (`.stage-toolbar`, `.stage-well`, `.stage-transport`).
- Built subprocess-isolated Bombadil runner APIs (`server/bombadil-runner-service.mjs`, `/api/test-runs/bombadil/*` REST + `fetch` SSE, Triad MCard handle schemas `urn:mcard:bombadil:*`, `js/harness/bombadil-client.js`, `window.__lab.bombadil`), modeled `40` Places and `90` Transitions in `src/net/workbench-net.yaml`, mounted `BombadilDashboardIsland` (`8th` Astro island, `client:visible`) inside a 4-mode StageShow workbench shell (`Explore | Guided | Bombadil | Verify`) with local WOFF2 fonts, `js/ui/icons.js`, and shared `PresentationController`.
- Shipped unified desktop (`>= 1280px`), tablet (`600..1279px`), and compact (`< 600px`, tested at `358px`) responsive tiers, compiled and rehearsed the Shadow DOM `workbench-bombadil-pair` portal showcase (`35,331 B` gzipped embed on host, `0` Astro islands) on `index.astro?noredirect=1`, and wired StageShow checks into local Docker `bombadil-gate` and `scripts/bombadil/nightly.sh`.

## Sprint specifications (`SSG-00` .. `SSG-08`)

| Order | Sprint | Goal | Evidence | Specification |
| ---: | --- | --- | --- | --- |
| 0 | Spike & EGM | Measure StageShow `1.1.1` baseline (`24` snapshots) and run two-round EGM review audits. | [`SSG-pre-program-spike.md`](./evidence/SSG-pre-program-spike.md), [`SSG-egm-review.md`](./evidence/SSG-egm-review.md) | [Master Execution Plan](./ssg-plan.md) |
| 1 | `SPRINT-SSG-00` | Complete StageShow `1.1.1` install, `lucide-react` shim, `postcss`, `run.mjs` JSON portal seed and strict bounds, scene bundler, npm pack exclusion, and design contract. | [`SSG-00-stageshow-gate.md`](./evidence/SSG-00-stageshow-gate.md) | [StageShow installation and layout gate](./SPRINT-SSG-00-stageshow-installation-and-layout-gate.md) |
| 2 | `SPRINT-SSG-01` | Subtract duplicate CSS/tokens, adopt StageShow surface scale, deduplicate conformance listeners, and eliminate non-Lab layout clips and overflows. | [`SSG-01-subtraction.md`](./evidence/SSG-01-subtraction.md) | [CSS and chrome subtraction](./SPRINT-SSG-01-css-and-chrome-subtraction.md) |
| 3 | `SPRINT-SSG-02` | Unify device catalogs, orientation math, memoized conformance fetches, `Full`/`Custom` Persistence Projection, `interrupted-capture:v1`, and `window.__lab.geometry`. | [`SSG-02-viewport-domain.md`](./evidence/SSG-02-viewport-domain.md) | [Viewport and device domain model](./SPRINT-SSG-02-viewport-and-device-domain-model.md) |
| 4 | `SPRINT-SSG-03` | Build StageShow playground `.stage-toolbar`/`.stage-well`/`.stage-transport` layout and `6` parametric bezels around `1:1` inner pixels + 4-corner `1:1` pan. | [`SSG-03-stage-frames.md`](./evidence/SSG-03-stage-frames.md) | [StageShow device frames and stage geometry](./SPRINT-SSG-03-stageshow-device-frames-and-stage.md) |
| 5 | `SPRINT-SSG-04` | Build Bombadil runner service spawning `scripts/bombadil/run.mjs`, `/api/test-runs/bombadil/*` REST + `fetch` SSE, Triad handle schemas, `window.__lab.bombadil`, and CustomEvent handles. | [`SSG-04-bombadil-handles.md`](./evidence/SSG-04-bombadil-handles.md) | [Bombadil handles and runner API](./SPRINT-SSG-04-bombadil-handles-and-runner-api.md) |
| 6 | `SPRINT-SSG-05` | Restyle workbench shell with StageShow rules and `js/ui/icons.js`, add thin `BombadilDashboardIsland` (`8th` island) + `4` modes, and share `PresentationController`. | [`SSG-05-stageshow-dashboard.md`](./evidence/SSG-05-stageshow-dashboard.md) | [StageShow workbench shell and Bombadil dashboard](./SPRINT-SSG-05-stageshow-workbench-and-bombadil-dashboard.md) |
| 7 | `SPRINT-SSG-06` | Ship `desktop >= 1280px`, `tablet 600..1279px`, and `compact < 600px` (`358px`) tiers plus multi-route bidirectional Playwright suite and strict sweep. | [`SSG-06-host-tiers.md`](./evidence/SSG-06-host-tiers.md) | [Host responsive tiers and compact layouts](./SPRINT-SSG-06-host-responsive-tiers-and-compact-layouts.md) |
| 8 | `SPRINT-SSG-07` | Compile `1` `preact/compat` StageShow `Device pair` portal showcase illustrating Bombadil handles on `index.astro?noredirect=1`, rehearsed via `film --gate`. | [`SSG-07-portal-showcase.md`](./evidence/SSG-07-portal-showcase.md) | [Portal StageShow showcase and rehearsal](./SPRINT-SSG-07-portal-stageshow-showcase-and-rehearsal.md) |
| 9 | `SPRINT-SSG-08` | Wire Docker StageShow gates, sync 13 maintained docs, verify full host + container battery, record graduation receipt, and archive to `docs/sprints/programs/ssg/`. | [`SSG-08-graduation.md`](./evidence/SSG-08-graduation.md) | [Verification baselines, Docker gate, and graduation](./SPRINT-SSG-08-verification-baselines-and-graduation.md) |

## Graduation verification summary (2026-11-20)

| Check or Artifact | Outcome | Link |
| --- | --- | --- |
| Local Docker `bombadil-gate` | Exit `0`: `build:astro PASS`, `build-scenes.mjs --check ok`, `stageshow:check-css 0` clashes (`85` CSS files, `4` explicit bundles), `check:net PASS (40/90)`, `test:unit 299/299` (`0` skipped), `stageshow:sweep --strict snapshots=24` (`0/0/0/0` in Linux Chromium) | [`./evidence/SSG-08-graduation.md`](./evidence/SSG-08-graduation.md) |
| Host static, parity, net, and docs gates | `check-package-source-parity.mjs` (`pairs=4 uiCalls=22`), `check:net PASS (40 places, 90 transitions, sessionPInvariant=true)`, `check:explorable-gui PASS`, `check:bombadil-nets PASS`, `check:playwright-discovery` (`57` unique specs), `docs:check PASS` | [`./evidence/SSG-08-graduation.md`](./evidence/SSG-08-graduation.md) |
| Host build, unit, StageShow sweep, canary, and Playwright | `npm run build` PASS, `test:unit` `299/299` (`0` skipped), `stageshow:sweep --strict` `24/24` (`0/0/0/0`), `canary.mjs` `5/5` (`need 4`), `test:smoke` `30`, `test:components` `18`, `test:features` `634 passed / 17 skipped / 0 failed`, `test:smoke:cross-browser` `60` (`firefox` + `webkit`) | [`./evidence/SSG-08-graduation.md`](./evidence/SSG-08-graduation.md) |
| Operator sign-off & follow-up backlog | Approved on `2026-11-20` (`DECISIONS.tsv` phase `SSG-graduation`); post-SSG local notes kept in `ssg-local-backlog.md` | [`../../_active/DECISIONS.tsv`](../../_active/DECISIONS.tsv), [`./ssg-local-backlog.md`](./ssg-local-backlog.md) |

## Related archives

- **Program BPV**: [docs/sprints/programs/bpv/INDEX.md](../bpv/INDEX.md) (Graduated `2026-11-18`)
- **Program GQC**: [docs/sprints/programs/gqc/INDEX.md](../gqc/INDEX.md) (Graduated `2026-11-18`)
- **Program ERB**: [docs/sprints/08-testing/INDEX.md](../../08-testing/INDEX.md) (Graduated `2026-10-21`)
- **Program SMO**: [docs/sprints/01-architecture/INDEX.md](../../01-architecture/INDEX.md) (Graduated `2026-10-21`)
