# Standards, Style Gates, and Engineering Conventions

| Field | Value |
| --- | --- |
| Audience | All contributors authoring code, styles, tests, or documentation in LandingPage |
| BMAD Owner | Architect (`bmad-agent-architect`), UX Designer (`bmad-agent-ux-designer`), and Tech Writer (`bmad-agent-tech-writer`) |
| Source of Truth | [`public/css/tokens.css`](../../public/css/tokens.css), [`public/css/semantic-tokens.css`](../../public/css/semantic-tokens.css), [`scripts/check-docs.mjs`](../../scripts/check-docs.mjs), and [`scripts/check-package-source-parity.mjs`](../../scripts/check-package-source-parity.mjs) |
| Consensus Kernel | `clm-kernel@0.0.13` |

## Core Engineering Contracts

1. **Host, Island, and Kernel Boundaries (`INV-REF-01`)**
   - Workbench pages render through `astro@7.4.2` (`@astrojs/node@11.1.9` middleware) and `preact@11.1.0` (`7` islands on `responsive-lab.html`, `0` islands on `astro-wrapped` pages).
   - Server hashing, modality detection, and Petri net evaluation use `clm-kernel@0.0.13` in Node only; browser islands and harness modules never import `clm-kernel` or Node `crypto`.
   - Unit and E2E verification use `node:test` and Playwright (`Vitest` is not adopted).
2. **Unified CSS Token Architecture (`EPIC-STY`)**
   - Primitive palette tokens live in [`public/css/tokens.css`](../../public/css/tokens.css) and semantic mappings live in [`public/css/semantic-tokens.css`](../../public/css/semantic-tokens.css).
   - Component stylesheets consume semantic variables and maintain WCAG 2.1 AA contrast (`>= 4.5:1`).
3. **Clean-Room and Package Parity Gates (`INV-CDO-34`, `GQC-05`)**
   - Retired legacy surfaces stay tombstoned in [`retired-islands.yaml`](../../retired-islands.yaml).
   - `node scripts/check-package-source-parity.mjs` enforces workspace SHA-256 parity and verifies that every client network call is declared in [`src/net/workbench-net.yaml`](../../src/net/workbench-net.yaml).
4. **PenPot Navigation SSOT (`INV-CDO-11`)**
   - [`design/landing-navigation.penpot`](../../design/landing-navigation.penpot) compiles LandingPage's own navigation into [`js/nav.js`](../../js/nav.js), verified by `node scripts/penpot-drift.mjs`. External PenPot MPA target assessment in Responsive UI Lab remains Optional / Deferred pending Product Manager approval.
5. **Living Documentation Gate (`GQC-07`)**
   - `npm run docs:check` enforces valid repo-relative links, verified `npm run` scripts and Playwright `--project` flags, `clm-kernel@0.0.13` and port (`3000`, `3001`, `4322`) consensus, valid Petri net IDs (`p_*`, `t_*`), and byte-identical `docs/01-architecture/workbench-net.md` output from `npm run docs:gen-net`.

## Documents in This Section

- [rules/css.md](./rules/css.md) covers CSS conventions, naming, and token usage.
- [features/nested-sidebar.md](./features/nested-sidebar.md) covers nested sidebar layout specifications.

## Automated Standards Verification

```bash
npm run check:net
node scripts/check-package-source-parity.mjs
npm run docs:check
node scripts/penpot-drift.mjs
npx playwright test tests/features/style-audit.spec.js --project=features
```
