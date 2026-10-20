# Device-Sensitive Testing Infrastructure Guide

## 1. Overview
The `LandingPage` repository serves as a **Systematic Responsive Testing, Telemetry Capture & Replay Infrastructure** for web applications and landing pages. 

Instead of treating responsive design as an afterthought or manually checking screens, this infrastructure provides an automated, browser-observable test workbench that certifies any web target URL across 5 critical device-sensitive dimensions:
1. **Dynamic Geometry & Orientation Reflow (`INV-RVP-01`)**: Instant swapping of viewport width and height without layout clipping.
2. **Horizontal Viewport Bleed (`INV-DEV-01`)**: Verification that elements do not cause unwanted horizontal scrollbars (`scrollWidth <= innerWidth`).
3. **Touch Target Ergonomics (`INV-DEV-02`)**: Compliance auditing for touch targets ($\ge 44\text{px} \times 44\text{px}$) on mobile devices.
4. **Scale-Invariant Interaction Capture (`INV-ERB-01..03`)**: In-memory ring buffering of user and automated events with coordinates normalized to $[0.0, 1.0]$.
5. **Frame Budget & Layout Stability (`INV-DEV-04`)**: Observation of frame latency ($16.6\text{ms}$ budget) and layout freeze absence during rapid reflows.

---

## 2. Setting the Chosen LandingPage Target URL

The testing infrastructure supports testing any local development server (e.g., Astro, Vite, Next.js, or Express) or deployed staging build.

### Interactive Workbench (`responsive-lab.html`)
Launch the Responsive Lab directly bound to your chosen target:
```text
http://localhost:3001/responsive-lab.html?target=http://localhost:4321/
```
The lab shell will automatically embed `http://localhost:4321/` in the controlled viewport frame, calibrate the device stage, and initialize the event capture ribbon.

### Automated Playwright CLI
Run systematic sweeps and replay sessions via terminal:
```bash
# Sweep local dev server
TARGET_URL=http://localhost:4321/ npm run test:responsive

# Sweep internal target
TARGET_URL=app.html npm run test:responsive
```

---

## 3. Sequence of Refactoring & Architecture Roadmap

The transformation of the codebase is tracked across 6 active sprints under [`docs/sprints/_active/`](../sprints/_active/INDEX.md):

```
SPRINT-ERB-00 ──► SPRINT-ERB-01 ──► SPRINT-ERB-02 ──► SPRINT-ERB-03 ──► SPRINT-ERB-04 ──► SPRINT-ERB-05
 Modularize        Ring Buffer       Membrane &        Telemetry &       Playwright        Systematic
 responsive-lab    Core & FSM        Ergonomics        MCard Store       Replay Driver     Sweeps & Cert
```

1. **[SPRINT-ERB-00](../sprints/_active/SPRINT-ERB-00-infrastructure-refactoring.md)**: Extract monolithic inline scripts in `responsive-lab.html` into `js/harness/viewport-stage.js` and `js/harness/target-membrane.js`.
2. **[SPRINT-ERB-01](../sprints/_active/SPRINT-ERB-01-ring-buffer-core.md)**: Implement `js/harness/event-ring-buffer.js` ($N = 2048$ bounded array, zero hot-path allocation, FSM).
3. **[SPRINT-ERB-02](../sprints/_active/SPRINT-ERB-02-membrane-normalization.md)**: Implement `js/harness/membrane-interceptor.js` with scale-free spatial normalization $[0.0, 1.0]$ and touch ergonomics auditing.
4. **[SPRINT-ERB-03](../sprints/_active/SPRINT-ERB-03-mcard-clm-persistence.md)**: Implement `js/harness/telemetry-collector.js` and `server/mcard-session-adapter.mjs` persisting test runs to SQLite with `clm-kernel` hashing.
5. **[SPRINT-ERB-04](../sprints/_active/SPRINT-ERB-04-playwright-deterministic-replay.md)**: Build `scripts/playwright-replay-driver.mjs` reproducing recorded sessions with exact viewport emulation.
6. **[SPRINT-ERB-05](../sprints/_active/SPRINT-ERB-05-device-sensitive-systematic-sweeps.md)**: Execute automated multi-device matrix sweeps and mint MCard Quality Certification cards.

---

## 4. Standard Device Sweep Matrix

| Preset Identifier | Device Model | CSS Dimensions (W x H) | Aspect Ratio | DPR | Category |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `iphone-16-pro` | iPhone 16 Pro | $393 \times 852$ px | 131:284 | 3.0 | Mobile Phone |
| `galaxy-s24` | Samsung Galaxy S24 | $360 \times 780$ px | 6:13 | 3.0 | Mobile Phone |
| `pixel-8` | Google Pixel 8 | $412 \times 915$ px | ~9:20 | 2.625 | Mobile Phone |
| `ipad-air-11` | iPad Air 11" | $820 \times 1180$ px | 41:59 | 2.0 | Tablet |
| `desktop-fhd` | Desktop 1080p | $1920 \times 1080$ px | 16:9 | 1.0 | Desktop Monitor |

---

## 5. Verification Commands

```bash
# 1. Verify Ring Buffer logic
node --test tests/unit/event-ring-buffer.test.mjs

# 2. Verify Storage & Hashing Pipeline
node --test tests/unit/mcard-session-storage.test.mjs

# 3. Verify Responsive Geometry & Rotation Invariants
npx playwright test tests/features/responsive-rotation-and-devices.spec.js

# 4. Verify Layout Freeze Absence
npx playwright test tests/features/layout-freeze.spec.js

# 5. Run Full Device-Sensitive Systematic Sweep
TARGET_URL=http://localhost:4321/ npm run test:responsive
```
