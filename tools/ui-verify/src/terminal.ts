export const TERMINAL_PROJECTION_KEYS = ['grid', 'scrollback', 'cursor', 'exitStatus'] as const;

export type TerminalProjectionKey = (typeof TERMINAL_PROJECTION_KEYS)[number];

export interface TerminalGrid {
  rows: number;
  cols: number;
  cells: string[][];
  attributes?: Record<string, unknown>;
}

export interface TerminalCursor {
  row: number;
  col: number;
  visible: boolean;
}

export interface TerminalSnapshot {
  grid?: TerminalGrid | null;
  scrollback?: string[] | null;
  cursor?: TerminalCursor | null;
  exitStatus?: number | null;
  [key: string]: unknown;
}

export function isTerminalTraceRecord(record: Record<string, unknown>): boolean {
  if (record.terminal && typeof record.terminal === 'object' && !Array.isArray(record.terminal)) {
    return true;
  }
  if (TERMINAL_PROJECTION_KEYS.some((key) => key in record)) {
    return true;
  }
  if (Array.isArray(record.snapshots)) {
    return record.snapshots.some(
      (snap) =>
        snap &&
        typeof snap === 'object' &&
        ((snap as Record<string, unknown>).name === 'terminal' ||
          TERMINAL_PROJECTION_KEYS.includes((snap as Record<string, unknown>).name as TerminalProjectionKey)),
    );
  }
  return false;
}

export function projectTerminalObservation(
  record: Record<string, unknown>,
  extraRequiredKeys: readonly string[] = [],
): { values: Record<string, unknown>; absent_keys: string[] } {
  const source: Record<string, unknown> = {};

  if (Array.isArray(record.snapshots)) {
    for (const rawSnap of record.snapshots) {
      if (!rawSnap || typeof rawSnap !== 'object') continue;
      const snap = rawSnap as Record<string, unknown>;
      if (snap.name === 'terminal' && snap.value && typeof snap.value === 'object' && !Array.isArray(snap.value)) {
        Object.assign(source, snap.value as Record<string, unknown>);
      } else if (typeof snap.name === 'string' && TERMINAL_PROJECTION_KEYS.includes(snap.name as TerminalProjectionKey)) {
        source[snap.name] = snap.value;
      }
    }
  }

  if (record.terminal && typeof record.terminal === 'object' && !Array.isArray(record.terminal)) {
    Object.assign(source, record.terminal as Record<string, unknown>);
  }

  for (const key of TERMINAL_PROJECTION_KEYS) {
    if (key in record && !(key in source)) {
      source[key] = record[key];
    }
  }
  for (const key of extraRequiredKeys) {
    if (key in record && !(key in source)) {
      source[key] = record[key];
    }
  }

  const values: Record<string, unknown> = {};
  const absentSet = new Set<string>();

  for (const [k, v] of Object.entries(source)) {
    if (v !== undefined) {
      values[k] = structuredClone(v);
    }
  }

  const keysToCheck = [...TERMINAL_PROJECTION_KEYS, ...extraRequiredKeys];
  for (const key of keysToCheck) {
    if (!(key in values) || values[key] === undefined) {
      values[key] = null;
      absentSet.add(key);
    }
  }

  return {
    values,
    absent_keys: [...absentSet],
  };
}
