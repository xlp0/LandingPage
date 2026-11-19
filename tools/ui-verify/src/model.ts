import fs from 'node:fs';
import path from 'node:path';
import { ContentHash } from 'clm-kernel/primitives';

export const CLOSED_TEMPLATES = [
  'always_point',
  'always_arc',
  'eventually_fire',
  'now_next',
  'init',
] as const;

export type PropertyTemplate = (typeof CLOSED_TEMPLATES)[number];

export interface UiPropertySpec {
  id: string;
  template: PropertyTemplate;
  subject: string;
  target_place?: string;
  severity: 'error' | 'warning';
  within_s: number;
}

export interface UiActionBinding {
  generator_key: string;
  weight: number;
}

export interface UiProjectionSpec {
  mode: 'single' | 'multiset';
  extractor_namespace: string;
  place_key: string;
  token_key?: string;
  places: Record<string, string>;
}

export interface UiCoverageSpec {
  declared_unreachable: string[];
  required: string[];
}

export interface UiEnginePin {
  name: string;
  version: string;
  time_budget_s: number;
}

export interface UiModelEnvelope {
  schema: 'urn:clm:ui-model:v1';
  kind: 'ui_model_mcard';
  model_id: string;
  net_ref: string;
  projection: UiProjectionSpec;
  properties: UiPropertySpec[];
  actions: Record<string, UiActionBinding>;
  coverage: UiCoverageSpec;
  engine: UiEnginePin;
}

export interface NetMCardEnvelope {
  kind: 'net_mcard';
  net_id: string;
  places: Array<{ place_id: string; role?: string; type_expr?: string; capacity?: number | null; hash?: string }>;
  transitions: Array<{
    transition_id: string;
    input_places: string[];
    output_places: string[];
    hash?: string;
  }>;
  marking: Record<string, unknown[]>;
}

export interface UiActionRecord {
  kind: string;
  index: number;
}

export interface UiObservation {
  step: number;
  t_ms: number;
  values: Record<string, unknown>;
  absent_keys: string[];
  action: UiActionRecord | null;
}

export interface UiTraceEnvelope {
  schema: 'urn:clm:ui-trace:v1';
  kind: 'ui_trace_mcard';
  model_hash: string;
  engine: UiEnginePin;
  seed: number | string | null;
  observations: UiObservation[];
}

export interface UiVerdictEnvelope {
  schema: 'urn:clm:ui-verdict:v1';
  kind: 'ui_verdict_mcard';
  verdict: 'CONFORMANT' | 'NONCONFORMANT' | 'MODEL_DEFECT' | 'INCONCLUSIVE';
  reason: string;
  model_hash: string;
  net_hash: string;
  trace_hash: string;
  engine: UiEnginePin;
  step_count: number;
  move_count: number;
  receipt_hashes: string[];
  first_violation_step: number | null;
  counterexample: Record<string, unknown> | null;
  coverage: Record<string, unknown> | null;
  replay_hash: string | null;
}

export interface UiReplayJobEnvelope {
  schema: 'urn:clm:ui-replay-job:v1';
  kind: 'ui_replay_job';
  job_hash: string;
  model_hash: string;
  trace_hash: string;
  expected_verdict_hash: string;
  engine_version: string;
  comparison_policy: 'exact_verdict' | 'first_violation_step';
  action_count: number;
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
}

export function blake3Qualified(payload: unknown): string {
  const bytes = new TextEncoder().encode(canonicalJson(payload));
  return ContentHash.compute(bytes).asPrefixed();
}

export function computeModelHash(model: UiModelEnvelope, netHash = model.net_ref): string {
  const normalized = JSON.parse(canonicalJson(model)) as UiModelEnvelope;
  return blake3Qualified({ model: normalized, net_hash: netHash });
}

export function isClosedTemplate(template: string): template is PropertyTemplate {
  return (CLOSED_TEMPLATES as readonly string[]).includes(template);
}

export function parseUiModel(raw: unknown): UiModelEnvelope {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('invalid_envelope: model must be an object');
  }
  const doc = raw as Record<string, unknown>;
  if (doc.schema !== 'urn:clm:ui-model:v1' || doc.kind !== 'ui_model_mcard') {
    throw new Error('invalid_envelope: unexpected schema or kind');
  }
  if (typeof doc.model_id !== 'string' || !doc.model_id.trim()) {
    throw new Error('invalid_envelope: model_id required');
  }
  if (typeof doc.net_ref !== 'string' || !/^blake3:[0-9a-f]{64}$/.test(doc.net_ref)) {
    throw new Error('missing_net: valid blake3 net_ref required');
  }
  const engine = doc.engine as Record<string, unknown> | undefined;
  if (
    !engine ||
    typeof engine.name !== 'string' ||
    !engine.name.trim() ||
    typeof engine.version !== 'string' ||
    !engine.version.trim() ||
    typeof engine.time_budget_s !== 'number' ||
    !Number.isInteger(engine.time_budget_s) ||
    engine.time_budget_s < 1
  ) {
    throw new Error('missing_engine_pin: engine name, version, and positive time_budget_s required');
  }
  const props = doc.properties;
  if (!Array.isArray(props) || props.length === 0) {
    throw new Error('invalid_envelope: properties must be non-empty');
  }
  for (const item of props) {
    const p = item as Record<string, unknown>;
    if (typeof p?.template !== 'string' || !isClosedTemplate(p.template)) {
      throw new Error(`unknown_template: ${String(p?.template)}`);
    }
  }
  return doc as unknown as UiModelEnvelope;
}

export function companionNetPath(modelPath: string): string {
  const ext = path.extname(modelPath);
  const stem = path.basename(modelPath, ext);
  return path.join(path.dirname(modelPath), `${stem}.net${ext}`);
}

export function loadModelWithNet(
  modelPath: string,
  netPath?: string,
): { model: UiModelEnvelope; net: NetMCardEnvelope; modelHash: string; netHash: string } {
  const resolvedModelPath = path.resolve(modelPath);
  const resolvedNetPath = path.resolve(netPath ?? companionNetPath(resolvedModelPath));
  const rawModel = JSON.parse(fs.readFileSync(resolvedModelPath, 'utf8'));
  const model = parseUiModel(rawModel);
  const net = JSON.parse(fs.readFileSync(resolvedNetPath, 'utf8')) as NetMCardEnvelope;
  const netHash = blake3Qualified(net);
  if (netHash !== model.net_ref) {
    throw new Error(`net_hash_mismatch: model expects ${model.net_ref}, net hashes to ${netHash}`);
  }
  const modelHash = computeModelHash(model, netHash);
  return { model, net, modelHash, netHash };
}
