# Sprint GQC-02B: Astro host and island shell

## Metadata

- Sprint ID: `SPRINT-GQC-02B`
- Handle: `urn:pcard:sprint:SPRINT-GQC-02B`
- Status: `COMPLETED`
- Depends on: `SPRINT-GQC-02A`
- Unblocks: `SPRINT-GQC-03`
- Execution units: `PR-GQC-02B.1` (host and wrapped Places), then `PR-GQC-02B.2` (Responsive Lab islands)
- Poteto playbook: `architect`, `principle-sequence-verifiable-units`, `principle-migrate-callers-then-delete-legacy-apis`, and `principle-prove-it-works`
- BMAD roles: Architect, Dev, TEA, UX Designer, Product Manager, Tech Writer

## Outcome

Run LandingPage on Astro. Every workbench Place in the GQC-02A net is served by an Astro page. Pages ship static HTML by default, and interactive parts hydrate as declared Preact islands. The existing Express server keeps WebSockets, the current APIs, and the CORS and CSP middleware, and it mounts the Astro request handler for pages. A build-time check proves that the Astro routes and the links in the built HTML match the net.

This is a host migration, not a redesign. The user-visible behavior that GQC-02 characterized must stay the same. The guided SPA workflow is GQC-04 work.

Use the [MCard_TDD design contract](./INDEX.md#mcard_tdd-design-contract). The Responsive Lab stays the workbench. The target iframe stays a target. Astro does not render or bundle target-app code.

## Architecture

| Concern | Decision | Source |
| --- | --- | --- |
| Framework | Astro, pinned to one exact version in `package.json` when this sprint starts. | User direction, 2026-10-27 |
| Island runtime | `@astrojs/preact` with `preact`. Islands are thin Preact wrappers around the existing vanilla modules in `js/harness/` and `js/`. | User direction, 2026-10-27 |
| Non-interactive pages | Plain `.astro` pages and layouts. A page-level `<script>` is allowed only for page-scoped behavior that no island owns. | Astro default |
| Server topology | `@astrojs/node` in `middleware` mode. `ws-server.js` keeps its Express app, WebSocket server, `/api/*` routers, and security middleware, and mounts the Astro `handler` after them. | User direction, 2026-10-27 |
| New server calls | New UI-reachable server functions are Astro endpoints or Astro Actions, each declared as a server-call Transition. Existing Express routes stay until a later migration has contract tests. | User direction, 2026-10-27 |
| URL shape | `build.format: 'file'` so Astro emits `/responsive-lab.html` and `/app.html`. Existing links, bookmarks, `?target=`, and `?noredirect` keep working. | Preserves INV-GQC-18 |
| Language | JavaScript with JSDoc, matching the repository. No TypeScript migration in GQC. | Subtract before adding |
| Net contract | `src/net/workbench-net.yaml` from GQC-02A. An Astro integration checks it at build time. | INV-GQC-13, INV-GQC-14 |

### Source layout

| Path | Owns |
| --- | --- |
| `astro.config.mjs` | Integrations, adapter, `build.format`, `publicDir`, dev proxy, dev headers |
| `src/pages/*.astro` | One file per workbench `page` Place. The file name matches the Place's route binding. |
| `src/layouts/WorkbenchLayout.astro` | Shared document shell, meta tags, dev service-worker guard |
| `src/islands/*.jsx` | Preact islands. One island per independently interactive region. |
| `src/net/workbench-net.yaml` | The workbench Place-Transition net from GQC-02A |
| `src/integrations/net-parity.mjs` | Build-time net parity check |

The existing top-level `components/` directory holds CLM HTML fragments. It is not the Astro component directory and does not move in this sprint.

### Place migration states

Each `page` Place records one migration state in its net binding:

| State | Meaning |
| --- | --- |
| `legacy-static` | Express serves the original `.html` file. |
| `astro-wrapped` | An Astro page renders the legacy markup and loads the legacy scripts unchanged. No island yet. |
| `astro-islands` | Static markup is Astro. Interactive regions are declared islands with an owner and a `client:*` directive. |

A Place never moves backward. The legacy `.html` file is deleted only after its Astro page passes the GQC-02 characterization journeys on trunk and head.

### Island rules

- Every island has a declared owner, a `client:*` directive, and a reason for that directive.
- Use `client:only="preact"` for regions that need `window`, an iframe, or layout measurement at mount, such as the viewport stage. Use `client:idle` or `client:visible` for regions the user does not need at first paint, such as the conformance panel. Use `client:load` only with a recorded reason.
- An island mounts its vanilla module in an effect and calls that module's existing cleanup on unmount. If the module has no cleanup and allocates listeners, timers, sockets, or observers, the island records the gap for GQC-03 or GQC-04. It does not invent a ceremonial `dispose()`.
- Islands do not import `clm-kernel`. The package root imports Node `crypto` at top level. Net checks and replay run in Node.
- Islands share state through the existing Lab interfaces such as `js/harness/lab-api.js` and `target-membrane.js`. Add a shared store only when two islands need the same reactive value and the existing interface cannot carry it.
- Astro's client router is not enabled in this sprint. Page switches stay full document loads, which are `link` Transitions. Enabling `client-route` Transitions needs a decision and lifecycle tests for every island that survives a swap.

## Net parity check

`src/integrations/net-parity.mjs` runs in `astro build`. It uses the route and build hooks of the pinned Astro version and the GQC-02A checker. It fails the build when:

- An Astro page route has no `page` or `view` Place binding.
- A `page` Place in state `astro-wrapped` or `astro-islands` has no Astro page.
- The built HTML of a Place contains an internal `href` that is not the trigger of a declared `link`, `redirect`, or `open-external` Transition from that Place.
- An Astro endpoint or Action has no server-call Transition binding and no `not-ui-reachable` mark.
- `npm run check:net` fails.

It reports, without failing, each declared Transition that no built page triggers. That report feeds Transition coverage.

## Run commands

| Command | Behavior |
| --- | --- |
| `npm run dev` | Runs `astro dev` and the Express API and WebSocket server together. The Astro dev server proxies `/api`, `/app-config.json`, and the WebSocket path to Express. |
| `npm run build` | Runs `astro build`, then the existing workspace package builds. |
| `npm start` | Runs `node ws-server.js`, which serves the Astro build through the middleware handler on one port. |
| Playwright `webServer` | Builds once and runs the production topology on the configured test port. GQC-01 owns the port value. This sprint changes only the server command. |

The current `build` script runs `npm run build --workspaces`. Keep that behavior inside the new `build` command or under a named `build:packages` script. Do not drop a workspace build.

## Work sequence

### PR-GQC-02B.1 Host and wrapped Places

1. Pin Astro, `@astrojs/node`, `@astrojs/preact`, and `preact` to exact versions. Record each version and its release date.
2. Add `astro.config.mjs` with the middleware adapter, `build.format: 'file'`, a dedicated `publicDir`, and the dev proxy.
3. Mount Astro in `ws-server.js` after the existing API routers and security middleware. In middleware mode, prerendered pages are written to `dist/client/` and the `handler` serves only on-demand routes, so serve `dist/client/` with a static mount and then mount the `handler`. Place both before the legacy root static mount at `ws-server.js:138`, so an Astro page wins over a same-named legacy `.html` file. `/health`, `/api/rooms`, `/api/env`, `/api/config`, and `/app-config.json` are registered later, at `ws-server.js:321-378`, so prove that the handler calls `next()` for unmatched paths. Do not add an Astro catch-all 404 page until that test passes. Keep every existing `/api/*` route, its mount order, and its response unchanged.
4. Keep the Express static mounts for `public/`, `js/`, and other legacy assets until every consumer of a path moves. Record each `/public/...` and `/js/...` URL that a page references, and record the effect of the new mount order on the `/app-config.json` shadow that GQC-03 resolves.
5. Add `WorkbenchLayout.astro`. In dev, it unregisters service workers on `localhost` and `127.0.0.1`, and the dev server sends `Cache-Control: no-store` for HTML. Do not change the production service worker in this sprint.
6. Create one Astro page per approved `page` Place in state `astro-wrapped`. Start with `index` and `responsive-lab`, then the internal pages the Product Manager approved.
7. Keep `app.html` as `astro-wrapped`. Its island decomposition follows the GQC-04 ownership map.
8. Add `net-parity.mjs` and run it in `astro build`.
9. Switch the Playwright `webServer` command to the production topology. Run every GQC-02 journey and the GQC-02A trace replay against both legacy and Astro builds.
10. Delete a legacy `.html` file only after its Astro page passes those journeys on trunk and head.

### PR-GQC-02B.2 Responsive Lab islands

1. List the Responsive Lab's interactive regions from `responsive-lab.html` and `js/harness/`: target toolbar and URL omnibar, device presets, viewport stage, recording ribbon, conformance panel, and MCard result display.
2. For each region, write a characterization test before converting it.
3. Convert each region to one Preact island that mounts the existing module. Keep the module's public interface, `window.__lab`, and `data-*` hooks the tests use.
4. Record each island's directive, owner, mount cost, and cleanup path in `evidence/GQC-02B-island-map.md`.
5. Move the `responsive-lab` Place to `astro-islands`.

## Files in the implementation PRs

PR-GQC-02B.1:

- `package.json` and `package-lock.json`
- `astro.config.mjs`
- `src/layouts/WorkbenchLayout.astro`
- `src/pages/*.astro`, one file per migrated Place
- `src/integrations/net-parity.mjs`
- `src/net/workbench-net.yaml`, migration-state bindings only
- `ws-server.js`, limited to mounting the Astro handler and removing a legacy static path only after its consumers move
- `playwright.config.js`, `webServer` command only
- Legacy root `.html` files, deleted only after parity
- `tests/unit/net-parity.test.mjs`
- `tests/features/astro-host-parity.spec.js`
- `docs/sprints/_active/evidence/GQC-02B-url-inventory.md`
- `docs/sprints/_active/DECISIONS.tsv`, appended by the coordinator

PR-GQC-02B.2:

- `src/islands/*.jsx`
- `src/pages/responsive-lab.astro`
- `js/harness/` files, limited to exposing an existing cleanup path an island needs. Do not change behavior.
- `tests/features/responsive-lab-islands.spec.js`
- `docs/sprints/_active/evidence/GQC-02B-island-map.md`

Do not edit `server/`, `routes/`, `app-config.json`, CORS or CSP rules, the capture modules' message checks, or `responsive_test_run:v1` in either PR. GQC-03 owns policy. GQC-05 owns persistence.

## BMAD responsibilities

### Architect

- Own `astro.config.mjs`, the middleware mount point, the source layout, and the island rules.
- Decide `publicDir` and the fate of the root static mounts.
- Approve every island boundary against real interactive regions, not file names.

### Dev

- Migrate one Place at a time. Keep the legacy file until parity passes.
- Wrap existing modules. Do not rewrite ERB modules as Preact components.

### TEA

- Run every GQC-02 journey and GQC-02A trace replay against legacy and Astro builds.
- Add the net parity unit tests and one failing fixture per parity rule.
- Prove island cleanup with repeated mount and unmount in the Lab.

### UX Designer

- Compare legacy and Astro screenshots for every migrated Place at the approved viewports.
- Confirm focus order and keyboard behavior did not change.

### Product Manager

- Approve the Places migrated in this sprint and the order.
- Approve any URL that cannot be preserved, with a redirect plan.

### Tech Writer

- Record the new run commands for GQC-07. Do not rewrite maintained guides in this sprint.

## Stories and acceptance criteria

### GQC-02B.1 Serve every approved Place from Astro

- [x] `npm run build` produces the Astro build and every workspace package build.
- [x] `npm start` serves pages through the Astro handler and keeps every `/api/*`, `/app-config.json`, `/health`, and WebSocket response unchanged, proven by contract tests on trunk and head.
- [x] Every approved `page` Place is `astro-wrapped` or `astro-islands`, and its URL is unchanged.
- [x] `?target=`, `?noredirect`, and the `index.html` redirect behave as on trunk.
- [x] A Place's legacy `.html` file is deleted only after its parity spec passes.
- [x] Dev mode unregisters localhost service workers and sends no-store HTML. Production service-worker behavior is unchanged.

### GQC-02B.2 Enforce net parity at build time

- [x] `astro build` fails for each parity rule, proven by one failing fixture per rule.
- [x] The built HTML of every Place contains only internal links declared as Transitions from that Place.
- [x] Every Astro endpoint or Action has a server-call binding or a `not-ui-reachable` mark.
- [x] The build report lists declared Transitions that no page triggers.

### GQC-02B.3 Hydrate the Responsive Lab as islands

- [x] Each interactive Lab region is one Preact island with an owner, directive, and directive reason.
- [x] The Lab ships no island JavaScript for regions the user has not reached when the directive is `client:visible` or `client:idle`.
- [x] Every island that wraps a module with listeners, timers, sockets, or observers calls the module's cleanup on unmount, or records the gap with an owner in GQC-03 or GQC-04.
- [x] No island imports `clm-kernel`.
- [x] All existing ERB capture, replay, device, rotation, sweep, and conformance specs pass unchanged.
- [x] `window.__lab` and the `data-*` hooks used by tests keep their names and behavior.

## Test design

| ID | Level | Scenario | Expected result |
| --- | --- | --- | --- |
| GQC-02B-UNIT-01 | Unit | Add an Astro page with no Place binding | `net-parity` fails with the route and rule. |
| GQC-02B-UNIT-02 | Unit | Add an undeclared internal link to a page | `net-parity` fails with the Place, href, and rule. |
| GQC-02B-UNIT-03 | Unit | Add an Astro endpoint with no binding | `net-parity` fails. |
| GQC-02B-INT-01 | Integration | Request every API and config route through `npm start` on trunk and head | Status, headers, and body shape match. |
| GQC-02B-E2E-01 | E2E | Run every GQC-02 journey against the Astro build | Every journey passes with its trunk visible result. |
| GQC-02B-E2E-02 | E2E | Replay GQC-02A traces recorded on the Astro build | Replay accepts each trace. |
| GQC-02B-E2E-03 | E2E | Open `/responsive-lab.html?target=<fixture>` | The fixture loads as on trunk. |
| GQC-02B-E2E-04 | E2E | Mount and unmount each Lab island 50 times through target and page changes | Listener and timer counts return to the starting count. |
| GQC-02B-E2E-05 | E2E | Load the Lab in a cold context | Only `client:load` and `client:only` island bundles download before interaction. |

## Non-goals

- Do not change user-visible behavior. GQC-04 owns the guided workflow.
- Do not enable Astro's client router in this sprint.
- Do not rewrite vanilla modules as Preact components.
- Do not migrate Express API routes to Astro endpoints in this sprint.
- Do not change CORS, CSP, `app-config.json`, or target policy. GQC-03 owns them.
- Do not adopt React, Vitest, TypeScript, or a CSS framework.
- Do not import `clm-kernel` into islands.
- Do not change the production service worker.

## Open decisions

| Decision | Owner | Target sprint | State |
| --- | --- | --- | --- |
| Which exact Astro, adapter, and Preact versions are pinned? | Architect | GQC-02B | Open. Pin the current stable release at sprint start. |
| Where does Astro's `publicDir` point, and when do the root and `public/` static mounts retire? | Architect | GQC-02B | Open. Recommendation: a dedicated empty `publicDir`; keep Express mounts until each consumer moves. |
| Which dev ports do `astro dev` and the Express API server use, and which is public? | Architect | GQC-01 and GQC-02B | Open |
| Should Astro's client router be enabled later, turning some `link` Transitions into `client-route` Transitions? | Architect, Product Manager, and UX Designer | GQC-04 | Open |
| Does the production build ever ship Transition trace instrumentation? | Architect and Product Manager | GQC-05 | Open. Default: no; traces come from Playwright. |
| Which non-P0 Places migrate in this sprint versus later? | Product Manager | GQC-02B | Open |

## Definition of done

- [x] Every approved `page` Place is served by Astro with an unchanged URL.
- [x] `astro build` enforces net parity, and each rule has a failing fixture.
- [x] API, config, and WebSocket contracts are unchanged on trunk and head.
- [x] The Responsive Lab is `astro-islands`, and the island map is committed.
- [x] All GQC-02 journeys, ERB specs, and GQC-02A trace replays pass on the Astro build.
- [x] The UX Designer approves legacy and Astro screenshot comparisons.
- [x] The Architect and TEA approve the host, island, and parity contracts.
- [ ] The operator approves the handoff to GQC-03.
