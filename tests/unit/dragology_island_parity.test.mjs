import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_LAB_DRAG_SPEC,
  DEFAULT_LAB_SNAPSHOT,
  DRAG_SPEC_IR_SCHEMA_VERSION,
  createAtom,
  previewDragSpec,
  projectDragSpecToZx,
} from '../../js/harness/pkc-dragology-preview.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('PKC-06 LandingPage Dragology preview parity across pointer, keyboard, and touch', () => {
  const ir = {
    schemaVersion: DRAG_SPEC_IR_SCHEMA_VERSION,
    specId: 'parity-spec',
    inputPortType: 'position',
    outputPortType: 'position',
    unit: 'px',
    root: {
      op: 'chain',
      id: 'c-root',
      steps: [
        {
          op: 'guard',
          id: 'g-mode',
          predicate: { kind: 'eq', field: 'mode', value: 'active' },
          child: {
            op: 'whenFar',
            id: 'wf-1',
            anchor: 500,
            threshold: 400,
            near: DEFAULT_LAB_DRAG_SPEC.root,
            far: {
              op: 'coproduct',
              id: 'cp-1',
              branches: [
                { op: 'between', id: 'bw-fallback', min: 100, max: 900, targetId: 'slot-tablet', clamp: true },
              ],
            },
          },
        },
        {
          op: 'product',
          id: 'pr-1',
          factors: [
            { op: 'between', id: 'bw-clamp', min: 0, max: 1400, targetId: 'slot-tablet', clamp: true },
            { op: 'vary', id: 'v-snap', parameter: 'snapCoord', targetId: 'slot-tablet', step: 16 },
          ],
        },
      ],
    },
  };

  const ptr = previewDragSpec(ir, DEFAULT_LAB_SNAPSHOT, { pointerCoord: 760, params: { mode: 'active', snapCoord: 760 }, modality: 'pointer' });
  const kbd = previewDragSpec(ir, DEFAULT_LAB_SNAPSHOT, { pointerCoord: 760, params: { mode: 'active', snapCoord: 760 }, modality: 'keyboard' });
  const tch = previewDragSpec(ir, DEFAULT_LAB_SNAPSHOT, { pointerCoord: 760, params: { mode: 'active', snapCoord: 760 }, modality: 'touch' });

  assert.equal(ptr.state, 'candidate');
  assert.equal(ptr.targetId, 'slot-tablet');
  assert.deepEqual(kbd.candidateIntent.payload, ptr.candidateIntent.payload);
  assert.deepEqual(tch.candidateIntent.payload, ptr.candidateIntent.payload);

  // Tie detection -> ambiguous
  const tied = previewDragSpec(
    {
      schemaVersion: DRAG_SPEC_IR_SCHEMA_VERSION,
      specId: 'tie-spec',
      inputPortType: 'position',
      outputPortType: 'position',
      unit: 'px',
      root: {
        op: 'closest',
        id: 'tie',
        candidates: [
          { targetId: 'a', position: 0 },
          { targetId: 'b', position: 100 },
        ],
      },
    },
    DEFAULT_LAB_SNAPSHOT,
    { pointerCoord: 50 },
  );
  assert.equal(tied.state, 'ambiguous');

  // Blocked affordance
  const blocked = previewDragSpec(DEFAULT_LAB_DRAG_SPEC, { ...DEFAULT_LAB_SNAPSHOT, affordanceIds: [] }, { pointerCoord: 320 });
  assert.equal(blocked.state, 'blocked');

  // Stale snapshot cancellation & budget exhaustion
  const cancelled = previewDragSpec(DEFAULT_LAB_DRAG_SPEC, DEFAULT_LAB_SNAPSHOT, { initialSnapshotVersion: 99 });
  assert.equal(cancelled.state, 'cancelled');
  const budgeted = previewDragSpec(ir, DEFAULT_LAB_SNAPSHOT, { pointerCoord: 760, params: { mode: 'active' } }, { maxOps: 1 });
  assert.equal(budgeted.state, 'blocked');
  assert.equal(budgeted.reason, 'budget_exceeded');

  // Read-only ZX diagram projection & Atom subscription cleanup
  const zx = projectDragSpecToZx(ir, 'candidate');
  assert.equal(zx.readOnly, true);
  assert.equal(zx.equivalenceLawsAsserted, false);
  assert.ok(zx.spiders.length >= 4);

  const atom = createAtom(0);
  const seen = [];
  const unsub = atom.subscribe((v) => seen.push(v));
  atom.set(1);
  unsub();
  atom.set(2);
  assert.deepEqual(seen, [0, 1]);
});

test('PkcCardIsland uses <pkc-card> and preact/hooks with zero React, ws, fetch, or clm-kernel imports', () => {
  const src = fs.readFileSync(path.join(REPO_ROOT, 'src/islands/PkcCardIsland.jsx'), 'utf8');
  assert.ok(src.includes('<pkc-card'), 'PkcCardIsland must render <pkc-card>');
  assert.ok(src.includes("from 'preact/hooks'"), 'PkcCardIsland must use preact/hooks');
  assert.equal(/\bfrom\s+['"](?:react|react-dom|ws|clm-kernel)/.test(src), false);
  assert.equal(/\bfetch\s*\(/.test(src), false);
});
