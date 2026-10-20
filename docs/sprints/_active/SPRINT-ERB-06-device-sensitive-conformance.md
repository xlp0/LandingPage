# Sprint ERB-06: Device-Sensitive Functionality Conformance Suite

## Metadata
- **Sprint Code**: `SPRINT-ERB-06`
- **Handle**: `urn:pcard:sprint:SPRINT-ERB-06`
- **Status**: `SPECIFICATION`
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

| Check id | Applies to | Requires | Pass condition |
| :--- | :--- | :--- | :--- |
| `no-horizontal-overflow` | all | `viewport` | `scrollWidth <= innerWidth` after load and after each listed interaction |
| `no-console-errors` | all | `viewport` | Zero `console.error` and `pageerror` |
| `key-targets-visible` | all | `viewport` | Every `params.selectors` is visible and within viewport width |
| `breakpoint-layout` | per `params.byCategory` | `viewport` | Listed selectors are visible or hidden as declared for the device category (for example, `#nav-toggle` visible on phone, `#nav-desktop` hidden) |
| `viewport-meta` | `isMobile` | `isMobile` | `<meta name="viewport">` contains `width=device-width` |
| `tap-target-size` | `pointer === 'coarse'` | `hasTouch`, `pointer` | Each interactive element in `params.scope` is ≥ 24 × 24 CSS px (WCAG 2.5.8 AA). The report also lists elements below 44 × 44 (WCAG 2.5.5 AAA) as advisory. |
| `hover-has-touch-path` | `hover === false` | `hasTouch`, `hover` | Every element listed in `params.hoverMenus` opens on `tap()` |
| `orientation-preserves-state` | `category ∈ {phone, tablet}` | `viewport` | Values filled into `params.fields` survive a portrait ↔ landscape swap |
| `dpr-assets` | `pixelRatio ≥ 2` | `pixelRatio` | For each `img[srcset]` in `params.scope`, `currentSrc` picks a candidate with density ≥ 2x (or width ≥ rendered width × DPR) |
| `reduced-motion` | all, run with `reducedMotion: 'reduce'` | `reducedMotion` | `document.getAnimations()` on `params.scope` has no running animation longer than 0.01 s |
| `color-scheme` | all, run with light and dark | `colorScheme` | `params.selectors` have WCAG AA contrast (≥ 4.5:1) in both schemes |
| `geolocation-denied` | when `params.enabled` | `permissions`, `geolocation` | With geolocation permission denied, `params.fallbackSelector` becomes visible |
| `safe-area-insets` | profiles with `safeAreaInsets` | `safeAreaInsets` | Fixed or sticky elements in `params.selectors` keep clear of the inset areas. T3 only, so it **always skips below T3**. |

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
    { "id": "tap-target-size", "params": { "scope": "a, button, [role=button], input, select" } },
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
- Add a "Writing a conformance spec" section to `docs/08-testing/SYSTEMATIC-LANDING-TESTING.md`.

---

## 5. Refactoring Sequence

| Step | Action | Kind | Exit check |
| :--- | :--- | :--- | :--- |
| **R1** | Move the sweep assertions from `device-sweep.spec.js` (ERB-04) into `checks/no-horizontal-overflow.js`, `checks/no-console-errors.js`, and `checks/key-targets-visible.js`. | Extract | Check unit tests green. |
| **R2** | Rewrite `device-sweep.spec.js` as "conformance with the default spec" (those three checks), then delete its inline assertions in the same commit. | Migrate + delete | `npm run test:sweep` still produces 16 green cases. |
| **R3** | Add the remaining checks, one commit each, each with good/bad fixture tests. | Add | Each check's fixture test is green. |
| **R4** | Add `runner.js` with central fidelity gating, plus `device-conformance.spec.js`. | Add | `app.html` spec green; `safe-area-insets` reports `skipped: fidelity` at T1. |
| **R5** | Mint reports and bind `latest` handles; add the diff endpoint. | Add | Two consecutive runs return a diff with zero changes. |
| **R6** | Seed `tests/conformance/localhost-3001-app-html.conformance.json` and `tests/conformance/localhost-4321.conformance.json`. | Seed | Both run (or skip by preflight) cleanly. |
| **R7** | Add the lab Conformance panel. | Wire | Manual check plus RVP suite green. |

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

---

## 7. Optional Track: T3 Real-Device Capture

This track implements the transport specified in ERB-05 §5.4. Run it only after R1–R7 are sealed.

- `lab-probe-agent.js` gains `transport: 'ws'`, which joins room `lab:<sessionId>` on the existing `ws-server.js` WebSocket gateway.
- A phone on the LAN opens the target with the agent. The lab shows it as a live **T3** device chip with its measured `innerWidth`, `devicePixelRatio`, `matchMedia` results, and `env(safe-area-inset-*)`.
- Conformance checks that need T3 (`safe-area-insets`, real `screen.orientation`) run against the live device through the agent. Their reports carry `fidelity.tier = 3`.

---

## 8. Definition of Done (DoD) & Verification

- [ ] `vcard:sprint-erb-06:check_catalog_complete`: All §2 checks exist with good/bad fixture tests.
- [ ] `vcard:sprint-erb-06:sweep_migrated_to_catalog`: `device-sweep.spec.js` has no inline assertions left (R2).
- [ ] `vcard:sprint-erb-06:fidelity_gating_central`: Checks needing a higher tier report `skipped: fidelity`; no check self-skips (`INV-DSF-01`).
- [ ] `vcard:sprint-erb-06:capability_predicates_applied`: `appliesTo` uses ERB-05 profile fields only, for example `tap-target-size` is `not-applicable` on desktop.
- [ ] `vcard:sprint-erb-06:reports_minted_with_history`: Reports persist and the diff endpoint shows per-check transitions.
- [ ] `vcard:sprint-erb-06:targets_seeded`: Specs exist for `app.html` and `http://localhost:4321/`.
- [ ] `vcard:sprint-erb-06:lab_panel_operational`: The lab shows the latest conformance summary for the active device.

### Execution Command
```bash
TARGET_URL=app.html npx playwright test tests/features/device-conformance.spec.js --project=features
TARGET_URL=http://localhost:4321/ MINT_RESULTS=1 npx playwright test tests/features/device-conformance.spec.js --project=features
```
