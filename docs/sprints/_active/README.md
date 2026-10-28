# LandingPage Active Sprint Workspace

| Field | Value |
| --- | --- |
| Audience | Scrum masters, BMAD role leads, developers, and operators reviewing Program GQC |
| BMAD Owner | Scrum Master |
| Source of Truth | [`./INDEX.md`](./INDEX.md), [`./DECISIONS.tsv`](./DECISIONS.tsv), and [`./gqc-plan.md`](./gqc-plan.md) |
| Drift Gate | `npm run docs:check` |

Program GQC (`GQC-00` through `GQC-07`) has completed all ten sequential execution units and remains in `docs/sprints/_active/` awaiting explicit operator graduation approval.

GQC delivers the guided SPA test workflow in Responsive UI Lab (`/responsive-lab.html`), runs LandingPage on `astro@7.4.2` (`@astrojs/node@11.1.9` middleware inside `ws-server.js`) with 7 Preact islands (`preact@11.1.0`), formalizes the `31`-Place / `65`-Transition workbench Petri net (`src/net/workbench-net.yaml`) on `clm-kernel@0.0.12`, persists `NetMCard`, `FiringReceiptMCard`, and separate `urn:gqc:navigation-run-link:v1` MCards in the SQLite Triad, establishes paired performance baselines, and enforces `npm run docs:check` in CI.

PenPot-assisted MPA target assessment remains **Optional / Deferred**. `design/landing-navigation.penpot` describes LandingPage's own navigation (`js/nav.js`), and assessing a separate MPA target requires explicit Product Manager approval and live Playwright verification.

Review the [active sprint index](./INDEX.md), the [GQC execution plan](./gqc-plan.md), and the [GQC-07 graduation evidence report](./evidence/GQC-07-docs-and-graduation.md). The graduated [SMO architecture program](../01-architecture/INDEX.md) and [ERB testing program](../08-testing/INDEX.md) remain preserved unchanged.
