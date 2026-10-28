# MCard-JS and CLM Kernel Setup Reference

| Field | Value |
| --- | --- |
| Audience | Developers configuring MCard packages and local vendor bundles |
| BMAD Owner | Developer (`bmad-agent-dev`) |
| Source of Truth | [`package.json`](../../package.json) and [`scripts/build-mcard-bundle.js`](../../scripts/build-mcard-bundle.js) |
| Consensus Kernel | `clm-kernel@0.0.13` |

## Dependency Layout

`LandingPage` installs two complementary packages via `npm install`:

1. **`clm-kernel@0.0.13` (Server and Build Authority)** provides canonical Blake3 hashing, `g_time` coordinates, `TypeInterpreter` 4-modality detection, Layer 1 `NetMCard` Petri net verification, and Layer 4 `FiringReceiptMCard` execution in Node.
2. **`mcard-js@^2.1.18` (Legacy Browser Vendor Bundle)** supports legacy IndexedDB views in `app.html` when bundled via `npm run build:mcard` (`scripts/build-mcard-bundle.js`).

## Rebuilding the Legacy Browser Bundle

```bash
npm run build:mcard
npm run build
```

For server Triad persistence and modality APIs, see [MCARD_LIBRARY_STRATEGY.md](./MCARD_LIBRARY_STRATEGY.md) and [MCARD_LIBRARY_USAGE.md](./MCARD_LIBRARY_USAGE.md).
