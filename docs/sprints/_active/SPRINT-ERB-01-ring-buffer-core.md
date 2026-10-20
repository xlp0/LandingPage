# Sprint ERB-01: In-Memory Bounded Ring Buffer Core & State Engine

## Metadata
- **Sprint Code**: `SPRINT-ERB-01`
- **Handle**: `urn:pcard:sprint:SPRINT-ERB-01`
- **Status**: `SPECIFICATION`
- **Archetype**: `ClmTriadManifest`
- **pstack Playbook**: `tdd` + `principle-model-the-domain`

---

## 1. Context & Objective
Implement a high-performance bounded circular memory buffer (ring buffer) and deterministic state engine located at `js/harness/event-ring-buffer.js`. 

As part of the device-sensitive testing infrastructure, this component intercepts and buffers rapid streams of user interaction events (gestures, taps, touches, scrolls, and orientation toggles) from a **chosen LandingPage target URL**. It guarantees $O(1)$ push and sequential read operations with zero dynamic memory allocation during capture, tracking dropped events cleanly under high-frequency interaction bursts without degrading target frame rates.

---

## 2. Refactoring & Implementation Sequence

### Step 1.1: Bounded Array Pre-Allocation
- Pre-allocate buffer of fixed capacity $N = 2048$:
  ```javascript
  this._buffer = new Array(capacity);
  this._head = 0;
  this._tail = 0;
  this._size = 0;
  this._dropped = 0;
  ```
- Guarantee $O(1)$ constant time complexity per push.

### Step 1.2: Overwrite Eviction & Drop Accounting (`INV-ERB-01`)
- When `_size === _capacity`, overwrite oldest entry at `_tail`, advance `_tail = (_tail + 1) % _capacity`, and increment `_dropped`.
- Ensure memory footprint never exceeds $N$ elements regardless of session duration.

### Step 1.3: Finite State Machine (`INV-ERB-03`)
- Enforce strict lifecycle transitions:
  `IDLE` $\xrightarrow{\text{start()}}$ `RECORDING` $\xrightleftharpoons[\text{resume()}]{\text{pause()}}$ `PAUSED` $\xrightarrow{\text{stop()}}$ `FINALIZED` $\rightarrow$ `IDLE`.
- Reject invalid transitions (e.g. attempting to push while `PAUSED` or `IDLE`).

---

## 3. BMAD Agent Responsibilities

### 🏛️ Architect (Winston)
- Define buffer data structure, pointer wrap-around arithmetic, and state transitions.
- Enforce **`INV-ERB-01`**: Zero dynamic allocation during recording; fixed memory footprint.
- Enforce **`INV-ERB-03`**: Strict FSM preventing corrupted or partial recording states.

### 💻 Dev (Amelia)
- Implement `js/harness/event-ring-buffer.js` (ESM, zero external dependencies).
- Export classes: `EventRingBuffer` and `RecordingStateMachine`.
- Provide snapshot extraction: `snapshot(): NormalizedEvent[]` returning events in true chronological order.

### 🧪 Test Engineering Architect (TEA - Murat)
- Author `tests/unit/event-ring-buffer.test.mjs` using `node:test` and `node:assert`:
  - `test('initial state is empty with zero drops')`
  - `test('maintains strict FIFO order below capacity')`
  - `test('wraps pointers correctly and increments drop counter upon overflow')`
  - `test('snapshot extracts chronological sequence after multiple overflows')`
  - `test('state machine rejects invalid transitions (e.g., pause while idle)')`

---

## 4. Technical Specification

### 4.1 Data Shape
```typescript
interface RingBufferStats {
  capacity: number;
  size: number;
  dropped: number;
  state: 'IDLE' | 'RECORDING' | 'PAUSED' | 'FINALIZED';
}
```

---

## 5. Definition of Done (DoD) & Verification

- [ ] `vcard:sprint-erb-01:ring_buffer_module_created`: `js/harness/event-ring-buffer.js` implemented with zero external runtime dependencies.
- [ ] `vcard:sprint-erb-01:pointer_math_validated`: Circular wrap-around and overwrite logic proven bug-free.
- [ ] `vcard:sprint-erb-01:fsm_state_transitions_verified`: State transitions strictly enforced per `INV-ERB-03`.
- [ ] `vcard:sprint-erb-01:unit_test_suite_passes`: `node --test tests/unit/event-ring-buffer.test.mjs` executes and passes with 100% assertions.

### Execution Command:
```bash
node --test tests/unit/event-ring-buffer.test.mjs
```
