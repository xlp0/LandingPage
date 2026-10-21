# 📈 Performance, Observability & Telemetry

This directory documents the performance monitoring systems, real-time in-target telemetry, Grafana observability pipeline, and rendering optimizations in `LandingPage`.

---

## 🎯 Telemetry & Observability Architecture

Performance monitoring in `LandingPage` operates at both the application runtime level and within the Responsive UI Lab testing harness:

```
┌────────────────────────────────────────────────────────┐
│             Telemetry & Observability Stack            │
│                                                        │
│  ┌──────────────────────────┐  ┌────────────────────┐  │
│  │    In-Target Telemetry   │  │    Grafana Faro    │  │
│  │    (Responsive Lab)      │  │     & Loki (RUM)   │  │
│  ├──────────────────────────┤  ├────────────────────┤  │
│  │ • 16.6ms Frame Budget    │  │ • Web Vitals       │  │
│  │ • Cumulative Layout Shift│  │ • Error Logging    │  │
│  │ • Horizontal Bleed Check │  │ • Session Traces   │  │
│  │ • Tap Target Audit       │  │ • User Journey     │  │
│  │ (`INV-DEV-01..04`)       │  │                    │  │
│  └──────────────────────────┘  └────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

1. **In-Target Telemetry Collector (`js/harness/telemetry-collector.js`)**:
   - Embedded inside or attached to the target viewport in the Responsive UI Lab.
   - Observes frame latency ($16.6\text{ms}$ budget / $60\text{fps}$, `INV-DEV-04`).
   - Accumulates non-user-initiated layout shifts (Cumulative Layout Shift, CLS).
   - Detects horizontal viewport bleed (`INV-DEV-01`).
2. **Grafana Cloud & Faro Integration (`js/telemetry/faro-collector.js`)**:
   - Real User Monitoring (RUM) reporting browser metrics, uncaught errors, and network latencies to Grafana Cloud.
   - Centralized logging via Grafana Loki.
3. **Lagrangian Metrics & Observability (`js/runtime/least-action-navigator.js`)**:
   - Measures system action and cognitive friction through the Software Lagrangian $\mathcal{L} = S_T - H_T$, tracking Epiplexity $S_T$ and Axiomatic Entropy $H_T$.

---

## 📚 Documents in This Section

### Observability & Monitoring (`observability/`)
- **[observability/README.md](observability/README.md)** — Observability tier overview and quickstart.
- **[observability/GRAFANA-DASHBOARD-OBSERVABILITY.md](observability/GRAFANA-DASHBOARD-OBSERVABILITY.md)** — Grafana dashboard configuration for application performance.
- **[observability/GRAFANA-METRICS-PIPELINE.md](observability/GRAFANA-METRICS-PIPELINE.md)** — Metrics conversion and ingestion pipeline.
- **[observability/client-side-tracking.md](observability/client-side-tracking.md)** — Client-side instrumentation and Web Vitals tracking.
- **[observability/grafana-cloud-setup-steps.md](observability/grafana-cloud-setup-steps.md)** — Provisioning Grafana Cloud Faro endpoints.
- **[observability/grafana-faro-queries.md](observability/grafana-faro-queries.md)** — LogQL and PromQL query recipes for user sessions.
- **[observability/grafana-loki-setup-plan.md](observability/grafana-loki-setup-plan.md)** — Structured log aggregation configuration.
- **[observability/TROUBLESHOOTING.md](observability/TROUBLESHOOTING.md)** — Troubleshooting missing metrics and telemetry drops.

### Optimization & Benchmarks (`optimization/`)
- **[optimization/library-comparison.md](optimization/library-comparison.md)** — Rendering engine performance benchmarks.
- **[optimization/tikz-optimization-strategy.md](optimization/tikz-optimization-strategy.md)** — Client-side caching and optimization for mathematical diagrams.
- **[optimization/tikz-cors-fix.md](optimization/tikz-cors-fix.md)** — Cross-origin resource sharing fixes for WASM diagram modules.
- **[optimization/tikzjax-performance-analysis.md](optimization/tikzjax-performance-analysis.md)** — Performance analysis of TikZJax WebAssembly compilation.

---

## 🧭 Related Functional Tiers

- [**08-testing/**](../08-testing/README.md) — Frame budget (`INV-DEV-04`) and bleed (`INV-DEV-01`) automated testing.
- [**07-deployment/**](../07-deployment/README.md) — Production caching headers and asset optimization.
- [**06-components/**](../06-components/README.md) — Observability panels and least-action navigator.
