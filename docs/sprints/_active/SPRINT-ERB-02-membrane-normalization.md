# Sprint ERB-02: Target Membrane Interceptor, Spatial Normalization & Lab UI

## Metadata
- **Sprint Code**: `SPRINT-ERB-02`
- **Handle**: `urn:pcard:sprint:SPRINT-ERB-02`
- **Status**: `SPECIFICATION`
- **Archetype**: `ClmTriadManifest`
- **pstack Playbook**: `feature` + `principle-boundary-discipline`

---

## 1. Context & Objective
Intercept DOM interactions inside the Responsive UI Lab iframe (`#mission-control-iframe`) specifically bound to a **chosen LandingPage target URL** (e.g., `http://localhost:4321/` or `app.html`). Normalize all spatial coordinates to the target frame's unscaled coordinate space $[0.0, 1.0]$, ensuring capture fidelity remains invariant to the stage zoom/scale factor $s$ (`INV-RVP-02`) and device rotation (`INV-RVP-01`).

---

## 2. BMAD Agent Responsibilities

### 🎨 UX Designer (Evelyn)
- Design the recording control ribbon in `responsive-lab.html`:
  - Target URL input/selector with status indicator (`Active: http://localhost:4321/`).
  - Record controls (🔴 Start / ⏹️ Stop / ⏸️ Pause).
  - Telemetry HUD indicator showing active state, event counter, and drop count.
  - Follow existing design system (`public/css/semantic-tokens.css`).

### 🏛️ Architect (Winston)
- Enforce **`INV-STU-01` (Single Target Focus)**: All listeners and normalization pipeline are configured around the designated target URL.
- Enforce **`INV-ERB-02` (Scale-Free Coordinates)**:
  $$nx = \frac{e.\text{clientX} - \text{rect}.\text{left}}{\text{rect}.\text{width}}, \quad ny = \frac{e.\text{clientY} - \text{rect}.\text{top}}{\text{rect}.\text{height}}$$
  Where `rect` is calculated against the iframe client rect, completely canceling out CSS `scale(s)`.
- Establish membrane boundary between parent laboratory shell and iframe child window.
- Design element locator hierarchy: `data-testid` > `#id` > `.class-path`.

### 💻 Dev (Amelia)
- Update `responsive-lab.html` to support `?target=<URL>` parameterization on boot.
- Implement `js/recording-controller.js`:
  - `attach(iframeElement, targetUrl)`: Passive listeners for `click`, `input`, `change`, `scroll`.
  - Frame-rate governor using `requestAnimationFrame` for scroll/drag events.
  - Listen for device orientation swap events (`INV-RVP-01`) and emit `orientation_change` markers.
  - Integrate with `EventRingBuffer` from Sprint ERB-01.
- Update `responsive-lab.html` to instantiate the controller and mount the UI toolbar.

### 🧪 Test Engineering Architect (TEA - Murat)
- Build automated Playwright assertion testing the normalization formula:
  - Load `responsive-lab.html?target=http://localhost:4321/` with scaled viewport ($s < 1$).
  - Trigger clicks at four known corners of the target frame ($0\%, 0\%$), ($100\%, 100\%$), etc.
  - Assert normalized coordinates match within $\pm 0.01$ tolerance across multiple device presets.

---

## 3. Technical Specification

### 3.1 Normalized Event Payload Schema
```typescript
interface NormalizedEvent {
  seq: number;
  t_rel_ms: number;
  targetUrl: string;                     // e.g., "http://localhost:4321/"
  type: 'click' | 'input' | 'scroll' | 'orientation_change';
  target: {
    selector: string;
    tag: string;
  };
  viewport: {
    w: number;
    h: number;
    dpr: number;
    orientation: 'portrait' | 'landscape';
  };
  coords?: {
    nx: number; // 0.0 to 1.0
    ny: number; // 0.0 to 1.0
  };
  payload?: {
    value?: string;
    scrollX?: number;
    scrollY?: number;
  };
}
```

---

## 4. Definition of Done (DoD) & Verification

- [ ] `vcard:sprint-erb-02:target_param_boot_supported`: `responsive-lab.html?target=<URL>` boots directly into the chosen target.
- [ ] `vcard:sprint-erb-02:recording_controller_implemented`: `js/recording-controller.js` attaches cleanly to `#mission-control-iframe`.
- [ ] `vcard:sprint-erb-02:scale_free_normalization_verified`: Coordinates are proven invariant across `--frame-scale-factor` ranges ($0.25 \le s \le 1.0$).
- [ ] `vcard:sprint-erb-02:rotation_event_logging`: Orientation toggling logs `orientation_change` with swapped target dimensions per `INV-RVP-01`.
- [ ] `vcard:sprint-erb-02:ui_ribbon_operational`: Responsive Lab controls start, pause, and stop recording with live event metrics.

### Execution Command:
```bash
npx playwright test tests/smoke/responsive-lab.spec.js
```
