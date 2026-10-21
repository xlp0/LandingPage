# 🌐 Networking, WebRTC & Membrane Boundaries

This directory documents the networking architecture, WebRTC peer-to-peer (P2P) mesh, signaling server, and SSRF network boundary enforcement.

---

## 🎯 Architecture Overview

The networking tier in `LandingPage` encompasses two primary domains:

1. **WebRTC P2P Mesh & Signaling**:
   - Decentralized peer-to-peer data channels for real-time MCard exchange and multiplayer state synchronization (Chess, Go, Monopoly).
   - Local WebSocket signaling server (`ws-server.js`) with configured CORS allowlists for local Astro and frontend targets (`http://localhost:4321`).
   - STUN/TURN integration for resilient NAT traversal.

2. **SSRF-Guarded External Portal Membrane (`js/external-portal-membrane.js`)**:
   - Connection-level network guard for external URL probes (`/api/mcard/probe-url`).
   - Validates DNS resolution, blocks loopback (`127.0.0.1`), private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and link-local (`169.254.0.0/16`).
   - Enforces redirect safety and a 2 MB response size ceiling.

3. **Cross-Origin Probe Channel (`js/harness/lab-probe-agent.js`)**:
   - Secure parent-child iframe communication via origin- and nonce-checked `postMessage` protocol for cross-origin responsive testing in the Responsive UI Lab.

---

## 📚 Documents in This Section

### WebRTC & P2P Mesh
- **[p2p-serverless-design-choices.md](p2p-serverless-design-choices.md)** — Architectural design decisions for serverless P2P communication.
- **[p2p-serverless-implementation.md](p2p-serverless-implementation.md)** — WebRTC data channel implementation details.
- **[p2p-testing-guide.md](p2p-testing-guide.md)** — Testing procedures for multi-peer mesh topologies.
- **[webrtc-dashboard-architecture.md](webrtc-dashboard-architecture.md)** — Real-time connection metrics and mesh status dashboard.
- **[webrtc-connectivity-issues.md](webrtc-connectivity-issues.md)** — Troubleshooting ICE connection failures and NAT traversal.

### STUN Configuration & Bug Fixes
- **[stun-server-setup.md](stun-server-setup.md)** — Public and private STUN server configuration.
- **[stun-config-summary.md](stun-config-summary.md)** — Quick reference for ICE server lists.
- **[p2p-bug-fix-peer-id.md](p2p-bug-fix-peer-id.md)** — Resolution of peer ID collisions and reconnection stability.
- **[p2p-logger-fix.md](p2p-logger-fix.md)** — Logging improvements for signaling state transitions.

---

## 🧭 Related Functional Tiers

- [**01-architecture/**](../01-architecture/README.md) — Monorepo estate boundaries and membrane architecture.
- [**05-state-management/**](../05-state-management/README.md) — WebRTC connection Redux slice (`rtcConnectionSlice.js`).
- [**08-testing/**](../08-testing/README.md) — Cross-origin telemetry and target membrane verification.
