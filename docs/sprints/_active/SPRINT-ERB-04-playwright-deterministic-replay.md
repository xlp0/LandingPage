# Sprint ERB-04: Systematic Multi-Device Sweeps & Playwright Replay

## Metadata
- **Sprint Code**: `SPRINT-ERB-04`
- **Handle**: `urn:pcard:sprint:SPRINT-ERB-04`
- **Status**: `SPECIFICATION`
- **Archetype**: `ClmTriadManifest`
- **pstack Playbook**: `feature` + `principle-prove-it-works`

---

## 1. Context & Objective
Build an automated systematic test sweep and deterministic playback driver using Playwright. The driver loads the **chosen LandingPage target URL** (e.g. `http://localhost:4321/` or `app.html`), executes multi-device viewport sweeps, reproduces recorded user interactions from MCard test artifacts, collects layout & performance test data, and verifies state with frame-perfect determinism.

---

## 2. BMAD Agent Responsibilities

### 🧪 Test Engineering Architect (TEA - Murat)
- Architect `tests/features/systematic-landing-test.spec.js`:
  - Parameterize test suite with `TARGET_URL = process.env.TARGET_URL || 'http://localhost:4321/'`.
  - Systematic Multi-Device Matrix:
    1. **Mobile Portrait**: iPhone 16 Pro ($393 \times 852$) & Pixel 8 ($412 \times 915$).
    2. **Mobile Landscape**: Rotated phone dimensions ($852 \times 393$) per `INV-RVP-01`.
    3. **Tablet**: iPad Pro 11 ($834 \times 1194$).
    4. **Desktop**: Standard 1080p ($1920 \times 1080$).
  - Systematic Assertions per Viewport:
    - Zero horizontal viewport overflows (`document.documentElement.scrollWidth <= window.innerWidth`).
    - Bounding box visibility for key interaction targets.
    - Zero console error exceptions.
  - Automated Playback Runner:
    - Replay recorded session events against target:
      - `orientation_change` $\rightarrow$ `page.setViewportSize({ width, height })`.
      - `click` $\rightarrow$ `page.mouse.click(Math.round(nx * width), Math.round(ny * height))`.
      - `input` $\rightarrow$ `page.fill(selector, value)`.
    - Compare final DOM state against expected outcome.
    - Export test run telemetry directly to MCard API (`/api/mcard/session/save`).

### 💻 Dev (Amelia)
- Implement `scripts/playwright-replay-driver.mjs`:
  - Export `async function replaySession(page, targetUrl, sessionMCard, options = {})`.
  - Coordinate calculation: maps unscaled $nx, ny$ to active viewport pixels.
  - Resilient selector matching with fallback to coordinate tap.
- Provide CLI runner script:
  ```bash
  TARGET_URL=http://localhost:4321/ node scripts/run-systematic-sweep.mjs
  ```

### 📝 Tech Writer (Paige)
- Author developer guide: `docs/08-testing/SYSTEMATIC-LANDING-TESTING.md`:
  - Step-by-step instructions on binding a target URL.
  - Running systematic multi-device sweeps.
  - Inspecting generated MCard test datasets in SQLite.
- Update `CHANGELOG.md` with Sprint ERB-01..04 deliverables.

---

## 3. Technical Specification

### 3.1 Systematic Sweep Matrix
| Phase | Viewport Mode | Dimensions (W x H) | Orientation | Checks Performed |
| :--- | :--- | :--- | :--- | :--- |
| **01** | iPhone 16 Pro | $393 \times 852$ px | Portrait | Layout fit, tap target bounds, zero overflow |
| **02** | iPhone 16 Pro | $852 \times 393$ px | Landscape (`INV-RVP-01`) | Dimension swap, header reflow, zero overflow |
| **03** | iPad Pro 11 | $834 \times 1194$ px | Portrait | Multi-column grid reflow, typography scale |
| **04** | Desktop | $1920 \times 1080$ px | Landscape | Full stage layout, telemetry capture |
| **05** | Replay | Matching Session | Dynamic | Interaction stream reproduction & state parity |

---

## 4. Definition of Done (DoD) & Verification

- [ ] `vcard:sprint-erb-04:systematic_test_suite_implemented`: `tests/features/systematic-landing-test.spec.js` sweeps target across device matrix.
- [ ] `vcard:sprint-erb-04:replay_driver_executed`: Recorded user sessions replay with exact spatial and timing fidelity.
- [ ] `vcard:sprint-erb-04:test_data_mcard_minted`: Multi-device test metrics and telemetry are successfully minted to `data/mcard-api.db`.
- [ ] `vcard:sprint-erb-04:target_customization_verified`: Suite executes cleanly with both `TARGET_URL=http://localhost:4321/` and `TARGET_URL=app.html`.
- [ ] `vcard:sprint-erb-04:documentation_published`: Complete guide published in `docs/08-testing/SYSTEMATIC-LANDING-TESTING.md`.

### Execution Command:
```bash
TARGET_URL=http://localhost:4321/ npx playwright test tests/features/systematic-landing-test.spec.js --project=features
```
