# Sprint ERB-03: MCard Test Data Ingestion Pipeline & clm-kernel Hashing

## Metadata
- **Sprint Code**: `SPRINT-ERB-03`
- **Handle**: `urn:pcard:sprint:SPRINT-ERB-03`
- **Status**: `SPECIFICATION`
- **Archetype**: `ClmTriadManifest`
- **pstack Playbook**: `feature` + `principle-type-system-discipline`

---

## 1. Context & Objective
Persist structured test runs and telemetry collected from the **chosen LandingPage target URL** directly into the MCard Canonical Triad SQLite dataset engine (`data/mcard-api.db`). The test dataset artifact must adhere to a strict schema (`urn:mcard:schema:responsive_test_run:v1`), compute cryptographic content hashes using `clm-kernel` (v0.0.9), and register a unique handle (`urn:mcard:test_run:<target_slug>:<id>`) with `g_time` provenance metadata for systematic historical regression comparisons.

---

## 2. BMAD Agent Responsibilities

### 📋 Analyst (Sophia)
- Formalize JSON Schema for systematic test runs (`urn:mcard:schema:responsive_test_run:v1`).
- Define metadata headers:
  - `targetUrl`, `sessionId`, `deviceProfile`, `orientation`, `recordedAt`, `metrics` (TTI, layout shifts, frame latency), `droppedCount`, and `checksum`.

### 🏛️ Architect (Winston)
- Ensure alignment with MCard One Record Law (`card.hash = hex(H(content))`):
  - Digest algorithm: `blake3` (default) or `sha256` (legacy fallback) provided by `clm-kernel`.
  - Provenance coordinate: `g_time = ALGORITHM|TIMESTAMP|LOCALE|type=responsive_test_run|target=<URL>`.
- Define `/api/mcard/session` router endpoints:
  - `POST /api/mcard/session/save`: Validates schema, mints card, binds handle.
  - `GET /api/mcard/session/:id`: Fetches recorded session by handle or hash.
  - `GET /api/mcard/session/target?url=<URL>`: Lists all historical test runs for a given LandingPage URL.

### 💻 Dev (Amelia)
- Implement `server/mcard-session-adapter.mjs`:
  - Integrate with `server/mcard-api.mjs` Triad SQLite connection (`DatabaseSync`).
  - Bridge incoming payload to `clm-kernel`'s `computeHash`.
- Implement client-side export inside `js/recording-controller.js`:
  - `stopRecording()` serializes buffer snapshot and issues POST to `/api/mcard/session/save`.
  - Displays copyable session handle & hash in UI badge upon completion.

### 🧪 Test Engineering Architect (TEA - Murat)
- Create integration test `tests/unit/mcard-session-storage.test.mjs`:
  - Send mock session payload targeting `http://localhost:4321/` to storage adapter.
  - Query SQLite database directly to assert card row existence and exact SHA-256/BLAKE3 digest verification.
  - Retrieve session by handle and assert lossless round-trip parity.

---

## 3. Technical Specification

### 3.1 MCard Systematic Test Run Payload
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
      "avgFrameLatencyMs": 16.6,
      "layoutShiftScore": 0.00
    }
  },
  "events": [
    {
      "seq": 1,
      "t_rel_ms": 120.4,
      "type": "click",
      "target": { "selector": "#btn-explore", "tag": "button" },
      "viewport": { "w": 393, "h": 852, "dpr": 3, "orientation": "portrait" },
      "coords": { "nx": 0.52, "ny": 0.81 }
    }
  ]
}
```

---

## 4. Definition of Done (DoD) & Verification

- [ ] `vcard:sprint-erb-03:schema_contract_defined`: Schema `urn:mcard:schema:responsive_test_run:v1` validated.
- [ ] `vcard:sprint-erb-03:clm_kernel_hash_compliance`: Content hashes generated via `clm-kernel` `computeHash`.
- [ ] `vcard:sprint-erb-03:triad_sqlite_persistence`: Saved test runs immutably committed to `data/mcard-api.db`.
- [ ] `vcard:sprint-erb-03:target_history_retrieval`: Target-specific query endpoint `/api/mcard/session/target` returns test runs for the chosen LandingPage.
- [ ] `vcard:sprint-erb-03:integration_test_passes`: `node --test tests/unit/mcard-session-storage.test.mjs` passes cleanly.

### Execution Command:
```bash
node --test tests/unit/mcard-session-storage.test.mjs
```
