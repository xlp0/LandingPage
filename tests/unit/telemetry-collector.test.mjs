import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeFrameStats,
  computeCls,
  checkHorizontalOverflow,
  TelemetryCollector
} from '../../js/harness/telemetry-collector.js';

describe('Device Telemetry Collector (SPRINT-ERB-03 §2)', () => {
  test('computeFrameStats computes 60fps and zero dropped frames for steady 16.6ms deltas', () => {
    const steadyDeltas = Array(60).fill(16.67);
    const stats = computeFrameStats(steadyDeltas);
    assert.equal(stats.avgFps, 60.0);
    assert.equal(stats.maxFrameMs, 16.7);
    assert.equal(stats.droppedFrames, 0);
  });

  test('computeFrameStats flags dropped frames for long frame deltas (jank)', () => {
    // 58 normal frames + 1 frame taking 50ms (drops ~2 frames)
    const deltas = Array(58).fill(16.6).concat([50.0]);
    const stats = computeFrameStats(deltas);
    assert.ok(stats.droppedFrames >= 1, `Expected dropped frames >= 1, got ${stats.droppedFrames}`);
    assert.equal(stats.maxFrameMs, 50.0);
  });

  test('computeFrameStats handles empty deltas cleanly', () => {
    const stats = computeFrameStats([]);
    assert.equal(stats.avgFps, 60.0);
    assert.equal(stats.droppedFrames, 0);
  });

  test('computeCls sums non-input layout shift entries and ignores user-input shifts', () => {
    const entries = [
      { value: 0.02, hadRecentInput: false },
      { value: 0.05, hadRecentInput: true }, // ignored
      { value: 0.015, hadRecentInput: false }
    ];

    const cls = computeCls(entries);
    assert.equal(cls, 0.035);
  });

  test('computeCls returns null when entry list is null', () => {
    assert.equal(computeCls(null), null);
  });

  test('checkHorizontalOverflow detects document overflow beyond window width', () => {
    const mockDoc = {
      documentElement: { scrollWidth: 500 },
      body: { scrollWidth: 500 },
      querySelectorAll: () => [
        {
          tagName: 'DIV',
          id: 'wide-banner',
          className: 'banner-hero',
          getBoundingClientRect: () => ({ right: 500, width: 450, height: 100 })
        },
        {
          tagName: 'SPAN',
          id: 'normal-elem',
          className: '',
          getBoundingClientRect: () => ({ right: 300, width: 100, height: 20 })
        }
      ]
    };
    const mockWin = { innerWidth: 393 };

    const result = checkHorizontalOverflow(mockDoc, mockWin);
    assert.equal(result.hasHorizontalOverflow, true);
    assert.ok(result.elements.includes('div#wide-banner'));
    assert.ok(!result.elements.includes('span#normal-elem'));
  });

  test('TelemetryCollector life cycle produces valid telemetry block', () => {
    const collector = new TelemetryCollector();
    collector.start();
    collector.recordTapViolation();
    const summary = collector.stop();

    assert.equal(typeof summary.overflow.hasHorizontalOverflow, 'boolean');
    assert.equal(typeof summary.frames.avgFps, 'number');
    assert.equal(summary.tapTargetViolations, 1);
  });
});
