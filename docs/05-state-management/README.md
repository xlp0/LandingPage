# 📊 State Management Architecture

| Field | Value |
| --- | --- |
| Audience | Engineers, architects, and QA reviewers working in this documentation tier |
| BMAD Owner | Architect (`bmad-agent-architect`) and Developer (`bmad-agent-dev`) |
| Source of Truth | [`js/harness/lab-runtime.js`](../../js/harness/lab-runtime.js) and [`js/harness/recording-state-machine.js`](../../js/harness/recording-state-machine.js) |
This directory documents state management in `LandingPage`, covering the Redux Toolkit application store, WebRTC connection state, and the deterministic Recording State Machine in the Responsive UI Lab.

---

## 🎯 Dual State Architecture

State management in `LandingPage` is divided into two distinct models:

```
┌────────────────────────────────────────────────────────┐
│                   State Management                     │
│                                                        │
│  ┌──────────────────────────┐  ┌────────────────────┐  │
│  │   Global Redux Store     │  │  Lab Recording FSM │  │
│  │     (Redux Toolkit)      │  │ (Deterministic 20) │  │
│  ├──────────────────────────┤  ├────────────────────┤  │
│  │ • auth                   │  │ • IDLE             │  │
│  │ • clm                    │  │ • RECORDING        │  │
│  │ • rtcConnection          │  │ • PAUSED           │  │
│  │ • participants           │  │ • STOPPED          │  │
│  │ • invitations            │  │ (INV-ERB-03)       │  │
│  └──────────────────────────┘  └────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

1. **Global Application State (Redux Toolkit)**:
   - Manages asynchronous user sessions, Zitadel OIDC identity, WebRTC peer connections, and CLM component state.
2. **Deterministic Recording State Machine (`INV-ERB-03`)**:
   - Manages test interaction recording in the Responsive UI Lab.
   - Enforces a closed 20-pair `(state, action) -> nextState` transition table.
   - Decoupled from the data layer (`EventRingBuffer`, `INV-ERB-01`) for pure testability and zero jank.
3. **Device Registry Persistence (`INV-RVP-03`, `INV-DSF-02`)**:
   - Manages device profiles and custom viewports with schema v2 validation and self-healing `localStorage` fallback.

---

## 📚 Documents in This Section

### Redux Documentation
- **[redux/INDEX.md](redux/INDEX.md)** - Redux store overview and slice index.
- **[redux/REDUX_ARCHITECTURE.md](redux/REDUX_ARCHITECTURE.md)** - Detailed state architecture and action flows.
- **[redux/slices/](redux/slices/)** - Individual slice specifications:
  - `auth-slice.md` - Authentication state, tokens, and user claims.
  - `clm-slice.md` - Cubical Logic Model component registry and runtime state.
  - `rtc-connection-slice.md` - WebRTC peer connections and signaling states.
  - `participants-slice.md` - Presence and mesh participant tracking.
  - `invitations-slice.md` - P2P session and game matchmaking invitations.

### Implementation & Testing
- **[REDUX_SLICES_IMPLEMENTATION.md](REDUX_SLICES_IMPLEMENTATION.md)** - Implementation guide for building and extending Redux slices.
- **[REDUX_AUTH_TESTING.md](REDUX_AUTH_TESTING.md)** - Unit and integration testing strategies for the auth slice.
- **[REDUX_FIX_SUMMARY.md](REDUX_FIX_SUMMARY.md)** - History of bug fixes and reducer optimizations.

---

## 🧭 Related Functional Tiers

- [**02-authentication/**](../02-authentication/README.md) - Zitadel PKCE authentication integration.
- [**04-networking/**](../04-networking/README.md) - WebRTC connection lifecycle and signaling.
- [**08-testing/**](../08-testing/README.md) - Recording state machine verification and unit test suite.
