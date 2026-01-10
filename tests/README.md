### Application-level configuration (`app-config.json`)

The application exposes runtime configuration via a JSON file served at the site root: `app-config.json`.

Key fields used by tests and the P2P module:

- `wsHost`, `wsPort`, `wsPath`
- `p2p.iceServers`: WebRTC ICE server list (STUN/TURN). Example:

```json
{
  "wsHost": "192.168.1.139",
  "wsPort": 3001,
  "wsPath": "/ws/",
  "p2p": {
    "iceServers": [
      { "urls": "stun:stun.l.google.com:19302" },
      { "urls": "stun:stun1.l.google.com:19302" }
    ]
  }
}
```

How it is loaded:

- The P2P module calls `resolveP2PConfig()` (see `js/modules/p2p-serverless/config.js`) which fetches `/app-config.json` and reads `p2p.iceServers`.
- Precedence for P2P settings:
  1. Module init overrides (e.g. `p2p.init({ config: { iceServers: [...] } })`)
  2. `app-config.json` → `p2p.iceServers`
  3. Built-in safe defaults

Why this matters for tests:

- You can point tests to specific STUN/TURN infrastructure without touching code.
- In constrained networks, add a TURN server here to stabilize connectivity.

# P2P Serverless End-to-End Tests

This directory contains Playwright tests for the P2P Serverless functionality of the PKC Landing Page.

## Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Install Playwright Browsers:**
   ```bash
   npm run install-browsers
   ```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Headed Mode (see browser)
```bash
npm run test:headed
```

### Debug Tests (step through)
```bash
npm run test:debug
```

### Visual Test Runner
```bash
npm run test:ui
```

### View Test Reports
```bash
npm run report
```

## Test Structure

### `p2p-connection.spec.js`

**Main Test: "should complete full P2P connection between two tabs"**

This test automates the complete P2P connection flow:

1. **Setup**: Opens two browser contexts (simulating two users)
2. **Tab 1 - Create Invitation**: Clicks "Create Invitation" button, extracts invitation code
3. **Tab 2 - Accept Invitation**: Clicks "Accept Invitation", pastes invitation code, extracts answer code
4. **Tab 1 - Complete Connection**: Clicks "Complete Connection", pastes answer code
5. **Verification**: Confirms both tabs show "Connected to 1 peer"
6. **Messaging Test**: Sends messages between connected peers
7. **Disconnect Test**: Tests disconnect functionality

**Secondary Test: "should handle connection timeouts gracefully"**

Tests error handling with expired invitation codes.

### `music-visualizer-v5.spec.js` 🆕

**Main Test: "Synchronized Music Visualizer V5"**

This suite validates the core functionality of the enhanced music visualizer:

1. **Initial State**: Verifies page load, header content, and default song selection.
2. **Song Selection**: Tests clicking song buttons and verifying that "Ready" status and sheet music (SVG) appear.
3. **Playback Control**: 
   - **Play**: Verifies timer advancement and status change to "Playing".
   - **Pause**: Verifies status change to "Paused" and icon toggling.
   - **Stop**: Verifies timer reset to 00:00 and status change to "Stopped".
   - **Restart on Play**: Confirms that clicking Play always restarts from the beginning.
4. **Immediate Stop**: Verifies that selecting a new song while playing immediately stops all audio/visual playback.
5. **Performance Metrics**: Validates that render times and worker dispatch metrics are calculated and displayed.
6. **Robustness**: Verifies that all components initialize correctly after a page reload.

## Test Architecture

### Browser Contexts
- Uses separate browser contexts to simulate different users
- Prevents cross-contamination between test sessions
- More realistic than multiple pages in same context

### Dialog Handling
- Automatically handles browser prompts for invitation codes
- Extracts and passes codes between tabs seamlessly
- No manual intervention required

### Real-time Verification
- Waits for WebRTC connection establishment
- Verifies UI updates (peer counts, status messages)
- Tests actual message exchange between peers

## Configuration

### `playwright.config.js`
- Configured for local development (localhost:8000)
- Automatically starts Python HTTP server
- Uses Chromium by default (fastest for WebRTC)
- HTML reporter for detailed test results

### Test Timeouts
- WebRTC connection: 15 seconds
- Modal appearance: 5-10 seconds
- Message delivery: 5 seconds

## Troubleshooting

### WebRTC Connection Issues
- Ensure no firewall blocking WebRTC ports
- Check STUN server connectivity
- Verify WebRTC is enabled in browser

### Test Flakiness
- WebRTC connections can be timing-sensitive
- Increase timeouts if needed in CI environments
- Use `fullyParallel: false` to avoid resource conflicts

### Browser Context Issues
- Each test creates fresh browser contexts
- Contexts are properly cleaned up after tests
- No cross-test contamination

## CI/CD Integration

For continuous integration, add to your pipeline:

```yaml
- name: Install Playwright Browsers
  run: npm run install-browsers

- name: Run P2P Tests
  run: npm test
  env:
    CI: true
```

## Manual Testing

If you prefer manual testing instead of automated tests:

1. Open two browser tabs to `http://localhost:8000/js/modules/p2p-serverless/example.html`
2. Follow the on-screen instructions
3. Tab 1: Create Invitation → Copy code
4. Tab 2: Accept Invitation → Paste Tab 1's code → Copy answer
5. Tab 1: Complete Connection → Paste Tab 2's answer
6. Send messages to verify connection

## Test Coverage

- ✅ Invitation creation and modal display (P2P)
- ✅ WebRTC connection establishment (P2P)
- ✅ Real-time messaging (P2P)
- ✅ MusicXML rendering with OSMD (Music)
- ✅ Synchronized playback and timer advancement (Music)
- ✅ Performance metrics tracking (Music)
- ✅ Interaction state management (Music)

## Performance Metrics

Typical test execution times:
- Full connection flow: 30-45 seconds
- Individual steps: 2-10 seconds each
- Message exchange: < 1 second

These tests provide comprehensive coverage of the P2P serverless functionality, ensuring reliable peer-to-peer communication across different browser contexts.
