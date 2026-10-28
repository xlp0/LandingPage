# CSS Token and Styling Rules Reference

| Field | Value |
| --- | --- |
| Audience | Frontend engineers and UX designers authoring styles in LandingPage |
| BMAD Owner | UX Designer (`bmad-agent-ux-designer`) and Developer (`bmad-agent-dev`) |
| Source of Truth | [`public/css/tokens.css`](../../public/css/tokens.css), [`public/css/semantic-tokens.css`](../../public/css/semantic-tokens.css), and [`docs/11-standards/rules/css.md`](../11-standards/rules/css.md) |
| Drift Gate | `npm run docs:check` |

1. Define primitive scales only in [`public/css/tokens.css`](../../public/css/tokens.css) and consume contextual variables from [`public/css/semantic-tokens.css`](../../public/css/semantic-tokens.css).
2. Avoid hardcoded hex or RGB literals in component stylesheets so `dark`, `light`, and `high-contrast` themes stay WCAG 2.1 AA compliant (`>= 4.5:1`).
3. Keep Responsive UI Lab stage scaling driven by CSS custom properties (`--frame-target-width`, `--frame-target-height`, `--frame-scale-factor`) without introducing outer window scrollbars (`INV-RVP-02`).

See the full rule set in [docs/11-standards/rules/css.md](../11-standards/rules/css.md) and [docs/11-standards/README.md](../11-standards/README.md).
