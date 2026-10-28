# Testing and Quality Assurance

| Field | Value |
| --- | --- |
| Audience | QA engineers, Test Architects, and developers verifying LandingPage and target web apps |
| BMAD Owner | Test Architect and Developer (`bmad-agent-dev`) |
| Source of Truth | [`tests/README.md`](../../tests/README.md), [`tests/TEST_DOCUMENTATION.md`](../../tests/TEST_DOCUMENTATION.md), and [`playwright.config.js`](../../playwright.config.js) |
| Drift Gate | `npm run check:playwright-discovery` and `npm run docs:check` |

## Documents in This Section

- **[DEVICE_SENSITIVE_TESTING_INFRASTRUCTURE.md](./DEVICE_SENSITIVE_TESTING_INFRASTRUCTURE.md)** covers Responsive UI Lab target ingestion, fidelity tiers (`T0..T3`), 16-combination sweeps, deterministic Playwright replay, and `urn:mcard:certification:responsive:v1` certification.
- **[VERIFICATION_CHECKLIST.md](./VERIFICATION_CHECKLIST.md)** provides the current pre-release gate checklist above a preserved historical THK Mesh archive record.
- **[Test Suite Guide (`tests/README.md`)](../../tests/README.md)** and **[Playwright Test Documentation (`tests/TEST_DOCUMENTATION.md`)](../../tests/TEST_DOCUMENTATION.md)** document exact commands, `TEST_PORT=3001` isolation, and the `48` Playwright specs (`644` tests).
- **[Program ERB Graduated Sprints (`docs/sprints/08-testing/`)](../sprints/08-testing/INDEX.md)** archives Sprints `ERB-00` through `ERB-06`.

## Standard Verification Commands

```bash
npm run check:net
node scripts/check-package-source-parity.mjs
npm run docs:check
npm run build
npm run test:unit
npm run check:playwright-discovery
npm run test:smoke
npm run test:components
npm run test:features
npm run test:responsive
npm run test:replay
npm run test:conformance
```

## Related Testing Guides

- **CLM Component Isolation** in [06-components/README.md](../06-components/README.md), [CLM_TESTING_SYSTEM.md](../06-components/CLM_TESTING_SYSTEM.md), [CLM_TESTING_QUICK_REFERENCE.md](../06-components/CLM_TESTING_QUICK_REFERENCE.md), and [CLM_MULTI_COMPONENT_TESTING.md](../06-components/CLM_MULTI_COMPONENT_TESTING.md)
- **Redux Auth Slice Testing** in [05-state-management/README.md](../05-state-management/README.md) and [REDUX_AUTH_TESTING.md](../05-state-management/REDUX_AUTH_TESTING.md)
- **WebRTC P2P Testing** in [04-networking/README.md](../04-networking/README.md) and [p2p-testing-guide.md](../04-networking/p2p-testing-guide.md)
- **Performance Baselines** in [09-performance/gqc-06-spa-and-island-baselines.md](../09-performance/gqc-06-spa-and-island-baselines.md)
