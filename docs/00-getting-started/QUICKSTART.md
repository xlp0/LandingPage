# Quick Start Guide (5 Minutes)

| Field | Value |
| --- | --- |
| Audience | Developers and QA engineers running LandingPage locally for the first time |
| BMAD Owner | Developer (`bmad-agent-dev`) |
| Source of Truth | [`package.json`](../../package.json) and [`ws-server.js`](../../ws-server.js) |
| Drift Gate | `npm run docs:check` |

## 1. Install and Build

Ensure Node.js `>= 18` is installed, then build the Astro client and server bundles.

```bash
cd LandingPage
npm install
npm run build
```

## 2. Start the Server

Start the unified Express, WebSocket, and Astro middleware server on port **`3000`**.

```bash
npm start
```

For hot-reloading Astro development alongside the Express API server, run `npm run dev`, which starts `astro dev` on **`http://localhost:4322`** and `ws-server.js` on **`http://localhost:3000`** (keeping `4321` free for external target apps).

## 3. Open the Responsive UI Lab Workbench

Open `http://localhost:3000/responsive-lab.html` in your browser. The workbench supports four core workflows.

- Switch between approved targets in the toolbar omnibar (such as `/tests/fixtures/spa-test-target.html`, `/index.html`, `/app.html`, or an external local target like `http://localhost:4321/`).
- Pick any of the 8 built-in device profiles (`iPhone 16 Pro`, `Pixel 8`, `iPad Air`, `Desktop 1080p`, and others) and swap Portrait and Landscape orientation.
- Step through the 5-tab **SPA Test Workflow** (`Target`, `Device`, `Places`, `Transitions`, `Evidence`).
- Record normalized interactions, persist `responsive_test_run:v1` MCards (`clmKernel: '0.0.13'`) to `/api/test-runs`, and inspect conformance results.

To open the **Single-Page 4-Modality MCard Viewer** instead of redirecting `/` to the Lab, open `http://localhost:3000/?noredirect=1`.

## 4. Run Verification Gates

Playwright suites automatically boot an isolated server on `TEST_PORT=3001`.

```bash
npm run check:net
npm run docs:check
npm run test:unit
npm run test:smoke
npm run test:components
npm run test:responsive
npm run test:replay
npm run test:conformance
```

## 5. Next Steps

- [OPEN_AND_USE.md](./OPEN_AND_USE.md) for detailed workbench controls.
- [astro-host-and-islands.md](../01-architecture/astro-host-and-islands.md) for Astro 7 middleware and island details.
- [DEVICE_SENSITIVE_TESTING_INFRASTRUCTURE.md](../08-testing/DEVICE_SENSITIVE_TESTING_INFRASTRUCTURE.md) for Playwright test architecture.
