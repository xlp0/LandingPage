# Sprint ERB-04: Deterministic Playwright Replay Driver & Systematic Multi-Device Sweeps

> **Merge note (41cc6a1).** This sprint merges two drafts. From Yohanes's ERB-04 it takes the replay `speed` multiplier (1×/2×/5×) and the `SLOWMO`/`HEADED` observation modes. From his ERB-05 it takes the systematic sweep (`tests/features/systematic-landing-test.spec.js`, `npm run test:responsive`, `FAST_MODE`, and the CLI summary table). Certification, the other half of his ERB-05, moved to ERB-06 (§6.3 there). The device matrix comes from the registry (ERB-05) and is not typed in specs.

## Metadata
- **Sprint Code**: `SPRINT-ERB-04`
- **Handle**: `urn:pcard:sprint:SPRINT-ERB-04`
- **Status**: `GRADUATED`
- **Archetype**: `ClmTriadManifest`
- **Depends on**: `SPRINT-ERB-03` (stored runs, `/api/test-runs`), `SPRINT-ERB-05` (`tests/fixtures/device-matrix.js`, fidelity resolver)
- **Unblocks**: `SPRINT-ERB-06`
- **pstack Playbook**: `tdd` + `principle-prove-it-works` + `principle-test-behavior-not-implementation`

---

## 1. Context & Objective

Turn stored test runs into automated evidence:

1. **Replay**: load a stored run, open the chosen target in a Playwright context that emulates the run's device (T1, or T2 with CDP), reproduce the events, and prove the final state matches the recording.
2. **Sweep**: open the target on every registry device in both orientations and assert baseline device-sensitive health (no horizontal overflow, no console errors, key targets visible).

### 1.1 Corrections to the earlier draft
- **One device source**: the earlier matrix hardcoded "iPad Pro 11 (834 × 1194)", which is not in `js/device-registry.js` (the registry has iPad Air 11" 820 × 1180 and iPad Mini 744 × 1133). Every device now comes from `tests/fixtures/device-matrix.js` (ERB-05, `INV-DSF-02`).
- **Two specs, fixed names**: replay is `tests/features/responsive-replay.spec.js`. The sweep is `tests/features/systematic-landing-test.spec.js`, run by `npm run test:responsive` (both names adopted from Yohanes's draft).
- **Honest fidelity**: replay at top level in an emulated context is T1. Replay inside the lab iframe (`--via-lab`) is T0. The replay result records which one it was.
- **Orientation limits**: Playwright cannot change `isMobile`/`hasTouch` mid-context, and `setViewportSize` does not fire `screen.orientation` change events. An `orientation_change` replays as a viewport swap, and `screenOrientationApi` is listed in `notEmulated`.
- **No hidden flakiness**: the `features` project has `retries: 2`. Replay and sweep specs call `test.describe.configure({ retries: 0 })`.
- **External target precondition**: Playwright's `webServer` only starts `:3001`. A spec using an external `TARGET_URL` preflights it and calls `test.skip()` with a clear message when it is unreachable.

---

## 2. BMAD Agent Responsibilities

### 🧪 TEA (Murat)
- `tests/features/systematic-landing-test.spec.js`: for each `deviceMatrix()` entry (8 devices × 2 orientations), create a context with `toPlaywrightContext(profile, orientation)`, load `TARGET_URL`, and assert:
  - `document.documentElement.scrollWidth <= window.innerWidth` (no horizontal overflow);
  - zero `console.error` and `pageerror` events;
  - every selector in `SWEEP_KEY_SELECTORS` (env or default `['main', 'h1']`) is visible and inside the viewport width.
- `tests/features/responsive-replay.spec.js`: replays runs listed in `REPLAY_HASHES` (comma-separated) or, by default, the `test_run_latest` handles for `TARGET_URL`. Asserts the parity checks in §4.3.
- Both specs mint a result record (§4.4) when `MINT_RESULTS=1`.

### 💻 Dev (Amelia)
- `scripts/playwright-replay-driver.mjs`: `replayRun(page, run, { mode = 'deterministic', speed = 1 })` (§4.2).
- `tests/fixtures/target-preflight.js`: `ensureTargetReachable(request, url)` → `test.skip(...)` with the reason.
- `package.json` scripts: `test:responsive` and `test:replay` (§5).

### 📝 Tech Writer (Paige)
- Extend the existing guide [`docs/08-testing/DEVICE_SENSITIVE_TESTING_INFRASTRUCTURE.md`](../../08-testing/DEVICE_SENSITIVE_TESTING_INFRASTRUCTURE.md) instead of adding a new file. Cover binding a target, recording in the lab, reading the fidelity badge, running sweeps and replays (including the replay-driver options that were planned for a separate `REPLAY_DRIVER.md`), and inspecting results in SQLite.
- Add the ERB-00…04 entries to `CHANGELOG.md`.

---

## 3. Refactoring Sequence

| Step | Action | Kind | Exit check |
| :--- | :--- | :--- | :--- |
| **R1** | Where `responsive-rotation-and-devices.spec.js` types device dimensions that match a registry entry, import them from `tests/fixtures/device-matrix.js`. Keep deliberately custom dimensions (for example oversized-device containment cases) as literals. | Migrate | RVP suite green with an identical pass count. |
| **R2** | Add `target-preflight.js` and `scripts/playwright-replay-driver.mjs` with unit-level tests against the same-origin fixture `tests/fixtures/probe-target.html` (ERB-02/R7). | Add | Driver replays a hand-written 5-event run on the fixture. |
| **R3** | Add `systematic-landing-test.spec.js`. | Add | `TARGET_URL=app.html npm run test:responsive` green. |
| **R4** | Add `responsive-replay.spec.js`. | Add | Record → save → replay round-trip on `app.html` green. |
| **R5** | Add the npm scripts and the testing guide. | Docs/harness | Guide steps reproduce on a clean checkout. |

ERB-06/R1 later lifts the sweep assertions into the conformance check catalog. Write them in R3 as small named functions so that move is mechanical.

---

## 4. Technical Specification

### 4.1 Sweep Matrix (derived, not typed)

```javascript
import { deviceMatrix, toPlaywrightContext } from '../fixtures/device-matrix.js';
for (const { profile, orientation } of deviceMatrix({ orientations: ['portrait', 'landscape'] })) {
  test(`${profile.id} · ${orientation}`, async ({ browser }) => {
    const context = await browser.newContext(toPlaywrightContext(profile, orientation));
    // viewport, deviceScaleFactor, hasTouch, isMobile, userAgent come from the registry profile
  });
}
```

With the 8 built-ins this produces 16 cases: iPhone 16 Pro, iPhone SE, Pixel 8, Galaxy S24, iPad Air 11", iPad Mini, MacBook Air 13", and Desktop 1080p, each in portrait and landscape.

### 4.2 Replay Mapping

| Event | Replay action | Notes |
| :--- | :--- | :--- |
| `viewport_change` / `orientation_change` | `page.setViewportSize({ width: w, height: h })` | `screenOrientationApi` is not emulated. |
| `pointer` with `pointerType: 'touch'` | Resolve `target.selector`; if visible, `locator.tap()`. Otherwise `page.touchscreen.tap(nx·w, ny·h)`. | Requires `hasTouch: true` in the context. |
| `pointer` with `mouse` / `pen` | Resolve selector; if visible, `locator.click()`. Otherwise `page.mouse.click(nx·w, ny·h)` after restoring `scroll`. | The coordinate fallback is counted in `fallbacks`. |
| `input` | `locator.fill(value)`. `<redacted>` values use fixture values from `REPLAY_FIXTURES` or are skipped and counted. | Privacy-preserving (`INV-PRV-01`). |
| `key` | `page.keyboard.press(key)` | Non-character keys only. |
| `scroll` | `page.evaluate(([x, y]) => scrollTo(x, y), [x, y])` | |
| `media_change` | `page.emulateMedia({ colorScheme, reducedMotion })` when the query maps to an emulatable feature; otherwise counted in `notReplayed`. | `pointer`/`hover` changes cannot happen mid-context. |
| `navigation` | Assert `page.url()` matches after the preceding action settles. | Detects divergence early. |
| `pause` / `resume` | No-op in `deterministic` mode. | |

**Modes**

- `deterministic` (default) ignores recorded timings and waits for Playwright actionability. Use it for correctness.
- `paced` waits until `t_rel_ms / speed` before each action. `speed` is `1`, `2`, or `5` (env `REPLAY_SPEED`). Use it for timing-sensitive UI and performance telemetry. Results record the speed, because frame telemetry at 5× is not comparable to 1×.

**Environment switches** (shared by the sweep and replay specs)

| Variable | Effect |
| :--- | :--- |
| `TARGET_URL` | Target to test. Default `app.html`. |
| `HEADED=1` | Runs headed so a person can watch. |
| `SLOWMO=<ms>` | Passes `launchOptions.slowMo` for demos and debugging. Never used in CI. |
| `FAST_MODE=1` | Sweep only: portrait orientation and the first device of each registry `category`, for a quick local loop. CI always runs the full matrix. |
| `REPLAY_SPEED` | `1` (default), `2`, or `5`; `paced` mode only. |
| `MINT_RESULTS=1` | Mints result records (§4.4). |

**CLI summary.** After the sweep, a custom reporter prints one row per `(device, orientation)` with the columns `device`, `orientation`, `overflow`, `console`, `keyTargets`, and `verdict`, then a total line. ERB-06 adds its check columns to the same table.

### 4.3 Parity Checks

| Check | Pass condition |
| :--- | :--- |
| Final URL | `page.url() === run.finalState.url` |
| DOM digest | `blake3` of the same `domDigestInput` procedure (ERB-02 §4.3) equals `run.finalState.domDigest` |
| Fallback budget | `fallbacks / pointerEvents ≤ 0.2`; above that the run is marked `fragile` (selectors need `data-testid`s) |
| Loss | `run.metrics.droppedCount === 0`, or the result is marked `partial` |
| Screenshot (optional) | `toHaveScreenshot()` per `(device, orientation)` with `maxDiffPixelRatio: 0.01` when `REPLAY_SCREENSHOTS=1` |

### 4.4 Result Record `urn:mcard:schema:replay_result:v1`

```json
{
  "schema": "urn:mcard:schema:replay_result:v1",
  "sourceRunHash": "…",
  "target": { "url": "http://localhost:4321/", "slug": "localhost-4321" },
  "device": { "id": "iphone-16-pro", "orientation": "portrait" },
  "fidelity": { "tier": 1, "runner": "playwright", "emulated": ["viewport", "pixelRatio", "hasTouch", "isMobile"], "notEmulated": ["screenOrientationApi", "safeAreaInsets"] },
  "mode": "deterministic",
  "verdict": "pass",
  "checks": { "finalUrl": true, "domDigest": true, "fallbackRatio": 0.0, "dropped": 0 },
  "counts": { "replayed": 24, "fallbacks": 0, "notReplayed": 0 }
}
```

`verdict` is one of `pass`, `fail`, `fragile`, or `partial`. Records are POSTed to `/api/test-runs` under the handle `urn:mcard:replay_result:<slug>:<sourceRunHash>:<deviceId>:<orientation>`. ERB-03's router accepts this schema in addition to `responsive_test_run:v1`; that is a one-line union in `validateTestRun` dispatch, added in this sprint.

---

## 5. Definition of Done (DoD) & Verification

- [x] `vcard:sprint-erb-04:device_matrix_registry_derived`: Sweep and replay use only `device-matrix.js`; no device dimensions are typed in new specs (`INV-DSF-02`).
- [x] `vcard:sprint-erb-04:sweep_suite_green`: `systematic-landing-test.spec.js` passes all 16 cases against `app.html`.
- [x] `vcard:sprint-erb-04:replay_round_trip_verified`: A run recorded in the lab on `app.html` replays with `verdict: pass` at T1.
- [x] `vcard:sprint-erb-04:cross_origin_replay_verified`: The same holds for `http://localhost:4321/` with the probe agent, or the spec skips with the preflight reason when the target is down.
- [x] `vcard:sprint-erb-04:no_hidden_retries`: Both specs run with `retries: 0`.
- [x] `vcard:sprint-erb-04:results_minted`: With `MINT_RESULTS=1`, replay results appear under `urn:mcard:replay_result:*`.
- [x] `vcard:sprint-erb-04:replay_speed_modes`: `paced` replay works at `REPLAY_SPEED=1`, `2`, and `5`, and the speed is recorded in the result.
- [x] `vcard:sprint-erb-04:cli_summary_table`: `npm run test:responsive` prints the per-device summary table.
- [x] `vcard:sprint-erb-04:documentation_published`: `docs/08-testing/DEVICE_SENSITIVE_TESTING_INFRASTRUCTURE.md` covers sweeps and replays, and its steps reproduce.

### Execution Commands
```bash
# package.json
#   "test:responsive":  "playwright test tests/features/systematic-landing-test.spec.js --project=features"
#   "test:replay": "playwright test tests/features/responsive-replay.spec.js --project=features"

TARGET_URL=app.html npm run test:responsive
TARGET_URL=http://localhost:4321/ npm run test:responsive
TARGET_URL=http://localhost:4321/ MINT_RESULTS=1 npm run test:replay
FAST_MODE=1 HEADED=1 SLOWMO=250 TARGET_URL=http://localhost:4321/ npm run test:responsive   # watchable local loop
```
