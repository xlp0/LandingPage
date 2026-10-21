# `docs/sprints/_active/` — Active Programs & Graduation Pointer

*No active or staged programs currently in flight. All sprint specifications ERB-00 through ERB-06 have graduated to [**`../08-testing/`**](../08-testing/INDEX.md).*

> **Program ERB graduated — 2026-10-21.** The Device-Sensitive Testing Infrastructure Program (ERB-00..ERB-06) was fully implemented, verified, and graduated to [**`../08-testing/`**](../08-testing/INDEX.md). Verification: **73/73 node:test unit tests**, **17/17 rotation and device lifecycle tests**, **8/8 responsive capture tests**, **4/4 Playwright deterministic replay tests**, **16/16 systematic multi-device sweeps**, **16/16 device conformance checks**, and responsive certification **`urn:mcard:certification:responsive:v1`** all 100% green.

---

## 🟢 Active Programs Status

*No active programs currently in flight.*

---

## 🏁 Completed Program ERB: Device-Sensitive Test Infrastructure (Graduated)

**Status**: ✅ **Graduated to [`../08-testing/`](../08-testing/INDEX.md)** (2026-10-21) · **Code**: `ERB` · **Suite**: Master Index + 7 sprints

**Goal**: Deliver a comprehensive, automated testing workbench for device-sensitive web functionality (geometry reflow, horizontal bleed, touch ergonomics, event capture ring buffer, scale-free normalization, in-target telemetry, MCard CLM persistence, Playwright replay, systematic sweeps, and conformance certification).

| Sprint | Title | Status | Primary Artifacts | Focus |
| :--- | :--- | :---: | :--- | :--- |
| [**ERB-00**](../08-testing/SPRINT-ERB-00-infrastructure-refactoring.md) | Infrastructure Modularization & Lab Refactor Baseline | ✅ Graduated | `js/harness/viewport-stage.js`, `target-membrane.js`, `lab-toolbar.js` | Modularized lab into testable ESM; single `iframe.src` writer (`INV-STU-01`), single target registry `app-config.json#labTargets` (`INV-STU-02`), consolidated `window.__lab` test API |
| [**ERB-01**](../08-testing/SPRINT-ERB-01-ring-buffer-core.md) | Ring Buffer Core & Recording FSM | ✅ Graduated | `js/harness/event-ring-buffer.js`, `recording-state-machine.js` | Fixed slot array $N \le 2048$, O(1) push, no buffer growth, monotonic `seq` (`INV-ERB-01`); 20-pair deterministic FSM (`INV-ERB-03`); injected clock |
| [**ERB-05**](../08-testing/SPRINT-ERB-05-device-capability-profiles.md) | Device Capability Profiles & Fidelity Tiers | ✅ Graduated | `js/device-registry.js` (schema v2), `js/harness/fidelity.js` | Schema v2 capability profiles (touch, pointer, mobile, hover, safe-area); declared fidelity tiers T0–T3 (`INV-DSF-01`); registry-derived device matrix (`INV-DSF-02`) |
| [**ERB-02**](../08-testing/SPRINT-ERB-02-membrane-normalization.md) | Target Membrane Interceptor & Touch Ergonomics | ✅ Graduated | `js/harness/membrane-interceptor.js`, `normalize-event.js`, `capture-*.js` | Same-origin & cross-origin capture; scale-free coordinate normalization $[0.0, 1.0]$ (`INV-ERB-02`); sensitive data redaction (`INV-PRV-01`); live touch ergonomics ($\ge 44$px) |
| [**ERB-03**](../08-testing/SPRINT-ERB-03-mcard-clm-persistence.md) | Device Telemetry & MCard CLM Persistence | ✅ Graduated | `js/harness/telemetry-collector.js`, `server/test-run-api.mjs` | In-target telemetry (bleed `INV-DEV-01`, frame budget `INV-DEV-04`, CLS); SQLite Triad persistence via `/api/test-runs` with Blake3 canonical hashing (`INV-ERB-04`) |
| [**ERB-04**](../08-testing/SPRINT-ERB-04-playwright-deterministic-replay.md) | Playwright Replay Driver & Systematic Sweeps | ✅ Graduated | `scripts/playwright-replay-driver.mjs`, `tests/features/responsive-replay.spec.js` | Deterministic Playwright replay at T1; paced playback (1×/2×/5×); 16-combination systematic sweep (`npm run test:responsive`, `npm run test:replay`) |
| [**ERB-06**](../08-testing/SPRINT-ERB-06-device-sensitive-conformance.md) | Conformance Suite & Certification | ✅ Graduated | `tests/conformance/checks/*.js`, `tests/features/device-conformance.spec.js` | 15-check conformance catalog; central fidelity gating; regression diff API; responsive certification record `urn:mcard:certification:responsive:v1` |

**User-Facing Guide**: [`docs/08-testing/DEVICE_SENSITIVE_TESTING_INFRASTRUCTURE.md`](../../08-testing/DEVICE_SENSITIVE_TESTING_INFRASTRUCTURE.md)
