# Device-Sensitive Testing Infrastructure Guide

| Field | Value |
| --- | --- |
| Audience | QA engineers, developers, and operators certifying responsive web targets with Responsive UI Lab and Playwright |
| BMAD Owner | Test Architect and Architect (`bmad-agent-architect`) |
| Source of Truth | [`js/device-registry.js`](../../js/device-registry.js), [`js/harness/`](../../js/harness/), [`scripts/playwright-replay-driver.mjs`](../../scripts/playwright-replay-driver.mjs), and [`server/test-run-api.mjs`](../../server/test-run-api.mjs) |
| Consensus Kernel | `clm-kernel@0.0.13` |

## 1. Overview

`LandingPage` provides an automated, browser-observable **Responsive Test Workbench** (`/responsive-lab.html`, Place `p_page_responsive_lab`) that certifies a chosen target URL (distinct from the workbench itself) across five device-sensitive dimensions plus CLM Petri net navigation verification:

1. **Dynamic Geometry and Orientation Reflow (`INV-RVP-01`)** swaps viewport width and height ($W \leftrightarrow H$) without clipping or outer window scrollbars (`INV-RVP-02`).
2. **Horizontal Viewport Bleed (`INV-DEV-01`)** verifies `document.documentElement.scrollWidth <= window.innerWidth` across all viewports.
3. **Touch Target Ergonomics (`INV-DEV-02`)** audits interactive controls ($\ge 44\text{px} \times 44\text{px}$) on coarse-pointer profiles.
4. **Scale-Invariant Interaction Capture (`INV-ERB-01..04`)** buffers normalized $[0.0, 1.0]$ coordinates in memory ($N \le 2048$), redacts sensitive inputs (`INV-PRV-01`), stamps `lab.clmKernel: '0.0.13'` on new `responsive_test_run:v1` records (while keeping historical `0.0.10` runs readable), and persists Triad Blake3 MCards.
5. **Frame Budget and Layout Stability (`INV-DEV-04`)** tracks $16.6\text{ms}$ ($60\text{fps}$) frame budgets and Cumulative Layout Shift (CLS).

> [!NOTE]
> Sprints `ERB-00..06` ([`docs/sprints/08-testing/`](../sprints/08-testing/INDEX.md)) and `SPRINT-GQC-00..07` ([`docs/sprints/_active/`](../sprints/_active/INDEX.md)) are implemented and verified. Every run declares its emulation fidelity tier (`INV-DSF-01`) across **T0** (in-browser Lab iframe emulating CSS viewport), **T1/T2** (Playwright browser context adding DPR, touch, mobile UA, media features, and CDP throttling at T2), and **T3** (physical LAN hardware).

---

## 2. Launching the Workbench and Selecting a Target URL

### Interactive Workbench (`http://localhost:3000` by default)

`npm start` runs `ws-server.js` on port **`3000`** (`npm run dev` adds `astro dev` on port **`4322`** while keeping `4321` free for external targets):

```text
http://localhost:3000/responsive-lab.html?target=/tests/fixtures/spa-test-target.html
http://localhost:3000/responsive-lab.html?target=http://localhost:4321/
```

### Automated Playwright CLI (`TEST_PORT=3001`)

Playwright's `webServer` boots an isolated `ws-server.js` instance on **`http://127.0.0.1:3001`** with a temporary `MCARD_DB_PATH`. Start external targets such as `:4321` separately if sweeping an external app; when an external target is down, target preflight skips cleanly with an explicit reason.

```bash
TARGET_URL=/tests/fixtures/spa-test-target.html npm run test:responsive
TARGET_URL=app.html npm run test:responsive
FAST_MODE=1 HEADED=1 SLOWMO=250 TARGET_URL=app.html npm run test:responsive
TARGET_URL=http://localhost:4321/ npm run test:replay
```

---

## 3. Architecture Progression (`Program ERB` + `Program GQC`)

1. **[SPRINT-ERB-00](../sprints/08-testing/SPRINT-ERB-00-infrastructure-refactoring.md)** extracted `viewport-stage.js`, `target-membrane.js`, and `lab-toolbar.js` with single-writer `iframe.src` (`INV-STU-01`) and `/app-config.json` target registry (`INV-STU-02`).
2. **[SPRINT-ERB-01](../sprints/08-testing/SPRINT-ERB-01-ring-buffer-core.md)** implemented `event-ring-buffer.js` ($N \le 2048$) and the 20-pair `recording-state-machine.js`.
3. **[SPRINT-ERB-05](../sprints/08-testing/SPRINT-ERB-05-device-capability-profiles.md)** added schema v2 device capability profiles (`js/device-registry.js`) and fidelity resolvers (`js/harness/fidelity.js`).
4. **[SPRINT-ERB-02](../sprints/08-testing/SPRINT-ERB-02-membrane-normalization.md)** added `membrane-interceptor.js`, `lab-probe-agent.js`, $[0.0, 1.0]$ coordinate normalization, and $\ge 44\text{px}$ tap auditing.
5. **[SPRINT-ERB-03](../sprints/08-testing/SPRINT-ERB-03-mcard-clm-persistence.md)** added `telemetry-collector.js` and SQLite Triad persistence (`server/test-run-api.mjs`) using `clm-kernel` Blake3 hashing.
6. **[SPRINT-ERB-04](../sprints/08-testing/SPRINT-ERB-04-playwright-deterministic-replay.md)** added `scripts/playwright-replay-driver.mjs` and the 16-case multi-device sweep (`tests/features/systematic-landing-test.spec.js`).
7. **[SPRINT-ERB-06](../sprints/08-testing/SPRINT-ERB-06-device-sensitive-conformance.md)** added the 15-check conformance catalog (`tests/conformance/checks/`) and `urn:mcard:certification:responsive:v1`.
8. **[Program GQC (`SPRINT-GQC-00..07`)](../sprints/_active/INDEX.md)** wrapped the workbench in `astro@7.4.2` with 7 Preact islands (`SpaTestWorkflow`), formalized Page-as-Place (`PlaceMCard`) and Functional-Link-as-Transition (`TransitionMCard` + `FiringReceiptMCard`), linked runs via `urn:gqc:navigation-run-link:v1`, aligned `recorder.js` to `clm-kernel@0.0.13`, and enforced `npm run docs:check`.

---

## 4. Standard Device Sweep Matrix

Every sweep derives dimensions from [`js/device-registry.js`](../../js/device-registry.js) via `tests/fixtures/device-matrix.js` (`8` devices x `2` orientations = `16` cases):

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

---

## 5. Conformance Specs and Responsive Certification (`urn:mcard:certification:responsive:v1`)

Conformance specs live under `tests/conformance/<slug>.conformance.json` (note that Playwright tests target `TEST_PORT=3001`, so the built-in `app.html` test fixture uses `http://localhost:3001/app.html`):

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
    { "id": "tap-target-size", "params": { "scope": "a, button, input, select", "min": 44 } }
  ]
}
```

When all 16 device and orientation combinations pass `INV-DEV-01` (`no-horizontal-overflow`) and `INV-DEV-03` (`orientation-preserves-state`), the conformance runner mints `urn:mcard:certification:responsive:v1` hashed with Triad Blake3 (`clm-kernel@0.0.13`) and bound to `urn:mcard:certification_latest:<slug>`.
