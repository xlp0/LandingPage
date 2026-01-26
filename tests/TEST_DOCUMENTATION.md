# Test Suite Documentation

This document provides comprehensive documentation of the Playwright E2E test suite for the PKC Landing Page project.

## Test Organization

The test suite is organized into three categories with separate Playwright projects:

| Category | Directory | Purpose | Timeout | Command |
|----------|-----------|---------|---------|---------|
| 🚀 **Smoke** | `tests/smoke/` | Fast navigation validation | 30s | `npm run test:smoke` |
| 🧩 **Components** | `tests/components/` | CLM component testing | 60s | `npm run test:components` |
| 🎨 **Features** | `tests/features/` | Deep feature testing | 120s | `npm run test:features` |

## Quick Start

```bash
# Start WebSocket server (required for CLM/component tests)
node ws-server.js

# Run smoke tests only (~15s) - ideal for quick validation
npm run test:smoke

# Run component tests (~60s)
npm run test:components

# Run feature tests (~120s)
npm run test:features

# Run all tests
npm run test

# View HTML report
npm run report
```

## Directory Structure

```
tests/
├── smoke/                    # Fast navigation tests
│   ├── landing-page.spec.js  # Page load, header, sidebar
│   ├── clm-dashboard.spec.cjs # Dashboard load, registry
│   └── apps-menu.spec.js     # Apps menu navigation
├── components/               # CLM component tests
│   ├── test-clm-youtube-viewer.spec.cjs
│   ├── test-clm-welcome.spec.cjs
│   └── ... (14 component tests)
├── features/                 # Complex feature tests
│   ├── music-visualizer-v5.spec.js
│   ├── chat-panel.spec.js
│   └── new-text-card.spec.js
├── fixtures/                 # Shared test utilities
│   └── clm-helpers.js
├── test-components/          # JSON component configs
└── test-results/             # Test output
```

## Smoke Tests

Fast validation tests that should pass in ~15 seconds.

### Landing Page (`tests/smoke/landing-page.spec.js`)
- Page loads with correct title
- Header elements are visible
- Sidebar is visible and collapsible
- Apps menu opens
- Main content container is visible

### CLM Dashboard (`tests/smoke/clm-dashboard.spec.cjs`)
> **Note:** Requires WebSocket server on port 3001

- Dashboard loads successfully
- Component registry populates sidebar
- Loading overlay disappears
- Layout columns are visible

### Apps Menu (`tests/smoke/apps-menu.spec.js`)
- Apps submenu contains expected items
- Music Visualizer view opens/closes
- Map view opens/closes
- 3D Viewer opens/closes

## Component Tests

CLM Dashboard component tests (14 files).

| Component | Test File |
|-----------|-----------|
| YouTube Video Viewer | `test-clm-youtube-viewer.spec.cjs` |
| Welcome | `test-clm-welcome.spec.cjs` |
| Wikipedia Search | `test-clm-wikipedia-search.spec.cjs` |
| Wikipedia Viewer | `test-clm-wikipedia-viewer.spec.cjs` |
| Google Maps | `test-clm-google-maps.spec.cjs` |
| Grafana Faro | `test-clm-grafana-faro.spec.cjs` |
| Hero Content | `test-clm-hero-content.spec.cjs` |
| P2P Status | `test-clm-p2p-status.spec.cjs` |
| PKC Viewer | `test-clm-pkc-viewer.spec.cjs` |
| User List | `test-clm-user-list.spec.cjs` |
| User Detail | `test-clm-user-detail.spec.cjs` |
| External Site Demo | `test-clm-external-site-demo.spec.cjs` |
| Redux State Viewer | `test-clm-redux-state-viewer.spec.cjs` |
| Crash Test | `test-clm-crash-test.spec.cjs` |

## Feature Tests

Deep testing of complex features.

### Music Visualizer (`tests/features/music-visualizer-v5.spec.js`)
- Initial page state
- Song selection and rendering
- Playback controls (play/pause/stop)
- Performance metrics
- Song change behavior

### Chat Panel (`tests/features/chat-panel.spec.js`)
- Panel opens and closes
- Can be reopened after closing
- Contains input elements

### New Text Card (`tests/features/new-text-card.spec.js`)
- Panel opens with correct elements
- Allows text input

## Shared Fixtures

### `tests/fixtures/clm-helpers.js`

Common utilities for CLM Dashboard testing:

```javascript
const { navigateToDashboard, waitForDashboardReady, clickComponent, 
        verifyComponentIframe, setupComponent } = require('./fixtures/clm-helpers');
```

## Running Tests

### By Category

```bash
npm run test:smoke        # Quick validation
npm run test:components   # CLM components
npm run test:features     # Deep features
```

### With Options

```bash
npm run test:ui           # Interactive UI mode
npm run test:headed       # See browser
npm run test:debug        # Debug mode
```

### Filtered

```bash
# Run specific test file
npx playwright test tests/smoke/landing-page.spec.js

# Run tests matching pattern
npm run test:smoke -- --grep "Landing Page"
```

## Prerequisites

1. **Python** - For static file server (Playwright auto-starts on port 8000)
2. **Node.js** - For WebSocket server (port 3001, required for CLM tests)

```bash
# Install Playwright browsers
npm run install-browsers
```

## Recent Updates (January 2026)

### Test Reorganization
- Separated tests into smoke, components, and features categories
- Added Playwright projects with category-specific timeouts
- Created shared fixtures for common operations

### Fixes Applied
- Process polyfill for Redux Toolkit ESM compatibility
- PWA modal dismissal improvements
- Selector updates for CLM dashboard

## License

MIT
