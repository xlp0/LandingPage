# 🚀 Getting Started

Welcome to the **PKC Landing Page & Responsive Test Workbench**. This section provides essential guides for understanding the system, setting up the development environment, launching the workbench, and running automated verification suites.

---

## 🎯 Role in the MCard_TDD Framework

`LandingPage` is **Submodule 3** of the `MCard_TDD` monorepo. It fulfills three roles:
1. **Responsive Test Workbench (`responsive-lab.html`)**: Interactive and headless workbench for testing the device-sensitive functionality of any chosen web target (e.g. `http://localhost:4321/`, `app.html`, or custom staging deployments).
2. **Single-Page MCard Distillation (`SMR-09`)**: Distills the landing page into a content-addressed MCard (`urn:mcard:content:landing_page`) and provides the 6-sample portal corpus (`data/samples/portal_samples.mcard.db`) on the canonical Triad SQLite schema.
3. **SSRF-Guarded External Portal Membrane**: Isolates external URL probes behind strict network validation (`external-portal-membrane.js`, `server/mcard-api.mjs`).

---

## 📚 Documents in This Section

- **[START_HERE.md](START_HERE.md)** — Comprehensive developer onboarding guide explaining repository structure, architectural tiers, and workflow.
- **[QUICKSTART.md](QUICKSTART.md)** — 5-minute setup to install dependencies, run the server, and open the workbench.
- **[STATUS.md](STATUS.md)** — Current operational status, Program ERB graduation record, and test battery results.
- **[OPEN_AND_USE.md](OPEN_AND_USE.md)** — User guide for operating the Responsive UI Lab, selecting devices, toggling orientation, and capturing interactions.

---

## ⚡ 60-Second Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the local server (runs on port 3001 by default)
npm run dev

# 3. Open the Responsive UI Lab in your browser
open http://localhost:3001/responsive-lab.html

# 4. Run automated test suites
npm run test:unit
npm run test:responsive
```

---

## 🧭 Next Steps

After completing the onboarding documents:
- [**01-architecture/**](../01-architecture/README.md) — Understand the Four-Estate monorepo architecture and component design.
- [**08-testing/**](../08-testing/README.md) — Explore the device-sensitive testing infrastructure and Playwright replay engine.
- [**03-data-management/**](../03-data-management/README.md) — Learn about the MCard SQLite Triad persistence and content addressing.
