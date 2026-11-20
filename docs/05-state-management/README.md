# State Management Architecture

| Field | Value |
| --- | --- |
| Audience | Engineers, architects, and QA reviewers working in this documentation tier |
| BMAD Owner | Architect (`bmad-agent-architect`) and Developer (`bmad-agent-dev`) |
| Source of Truth | [`js/harness/lab-runtime.js`](../../js/harness/lab-runtime.js) and [`js/harness/recording-state-machine.js`](../../js/harness/recording-state-machine.js) |

This directory documents active state management in `LandingPage`, centered on the `lab-runtime.js` coordinator, Astro Preact islands, the deterministic 20-pair `RecordingStateMachine`, and schema-validated `DeviceRegistry` persistence. Legacy Redux stores (`js/redux/` and `js/store/`) and Redux npm packages were retired in `SPRINT-SLC-03`.

---

## Active State Architecture

```text
+-------------------------------------------------------------------+
|                     LandingPage State Model                       |
|                                                                   |
|  +---------------------------+  +------------------------------+  |
|  |   Lab Runtime Coordinator |  |     Recording FSM & Store    |  |
|  |  (js/harness/lab-runtime) |  |      (Deterministic 20)      |  |
|  +---------------------------+  +------------------------------+  |
|  | - Astro Preact islands    |  | - IDLE                       |  |
|  | - Target selection/fit    |  | - RECORDING                  |  |
|  | - Conformance & Bombadil  |  | - PAUSED / STOPPED           |  |
|  | - Triad MCard receipts    |  | - DeviceRegistry v2 profile  |  |
|  +---------------------------+  +------------------------------+  |
+-------------------------------------------------------------------+
```

1. **Lab Runtime & Astro Preact Islands (`js/harness/lab-runtime.js`, `src/islands/`)**:
   - Coordinates target loading, viewport/device arrangement, conformance checks, and Bombadil test execution via `window.__lab` and DOM custom events (`lab:*`).
   - Maintains in-memory stores for legacy harnesses (`archive/html/index-clm-dashboard.html`, `js/modules/auth-manager.js`) without external state libraries.
2. **Deterministic Recording State Machine (`INV-ERB-03`)**:
   - Manages test interaction recording in the Responsive UI Lab.
   - Enforces a closed 20-pair `(state, action) -> nextState` transition table.
   - Decoupled from the data layer (`EventRingBuffer`, `INV-ERB-01`) for pure testability and zero jank.
3. **Device Registry Persistence (`INV-RVP-03`, `INV-DSF-02`)**:
   - Manages device profiles and custom viewports with schema v2 validation and self-healing `localStorage` fallback.

---

## Historical Reference Archives (`SPRINT-SLC-03` Retired)

The documents below remain only as historical design records from prior to `SPRINT-SLC-03` (`js/redux/` and `js/store/` removed):

- **[redux/INDEX.md](redux/INDEX.md)** - Historical Redux store overview and slice index.
- **[redux/REDUX_ARCHITECTURE.md](redux/REDUX_ARCHITECTURE.md)** - Historical state architecture and action flows.
- **[redux/slices/](redux/slices/)** - Historical slice specifications (`auth-slice.md`, `clm-slice.md`, `rtc-connection-slice.md`, `participants-slice.md`, `invitations-slice.md`).
- **[REDUX_SLICES_IMPLEMENTATION.md](REDUX_SLICES_IMPLEMENTATION.md)** - Historical slice implementation notes.
- **[REDUX_AUTH_TESTING.md](REDUX_AUTH_TESTING.md)** - Historical auth slice test notes.
- **[REDUX_FIX_SUMMARY.md](REDUX_FIX_SUMMARY.md)** - Historical reducer bug-fix summary.
