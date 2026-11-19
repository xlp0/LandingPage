import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadModelWithNet } from '../src/model.ts';
import {
  adaptJsonlToTrace,
  parseTraceCard,
  readTraceCardFile,
  serializeTraceCard,
  writeTraceCardFile,
} from '../src/trace.ts';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, '../../../..');
const MONOREPO_SPA_MODEL = path.join(REPO_ROOT, 'schema/bmb/examples/ui-model.spa-target.json');
const SPA_MODEL_PATH = fs.existsSync(MONOREPO_SPA_MODEL)
  ? MONOREPO_SPA_MODEL
  : path.join(TEST_DIR, 'fixtures/ui-model.spa-target.json');
const SPA_TRACE_FIXTURE = path.join(TEST_DIR, 'fixtures/spa-target.trace.jsonl');
const RECORDER_TRACE_FIXTURE = path.join(TEST_DIR, 'fixtures/recorder.trace.jsonl');

describe('BMB-04 trace adapter round trip', () => {
  it('roundtrip: probe trace and terminal trace survive read-write-read cycle with deep equality and reject fractional clocks or non-object lines', () => {
    const { model, modelHash } = loadModelWithNet(SPA_MODEL_PATH);
    const probeJsonl = fs.readFileSync(SPA_TRACE_FIXTURE, 'utf8');
    const card = adaptJsonlToTrace(probeJsonl, model, { modelHash, seed: 7 });
    expect(card.observations.length).toBeGreaterThan(10);
    expect(card.observations[0].t_ms).toBe(0);
    expect(card.observations[0].action).toBeNull();
    expect(card.observations[1].action).not.toBeNull();

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bmb-04-rt-'));
    const outPath = path.join(tmpDir, 'spa.trace.json');
    writeTraceCardFile(outPath, card);
    const reloaded = readTraceCardFile(outPath);
    expect(reloaded).toEqual(card);

    const terminalJsonl = fs.readFileSync(RECORDER_TRACE_FIXTURE, 'utf8');
    const termCard = adaptJsonlToTrace(terminalJsonl, model, { modelHash, seed: 'term-1' });
    expect(parseTraceCard(serializeTraceCard(termCard))).toEqual(termCard);

    const fractional = `${JSON.stringify({ timestamp: 100, values: { place: 'p_spa_overview' } })}\n${JSON.stringify({ timestamp: 105.5, values: { place: 'p_spa_details' } })}\n`;
    expect(() => adaptJsonlToTrace(fractional, model, { modelHash })).toThrow(/line 2:.*fractional/i);

    const nonObject = `${JSON.stringify({ timestamp: 100, values: { place: 'p_spa_overview' } })}\n["not","an","object"]\n`;
    expect(() => adaptJsonlToTrace(nonObject, model, { modelHash })).toThrow(/line 2:.*object/i);
  });

  it('absent: a missing projection key produces a step carrying null and the key name without dropping the step', () => {
    const { model, modelHash } = loadModelWithNet(SPA_MODEL_PATH);
    const lines = [
      JSON.stringify({
        timestamp: 1000,
        action: null,
        snapshots: [{ index: 0, name: 'spa', value: { place: 'p_spa_overview', count: 0 } }],
      }),
      JSON.stringify({
        timestamp: 1050,
        action: 'Reload',
        snapshots: [{ index: 0, name: 'spa', value: { count: 1 } }],
      }),
      JSON.stringify({
        timestamp: 1100,
        action: { Click: { id: 'btn' } },
        snapshots: [{ index: 0, name: 'spa', value: { place: 'p_spa_details', count: 2 } }],
      }),
    ].join('\n');

    const card = adaptJsonlToTrace(lines, model, { modelHash });
    expect(card.observations).toHaveLength(3);
    expect(card.observations[1].step).toBe(1);
    expect(card.observations[1].values.place).toBeNull();
    expect(card.observations[1].values.count).toBe(1);
    expect(card.observations[1].absent_keys).toEqual(['place']);
    expect(card.observations[1].action).toEqual({ kind: 'Reload', index: 0 });
    expect(card.observations[2].action).toEqual({ kind: 'Click', index: 1 });
  });

  it('order: observation order is preserved when two steps share a timestamp', () => {
    const { model, modelHash } = loadModelWithNet(SPA_MODEL_PATH);
    const lines = [
      JSON.stringify({
        timestamp: 5000,
        action: null,
        snapshots: [{ name: 'spa', value: { place: 'p_spa_overview', marker: 'first' } }],
      }),
      JSON.stringify({
        timestamp: 5000,
        action: 'Back',
        snapshots: [{ name: 'spa', value: { place: 'p_spa_details', marker: 'second' } }],
      }),
      JSON.stringify({
        timestamp: 5000,
        action: 'Forward',
        snapshots: [{ name: 'spa', value: { place: 'p_spa_overview', marker: 'third' } }],
      }),
    ].join('\n');

    const card = adaptJsonlToTrace(lines, model, { modelHash });
    expect(card.observations.map((o) => o.step)).toEqual([0, 1, 2]);
    expect(card.observations.map((o) => o.t_ms)).toEqual([0, 0, 0]);
    expect(card.observations.map((o) => o.values.marker)).toEqual(['first', 'second', 'third']);
  });

  it('terminal: a terminal trace keeps every grid, scrollback, cursor, and exitStatus field through the round trip', () => {
    const { model, modelHash } = loadModelWithNet(SPA_MODEL_PATH);
    const terminalJsonl = fs.readFileSync(RECORDER_TRACE_FIXTURE, 'utf8');
    const card = adaptJsonlToTrace(terminalJsonl, model, { modelHash });
    const roundTripped = parseTraceCard(serializeTraceCard(card));

    expect(roundTripped.observations).toHaveLength(3);
    for (const obs of roundTripped.observations) {
      expect(Object.keys(obs.values)).toEqual(
        expect.arrayContaining(['grid', 'scrollback', 'cursor', 'exitStatus']),
      );
      const grid = obs.values.grid as { rows: number; cols: number; cells: string[][]; attributes: Record<string, string> };
      expect(Object.keys(grid).sort()).toEqual(['attributes', 'cells', 'cols', 'rows']);
      expect(grid.rows).toBe(4);
      expect(grid.cols).toBe(24);
      expect(grid.cells).toHaveLength(4);
    }
    expect(roundTripped.observations[0].values.exitStatus).toBeNull();
    expect(roundTripped.observations[2].values.exitStatus).toBe(0);
    expect(roundTripped.observations[2].absent_keys).toEqual([]);
  });
});
