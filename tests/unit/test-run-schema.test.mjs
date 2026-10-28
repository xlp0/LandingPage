import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateTestRun,
  parseStoredTestRunRecord,
  canonicalJson,
  targetSlug,
  TEST_RUN_SCHEMA
} from '../../js/harness/test-run-schema.js';
import {
  InteractionRecorder,
  DEFAULT_CLM_KERNEL_VERSION
} from '../../js/harness/recorder.js';
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
  test('new InteractionRecorder runs stamp current clm-kernel 0.0.13 matching package.json and KERNEL_PROVENANCE', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
    assert.equal(DEFAULT_CLM_KERNEL_VERSION, '0.0.13');
    assert.equal(pkg.dependencies['clm-kernel'], DEFAULT_CLM_KERNEL_VERSION);
    assert.equal(KERNEL_PROVENANCE, `clm-kernel@${DEFAULT_CLM_KERNEL_VERSION}`);

    const recorder = new InteractionRecorder();
    const run = recorder.buildTestRun({
      target: { url: 'http://localhost:3000/tests/fixtures/spa-test-target.html' }
    });
    assert.equal(run.lab.clmKernel, '0.0.13');
    const validation = validateTestRun(run);
    assert.equal(validation.valid, true, validation.errors.join(', '));
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
});
