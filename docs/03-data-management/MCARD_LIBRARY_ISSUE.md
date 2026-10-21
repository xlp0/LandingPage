# MCard Library Historical Issues & Resolved Mitigations

This reference documents past library issues, integration hurdles, and their permanent architectural resolutions.

---

## 1. Issue: Express Global 100 KB JSON Limit (`INV-ERB-04`)

- **Symptom**: Large test run sessions with long event sequences or high-density telemetry payloads were rejected by Express with `413 Payload Too Large`.
- **Root Cause**: Default Express middleware `express.json()` enforces a strict 100 KB limit unless explicitly configured.
- **Resolution (ERB-03)**:
  `server/test-run-api.mjs` configures a dedicated router-scoped JSON parser with a 2 MB ceiling:
  ```javascript
  router.use(express.json({ limit: '2mb' }));
  ```
  Verified by unit test `P4: POST 1.5MB valid run -> 201; 2.5MB run -> 413`.

---

## 2. Issue: Hash Provider Drift & Kernel Divergence (`ULR-05`)

- **Symptom**: Different estates generated subtly different Blake3 or SHA-256 hashes due to varying input key order or local algorithm wrappers.
- **Root Cause**: `LandingPage` had embedded a standalone Blake3 module that diverged from `clm/` kernel standards.
- **Resolution**:
  Removed all local hash implementations. `LandingPage` now relies directly on published `clm-kernel@0.0.9`, using canonical JSON serialization where object keys are sorted lexicographically before hashing.

---

## 3. Issue: CommonJS vs. ESM Boundary

- **Symptom**: `server/mcard-api.js` was written in CommonJS while the rest of the application moved to ES modules (`type: "module"` in `package.json`).
- **Resolution**:
  Replaced `server/mcard-api.js` with `server/mcard-api.mjs` using modern ES module exports, async/await, and `better-sqlite3`.
