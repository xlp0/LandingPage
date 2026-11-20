import { always, extract } from "@antithesishq/bombadil";
import { defaultActions } from "@antithesishq/bombadil/browser/defaults";
// Bombadil registers every exported ActionGenerator. Re-exporting all of browser/defaults would
// also export the unfiltered `defaultActions` next to `actions`, so only the properties are re-exported.
export * from "@antithesishq/bombadil/browser/defaults/properties";
// Records the firing log in every trace, for scripts/bombadil/trace-to-net.mjs (BPV-07).
import "./net-report.ts";

// Controls an unattended run must not press. A new tab also starves this tab of animation frames,
// which Bombadil's quiescence check waits on, so every later action would time out.
// The last two rows keep the frame off targets scope.json puts outside the exploration boundary.
const SKIPPED_SELECTOR = [
  '[data-effect="external"]',
  '[data-effect="destructive"]',
  '[data-effect="download"]',
  '[data-effect="file-picker"]',
  'a[target="_blank"]',
  '[data-testid^="target-chip-"]:not([data-testid="target-chip-spa-test-target"])',
  '[data-testid="workflow-select-portal-index"]',
  '[data-testid^="bombadil-"]',
  "#bombadil-transport-pill",
  "#bombadil-dashboard-panel button"
].join(",");

// A click point can be a fraction of a pixel outside a control and still press it.
const RECT_MARGIN_PX = 2;

type Rect = { left: number; top: number; right: number; bottom: number };
type Span = number | [number, number];

// This run smokes the lab only. The portal is explored from its own start URL, and the pages
// scope.json marks `boundary` carry no page-state contract, so links that leave the page are skipped too.
const skippedRects = extract((state): Rect[] =>
  Array.from(state.document.querySelectorAll(`${SKIPPED_SELECTOR},a[href]`))
    .filter(
      (el) =>
        el.matches(SKIPPED_SELECTOR) || (el as HTMLAnchorElement).pathname !== state.document.location.pathname
    )
    .map((el) => el.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0)
    .map(({ left, top, right, bottom }) => ({ left, top, right, bottom }))
);

const overlaps = (span: Span, low: number, high: number): boolean => {
  const [from, to] = typeof span === "number" ? [span, span] : span;
  return to >= low - RECT_MARGIN_PX && from <= high + RECT_MARGIN_PX;
};

// The filter works on the click point, not the fingerprint. Bombadil 0.7.10 reports a control inside
// the target iframe with iframe-relative coordinates, so such a click lands on whatever the lab page
// shows at that point, and the fingerprint names a control that is not the one pressed.
// Reload is dropped because the driver's own quiescence check races the navigation it starts and
// logs "Inspected target navigated or closed" about once in 75 reloads. `bombadil:spa` still reloads.
export const actions = defaultActions.filter((action) => {
  if (action === "Reload") return false;
  if (typeof action !== "object" || action === null) return true;
  const click = "Click" in action ? action.Click : "DoubleClick" in action ? action.DoubleClick : null;
  if (click === null) return true;
  return !skippedRects.current.some(
    (rect) => overlaps(click.point.x, rect.left, rect.right) && overlaps(click.point.y, rect.top, rect.bottom)
  );
});

const STATES = ["loading", "redirecting", "ready", "busy", "error"];
const RECORDER_STATES = ["IDLE", "RECORDING", "PAUSED", "FINALIZED"];

const page = extract((state) => {
  const body = state.document.body;
  if (!body) return null;
  const ribbon = state.document.querySelector("[data-recorder-state]");
  return {
    netId: body.getAttribute("data-net-id"),
    state: body.getAttribute("data-page-state"),
    place: body.getAttribute("data-place-id"),
    places: (body.getAttribute("data-place-ids") ?? "").split(",").filter(Boolean),
    nonce: body.getAttribute("data-boot-nonce"),
    recorder: ribbon?.getAttribute("data-recorder-state") ?? null
  };
});

export const stateIsLegal = always(() => page.current === null || STATES.includes(page.current.state ?? ""));

export const placeIsDeclared = always(() => {
  const view = page.current;
  if (view === null || !view.place) return true;
  return view.places.length === 0 || view.places.includes(view.place);
});

export const recorderStateIsLegal = always(
  () => page.current === null || page.current.recorder === null || RECORDER_STATES.includes(page.current.recorder)
);

export const bootNonceIsStable = always(
  () => page.current !== null && (page.current.nonce ?? "").length >= 8
);

const reportLength = extract((state) => state.window.__netReport?.length ?? 0);

export const netReportIsBounded = always(() => reportLength.current <= 200);
