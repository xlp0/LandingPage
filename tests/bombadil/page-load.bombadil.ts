import { always, eventually, extract, now } from "@antithesishq/bombadil";
// The browser module's custom actions run in the page. The root module's version never
// reached it, so ScrollPage did not scroll before 2026-11-18 (BPV-06 triage).
import { actions as makeActions, registerCustomAction } from "@antithesishq/bombadil/browser";
import { defaultActions } from "@antithesishq/bombadil/browser/defaults";
import { noUncaughtExceptions, noUnhandledPromiseRejections } from "@antithesishq/bombadil/browser/defaults/properties";
import { NET_ID, PLACES } from "./generated/workbench-net.ts";
// Records the firing log in every trace, for scripts/bombadil/trace-to-net.mjs (BPV-07).
import "./net-report.ts";
import baselineJson from "./baseline.json";

export { noUncaughtExceptions, noUnhandledPromiseRejections };

// The baseline replaces the default console and HTTP properties. They cannot
// take a per-page allowance, so every page that logs on purpose would fail.
// The matcher mirrors scripts/bombadil/baseline.mjs; a Bombadil spec cannot
// import a .mjs module.
const HTTP_FAILURE = /Failed to load resource: the server responded with a status of (\d{3})/;
const baseline = {
  console: baselineJson.console.map((row) => ({ ...row, regex: new RegExp(row.pattern) })),
  http: baselineJson.http.map((row) => ({ ...row, regex: new RegExp(row.pattern) }))
};
const httpStatusOf = (text: string): number | null => {
  const match = HTTP_FAILURE.exec(text);
  return match ? Number(match[1]) : null;
};
const unexpectedConsoleErrors = (texts: string[]): string[] =>
  texts.filter((text) => httpStatusOf(text) === null && !baseline.console.some((row) => row.regex.test(text)));
const unexpectedHttpErrors = (texts: string[]): string[] =>
  texts.filter((text) => {
    const status = httpStatusOf(text);
    if (status === null || status < 400) return false;
    return !baseline.http.some((row) => row.status === status && row.regex.test(text));
  });

const SET_LIMIT_MS = 10_000;
const SETTLED = new Set(["ready", "error", "redirecting"]);

// Controls an unattended run must not press. Link navigation stays in scope
// through the runner's --allow-url boundary instead.
const SKIPPED_SELECTOR = [
  '[data-effect="external"]',
  '[data-effect="destructive"]',
  '[data-effect="download"]',
  '[data-effect="file-picker"]',
  'a[target="_blank"]',
  '[data-testid^="nav-"]',
  '[data-testid="workbench-nav-summary"]',
  '[data-testid="link-conformance-harness"]'
].join(",");

const RECT_MARGIN_PX = 2;

type Rect = { left: number; top: number; right: number; bottom: number };
type Span = number | [number, number];

// A link to the redirecting portal URL (`/` or `/index.html` without `noredirect`) loads a
// page that replaces itself at once, and the driver's quiescence check races that second
// navigation (BPV-06 triage 7, seen again in the BPV-07 nightly). The redirect stays declared.
const leadsToRedirect = (el: Element): boolean => {
  const link = el as HTMLAnchorElement;
  if (!link.href) return false;
  const target = new URL(link.href);
  return (target.pathname === "/" || target.pathname === "/index.html") && !target.search.includes("noredirect");
};

const skippedRects = extract((state): Rect[] =>
  Array.from(state.document.querySelectorAll(`${SKIPPED_SELECTOR},a[href]`))
    .filter((el) => el.matches(SKIPPED_SELECTOR) || leadsToRedirect(el))
    .map((el) => el.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0)
    .map(({ left, top, right, bottom }) => ({ left, top, right, bottom }))
);

const overlaps = (span: Span, low: number, high: number): boolean => {
  const [from, to] = typeof span === "number" ? [span, span] : span;
  return to >= low - RECT_MARGIN_PX && from <= high + RECT_MARGIN_PX;
};

export const actions = defaultActions.filter((action) => {
  if (typeof action !== "object" || action === null) return true;
  const click = "Click" in action ? action.Click : "DoubleClick" in action ? action.DoubleClick : null;
  if (click === null) return true;
  return !skippedRects.current.some(
    (rect) => overlaps(click.point.x, rect.left, rect.right) && overlaps(click.point.y, rect.top, rect.bottom)
  );
});

// A read-only page has no controls, so it needs an action that always applies,
// or the run stops before the page has had time to settle.
const scrollPage = registerCustomAction("ScrollPage", async (_document, window) => {
  window.scrollBy(0, Math.max(1, window.innerHeight * 0.8));
});

export const pageScroll = makeActions(() => [scrollPage()]);

const stripped = (route: string | null): string => (route ?? "").split("?")[0];

const RESOLVER = PLACES.filter((place) => place.kind === "page" || place.kind === "view").map((place) => ({
  id: place.id,
  queryFlag: place.queryFlag,
  paths: [place.route, ...place.routeAliases].filter((route): route is string => Boolean(route)).map(stripped)
}));

const RESOLVED_BY_FLAG = RESOLVER.filter((place) => place.queryFlag);
const RESOLVED_BY_PATH = RESOLVER.filter((place) => !place.queryFlag);

function resolvePlace(pathname: string, search: string): string | null {
  const flags = search
    .replace(/^\?/, "")
    .split("&")
    .filter(Boolean)
    .map((pair) => {
      const [key] = pair.split("=");
      try {
        return decodeURIComponent(key);
      } catch {
        return key;
      }
    });
  for (const place of RESOLVED_BY_FLAG) {
    if (flags.includes(place.queryFlag!) && place.paths.includes(pathname)) return place.id;
  }
  for (const place of RESOLVED_BY_PATH) {
    if (place.paths.includes(pathname)) return place.id;
  }
  return null;
}

const PAGE_PLACES = new Set(PLACES.map((place) => place.id));

const page = extract((state) => {
  const body = state.document.body;
  if (!body) return null;
  const alert = state.document.querySelector('#page-alert, [role="alert"]');
  return {
    netId: body.getAttribute("data-net-id"),
    state: body.getAttribute("data-page-state"),
    place: body.getAttribute("data-place-id"),
    error: body.getAttribute("data-page-error"),
    alertText: alert?.textContent?.trim() ?? "",
    mainCount: state.document.querySelectorAll('main, [role="main"]').length,
    pathname: state.document.location.pathname,
    search: state.document.location.search
  };
});

const consoleTexts = extract((state) =>
  (state.console ?? [])
    .filter((entry) => entry.level === "error")
    .map((entry) =>
      entry.args
        .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
        .join(" ")
    )
);

const isWorkbench = (view: NonNullable<typeof page.current>): boolean => view.netId === NET_ID;

export const pageSettles = always(() =>
  now(() => page.current?.state === "loading").implies(
    eventually(() => (page.current ? SETTLED.has(page.current.state ?? "") : true)).within(
      SET_LIMIT_MS / 1000,
      "seconds"
    )
  )
);

export const placeIsDeclared = always(
  () => page.current === null || !isWorkbench(page.current) || !page.current.place || PAGE_PLACES.has(page.current.place)
);

export const placeMatchesUrl = always(() => {
  const view = page.current;
  if (view === null || !isWorkbench(view) || !view.place || view.state === "redirecting") return true;
  return resolvePlace(view.pathname, view.search) === view.place;
});

export const errorIsAnnounced = always(
  () => page.current === null || !page.current.error || page.current.alertText.length > 0
);

export const hasMainLandmark = always(
  () => page.current === null || page.current.state !== "ready" || page.current.mainCount === 1
);

export const noUnexpectedConsoleErrors = always(
  () => consoleTexts.current === null || unexpectedConsoleErrors(consoleTexts.current).length === 0
);

export const noUnexpectedHttpErrors = always(
  () => consoleTexts.current === null || unexpectedHttpErrors(consoleTexts.current).length === 0
);
