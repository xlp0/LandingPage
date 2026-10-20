# Sprint ERB-04: Deterministic Playwright Replay Driver

## Metadata
- **Sprint Code**: `SPRINT-ERB-04`
- **Handle**: `urn:pcard:sprint:SPRINT-ERB-04`
- **Status**: `SPECIFICATION`
- **Archetype**: `ClmTriadManifest`
- **pstack Playbook**: `feature` + `principle-prove-it-works` + `principle-test-behavior-not-implementation`

---

## 1. Context & Objective
Build an automated playback engine using Playwright that consumes a recorded MCard session artifact and reproduces interactions against the **chosen LandingPage target URL** with frame-perfect determinism. 

The replay driver reads the normalized event stream, configures Playwright's device viewport, dynamically triggers orientation swaps on `orientation_change` markers, maps unscaled coordinates to active pixels, and verifies that the target application reaches the identical final state without timing drift.

---

## 2. Refactoring & Implementation Sequence

### Step 4.1: Implement `scripts/playwright-replay-driver.mjs`
- Export core replay engine:
  ```javascript
  export async function replaySession(page, targetUrl, sessionData, options = {})
  ```
- **Viewport Emulation**: Initializes `page.setViewportSize({ width, height })` matching session baseline.
- **Action Dispatcher**:
  - `click` $\rightarrow$ `page.mouse.click(Math.round(nx * width), Math.round(ny * height))`.
  - `input` $\rightarrow$ `page.locator(selector).fill(val)` with fallback to coordinate tap.
  - `orientation_change` $\rightarrow$ Dynamic viewport dimension swap (`INV-RVP-01`).
- **Timing Engine**: Reconstructs event intervals with optional acceleration multiplier ($1\times, 2\times, 5\times$) for rapid regression runs.

### Step 4.2: Build Feature Test Suite
- Implement `tests/features/responsive-replay.spec.js`:
  - Fetch latest test run card from `/api/mcard/session/:id` or local test fixture.
  - Execute replay on `page`.
  - Assert that interaction targets receive click events and target DOM mutates as expected.

---

## 3. BMAD Agent Responsibilities

### 🧪 Test Engineering Architect (TEA - Murat)
- Architect `tests/features/responsive-replay.spec.js`.
- Ensure replay timing avoids flaky race conditions by awaiting network/DOM idle states before dispatching dependent actions.
- Provide headless and headed execution modes (`--headed`, `SLOWMO=500`).

### 💻 Dev (Amelia)
- Implement `scripts/playwright-replay-driver.mjs`.
- Handle dual dispatch strategy: try CSS selector first; if shifted due to dynamic rendering, fallback to normalized relative coordinate tap.

### 📝 Tech Writer (Paige)
- Document the replay driver API and configuration flags in `docs/08-testing/REPLAY_DRIVER.md`.

---

## 4. Definition of Done (DoD) & Verification

- [ ] `vcard:sprint-erb-04:replay_driver_module_created`: `scripts/playwright-replay-driver.mjs` implemented and exported.
- [ ] `vcard:sprint-erb-04:spatial_replay_accuracy`: Normalized coordinates map accurately to target elements across device sizes.
- [ ] `vcard:sprint-erb-04:orientation_swap_reproduced`: Orientation changes dynamically swap viewport dimensions during active playback.
- [ ] `vcard:sprint-erb-04:feature_test_passes`: `npx playwright test tests/features/responsive-replay.spec.js` executes and passes cleanly.

### Execution Command:
```bash
npx playwright test tests/features/responsive-replay.spec.js --project=features
```
