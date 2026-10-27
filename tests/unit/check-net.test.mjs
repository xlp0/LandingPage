import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  loadNetEnvelope,
  validateNetEnvelope,
  validateExpressEndpointCoverage
} from '../../scripts/check-net.mjs';

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(CURRENT_DIR, '../..');
const WORKBENCH_NET_PATH = path.join(ROOT_DIR, 'src/net/workbench-net.yaml');
const SPA_FIXTURE_NET_PATH = path.join(ROOT_DIR, 'tests/fixtures/spa-test-target.graph.json');

test('GQC-02A-UNIT-01 parses workbench-net.yaml and spa-test-target.graph.json with one validator and verifies Express endpoint completeness', () => {
  const workbenchEnvelope = loadNetEnvelope(WORKBENCH_NET_PATH);
  const workbenchResult = validateNetEnvelope(workbenchEnvelope, {
    filePath: 'src/net/workbench-net.yaml',
    currentSprint: 'SPRINT-GQC-02A'
  });
  assert.deepEqual(workbenchResult.violations, []);
  assert.equal(workbenchResult.valid, true);
  assert.equal(workbenchResult.sessionInvariantHolds, true);
  assert.equal(workbenchResult.parsedTopology.places.length, 23);
  assert.equal(workbenchResult.parsedTopology.transitions.length, 45);

  const spaEnvelope = loadNetEnvelope(SPA_FIXTURE_NET_PATH);
  const spaResult = validateNetEnvelope(spaEnvelope, {
    filePath: 'tests/fixtures/spa-test-target.graph.json',
    currentSprint: 'SPRINT-GQC-02A'
  });
  assert.deepEqual(spaResult.violations, []);
  assert.equal(spaResult.valid, true);
  assert.equal(spaResult.sessionInvariantHolds, true);
  assert.equal(spaResult.parsedTopology.places.length, 3);
  assert.equal(spaResult.parsedTopology.transitions.length, 4);

  const endpointAudit = validateExpressEndpointCoverage(workbenchEnvelope, ROOT_DIR);
  assert.deepEqual(endpointAudit.violations, []);
  assert.equal(endpointAudit.valid, true);
  assert.ok(endpointAudit.mountedCount >= 29);
});

test('GQC-02A-UNIT-02 rejects duplicate Place IDs and duplicate Transition IDs with file, id, and rule', () => {
  const base = loadNetEnvelope(WORKBENCH_NET_PATH);

  const dupPlace = structuredClone(base);
  dupPlace.topology.places.push({
    id: 'p_page_responsive_lab',
    initialTokens: 0,
    description: 'Duplicate lab place'
  });
  const placeRes = validateNetEnvelope(dupPlace, { filePath: 'dup-place.yaml' });
  assert.equal(placeRes.valid, false);
  assert.ok(
    placeRes.violations.some(
      (v) =>
        v.file === 'dup-place.yaml' &&
        v.id === 'p_page_responsive_lab' &&
        v.rule === 'duplicate-place-id'
    )
  );

  const dupTransition = structuredClone(base);
  dupTransition.topology.transitions.push({
    id: 't_link_lab_to_app',
    inputs: ['p_page_responsive_lab'],
    outputs: ['p_page_app']
  });
  const transRes = validateNetEnvelope(dupTransition, { filePath: 'dup-transition.yaml' });
  assert.equal(transRes.valid, false);
  assert.ok(
    transRes.violations.some(
      (v) =>
        v.file === 'dup-transition.yaml' &&
        v.id === 't_link_lab_to_app' &&
        v.rule === 'duplicate-transition-id'
    )
  );
});

test('GQC-02A-UNIT-03 rejects a same-page call modeled as a self-loop Transition', () => {
  const env = structuredClone(loadNetEnvelope(WORKBENCH_NET_PATH));
  env.topology.transitions.push({
    id: 't_self_loop_call',
    inputs: ['p_page_responsive_lab'],
    outputs: ['p_page_responsive_lab']
  });
  env.bindings.transitions.t_self_loop_call = {
    kind: 'server-call-request',
    surface: 'workbench',
    linkId: 'self_loop_call',
    fromPlaceId: 'p_page_responsive_lab',
    toPlaceId: 'p_page_responsive_lab',
    httpMethod: 'GET',
    httpPath: '/api/self-loop',
    trigger: 'fetch("/api/self-loop")',
    ownerPage: 'responsive-lab.html',
    owner: 'TEA'
  };

  const res = validateNetEnvelope(env, { filePath: 'self-loop.yaml' });
  assert.equal(res.valid, false);
  assert.ok(
    res.violations.some(
      (v) =>
        v.file === 'self-loop.yaml' &&
        v.id === 't_self_loop_call' &&
        v.rule === 'self-loop-transition'
    )
  );
});

test('GQC-02A-UNIT-04 rejects a server-call-request whose pending Place has no result Transition', () => {
  const env = structuredClone(loadNetEnvelope(WORKBENCH_NET_PATH));
  env.topology.transitions = env.topology.transitions.filter(
    (t) => t.id !== 't_ok_post_test_runs' && t.id !== 't_fail_post_test_runs' && t.id !== 't_recover_post_test_runs'
  );
  delete env.bindings.transitions.t_ok_post_test_runs;
  delete env.bindings.transitions.t_fail_post_test_runs;
  delete env.bindings.transitions.t_recover_post_test_runs;
  env.topology.places = env.topology.places.filter((p) => p.id !== 'p_error_post_test_runs');
  delete env.bindings.places.p_error_post_test_runs;

  const res = validateNetEnvelope(env, { filePath: 'unmatched-pending.yaml' });
  assert.equal(res.valid, false);
  assert.ok(
    res.violations.some(
      (v) =>
        v.file === 'unmatched-pending.yaml' &&
        (v.id === 't_req_post_test_runs' || v.id === 'p_pending_post_test_runs') &&
        v.rule === 'unmatched-server-call-pending'
    )
  );
});

test('GQC-02A-UNIT-05 rejects unreachable page Places and never-enabled Transitions unless covered by an active exception', () => {
  const env = structuredClone(loadNetEnvelope(WORKBENCH_NET_PATH));
  env.topology.places.push({
    id: 'p_page_orphan',
    initialTokens: 0,
    description: 'Orphan page with no incoming transition and deepLinkEntry false'
  });
  env.bindings.places.p_page_orphan = {
    kind: 'page',
    surface: 'workbench',
    pageId: 'page_orphan',
    pagePath: 'orphan.html',
    route: '/orphan.html',
    routeAliases: [],
    routeHandle: 'mcard:route:/orphan.html',
    clmTypeUri: 'clm://type/view/workbench/orphan',
    mcardHash: null,
    migrationState: 'legacy-static',
    entry: false,
    deepLinkEntry: false,
    owner: 'TEA'
  };
  env.topology.transitions.push({
    id: 't_dead_from_orphan',
    inputs: ['p_page_orphan'],
    outputs: ['p_page_responsive_lab']
  });
  env.bindings.transitions.t_dead_from_orphan = {
    kind: 'link',
    surface: 'workbench',
    linkId: 'dead_from_orphan',
    fromPlaceId: 'p_page_orphan',
    toPlaceId: 'p_page_responsive_lab',
    route: '/responsive-lab.html',
    trigger: 'click a[href="responsive-lab.html"]',
    ownerPage: 'orphan.html',
    owner: 'TEA'
  };

  const failing = validateNetEnvelope(env, {
    filePath: 'unreachable.yaml',
    currentSprint: 'SPRINT-GQC-02A'
  });
  assert.equal(failing.valid, false);
  assert.ok(
    failing.violations.some(
      (v) =>
        v.file === 'unreachable.yaml' &&
        v.id === 'p_page_orphan' &&
        v.rule === 'unreachable-page-place'
    )
  );
  assert.ok(
    failing.violations.some(
      (v) =>
        v.file === 'unreachable.yaml' &&
        v.id === 't_dead_from_orphan' &&
        v.rule === 'never-enabled-transition'
    )
  );

  const exempted = structuredClone(env);
  exempted.bindings.places.p_page_orphan.exception = {
    owner: 'Product Manager',
    reason: 'Staged route awaiting GQC-03 navigation link',
    expiresSprint: 'SPRINT-GQC-03'
  };
  exempted.bindings.transitions.t_dead_from_orphan.exception = {
    owner: 'Product Manager',
    reason: 'Staged link awaiting GQC-03 navigation link',
    expiresSprint: 'SPRINT-GQC-03'
  };
  const allowed = validateNetEnvelope(exempted, {
    filePath: 'exempted.yaml',
    currentSprint: 'SPRINT-GQC-02A'
  });
  assert.deepEqual(allowed.violations, []);
  assert.equal(allowed.valid, true);

  const expired = validateNetEnvelope(exempted, {
    filePath: 'expired.yaml',
    currentSprint: 'SPRINT-GQC-04'
  });
  assert.equal(expired.valid, false);
  assert.ok(expired.violations.some((v) => v.rule === 'unreachable-page-place'));
  assert.ok(expired.violations.some((v) => v.rule === 'never-enabled-transition'));
});

test('checker enforces kernel parse errors, binding parity, declared kinds, forbidden topology bindings, P-invariant, and entry marking', () => {
  const base = loadNetEnvelope(SPA_FIXTURE_NET_PATH);

  const danglingArc = structuredClone(base);
  danglingArc.topology.transitions[0].outputs = ['p_nonexistent'];
  const rKernel = validateNetEnvelope(danglingArc, { filePath: 'dangling-arc.json' });
  assert.equal(rKernel.valid, false);
  assert.ok(rKernel.violations.some((v) => v.rule === 'kernel-parse-error'));

  const missingPlaceBinding = structuredClone(base);
  delete missingPlaceBinding.bindings.places.p_spa_details;
  const rMissingBinding = validateNetEnvelope(missingPlaceBinding, { filePath: 'missing-binding.json' });
  assert.equal(rMissingBinding.valid, false);
  assert.ok(
    rMissingBinding.violations.some(
      (v) => v.id === 'p_spa_details' && v.rule === 'missing-binding'
    )
  );

  const danglingBinding = structuredClone(base);
  danglingBinding.bindings.transitions.t_ghost = {
    kind: 'client-route',
    surface: 'target',
    linkId: 'ghost',
    fromPlaceId: 'p_spa_overview',
    toPlaceId: 'p_spa_details',
    route: '#ghost',
    trigger: 'click',
    ownerPage: 'tests/fixtures/spa-test-target.html',
    owner: 'TEA'
  };
  const rDanglingBinding = validateNetEnvelope(danglingBinding, { filePath: 'dangling-binding.json' });
  assert.equal(rDanglingBinding.valid, false);
  assert.ok(
    rDanglingBinding.violations.some(
      (v) => v.id === 't_ghost' && v.rule === 'dangling-binding'
    )
  );

  const missingKinds = structuredClone(base);
  delete missingKinds.bindings.places.p_spa_details.kind;
  delete missingKinds.bindings.transitions.t_spa_open_details.kind;
  const rKinds = validateNetEnvelope(missingKinds, { filePath: 'missing-kinds.json' });
  assert.equal(rKinds.valid, false);
  assert.ok(rKinds.violations.some((v) => v.id === 'p_spa_details' && v.rule === 'missing-place-kind'));
  assert.ok(rKinds.violations.some((v) => v.id === 't_spa_open_details' && v.rule === 'missing-transition-kind'));

  const forbiddenBinding = structuredClone(base);
  forbiddenBinding.topology.transitions[0].binding = { type: 'eval', ref: 'noop' };
  const rForbidden = validateNetEnvelope(forbiddenBinding, { filePath: 'forbidden-binding.json' });
  assert.equal(rForbidden.valid, false);
  assert.ok(
    rForbidden.violations.some(
      (v) => v.id === 't_spa_open_details' && v.rule === 'forbidden-transition-binding'
    )
  );

  const conflatedUri = structuredClone(base);
  conflatedUri.bindings.places.p_spa_overview.clmTypeUri = 'mcard:target:/tests/fixtures/spa-test-target.html#overview';
  const rConflated = validateNetEnvelope(conflatedUri, { filePath: 'conflated-uri.json' });
  assert.equal(rConflated.valid, false);
  assert.ok(
    rConflated.violations.some(
      (v) => v.id === 'p_spa_overview' && v.rule === 'conflated-place-identifiers'
    )
  );

  const brokenPInvariant = structuredClone(base);
  brokenPInvariant.topology.transitions[0].outputs = ['p_spa_overview', 'p_spa_details'];
  const rBrokenInvariant = validateNetEnvelope(brokenPInvariant, { filePath: 'broken-invariant.json' });
  assert.equal(rBrokenInvariant.valid, false);
  assert.ok(
    rBrokenInvariant.violations.some(
      (v) => v.id === 't_spa_open_details' && v.rule === 'broken-session-p-invariant'
    )
  );

  const badEntryTokens = structuredClone(base);
  badEntryTokens.topology.places[0].initialTokens = 2;
  const rBadEntry = validateNetEnvelope(badEntryTokens, { filePath: 'bad-entry.json' });
  assert.equal(rBadEntry.valid, false);
  assert.ok(rBadEntry.violations.some((v) => v.rule === 'invalid-entry-marking'));
});

test('gui-coverage.json workbenchPlaceId and workbenchTransitionIds resolve to declared workbench-net.yaml entities', () => {
  const workbenchNet = loadNetEnvelope(WORKBENCH_NET_PATH);
  const placeSet = new Set(workbenchNet.topology.places.map((p) => p.id));
  const transitionSet = new Set(workbenchNet.topology.transitions.map((t) => t.id));
  const registry = JSON.parse(
    fs.readFileSync(path.join(ROOT_DIR, 'tests/gui-coverage.json'), 'utf8')
  );

  let resolvedRows = 0;
  for (const surface of registry.workbenchSurfaces) {
    if (surface.workbenchPlaceId !== null && surface.workbenchPlaceId !== undefined) {
      assert.ok(placeSet.has(surface.workbenchPlaceId), surface.workbenchPlaceId);
    }
  }
  for (const journey of registry.journeys) {
    if (journey.workbenchPlaceId !== null) {
      assert.ok(placeSet.has(journey.workbenchPlaceId), journey.workbenchPlaceId);
      resolvedRows += 1;
    }
    for (const tid of journey.workbenchTransitionIds) {
      assert.ok(transitionSet.has(tid), tid);
    }
  }
  assert.ok(resolvedRows >= 10);
});
