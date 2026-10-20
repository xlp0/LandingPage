# Device-Sensitive Testing Infrastructure Guide

## 1. Overview
The `LandingPage` repository serves as a **Systematic Responsive Testing, Telemetry Capture & Replay Infrastructure** for web applications and landing pages. 

Instead of treating responsive design as an afterthought or manually checking screens, this infrastructure provides an automated, browser-observable test workbench that certifies any web target URL across 5 critical device-sensitive dimensions:
1. **Dynamic Geometry & Orientation Reflow (`INV-RVP-01`)**: Instant swapping of viewport width and height without layout clipping.
2. **Horizontal Viewport Bleed (`INV-DEV-01`)**: Verification that elements do not cause unwanted horizontal scrollbars (`scrollWidth <= innerWidth`).
3. **Touch Target Ergonomics (`INV-DEV-02`)**: Compliance auditing for touch targets ($\ge 44\text{px} \times 44\text{px}$) on mobile devices.
4. **Scale-Invariant Interaction Capture (`INV-ERB-01..03`)**: In-memory ring buffering of user and automated events with coordinates normalized to $[0.0, 1.0]$.
5. **Frame Budget & Layout Stability (`INV-DEV-04`)**: Observation of frame latency ($16.6\text{ms}$ budget) and layout freeze absence during rapid reflows.

> [!NOTE]
> **Status:** SPRINT-ERB-00 through SPRINT-ERB-04 are **implemented and verified**. Orientation reflow, event ring buffer, spatial normalization, MCard CLM persistence, Playwright replay driver, and systematic multi-device sweeps (`npm run test:responsive` and `npm run test:replay`) are fully operational. SPRINT-ERB-06 adds certification and conformance checks.

**Fidelity tiers.** Every run states what was really emulated (`INV-DSF-01`). **T0** is the lab iframe, which emulates only the CSS viewport. **T1/T2** are Playwright contexts, which add DPR, touch, mobile user agent, media features, and (T2) CDP throttling. **T3** is a real device on the LAN. See the [series index](../sprints/_active/INDEX.md#1-device-sensitive-dimensions-and-fidelity-tiers) for the full table.

---

## 2. Setting the Chosen LandingPage Target URL

The testing infrastructure supports testing any local development server (e.g., Astro, Vite, Next.js, or Express) or deployed staging build.

### Interactive Workbench (`responsive-lab.html`)
Launch the Responsive Lab directly bound to your chosen target:
```text
http://localhost:3001/responsive-lab.html?target=http://localhost:4321/
```
The lab shell will automatically embed `http://localhost:4321/` in the controlled viewport frame and calibrate the device stage. The event capture ribbon arrives with ERB-02 *(planned)*.

### Automated Playwright CLI *(planned, ERB-04)*
Run systematic sweeps and replay sessions via terminal:
```bash
# Sweep local dev server
TARGET_URL=http://localhost:4321/ npm run test:responsive

# Sweep internal target
TARGET_URL=app.html npm run test:responsive

# Quick, watchable local loop (portrait, one device per category, headed, slowed down)
FAST_MODE=1 HEADED=1 SLOWMO=250 TARGET_URL=http://localhost:4321/ npm run test:responsive

# Replay stored runs; paced mode accepts REPLAY_SPEED=1|2|5
TARGET_URL=http://localhost:4321/ npm run test:replay
```

Playwright's `webServer` starts only `:3001`. Start an external target such as `:4321` yourself; when it is down, the specs skip with a clear reason.

---

## 3. Sequence of Refactoring & Architecture Roadmap

The transformation of the codebase is tracked across 7 active sprints under [`docs/sprints/_active/`](../sprints/_active/INDEX.md). Sprint numbers are identifiers; execution follows the dependency graph:

```
                 ┌─► ERB-01 Ring Buffer & FSM ────────┐
ERB-00 Modularize┤                                    ├─► ERB-02 ──► ERB-03 ──► ERB-04 ──► ERB-06
                 └─► ERB-05 Device Profiles & Fidelity ┘    Membrane    Telemetry   Replay &    Conformance
                                                              & Ergonomics & MCard     Sweeps      & Certification
```

1. **[SPRINT-ERB-00](../sprints/_active/SPRINT-ERB-00-infrastructure-refactoring.md)**: Extract the inline scripts in `responsive-lab.html` into `js/harness/viewport-stage.js`, `js/harness/target-membrane.js`, and `js/harness/lab-toolbar.js`; one writer of `iframe.src`; one target registry; `window.__lab` test API (`INV-INF-01`).
2. **[SPRINT-ERB-01](../sprints/_active/SPRINT-ERB-01-ring-buffer-core.md)**: Implement `js/harness/event-ring-buffer.js` (fixed slot array, $N \le 2048$, O(1) push, overwrites counted) and the recording state machine.
3. **[SPRINT-ERB-05](../sprints/_active/SPRINT-ERB-05-device-capability-profiles.md)**: Add touch, pointer, hover, mobile, and safe-area capabilities to `js/device-registry.js`, the fidelity resolver, and `tests/fixtures/device-matrix.js`. Runs in parallel with ERB-01.
4. **[SPRINT-ERB-02](../sprints/_active/SPRINT-ERB-02-membrane-normalization.md)**: Implement `js/harness/membrane-interceptor.js` with same-origin capture, an opt-in probe agent for cross-origin targets, normalization to $[0.0, 1.0]$ in the target's own viewport, and live touch-ergonomics auditing.
5. **[SPRINT-ERB-03](../sprints/_active/SPRINT-ERB-03-mcard-clm-persistence.md)**: Implement `js/harness/telemetry-collector.js` (overflow, frame timing, layout shift) and `server/test-run-api.mjs`, which persists test runs to SQLite with `clm-kernel` hashing.
6. **[SPRINT-ERB-04](../sprints/_active/SPRINT-ERB-04-playwright-deterministic-replay.md)**: Build `scripts/playwright-replay-driver.mjs` and the systematic sweep `tests/features/systematic-landing-test.spec.js` over the registry matrix.
7. **[SPRINT-ERB-06](../sprints/_active/SPRINT-ERB-06-device-sensitive-conformance.md)**: Declarative conformance checks (`INV-DEV-01..04` and more), regression diffs, and the responsive certification record `urn:mcard:certification:responsive:v1`.

---

## 4. Standard Device Sweep Matrix

The sweep uses every built-in profile in [`js/device-registry.js`](../../js/device-registry.js), in portrait and landscape: 8 devices × 2 orientations = 16 cases. Specs never type device dimensions; they derive them from the registry through `tests/fixtures/device-matrix.js` (`INV-DSF-02`).

| Preset Identifier | Device Model | CSS Dimensions (W x H) | DPR | Category |
| :--- | :--- | :--- | :--- | :--- |
| `iphone-16-pro` | iPhone 16 Pro | $393 \times 852$ px | 3.0 | phone |
| `iphone-se` | iPhone SE | $375 \times 667$ px | 2.0 | phone |
| `pixel-8` | Google Pixel 8 | $412 \times 915$ px | 2.625 | phone |
| `galaxy-s24` | Samsung Galaxy S24 | $360 \times 780$ px | 3.0 | phone |
| `ipad-air-11` | iPad Air 11" | $820 \times 1180$ px | 2.0 | tablet |
| `ipad-mini` | iPad Mini | $744 \times 1133$ px | 2.0 | tablet |
| `macbook-air-13` | MacBook Air 13" | $1280 \times 832$ px | 2.0 | desktop |
| `desktop-fhd` | Desktop 1080p | $1920 \times 1080$ px | 1.0 | desktop |

DPR applies only at T1 and above. In the lab iframe (T0) the target renders at the host screen's DPR.

---

## 5. Verification Commands

```bash
npm run test:unit                                                     # ERB-00 through ERB-06: all node:test unit suites
npm run test:responsive                                               # ERB-04/ERB-06: systematic multi-device sweep
npm run test:replay                                                   # ERB-04: deterministic Playwright replay driver
npm run test:conformance                                              # ERB-06: device-sensitive conformance suite
TARGET_URL=http://localhost:4321/ MINT_RESULTS=1 npm run test:conformance # Conformance + MCard certification minting
```

---

## 6. Writing a Conformance Spec

Conformance specs declare what checks apply to a target website or page. Specs are stored as JSON files under `tests/conformance/<slug>.conformance.json`:

```json
{
  "schema": "urn:mcard:schema:device_conformance_spec:v1",
  "target": "http://localhost:3001/app.html",
  "targetSlug": "localhost-3001-app-html",
  "devices": {
    "categories": ["phone", "tablet", "desktop"],
    "orientations": ["portrait", "landscape"]
  },
  "runner": "playwright",
  "checks": [
    { "id": "no-horizontal-overflow" },
    { "id": "no-console-errors" },
    { "id": "viewport-meta" },
    { "id": "key-targets-visible", "params": { "selectors": ["main", "h1"] } },
    { "id": "tap-target-size", "params": { "scope": "a, button, input, select", "min": 44 } },
    { "id": "orientation-preserves-state", "params": { "fields": ["input[type=email]"] } },
    { "id": "safe-area-insets", "params": { "selectors": ["header", "footer"] } }
  ]
}
```

### Central Fidelity Gating (`INV-DSF-01`)
Checks declare required capabilities (e.g. `safeAreaInsets`, `pointer`, `hasTouch`). If a check requires a capability that the active runner tier does not emulate (such as `safeAreaInsets` running under Playwright Tier 1), the runner centrally flags the check as `skipped: fidelity`. Individual check modules never self-skip.

---

## 7. MCard Responsive Certification (`urn:mcard:certification:responsive:v1`)

Following a full-matrix run (16 device × orientation combinations), the conformance runner mints an immutable certification MCard record:

```json
{
  "schema": "urn:mcard:certification:responsive:v1",
  "target": { "url": "http://localhost:3001/app.html", "slug": "localhost-3001-app-html" },
  "specHash": "blake3:…",
  "matrix": { "devices": 8, "orientations": 2 },
  "certified": true,
  "rule": ["INV-DEV-01", "INV-DEV-03"],
  "reports": ["blake3:…", "…"],
  "failures": [],
  "maxFidelityTier": 1
}
```

- **Certification Rule**: `certified` is `true` if and only if all 16 matrix combinations pass `INV-DEV-01` (`no-horizontal-overflow`) and `INV-DEV-03` (`orientation-preserves-state`).
- **Cryptographic Triad Storage**: The certificate is content-addressed via Blake3 and bound to the latest target handle:
  `urn:mcard:certification_latest:<slug>`.

