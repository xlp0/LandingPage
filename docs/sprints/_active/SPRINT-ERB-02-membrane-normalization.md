# Sprint ERB-02: Target Membrane Interceptor, Touch Ergonomics & Scale-Free Normalization

> **Merged spec.** Combines Yohanes's `41cc6a1` draft (`js/harness/membrane-interceptor.js`, live touch-ergonomics auditing, rAF throttling) with the code-verified cross-origin capture design below.

## Metadata
- **Sprint Code**: `SPRINT-ERB-02`
- **Handle**: `urn:pcard:sprint:SPRINT-ERB-02`
- **Status**: `SPECIFICATION`
- **Archetype**: `ClmTriadManifest`
- **Depends on**: `SPRINT-ERB-00` (events, `bindTarget`, `window.__lab`), `SPRINT-ERB-01` (buffer + FSM), `SPRINT-ERB-05` (`pointer`/`hasTouch`, fidelity)
- **Unblocks**: `SPRINT-ERB-03`
- **pstack Playbook**: `architect` + `principle-boundary-discipline` + `principle-subtract-before-you-add`

---

## 1. Context & Objective

Record what a user does to the **chosen target** inside the Responsive Lab, in a form that replays on any device size.

### 1.1 Correction to the earlier draft: cross-origin reality
The earlier draft said the lab would "attach passive listeners" to `#mission-control-iframe`. That only works when the target is **same-origin** with the lab (for example `app.html` on `:3001`). For `http://localhost:4321/` and any staging URL, the browser blocks `iframe.contentDocument` (`null`), so the parent cannot attach listeners.

This sprint therefore defines **two capture sources behind one interface**, plus an explicit unavailable state:

| Capture source | When | How |
| :--- | :--- | :--- |
| `same-origin` | `new URL(target).origin === location.origin` | The lab attaches capture-phase passive listeners to `iframe.contentDocument`. |
| `probe-agent` | Cross-origin target that loads `lab-probe-agent.js` (opt-in `<script>` in the target's dev build, or `page.addInitScript` in Playwright) | The agent normalizes events in the child and posts them to the lab over a nonce-armed `postMessage` channel. |
| `unavailable` | Cross-origin target without the agent | Recording is disabled. The ribbon shows the reason and how to add the agent. Never silent. |

### 1.2 Correction to the normalization formula
CSS `transform: scale(s)` on the parent does **not** change the child document's layout viewport. Inside the iframe, `clientX`/`clientY` are already in unscaled CSS pixels. So normalization is computed **in the child**:

$$nx = \frac{e.\text{clientX}}{\text{innerWidth}_{\text{child}}}, \qquad ny = \frac{e.\text{clientY}}{\text{innerHeight}_{\text{child}}}$$

This is scale-free by construction (`INV-ERB-02`). The parent-side `getBoundingClientRect` formula from the earlier draft is dropped: it only applies to events captured on a parent overlay, which this design does not use. Both sources call the **same** pure `normalizeEvent()` so there is one implementation.

---

## 2. BMAD Agent Responsibilities

### 🏛️ Architect (Winston)
- Define the `CaptureSource` interface (§4.1) and the `lab-capture/v1` handshake (§4.3).
- Enforce **`INV-ERB-05`**: for the probe agent, reuse `createTelemetryReceiver` from `js/external-portal-membrane.js` (source + origin + nonce + schema + type checks). `expectedOrigin` must be an origin listed in `app-config.json#labTargets` (ERB-00/R4).
- Enforce **`INV-PRV-01`** (capture privacy) in `normalizeEvent()`, so both sources inherit it.
- Selector priority: `[data-testid]` → `#id` (if unique) → `[aria-label]` + role → CSS path with `:nth-of-type`, max depth 5.

### 💻 Dev (Amelia)
- `js/harness/normalize-event.js` (pure, no DOM globals; DOM facts are passed in).
- `js/harness/membrane-interceptor.js` — the lab-side entry point. On every `lab:target-change` it calls `createCaptureSource(detail)`, which returns the right `CaptureSource` (`same-origin`, `probe-agent`, or `unavailable`). It applies `requestAnimationFrame` throttling to scroll and drag streams.
- `js/harness/capture-same-origin.js` and `js/harness/capture-probe-agent.js` (the two concrete sources behind the interceptor).
- `js/harness/lab-probe-agent.js` (runs inside the target; zero dependencies; reuses `normalize-event.js`).
- `js/harness/recorder.js` composes `EventRingBuffer` + `RecordingStateMachine` + the active `CaptureSource`. It also listens to `lab:viewport-change` and `lab:target-change` from ERB-00.
- `js/harness/recording-ribbon.js` (UI only; talks to `recorder.js` through its public methods).
- Extend `window.__lab` with `recorder: { start, pause, resume, stop, state, stats, snapshot, source }`.

### 🎨 UX Designer (Sally)
- Recording ribbon in `responsive-lab.html`: active target and capture source (`same-origin` / `probe-agent` / `unavailable`), 🔴 Start / ⏸ Pause / ⏹ Stop, live event count, drop count, rejected-message count, a **tap-target health indicator** (count of undersized taps this session), and the ERB-05 fidelity badge.
- Undersized-tap markers: a brief outline on the stage at the tapped element's rect.
- Safe-area notch overlays moved to ERB-05 as a **visual guide** only. Injecting `--safe-area-*` custom properties into the target was dropped: real pages read `env(safe-area-inset-*)`, which an iframe cannot change, so it would report false passes. Real safe-area checks need T3 (ERB-06).
- Colours from `public/css/semantic-tokens.css` only (RVP-T05 already checks tokens in the manager UI; apply the same rule).

### 🧪 TEA (Murat)
- `tests/unit/normalize-event.test.mjs`: corner points map to `0`/`1`, values clamp into `[0, 1]`, 4-decimal rounding (feeds `INV-ERB-04`), redaction rules, and the selector priority order.
- `tests/features/responsive-capture.spec.js` (`features` project, `retries: 0`), see §5.

---

## 3. Refactoring Sequence

| Step | Action | Kind | Exit check |
| :--- | :--- | :--- | :--- |
| **R1** | In `js/external-portal-membrane.js`, add an optional `schema` parameter to `validatePortalTelemetryMessage` and `createTelemetryReceiver`, defaulting to `TELEMETRY_SCHEMA_VERSION`. No SMR-09 caller changes. | Generalize | `node --test tests/single-page-mcard.test.mjs` and `tests/smoke/single-page-mcard.spec.js` green. |
| **R2** | Add `normalize-event.js` with unit tests. | Add | `tests/unit/normalize-event.test.mjs` green. |
| **R3** | Add `recorder.js`. It subscribes to `lab:viewport-change` and pushes `viewport_change` / `orientation_change` markers. It adds no geometry code of its own. | Wire | Unit test with a fake source and a fake clock. |
| **R4** | Add `capture-same-origin.js`; select it when `lab:target-change.detail.sameOrigin` is true. | Add | Capture spec cases C1–C3 green. |
| **R5** | Add `lab-probe-agent.js` and `capture-probe-agent.js` using the R1 receiver with `schema: 'lab-capture/v1'`. | Add | Capture spec cases C4–C6 green. |
| **R6** | Add `recording-ribbon.js` and mount it. Install `window.__lab.recorder`. | Wire | Capture spec case C7 green; RVP suite green. |
| **R7** | Add the fixture page `tests/fixtures/probe-target.html` (it includes the agent and has known `data-testid` targets at the four corners and the centre). | Test fixture | Loads at both `http://localhost:3001/…` and `http://127.0.0.1:3001/…`. |

---

## 4. Technical Specification

### 4.1 `CaptureSource` Interface

```typescript
interface CaptureSource {
  readonly kind: 'same-origin' | 'probe-agent' | 'unavailable';
  readonly reason?: string;                       // set when kind === 'unavailable'
  attach(onEvent: (e: NormalizedEvent) => void): void;
  detach(): void;                                 // called on lab:target-change and on stop()
  stats(): { received: number; rejected: number; rejectReasons: Record<string, number> };
}
```

### 4.2 Normalized Event Payload

```typescript
interface NormalizedEvent {
  seq: number;                    // stamped by EventRingBuffer (ERB-01)
  t_rel_ms: number;               // active-time from RecordingStateMachine (ERB-01)
  type:
    | 'pointer'                   // pointerdown + pointerup collapsed into one tap/click record
    | 'input'                     // input / change, value redacted per INV-PRV-01
    | 'key'                       // only Enter, Escape, Tab, Arrow*, Space — never characters
    | 'scroll'                    // rAF-throttled, document scroll position
    | 'viewport_change'           // from lab:viewport-change (parent-originated)
    | 'orientation_change'        // from lab:viewport-change with cause 'rotate'
    | 'media_change'              // matchMedia listener fired in the child
    | 'visibility'                // visibilitychange
    | 'navigation'                // child URL changed (pushState, popstate, full load)
    | 'pause' | 'resume';         // FSM markers
  target?: { selector: string; tag: string; role?: string };
  pointer?: { pointerType: 'mouse' | 'touch' | 'pen'; button: number };
  ergonomics?: {                                         // pointer events only (live touch-ergonomics audit)
    rect: { w: number; h: number };                      // tapped element's CSS px box
    undersized: boolean;                                 // true when the active profile has pointer 'coarse'
                                                         // and w or h < minTapTarget (default 44, INV-DEV-02)
  };
  coords?: { nx: number; ny: number };                   // 4-decimal, clamped to [0, 1]
  scroll?: { x: number; y: number; docW: number; docH: number };
  viewport: { w: number; h: number; dpr: number; orientation: 'portrait' | 'landscape' };
  media?: { query: string; matches: boolean };
  value?: string;                                        // '<redacted>' when INV-PRV-01 applies
  url?: string;                                          // for 'navigation'
}
```

`media_change` watches a fixed query list: `(pointer: coarse)`, `(hover: hover)`, `(orientation: portrait)`, `(prefers-color-scheme: dark)`, `(prefers-reduced-motion: reduce)`, and `(min-resolution: 2dppx)`. The agent sends the initial values once as part of `lab:ready`.

### 4.3 `lab-capture/v1` Handshake (probe agent)

```text
child (agent)                                         parent (lab)
  ── {schema:'lab-capture/v1', type:'lab:hello'} ──▶  checks event.source === iframe.contentWindow
                                                      and event.origin ∈ labTargets origins
  ◀── {type:'lab:arm', nonce} (targetOrigin = event.origin) ──
  ── {type:'lab:ready', nonce, payload:{viewport, media[]}} ──▶  createTelemetryReceiver(...).handleMessage
  ── {type:'lab:event', nonce, payload: NormalizedEvent} ──▶     ...
  ◀── {type:'lab:disarm'} on stop / target change ──
```

- `lab:hello` is the only message accepted without a nonce, and it is used only to issue `lab:arm`.
- The nonce rotates on every `start()` and is revoked on `stop()` and on `lab:target-change` (`rotateNonce` / `revokeNonce`, already present in `createTelemetryReceiver`).
- Allowed types: `lab:ready`, `lab:event`, `lab:final-state`.
- At `stop()`, the agent posts `lab:final-state` with `{ url, domDigestInput }`. `domDigestInput` is the sorted list of `[data-testid]` elements with their visibility and trimmed text. ERB-03 hashes it; ERB-04 compares against it.

---

## 5. Playwright Capture Spec (`tests/features/responsive-capture.spec.js`)

Lab URL: `http://localhost:3001/responsive-lab.html`. The cross-origin fixture is `http://127.0.0.1:3001/tests/fixtures/probe-target.html`. `localhost` and `127.0.0.1` are different origins, so one `:3001` server gives a true cross-origin case. Add `http://127.0.0.1:3001` to `labTargets` for tests.

| Case | Setup | Assertion |
| :--- | :--- | :--- |
| **C1** | Same-origin fixture; presets `iphone-16-pro`, `ipad-air-11`, `desktop-fhd`; scale forced to 0.25, 0.5, 1.0 via window size | Clicking each corner/centre `data-testid` gives `nx, ny` within ±0.01 of expected for every (device, scale) pair. |
| **C2** | Same-origin; rotate | One `orientation_change` with swapped `w`/`h` (`INV-RVP-01`). |
| **C3** | Same-origin; type into `type=password` and a normal field | Password value is `<redacted>`; no `key` events contain characters. |
| **C4** | Cross-origin fixture with agent | Source is `probe-agent`; C1 assertions hold. |
| **C5** | Cross-origin; inject a forged `postMessage` from a non-allowlisted window and a replayed message with a stale nonce | Both are dropped; `rejectReasons` shows `origin_mismatch` / `source_mismatch` and `nonce_mismatch`. |
| **C6** | Cross-origin fixture **without** agent | Source is `unavailable`; Start is disabled; the reason is shown. |
| **C7** | Start → 5 clicks → Pause → 3 clicks → Resume → 2 clicks → Stop | `stats().size === 7` + markers; state `FINALIZED`; `t_rel_ms` excludes the paused interval. |
| **C8** | Same-origin fixture with a 20×20 px button and a 48×48 px button; preset `iphone-16-pro` (coarse) then `desktop-fhd` (fine) | On the phone, only the 20×20 tap has `ergonomics.undersized: true` and the ribbon indicator shows 1. On desktop, neither is flagged. |

---

## 6. Definition of Done (DoD) & Verification

- [ ] `vcard:sprint-erb-02:membrane_schema_parameterized`: R1 landed with SMR-09 tests green.
- [ ] `vcard:sprint-erb-02:normalizer_single_implementation`: Both sources use `normalize-event.js`; unit tests green.
- [ ] `vcard:sprint-erb-02:same_origin_capture_verified`: C1–C3 pass.
- [ ] `vcard:sprint-erb-02:cross_origin_probe_verified`: C4–C5 pass; forged and stale messages are rejected and counted (`INV-ERB-05`).
- [ ] `vcard:sprint-erb-02:unavailable_state_explicit`: C6 passes.
- [ ] `vcard:sprint-erb-02:scale_free_normalization_verified`: `nx, ny` stay within ±0.01 across `0.25 ≤ s ≤ 1.0` (`INV-ERB-02`).
- [ ] `vcard:sprint-erb-02:ribbon_operational`: C7 passes; the ribbon shows source, counts, and fidelity.
- [ ] `vcard:sprint-erb-02:touch_ergonomics_auditing`: C8 passes; undersized taps are flagged only on coarse-pointer profiles.
- [ ] `vcard:sprint-erb-02:no_regression`: RVP suite and SMR-09 tests green.

### Execution Command
```bash
node --test tests/unit/normalize-event.test.mjs && \
npx playwright test tests/features/responsive-capture.spec.js tests/features/responsive-rotation-and-devices.spec.js --project=features
```
