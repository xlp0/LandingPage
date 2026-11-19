import {
  CLOSED_TEMPLATES,
  type NetMCardEnvelope,
  type PropertyTemplate,
  type UiModelEnvelope,
  type UiPropertySpec,
  computeModelHash,
  isClosedTemplate,
} from './model.ts';
import {
  resolveExtractorExpression,
  resolveGeneratorBinding,
  resolveNamespaceSelectors,
} from './extract.ts';

function formatSingleQuotedLiteral(raw: string): string {
  return raw.includes("'") ? JSON.stringify(raw) : `'${raw}'`;
}

export type TemplateEmitter = (prop: UiPropertySpec, ns: string) => string;

export const TEMPLATE_EMITTERS: Record<PropertyTemplate, TemplateEmitter> = {
  init: (prop, ns) =>
    `export const ${sanitizeIdent(prop.id)} = always(() => inInitialPlace(${ns}.current, ${JSON.stringify(prop.subject)}));`,
  always_point: (prop, ns) =>
    `export const ${sanitizeIdent(prop.id)} = always(() => inPlace(${ns}.current, ${JSON.stringify(prop.subject)}));`,
  always_arc: (prop, ns) =>
    `export const ${sanitizeIdent(prop.id)} = always(now(() => { const before = ${ns}.current; return next(() => moveFollowsArc(before, ${ns}.current, ${JSON.stringify(prop.subject)}, ${JSON.stringify(prop.target_place ?? null)})); }));`,
  now_next: (prop, ns) =>
    `export const ${sanitizeIdent(prop.id)} = always(now(() => { const before = ${ns}.current; return next(() => stepFollowsPair(before, ${ns}.current, ${JSON.stringify(prop.subject)}, ${JSON.stringify(prop.target_place ?? prop.subject)})); }));`,
  eventually_fire: (prop, ns) =>
    `export const ${sanitizeIdent(prop.id)} = eventually(() => fired(${ns}.current, ${JSON.stringify(prop.subject)})).within(${prop.within_s}, "seconds");`,
};

function sanitizeIdent(raw: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9_]/g, '_');
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `prop_${cleaned}`;
}

export function assertTemplateTableTotal(schemaTemplates: readonly string[]): void {
  for (const tmpl of schemaTemplates) {
    if (!(tmpl in TEMPLATE_EMITTERS)) {
      throw new Error(`missing_template_emitter: schema template "${tmpl}" has no emitter row`);
    }
  }
}

export function emitBombadilSpec(
  model: UiModelEnvelope,
  net: NetMCardEnvelope,
  options: { modelHash?: string; netHash?: string } = {},
): string {
  assertTemplateTableTotal(CLOSED_TEMPLATES);
  const netHash = options.netHash ?? model.net_ref;
  const modelHash = options.modelHash ?? computeModelHash(model, netHash);
  const ns = sanitizeIdent(model.projection.extractor_namespace);
  const { rootSelector, alertSelector } = resolveNamespaceSelectors(model.projection.extractor_namespace);
  const rootSelectorLiteral = formatSingleQuotedLiteral(rootSelector);
  const alertSelectorLiteral = formatSingleQuotedLiteral(alertSelector);

  const places = net.places.map((p) => p.place_id);
  const arcs = net.transitions.flatMap((tr) =>
    tr.input_places.flatMap((from) =>
      tr.output_places.map((to) => ({ transitionId: tr.transition_id, from, to })),
    ),
  );
  const coverageTransitions = net.transitions.map((tr) => tr.transition_id);

  const sortedProjEntries = Object.entries(model.projection.places).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  const rawExtractorLines = sortedProjEntries.map(
    ([placeId, extKey]) =>
      `const raw_${sanitizeIdent(placeId)} = extract((state) => ${resolveExtractorExpression(extKey)});`,
  );
  const primaryExpr = resolveExtractorExpression(sortedProjEntries[0][1]);

  const propertyLines = model.properties.map((prop) => {
    if (!isClosedTemplate(prop.template)) {
      throw new Error(`unknown_template: ${String(prop.template)}`);
    }
    return TEMPLATE_EMITTERS[prop.template](prop, ns);
  });

  const activeActions = Object.entries(model.actions)
    .filter(([, binding]) => binding.weight > 0)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  const actionRegLines: string[] = [];
  const weightedEntries: string[] = [];
  for (const [transitionId, binding] of activeActions) {
    const gen = resolveGeneratorBinding(transitionId, binding.generator_key);
    const fnVar = `act_${sanitizeIdent(transitionId)}`;
    actionRegLines.push(
      `const ${fnVar} = registerCustomAction(${JSON.stringify(gen.actionName)}, async (document) => {\n` +
        `  const el = document.querySelector(${JSON.stringify(gen.selector)}) as HTMLElement | null;\n` +
        `  if (el && !(el as HTMLButtonElement).disabled) el.click();\n` +
        `});`,
    );
    weightedEntries.push(`  [${binding.weight}, makeActions(() => [${fnVar}()])]`);
  }
  weightedEntries.push(`  [2, defaultActions]`);

  const spaCanaryExtra =
    model.model_id === 'spa-target'
      ? [
          '',
          'const HASH_TO_PLACE: Record<string, string> = {',
          '  "": "p_spa_overview",',
          '  "#overview": "p_spa_overview",',
          '  "#details": "p_spa_details",',
          '  "#missing-transition": "p_spa_missing_transition",',
          '};',
          '',
          `export const hashMatchesPlace = always(() => {`,
          `  const view = ${ns}.current;`,
          `  if (view === null || !view.nonce || !(view.hash in HASH_TO_PLACE)) return true;`,
          `  return HASH_TO_PLACE[view.hash] === view.place;`,
          `});`,
        ]
      : [];

  return [
    `// @generated by @mcard/ui-verify`,
    `// model_id: ${model.model_id}`,
    `// model_hash: ${modelHash}`,
    `// net_hash: ${netHash}`,
    `// bombadil_version: ${model.engine.version}`,
    ``,
    `import { always, eventually, extract, next, now } from "@antithesishq/bombadil";`,
    `import { actions as makeActions, registerCustomAction, weighted } from "@antithesishq/bombadil/browser";`,
    `import { defaultActions } from "@antithesishq/bombadil/browser/defaults";`,
    `import {`,
    `  noUncaughtExceptions,`,
    `  noUnhandledPromiseRejections,`,
    `} from "@antithesishq/bombadil/browser/defaults/properties";`,
    `import "./net-report.ts";`,
    `export { noUncaughtExceptions, noUnhandledPromiseRejections };`,
    ``,
    `const SPEC_METADATA = {`,
    `  modelId: ${JSON.stringify(model.model_id)},`,
    `  modelHash: ${JSON.stringify(modelHash)},`,
    `  netHash: ${JSON.stringify(netHash)},`,
    `  engineVersion: ${JSON.stringify(model.engine.version)},`,
    `  coverageDenominator: ${coverageTransitions.length},`,
    `  coverageTransitions: ${JSON.stringify(coverageTransitions)},`,
    `} as const;`,
    ``,
    `const EXPECTED_MODEL_HASH = (globalThis as { __UI_VERIFY_MODEL_HASH__?: string }).__UI_VERIFY_MODEL_HASH__;`,
    `if (EXPECTED_MODEL_HASH && EXPECTED_MODEL_HASH !== SPEC_METADATA.modelHash) {`,
    `  throw new Error(\`model_hash_mismatch: spec expects \${SPEC_METADATA.modelHash}, got \${EXPECTED_MODEL_HASH}\`);`,
    `}`,
    ``,
    `const PLACES: readonly string[] = ${JSON.stringify(places)};`,
    `const ARCS: readonly { transitionId: string; from: string; to: string }[] = ${JSON.stringify(arcs)};`,
    ``,
    ...rawExtractorLines,
    ``,
    `type SnapshotView = {`,
    `  place: string;`,
    `  count: number;`,
    `  nonce: string | null;`,
    `  hash: string;`,
    `  alert: boolean;`,
    `};`,
    ``,
    `const ${ns} = extract((state): SnapshotView | null => {`,
    `  const body = state.document.body;`,
    `  const root = state.document.querySelector(${rootSelectorLiteral});`,
    `  if (!body || !root) return null;`,
    `  return {`,
    `    place: (${primaryExpr}) || body.getAttribute("data-place-id") || "",`,
    `    count: Number(root.getAttribute("data-transition-count") ?? 0),`,
    `    nonce: body.getAttribute("data-boot-nonce"),`,
    `    hash: state.window.location.hash,`,
    `    alert: state.document.querySelector(${alertSelectorLiteral}) !== null,`,
    `  };`,
    `});`,
    ``,
    `function inInitialPlace(view: SnapshotView | null, expected: string): boolean {`,
    `  if (view === null || view.count > 0 || view.hash !== "") return true;`,
    `  return view.place === expected;`,
    `}`,
    ``,
    `function inPlace(view: SnapshotView | null, _anchor: string): boolean {`,
    `  return view === null || PLACES.includes(view.place);`,
    `}`,
    ``,
    `function moveFollowsArc(before: SnapshotView | null, after: SnapshotView | null, _subject: string, _targetPlace: string | null): boolean {`,
    `  if (before === null || after === null || before.nonce !== after.nonce || before.place === after.place) return true;`,
    `  return ARCS.some((arc) => arc.from === before.place && arc.to === after.place);`,
    `}`,
    ``,
    `function stepFollowsPair(before: SnapshotView | null, after: SnapshotView | null, fromPlace: string, targetPlace: string): boolean {`,
    `  if (before === null || after === null || before.nonce !== after.nonce) return true;`,
    `  if (before.place !== fromPlace || after.place === fromPlace) return true;`,
    `  return after.place === targetPlace;`,
    `}`,
    ``,
    `function fired(view: SnapshotView | null, transitionId: string): boolean {`,
    `  if (view === null) return false;`,
    `  const matching = ARCS.filter((arc) => arc.transitionId === transitionId);`,
    `  return view.count > 0 || matching.some((arc) => view.place === arc.to);`,
    `}`,
    ``,
    ...propertyLines,
    ...spaCanaryExtra,
    ``,
    ...actionRegLines,
    ``,
    `export const actions = weighted([`,
    weightedEntries.join(',\n'),
    `]);`,
    ``,
  ].join('\n');
}

export function extractBannerModelHash(specSource: string): string {
  const match = /^\/\/ model_hash:\s*(\S+)$/m.exec(specSource);
  if (!match) {
    throw new Error('missing_model_hash_banner');
  }
  return match[1];
}

export function assertSpecMatchesModel(
  specSource: string,
  model: UiModelEnvelope,
  netHash = model.net_ref,
): void {
  const bannerHash = extractBannerModelHash(specSource);
  const actualHash = computeModelHash(model, netHash);
  if (bannerHash !== actualHash) {
    throw new Error(`model_hash_mismatch: banner has ${bannerHash}, model hashes to ${actualHash}`);
  }
}
