# GQC-07 Documentation Alignment and Program Graduation Review

| Field | Value |
| --- | --- |
| Sprint | `SPRINT-GQC-07` (`PR-GQC-07`) |
| Audience | Operator, Scrum Master, and BMAD role leads reviewing Program GQC graduation readiness |
| BMAD Owner | Tech Writer, Architect, Test Architect, Product Manager, and Scrum Master |
| Source of Truth | [`../SPRINT-GQC-07-documentation-alignment-and-gates.md`](../SPRINT-GQC-07-documentation-alignment-and-gates.md), [`../../../../../scripts/check-docs.mjs`](../../../../../scripts/check-docs.mjs), and `DECISIONS.tsv` |

## Status

**Graduated (`2026-11-18`).** Program GQC executed all ten units, passed documentation, net, unit, Playwright discovery, feature, and cross-browser gates after the `layout-freeze` re-baseline, Firefox/WebKit verification (`60` of `60`), and post-audit reconciliation ([`PROGRAM-EXECUTION-AUDIT.md`](./PROGRAM-EXECUTION-AUDIT.md)), and received explicit operator graduation approval on `2026-11-18` (archived at `docs/sprints/programs/gqc/`).

*(Historical context preserved below: the initial `2026-11-17` gate run at `31/65`, `190` unit tests, and pre-rebaseline `features` failures are retained for audit continuity alongside the verified `2026-11-18` reconciliation table.)*

## Verification performed on 2026-11-18 (current reconciliation)

| Command | Result | What it proves |
| --- | --- | --- |
| `npm run check:net` | PASS. `net=landingpage-workbench-net places=32 transitions=66 reachableMarkings=31 sessionPInvariant=true coverage=19/66 explored=2 neverFired=45 policy=ADVISORY`; fixture `places=3 transitions=4 coverage=4/4`. | The workbench net and target fixture net parse with `clm-kernel@0.0.23`, duplicate-ID/reachability checks pass, and the session P-invariant holds. |
| `npm run docs:check` | PASS. `files=252 allowlisted=14 netIds=106`. | Local links resolve, documented package scripts and Playwright projects exist, kernel/port consensus holds, generated net docs are fresh, and living sprint indexes agree. |
| `npm run check:playwright-discovery` | PASS. Smoke `30` tests in `11` files, components `18` in `14` files, features `618` in `28` files, `53` unique category files (`666` total), `0` cross-browser repeats. | `INV-GQC-01` holds across all category projects with zero overlap or zero-test exceptions. |
| `npm run test:unit` | PASS. `274` tests, `0` failures. | Confirms all Layer 1 / Layer 4, Triad `0.0.23`, coverage registry, docs gate, and BPV unit contracts pass. |
| `npm run test:smoke`, `npm run test:components`, `npm run test:features` | PASS. Smoke `30`, components `18`, features `602` passed / `16` skipped / `0` failed. | All E2E suites pass with zero retries (`ciRetries: 0`). |

## Historical verification performed on 2026-11-17

Environment: macOS (darwin), Node v26.13.1, repository `LandingPage` at branch `main`, worktree HEAD `3fb2cb8` plus the repairs below. Browser lanes were not re-run; `npm run check:playwright-discovery` lists projects without executing them.

| Command | Result | What it proves |
| --- | --- | --- |
| `npm run check:net` | PASS (superseded baseline: `places=31 transitions=65 reachableMarkings=30 sessionPInvariant=true coverage=19/65`). | Earlier pre-BPV-01 net check. |
| `npm run docs:check` | PASS (superseded baseline: `files=240 allowlisted=14 netIds=104`). | Earlier docs check before BPV docs landed. |
| `npm run check:playwright-discovery` | PASS (superseded baseline: features `596` in `23` files, `48` unique files). | Earlier Playwright discovery count. |
| `npm run test:unit` | PASS (`190` tests, `0` failures). | Earlier unit baseline before BPV tests. |

## Defects found and repaired

1. `scripts/check-net.mjs`, `scripts/net-to-netmcard.mjs`, and `tests/unit/gui-coverage-registry.test.mjs` each declared the same `clm-kernel/store` import twice. All three files failed to parse, which took down `docs:check` (it imports the net checker) and `test:unit`. The duplicate lines were removed.
2. `docs/01-architecture/landing-page-architecture.md`, `docs/03-data-management/MCARD_LIBRARY_STRATEGY.md`, and `docs/01-architecture/UNIVERSAL_MCARD_BROWSER_ARCHITECTURE.md` claimed `clm-kernel@0.0.13` while `package.json`, `package-lock.json`, `server/mcard-modality.mjs`, and `js/harness/recorder.js` all report `0.0.23`. The three docs now report `0.0.23`.

## Drift corrected in the sprint documents

- The `public/` HTML page count is 27, not 17. The GQC-02A census has always listed 27 rows. `SPRINT-GQC-00` and `SPRINT-GQC-02A` are corrected.
- The kernel pin moved from `0.0.12` to `0.0.23` after execution. `INDEX.md`, `README.md`, `SPRINT-GQC-04`, and `SPRINT-GQC-05` now separate the planning pin from the current pin.
- The recorded Astro `publicDir` is `./.cache/astro-public`, not `./astro-public` as `DECISIONS.tsv:bmad-ports-and-publicdir` states.
- Closed decisions in `SPRINT-GQC-00`, `SPRINT-GQC-02A`, and `SPRINT-GQC-02B` were still labelled `Open`. Each row now names the decision record that closed it.

## Browser matrix closed on 2026-11-18

The audit left one GQC item open because Firefox and WebKit were not installed. They are installed now and the matrix ran.

| Command | Result | What it proves |
| --- | --- | --- |
| `npx playwright install firefox webkit` | Firefox `firefox-1555` and WebKit `webkit-2370` in `~/Library/Caches/ms-playwright` | The approved browser runtimes exist on this machine. |
| `npm run test:smoke:cross-browser` | PASS, 60 of 60 in 37.4 s. 30 `smoke-firefox`, 30 `smoke-webkit`, 0 failed, 0 skipped. | The same 30 smoke journeys that pass on Chromium also pass on the Firefox and WebKit lanes, so the matrix gate is met rather than unavailable. |

The full log is committed as [`cross-browser-2026-11-18.txt`](./cross-browser-2026-11-18.txt); the local run wrote it to `bombadil-output/cross-browser-20261118T094944Z.log`, which `.gitignore` excludes. Every one of the 30 smoke cases appears once per browser, so the count is a 2x repeat of the smoke project, not a different suite.

## Known limits

- The ten live lanes per PR were captured to `/tmp/swarm-PR-GQC-*/worker-1/lane-*.png`. Those files no longer exist, so this report does not claim them. `gqc-plan.md` now requires new lanes to write under `evidence/lanes/`.
- No paired trunk-versus-head rerun was performed on 2026-11-17. The performance report in [`GQC-06-performance-report.md`](./GQC-06-performance-report.md) remains the measurement of record, and its baselines name the SHAs it used.
- `docs:check` duration has no trunk equivalent, so it stays advisory.
- The `features` project was not green at HEAD on 2026-11-17. `tests/features/presentation-lattice.spec.js` failed 12 of 12 tests because its `beforeEach` opened `/`, which redirects to the Lab, and waited for the portal selector `.top-controls`. Pointing the suite at `/?noredirect=1` recovered 5 tests. The other 7 assert portal controls the GQC-02B.1 Astro portal no longer renders (`#least-action-btn`, `#fibration-observability-btn`, `#deployment-inspector-btn`, `#deployment-inspector-card`, `#mission-control-btn`) or assert copy that changed (`#cors-block-alert`, `.lab-badge`). The last edit to `src/pages/index.astro` is the GQC-02B.1 commit, so the drift came from the host migration, not from later work. **Resolved 2026-11-18.** `SPRINT-BPV-01` removed the dead listeners and migrated the assertions, and the operator-approved `layout-freeze` re-baseline in [`BPV-05-page-load.md`](../../bpv/evidence/BPV-05-page-load.md) closed the rest. `test:features` passes `602` with `16` skipped and `0` failed (`618` discovered across `28` files).

## Graduation checklist

- [x] All ten execution units have committed artifacts and a `DECISIONS.tsv` row.
- [x] `check:net`, `docs:check`, `check:playwright-discovery`, and `test:unit` pass in this checkout.
- [x] The workbench net stays a Layer 1 `PetriNetTopology`, and no browser bundle imports `clm-kernel`.
- [x] PenPot-assisted MPA assessment remains `Optional / Deferred` and outside the P0 SPA denominator.
- [x] The approved browser matrix passes. Firefox 1555 and WebKit 2370 run the 30 smoke journeys clean, 60 of 60.
- [x] The operator approves graduation and the move of the GQC files out of `docs/sprints/_active/` to `docs/sprints/programs/gqc/` (2026-11-18).
