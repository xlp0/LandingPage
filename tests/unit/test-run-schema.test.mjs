import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateTestRun,
  validateInterruptedCapture,
  validateBombadilTrigger,
  validateBombadilRun,
  validateBombadilCoverage,
  parseStoredTestRunRecord,
  canonicalJson,
  targetSlug,
  TEST_RUN_SCHEMA,
  INTERRUPTED_CAPTURE_SCHEMA,
  BOMBADIL_TRIGGER_SCHEMA,
  BOMBADIL_RUN_SCHEMA,
  BOMBADIL_COVERAGE_SCHEMA,
  RECOGNIZED_RUN_SCHEMAS
} from '../../js/harness/test-run-schema.js';
import {
  InteractionRecorder,
  projectViewportToRunDescriptor,
  DEFAULT_CLM_KERNEL_VERSION
} from '../../js/harness/recorder.js';
import { BUILTIN_DEVICES } from '../../js/device-registry.js';
import { applyCustomViewport, selectDevicePreset, createFullSelection } from '../../js/harness/viewport-geometry.js';
import { KERNEL_PROVENANCE } from '../../server/mcard-modality.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function createValidRunFixture() {
  return {
    schema: TEST_RUN_SCHEMA,
    sessionId: 'tr_1792483000000_a1b2c3',
    target: { url: 'http://localhost:4321/', slug: 'localhost-4321' },
    captureSource: 'probe-agent',
    device: {
      id: 'iphone-16-pro',
      name: 'iPhone 16 Pro',
      category: 'phone',
      width: 393,
      height: 852,
      pixelRatio: 3,
      hasTouch: true,
      isMobile: true,
      pointer: 'coarse',
      hover: false,
      safeAreaInsets: { top: 59, right: 0, bottom: 34, left: 0 },
      schemaVersion: 2
    },
    orientation: 'portrait',
    fidelity: {
      tier: 0,
      runner: 'lab-iframe',
      emulated: ['viewport'],
      notEmulated: ['pixelRatio', 'hasTouch', 'pointer', 'hover', 'isMobile', 'safeAreaInsets']
    },
    lab: { commit: '6f9a53a', clmKernel: '0.0.10' },
    metrics: {
      startedAt: '2026-10-20T08:40:00.000Z',
      activeDurationMs: 4500,
      eventCount: 1,
      droppedCount: 0,
      rejectedMessages: 0
    },
    telemetry: {
      overflow: { hasHorizontalOverflow: false, elements: [] },
      frames: { avgFps: 59.8, maxFrameMs: 18.2, droppedFrames: 1 },
      cls: 0.01,
      tapTargetViolations: 0
    },
    finalState: { url: 'http://localhost:4321/explore', domDigest: 'blake3:abc123' },
    events: [
      {
        seq: 1,
        t_rel_ms: 120.4,
        type: 'pointer',
        pointer: { pointerType: 'mouse', button: 0 },
        target: { selector: '[data-testid="btn-explore"]', tag: 'button' },
        viewport: { w: 393, h: 852, dpr: 1, orientation: 'portrait' },
        coords: { nx: 0.52, ny: 0.81 }
      }
    ]
  };
}

describe('Test Run Schema & Serialization (INV-ERB-04)', () => {
  test('valid payload passes validateTestRun', () => {
    const run = createValidRunFixture();
    const result = validateTestRun(run);
    assert.equal(result.valid, true, `Expected valid, got errors: ${result.errors.join(', ')}`);
    assert.equal(result.errors.length, 0);
  });

  test('canonicalJson produces identical strings across permuted keys', () => {
    const run1 = createValidRunFixture();
    // permute keys at top level and nested
    const run2 = {
      events: run1.events,
      schema: run1.schema,
      metrics: {
        eventCount: 1,
        activeDurationMs: 4500,
        startedAt: '2026-10-20T08:40:00.000Z',
        rejectedMessages: 0,
        droppedCount: 0
      },
      sessionId: run1.sessionId,
      target: { slug: 'localhost-4321', url: 'http://localhost:4321/' },
      captureSource: run1.captureSource,
      device: run1.device,
      orientation: run1.orientation,
      fidelity: run1.fidelity,
      telemetry: run1.telemetry,
      finalState: run1.finalState,
      lab: run1.lab
    };

    const json1 = canonicalJson(run1);
    const json2 = canonicalJson(run2);

    assert.equal(json1, json2, 'Canonical serialization must be key-order invariant');
  });

  test('canonicalJson rejects non-finite numbers', () => {
    assert.throws(() => canonicalJson({ num: NaN }), /Cannot canonically serialize non-finite/);
    assert.throws(() => canonicalJson({ num: Infinity }), /Cannot canonically serialize non-finite/);
  });

  test('validateTestRun rejects unknown top-level keys', () => {
    const run = createValidRunFixture();
    run.unexpectedField = 'malicious';
    const result = validateTestRun(run);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("Unknown top-level property: 'unexpectedField'")));
  });

  test('validateTestRun rejects coords out of [0, 1] range', () => {
    const run = createValidRunFixture();
    run.events[0].coords.nx = 1.05;
    const result = validateTestRun(run);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('coords.nx must be within [0, 1]')));
  });

  test('validateTestRun rejects non-monotonic event seq', () => {
    const run = createValidRunFixture();
    run.events.push({
      seq: 1, // should be > 1
      t_rel_ms: 200,
      type: 'pointer'
    });
    const result = validateTestRun(run);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('must be strictly increasing')));
  });

  test('targetSlug correctly normalizes URLs', () => {
    assert.equal(targetSlug('http://localhost:4321/'), 'localhost-4321');
    assert.equal(targetSlug('http://localhost:4321/explore/nested'), 'localhost-4321-explore-nested');
    assert.equal(targetSlug('https://example.gov/subpage?query=1'), 'example-gov-subpage');
    assert.equal(targetSlug('http://127.0.0.1:3001/tests/fixtures/probe.html'), '127-0-0-1-3001-tests-fixtures-probe-html');
  });
});

describe('GQC-07-UNIT-03: clmKernel provenance alignment and historical record compatibility', () => {
    test('new InteractionRecorder runs stamp current clm-kernel 0.0.26 matching package.json and KERNEL_PROVENANCE', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
      assert.equal(DEFAULT_CLM_KERNEL_VERSION, '0.0.26');
      assert.equal(pkg.dependencies['clm-kernel'], DEFAULT_CLM_KERNEL_VERSION);
      assert.equal(KERNEL_PROVENANCE, `clm-kernel@${DEFAULT_CLM_KERNEL_VERSION}`);

      const recorder = new InteractionRecorder();
      const run = recorder.buildTestRun({
        target: { url: 'http://localhost:3000/tests/fixtures/spa-test-target.html' }
      });
      assert.equal(run.lab.clmKernel, '0.0.26');
      assert.equal(run.device.id, 'viewport-full');
      const validation = validateTestRun(run);
      assert.equal(validation.valid, true, validation.errors.join(', '));
    });

    test('Persistence Projection Table maps preset, custom, square, and full modes while stripping UI-only fields', async () => {
      const iphone = BUILTIN_DEVICES.find((d) => d.id === 'iphone-16-pro');
      const presetProj = projectViewportToRunDescriptor({
        selection: selectDevicePreset(iphone),
        device: iphone
      });
      assert.equal(presetProj.ok, true);
      assert.equal(presetProj.device.id, 'iphone-16-pro');
      assert.equal(presetProj.device.frameStyle, undefined);
      assert.equal(presetProj.device.defaultOrientation, undefined);
      assert.equal(presetProj.orientation, 'portrait');

      const customProj = projectViewportToRunDescriptor({
        selection: applyCustomViewport(640, 480)
      });
      assert.equal(customProj.device.id, 'custom-640x480');
      assert.equal(customProj.orientation, 'landscape');

      const squareProj = projectViewportToRunDescriptor({
        selection: applyCustomViewport(500, 500)
      });
      assert.equal(squareProj.device.id, 'custom-500x500');
      assert.equal(squareProj.orientation, 'portrait');

      // Full stage locks start() dimensions and ignores subsequent resizes
      let liveStage = { width: 1000, height: 700 };
      const recorder = new InteractionRecorder({
        measureFullStage: () => ({ ...liveStage })
      });
      recorder.start({ targetUrl: 'http://localhost:3001/tests/fixtures/spa-test-target.html' });
      liveStage = { width: 1400, height: 900 };
      const fullRun = recorder.buildTestRun({ selection: createFullSelection() });
      assert.equal(fullRun.device.id, 'viewport-full');
      assert.equal(fullRun.device.width, 1000);
      assert.equal(fullRun.device.height, 700);
      assert.equal(fullRun.orientation, 'landscape');
      assert.equal(validateTestRun(fullRun).valid, true);

      // < 100px Full stage blocks persist without calling fetch
      let fetchCalled = false;
      const prevFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        fetchCalled = true;
        return { ok: true, async json() { return {}; } };
      };
      try {
        const tinyRecorder = new InteractionRecorder({
          measureFullStage: () => ({ width: 80, height: 600 })
        });
        tinyRecorder.start({ targetUrl: 'http://localhost:3001/tests/fixtures/spa-test-target.html' });
        const blockedRes = await tinyRecorder.saveTestRun({ selection: createFullSelection() });
        assert.equal(blockedRes.ok, false);
        assert.equal(blockedRes.blocked, true);
        assert.equal(fetchCalled, false);
      } finally {
        globalThis.fetch = prevFetch;
      }
    });

    test('InteractionRecorder filters noise viewport causes and builds valid urn:gqc:interrupted-capture:v1 payloads', () => {
      const listeners = new Map();
      const prevDoc = globalThis.document;
      globalThis.document = {
        addEventListener(type, fn) {
          if (!listeners.has(type)) listeners.set(type, new Set());
          listeners.get(type).add(fn);
        },
        removeEventListener(type, fn) {
          listeners.get(type)?.delete(fn);
        },
        querySelector: () => null
      };

      try {
        const recorder = new InteractionRecorder();
        recorder.start({ targetUrl: 'http://localhost:3001/tests/fixtures/spa-test-target.html' });

        for (const cause of ['resize', 'arrangement', 'scale-mode', 'boot']) {
          recorder._onViewportChange({ detail: { cause, width: 800, height: 600, scale: 1, orientation: 'landscape' } });
        }
        assert.equal(recorder.snapshot().length, 0);

        for (const cause of ['preset', 'custom', 'rotate']) {
          recorder._onViewportChange({ detail: { cause, width: 393, height: 852, scale: 1, orientation: 'portrait' } });
        }
        assert.equal(recorder.snapshot().length, 3);
        assert.equal(recorder.snapshot()[2].type, 'orientation_change');

        const interrupted = recorder.buildInterruptedCapture({
          reason: 'Cross-origin redirect',
          lifecycleState: 'RECORDING'
        });
        assert.equal(interrupted.schema, INTERRUPTED_CAPTURE_SCHEMA);
        assert.equal(validateInterruptedCapture(interrupted).valid, true);
        recorder.destroy();
      } finally {
        if (prevDoc === undefined) delete globalThis.document;
        else globalThis.document = prevDoc;
      }
    });

    test('InteractionRecorder honors explicit clmKernelVersion injection option', () => {
      const recorder = new InteractionRecorder({ clmKernelVersion: '0.0.13-custom' });
      const fromCtor = recorder.buildTestRun();
      assert.equal(fromCtor.lab.clmKernel, '0.0.13-custom');

      const fromCall = recorder.buildTestRun({ clmKernelVersion: '0.0.13-call' });
      assert.equal(fromCall.lab.clmKernel, '0.0.13-call');
    });

    test('historical 0.0.10 responsive_test_run:v1 records remain valid and readable without rewriting', () => {
      const historicalRun = createValidRunFixture();
      assert.equal(historicalRun.lab.clmKernel, '0.0.10');

      const validation = validateTestRun(historicalRun);
      assert.equal(validation.valid, true, validation.errors.join(', '));

      const storedBytes = canonicalJson(historicalRun);
      const parsed = parseStoredTestRunRecord(JSON.parse(storedBytes));
      assert.equal(parsed.ok, true);
      assert.equal(parsed.record.schema, TEST_RUN_SCHEMA);
      assert.equal(parsed.record.lab.clmKernel, '0.0.10');
      assert.equal(canonicalJson(parsed.record), storedBytes);
    });

    test('Bombadil trigger, run, and coverage schemas validate cleanly while keeping responsive_test_run:v1 closed', () => {
      for (const s of [BOMBADIL_TRIGGER_SCHEMA, BOMBADIL_RUN_SCHEMA, BOMBADIL_COVERAGE_SCHEMA]) {
        assert.ok(RECOGNIZED_RUN_SCHEMAS.includes(s));
      }

      const validTrigger = {
        schema: BOMBADIL_TRIGGER_SCHEMA,
        triggerId: 'trig_1',
        handle: 'urn:mcard:bombadil:trigger:spa',
        target: 'spa',
        timeLimit: '30s',
        minFirings: 1,
        requestedBy: 'workbench',
        requestedAt: '2026-11-20T00:00:00.000Z'
      };
      assert.equal(validateBombadilTrigger(validTrigger).valid, true);
      assert.equal(validateTestRun(validTrigger).valid, true);
      assert.equal(validateBombadilTrigger({ ...validTrigger, timeLimit: '10s;rm' }).valid, false);
      assert.equal(validateBombadilTrigger({ ...validTrigger, handle: 'urn:mcard:bombadil:trigger:workbench' }).valid, false);

      const validRun = {
        schema: BOMBADIL_RUN_SCHEMA,
        runId: 'run_1',
        triggerHash: 'a'.repeat(64),
        target: 'spa',
        status: 'clean',
        exitCode: 0,
        startedAt: '2026-11-20T00:00:00.000Z',
        finishedAt: '2026-11-20T00:00:10.000Z',
        durationMs: 10000,
        actionsCount: 12,
        firingsCount: 4,
        distinctTransitions: 4,
        quiescenceWarnings: 0,
        violations: [],
        outputDir: '/tmp/bombadil-run-1',
        shrunkTracePath: null,
        reproduceCommand: 'node scripts/bombadil/run.mjs spa --time-limit 30s',
        shrinkCommand: null
      };
      assert.equal(validateBombadilRun(validRun).valid, true);
      assert.equal(validateTestRun(validRun).valid, true);
      assert.equal(validateBombadilRun({ ...validRun, status: 'unknown' }).valid, false);
      assert.equal(validateBombadilRun({ ...validRun, triggerHash: 'short' }).valid, false);

      const validCoverage = {
        schema: BOMBADIL_COVERAGE_SCHEMA,
        generatedAt: '2026-11-20T00:00:11.000Z',
        sourceDir: '/tmp/bombadil-run-1',
        nets: { 'landingpage-workbench-net': { declared: 90, asserted: 19, exploredOnly: 2, neverFired: 69 } },
        rejectedTraces: []
      };
      assert.equal(validateBombadilCoverage(validCoverage).valid, true);
      assert.equal(validateTestRun(validCoverage).valid, true);
      assert.equal(validateBombadilCoverage({ ...validCoverage, rejectedTraces: null }).valid, false);

      const closedRun = createValidRunFixture();
      closedRun.unexpectedExtraField = 'rejected';
      assert.equal(validateTestRun(closedRun).valid, false);
    });
  });
