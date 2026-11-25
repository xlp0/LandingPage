# DCI-01 Sprint Registry Estate Map Evidence

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-DCI-01` (`PR-DCI-01A` and `PR-DCI-01B`) |
| Date | `2026-11-26` (`+08:00` local) |
| Source of Truth | [`../SPRINT-DCI-01-sprint-registry-estate-map.md`](../SPRINT-DCI-01-sprint-registry-estate-map.md) |

## Delivered Changes

1. **DOM-Only Safe Rendering (`PR-DCI-01A`)**: Removed both `innerHTML` writes in [`src/pages/sprint-registry.astro`](../../../../src/pages/sprint-registry.astro) (`replaceChildren()`, `document.createElement`, and `.textContent`). Verified with mocked `<pkc-card>` title injection fixture yielding literal text and zero `<pkc-card>` elements.
2. **Pure Data Helpers (`PR-DCI-01B`)**: Created [`js/ui/registry-view.js`](../../../../js/ui/registry-view.js) (`programOf`, `matchesQuery`, `filterSprints`, `groupSprints`, `parseRegistryUrlState`, `mergeRegistryUrlState`) with [`tests/unit/registry-view.test.mjs`](../../../../tests/unit/registry-view.test.mjs).
3. **Program Grouping, Filtering, Legend, and Deep Links**: Added `#registry-filters` (`#registry-filter-state`, `#registry-filter-program`, `#registry-filter-query`), `#registry-result`, `#registry-filters-clear`, state legend, sorted `section[data-testid="program-<code>"]` headings with registry totals, hash deep links `#sprint-<code>` (`load` + `hashchange`) that reset conflicting filters on hidden targets and focus `<a data-testid="sprint-link-<code>">`, `replaceState` URL persistence, and zero extra `/api/clm/registry` fetches.
4. **Stored Interface State Documentation**: Added URL query parameter row (`state`, `program`, `q`) to [`../../../01-architecture/astro-host-and-islands.md`](../../../01-architecture/astro-host-and-islands.md).

## `INV-DCI-05` Diff Invariant

- Added no files under `src/islands/`.
- Added no `fetch(` calls.
- Added no entries to `package.json`.

## Verification Summary (`DoD-DCI-01-01..05`)

- `! grep -n 'innerHTML' src/pages/sprint-registry.astro && npx playwright test tests/features/sprint-registry.spec.js --project=features` -> PASS
- `node --test tests/unit/registry-view.test.mjs` -> `6` passed, `0` failed
- `grep -q 'registry-filter-query' src/pages/sprint-registry.astro && npm run test:features` -> PASS
- `npm run build && node tests/performance/place-bytes.mjs --enforce-zero-island-places && npm run stageshow:sweep -- --strict` -> PASS (`violations=0`, `snapshots=20 findings=0 errors=0 clipped=0 overflows=0`)
- Core gates (`stageshow:check-css`, `check-package-source-parity.mjs`, `check:explorable-gui`, `check:net`, `check:bombadil-nets`, `check:playwright-discovery`, `docs:check`, `test:unit`, `test:smoke`) -> PASS
