import { always, eventually, extract, next, now } from "@antithesishq/bombadil";
// The browser module's custom actions run in the page with (document, window, ...args).
// The root module's registerCustomAction never reaches the page (measured 2026-11-18).
import { actions as makeActions, registerCustomAction, weighted } from "@antithesishq/bombadil/browser";
import { defaultActions } from "@antithesishq/bombadil/browser/defaults";
import { ARCS, HISTORY_ARCS, RECORDER_TRANSITIONS } from "./generated/workbench-net.ts";
import spaGraph from "../fixtures/spa-test-target.graph.json";
import { type Firing, netReport } from "./net-report.ts";

// The page-load properties hold on every workbench document too. Only properties
// are re-exported: Bombadil registers every exported action generator.
export {
  errorIsAnnounced,
  hasMainLandmark,
  noUncaughtExceptions,
  noUnexpectedConsoleErrors,
  noUnexpectedHttpErrors,
  noUnhandledPromiseRejections,
  pageSettles,
  placeIsDeclared,
  placeMatchesUrl
} from "./page-load.bombadil.ts";

const SPA_PATH = "/tests/fixtures/spa-test-target.html";
const SPA_PLACES: string[] = spaGraph.topology.places.map((place: { id: string }) => place.id);
const MIRROR_LIMIT_SECONDS = 2;

// ---------------------------------------------------------------- firings

const DECLARED_ARCS = [...ARCS, ...HISTORY_ARCS];
const isDeclaredFiring = (record: Firing): boolean =>
  record.transitionId !== null &&
  DECLARED_ARCS.some(
    (arc) => arc.transitionId === record.transitionId && arc.from === record.fromPlaceId && arc.to === record.toPlaceId
  );

export const firingsAreDeclared = always(
  () => netReport.current === null || netReport.current.records.every(isDeclaredFiring)
);

// ---------------------------------------------------------------- recorder

const RECORDER_STATES = new Set<string>(RECORDER_TRANSITIONS.flatMap((row) => [...row.from, row.to]));

const declaredMove = (from: string, to: string): boolean =>
  RECORDER_TRANSITIONS.some((row) => (row.from as readonly string[]).includes(from) && row.to === to);

// `Recorder.start()` from FINALIZED runs `reset` and then `start` in one call, so
// one action can show a declared reset followed by one declared move.
const legalMove = (from: string, to: string): boolean =>
  declaredMove(from, to) || (declaredMove(from, "IDLE") && from !== "IDLE" && declaredMove("IDLE", to));

const recorder = extract((state) => ({
  nonce: state.document.body?.getAttribute("data-boot-nonce") ?? null,
  state: state.document.querySelector("[data-recorder-state]")?.getAttribute("data-recorder-state") ?? null
}));

export const recorderStateIsKnown = always(
  () => recorder.current === null || recorder.current.state === null || RECORDER_STATES.has(recorder.current.state)
);

export const recorderMovesAreLegal = always(
  now(() => {
    const before = recorder.current;
    return next(() => {
      const after = recorder.current;
      if (!before?.state || !after?.state) return true;
      // A fresh document starts a fresh recorder.
      if (before.nonce !== after.nonce) return after.state === "IDLE";
      if (before.state === after.state) return true;
      return legalMove(before.state, after.state);
    });
  })
);

// ---------------------------------------------------------------- target mirror

// "The SPA fixture is the target" needs both sides: the lab has it selected (the guide's
// target badge) and the frame shows it. A rejected URL leaves the old document in the
// frame while the lab's target is something else, and then nothing is mirrored.
const mirror = extract((state) => {
  const stage = state.document.getElementById("viewport-scale-wrapper");
  if (!stage) return null;
  const frame = state.document.getElementById("mission-control-iframe") as HTMLIFrameElement | null;
  const selected =
    state.document.querySelector('[data-testid="workflow-target-type"]')?.getAttribute("data-target-type") === "spa";
  let isSpa = false;
  let place: string | null = null;
  let nonce: string | null = null;
  try {
    const inner = frame?.contentDocument ?? null;
    isSpa = selected && inner?.location.pathname === SPA_PATH;
    const source = inner?.body?.hasAttribute("data-place-id") ? inner.body : inner?.getElementById("spa-app-root") ?? null;
    place = source?.getAttribute("data-place-id") ?? null;
    nonce = source?.getAttribute("data-boot-nonce") ?? null;
  } catch {
    isSpa = false;
  }
  return {
    isSpa,
    place,
    nonce,
    mirroredPlace: stage.getAttribute("data-target-place-id"),
    mirroredNonce: stage.getAttribute("data-target-boot-nonce")
  };
});

const mirrorAgrees = (): boolean => {
  const view = mirror.current;
  if (view === null || !view.isSpa || view.place === null) return true;
  return view.mirroredPlace === view.place && view.mirroredNonce === view.nonce;
};

export const targetMirrorIsDeclared = always(() => {
  const view = mirror.current;
  return view === null || !view.isSpa || view.mirroredPlace === null || SPA_PLACES.includes(view.mirroredPlace);
});

export const targetMirrorAgrees = always(
  now(() => !mirrorAgrees()).implies(eventually(mirrorAgrees).within(MIRROR_LIMIT_SECONDS, "seconds"))
);

// ---------------------------------------------------------------- actions

// BPV-D03 skips, plus targets scope.json puts outside the exploration boundary.
// `persist` (recorder Stop) stays in: the runner's server uses a throwaway database.
const SKIPPED_SELECTOR = [
  '[data-effect="external"]',
  '[data-effect="destructive"]',
  '[data-effect="download"]',
  '[data-effect="file-picker"]',
  'a[target="_blank"]',
  '[data-testid^="target-chip-"]:not([data-testid="target-chip-spa-test-target"])',
  '[data-testid="workflow-select-app-html"]',
  '[data-testid^="bombadil-"]',
  "#bombadil-transport-pill",
  "#bombadil-dashboard-panel button",
  '[data-testid^="nav-"]',
  '[data-testid="workbench-nav-summary"]',
  '[data-testid="link-conformance-harness"]',
  '[data-testid="btn-copy-lab-link"]'
].join(",");

const RECT_MARGIN_PX = 2;

type Rect = { left: number; top: number; right: number; bottom: number };
type Span = number | [number, number];

// A link to the redirecting portal URL (`/` or `/index.html` without `noredirect`) loads a
// page that replaces itself at once. The driver's quiescence check races that second
// navigation, as it races Reload, so these links are skipped. The redirect stays declared.
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

// Bombadil 0.7.10 reports framed controls with frame-relative points, so the
// filter works on the click point rather than the fingerprint (see BPV-04).
// Reload is dropped as in the lab smoke: the driver's quiescence check races it.
// Back, Forward and links still give each run fresh documents.
const exploration = defaultActions.filter((action) => {
  if (action === "Reload") return false;
  if (typeof action !== "object" || action === null) return true;
  const click = "Click" in action ? action.Click : "DoubleClick" in action ? action.DoubleClick : null;
  if (click === null) return true;
  return !skippedRects.current.some(
    (rect) => overlaps(click.point.x, rect.left, rect.right) && overlaps(click.point.y, rect.top, rect.bottom)
  );
});

const WORKFLOW_SELECTOR = [
  "#btn-mode-explore",
  "#btn-mode-guided-spa",
  "#btn-mode-bombadil",
  "#btn-mode-verify",
  '[data-testid^="workflow-tab-"]',
  '[data-testid^="workflow-next-"]',
  '[data-testid^="workflow-device-"]',
  '[data-testid="workflow-select-spa-fixture"]',
  '[data-testid="target-chip-spa-test-target"]',
  "#btn-rec-start",
  "#btn-rec-pause",
  "#btn-rec-resume",
  "#btn-rec-stop",
  "#btn-rotate-viewport"
].join(",");

const isClickable = (el: Element): boolean => {
  const html = el as HTMLButtonElement;
  return !html.disabled && !html.closest("[hidden]") && html.getClientRects().length > 0;
};

// The pick is an argument so a trace replays the same control.
const clickWorkflowControl = registerCustomAction("ClickWorkflowControl", async (document, _window, pick: number) => {
  const controls = Array.from(document.querySelectorAll(WORKFLOW_SELECTOR)).filter(isClickable);
  if (controls.length === 0) return;
  (controls[Math.floor(pick * controls.length) % controls.length] as HTMLElement).click();
});

// BPV-00 showed a custom action can click inside a same-origin frame, where
// Bombadil's own clicks never land.
const clickFramedTarget = registerCustomAction("ClickFramedTarget", async (document, _window, pick: number) => {
  const frame = document.getElementById("mission-control-iframe") as HTMLIFrameElement | null;
  const inner = frame?.contentDocument ?? null;
  if (!inner || inner.location.pathname !== SPA_PATH) return;
  const buttons = Array.from(inner.querySelectorAll("#spa-actions button")).filter(isClickable);
  if (buttons.length === 0) return;
  (buttons[Math.floor(pick * buttons.length) % buttons.length] as HTMLElement).click();
});

const workflow = makeActions(() => [clickWorkflowControl(Math.random())]);
const framedTarget = makeActions(() => [clickFramedTarget(Math.random())]);

export const actions = weighted([
  [4, workflow],
  [3, framedTarget],
  [3, exploration]
]);
