# 📏 Standards, Style Gates & Engineering Conventions

This directory documents the engineering standards, CSS design token contracts, style gates, and architectural conventions enforced across `LandingPage`.

---

## 🎯 Engineering Principles & Invariants

Development within `LandingPage` adheres to the strict architectural invariants established in the `MCard_TDD` framework:

1. **Zero Runtime NPM Dependencies (`INV-REF-01`)**:
   - The core Viewport Stage, Event Ring Buffer, and harness utilities use pure vanilla ECMAScript and native CSS custom properties.
   - External dependencies are strictly restricted to dev tooling (Playwright, esbuild) or published workspace libraries (`clm-kernel@0.0.9`).
2. **Unified CSS Token Architecture (`EPIC-STY`)**:
   - Primitive color palette lives strictly in `public/css/tokens.css` (98 defined tokens).
   - Component styles consume semantic variables from `public/css/semantic-tokens.css`.
   - Zero presentational color literals in component styles; validated by monorepo `sty_gate.py`.
   - Contrast ratio guarantee ($\ge 4.5:1$ for text, $17.06:1$ default contrast floor).
3. **Clean-Room Boundary Contract (`INV-CDO-34`)**:
   - All modules declare explicit inputs, outputs, and side-effect boundaries.
   - Retired legacy islands are logged in `retired-islands.yaml` and verified by CI against accidental reintroduction.
4. **Visual Navigation SSOT (`INV-CDO-11`)**:
   - Navigation flows and frame structures are authored in `design/landing-navigation.penpot`.
   - Navigation code in `index.html` and `js/nav.js` is generated from the Penpot archive, with automated drift checking (`scripts/penpot-drift.mjs`).
5. **Technical Documentation Standard (Diátaxis & pstack)**:
   - Every document adheres to a clear Diátaxis mode: Tutorial, How-To, Reference, or Explanation.
   - Clear, concise, and unslopped technical writing following Google Developer Style and Simplified Technical English rules.

---

## 📚 Documents in This Section

### CSS & Design System Standards
- **[rules/css.md](rules/css.md)** — CSS conventions, file structure, naming rules, and token usage.
- See also `public/css/tokens.css` and `public/css/semantic-tokens.css` in the project root.

### Feature Specifications
- **[features/nested-sidebar.md](features/nested-sidebar.md)** — Standards and specifications for nested sidebar navigation layouts.

---

## 🧪 Automated Standards Verification

Monorepo CI scripts enforce these standards automatically:

```bash
# 1. Audit CSS computed styles and token contract compliance
npx playwright test tests/features/style-audit.spec.js --project=features

# 2. Check for Penpot design <-> code drift
node scripts/penpot-drift.mjs

# 3. (Monorepo root) Run style and retirement gates
python3 scripts/ci/check_landingpage_retirement.py
python3 scripts/ci/check_ulr_census.py
```

---

## 🧭 Related Functional Tiers

- [**01-architecture/**](../01-architecture/README.md) — System architecture and invariant definitions.
- [**08-testing/**](../08-testing/README.md) — Automated conformance testing and device certification.
- [**06-components/**](../06-components/README.md) — Component architecture and CLM conventions.
