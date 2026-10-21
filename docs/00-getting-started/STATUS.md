# Project Status — Responsive Test Workbench & LandingPage

**Current Status**: 🟢 **Operational & 100% Certified**  
**Graduation Milestone**: **Program ERB Graduated** (2026-10-21)  
**Certification Record**: `urn:mcard:certification:responsive:v1`  
**Monorepo Position**: Submodule 3 of `MCard_TDD` (Estate 4 in ULR-01 Four-Estate Architecture)

---

## 🎯 Architectural Role

Within the `MCard_TDD` framework, `LandingPage` serves three defined responsibilities:
1. **Responsive Test Workbench (`responsive-lab.html`)**: Systematic testing, telemetry capture, and deterministic replay for the device-sensitive behavior of a chosen target URL (e.g., `http://localhost:4321/`, `app.html`, or staging URLs).
2. **Single-Page MCard Distillation Supplier (`SMR-09`)**: Distills the landing page into a content-addressed MCard (`urn:mcard:content:landing_page`) and provides the 6-sample portal corpus (`data/samples/portal_samples.mcard.db`) on the canonical Triad SQLite schema.
3. **SSRF-Guarded External Portal Membrane**: Enforces connection-level DNS, private IP, and redirect validation on external URL probes (`external-portal-membrane.js`, `server/mcard-api.mjs`).

---

## 🔬 Device-Sensitive Dimensions (100% Certified)

All 7 core device dimensions are operational and verified:

| Dimension | Invariant | Implementation | Test Suite | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Geometry & Orientation Reflow** | `INV-RVP-01` | Dynamic 2D orientation swapping, aspect-ratio preservation | `responsive-rotation-and-devices.spec.js` (17/17) | ✅ Pass |
| **Declared Fidelity Tiers** | `INV-DSF-01`, `INV-DSF-02` | Schema v2 capability profiles, T0–T3 emulation declarations | `fidelity.test.mjs`, `device-registry-v2.test.mjs` | ✅ Pass |
| **Horizontal Viewport Bleed** | `INV-DEV-01` | `document.documentElement.scrollWidth <= window.innerWidth` | `telemetry-collector.test.mjs`, `device-conformance.spec.js` | ✅ Pass |
| **Touch Target Ergonomics** | `INV-DEV-02` | Live $\ge 44\text{px} \times 44\text{px}$ tap audit on coarse pointers | `membrane-normalization.test.mjs`, conformance check | ✅ Pass |
| **Event Capture Ring Buffer** | `INV-ERB-01..05`, `INV-PRV-01` | Bounded $N \le 2048$ FIFO buffer, scale-free coords $[0.0, 1.0]$, privacy redaction | `event-ring-buffer.test.mjs`, `responsive-capture.spec.js` (8/8) | ✅ Pass |
| **Frame Timing & CLS** | `INV-DEV-04` | 60 fps / 16.6ms frame budget observation, Cumulative Layout Shift | `telemetry-collector.test.mjs` | ✅ Pass |
| **MCard Triad Persistence** | `INV-ERB-04` | SQLite Triad storage (`/api/test-runs`) with canonical Blake3 hashing via `clm-kernel` | `test-run-api.test.mjs`, `test-run-schema.test.mjs` | ✅ Pass |

---

## 🧪 Verification Battery Summary

```bash
# Unit test battery (73/73 passing)
npm run test:unit

# Rotation & device containment integration (17/17 passing)
npx playwright test tests/features/responsive-rotation-and-devices.spec.js --project=features

# Interaction capture & telemetry (8/8 passing)
npx playwright test tests/features/responsive-capture.spec.js --project=features

# Deterministic Playwright replay at 1×, 2×, 5× (4/4 passing)
npm run test:replay

# Multi-device systematic sweep (16/16 combinations passing)
npm run test:responsive

# 15-check device conformance catalog & certification (16/16 passing)
npm run test:conformance
```

---

## 📦 Dependency Consensus & Kernel Purity

- **Kernel Pin**: Consumes published `clm-kernel@0.0.9`, aligned with `mcard-studio` and verified by root CI `check_landingpage_retirement.py`.
- **Zero Local Hash Duplication**: Relies exclusively on `clm-kernel` Blake3 hashing; no local duplicate hash implementations.
- **Retired Legacy Surfaces**: Legacy multi-card workbench islands are decommissioned and cataloged in `retired-islands.yaml`.
