# LandingPage Test Suite

This directory holds unit, observability, smoke, component, and feature tests for the LandingPage workbench and its target fixtures.

## Setup

1. Install dependencies from the repository root.
   ```bash
   npm ci
   ```
2. Install the Playwright Chromium browser binary.
   ```bash
   npm run install-browsers
   ```

## Commands

| Command | Scope |
| --- | --- |
| `npm run check:playwright-discovery` | Verifies non-zero discovery and zero spec overlap across configured Playwright projects |
| `npm run test:unit` | Runs `node --test` across `tests/*.test.*`, `tests/unit/**/*.test.*`, and `tests/observability/**/*.test.*` |
| `npm run test:smoke` | Runs `--project=smoke` (11 spec files, 30 tests) |
| `npm run test:components` | Runs `--project=components` (14 spec files, 18 tests) |
| `npm run test:features` | Runs `--project=features` (17 spec files, 557 tests) |
| `npm run test:smoke:cross-browser` | Runs `smoke`, `smoke-firefox`, and `smoke-webkit` when `PW_CROSS_BROWSER=1` |
| `npm test` | Runs all three default Playwright category projects once per spec file |
| `npm run report` | Opens the HTML report from `playwright-report/` |

## Port and Server Contract

`tests/fixtures/server-contract.js` defines the runtime server contract shared by `playwright.config.js` and `tests/fixtures/test-config.js`.

| Port | Owner | Purpose |
| --- | --- | --- |
| `3000` | `ws-server.js` | Default standalone Express and WebSocket server port when `PORT` is unset |
| `3001` | Playwright `webServer` | Default `TEST_PORT` probed via `GET /health` during test runs |
| `4322` | Reserved Astro seam | Future `astro dev` port selectable via `TEST_PORT=4322` and `TEST_SERVER_COMMAND` |

### Server Reuse and Database Isolation

- `reuseExistingServer` defaults to `false` locally and in CI so Playwright fails fast if an unrelated server occupies `TEST_PORT`.
- Set `PW_REUSE_SERVER=1` outside CI only when intentionally attaching to a pre-started local server.
- Each Playwright run assigns an isolated temporary `MCARD_DB_PATH` and rejects `data/mcard-api.db`, keeping the tracked repository SQLite database untouched.

## Application Runtime Configuration (`app-config.json`)

`app-config.json` at the repository root supplies WebSocket and WebRTC settings for browser modules such as `js/modules/p2p-serverless/config.js`.

```json
{
  "wsHost": "localhost",
  "wsPort": 3001,
  "wsPath": "/ws/",
  "p2p": {
    "iceServers": [
      { "urls": "stun:stun.l.google.com:19302" }
    ]
  }
}
```

## Artifact Locations

- HTML report output writes to `playwright-report/`.
- JUnit XML writes to `test-results/junit.xml`.
- Failure screenshots and `trace.zip` archives write to `test-results/`.
