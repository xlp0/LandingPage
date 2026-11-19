import fs from 'node:fs';
import {
  type UiActionRecord,
  type UiEnginePin,
  type UiModelEnvelope,
  type UiObservation,
  type UiTraceEnvelope,
} from './model.ts';
import { isTerminalTraceRecord, projectTerminalObservation } from './terminal.ts';

const EPOCH_MICROSECOND_FLOOR = 1_000_000_000_000;

export interface AdaptTraceOptions {
  modelHash: string;
  seed?: number | string | null;
  engine?: UiEnginePin;
}

function parseClockValue(record: Record<string, unknown>, lineNumber: number): { raw: number; unit: 'ms' | 'us' } {
  if ('t_ms' in record) {
    const val = record.t_ms;
    if (typeof val !== 'number' || !Number.isFinite(val) || !Number.isInteger(val)) {
      throw new Error(`line ${lineNumber}: fractional or non-integer t_ms (${String(val)})`);
    }
    return { raw: val, unit: 'ms' };
  }
  if ('timestamp' in record) {
    const val = record.timestamp;
    if (typeof val !== 'number' || !Number.isFinite(val) || !Number.isInteger(val)) {
      throw new Error(`line ${lineNumber}: fractional or non-integer timestamp (${String(val)})`);
    }
    return {
      raw: val,
      unit: Math.abs(val) >= EPOCH_MICROSECOND_FLOOR ? 'us' : 'ms',
    };
  }
  throw new Error(`line ${lineNumber}: missing timestamp or t_ms field`);
}

function extractAction(rawAction: unknown, actionOrdinal: number): UiActionRecord | null {
  if (rawAction === null || rawAction === undefined) {
    return null;
  }
  if (typeof rawAction === 'string' && rawAction.trim().length > 0) {
    return { kind: rawAction, index: actionOrdinal };
  }
  if (typeof rawAction === 'object' && !Array.isArray(rawAction)) {
    const rec = rawAction as Record<string, unknown>;
    if (typeof rec.kind === 'string' && typeof rec.index === 'number' && Number.isInteger(rec.index) && rec.index >= 0) {
      return { kind: rec.kind, index: rec.index };
    }
    const keys = Object.keys(rec);
    if (keys.length > 0) {
      const topKey = keys[0];
      if (topKey === 'Custom' && rec.Custom && typeof rec.Custom === 'object') {
        const customName = (rec.Custom as Record<string, unknown>).name;
        if (typeof customName === 'string' && customName.trim().length > 0) {
          return { kind: `Custom:${customName}`, index: actionOrdinal };
        }
      }
      return { kind: topKey, index: actionOrdinal };
    }
  }
  return { kind: String(rawAction), index: actionOrdinal };
}

function projectBrowserObservation(
  record: Record<string, unknown>,
  model: UiModelEnvelope,
): { values: Record<string, unknown>; absent_keys: string[] } {
  const ns = model.projection.extractor_namespace;
  const requiredKeys =
    model.projection.mode === 'multiset' ? ['tokens'] : [model.projection.place_key];

  let extracted: Record<string, unknown> | null = null;

  if (Array.isArray(record.snapshots)) {
    for (const rawSnap of record.snapshots) {
      if (!rawSnap || typeof rawSnap !== 'object') continue;
      const snap = rawSnap as Record<string, unknown>;
      if (snap.name === ns) {
        if (snap.value && typeof snap.value === 'object' && !Array.isArray(snap.value)) {
          extracted = snap.value as Record<string, unknown>;
        } else {
          extracted = {};
        }
        break;
      }
    }
  }

  if (extracted === null) {
    if (record.values && typeof record.values === 'object' && !Array.isArray(record.values)) {
      extracted = record.values as Record<string, unknown>;
    } else if (record.projection && typeof record.projection === 'object' && !Array.isArray(record.projection)) {
      extracted = record.projection as Record<string, unknown>;
    } else {
      extracted = {};
    }
  }

  const values: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(extracted)) {
    if (v !== undefined) {
      values[k] = structuredClone(v);
    }
  }

  const absent_keys: string[] = [];
  for (const reqKey of requiredKeys) {
    if (!(reqKey in values) || values[reqKey] === null || values[reqKey] === undefined) {
      values[reqKey] = null;
      absent_keys.push(reqKey);
    }
  }

  return { values, absent_keys };
}

export function adaptJsonlToTrace(
  jsonlContent: string,
  model: UiModelEnvelope,
  options: AdaptTraceOptions,
): UiTraceEnvelope {
  const rawLines = jsonlContent.split('\n').map((line) => (line.endsWith('\r') ? line.slice(0, -1) : line));
  if (rawLines.length > 0 && rawLines[rawLines.length - 1] === '') {
    rawLines.pop();
  }

  const observations: UiObservation[] = [];
  let baseClock: { raw: number; unit: 'ms' | 'us' } | null = null;
  let actionCount = 0;

  const extraRequired =
    model.projection.mode === 'multiset' ? ['tokens'] : [model.projection.place_key];

  for (let i = 0; i < rawLines.length; i += 1) {
    const lineNumber = i + 1;
    const rawLine = rawLines[i];
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawLine);
    } catch (err) {
      throw new Error(`line ${lineNumber}: invalid JSON (${(err as Error).message})`);
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`line ${lineNumber}: expected a JSON object`);
    }

    const record = parsed as Record<string, unknown>;
    const clock = parseClockValue(record, lineNumber);
    if (baseClock === null) {
      baseClock = clock;
    }

    const deltaRaw = clock.raw - baseClock.raw;
    const offsetMs = clock.unit === 'us' ? Math.trunc(deltaRaw / 1000) : deltaRaw;
    const t_ms = offsetMs < 0 ? 0 : offsetMs;

    const projected = isTerminalTraceRecord(record)
      ? projectTerminalObservation(record, extraRequired.filter((k) => k in record))
      : projectBrowserObservation(record, model);

    const action = extractAction(record.action, actionCount);
    if (action !== null) {
      actionCount += 1;
    }

    observations.push({
      step: i,
      t_ms,
      values: projected.values,
      absent_keys: projected.absent_keys,
      action,
    });
  }

  return {
    schema: 'urn:clm:ui-trace:v1',
    kind: 'ui_trace_mcard',
    model_hash: options.modelHash,
    engine: options.engine ?? structuredClone(model.engine),
    seed: options.seed ?? null,
    observations,
  };
}

export function serializeTraceCard(card: UiTraceEnvelope): string {
  return `${JSON.stringify(card, null, 2)}\n`;
}

export function parseTraceCard(jsonText: string): UiTraceEnvelope {
  const parsed = JSON.parse(jsonText) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('invalid_trace_card: expected object');
  }
  const doc = parsed as Record<string, unknown>;
  if (doc.schema !== 'urn:clm:ui-trace:v1' || doc.kind !== 'ui_trace_mcard') {
    throw new Error('invalid_trace_card: unexpected schema or kind');
  }
  if (typeof doc.model_hash !== 'string' || !/^blake3:[0-9a-f]{64}$/.test(doc.model_hash)) {
    throw new Error('invalid_trace_card: invalid model_hash');
  }
  if (!Array.isArray(doc.observations)) {
    throw new Error('invalid_trace_card: observations must be an array');
  }
  for (let idx = 0; idx < doc.observations.length; idx += 1) {
    const obs = doc.observations[idx] as Record<string, unknown>;
    if (!obs || typeof obs !== 'object' || Array.isArray(obs)) {
      throw new Error(`invalid_trace_card: observation[${idx}] must be an object`);
    }
    if (typeof obs.step !== 'number' || !Number.isInteger(obs.step) || obs.step < 0) {
      throw new Error(`invalid_trace_card: observation[${idx}].step must be a non-negative integer`);
    }
    if (typeof obs.t_ms !== 'number' || !Number.isInteger(obs.t_ms) || obs.t_ms < 0) {
      throw new Error(`invalid_trace_card: observation[${idx}].t_ms must be a non-negative integer`);
    }
    if (!obs.values || typeof obs.values !== 'object' || Array.isArray(obs.values)) {
      throw new Error(`invalid_trace_card: observation[${idx}].values must be an object`);
    }
    if (!Array.isArray(obs.absent_keys)) {
      throw new Error(`invalid_trace_card: observation[${idx}].absent_keys must be an array`);
    }
  }
  return doc as unknown as UiTraceEnvelope;
}

export function writeTraceCardFile(outPath: string, card: UiTraceEnvelope): void {
  fs.writeFileSync(outPath, serializeTraceCard(card), 'utf8');
}

export function readTraceCardFile(inPath: string): UiTraceEnvelope {
  return parseTraceCard(fs.readFileSync(inPath, 'utf8'));
}
