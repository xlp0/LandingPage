# 🔐 Authentication & Identity System

This directory documents the authentication architecture, Zitadel OpenID Connect (OIDC) integration, PKCE flows, and the auth-gated Content Security Policy (CSP) security model for `LandingPage`.

---

## 🎯 Architecture & Security Model

The authentication subsystem balances security, developer usability, and compliance with the MCard_TDD architectural standards:

1. **Zitadel OIDC with PKCE**:
   Uses Authorization Code Flow with Proof Key for Code Exchange (PKCE) for client-side authentication (`js/oauth-handler.js`), preventing authorization code interception without requiring a client secret in the browser.
2. **Auth-Gated CSP Security Boundary**:
   In `ws-server.js`, the Content Security Policy defaults to strict evaluation rules. Advanced capabilities requiring WebAssembly evaluation (such as in-browser Pyodide for CLM execution) are enabled only after secure authentication is validated via HttpOnly session cookies.
3. **Privacy Redaction by Construction (`INV-PRV-01`)**:
   During responsive telemetry and interaction capture in the Responsive UI Lab, all password fields (`input[type="password"]`), tokens, and sensitive authentication elements are automatically redacted before entering the Event Ring Buffer.

---

## 📚 Documents in This Section

### Zitadel Setup & Configuration
- **[ZITADEL_SETUP.md](ZITADEL_SETUP.md)** — Step-by-step guide for setting up Zitadel OAuth2 applications and redirect URIs.
- **[ZITADEL_CLIENT_SECRET_GUIDE.md](ZITADEL_CLIENT_SECRET_GUIDE.md)** — Management of server-side client secrets.
- **[SETUP_ZITADEL_SECRET.md](SETUP_ZITADEL_SECRET.md)** — Instructions for environment variables and secrets setup.

### PKCE & OAuth Implementation
- **[PKCE_IMPLEMENTATION.md](PKCE_IMPLEMENTATION.md)** — Browser-native PKCE flow implementation details.
- **[PKCE_ZITADEL_CONFIG.md](PKCE_ZITADEL_CONFIG.md)** — Zitadel configuration for public clients using PKCE.
- **[OAUTH_BACKEND_INTEGRATION.md](OAUTH_BACKEND_INTEGRATION.md)** — Express backend session verification and token exchange.
- **[OAUTH_IMPLEMENTATION_COMPLETE.md](OAUTH_IMPLEMENTATION_COMPLETE.md)** — Architecture summary of the completed OAuth implementation.

### Secrets Management
- **[GENERATE_CLIENT_SECRET.md](GENERATE_CLIENT_SECRET.md)** — How to generate client secrets in Zitadel Console.
- **[FIND_REGENERATE_SECRET.md](FIND_REGENERATE_SECRET.md)** — Rotating and regenerating compromised secrets.

---

## 🚀 Quick Setup Overview

```
Browser (PKCE)              ws-server.js                  Zitadel OIDC
      │                          │                             │
      ├──── 1. Auth Request ─────┼────────────────────────────►│
      │    (code_challenge)      │                             │
      │                          │                             │
      │◄─── 2. Auth Code ────────┼─────────────────────────────┤
      │                          │                             │
      ├──── 3. Exchange Token ──►│                             │
      │    (code_verifier)       ├──── 4. Token Request ──────►│
      │                          │◄─── 5. JWT Access Token ────┤
      │◄─── 6. HttpOnly Session ─┤                             │
```

1. Configure your Zitadel application with Redirect URI `http://localhost:3001/auth-callback-enhanced.html` (or `app.html`).
2. Set `ZITADEL_CLIENT_ID` in your environment.
3. Authenticated sessions gain access to protected Mission Control features and the expanded CLM execution runtime.

---

## 🧭 Related Functional Tiers

- [**05-state-management/**](../05-state-management/README.md) — Auth Redux slice (`authSlice.js`) managing user state.
- [**08-testing/**](../08-testing/README.md) — Privacy redaction invariants (`INV-PRV-01`) during interaction recording.
- [**07-deployment/**](../07-deployment/README.md) — Environment variable management and production OAuth settings.
