# Sprint ERB-00: Infrastructure Modularization & Lab Refactor Baseline

> **Merged spec.** This file combines two parallel drafts from 2026-10-20: Yohanes's `41cc6a1` (module home `js/harness/`, `target-membrane.js`, `lab-toolbar.js`, `INV-INF-01`) and the code-verified refactor sequence R0–R7.

## Metadata
- **Sprint Code**: `SPRINT-ERB-00`
- **Handle**: `urn:pcard:sprint:SPRINT-ERB-00`
- **Status**: `SPECIFICATION`
- **Archetype**: `ClmTriadManifest`
- **Depends on**: — (first in series)
- **Unblocks**: `SPRINT-ERB-01`, `SPRINT-ERB-05`, and through them every later sprint
- **pstack Playbook**: `architect` + `principle-boundary-discipline` + `principle-subtract-before-you-add` + `principle-migrate-callers-then-delete-legacy-apis` + `principle-sequence-verifiable-units`

---

## 1. Context & Objective

`responsive-lab.html` is the stage every later sprint builds on. Today it is a 1405-line page with a ~470-line inline module (L932–1405) that mixes geometry math, DOM binding, target selection, the device manager UI, and a test API.

Adding capture, fidelity badges, and conformance panels to that script would lock in the wrong shape. This sprint makes the page a thin shell over small, testable ESM modules **without changing behaviour**, so ERB-01 through ERB-06 can plug into stable seams:

- `lab:viewport-change` — the event the recorder subscribes to (ERB-02).
- `lab:target-change` — the event capture membranes re-arm on (ERB-02).
- `window.__lab` — the one test API that Playwright uses (ERB-02, -04, -06).
- `app-config.json#labTargets` — the one registry of targets and allowed origins (ERB-02 origin checks, `ws-server.js` CORS).

---

## 2. Baseline (verified on `main` @ `6f9a53a`)

| Concern | Location today | Problem |
| :--- | :--- | :--- |
| Scale and rotation math | Inline `computeScale`, `recomputeScale` (~L1040–1070), `rotateViewport` | Pure math is untestable without a browser. |
| Stage CSS variables | Inline `applyViewportGeometry` (L988+) writes `--frame-target-width/height`, `--frame-scale-factor` | Other modules cannot learn about geometry changes without polling. |
| Target decision | Static `<iframe src="app.html">` (L866); `iframe.src = url` (L1346, **Load Target**); `iframe.src = targetParam` (L1365, `?target=`); pop-out reads `siteSelector.value` (L1352) | Three writers, no validation, `INV-STU-01` held only by convention. |
| Target list | `<select id="public-site-selector">` options (L828+) **and** `ws-server.js` CORS `origin` array (L32–42) | Adding `http://localhost:4321/` needed two edits in two files. |
| Presets and Device Manager | Inline `renderPresets`, `renderManagerList`, `openDeviceManager`, `closeDeviceManager` (L1112–1210) | UI and state interleaved. |
| Test API | 8 globals: `__set_controlled_panel_width`, `__get_controlled_panel_width`, `__set_controlled_orientation`, `__get_controlled_orientation`, `__get_viewport_geometry`, `__set_viewport_geometry`, `__rotate_viewport`, `__device_registry` (L1394–1401) | Flat global surface; no namespace to extend. |
| Unit harness | `node:test` files are scattered (`tests/single-page-mcard.test.mjs`, `tests/observability/*.test.js`); no `test:unit` script | No standard home for the pure modules this series adds. |
| `?target=` boot | Added in `6f9a53a` | No test covers it. |

---

## 3. BMAD Agent Responsibilities

### 🏛️ Architect (Winston)
- Approve the module map in §4 before code moves. Each module has one reason to change.
- Define the two DOM events and their `detail` shapes (§5.2).
- Enforce `INV-STU-01` structurally: after R3, `target-membrane.js` is the **only** code that assigns `iframe.src`.

### 💻 Dev (Amelia)
- Execute R0–R7 in order. One step per commit. Each commit leaves both gates green.
- Move code; do not rewrite it. Behaviour changes belong in later sprints.

### 🧪 TEA (Murat)
- Write the R0 characterization tests **before** any extraction.
- Write unit tests for every pure module extracted in R1 and R3.
- Record the baseline pass counts of `responsive-rotation-and-devices.spec.js` (30 at last run) and `layout-freeze.spec.js`. Fail the sprint if either drops.
- Enforce **`INV-INF-01` (Zero Regression Guarantee)**: no existing Playwright **assertion** (expected value or matcher) changes during this sprint. R6 may only rewrite how a test reaches the lab (for example `window.__device_registry` → `window.__lab.registry`), never what it expects.

### 📝 Tech Writer (Paige)
- Update `docs/functionalities/09-RESPONSIVE-LAB-PENPOT-AND-DESIGN-SYSTEM.md` with the module map and the `window.__lab` API.

---

## 4. Target Module Map

```text
responsive-lab.html            ← markup + CSS + ≤ 60-line boot script
js/harness/
  viewport-geometry.js         ← pure: computeScale, rotate, clampDims, formatDims        (R1)
  viewport-stage.js            ← DOM: CSS vars, ResizeObserver; setViewportSize, setOrientation,
                                 rotate, recomputeScale, getGeometry; emits lab:viewport-change (R2)
  target-membrane.js           ← resolveTarget (pure) + bindTarget (sole iframe.src writer),
                                 getTargetUrl, getIframeWindow, getIframeRect, checkSandboxPolicy;
                                 emits lab:target-change                                   (R3)
  lab-toolbar.js               ← loads app-config.json#labTargets; renders the target <select>,
                                 Load Target and pop-out controls                          (R4)
  device-presets-ui.js         ← preset chips + Device Manager modal                       (R5)
  lab-api.js                   ← installs window.__lab                                     (R6)
js/device-registry.js          ← unchanged in this sprint (extended in ERB-05)
```

`checkSandboxPolicy(url)` returns `{ allowed, reason? }`. It wraps the existing iframe-compatibility diagnostics (the `data-status` / CORS-block alert logic in `updateSiteSelection`) and, for absolute URLs, the server probe `GET /api/mcard/probe-url`. It does not add a new probe.

---

## 5. Technical Specification

### 5.1 Refactoring Sequence

Run all gates after **every** step:

```bash
npm run test:unit            # from R7 onward; before R7 run node --test on the new files directly
npx playwright test tests/features/responsive-rotation-and-devices.spec.js tests/features/layout-freeze.spec.js --project=features
```

| Step | Action | Kind | Exit check |
| :--- | :--- | :--- | :--- |
| **R0** | Add **RVP-T11**: `responsive-lab.html?target=app.html` selects the matching `<option>` and loads it. Add **RVP-T12**: an unknown `?target=` prepends a "Chosen Target" option, selects it, and loads it. | Characterization | Both pass on unchanged code. |
| **R1** | Move scale and rotation math into `viewport-geometry.js` as pure functions. The inline script imports them. Add `tests/unit/viewport-geometry.test.mjs`: containment (`s = min(1, W/w, H/h)`), no upscaling, rotate-twice identity, `DIM_MIN`/`DIM_MAX` clamping. | Extract | Unit + RVP green. |
| **R2** | Move CSS-variable writes and the `ResizeObserver` into `viewport-stage.js` (`createViewportStage({ frame, wrapper, container })`). On every committed change, dispatch `lab:viewport-change` on `document`. | Extract | RVP-T01, T02, T02b, T02c, T09, T10 green. |
| **R3** | Create `target-membrane.js`. `resolveTarget(raw, baseHref)` resolves relative URLs with `new URL(raw, baseHref)`, then validates absolute URLs with `assertSafeUrl` from `js/external-portal-membrane.js`. `bindTarget(url)` is the single writer of `iframe.src`; the pop-out reads `getTarget()`. Remove the static `src="app.html"` and boot through `bindTarget(resolveTarget(param ?? defaultTarget))`. Dispatch `lab:target-change`. Add `tests/unit/target-membrane.test.mjs`: relative resolution, `javascript:` / `data:` / credentialed URLs rejected. | Consolidate | RVP-T06, T11, T12 green. `grep -n "iframe.src" responsive-lab.html` returns nothing. |
| **R4** | Add `labTargets` to `app-config.json` (`[{ url, label, status, desc }]`). `lab-toolbar.js` fetches `/app-config.json` and renders the `<select>`. `ws-server.js` builds its CORS `origin` list from the static base list plus the origins of absolute `labTargets` URLs. Delete the hardcoded `<option>` elements. | Consolidate | Selector shows the same entries as before. `curl -H 'Origin: http://localhost:4321' -I http://localhost:3001/health` still returns `Access-Control-Allow-Origin`. |
| **R5** | Move `renderPresets`, `renderManagerList`, `openDeviceManager`, `closeDeviceManager`, and the form handlers into `device-presets-ui.js`. | Extract | RVP-T03, T03b, T03c, T04, T05, T07, T08 green. |
| **R6** | `lab-api.js` installs `window.__lab` (§5.3). Grep every caller of the 8 legacy globals in this repo **and** sibling repos under `MCard_TDD/` (for example `mcard-studio`). Migrate them, then delete the legacy globals in the **same** commit. | Migrate + delete | `grep -rn "__set_controlled\|__get_controlled\|__set_viewport_geometry\|__get_viewport_geometry\|__rotate_viewport\|__device_registry"` returns nothing outside `CHANGELOG.md`. |
| **R7** | Create `tests/unit/`. Add `"test:unit": "node --test tests/unit/"` to `package.json`. Move the R1/R3 tests there if they started elsewhere. Do **not** move existing `node:test` files in this sprint. | Harness | `npm run test:unit` exits 0. |

### 5.2 Lab Events

```typescript
// dispatched on document by viewport-stage.js after geometry is committed
interface LabViewportChangeDetail {
  width: number;            // CSS px of the target viewport (unscaled)
  height: number;
  unit: 'px' | '%';
  orientation: 'portrait' | 'landscape';  // derived: width > height ⇒ 'landscape'. The lab's internal
                                          // 'horizontal' / 'vertical' state names stay unchanged.
  scale: number;            // stage scale factor s, 0 < s ≤ 1
  deviceId: string | null;  // registry id when a preset is active
  cause: 'preset' | 'rotate' | 'custom' | 'resize' | 'boot';
}

// dispatched on document by target-membrane.js after iframe.src is assigned
interface LabTargetChangeDetail {
  url: string;              // absolute URL after resolution
  origin: string;           // new URL(url).origin
  sameOrigin: boolean;      // origin === location.origin
  cause: 'boot-param' | 'boot-default' | 'load-button';
}
```

### 5.3 `window.__lab` Test API

```typescript
interface LabTestApi {
  version: 1;
  geometry: {
    get(): LabViewportChangeDetail;
    set(width: number, height: number): void;
    rotate(): void;
    setOrientation(o: 'portrait' | 'landscape'): void;
  };
  target: {
    get(): LabTargetChangeDetail;
    set(url: string): void;   // goes through resolveTarget + bindTarget
  };
  registry: DeviceRegistry;   // the live instance from js/device-registry.js
}
```

Later sprints extend this object (`__lab.recorder` in ERB-02, `__lab.fidelity` in ERB-05). They never add new top-level globals.

---

## 6. Definition of Done (DoD) & Verification

- [ ] `vcard:sprint-erb-00:target_boot_characterized`: RVP-T11 and RVP-T12 pass before and after the refactor.
- [ ] `vcard:sprint-erb-00:geometry_module_extracted`: `viewport-geometry.js` is pure and covered by `tests/unit/viewport-geometry.test.mjs`.
- [ ] `vcard:sprint-erb-00:viewport_change_event_emitted`: `lab:viewport-change` fires once per committed geometry change with the §5.2 shape.
- [ ] `vcard:sprint-erb-00:single_iframe_src_writer`: `target-membrane.js` is the only assignment site of `iframe.src` (`INV-STU-01`).
- [ ] `vcard:sprint-erb-00:single_target_registry`: `<select>` options and CORS origins both derive from `app-config.json#labTargets` (`INV-STU-02`).
- [ ] `vcard:sprint-erb-00:lab_api_consolidated`: `window.__lab` is installed; the 8 legacy globals and all their callers are gone.
- [ ] `vcard:sprint-erb-00:inline_script_thin`: The inline module in `responsive-lab.html` is ≤ 60 lines of boot wiring.
- [ ] `vcard:sprint-erb-00:no_regression`: `responsive-rotation-and-devices.spec.js` pass count ≥ baseline (30) + 2 new tests; `layout-freeze.spec.js` unchanged; no assertion edited (`INV-INF-01`).

### Execution Command
```bash
npm run test:unit && \
npx playwright test tests/features/responsive-rotation-and-devices.spec.js tests/features/layout-freeze.spec.js --project=features
```
