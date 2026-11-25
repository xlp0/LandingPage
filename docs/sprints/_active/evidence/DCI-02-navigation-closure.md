# DCI-02 Navigation Closure Evidence

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-DCI-02` (`PR-DCI-02`) |
| Date | `2026-11-26` (`+08:00` local) |
| Source of Truth | [`../SPRINT-DCI-02-navigation-closure.md`](../SPRINT-DCI-02-navigation-closure.md) |

## Delivered Changes

1. **Structural Nav Rule (`scripts/check-net.mjs`)**: Added `page-place-without-link` check enforcing inbound and outbound `link` or `redirect` Transitions for every `kind: 'page'` Place unless `terminalReason` or an active `exception` is declared. Added four unit cases in [`tests/unit/check-net.test.mjs`](../../../../tests/unit/check-net.test.mjs).
2. **Workbench Net Transitions (`src/net/workbench-net.yaml`)**: Declared `11` link Transitions connecting `/index.html?noredirect=1`, `/responsive-lab.html`, `/sprint-registry.html`, and `/fiber-inspector.html` plus `t_link_inspector_to_conformance` (`38` Places, `96` Transitions), and declared `terminalReason` on `p_page_fiber_conformance`.
3. **Zero-Script Nav Component (`src/components/WorkbenchNav.astro`)**: Built static `WorkbenchNav.astro` (`inline` and `menu` variants) with compile-time frontmatter parity verification against `workbench-net.yaml` and literal `data-testid` selectors (`0 B` `_astro/` script added). Mounted across [`src/pages/sprint-registry.astro`](../../../../src/pages/sprint-registry.astro), [`src/pages/fiber-inspector.astro`](../../../../src/pages/fiber-inspector.astro), [`src/pages/responsive-lab.astro`](../../../../src/pages/responsive-lab.astro), and [`src/pages/index.astro`](../../../../src/pages/index.astro).
4. **Tests, Explorer, Generated Docs, and Baselines**: Updated `expectedSameOriginLinks` in [`tests/fixtures/test-config.js`](../../../../tests/fixtures/test-config.js), added nav exclusions in Bombadil explorers (`workbench`, `lab-smoke`, `page-load`) and [`tests/bombadil/scope.json`](../../../../tests/bombadil/scope.json), regenerated [`tests/bombadil/generated/workbench-net.ts`](../../../../tests/bombadil/generated/workbench-net.ts) and [`../../../01-architecture/workbench-net.md`](../../../01-architecture/workbench-net.md), updated [`../../../01-architecture/astro-host-and-islands.md`](../../../01-architecture/astro-host-and-islands.md), re-captured layout baselines for `index`, `responsive-lab`, and `fiber-inspector`, and added [`tests/features/workbench-nav.spec.js`](../../../../tests/features/workbench-nav.spec.js).

## `INV-DCI-05` Diff Invariant

- Added no files under `src/islands/`.
- Added no `fetch(` calls.
- Added no entries to `package.json`.

## Verification Summary (`DoD-DCI-02-01..05`)

- `npx playwright test tests/features/workbench-nav.spec.js --project=features` -> `13 passed` (`8.7s`, all `11` Transitions verified in `window.__netReport`, keyboard Enter, `358px` Lab menu)
- `node --test tests/unit/check-net.test.mjs && npm run check:net` -> `15/15` unit tests pass; net check `PASS` (`38` Places, `96` Transitions)
- `npm run check:bombadil-nets && npm run docs:check && npm run build && node tests/performance/place-bytes.mjs --enforce-zero-island-places` -> PASS (`violations=0`)
- `npm run stageshow:sweep -- --strict` -> `snapshots=20 findings=0 errors=0 clipped=0 overflows=0`
- Full `npm run test:smoke`, `npm run test:features`, `npm run test:unit`, `npm run stageshow:check-css`, `node scripts/check-package-source-parity.mjs`, `npm run check:explorable-gui`, and `npm run check:playwright-discovery` executed for `DoD-DCI-02-04` and `DoD-DCI-02-05`.
