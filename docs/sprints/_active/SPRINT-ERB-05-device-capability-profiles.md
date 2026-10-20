# Sprint ERB-05: Device Capability Profiles & Fidelity Tiers

> **Merge note (41cc6a1).** This file replaces Yohanes's `SPRINT-ERB-05-device-sensitive-systematic-sweeps.md`. Its two halves moved: the multi-device sweep is now in ERB-04, and certification is now in ERB-06 §6.3. ERB-05 keeps the number for the capability registry and fidelity tiers, which both of those depend on. His safe-area CSS-variable idea from ERB-02 becomes the visual-only notch overlay in R8 below.

## Metadata
- **Sprint Code**: `SPRINT-ERB-05`
- **Handle**: `urn:pcard:sprint:SPRINT-ERB-05`
- **Status**: `SPECIFICATION`
- **Archetype**: `ClmTriadManifest`
- **Depends on**: `SPRINT-ERB-00` (`window.__lab`, `npm run test:unit`)
- **Runs in parallel with**: `SPRINT-ERB-01`
- **Unblocks**: `SPRINT-ERB-02` (pointer-type semantics), `SPRINT-ERB-03` (run payload `device` + `fidelity`), `SPRINT-ERB-04` (Playwright contexts), `SPRINT-ERB-06` (check predicates)
- **pstack Playbook**: `architect` + `principle-type-system-discipline` + `principle-make-operations-idempotent`

---

## 1. Context & Objective

A device is more than a width and height. Today `js/device-registry.js` stores `width`, `height`, and `pixelRatio`. It cannot say whether a device has touch, a coarse pointer, hover, a mobile user agent, or a notch.

Without those facts:

- Playwright sweeps cannot build honest device contexts.
- Conformance checks cannot decide which rules apply (for example, tap-target size applies to coarse pointers).
- A T0 iframe recording can be mistaken for a full device test.

This sprint makes the registry the **single source of truth for device capabilities** (`INV-DSF-02`) and adds a **fidelity resolver** that states exactly what a given runner emulates for a given profile (`INV-DSF-01`).

---

## 2. Device-Sensitive Dimensions Catalog (Analyst — Mary)

| Capability field | Type | Device-sensitive behaviour it drives | Lowest tier that emulates it |
| :--- | :--- | :--- | :--- |
| `width`, `height` | int CSS px, `[100, 7680]` | Breakpoints, overflow, layout | T0 |
| `pixelRatio` | number, `(0, 8]` | `srcset`/`image-set` choice, hairlines, canvas sharpness | T1 |
| `hasTouch` | boolean | Touch events, `ontouchstart` feature detection | T1 |
| `isMobile` | boolean | `<meta name="viewport">` honoured, mobile UA defaults | T1 |
| `pointer` | `'coarse' \| 'fine'` | `@media (pointer: coarse)`, tap-target sizing | T1 (via `hasTouch` + `isMobile`) |
| `hover` | boolean | `@media (hover: hover)`, hover-revealed menus | T1 (via `hasTouch` + `isMobile`) |
| `userAgent` | string, optional | Server or client UA sniffing | T1 |
| `safeAreaInsets` | `{ top, right, bottom, left }` CSS px in portrait, optional | `env(safe-area-inset-*)` padding | T3 only |
| `defaultOrientation` | `'portrait' \| 'landscape'` | Initial geometry in sweeps | T0 |

Preference and environment dimensions (`colorScheme`, `reducedMotion`, `locale`, `timezoneId`, `geolocation`, `permissions`, network, CPU) belong to the **run**, not the device. They are declared per sweep or per conformance check in ERB-04 and ERB-06.

---

## 3. BMAD Agent Responsibilities

### 🏛️ Architect (Winston)
- Define registry schema v2 (§5.1) and the v1 → v2 migration (§5.2).
- Define the fidelity model (§5.3). A runner may only claim a capability if it really emulates it.
- Specify the T3 real-device transport interface (§5.4). Implementation is an optional ERB-06 track.

### 💻 Dev (Amelia)
- Extend `validateDevice` and `BUILTIN_DEVICES` in `js/device-registry.js`.
- Add `js/harness/fidelity.js` (pure).
- Add `tests/fixtures/device-matrix.js`, which maps registry profiles to Playwright context options.
- Extend `window.__lab` with `fidelity: { current(): FidelityDeclaration }`.

### 🎨 UX Designer (Sally)
- Add a fidelity badge to the lab telemetry pill, for example **`T0 · viewport only`**. Its tooltip lists `notEmulated` (for example "DPR 3, touch, mobile UA, safe-area").
- Add a toggleable **safe-area overlay** that draws the profile's `safeAreaInsets` (notch, home indicator) over the device frame and swaps sides on rotation. It is a design guide only: it does not change the target's `env(safe-area-inset-*)` values, and no check may treat it as evidence.

### 🧪 TEA (Murat)
- `tests/unit/device-registry-v2.test.mjs`: v2 validation, migration, and idempotency.
- `tests/unit/fidelity.test.mjs`: the tier tables in §5.3.
- Keep the RVP suite green, especially RVP-T03, T03c, T04, and T07.

---

## 4. Refactoring Sequence

| Step | Action | Kind | Exit check |
| :--- | :--- | :--- | :--- |
| **R1** | Extend `validateDevice` with the optional v2 fields (§5.1). v1-shaped input stays valid; missing fields are filled from category defaults by a new pure `withCapabilityDefaults(device)`. | Extend | RVP-T03, T04 green; new unit tests green. |
| **R2** | Add capability fields to every entry in `BUILTIN_DEVICES` (§5.1 table). | Extend | `tests/unit/device-registry-v2.test.mjs` asserts all 8 built-ins validate as v2. |
| **R3** | Change `STORAGE_KEY` to `pkc_responsive_lab_devices_v2`. On load: if v2 is missing and v1 exists, migrate v1 → v2 with `withCapabilityDefaults` and write v2. **Leave v1 untouched** so rolling back the code restores the old state. | Migrate (idempotent) | Migrating twice produces the same v2. RVP-T03c (corrupted storage → factory set) still green. |
| **R4** | Add `js/harness/fidelity.js` with `resolveFidelity(profile, runner, runOptions)`. | Add | `tests/unit/fidelity.test.mjs` green. |
| **R5** | Add `tests/fixtures/device-matrix.js`. It imports `BUILTIN_DEVICES` and exports `toPlaywrightContext(profile, orientation)` and `deviceMatrix({ categories, orientations })`. No device numbers are typed anywhere else in tests. | Consolidate | A unit test asserts the matrix size is 8 devices × 2 orientations = 16. |
| **R6** | Install `window.__lab.fidelity` and render the badge. The badge re-renders on `lab:viewport-change` (ERB-00 event). | Wire | Manual check plus RVP-T09 (telemetry pills) green. |
| **R7** | Update the device table in `docs/functionalities/09-…md` with the capability columns. | Docs | Paige review. |
| **R8** | Add the safe-area overlay toggle to `js/harness/lab-toolbar.js`, drawn from `safeAreaInsets`. | Add (UX) | Overlay follows rotation; RVP suite green with the overlay off (default). |

---

## 5. Technical Specification

### 5.1 Registry Schema v2

```typescript
interface DeviceProfileV2 {
  id: string;
  name: string;
  category: 'phone' | 'tablet' | 'desktop' | 'wearable' | 'custom';
  width: number;                 // portrait-native CSS px for phone/tablet; landscape-native for desktop
  height: number;
  pixelRatio: number;
  isBuiltin: boolean;
  // v2 — optional on input, always present after withCapabilityDefaults()
  hasTouch: boolean;
  isMobile: boolean;
  pointer: 'coarse' | 'fine';
  hover: boolean;
  defaultOrientation: 'portrait' | 'landscape';
  userAgent?: string;
  safeAreaInsets?: { top: number; right: number; bottom: number; left: number };
  schemaVersion: 2;
}
```

Category defaults used by `withCapabilityDefaults`:

| Category | `hasTouch` | `isMobile` | `pointer` | `hover` | `defaultOrientation` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `phone` | true | true | coarse | false | portrait |
| `tablet` | true | true | coarse | false | portrait |
| `wearable` | true | true | coarse | false | portrait |
| `desktop` | false | false | fine | true | landscape |
| `custom` | false | false | fine | true | from `width > height` |

Built-in safe-area insets (portrait): `iphone-16-pro` `{ top: 59, right: 0, bottom: 34, left: 0 }`; `pixel-8` and `galaxy-s24` `{ top: 24, right: 0, bottom: 0, left: 0 }`; others none. These are recorded for T3 comparison and are never claimed as emulated below T3.

### 5.2 Migration Contract
- **Input**: `localStorage[pkc_responsive_lab_devices_v1]` (array of v1 devices) or nothing.
- **Output**: `localStorage[pkc_responsive_lab_devices_v2]`, the same devices with v2 fields filled.
- **Idempotent**: when v2 exists, v1 is ignored.
- **Non-destructive**: v1 is never deleted or rewritten.
- **Fail-safe**: v1 JSON that does not parse falls back to the factory set (same behaviour as RVP-T03c) and logs one warning.

### 5.3 Fidelity Model (`INV-DSF-01`)

```typescript
type Runner = 'lab-iframe' | 'playwright' | 'playwright-cdp' | 'real-device';

interface FidelityDeclaration {
  tier: 0 | 1 | 2 | 3;
  runner: Runner;
  emulated: string[];      // capability names actually in effect
  notEmulated: string[];   // capabilities the profile declares but the runner cannot provide
}
```

| Capability | `lab-iframe` (T0) | `playwright` (T1) | `playwright-cdp` (T2) | `real-device` (T3) |
| :--- | :---: | :---: | :---: | :---: |
| `viewport` | ✅ | ✅ | ✅ | ✅ (native) |
| `pixelRatio` | ❌ | ✅ | ✅ | ✅ |
| `hasTouch`, `pointer`, `hover` | ❌ | ✅ | ✅ | ✅ |
| `isMobile`, `userAgent` | ❌ | ✅ | ✅ | ✅ |
| `colorScheme`, `reducedMotion` | ❌ | ✅ | ✅ | ✅ |
| `geolocation`, `permissions`, `locale`, `timezone` | ❌ | ✅ | ✅ | ✅ |
| `screenOrientationApi` | ❌ | ❌ | ❌ | ✅ |
| `cpuThrottle`, `network` | ❌ | ❌ | ✅ | ✅ |
| `sensors` | ❌ | ❌ | ⚠️ Chromium | ✅ |
| `safeAreaInsets` | ❌ | ❌ | ❌ | ✅ |

`resolveFidelity` puts a capability in `notEmulated` only when the profile or run declares it. For example, a desktop profile without `safeAreaInsets` does not list it.

### 5.4 T3 Real-Device Transport (interface only)
- A physical device on the LAN opens the target directly, with `lab-probe-agent.js` (ERB-02) loaded.
- The agent uses a `transport` option: `'parent'` (postMessage to the lab, default) or `'ws'` (join room `lab:<sessionId>` on `ws://<host>:3001/ws/`).
- The device reports its real `innerWidth`, `innerHeight`, `devicePixelRatio`, `matchMedia` results, and `env(safe-area-inset-*)` measured from a probe element. These become the run's `device` block with `fidelity.tier = 3`.

---

## 6. Definition of Done (DoD) & Verification

- [ ] `vcard:sprint-erb-05:schema_v2_validated`: `validateDevice` accepts v1 and v2 input and rejects out-of-range or wrong-typed capability fields.
- [ ] `vcard:sprint-erb-05:builtins_capability_complete`: All 8 built-ins carry v2 capability fields.
- [ ] `vcard:sprint-erb-05:migration_idempotent_nondestructive`: v1 → v2 runs once, twice gives the same result, and v1 is preserved.
- [ ] `vcard:sprint-erb-05:fidelity_resolver_verified`: `resolveFidelity` matches §5.3 for every runner.
- [ ] `vcard:sprint-erb-05:device_matrix_single_source`: `tests/fixtures/device-matrix.js` derives every Playwright context from the registry (`INV-DSF-02`).
- [ ] `vcard:sprint-erb-05:fidelity_badge_visible`: The lab shows the tier and the not-emulated list for the active preset.
- [ ] `vcard:sprint-erb-05:no_regression`: RVP suite green.

### Execution Command
```bash
node --test tests/unit/device-registry-v2.test.mjs tests/unit/fidelity.test.mjs && \
npx playwright test tests/features/responsive-rotation-and-devices.spec.js --project=features
```
