# Sprint ERB-03: Device Telemetry Collector & MCard SQLite Dataset Pipeline

## Metadata
- **Sprint Code**: `SPRINT-ERB-03`
- **Handle**: `urn:pcard:sprint:SPRINT-ERB-03`
- **Status**: `SPECIFICATION`
- **Archetype**: `ClmTriadManifest`
- **pstack Playbook**: `feature` + `principle-type-system-discipline` + `principle-foundational-thinking`

---

## 1. Context & Objective
A robust testing infrastructure must not only capture what a user does, but also observe how the device-sensitive web application performs. 

This sprint implements `js/harness/telemetry-collector.js` to collect device-critical runtime metrics from the **chosen LandingPage target URL**:
1. **Horizontal Viewport Bleed**: Detects whether elements overflow the target viewport (`document.documentElement.scrollWidth > window.innerWidth`).
2. **Layout Freeze & Reflow Latency**: Measures frame budget adherence ($16.6\text{ms}$ budget for $60\text{fps}$) during device rotations and responsive reflows.
3. **Cumulative Layout Shift (CLS)**: Tracks unexpected layout shifts across responsive transitions.

All telemetry and normalized event traces are packaged into a structured artifact (`urn:mcard:schema:responsive_test_run:v1`), hashed with `clm-kernel` (`blake3`), and stored immutably in the Canonical Triad SQLite database (`data/mcard-api.db`).

---

## 2. Refactoring & Implementation Sequence

### Step 3.1: Implement `js/harness/telemetry-collector.js`
- **Layout Overflow Audit**:
  ```javascript
  const hasHorizontalOverflow = doc.documentElement.scrollWidth > win.innerWidth;
  const overflowingElements = [...doc.querySelectorAll('*')].filter(el => {
    const r = el.getBoundingClientRect();
    return r.right > win.innerWidth + 1; // 1px threshold for rounding
  }).map(el => el.tagName + (el.id ? '#' + el.id : ''));
  ```
- **Frame Rate Monitor**: Uses `requestAnimationFrame` timestamp deltas during active testing to track jank and dropped frames.
- **Performance Summary**: Generates summary statistics: `{ avgFps, droppedFrames, maxFrameMs, hasOverflow, overflowElements }`.

### Step 3.2: Implement `server/mcard-session-adapter.mjs`
- Connects to SQLite Triad engine via `DatabaseSync` in `server/mcard-api.mjs`.
- Binds to `clm-kernel`'s `computeHash` (default `blake3`).
- Handles endpoints:
  - `POST /api/mcard/session/save`: Validates schema, mints MCard, registers handle `urn:mcard:test_run:<target_slug>:<id>`.
  - `GET /api/mcard/session/:id`: Fetches full test run payload.
  - `GET /api/mcard/session/target?url=<URL>`: Queries historical test runs for a given LandingPage URL to track performance trends over time.

---

## 3. BMAD Agent Responsibilities

### 📋 Analyst (Sophia)
- Formalize JSON Schema for systematic test runs (`urn:mcard:schema:responsive_test_run:v1`).
- Ensure schema fields capture all device-sensitive observations: device profile, orientation, overflow flags, frame metrics, and event log.

### 🏛️ Architect (Winston)
- Enforce MCard One Record Law (`card.hash = hex(H(content))`):
  - Digest algorithm: `blake3` via `clm-kernel`.
  - Provenance coordinate: `g_time = ALGORITHM|TIMESTAMP|LOCALE|type=responsive_test_run|target=<URL>`.
- Isolate telemetry collection so it incurs zero observer overhead on the target page.

### 💻 Dev (Amelia)
- Implement `js/harness/telemetry-collector.js`.
- Implement `server/mcard-session-adapter.mjs`.
- Wire `stopRecording()` in the workbench UI to bundle ring buffer events with telemetry metrics and post to the MCard API.

### 🧪 Test Engineering Architect (TEA - Murat)
- Create integration test `tests/unit/mcard-session-storage.test.mjs`:
  - Send mock session payload targeting `http://localhost:4321/` to storage adapter.
  - Query SQLite database directly to assert card row existence and exact SHA-256/BLAKE3 digest verification.
  - Retrieve session by handle and assert lossless round-trip parity.

---

## 4. Technical Specification

### 4.1 Schema Sample (`urn:mcard:schema:responsive_test_run:v1`)
```json
{
  "schema": "urn:mcard:schema:responsive_test_run:v1",
  "sessionId": "tr_1792483000000_a1b2c3",
  "targetUrl": "http://localhost:4321/",
  "metadata": {
    "device": { "id": "iphone-16-pro", "width": 393, "height": 852, "orientation": "portrait" },
    "startTime": "2026-10-20T16:40:00.000Z",
    "durationMs": 4500,
    "eventCount": 24,
    "droppedCount": 0,
    "telemetry": {
      "avgFps": 59.8,
      "maxFrameMs": 18.2,
      "hasHorizontalOverflow": false,
      "tapTargetViolations": []
    }
  },
  "events": [ ... ]
}
```

---

## 5. Definition of Done (DoD) & Verification

- [ ] `vcard:sprint-erb-03:telemetry_collector_created`: `js/harness/telemetry-collector.js` detects overflow and frame jank.
- [ ] `vcard:sprint-erb-03:schema_contract_defined`: Schema `urn:mcard:schema:responsive_test_run:v1` validated.
- [ ] `vcard:sprint-erb-03:clm_kernel_hash_compliance`: Content hashes generated via `clm-kernel` `computeHash`.
- [ ] `vcard:sprint-erb-03:triad_sqlite_persistence`: Saved test runs immutably committed to `data/mcard-api.db`.
- [ ] `vcard:sprint-erb-03:integration_test_passes`: `node --test tests/unit/mcard-session-storage.test.mjs` passes cleanly.

### Execution Command:
```bash
node --test tests/unit/mcard-session-storage.test.mjs
```
