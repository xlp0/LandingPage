# Performance, Observability, and Verified Baselines

| Field | Value |
| --- | --- |
| Audience | Engineers, architects, and QA reviewers working in this documentation tier |
| BMAD Owner | Architect (`bmad-agent-architect`) and Test Architect |
| Source of Truth | [`docs/09-performance/gqc-06-spa-and-island-baselines.md`](./gqc-06-spa-and-island-baselines.md) |
This directory documents performance measurement contracts, per-Place JavaScript byte probes, Astro island hydration baselines, in-target telemetry, and historical rendering notes in `LandingPage`.

---

## Current Performance Baseline and Gate Contract

Sprint `SPRINT-GQC-06` established repeatable browser and static-manifest probes at trunk commit `e43ec38d146980cd4d7c27798da81d5c0b6c299d` and pre-Astro baseline commit `843cf652650746501d7ea270ecdd1a0f493ec559`.

- **[gqc-06-spa-and-island-baselines.md](gqc-06-spa-and-island-baselines.md)** documents current metric definitions, ready conditions, probe commands, environment, budget owners, per-Place JavaScript bytes, per-island hydration, per-kind Transition latency, and the pre-Astro comparison.
- **[../sprints/_active/evidence/GQC-06-performance-report.md](../sprints/_active/evidence/GQC-06-performance-report.md)** records the 21-sample interleaved paired distributions, CDP limiter attribution, 10 live verification lanes, and the verified no-change decision.

### Reconciled Frame-Budget Tiers (`INV-DEV-04`)

Earlier collectors and conformance checks referenced three distinct frame intervals (`16.67 ms`, `20 ms`, and `25 ms`). `SPRINT-GQC-06` reconciles these values into three non-blocking tiers until TEA and the Product Manager ratify a dedicated hardware runner.

| Tier | Threshold | Meaning | CI Status | Owner |
| --- | --- | --- | --- | --- |
| VSync ideal (`60 fps`) | `16.67 ms` | Physical single-frame interval at 60 Hz (`js/harness/telemetry-collector.js`). Sub-millisecond timer jitter (`16.70 ms` p95 over 3,610 frames) exceeds `16.67 ms` without dropping a frame. | Advisory | Architect and TEA |
| T3 real-hardware target | `20.00 ms` | Smooth interactive target (`>= 50 fps`) reserved for dedicated physical-device conformance runs. | Advisory until T3 runner ratification | Product Manager and TEA |
| T1 headless Chromium signal | `25.00 ms` | Headless desktop emulation ceiling in `tests/conformance/checks/frame-budget.js` (`enforce = false` by default). | Advisory | TEA |

### CI Enforcement Policy

CI enforces deterministic byte invariants and keeps environment-sensitive timing metrics advisory per `DECISIONS.tsv` row 49.

| Check | Command | CI Mode | Owner |
| --- | --- | --- | --- |
| Zero island JS on island-free Places | `node tests/performance/place-bytes.mjs --enforce-zero-island-places` | Blocking | Architect and TEA |
| Normalization, persistence, and manifest unit contracts | `node --test tests/unit/performance-probes.test.mjs` | Blocking | TEA |
| Browser navigation, hydration, and Transition baseline capture | `npx playwright test tests/features/performance-baselines.spec.js --project=features` | Functional assertions blocking, latency distributions advisory | TEA and Product Manager |
| Proposed per-Place JavaScript byte budgets | `node tests/performance/place-bytes.mjs --markdown` | Advisory pending Product Manager approval | Product Manager |

---

## Runtime Telemetry Collectors

Application and harness telemetry operates through three runtime modules that remain untouched by test-only hydration probes.

1. **In-Target Telemetry Collector (`js/harness/telemetry-collector.js`)**
   - Observes viewport geometry, horizontal overflow (`INV-DEV-01`), layout shift entries, and `requestAnimationFrame` deltas inside the Responsive UI Lab.
   - Note that `telemetry-collector.js` coerces unsupported CLS `null` to `0` and returns a synthetic `{ avgFps: 60.0, maxFrameMs: 16.6 }` fallback when zero frame deltas are recorded. Benchmark probes in `tests/performance/metrics-model.mjs` bypass both coercions so `missing`, `invalid`, and `0` stay distinct.
2. **Application Performance Collector (`js/observability/collectors/performance.js`)**
   - Collects browser navigation and resource timing entries for local observability views.
3. **Grafana Faro RUM Collector (`js/telemetry/faro-collector.js`)**
   - Reports real-user monitoring events, errors, and session traces when an external collector endpoint is configured.

---

## Historical Observations (Not Current Baselines)

The documents below record earlier architecture setup notes and pre-GQC rendering experiments. Readers and agents must treat all timing numbers in these subdirectories as historical observations rather than current trunk baselines.

### Observability Setup Notes (`observability/`, Historical)

- **[observability/README.md](observability/README.md)** covers the historical observability tier overview.
- **[observability/GRAFANA-DASHBOARD-OBSERVABILITY.md](observability/GRAFANA-DASHBOARD-OBSERVABILITY.md)** covers Grafana dashboard panels from earlier RUM experiments.
- **[observability/GRAFANA-METRICS-PIPELINE.md](observability/GRAFANA-METRICS-PIPELINE.md)** covers telemetry ingestion formatting.
- **[observability/client-side-tracking.md](observability/client-side-tracking.md)** covers client-side event schemas.
- **[observability/grafana-cloud-setup-steps.md](observability/grafana-cloud-setup-steps.md)** covers external Grafana Cloud provisioning steps.
- **[observability/grafana-faro-queries.md](observability/grafana-faro-queries.md)** covers LogQL and PromQL query examples.
- **[observability/grafana-loki-setup-plan.md](observability/grafana-loki-setup-plan.md)** covers structured log shipping plans.
- **[observability/TROUBLESHOOTING.md](observability/TROUBLESHOOTING.md)** covers collector connectivity checks.

### Rendering and TikZ Experiments (`optimization/`, Historical)

- **[optimization/library-comparison.md](optimization/library-comparison.md)** records historical rendering library comparisons prior to the Astro 7 host migration.
- **[optimization/tikz-optimization-strategy.md](optimization/tikz-optimization-strategy.md)** records historical client-side caching notes for mathematical diagrams.
- **[optimization/tikz-cors-fix.md](optimization/tikz-cors-fix.md)** records historical cross-origin resource sharing fixes for WebAssembly assets.
- **[optimization/tikzjax-performance-analysis.md](optimization/tikzjax-performance-analysis.md)** records a historical slow TikZJax iframe compilation case that does not represent current trunk navigation or SPA workbench baselines.

---

## Related Functional Tiers

- **[../08-testing/README.md](../08-testing/README.md)** documents Playwright project partitioning (`smoke`, `components`, `features`) and conformance checks.
- **[../07-deployment/README.md](../07-deployment/README.md)** documents asset caching and production runtime configuration.
- **[../06-components/README.md](../06-components/README.md)** documents UI islands and observability panels.
