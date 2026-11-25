/**
 * LandingPage Headless Dragology Preview & Read-Only ZX Projection (PKC-06 / DoD-PKC-06-03).
 *
 * Pure zero-DOM ES module: ZERO React, ZERO DOM APIs, ZERO ws, ZERO clm-kernel.
 */

export const DRAG_SPEC_IR_SCHEMA_VERSION = 'pkc.drag-spec-ir.v1';

export function createAtom(initialValue) {
  let value = initialValue;
  const listeners = new Set();
  return {
    get() {
      return value;
    },
    set(nextValue) {
      value = nextValue;
      for (const listener of listeners) listener(value);
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(value);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

function evalPredicate(pred, params) {
  const actual = params?.[pred.field];
  if (actual === undefined) return false;
  switch (pred.kind) {
    case 'eq': return actual === pred.value;
    case 'gte': return typeof actual === 'number' && typeof pred.value === 'number' && actual >= pred.value;
    case 'lte': return typeof actual === 'number' && typeof pred.value === 'number' && actual <= pred.value;
    case 'in': return Array.isArray(pred.value) && pred.value.includes(actual);
    default: return false;
  }
}

function evalNode(node, snapshot, input, st) {
  if (++st.ops > st.maxOps) {
    st.blockedReason = 'budget_exceeded';
    return null;
  }
  st.trace.push(`${node.op}:${node.id}`);
  const coord = input.pointerCoord ?? 0;

  switch (node.op) {
    case 'closest': {
      const available = (node.candidates || []).filter((c) => !c.affordanceId || snapshot.affordanceIds.includes(c.affordanceId));
      if (available.length === 0) {
        st.blockedReason = 'affordance_unavailable';
        return null;
      }
      if (input.selectedTargetId) {
        const chosen = available.find((c) => c.targetId === input.selectedTargetId);
        if (!chosen) {
          st.blockedReason = 'affordance_unavailable';
          return null;
        }
        return { targetId: chosen.targetId, value: chosen.position };
      }
      const ranked = available
        .map((c) => ({ c, dist: Math.abs(c.position - coord) }))
        .sort((a, b) => (a.dist !== b.dist ? a.dist - b.dist : a.c.targetId.localeCompare(b.c.targetId)));
      if (ranked.length > 1 && Math.abs(ranked[0].dist - ranked[1].dist) < 1e-9) {
        st.ambiguousReason = `tie_ambiguous:${ranked[0].c.targetId},${ranked[1].c.targetId}`;
        return null;
      }
      return { targetId: ranked[0].c.targetId, value: ranked[0].c.position };
    }
    case 'between': {
      if (node.affordanceId && !snapshot.affordanceIds.includes(node.affordanceId)) {
        st.blockedReason = 'affordance_unavailable';
        return null;
      }
      const val = node.clamp === false ? coord : Math.min(node.max, Math.max(node.min, coord));
      return { targetId: node.targetId, value: val };
    }
    case 'vary': {
      const raw = input.params?.[node.parameter];
      const num = typeof raw === 'number' && Number.isFinite(raw) ? raw : coord;
      const val = node.step ? Math.round(num / node.step) * node.step : num;
      return { targetId: node.targetId, value: val };
    }
    case 'whenFar': {
      const branch = Math.abs(coord - node.anchor) > node.threshold ? node.far : node.near;
      return evalNode(branch, snapshot, input, st);
    }
    case 'guard': {
      if (!evalPredicate(node.predicate, input.params ?? {})) {
        st.blockedReason = `guard_rejected:${node.id}`;
        return null;
      }
      return evalNode(node.child, snapshot, input, st);
    }
    case 'chain': {
      let current = null;
      for (const step of node.steps || []) {
        current = evalNode(step, snapshot, { ...input, ...(current?.value !== undefined ? { pointerCoord: current.value } : {}) }, st);
        if (!current) return null;
      }
      return current;
    }
    case 'coproduct': {
      for (const branch of node.branches || []) {
        const sub = { ops: st.ops, maxOps: st.maxOps, trace: st.trace };
        const res = evalNode(branch, snapshot, input, sub);
        st.ops = sub.ops;
        if (st.ops > st.maxOps) {
          st.blockedReason = 'budget_exceeded';
          return null;
        }
        if (sub.ambiguousReason) {
          st.ambiguousReason = sub.ambiguousReason;
          return null;
        }
        if (res) return res;
      }
      st.blockedReason = 'coproduct_all_blocked';
      return null;
    }
    case 'product': {
      let last = null;
      for (const factor of node.factors || []) {
        const res = evalNode(factor, snapshot, input, st);
        if (!res) return null;
        last = { ...(last ?? {}), ...res };
      }
      return last;
    }
    default:
      st.blockedReason = `unknown_op:${node.op}`;
      return null;
  }
}

export function previewDragSpec(ir, snapshot, input = {}, options = {}) {
  if (!ir || ir.schemaVersion !== DRAG_SPEC_IR_SCHEMA_VERSION || !ir.root) {
    return { state: 'blocked', opsUsed: 0, reason: 'invalid_drag_spec', trace: [] };
  }
  if (input.cancelled || (input.initialSnapshotVersion !== undefined && input.initialSnapshotVersion !== snapshot.snapshotVersion)) {
    return {
      state: 'cancelled',
      opsUsed: 0,
      snapshotVersion: snapshot.snapshotVersion,
      policyDigest: snapshot.policyDigest,
      reason: input.cancelled ? 'cancelled' : 'stale_snapshot',
      trace: [],
    };
  }
  const st = { ops: 0, maxOps: Math.max(1, options.maxOps ?? 64), trace: [] };
  const out = evalNode(ir.root, snapshot, input, st);
  if (st.ambiguousReason) {
    return {
      state: 'ambiguous',
      opsUsed: st.ops,
      snapshotVersion: snapshot.snapshotVersion,
      policyDigest: snapshot.policyDigest,
      reason: st.ambiguousReason,
      trace: st.trace,
    };
  }
  if (!out || !out.targetId) {
    return {
      state: 'blocked',
      opsUsed: st.ops,
      snapshotVersion: snapshot.snapshotVersion,
      policyDigest: snapshot.policyDigest,
      reason: st.blockedReason ?? 'blocked',
      trace: st.trace,
    };
  }
  const modality = input.modality ?? 'pointer';
  return {
    state: 'candidate',
    opsUsed: st.ops,
    snapshotVersion: snapshot.snapshotVersion,
    policyDigest: snapshot.policyDigest,
    targetId: out.targetId,
    value: out.value,
    candidateIntent: {
      intentId: input.intentId ?? `${ir.specId}:${snapshot.snapshotVersion}:${out.targetId}`,
      idempotencyKey: input.idempotencyKey ?? `${ir.specId}:${snapshot.snapshotVersion}:${out.targetId}:${out.value ?? 0}`,
      snapshotVersion: snapshot.snapshotVersion,
      policyDigest: snapshot.policyDigest,
      kind: 'drag.commit',
      targetId: out.targetId,
      portType: ir.outputPortType ?? 'position',
      payload: { specId: ir.specId, targetId: out.targetId, value: out.value ?? 0, unit: ir.unit ?? 'px' },
      inputModality: modality,
    },
    trace: st.trace,
  };
}

export function projectDragSpecToZx(ir, previewState = 'candidate') {
  const spiders = [{ id: 'in', kind: 'boundary', phase: ir.inputPortType ?? 'position', op: 'root' }];
  const wires = [];
  const childrenOf = (n) => {
    if (n.op === 'whenFar') return [n.near, n.far];
    if (n.op === 'guard') return [n.child];
    if (n.op === 'chain') return n.steps || [];
    if (n.op === 'coproduct') return n.branches || [];
    if (n.op === 'product') return n.factors || [];
    return [];
  };
  const visit = (node, parentId) => {
    const id = `zx:${node.id}`;
    spiders.push({
      id,
      kind: node.op === 'coproduct' || node.op === 'whenFar' || node.op === 'guard' ? 'X' : 'Z',
      phase: node.op,
      op: node.op,
    });
    wires.push({ from: parentId, to: id });
    for (const c of childrenOf(node)) visit(c, id);
    return id;
  };
  const lastId = ir?.root ? visit(ir.root, 'in') : 'in';
  spiders.push({ id: 'out', kind: 'boundary', phase: ir.outputPortType ?? 'position', op: 'root' });
  wires.push({ from: lastId, to: 'out' });
  return {
    diagramVersion: 'pkc.zx.v1',
    specId: ir?.specId ?? 'unknown',
    readOnly: true,
    equivalenceLawsAsserted: false,
    previewState,
    spiders,
    wires,
  };
}

export const DEFAULT_LAB_DRAG_SPEC = {
  schemaVersion: DRAG_SPEC_IR_SCHEMA_VERSION,
  specId: 'responsive-lab-slot',
  inputPortType: 'position',
  outputPortType: 'position',
  unit: 'px',
  root: {
    op: 'closest',
    id: 'lab-slots',
    candidates: [
      { targetId: 'slot-compact', position: 320, affordanceId: 'slot-compact' },
      { targetId: 'slot-tablet', position: 768, affordanceId: 'slot-tablet' },
      { targetId: 'slot-desktop', position: 1280, affordanceId: 'slot-desktop' },
    ],
  },
};

export const DEFAULT_LAB_SNAPSHOT = {
  snapshotVersion: 1,
  policyDigest: 'sha256:responsive-lab-pkc-card',
  ports: [{ id: 'primary', portType: 'position' }],
  affordanceIds: ['slot-compact', 'slot-tablet', 'slot-desktop'],
};
