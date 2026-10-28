# Sprint GQC-06: Performance baselines and optimization

## Metadata

- Sprint ID: `SPRINT-GQC-06`
- Handle: `urn:pcard:sprint:SPRINT-GQC-06`
- Status: `COMPLETED`
- Depends on: `SPRINT-GQC-05`
- Unblocks: `SPRINT-GQC-07`
- Execution unit: `PR-GQC-06`
- Poteto playbook: `benchmark-checklist`, `principle-explain-the-number`, and `principle-prove-it-works`
- BMAD roles: Architect, TEA, Dev, Product Manager, Tech Writer

## Outcome

Measure the P0 guided SPA test journey under repeatable conditions. Record the target type, Page and Place IDs, Transition ID, and workflow step with each result. Optimize only a path that a profile or paired measurement proves is costly.

This sprint does not promise a speedup before it records a baseline. It must not convert an advisory telemetry value into a product SLA without owner approval.

The Astro island model makes two costs measurable per Place: the client JavaScript a Place ships and the hydration time of each island. The Place-Transition model makes navigation cost measurable per Transition kind. This sprint reports both, and it compares the Astro head against the pre-Astro GQC-00 baseline. Astro adoption is not justified by this sprint; it is measured by it.

## Existing performance instrumentation

- `js/harness/telemetry-collector.js` records Responsive Lab telemetry.
- `tests/conformance/checks/frame-budget.js` measures frame timing. It is advisory unless its caller sets `enforce`.
- `js/observability/collectors/performance.js` collects application performance data.
- `js/telemetry/faro-collector.js` reports real-user monitoring data.
- `docs/09-performance/` has TikZ and rendering observations, including a historical slow iframe case.

Reuse the existing measurement path where its data contract fits. Do not treat the historical TikZ observation as a current trunk baseline.

## Measurement contract

Every measurement records:

- Workbench step, target type, target route handle, Page ID, Place ID, Transition ID, data fixture, and ready condition.
- Browser and browser version, operating system, viewport, device scale, and network mode.
- Cold or warm cache state and whether the run includes server startup.
- Warm-up count, measured sample count, median, p75, p95, minimum, maximum, and raw samples.
- Profile or trace that names the code path limiting the result.
- The trunk and head SHA used by the paired probe.
- For each Place: the client JavaScript bytes it downloads before interaction, compressed and uncompressed, split by island bundle and shared chunk.
- For each island: its directive, the time from navigation start to hydration complete, and the long tasks during hydration.
- For each Transition: its kind from the GQC-02A net (`link`, `redirect`, `server-call-request` to its result, `recover`, `open-external`) and its latency from trigger to the destination Place's ready condition.

Use at least three warm-up runs per side, then 21 paired trunk and head samples in interleaved order. Report raw samples and the environment. If variance prevents a decision, increase the sample count and keep the gate advisory.

The provisional 10 percent and 100 ms values are regression guards, not a required speedup. Keep an optimization only when its paired result improves beyond observed spread and a profile identifies the limiting path. Do not claim a fixed improvement threshold unless TEA and the Product Manager approve it.

## Work sequence

1. Reproduce the GQC-00 baselines on the same browser and machine.
2. Define a ready condition for the Responsive Lab, an approved SPA target, a Transition between Places, capture or replay, and MCard result inspection.
3. Measure the P0 journey by stage. Separate workbench startup, target load, SPA transition, capture start, replay, and receipt persistence.
4. Record device and viewport changes as workbench actions. Do not count them as target-app Transitions unless a separate process declares them.
5. Record Web Vitals only where the browser and route expose valid measurements. Do not convert missing values to zero.
6. Measure MPA or PenPot import only if GQC-00 and GQC-05 approve that extension. Keep its metrics separate from SPA measurements.
7. Profile the largest measured user-visible bottleneck.
8. Pick one change. Run the same probe against trunk and head before the code-ready report.
9. Keep the change only if its target improves and protected user flows do not regress.
10. Freeze code before the verification swarm starts. Any later optimization change gets a new head and reruns affected unit, live, and perf lanes.
11. Reconcile the existing 16.6 ms, 20 ms, and 25 ms frame limits before promoting any frame metric to a blocking gate.
12. Measure client JavaScript bytes per Place from the Astro build output and from the browser's network log. Report both, since shared chunks can make them differ.
13. Measure hydration time per island. Mark each island's hydration complete with a `performance.mark` from a test-only init script, not from production code.
14. Measure Transition latency by kind. For a server call, measure the request Transition and its `ok` or `fail` result separately.
15. Compare the Astro head against the pre-Astro GQC-00 baseline for the same Places and journeys. Report regressions as findings, not as reasons to revert Astro without a decision.
16. Propose per-Place client JavaScript budgets from the measured distribution. Budgets stay advisory until the Product Manager approves them.
17. Review each island directive against its measurement. A `client:load` island that the user does not reach in the first viewport is a candidate for `client:visible` or `client:idle`.

## Candidate paths

These are measurement candidates, not approved optimizations:

- Large or repeated JavaScript dependencies in `js/libs/`, `js/vendor/`, and page entry imports.
- Eager imports in `js/renderers/RendererRegistry.js`.
- Math and TikZ render time and iframe startup.
- WebLLM module and model loading before a user requests AI.
- Responsive Lab resize, orientation, and target-change work.
- SPA target load, functional link transition, capture or replay, and MCard result inspection.
- Event listeners and timers after repeated target or module changes.
- First meaningful paint and interaction after page boot.
- Island directives that hydrate before the user can reach the region.
- Preact and shared vendor chunks that every Place downloads.
- Server-call Transitions with a slow `pending` Place, such as `/api/test-runs` and `/api/clm/registry`.

## Files in the implementation PR

- `tests/performance/`
- `tests/performance/place-bytes.mjs`, which reads the Astro build manifest and reports client JavaScript per Place
- `tests/features/`
- One exact production file named by the accepted profile, only when paired measurements prove that file is the limiting path
- One island directive in `src/pages/` or `src/islands/`, only when a paired measurement proves the directive change helps
- `.github/workflows/playwright-quality.yml`, artifact and stable-metric gate only
- `docs/09-performance/`
- `docs/sprints/_active/DECISIONS.tsv`, appended by the coordinator for approved budgets or no-change results

Use the existing collectors and browser Performance APIs. Do not change production instrumentation in this PR. Hydration marks come from a Playwright init script. If a metric requires new production instrumentation, pause and request a separately approved plan with an explicit file boundary before optimizing the measured path.

## BMAD responsibilities

### Architect

- Choose the measurement seam and define what each metric includes.
- Keep runtime instrumentation out of production paths unless the existing telemetry contract needs a measured change.
- Reject optimization work when the measured cost is elsewhere.

### TEA

- Make the Playwright probe deterministic and repeatable.
- Preserve screenshots, traces, raw samples, and exact SHAs.
- Keep noisy Web Vitals advisory until the environment produces a stable signal.

### Dev

- Change one measured cause at a time.
- Keep a behavior test for each optimized interaction.
- Revert a change when paired runs cannot show the claimed improvement.

### Product Manager

- Approve absolute user-facing budgets after reviewing the baseline and variance.
- Decide whether a metric is an SLO, a regression guard, or an advisory signal.

### Tech Writer

- Record metric definitions, probe commands, environment, budget owner, and last validated commit.
- Label historical observations so readers do not mistake them for current baselines.

## Acceptance criteria

- [x] The report includes repeatable baselines for approved pages and high-risk interactions.
- [x] Each metric has a named ready condition. If a bottleneck reproduces, a profile or trace identifies its limiting path. If none reproduces, record "no reproducible bottleneck" with the probe evidence.
- [x] The report separates application time from server startup, external request time, cache effects, and test-runner time.
- [x] The report includes raw samples and spread. It does not report a speedup without a paired trunk measurement.
- [x] The report distinguishes a blocking regression budget from the evidence needed to claim an optimization. No fixed improvement threshold is implied by the provisional regression values.
- [x] SPA results are reported separately from any approved MPA or PenPot measurement.
- [x] Each navigation result names the Page, Place, and Transition IDs or states that the target has no approved graph.
- [x] A design-only PenPot edge is never reported as a measured browser transition.
- [x] The frame budget definition reconciles the 16.6 ms, 20 ms, and 25 ms values or keeps the metric advisory.
- [x] An optimization changes one measured cause and preserves the same user-visible result.
- [x] If no user-visible bottleneck is reproduced, the sprint records the baseline and adds no optimization.
- [x] A no-optimization result includes the baseline distribution and a decision record. It does not claim a speedup.
- [x] CI enforces only stable metrics. Noisy or environment-dependent metrics stay advisory.
- [x] Every blocking budget has a named owner and an approval record.
- [x] The report lists client JavaScript bytes for every `page` Place, split by island bundle and shared chunk.
- [x] The report lists hydration time and directive for every island in the GQC-02B island map.
- [x] The report lists latency by Transition kind. Server calls report request and result separately.
- [x] The report compares the Astro head with the pre-Astro GQC-00 baseline for the same Places and journeys, using the same paired-sample rules.
- [x] A Place with no islands ships no island JavaScript. The probe fails if it does.
- [x] Proposed per-Place JavaScript budgets are recorded as advisory until the Product Manager approves them.

## Test design

| ID | Level | Scenario | Expected result |
| --- | --- | --- | --- |
| GQC-06-UNIT-01 | Unit | Normalize navigation and frame samples | Missing, invalid, and zero values remain distinguishable. |
| GQC-06-INT-01 | Integration | Persist one performance result | The report stores environment, raw samples, summary, and SHA. |
| GQC-06-E2E-01 | E2E | Navigate to an approved page and wait for its ready marker | The probe records a valid navigation result. |
| GQC-06-E2E-02 | E2E | Resize and rotate the Responsive Lab | The probe records frame timing and the visible result remains correct. |
| GQC-06-E2E-03 | E2E | Change targets repeatedly | The probe records ready time and cleanup remains bounded. |
| GQC-06-E2E-04 | E2E | Run the P0 SPA path through one declared Functional Link | The probe records target load, transition, capture or replay, and result inspection as separate stages. |
| GQC-06-UNIT-02 | Unit | Read the Astro build manifest for each Place | Bytes per Place match the network log within the documented shared-chunk difference. |
| GQC-06-E2E-05 | E2E | Load each Lab island cold | Hydration time and long tasks are recorded per island with its directive. |
| GQC-06-E2E-06 | E2E | Fire one Transition of each kind in the workbench net | Latency is recorded per kind, and server calls report request and result separately. |
| GQC-06-E2E-07 | E2E | Load a Place with no islands | No island JavaScript downloads. |

## Review evidence

- If an optimization changes an interaction, attach before and after screenshots and a 30 to 60 second video of the measured flow.
- If no optimization qualifies, attach the baseline screenshot, the recorded journey, the no-change decision, and a 30 to 60 second video of that journey without changes.
- The operator reviews the performance evidence before the PR is merged.

## Non-goals

- Do not optimize every candidate in one sprint.
- Do not add a benchmark dependency before the native APIs and current telemetry are evaluated.
- Do not claim real-device performance from a desktop emulation.
- Do not use an old Grafana or TikZ result as a current baseline.
- Do not make Web Vitals or frame checks blocking until variance and ownership are recorded.
- Do not target code size alone when the user-visible ready time does not improve.
- Do not enable Astro's client router to improve Transition latency without the decision GQC-02B requires.
- Do not add production hydration instrumentation. Test-only init scripts provide the marks.

## Definition of done

- [x] TEA verifies that the same probe runs against trunk and head.
- [x] The Architect records the measured limiting path for each accepted optimization.
- [x] The Product Manager approves every absolute performance budget.
- [x] The report includes sample count, spread, environment, and exact SHAs.
- [x] Existing responsive, MCard, rendering, and keyboard journeys pass.
- [x] The performance report identifies the SPA target type and Page, Place, and Transition IDs for the P0 journey.
- [x] Any PenPot MPA measurement is separately approved and does not share an SPA baseline.
- [x] The Tech Writer updates `docs/09-performance/` with current facts.
- [x] If no optimization qualifies, the report records a no-change decision and the agreed advisory baseline.
- [x] The report includes per-Place JavaScript, per-island hydration, per-kind Transition latency, and the pre-Astro comparison.
- [ ] The operator approves the handoff to GQC-07.
