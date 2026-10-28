# How to Open and Use the Responsive UI Lab Workbench

| Field | Value |
| --- | --- |
| Audience | Operators, QA engineers, UX designers, and developers testing web targets in Responsive UI Lab |
| BMAD Owner | UX Designer (`bmad-agent-ux-designer`) and Test Architect |
| Source of Truth | [`src/pages/responsive-lab.astro`](../../src/pages/responsive-lab.astro), [`js/harness/`](../../js/harness/), and [`app-config.json`](../../app-config.json) |
| Drift Gate | `npm run docs:check` |

This guide explains how to launch and operate the **Responsive UI Lab** workbench (`/responsive-lab.html`), keeping the **workbench** distinct from the **target under test** inside `#mission-control-iframe`.

## 1. Launch the Workbench

Build once and start the server on port **`3000`**.

```bash
npm run build
npm start
```

Open `http://localhost:3000/responsive-lab.html` (or `http://localhost:4322/responsive-lab.html` when running `npm run dev`).

## 2. Select a Target Under Test (`INV-STU-01`, `INV-STU-02`)

Built-in targets come from `/app-config.json` (`urn:gqc:lab-config:v1`). Choose a target chip, type a URL into `#target-url-input`, or pass `?target=` in the query string.

```text
http://localhost:3000/responsive-lab.html?target=/tests/fixtures/spa-test-target.html
http://localhost:3000/responsive-lab.html?target=http://localhost:4321/
```

- **SPA Target (`/tests/fixtures/spa-test-target.html`)** activates full Petri net Place and Transition tracking against `tests/fixtures/spa-test-target.graph.json`.
- **MPA Candidate (`/index.html`)** and **MCard `webapp` Target (`/app.html`)** run same-origin inside the stage without loop-redirecting.
- **Blocked or Unapproved Cross-Origin URLs** enter explicit recoverable workbench error Places (`p_error_target_blocked`, `p_error_target_unapproved`, `p_error_handshake_timeout`) with a one-click `#btn-cors-alert-recover` recovery action (`t_recover_*`).

## 3. Choose Device Geometry and Orientation (`INV-RVP-01`, `INV-RVP-02`)

- **Eight Built-In Device Presets** span phones (`iPhone 16 Pro`, `iPhone SE`, `Google Pixel 8`, `Samsung Galaxy S24`), tablets (`iPad Air 11"`, `iPad Mini`), and desktops (`MacBook Air 13"`, `Desktop 1080p`).
- **Orientation Swap** transposes width and height ($W \leftrightarrow H$) via `#btn-rotate-viewport`.
- **Stage Containment** scales the iframe inside `.viewport-scale-wrapper` by $s = \min(1, W_{\text{available}} / w, H_{\text{available}} / h)$ so the outer workbench window never scrolls horizontally or vertically.

## 4. Walk the 5-Step Guided SPA Workflow (`SpaTestWorkflow`)

The `#spa-test-workflow` region guides verification across five keyboard-accessible tabs (`ArrowRight`, `ArrowLeft`, `Home`, `End`).

1. **Target** verifies target classification (`spa`, `mpa-candidate`, `webapp`, or policy error) and capture channel (`same-origin`, `probe-agent`, or `unavailable`).
2. **Device** confirms active preset dimensions, orientation, and fidelity tier (`T0` in-browser iframe).
3. **Places** inspects declared `PlaceMCard` nodes (`clm://type/view/...`) and highlights the live active Place inside the iframe.
4. **Transitions** tracks `TransitionMCard` firings, flags unmapped transitions (`p_spa_missing_transition` / `p_error_modal`), and exercises recovery (`t_spa_recover_overview`).
5. **Evidence** links completed `responsive_test_run:v1` captures to `NetMCard` and `FiringReceiptMCard` hashes via a separate `urn:gqc:navigation-run-link:v1` MCard.

## 5. Record, Persist, and Replay (`INV-ERB-01..04`)

- Click **Record** (`#rec-btn-start`) to capture pointer, keyboard, scroll, and viewport events normalized to $[0.0, 1.0]$ with sensitive input redaction (`INV-PRV-01`).
- Click **Stop** (`#rec-btn-stop`) to finalize the run (`clmKernel: '0.0.13'`) and persist it to `/api/test-runs` in the SQLite Triad (`data/mcard-api.db`). Interrupted sessions save separately as `urn:gqc:interrupted-capture:v1` (`Incomplete Capture`) and never masquerade as passing runs.
- Open the deferred **Conformance** (`#conformance-disclosure`) or **MCard Result** (`#mcard-result-disclosure`) panels to inspect the 15-check conformance report and Triad Blake3 digest, or replay headlessly via `npm run test:replay`.
