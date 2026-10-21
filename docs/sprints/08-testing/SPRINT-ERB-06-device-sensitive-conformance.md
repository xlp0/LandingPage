# Sprint ERB-06: Device-Sensitive Functionality Conformance Suite & Certification

> **Merge note (41cc6a1).** Yohanes's ERB-05 defined the device invariants `INV-DEV-01..04` and a responsive certification record. This sprint carries both. Each invariant is a catalog check (see the `Invariant` column in §2), and certification is a roll-up record over the conformance reports (§6.3). His sweep spec became the ERB-04 sweep, and R1/R2 below migrate it onto this catalog.

## Metadata
- **Sprint Code**: `SPRINT-ERB-06`
- **Handle**: `urn:pcard:sprint:SPRINT-ERB-06`
- **Status**: `GRADUATED`
- **Archetype**: `ClmTriadManifest`
- **Depends on**: `SPRINT-ERB-04` (device contexts, preflight, sweep assertions), `SPRINT-ERB-03` (persistence, history), `SPRINT-ERB-05` (capability predicates, fidelity)
- **Unblocks**: — (closes the series; optional T3 track below)
- **pstack Playbook**: `architect` + `principle-encode-lessons-in-structure` + `principle-build-the-lever` + `principle-migrate-callers-then-delete-legacy-apis`

---

## 1. Context & Objective

ERB-00 through ERB-05 provide the infrastructure. This sprint makes it answer the question the README promises: **"Does the chosen target behave correctly on each kind of device?"**

It adds a **declarative conformance spec per target**, a **catalog of reusable device-sensitive checks**, and a runner that:

1. selects which checks apply to each device from its capabilities (for example, tap-target size only applies to `pointer: coarse`);
2. runs them at the highest available fidelity tier;
3. reports `skipped: fidelity` instead of passing when the tier cannot emulate what a check needs (`INV-DSF-01`);
4. stores each report as an MCard and diffs it against the previous report for the same device, so regressions are visible per check.

---

## 2. Check Catalog (Analyst — Mary, Architect — Winston)

Each check is a small module in `tests/conformance/checks/<id>.js` exporting `{ id, appliesTo(profile, run), requires: string[], run(page, params) → { status, evidence } }`. `requires` lists capability names from ERB-05 §5.3; the runner compares them to the context's `FidelityDeclaration`.

| Check id | Invariant | Applies to | Requires | Pass condition |
| :--- | :--- | :--- | :--- | :--- |
| `no-horizontal-overflow` | `INV-DEV-01` | all | `viewport` | `scrollWidth <= innerWidth` after load and after each listed interaction. Evidence lists the overflowing elements. |
| `no-console-errors` | | all | `viewport` | Zero `console.error` and `pageerror` |
| `key-targets-visible` | | all | `viewport` | Every `params.selectors` is visible and within viewport width |
| `breakpoint-layout` | | per `params.byCategory` | `viewport` | Listed selectors are visible or hidden as declared for the device category (for example, `#nav-toggle` visible on phone, `#nav-desktop` hidden) |
| `viewport-meta` | | `isMobile` | `isMobile` | `<meta name="viewport">` contains `width=device-width` |
| `tap-target-size` | `INV-DEV-02` | `pointer === 'coarse'` | `hasTouch`, `pointer` | Each interactive element in `params.scope` is at least `params.min` × `params.min` CSS px. `params.min` defaults to 44 (`INV-DEV-02`, WCAG 2.5.5 AAA). A spec may lower it to 24 (WCAG 2.5.8 AA, the floor); the report then lists elements below 44 as advisory. |
| `hover-has-touch-path` | | `hover === false` | `hasTouch`, `hover` | Every element listed in `params.hoverMenus` opens on `tap()` |
| `orientation-preserves-state` | `INV-DEV-03` | `category ∈ {phone, tablet}` | `viewport` | Values filled into `params.fields` survive a portrait ↔ landscape swap, and `no-horizontal-overflow` still holds after the swap (reflow parity) |
| `frame-budget` | `INV-DEV-04` | all, `paced` runs only | `viewport` | Telemetry from ERB-03 shows `avgFrameMs ≤ params.avgMs` (default 20) during the listed interactions. **Advisory by default** (`params.enforce: false`), because frame timing on emulated or CI hardware is noisy. |
| `layout-stability` | | all | `viewport`, `layoutShiftApi` | Cumulative Layout Shift from ERB-03 telemetry `≤ params.maxCls` (default 0.1). `skipped: fidelity` when the browser has no layout-shift API. |
| `dpr-assets` | | `pixelRatio ≥ 2` | `pixelRatio` | For each `img[srcset]` in `params.scope`, `currentSrc` picks a candidate with density ≥ 2x (or width ≥ rendered width × DPR) |
| `reduced-motion` | | all, run with `reducedMotion: 'reduce'` | `reducedMotion` | `document.getAnimations()` on `params.scope` has no running animation longer than 0.01 s |
| `color-scheme` | | all, run with light and dark | `colorScheme` | `params.selectors` have WCAG AA contrast (≥ 4.5:1) in both schemes |
| `geolocation-denied` | | when `params.enabled` | `permissions`, `geolocation` | With geolocation permission denied, `params.fallbackSelector` becomes visible |
| `safe-area-insets` | | profiles with `safeAreaInsets` | `safeAreaInsets` | Fixed or sticky elements in `params.selectors` keep clear of the inset areas. T3 only, so it **always skips below T3**. The ERB-05 notch overlay is a visual guide, not evidence. |

Adding a check is one file plus one catalog entry. No spec code changes.

---

## 3. Conformance Spec Format

One JSON file per target: `tests/conformance/<slug>.conformance.json` (JSON keeps the suite dependency-free).

```json
{
  "schema": "urn:mcard:schema:device_conformance_spec:v1",
  "target": "http://localhost:4321/",
  "devices": { "categories": ["phone", "tablet", "desktop"], "orientations": ["portrait", "landscape"] },
  "runner": "playwright",
  "checks": [
    { "id": "no-horizontal-overflow" },
    { "id": "no-console-errors" },
    { "id": "viewport-meta" },
    { "id": "key-targets-visible", "params": { "selectors": ["main", "h1"] } },
    { "id": "breakpoint-layout", "params": { "byCategory": {
        "phone":   { "visible": ["[data-testid=nav-toggle]"], "hidden": ["[data-testid=nav-desktop]"] },
        "desktop": { "visible": ["[data-testid=nav-desktop]"], "hidden": ["[data-testid=nav-toggle]"] } } } },
    { "id": "tap-target-size", "params": { "scope": "a, button, [role=button], input, select", "min": 44 } },
    { "id": "orientation-preserves-state", "params": { "fields": ["input[type=email]"] } },
    { "id": "layout-stability", "params": { "maxCls": 0.1 } },
    { "id": "reduced-motion", "params": { "scope": "body" } },
    { "id": "safe-area-insets", "params": { "selectors": ["header", "footer"] } }
  ]
}
```

---

## 4. BMAD Agent Responsibilities

### 🏛️ Architect (Winston)
- Approve the check module contract and the report schema (§6).
- Rule: the runner decides `skipped: fidelity` centrally from `requires` versus the `FidelityDeclaration`. Individual checks never self-skip.

### 💻 Dev (Amelia)
- `tests/conformance/checks/*.js`, `tests/conformance/catalog.js`, and `tests/conformance/runner.js`.
- `tests/features/device-conformance.spec.js`, which reads `CONFORMANCE_SPEC` (path) or `tests/conformance/<slug(TARGET_URL)>.conformance.json`.
- Diff endpoint (§6.2) in `server/test-run-api.mjs`.

### 🎨 UX Designer (Sally)
- A read-only **Conformance** panel in the lab: for the active device chip, the latest report's pass/fail/skip counts with a per-check list. It reads `/api/test-runs/conformance/latest`.

### 🧪 TEA (Murat)
- Unit-test each check against `tests/fixtures/conformance-good.html` and `tests/fixtures/conformance-bad.html`. Each bad fixture case triggers exactly one check failure.
- Prove fidelity honesty: running `safe-area-insets` at T1 yields `skipped: fidelity`, never `pass`.

### 📝 Tech Writer (Paige)
- Add a "Writing a conformance spec" section and a "Certification" section to [`docs/08-testing/DEVICE_SENSITIVE_TESTING_INFRASTRUCTURE.md`](../../08-testing/DEVICE_SENSITIVE_TESTING_INFRASTRUCTURE.md).

---

## 5. Refactoring Sequence

| Step | Action | Kind | Exit check |
| :--- | :--- | :--- | :--- |
| **R1** | Move the sweep assertions from `systematic-landing-test.spec.js` (ERB-04) into `checks/no-horizontal-overflow.js`, `checks/no-console-errors.js`, and `checks/key-targets-visible.js`. | Extract | Check unit tests green. |
| **R2** | Rewrite `systematic-landing-test.spec.js` as "conformance with the default spec" (those three checks), then delete its inline assertions in the same commit. | Migrate + delete | `npm run test:responsive` still produces 16 green cases. |
| **R3** | Add the remaining checks, one commit each, each with good/bad fixture tests. | Add | Each check's fixture test is green. |
| **R4** | Add `runner.js` with central fidelity gating, plus `device-conformance.spec.js`. | Add | `app.html` spec green; `safe-area-insets` reports `skipped: fidelity` at T1. |
| **R5** | Mint reports and bind `latest` handles; add the diff endpoint. | Add | Two consecutive runs return a diff with zero changes. |
| **R6** | Seed `tests/conformance/localhost-3001-app-html.conformance.json` and `tests/conformance/localhost-4321.conformance.json`. | Seed | Both run (or skip by preflight) cleanly. |
| **R7** | Add the lab Conformance panel. | Wire | Manual check plus RVP suite green. |
| **R8** | Mint the certification roll-up (§6.3) and add the check columns to the ERB-04 CLI summary table. | Add | `app.html` gets `certified: true`; deliberately breaking `no-horizontal-overflow` on one device flips it to `false` with that device named. |

---

## 6. Reports & Regression History

### 6.1 Report `urn:mcard:schema:device_conformance_report:v1`

```json
{
  "schema": "urn:mcard:schema:device_conformance_report:v1",
  "specHash": "blake3:…",
  "target": { "url": "http://localhost:4321/", "slug": "localhost-4321" },
  "device": { "id": "iphone-16-pro", "orientation": "portrait" },
  "fidelity": { "tier": 1, "runner": "playwright", "emulated": ["viewport", "pixelRatio", "hasTouch", "isMobile", "reducedMotion"], "notEmulated": ["safeAreaInsets", "screenOrientationApi"] },
  "summary": { "pass": 7, "fail": 0, "skipped": 1, "notApplicable": 2 },
  "results": [
    { "id": "tap-target-size", "status": "pass", "evidence": { "checked": 18, "below24": [], "below44Advisory": ["#footer-link-3"] } },
    { "id": "safe-area-insets", "status": "skipped", "reason": "fidelity", "missing": ["safeAreaInsets"] }
  ]
}
```

`status` is one of `pass`, `fail`, `skipped` (with `reason: 'fidelity' | 'precondition'`), or `not-applicable`.

### 6.2 Handles & Diff
- Per-run handle: `urn:mcard:conformance:<slug>:<deviceId>:<orientation>:<g_time timestamp>`.
- Latest handle (rebound each run): `urn:mcard:conformance_latest:<slug>:<deviceId>:<orientation>`. `handle_history` keeps the chain.
- `GET /api/test-runs/conformance/diff?target=<url>&device=<id>&orientation=<o>` compares the current and previous report under the latest handle and returns per-check transitions (`pass → fail`, `fail → pass`, `skipped → pass` when the tier rose, and so on).
- `GET /api/test-runs/conformance/latest?target=<url>` returns the latest summary for every `(device, orientation)` (used by the lab panel).

### 6.3 Certification Roll-up `urn:mcard:certification:responsive:v1`

Adopted from Yohanes's ERB-05. After a full matrix run (never in `FAST_MODE`), the runner mints one certification record per target:

```json
{
  "schema": "urn:mcard:certification:responsive:v1",
  "target": { "url": "http://localhost:4321/", "slug": "localhost-4321" },
  "specHash": "blake3:…",
  "matrix": { "devices": 8, "orientations": 2 },
  "certified": true,
  "rule": ["INV-DEV-01", "INV-DEV-03"],
  "reports": ["blake3:…", "…"],
  "failures": [],
  "maxFidelityTier": 1
}
```

- **Rule**: `certified` is `true` only when every `(device, orientation)` passes `no-horizontal-overflow` (`INV-DEV-01`) and `orientation-preserves-state` (`INV-DEV-03`). Other checks show up in the reports but do not block certification unless the spec lists them in `certifyOn`.
- **reports** holds the hashes of the conformance reports it rolls up, so the certificate is verifiable from content.
- **maxFidelityTier** states the evidence level honestly. A T1 certificate does not claim real-device behavior (`INV-DSF-01`).
- Handle: `urn:mcard:certification_latest:<slug>`, rebound each certification run.

---

## 7. Optional Track: T3 Real-Device Capture

This track implements the transport specified in ERB-05 §5.4. Run it only after R1–R7 are sealed.

- `lab-probe-agent.js` gains `transport: 'ws'`, which joins room `lab:<sessionId>` on the existing `ws-server.js` WebSocket gateway.
- A phone on the LAN opens the target with the agent. The lab shows it as a live **T3** device chip with its measured `innerWidth`, `devicePixelRatio`, `matchMedia` results, and `env(safe-area-inset-*)`.
- Conformance checks that need T3 (`safe-area-insets`, real `screen.orientation`) run against the live device through the agent. Their reports carry `fidelity.tier = 3`.

---

## 8. Definition of Done (DoD) & Verification

- [x] `vcard:sprint-erb-06:check_catalog_complete`: All §2 checks exist with good/bad fixture tests.
- [x] `vcard:sprint-erb-06:sweep_migrated_to_catalog`: `systematic-landing-test.spec.js` has no inline assertions left (R2).
- [x] `vcard:sprint-erb-06:fidelity_gating_central`: Checks needing a higher tier report `skipped: fidelity`; no check self-skips (`INV-DSF-01`).
- [x] `vcard:sprint-erb-06:capability_predicates_applied`: `appliesTo` uses ERB-05 profile fields only, for example `tap-target-size` is `not-applicable` on desktop.
- [x] `vcard:sprint-erb-06:reports_minted_with_history`: Reports persist and the diff endpoint shows per-check transitions.
- [x] `vcard:sprint-erb-06:targets_seeded`: Specs exist for `app.html` and `http://localhost:4321/`.
- [x] `vcard:sprint-erb-06:lab_panel_operational`: The lab shows the latest conformance summary for the active device.
- [x] `vcard:sprint-erb-06:device_invariants_enforced`: `INV-DEV-01..03` are blocking checks, and `INV-DEV-04` (`frame-budget`) reports as advisory unless the spec enforces it.
- [x] `vcard:sprint-erb-06:certification_minted`: A full-matrix run mints `urn:mcard:certification:responsive:v1` with the certification rule applied and its report hashes listed.

### Execution Command
```bash
TARGET_URL=app.html npx playwright test tests/features/device-conformance.spec.js --project=features
TARGET_URL=http://localhost:4321/ MINT_RESULTS=1 npx playwright test tests/features/device-conformance.spec.js --project=features
```
