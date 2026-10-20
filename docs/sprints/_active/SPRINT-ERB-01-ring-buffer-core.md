# Sprint ERB-01: Bounded Event Ring Buffer & Recording State Machine

> **Merged spec.** Keeps the module home `js/harness/` and the class names `EventRingBuffer` / `RecordingStateMachine` from Yohanes's `41cc6a1` draft. Two adjustments: the classes live in two files (data vs. control), and the "zero-allocation" claim is restated as "no buffer growth" (§4.3).

## Metadata
- **Sprint Code**: `SPRINT-ERB-01`
- **Handle**: `urn:pcard:sprint:SPRINT-ERB-01`
- **Status**: `SPECIFICATION`
- **Archetype**: `ClmTriadManifest`
- **Depends on**: `SPRINT-ERB-00` (module home `js/harness/`, `npm run test:unit`)
- **Runs in parallel with**: `SPRINT-ERB-05`
- **Unblocks**: `SPRINT-ERB-02`
- **pstack Playbook**: `tdd` + `principle-model-the-domain` + `principle-foundational-thinking`

---

## 1. Context & Objective

Build two small, pure, zero-dependency modules that every capture path (same-origin, cross-origin probe, and later real-device) writes into:

1. **`EventRingBuffer`** — data only. A fixed-capacity circular store with O(1) push, chronological snapshot, and explicit overwrite accounting.
2. **`RecordingStateMachine`** — control only. Decides whether events are accepted and owns the active-time clock.

The earlier draft put `state` inside the buffer's stats while the buffer had no state methods. This revision separates the two. The buffer never knows about recording state, and the state machine never touches slots. ERB-02's recorder composes them.

No lab wiring happens in this sprint. Both modules are greenfield and must run unchanged in the browser and under `node:test`.

---

## 2. BMAD Agent Responsibilities

### 🏛️ Architect (Winston)
- Enforce **`INV-ERB-01`**: a fixed slot array of capacity `N`, where `N` is an integer and `1 ≤ N ≤ 2048` (default 2048). When the buffer is full, a push overwrites the oldest slot and increments `dropped`. The slot array never grows.
- Enforce **`INV-ERB-03`** with the transition table in §4.2. Invalid transitions throw `InvalidTransitionError`; they do not return `false` silently.
- Require `seq` to be assigned by the buffer and to increase by exactly 1 per accepted push, including pushes that overwrite. Replay (ERB-04) detects loss as gaps in `seq`.

### 💻 Dev (Amelia)
- `js/harness/event-ring-buffer.js`:
  - `constructor({ capacity = 2048 } = {})`: throws `RangeError` unless `capacity` is an integer in `[1, 2048]`.
  - `push(event): number` — freezes the event shallowly, stamps `seq`, and returns that `seq`.
  - `snapshot(): ReadonlyArray<CapturedEvent>` — a new array in chronological order (oldest → newest).
  - `clear(): void` — empties slots, resets `size`, `dropped`, `head`, and `tail`. Keeps `nextSeq` monotonic within the instance.
  - `stats(): RingBufferStats`.
- `js/harness/recording-state-machine.js`:
  - `constructor({ now = () => performance.now() } = {})` — the clock is injected so tests are deterministic.
  - `start()`, `pause()`, `resume()`, `stop()`, `reset()`, `state`, `canAccept()`, and `activeElapsedMs()`.
  - `onTransition(listener)` returns an unsubscribe function. The recorder (ERB-02) uses it to push `pause` / `resume` marker events.

### 🧪 TEA (Murat)
- `tests/unit/event-ring-buffer.test.mjs` (`node:test`, `node:assert/strict`):
  - initial state is empty with zero drops;
  - strict FIFO order below capacity;
  - overflow wraps pointers and increments `dropped` once per overwrite;
  - `snapshot()` is chronological after many overflows (for example, capacity 3 with 10 pushes yields `seq` 8, 9, 10);
  - `seq` is gap-free across overwrites, so `snapshot()[0].seq - 1 === dropped`;
  - pushed events are frozen;
  - `capacity` of 0, 2049, 1.5, or `'8'` throws `RangeError`;
  - `clear()` resets counters while keeping `seq` monotonic.
- `tests/unit/recording-state-machine.test.mjs`:
  - every valid transition in §4.2 succeeds;
  - every other `(state, action)` pair throws `InvalidTransitionError`, checked as an exhaustive table rather than samples;
  - `canAccept()` is true only in `RECORDING`;
  - with a fake clock, `activeElapsedMs()` excludes time spent in `PAUSED`.

---

## 3. Refactoring Sequence

This sprint adds code only. It touches no existing file except `package.json` if ERB-00/R7 has not landed yet.

| Step | Action | Exit check |
| :--- | :--- | :--- |
| **R1** | Write the two test files first (red). | Tests fail because the modules are missing. |
| **R2** | Implement `event-ring-buffer.js` until its tests pass. | `node --test tests/unit/event-ring-buffer.test.mjs` passes. |
| **R3** | Implement `recording-state-machine.js` until its tests pass. | `node --test tests/unit/recording-state-machine.test.mjs` passes. |
| **R4** | Confirm browser loadability: `await import('/js/harness/event-ring-buffer.js')` in the lab console (no Node-only APIs). | Import resolves with no errors. |

---

## 4. Technical Specification

### 4.1 Types

```typescript
interface CapturedEvent {           // ERB-02 defines the full NormalizedEvent payload
  seq: number;                      // stamped by the buffer, starts at 1
  t_rel_ms: number;                 // active-time ms from RecordingStateMachine.activeElapsedMs()
  type: string;
  [key: string]: unknown;
}

interface RingBufferStats {
  capacity: number;
  size: number;                     // 0 ≤ size ≤ capacity
  dropped: number;                  // count of overwritten events
  head: number;                     // next write slot
  tail: number;                     // oldest live slot
  nextSeq: number;
}

type RecordingState = 'IDLE' | 'RECORDING' | 'PAUSED' | 'FINALIZED';
```

### 4.2 Transition Table (`INV-ERB-03`)

| From \ Action | `start` | `pause` | `resume` | `stop` | `reset` |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `IDLE` | → `RECORDING` | ✖ | ✖ | ✖ | ✖ |
| `RECORDING` | ✖ | → `PAUSED` | ✖ | → `FINALIZED` | ✖ |
| `PAUSED` | ✖ | ✖ | → `RECORDING` | → `FINALIZED` | ✖ |
| `FINALIZED` | ✖ | ✖ | ✖ | ✖ | → `IDLE` |

✖ = throws `InvalidTransitionError({ from, action })`.

### 4.3 Pointer Math

```javascript
push(event) {
  const seq = this._nextSeq++;
  const stamped = Object.freeze({ ...event, seq });
  if (this._size === this._capacity) {
    this._tail = (this._tail + 1) % this._capacity;   // oldest slot is overwritten
    this._dropped++;
  } else {
    this._size++;
  }
  this._slots[this._head] = stamped;
  this._head = (this._head + 1) % this._capacity;
  return seq;
}
```

> [!NOTE]
> "Bounded footprint" means the **slot array** never grows and push is O(1). The caller still allocates each event object; JavaScript gives no zero-allocation guarantee, and this spec claims none.

---

## 5. Definition of Done (DoD) & Verification

- [ ] `vcard:sprint-erb-01:ring_buffer_module_created`: `js/harness/event-ring-buffer.js` exists with zero runtime dependencies and loads in both browser and Node.
- [ ] `vcard:sprint-erb-01:state_machine_module_created`: `js/harness/recording-state-machine.js` exists with an injected clock.
- [ ] `vcard:sprint-erb-01:pointer_math_validated`: Wrap-around, overwrite accounting, and gap-free `seq` are proven by tests.
- [ ] `vcard:sprint-erb-01:fsm_exhaustively_tested`: All 20 `(state, action)` pairs are asserted against §4.2.
- [ ] `vcard:sprint-erb-01:active_time_clock_verified`: Paused intervals are excluded from `t_rel_ms`.
- [ ] `vcard:sprint-erb-01:unit_suites_pass`: Both suites pass under `npm run test:unit`.

### Execution Command
```bash
node --test tests/unit/event-ring-buffer.test.mjs tests/unit/recording-state-machine.test.mjs
```
