# SPRINT-DCI-01 Sprint registry estate map

## Metadata

| Field | Value |
| --- | --- |
| Sprint ID | `SPRINT-DCI-01` |
| Source of Truth | [`./dci-plan.md`](./dci-plan.md) and [`./INDEX.md`](./INDEX.md) |
| Handle | `urn:pcard:sprint:SPRINT-DCI-01` |
| Status | `DONE` |
| Depends on | `PR-DCI-01A` depends on nothing. `PR-DCI-01B` depends on `PR-DCI-01A` and on `SPRINT-DCI-00` |
| Unblocks | `SPRINT-DCI-02` |
| Execution unit | `PR-DCI-01A`, then `PR-DCI-01B` |
| Decision Ref | `DCI-D05`, `DCI-D06` |
| Poteto playbook | `feature` with `principle-experience-first`, `principle-boundary-discipline`, and `principle-sequence-verifiable-units` |
| BMAD roles | Product Manager, UX Designer, Developer, TEA, Tech Writer |
| Effort | `2 days (guess)` |

## Outcome

The sprint registry page answers two questions that the estate asks of it. Which programs exist, and what state each sprint is in. A coordinator can find a sprint by a word, and can send a colleague a link to one sprint or to one filtered view.

Today the page draws `335` cards in one flat grid with no control except the theme buttons (measured). The registry holds `31` program codes (measured).

The page also builds each card by writing registry text into `innerHTML`. No title contains `<` today, and the `170` titles that contain `&` render as plain text (measured). So nothing looks wrong yet. One future title with a tag in it would become markup. `PR-DCI-01A` closes that path. It is small, it touches a file that no other change set touches, and it can merge before the rest of the program is approved.

## Work sequence

`PR-DCI-01A` holds steps 1 and 2. `PR-DCI-01B` holds steps 3 to 10.

1. **Render with DOM calls.** In the inline script of `src/pages/sprint-registry.astro`, replace the card template with `document.createElement` and `textContent`. Remove both `innerHTML` writes. Clear the grid with `replaceChildren()`.
2. **Keep the hooks that tests read.** Keep `#sprint-grid`, `#registry-status` with its `data-count` of loaded sprints and its text `Loaded N sprints from /api/clm/registry`, the class `sprint-card`, the attributes `data-state` and `data-code` on each card, and a `.state-badge` element with the class `badge-<state>`. Add one case to `tests/features/sprint-registry.spec.js`. It stubs `**/api/clm/registry` with `page.route` and one sprint `{ code: 'FIX-01', title: 'Host a <pkc-card> island', handle: 'urn:pcard:sprint:FIX-01', card_type: 'pcard', dod: { state: 'sealed', total: 3, vcard_refs: [] } }`. It asserts that the card shows that exact title and that `page.locator('pkc-card')` has count `0`.
3. **Name the data shapes.** Create `js/ui/registry-view.js` with no DOM access.
   - `programOf(code)` returns the first capture of `/^00-PROGRAM-CHARTER-EPIC-([A-Z]+)/` when that matches. For example, `00-PROGRAM-CHARTER-EPIC-ORC-II` gives `ORC`. In any other case it returns the first capture of `/^([A-Z]+)-/`. A code that matches neither gives `OTHER`. On the current registry no code gives `OTHER`.
   - `matchesQuery(sprint, query)` returns `true` when the lower-cased query is a substring of the lower-cased code, title, or any `dod.vcard_refs` item. An empty query matches every sprint.
   - `filterSprints(sprints, { state, program, query })` returns the matching sprints in registry order. An absent field does not filter.
   - `groupSprints(sprints)` returns `[{ program, sprints, sealed, specification }]` sorted by program code.
   - `parseRegistryUrlState(search, { programs })` reads three parameters: `state`, `program`, and `q`. It drops a `state` that is neither `sealed` nor `specification`, and a `program` that is not in `programs`.
   - `mergeRegistryUrlState(search, state)` builds a `URLSearchParams` from `search`, deletes the three parameters, sets each field of `state` that is not empty, and returns `'?' + params.toString()`, or an empty string when no parameter remains.
4. **Group the cards.** Inside `#sprint-grid`, render one `<section data-testid="program-<code>">` per program. Each has `<h2 id="program-<code>">` with the code and three counts: total, sealed, and specification. The counts are registry totals and do not change with a filter.
5. **Make each sprint a link target.** Give each card `id="sprint-<code>"` and one link `<a href="#sprint-<code>" data-testid="sprint-link-<code>">` around the sprint code. On load and on `hashchange`, find the card for the hash. When a filter hides it, reset all three filters and write the URL. Then scroll the card into view and move focus to its link.
6. **Add three filters.** Place them in a `<form id="registry-filters" data-testid="registry-filters">` under the page title. The form's `submit` listener calls `preventDefault()`.

   | Control | Element | Values |
   | --- | --- | --- |
   | State | `<select id="registry-filter-state" data-testid="registry-filter-state">` | All, `sealed`, `specification` |
   | Program | `<select id="registry-filter-program" data-testid="registry-filter-program">` | All, then each program code in the registry |
   | Search | `<input type="search" id="registry-filter-query" data-testid="registry-filter-query">` | Free text |

7. **Filter by hiding.** A filter sets `hidden` on each card that does not match and on each program section with no visible card. No card leaves the DOM. The search field waits `300 ms` after the last key. After a change the page calls `history.replaceState(history.state, '', location.pathname + merged + location.hash)`, where `merged` comes from `mergeRegistryUrlState`, and only when `merged` differs from the current query. The page loads the registry once and sends no further request.
8. **Report the result.** Leave `#registry-status` as it is. Add `<p id="registry-result" data-testid="registry-result" role="status"></p>` under the filters. Set its text to `Showing N of M sprints in P programs`, where `P` is the number of sections with a visible card, and set its attribute `data-shown` to `N`. Add a static button `<button type="button" id="registry-filters-clear" data-testid="registry-filters-clear" hidden>Clear filters</button>`. On an empty result the text reads `No sprint matches these filters` and the button loses `hidden`.
9. **Explain the two states.** Add a two-line legend under the filters.
   - The `sealed` line reads `Sealed. A sprint manifest whose Definition of done conditions are sealed as a contract. Sealed does not mean finished.`
   - The `specification` line reads `Specification. A specification card, such as a program charter. It carries no Definition of done conditions.`

   Both lines are grounded in the current projection (measured). All `293` sealed entries have the archetype `ClmTriadManifest` and at least `3` conditions. All `42` specification entries have the archetype `specification_mcard` and `0` conditions. `PKC-06` is `sealed` while `DoD-PKC-06-03` is open in its parent sprint file.
10. **Update the stored-state table.** Add one row for the three registry parameters to the table in `docs/01-architecture/astro-host-and-islands.md`.

## Files

`PR-DCI-01A`:

- Edit `src/pages/sprint-registry.astro` and `tests/features/sprint-registry.spec.js`.

`PR-DCI-01B`:

- Create `js/ui/registry-view.js`.
- Create `tests/unit/registry-view.test.mjs`.
- Create `docs/sprints/_active/evidence/DCI-01-registry-estate-map.md`.
- Edit `src/pages/sprint-registry.astro` and `tests/features/sprint-registry.spec.js`.
- Edit `docs/01-architecture/astro-host-and-islands.md`.
- Edit `docs/sprints/_active/DECISIONS.tsv`, `docs/sprints/_active/INDEX.md`, `docs/sprints/_active/dci-plan.md`, and this sprint file, for the status and the DoD ticks.

## BMAD responsibilities

### Product Manager

- Sign off on the wording of the two legend lines with the coordinator who owns the registry projection.

### UX Designer

- Sign off on the filter row and the group headings at `1440px` and at `358px`.

### Developer

- Verify that the page script holds no `innerHTML` write and that every registry string reaches the DOM through `textContent`.

### TEA

- Verify that the unit test uses a small hand-written registry and derives each expected result from the rules in step 3.

### Tech Writer

- Add the three URL parameters to the registry entry in `docs/01-architecture/astro-host-and-islands.md`.

## Acceptance criteria

- A stubbed title that contains `<pkc-card>` appears as that exact text, and the page gains no `pkc-card` element.
- The page shows one section per program code. On the registry of `2026-11-24` that is `31`.
- Selecting `sealed` hides every specification card, and `data-shown` on `registry-result` falls to the sealed count.
- Typing `landingpage` in the search field shows the sprints that mention it in a title or in a DoD reference, and `PKC-06` is among them. On the registry of `2026-11-24` that is `26`.
- Opening `/sprint-registry.html#sprint-PKC-06` scrolls to that card and focuses its link. With `?state=specification` in the URL it first resets the filters.
- Opening `/sprint-registry.html?program=PKC&state=sealed` shows the same filtered view after a reload. `?state=foo` shows every sprint.
- Pressing Enter in the search field does not reload the page.
- Every filter and every sprint link is reachable with Tab.
- The network log shows one request to `/api/clm/registry` for any number of filter changes.

## Test design

- `tests/unit/registry-view.test.mjs` covers both `programOf` patterns, the `OTHER` case, `matchesQuery` on a code, a title, and a reference, each filter alone, all three together, group counts, an invalid `state`, an unknown `program`, and a merge that keeps a foreign parameter.
- `tests/features/sprint-registry.spec.js` gains one case per acceptance criterion. Its four existing cases stay unchanged.
- Apart from the stubbed case, the spec reads the expected counts from the live registry through `js/ui/registry-view.js`, so a new projection does not break it.
- `tests/smoke/root-sprint-registry.spec.js` stays green with no edit. Its link collector skips links that hold a hash only.

## Non-goals

- A change to `routes/clm.js` or to the registry response.
- A separate filter for sprints that mention LandingPage. Search covers it.
- Showing this repository's own programs. They are not in the coordinator projection.
- Links to sprint documents. They live in the parent repository, and this repository may not reach into it.
- Charts, timelines, a dependency graph, and rendering backticks as code.
- A layout-freeze baseline. `tests/features/layout-freeze.spec.js` does not know this page. The StageShow sweep covers it.

## Definition of done

- [x] **DoD-DCI-01-01.** The page script writes no registry text as markup, and a title with a tag in it shows as text. Verified by `! grep -n 'innerHTML' src/pages/sprint-registry.astro && npx playwright test tests/features/sprint-registry.spec.js --project=features`.
- [x] **DoD-DCI-01-02.** Grouping, filtering, and URL state follow the stated rules on a hand-written registry. Verified by `node --test tests/unit/registry-view.test.mjs`.
- [x] **DoD-DCI-01-03.** The page groups sprints by program, filters them, links to one sprint, and keeps the view across a reload, with every feature spec green. Verified by `grep -q 'registry-filter-query' src/pages/sprint-registry.astro && npm run test:features`.
- [x] **DoD-DCI-01-04.** The page ships no `_astro/` script, and its layout holds at four widths. Verified by `npm run build && node tests/performance/place-bytes.mjs --enforce-zero-island-places && npm run stageshow:sweep -- --strict`.
- [x] **DoD-DCI-01-05.** Evidence and the completion row are recorded with the remaining core gates green. Verified by `test -s docs/sprints/_active/evidence/DCI-01-registry-estate-map.md && grep -qE $'\tDCI-01-complete\t' docs/sprints/_active/DECISIONS.tsv && npm run stageshow:check-css && node scripts/check-package-source-parity.mjs && npm run check:explorable-gui && npm run check:net && npm run check:bombadil-nets && npm run check:playwright-discovery && npm run docs:check && npm run test:unit && npm run test:smoke`.
