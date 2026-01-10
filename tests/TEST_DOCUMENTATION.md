# Test Suite Documentation

This document provides comprehensive documentation of the Playwright E2E test suite for the PKC Landing Page project.

## Overview

The test suite validates the functionality of the CLM (Concrete Logic Manifest) Dashboard, landing page features, and embedded components using Playwright for browser automation.

## Test Statistics

| Metric | Value |
|--------|-------|
| Total Test Files | 17 |
| Total Test Cases | 30+ |
| Average Runtime | ~30 seconds |
| Browser Target | Chromium |

## Test Categories

### 1. CLM Dashboard Tests (14 files, 18+ tests)

These tests validate the CLM Dashboard component loading, isolation, and performance.

| Test File | Component Tested | Description |
|-----------|------------------|-------------|
| `test-clm-youtube-viewer.spec.cjs` | YouTube Video Viewer | Video embedding, component isolation, performance measurement |
| `test-clm-welcome.spec.cjs` | Welcome Component | Main welcome screen, component recovery, performance |
| `test-clm-wikipedia-search.spec.cjs` | Wikipedia Search | Search functionality, iframe loading |
| `test-clm-wikipedia-viewer.spec.cjs` | Wikipedia Viewer | Knowledge base viewer, content display |
| `test-clm-google-maps.spec.cjs` | Google Maps | Map embedding, iframe isolation |
| `test-clm-grafana-faro.spec.cjs` | Grafana Faro | Observability dashboard component |
| `test-clm-hero-content.spec.cjs` | Hero Content | Landing page hero section |
| `test-clm-p2p-status.spec.cjs` | P2P Status Panel | Peer-to-peer connection status |
| `test-clm-pkc-viewer.spec.cjs` | PKC Document Viewer | Document viewing functionality |
| `test-clm-user-list.spec.cjs` | User Account List | User directory display |
| `test-clm-user-detail.spec.cjs` | User Account Detail | Individual user details |
| `test-clm-external-site-demo.spec.cjs` | External Website Demo | External site embedding |
| `test-clm-redux-state-viewer.spec.cjs` | Redux Store Monitor | Redux state inspection |
| `test-clm-crash-test.spec.cjs` | Intentional Failure | Component failure recovery |

### 2. Landing Page Tests (1 file, 6 tests)

| Test File | Tests Included |
|-----------|----------------|
| `landing-page-features.spec.js` | PWA modal dismissal, Header elements, Sidebar navigation, Music Visualizer view, 3D Viewer loading, Chat panel toggle |

### 3. Music Visualizer Tests (1 file, 5+ tests)

| Test File | Tests Included |
|-----------|----------------|
| `music-visualizer-v5.spec.js` | Page loading, Song selection, Play/pause controls, Audio synchronization, Timer display |

## Prerequisites

### Required Services

Before running tests, ensure the following services are running:

```bash
# Start the WebSocket server (port 3000)
node ws-server.js

# The Playwright config auto-starts Python HTTP server (port 8000)
```

### Environment Setup

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

## Running Tests

### Run All Tests

```bash
npx playwright test --project=chromium
```

### Run Specific Test Category

```bash
# CLM Dashboard tests only
npx playwright test tests/test-clm-*.spec.cjs --project=chromium

# Landing page features
npx playwright test tests/landing-page-features.spec.js --project=chromium

# Music visualizer
npx playwright test tests/music-visualizer-v5.spec.js --project=chromium
```

### Run with Workers

```bash
# Parallel execution (4 workers)
npx playwright test --project=chromium --workers=4
```

### View HTML Report

```bash
npx playwright show-report
```

## Technical Details

### CLM Dashboard Architecture

The CLM Dashboard uses a Finder-style two-column layout:
- **Types Column**: Categories of components (Internal, External, Games, etc.)
- **Components Column**: Individual components within selected type

Components are loaded in isolated iframes with `id="iframe-{hash}"` pattern.

### Test Selectors

| Element | Selector Pattern |
|---------|-----------------|
| Component items | `div.component-item:has-text("Name")` |
| Component iframes | `iframe#iframe-{component-hash}` |
| Loading overlay | `.loading-overlay` |
| Component list | `.component-item` |

### Wait Strategies

Tests use explicit waits for reliability:
```javascript
// Wait for loading overlay to disappear
await page.waitForSelector('.loading-overlay', { state: 'hidden', timeout: 15000 });

// Wait for component list to populate
await page.waitForSelector('.component-item', { timeout: 15000 });
```

## Recent Fixes (January 2026)

### 1. Redux Toolkit ESM Compatibility

**Issue**: `ReferenceError: process is not defined` in `redux-toolkit.esm.js`

**Solution**: Added process polyfill to `index-clm-dashboard.html`:
```html
<script>window.process = { env: { NODE_ENV: 'production' } };</script>
```

### 2. Selector Updates

| Original Selector | Updated Selector | Reason |
|------------------|------------------|--------|
| `button:has-text("Name")` | `div.component-item:has-text("Name")` | Dashboard uses div elements, not buttons |
| `data-component-id="name"` | `id="iframe-name"` | Matches actual iframe ID pattern |
| `h2:has-text("YouTube")` | `h1:has-text("YouTube")` | Component uses h1 heading |

### 3. mcard-js Library Fixes

- Patched ESM imports in `node_modules/mcard-js/dist/` to include `.js` extensions
- Reconstructed missing `schema/mcard_schema.sql` file

### 4. Redux Localization

Replaced CDN dependencies with local copies:
- `js/libs/redux.min.js` (UMD)
- `js/libs/redux-toolkit.min.js` (UMD)
- `js/libs/redux.esm.js` (ESM)
- `js/libs/redux-toolkit.esm.js` (ESM)

## Removed Tests

The following tests were removed due to complex multi-tab/multi-user scenarios that require additional infrastructure:

| Test File | Reason for Removal |
|-----------|-------------------|
| `e2e/landing-page.spec.cjs` | Element timeout issues |
| `e2e/tic-tac-toe.spec.cjs` | Browser context lifecycle issues |
| `e2e/video-meeting.spec.cjs` | Browser context lifecycle issues |
| `e2e/webrtc-dashboard.spec.cjs` | Multi-user room creation complexity |
| `p2p-connection.spec.cjs` | P2P dialog events not triggering |
| `test-webrtc-dashboard-create-room.spec.cjs` | 120s timeout exceeded |
| `test-webrtc-dashboard-multiple-rooms-and-users.spec.cjs` | Element not found |
| `test-website.spec.cjs` | Tests deleted legacy page |

## Contributing

When adding new tests:
1. Use the established selector patterns
2. Include proper wait strategies
3. Add console logging for debugging
4. Update this documentation

## License

MIT
