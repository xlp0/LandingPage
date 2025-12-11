# 📈 Performance & Monitoring

Performance optimization, monitoring, and observability.

## Documents in This Section

### Optimization
- **optimization/** - Performance optimization docs
  - **library-comparison.md** - Library performance comparison
  - **tikz-cors-fix.md** - TikZ CORS fixes
  - **tikz-optimization-strategy.md** - TikZ optimization
  - **tikzjax-performance-analysis.md** - TikZJax analysis

### Observability
- **observability/** - Monitoring and debugging
  - **TROUBLESHOOTING.md** - Debug guide
  - **client-side-tracking.md** - Client-side monitoring
  - **grafana-cloud-setup-steps.md** - Grafana Cloud setup
  - **grafana-faro-queries.md** - Faro query examples
  - **grafana-loki-setup-plan.md** - Loki setup
  - **tikz-performance-tracking.md** - TikZ performance tracking

## Performance Metrics

### Load Times
- **Initial Load:** ~300ms
- **MCard Manager:** ~100ms
- **Component Render:** ~50ms

### Bundle Sizes
- **Redux Stack:** 157KB
- **CSS Files:** 24KB
- **mcard-js:** 36.3KB
- **Total:** ~220KB (uncompressed)

## Monitoring Stack

### Grafana Cloud
- **Metrics:** Application performance
- **Logs:** Loki for log aggregation
- **Traces:** Distributed tracing
- **Faro:** Real user monitoring (RUM)

## Quick Setup

### Local Monitoring
1. Check [observability/client-side-tracking.md](observability/client-side-tracking.md)
2. Enable browser DevTools

### Production Monitoring
1. Setup Grafana Cloud - [observability/grafana-cloud-setup-steps.md](observability/grafana-cloud-setup-steps.md)
2. Configure Loki - [observability/grafana-loki-setup-plan.md](observability/grafana-loki-setup-plan.md)
3. Add Faro queries - [observability/grafana-faro-queries.md](observability/grafana-faro-queries.md)

### Troubleshooting
Follow [observability/TROUBLESHOOTING.md](observability/TROUBLESHOOTING.md) for common issues.

## Related Sections

- [07-deployment/](../07-deployment/) - Caching strategy
- [04-networking/](../04-networking/) - Connection monitoring
- [00-getting-started/](../00-getting-started/) - Current status
