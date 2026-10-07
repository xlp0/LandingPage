/**
 * Resolve design tokens at call time — for consumers that cannot read CSS.
 *
 * A canvas cannot resolve a CSS custom property: `ctx.fillStyle = 'var(--x)'`
 * is an invalid colour and paints nothing. Anything handing a colour to a
 * canvas (Chart.js) must therefore read the token here instead of carrying a
 * var() string into its config.
 *
 * Reading at call time is also what makes a chart follow the theme: the value
 * is resolved when the chart is built, so a chart rebuilt after a theme change
 * gets that theme's colours.
 *
 * Presentation-only (INV-REF-01): this reads the document, it does not own it.
 */

export const cssVar = (name, fallback = '') => {
  if (typeof document === 'undefined' || !document.documentElement) return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
};

export const cssVars = (...names) => names.map((n) => cssVar(n));

/** Resolve a var() string if one is passed, otherwise return it unchanged. */
export const resolveColor = (value, fallback = '') => {
  if (typeof value !== 'string') return value;
  const m = value.match(/^var\(\s*(--[\w-]+)\s*\)$/);
  return m ? cssVar(m[1], fallback) : value;
};
