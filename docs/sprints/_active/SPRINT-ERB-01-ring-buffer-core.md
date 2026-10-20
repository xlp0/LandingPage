# Sprint ERB-01: In-Memory Bounded Ring Buffer Core & State Engine

## Metadata
- **Sprint Code**: `SPRINT-ERB-01`
- **Handle**: `urn:pcard:sprint:SPRINT-ERB-01`
- **Status**: `SPECIFICATION`
- **Archetype**: `ClmTriadManifest`
- **pstack Playbook**: `tdd` + `principle-model-the-domain`

---

## 1. Context & Objective
Implement a high-performance bounded circular memory buffer (ring buffer) and deterministic state engine. This component serves as the foundational in-memory event stream collector for testing a **chosen LandingPage target URL** across multi-viewport sweeps. It guarantees $O(1)$ push and sequential read operations with zero dynamic memory allocation on the active capture path, tracking dropped events cleanly under high-frequency interaction bursts.

---

## 2. BMAD Agent Responsibilities

### 🏛️ Architect (Winston)
- Define buffer data structure, pointer wrap-around arithmetic, and state transitions.
- Enforce **`INV-ERB-01`**: Fixed pre-allocated array of capacity $N = 2048$. When capacity is reached, overwrite the oldest unconsumed entry and increment `droppedCount`.
- Enforce **`INV-ERB-03`**: State engine with strict transitions:
  ```
  [IDLE] --start()--> [RECORDING] <==pause()/resume()==> [PAUSED]
                            |
                         stop()
                            v
                      [FINALIZED] --> reset() --> [IDLE]
  ```

### 💻 Dev (Amelia)
- Implement `js/event-ring-buffer.js` (ESM, zero dependencies):
  - Pre-allocated internal buffer: `this._buffer = new Array(capacity)`.
  - Head/tail index pointers with modular wrapping: `(index + 1) % capacity`.
  - Methods:
    - `push(event): boolean`
    - `snapshot(): Array<NormalizedEvent>` (returns ordered chronological events)
    - `clear(): void`
    - `stats(): { capacity, size, dropped, head, tail }`
- Implement state manager class `RecordingStateMachine`.

### 🧪 Test Engineering Architect (TEA - Murat)
- Author `tests/unit/event-ring-buffer.test.mjs` using `node:test` and `node:assert`:
  - `test('initial state is empty with zero drops')`
  - `test('maintains strict FIFO order below capacity')`
  - `test('wraps pointers correctly and increments drop counter upon overflow')`
  - `test('snapshot extracts chronological sequence after multiple overflows')`
  - `test('state machine rejects invalid transitions (e.g., pause while idle)')`

---

## 3. Technical Specification

### 3.1 Data Shape
```typescript
interface RingBufferStats {
  capacity: number;
  size: number;
  dropped: number;
  state: 'IDLE' | 'RECORDING' | 'PAUSED' | 'FINALIZED';
}
```

### 3.2 Pointer Math
```javascript
// Push logic
if (this._size === this._capacity) {
  // Overwriting oldest
  this._tail = (this._tail + 1) % this._capacity;
  this._dropped++;
} else {
  this._size++;
}
this._buffer[this._head] = event;
this._head = (this._head + 1) % this._capacity;
```

---

## 4. Definition of Done (DoD) & Verification

- [ ] `vcard:sprint-erb-01:ring_buffer_module_created`: `js/event-ring-buffer.js` implemented with zero external runtime dependencies.
- [ ] `vcard:sprint-erb-01:pointer_math_validated`: Circular wrap-around and overwrite logic proven bug-free.
- [ ] `vcard:sprint-erb-01:fsm_state_transitions_verified`: State transitions strictly enforced per `INV-ERB-03`.
- [ ] `vcard:sprint-erb-01:unit_test_suite_passes`: `node --test tests/unit/event-ring-buffer.test.mjs` executes and passes with 100% assertions.

### Execution Command:
```bash
node --test tests/unit/event-ring-buffer.test.mjs
```
