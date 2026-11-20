# Property-Based Exploration of LandingPage with Bombadil

| Field | Value |
| --- | --- |
| Audience | QA engineers, Test Architects, and developers who run, extend or triage LandingPage's Bombadil exploration |
| BMAD Owner | Test Architect and Developer (`bmad-agent-dev`) |
| Source of Truth | [`tests/bombadil/`](../../tests/bombadil/), [`scripts/bombadil/`](../../scripts/bombadil/), [`src/net/workbench-net.yaml`](../../src/net/workbench-net.yaml), [`js/harness/page-state.js`](../../js/harness/page-state.js), [`docker/bombadil/compose.yml`](../../docker/bombadil/compose.yml) |
| Status | **Current.** This describes how LandingPage runs Bombadil today, as built by Program BPV (BPV-00 through BPV-07). `@antithesishq/bombadil` is pinned at `0.7.10`. |
| Upstream | [antithesishq/bombadil](https://github.com/antithesishq/bombadil) · [Bombadil Manual](https://antithesishq.github.io/bombadil/) |
| Monorepo context | [Property-Based UI Verification with Bombadil Across the Four Estates](https://github.com/bkoo/MCard_TDD/blob/main/docs/architecture/bombadil-property-based-ui-verification-across-four-estates.md) (`MCard_TDD/docs/architecture/`) |

---

## 1. What Bombadil does here

Bombadil drives Chromium with generated clicks, typing, scrolling and history
steps. On every state it sees, it checks properties written in linear temporal
logic. LandingPage uses it to prove three things that scripted Playwright flows
cannot cover alone:

1. Every in-scope page loads to a declared state and stays error free under
   random use (the page-load spec).
2. Every navigation the pages report is a transition the workbench net declares
   (the workbench spec).
3. The deterministic SPA fixture never leaves its own net (the SPA spec).

Bombadil runs nightly on local Docker. It is not part of the PR gate, because
exploration is random and bounded only by time (decision BPV-D09). A bug that Bombadil finds
reaches the PR gate as a promoted Playwright spec.

## 2. Run it

Every target goes through one runner, [`scripts/bombadil/run.mjs`](../../scripts/bombadil/run.mjs).
It starts a private `ws-server.js` on port 3021 with a throwaway database, waits
until `/health` answers, runs Bombadil headless with `--exit-on-violation`, and
stops the server. Build the Astro host first, because the server serves `dist/`.

```bash
npm run build:astro
```

```bash
npm run bombadil:workbench -- --time-limit 2m
```

| Script | Start URL | Spec | What it proves |
| --- | --- | --- | --- |
| `npm run bombadil:spa` | `/tests/fixtures/spa-test-target.html` | `spa-target.bombadil.ts` | The fixture stays in its net, its hash matches its place, and its count only rises. |
| `npm run bombadil:lab-smoke` | `/responsive-lab.html` | `lab-smoke.bombadil.ts` | The lab survives random use with no stall and no error. |
| `npm run bombadil:page-load` | each of the six generated `ENTRY_URLS` | `page-load.bombadil.ts` | Each page settles within 10 seconds, reports a declared place that matches its URL, has one main landmark, and logs no error outside the baseline. |
| `npm run bombadil:workbench` | `/responsive-lab.html` | `workbench.bombadil.ts` | The page-load properties, plus declared firings, the recorder lifecycle and the target mirror. |
| `node scripts/bombadil/canary.mjs` | the canary copy of the SPA fixture | `spa-target.bombadil.ts` | The tooling still finds and shrinks a seeded bug. |

Runner options: `--time-limit 10m` sets the budget, `--output-path <dir>` sets
the output directory, and anything after `--` goes to Bombadil unchanged. Each
run writes `bombadil-output/<target>-<timestamp>/` (git ignores it). Set
`BOMBADIL_PORT` when port 3021 is taken. The runner refuses to start when
something already answers there, so it never tests a foreign server.

Exit codes: 0 means clean, 2 means a property was violated, and anything else
is a setup failure.

## 3. What the specs read

### The page state contract

Every workbench page is built on `src/layouts/WorkbenchLayout.astro` and loads
[`js/harness/page-state.js`](../../js/harness/page-state.js). The `body` carries:

| Attribute | Meaning |
| --- | --- |
| `data-net-id` | The net the page belongs to, such as `landingpage-workbench-net` |
| `data-place-ids` | The places this page may report |
| `data-place-id` | The current place |
| `data-page-state` | `loading`, `redirecting`, `ready`, `busy` or `error` |
| `data-page-error` | Set together with text in `#page-alert` when the state is `error` |
| `data-boot-nonce` | A fresh value for every document load |

Firings land in `window.__netReport`, a log of at most 200 records shaped
`{ seq, transitionId, fromPlaceId, toPlaceId }`. A link that leaves a page hands
its place to the next document through `sessionStorage`. The arriving document
logs the declared transition for that arc when it names its first place. Only
the top-level document takes part in the hand-off, because a same-origin target
framed by the lab shares the tab's storage.

### The generated net module

`npm run bombadil:nets` writes [`tests/bombadil/generated/workbench-net.ts`](../../tests/bombadil/generated/workbench-net.ts)
from the net and from [`tests/bombadil/scope.json`](../../tests/bombadil/scope.json).
It exports `NET_ID`, `PLACES`, `ARCS`, `HISTORY_ARCS`, `ENTRY_URLS`,
`ALLOW_URLS` and `RECORDER_TRANSITIONS`. `npm run check:bombadil-nets` fails when
the committed file is stale. It runs in the local `bombadil-gate` service and at the start of every nightly.

`ALLOW_URLS` holds Chrome match patterns that bound each run. Each pattern ends
in `*`, so a query such as `?noredirect=1` is accepted. The root redirect page
`/` is never listed: Bombadil reads a bare `/` path as "every path".

### Explorable controls

`npm run check:explorable-gui` (also in `bombadil-gate` and every nightly) requires every island
control to carry `data-testid` and forbids native `confirm`, `alert` and
`prompt`. A control with a side effect declares it in `data-effect`:
`navigate`, `persist`, `destructive`, `external`, `download` or `file-picker`.

The specs drop clicks on `external`, `destructive`, `download` and
`file-picker` controls and on `target="_blank"` links. They filter by the click
point, not by the fingerprint. Bombadil reports controls inside the target
iframe with frame-relative coordinates, so such a click lands on whatever the
lab shows at that point.

## 4. Writing and changing a spec

- Name specs `tests/bombadil/*.bombadil.ts`. Playwright matches `*.spec.js`, so
  they never collide.
- Import local modules with the `.ts` extension, such as
  `import { ARCS } from "./generated/workbench-net.ts"`.
- Bombadil registers every exported action generator. Export one combined
  generator, for example `weighted([[4, workflow], [3, framedTarget], [3, exploration]])`,
  and re-export only properties from other specs.
- Import `registerCustomAction`, `actions` and `weighted` from
  `@antithesishq/bombadil/browser`. The handler then runs in the page with
  `(document, window, ...args)`. The root module's `registerCustomAction` never
  reaches the page.
- Pass randomness as an argument, as in `clickWorkflowControl(Math.random())`,
  so a trace replays the same choice.
- A snapshot takes the name of the spec's own variable. The shared extractor in
  [`tests/bombadil/net-report.ts`](../../tests/bombadil/net-report.ts) therefore
  arrives unnamed, and the trace reader recognises it by its shape. Keep its
  `netId`, `nonce`, `path` and `records` fields.
- To drive the framed target, click through
  `document.getElementById("mission-control-iframe").contentDocument`. Bombadil's
  own clicks never land inside the frame.

## 5. The workbench spec

[`tests/bombadil/workbench.bombadil.ts`](../../tests/bombadil/workbench.bombadil.ts)
adds these properties to the page-load ones:

| Property | Checks |
| --- | --- |
| `firingsAreDeclared` | Every `__netReport` record names a declared arc of `ARCS` or `HISTORY_ARCS` with matching places. |
| `recorderStateIsKnown` | `data-recorder-state` is one of the generated recorder states. |
| `recorderMovesAreLegal` | Each change is a declared move, or a declared reset followed by one declared move. A fresh document may restart at `IDLE`. |
| `targetMirrorIsDeclared` | While the SPA fixture is the lab's target, the stage's `data-target-place-id` is an SPA place. |
| `targetMirrorAgrees` | Within 2 seconds the mirrored place and boot nonce equal the fixture's own. |

The stage mirror is decision BPV-D08. `createViewportStage().setTargetPlace()`
writes the observed place onto `#viewport-scale-wrapper` and shows it in the
frame bar. The guided workflow calls it from the observation the guide already
uses.

The spec skips Reload and links to the redirecting portal URL. Both start a
navigation that is at once replaced by another, and Bombadil's quiescence check
races that second navigation. Back, Forward and the other links still give each
run fresh documents.

## 6. Coverage from exploration

[`scripts/bombadil/trace-to-net.mjs`](../../scripts/bombadil/trace-to-net.mjs)
reads a run's `trace.jsonl`:

```bash
node scripts/bombadil/trace-to-net.mjs bombadil-output/nightly-<time>/workbench --min-firings 20
```

It prints one firing per line. `--min-firings` fails a run that fired fewer
transitions, so a run that only scrolled cannot pass as clean. `--net-traces`
prints replayable traces instead: one per unbroken chain of places in one net,
marked `asserted: false`.

```bash
node scripts/check-net.mjs --bombadil-traces bombadil-output --markdown
```

This replays every trace under the directory against its net and reports three
separate counts. **Asserted** comes from Playwright journeys in
`tests/gui-coverage.json`. **Explored only** was fired by exploration and no
asserted spec covers it. **Never fired** was reached by neither. Explored
coverage never counts as asserted (decision BPV-D11). A trace the net rejects
is printed for triage and adds nothing.

The trace format is Bombadil's own and is undocumented.
[`tests/fixtures/bombadil/sample-trace.jsonl`](../../tests/fixtures/bombadil/sample-trace.jsonl)
pins ten real lines, and the reader names the pinned version when a line has an
unexpected shape.

## 7. Nightly runs on local Docker

Nightly runs happen on this machine's Docker, not on GitHub. [`scripts/bombadil/nightly.sh`](../../scripts/bombadil/nightly.sh) does one run:

1. It builds the Astro host.
2. It runs `check:bombadil-nets`, `check:explorable-gui`, `stageshow:check-css`, `stageshow:sweep -- --strict`, and guarded portal `stageshow:film -- --gate` when `public/stageshow/workbench-bombadil-pair/index.html` exists.
3. It runs the canary, `spa`, `lab-smoke`, `page-load` and `workbench`.
4. It applies the workbench's 20-firing bound.
5. It replays this nightly's traces for coverage.

Every step runs even when an earlier one fails, and the script exits 1 if any step failed. Each run writes `bombadil-output/nightly-<UTC time>/`, with `summary.md`, `coverage.md`, one log per step and one Bombadil output directory per target.

[`docker/bombadil/`](../../docker/bombadil/) wraps it in a Linux image. The image is Node 24 on Debian bookworm with Chromium, `fonts-liberation`, `fonts-dejavu-core`, `fonts-noto-color-emoji`, and the Linux `node_modules`. The repository is bind-mounted alongside a read-only mount of `../../../docs/sprints/programs` at `/docs/sprints/programs:ro` for `/api/clm/program-artifact`, so results land in the host's `bombadil-output/`. The container builds its own `dist/` in a volume and never overwrites the host's. It sets `BOMBADIL_EXTRA_ARGS=--no-sandbox`, `CHROME_PATH=/usr/bin/chromium`, and `STAGESHOW_NO_SANDBOX=1`, so both Bombadil and StageShow (`stageshow:check-css`, `stageshow:sweep -- --strict`, `build-scenes.mjs --check`) execute reliably inside `bombadil-gate` and `bombadil-nightly`.

```bash
docker compose -f docker/bombadil/compose.yml build
```

```bash
npm run bombadil:docker
```

```bash
docker compose -f docker/bombadil/compose.yml up -d bombadil-scheduler
```

```bash
docker compose -f docker/bombadil/compose.yml --profile manual run --rm bombadil-gate
```

The first command builds the image. `npm run bombadil:docker` runs one nightly now. The `bombadil-scheduler` service runs one every day at `NIGHTLY_AT` (default `02:30`, time zone `TZ`, default UTC) and restarts with Docker. `bombadil-gate` runs the deterministic checks only. Budgets come from `TIME_LIMIT`, `WORKBENCH_TIME_LIMIT`, `PAGE_LOAD_TIME_LIMIT`, `CANARY_TIME_LIMIT` and `MIN_FIRINGS`. `npm run bombadil:nightly` runs the same script on the host.

After `package-lock.json` changes, rebuild the image and drop its dependency volume with `docker compose -f docker/bombadil/compose.yml down -v`.

## 8. From violation to regression

1. **Find it.** Open `summary.md` in the failing `bombadil-output/nightly-<time>/` directory and the failing step's log.
   It names the property and prints a `--reproduce` command.
2. **Shrink it.** Run `bombadil browser shrink --trace <run>/trace.jsonl <start URL> <spec>`
   with the same `--allow-url` list, against a server started the way the
   runner starts one.
3. **Read it.** `bombadil browser inspect <run>` shows each step with its
   screenshot.
4. **Promote it.** Write the steps as an ordinary spec under
   [`tests/features/`](../../tests/features/), so `npm run test:features` guards
   the bug on every PR. A promoted history or navigation bug must keep Chrome's
   flooding protection on.
5. **Record it.** Add a row to `docs/sprints/_active/DECISIONS.tsv` naming the
   property, the cause, the fix and the promoted spec.

## 9. Pitfalls measured in this repository

| Pitfall | What to do |
| --- | --- |
| A new tab starves the lab of animation frames, and every later quiescence check times out. | Drop `target="_blank"` and `data-effect="external"` clicks. |
| Chrome silently drops history updates after about 200 quick changes. | The SPA fixture re-reads the URL after `pushState`. Keep that check. |
| A redirecting page or a Reload races the quiescence check. | Skip them in specs that must log no `quiescence timer` warning. |
| `*://*/` matches every path, and `*://*/page.html` refuses `page.html?query`. | Use the generated `ALLOW_URLS`. |
| The root `registerCustomAction` never runs in the page. | Import it from `@antithesishq/bombadil/browser`. |
| A framed same-origin page shares `sessionStorage` with the lab. | Keep page-state's top-level check. |
| Layout freeze: a new visible element fails `tests/features/layout-freeze.spec.js`. | Re-capture with a `rebaselines` record that attributes the change (see `docs/sprints/programs/sty/style/layout-baseline.json` in the root repository). |

## 10. Bombadil Dashboard Control Plane and Handles

Responsive UI Lab exposes a subprocess-isolated Bombadil dashboard (`BombadilDashboardIsland`, `client:visible` under the `Bombadil` mode tab) backed by [`server/bombadil-runner-service.mjs`](../../server/bombadil-runner-service.mjs), [`js/harness/bombadil-client.js`](../../js/harness/bombadil-client.js), and `window.__lab.bombadil`.

- **HTTP and SSE Endpoints (`server/test-run-api.mjs`)** mount eight literal routes under `/api/test-runs/bombadil/*` above the parameterised `/:hash` catch-all (`GET /handles`, `POST /trigger`, `POST /stop`, `POST /shrink`, `GET /runs`, `GET /run`, `GET /coverage`, and `GET /stream`).
- **Triad Handles and Schemas (`js/harness/test-run-schema.js`)** register target trigger URNs (`urn:mcard:bombadil:trigger:<target>` for `spa`, `spa-canary`, `lab-smoke`, `page-load`, and `workbench`), `urn:mcard:bombadil:stop`, `urn:mcard:bombadil:shrink`, and `urn:mcard:bombadil:coverage`, emitting immutable records under `urn:ssg:bombadil-trigger:v1`, `urn:ssg:bombadil-run:v1`, and `urn:ssg:bombadil-coverage:v1` while leaving `urn:mcard:schema:responsive_test_run:v1` closed.
- **Event Handles and Isolation** expose `lab:bombadil-command` and `lab:bombadil-state` CustomEvents, enforce a single active subprocess mutex (`HTTP 409` on concurrent trigger), restrict callers to loopback by default, spawn `node scripts/bombadil/run.mjs` on ephemeral free ports with `stripServerContractImport()` and `PW_*`/`NODE_OPTIONS` scrubbing, and guard against recursive self-exploration via `BOMBADIL_CHILD_RUN=1` and `BOMBADIL_ENABLE_RUNNER=0`.

## References

- [Program BPV plan](../sprints/programs/bpv/bpv-plan.md) and its sprint evidence under [`docs/sprints/programs/bpv/evidence/`](../sprints/programs/bpv/evidence/)
- [Testing and Quality Assurance index](./README.md)
- [Tests README](../../tests/README.md)
