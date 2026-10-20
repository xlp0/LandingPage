# Sprint ERB-03: MCard Test-Run Persistence via `clm-kernel`

## Metadata
- **Sprint Code**: `SPRINT-ERB-03`
- **Handle**: `urn:pcard:sprint:SPRINT-ERB-03`
- **Status**: `SPECIFICATION`
- **Archetype**: `ClmTriadManifest`
- **Depends on**: `SPRINT-ERB-02` (event payload, `lab:final-state`), `SPRINT-ERB-05` (`device` + `fidelity` blocks)
- **Unblocks**: `SPRINT-ERB-04`, `SPRINT-ERB-06`
- **pstack Playbook**: `architect` + `principle-type-system-discipline` + `principle-boundary-discipline` + `principle-make-operations-idempotent`

---

## 1. Context & Objective

Store each finished recording as an immutable, content-addressed MCard in the Canonical Triad (`data/mcard-api.db`), hashed with `clm-kernel` v0.0.9 (`blake3` default). Bind it to stable handles so that:

- a run can be fetched by hash or by handle;
- all runs for one target can be listed;
- the **latest** run per `(target, device, orientation)` has a revision chain, which gives regression history for free through the existing `handle_history` table.

### 1.1 What already exists (reuse, do not rebuild)
`server/mcard-api.mjs` already provides:

- `CanonicalTriadBackend` with `put(content, { algorithm, gTime })` → `{ hash, gTime, inserted }`, `get`, `bindHandle(handle, hash)` (records the previous hash in `handle_history`), `resolveHandle`, and `handleHistory`;
- `hashContent(content, algorithm)` → `computeHash` from `clm-kernel`;
- `formatGTime(algorithm, timestamp, locale)` → `ALGORITHM|TIMESTAMP|LOCALE`, with optional `|key=value` suffixes;
- `verifyRecord(hash, content, gTime)`.

### 1.2 Corrections to the earlier draft
- **Route collision**: the MCard router at `/api/mcard` ends with a `GET /:hash` catch-all. Test runs get their own router at **`/api/test-runs`**, which keeps the MCard router generic.
- **Body size**: `ws-server.js` L46 applies `app.use(express.json())` (100 KB default) to **all** routes before the mounts at L76–82. A full 2048-event session is roughly 0.6 MB, so it would fail with HTTP 413 before reaching any route-level parser. The test-run router must be mounted **before** the global parser with its own `express.json({ limit: '2mb' })`.
- **One database handle**: the new router must share the `CanonicalTriadBackend` instance created by `initMCardAPI`. It must not open a second `DatabaseSync` on the same file.
- **Determinism**: identical runs must hash identically, so serialization must be canonical (`INV-ERB-04`).
- **Profile snapshot**: device profiles are user-editable (ERB-05), so a run embeds the **full** profile, not just its id.

---

## 2. BMAD Agent Responsibilities

### 📋 Analyst (Mary)
- Own the schema `urn:mcard:schema:responsive_test_run:v1` (§4.1) and its validation rules.
- Define the target slug: `slug(url) = lowercase(host[-port] + path)`, with non-alphanumerics replaced by `-`, collapsed, and trimmed (for example `http://localhost:4321/` → `localhost-4321`).

### 🏛️ Architect (Winston)
- Approve the handle scheme (§4.3) and the `g_time` suffixes (§4.4).
- Define `canonicalJson(value)`: recursively sorted object keys, no insignificant whitespace, `undefined` dropped, and non-finite numbers rejected. Coordinates are already rounded to 4 decimals in ERB-02's `normalizeEvent`.

### 💻 Dev (Amelia)
- `js/responsive-lab/test-run-schema.js` — isomorphic and zero-dependency: `validateTestRun(obj) → { valid, errors[] }` and `canonicalJson(obj)`. Follow the hand-written style of `validateDevice` in `js/device-registry.js`.
- `server/test-run-api.mjs` — `createTestRunRouter({ storage })`.
- Client: `recorder.stop()` (ERB-02) assembles the run, validates it locally for UX feedback, and POSTs it. The server re-validates, because the boundary is the server. On network failure the client offers a JSON download, so a capture is never lost.
- The ribbon shows the returned handle and short hash with a copy button.

### 🧪 TEA (Murat)
- `tests/unit/test-run-schema.test.mjs`: valid and invalid payloads; `canonicalJson` is key-order independent (two objects with permuted keys give identical strings).
- `tests/unit/test-run-api.test.mjs`: starts the router on an ephemeral port with a temp DB under `os.tmpdir()`. Never touches `data/mcard-api.db`. Cases in §5.

---

## 3. Refactoring Sequence

| Step | Action | Kind | Exit check |
| :--- | :--- | :--- | :--- |
| **R1** | Make `initMCardAPI` expose its backend (for example return `{ router, storage }`, or export `getStorage()`). Update the one caller in `ws-server.js`. | Expose | Server boots; `GET /api/mcard/stats` unchanged. |
| **R2** | Add `CanonicalTriadBackend.listHandles(prefix)`: `SELECT handle, current_hash, updated_at FROM handle_registry WHERE handle LIKE ? ESCAPE '\'`, with `%` and `_` escaped in `prefix`. Unit-test the escaping. | Extend | New unit test green. |
| **R3** | Add `test-run-schema.js` and its tests. | Add | Unit tests green. |
| **R4** | Add `server/test-run-api.mjs`. In `ws-server.js`, mount it **before** L46: `app.use('/api/test-runs', express.json({ limit: '2mb' }), createTestRunRouter({ storage }))`. **(Behaviour change: new route; no change to existing routes.)** | Reorder + add | `tests/unit/test-run-api.test.mjs` green; existing `/api/mcard/*` smoke unaffected. |
| **R5** | Wire `recorder.stop()` → POST → ribbon badge, with the offline JSON-download fallback. | Wire | Manual run against `app.html` shows a handle; a follow-up GET returns the same canonical bytes. |

---

## 4. Technical Specification

### 4.1 Payload `urn:mcard:schema:responsive_test_run:v1`

```json
{
  "schema": "urn:mcard:schema:responsive_test_run:v1",
  "sessionId": "tr_1792483000000_a1b2c3",
  "target": { "url": "http://localhost:4321/", "slug": "localhost-4321" },
  "captureSource": "probe-agent",
  "device": {
    "id": "iphone-16-pro", "name": "iPhone 16 Pro", "category": "phone",
    "width": 393, "height": 852, "pixelRatio": 3,
    "hasTouch": true, "isMobile": true, "pointer": "coarse", "hover": false,
    "safeAreaInsets": { "top": 59, "right": 0, "bottom": 34, "left": 0 },
    "schemaVersion": 2
  },
  "orientation": "portrait",
  "fidelity": {
    "tier": 0, "runner": "lab-iframe",
    "emulated": ["viewport"],
    "notEmulated": ["pixelRatio", "hasTouch", "pointer", "hover", "isMobile", "safeAreaInsets"]
  },
  "lab": { "commit": "6f9a53a", "clmKernel": "0.0.9" },
  "metrics": {
    "startedAt": "2026-10-20T08:40:00.000Z",
    "activeDurationMs": 4500,
    "eventCount": 24,
    "droppedCount": 0,
    "rejectedMessages": 0
  },
  "finalState": { "url": "http://localhost:4321/explore", "domDigest": "blake3:…" },
  "events": [
    {
      "seq": 1, "t_rel_ms": 120.4, "type": "pointer",
      "pointer": { "pointerType": "mouse", "button": 0 },
      "target": { "selector": "[data-testid=\"btn-explore\"]", "tag": "button" },
      "viewport": { "w": 393, "h": 852, "dpr": 1, "orientation": "portrait" },
      "coords": { "nx": 0.52, "ny": 0.81 }
    }
  ]
}
```

Validation rules (server is authoritative):

- `events.length ≤ 2048`, `seq` strictly increasing;
- `coords.nx`/`ny` within `[0, 1]`;
- `fidelity.tier ∈ {0, 1, 2, 3}`;
- `target.url` passes `validateExternalUrl(url, { allowLoopback: true })` from `server/mcard-api.mjs`;
- `device` passes `validateDevice` (v2);
- unknown top-level keys are rejected (a closed schema prevents silent drift).

### 4.2 Endpoints (`/api/test-runs`)

| Method & path | Behaviour | Status codes |
| :--- | :--- | :--- |
| `POST /api/test-runs` | Validate → `canonicalJson` → `storage.put(bytes, { algorithm: 'blake3', gTime })` → bind both handles (§4.3). Idempotent: the same canonical bytes return the same hash with `inserted: false`. | `201` new, `200` existing, `400` invalid, `413` > 2 MB |
| `GET /api/test-runs?target=<url>[&device=<id>][&orientation=<o>]` | `storage.listHandles('urn:mcard:test_run:<slug>:')`, filtered, newest first. Returns handle, hash, and `g_time` only (no bodies). | `200` |
| `GET /api/test-runs/:hash` | Returns the record plus `verified` from `verifyRecord`. | `200`, `404` |
| `GET /api/test-runs/latest/history?target=<url>&device=<id>&orientation=<o>` | `storage.handleHistory(latestHandle)` → revision chain, oldest first. | `200`, `404` |

### 4.3 Handles

| Handle | Bound to | Rebinding |
| :--- | :--- | :--- |
| `urn:mcard:test_run:<slug>:<sessionId>` | This run's hash | Never; one handle per run. |
| `urn:mcard:test_run_latest:<slug>:<deviceId>:<orientation>` | Most recent run for that triple | Every run. `handle_history` keeps the chain. |

### 4.4 `g_time`

```text
formatGTime('blake3', startedAt, locale) + '|type=responsive_test_run|target=<slug>|tier=<0-3>'
```

The slug, not the raw URL, goes into `g_time`, which avoids delimiter ambiguity.

---

## 5. Integration Test Cases (`tests/unit/test-run-api.test.mjs`)

| Case | Assertion |
| :--- | :--- |
| **P1** | POST a valid run → `201`; the row exists in `card`; `verifyRecord` is true; the hash equals `hashContent(canonicalJson(run), 'blake3')`. |
| **P2** | POST the same run with permuted keys → `200`, same hash, `inserted: false` (`INV-ERB-04`). |
| **P3** | POST with `nx = 1.2`, a missing `fidelity`, or an unknown top-level key → `400` with field errors. |
| **P4** | POST a 1.5 MB valid run → `201`; a 2.5 MB run → `413`. This proves the router is mounted before the global 100 KB parser. |
| **P5** | Two runs for the same target/device/orientation → `latest/history` returns the first hash as `previous_hash`. |
| **P6** | `GET ?target=` lists only that slug's runs. A target slug containing `_` does not match other slugs (`LIKE` escaping). |
| **P7** | After the tests, `data/mcard-api.db` modification time is unchanged. |

---

## 6. Definition of Done (DoD) & Verification

- [ ] `vcard:sprint-erb-03:backend_shared_not_duplicated`: The test-run router uses the `initMCardAPI` backend instance (R1).
- [ ] `vcard:sprint-erb-03:schema_contract_enforced`: `validateTestRun` rejects invalid and unknown-key payloads on the server.
- [ ] `vcard:sprint-erb-03:canonical_hash_deterministic`: P1–P2 pass (`INV-ERB-04`).
- [ ] `vcard:sprint-erb-03:large_session_accepted`: P4 passes.
- [ ] `vcard:sprint-erb-03:regression_chain_available`: P5 passes.
- [ ] `vcard:sprint-erb-03:target_history_retrieval`: P6 passes.
- [ ] `vcard:sprint-erb-03:production_db_untouched_by_tests`: P7 passes.
- [ ] `vcard:sprint-erb-03:client_save_with_offline_fallback`: Stop → saved handle shown; with the server stopped → JSON download offered.

### Execution Command
```bash
node --test tests/unit/test-run-schema.test.mjs tests/unit/test-run-api.test.mjs
```
