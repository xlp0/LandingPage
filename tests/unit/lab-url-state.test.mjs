import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BUILTIN_DEVICES } from '../../js/device-registry.js';
import { DIM_MIN, DIM_MAX } from '../../js/harness/viewport-geometry.js';
import {
  DEFAULT_WORKBENCH_MODES,
  parseLabUrlState,
  orientationIssue,
  labUrlStateFromGeometry,
  mergeLabUrlState,
  issueSentence
} from '../../js/harness/lab-url-state.js';

const DEVICE_IDS = BUILTIN_DEVICES.map((d) => d.id);

describe('DCI-03 lab-url-state pure codec', () => {
  it('parses built-in presets, full viewport, custom sizes, orientations, and modes', () => {
    const parsedPreset = parseLabUrlState('?device=iphone-16-pro&orientation=landscape&mode=verify', {
      deviceIds: DEVICE_IDS,
      modes: DEFAULT_WORKBENCH_MODES
    });
    assert.deepEqual(parsedPreset, {
      state: { device: 'iphone-16-pro', orientation: 'landscape', mode: 'verify' },
      issues: []
    });

    const parsedFull = parseLabUrlState('?device=full&mode=bombadil', {
      deviceIds: DEVICE_IDS,
      modes: DEFAULT_WORKBENCH_MODES
    });
    assert.deepEqual(parsedFull, {
      state: { device: 'full', mode: 'bombadil' },
      issues: []
    });

    const parsedCustom = parseLabUrlState(`?w=${DIM_MIN}&h=${DIM_MAX}&orientation=portrait`, {
      deviceIds: DEVICE_IDS,
      modes: DEFAULT_WORKBENCH_MODES
    });
    assert.deepEqual(parsedCustom, {
      state: { w: DIM_MIN, h: DIM_MAX, orientation: 'portrait' },
      issues: []
    });
  });

  it('produces exact issue sentences for all four rejection reasons', () => {
    const badDevice = parseLabUrlState('?device=nokia-3310&orientation=diagonal&mode=magic', {
      deviceIds: DEVICE_IDS,
      modes: DEFAULT_WORKBENCH_MODES
    });
    assert.deepEqual(badDevice.state, {});
    assert.deepEqual(
      badDevice.issues.map(issueSentence),
      [
        'Ignored device "nokia-3310". It is not an accepted value.',
        'Ignored orientation "diagonal". It is not an accepted value.',
        'Ignored mode "magic". It is not an accepted value.'
      ]
    );

    for (const badSizeQuery of ['?w=99&h=800', '?w=400', '?w=400.5&h=800', `?w=400&h=${DIM_MAX + 1}`]) {
      const res = parseLabUrlState(badSizeQuery, { deviceIds: DEVICE_IDS });
      assert.equal(res.state.w, undefined);
      assert.equal(res.issues.length, 1);
      assert.equal(res.issues[0].reason, 'size-invalid');
      assert.match(issueSentence(res.issues[0]), /^Ignored the size "[^"]*"\. A link needs whole numbers for both w and h, each from 100 to 7680\.$/);
    }

    const ignoredSize = parseLabUrlState('?device=iphone-16-pro&w=500&h=700', { deviceIds: DEVICE_IDS });
    assert.deepEqual(ignoredSize.state, { device: 'iphone-16-pro' });
    assert.equal(ignoredSize.issues.length, 1);
    assert.equal(ignoredSize.issues[0].reason, 'size-ignored');
    assert.equal(issueSentence(ignoredSize.issues[0]), 'Ignored w and h. The link also names a device.');
  });

  it('orientationIssue reports orientation-fixed iff geometry.rotatable is false', () => {
    const fixedIssue = orientationIssue({ kind: 'full', rotatable: false, orientation: 'responsive' });
    assert.deepEqual(fixedIssue, { param: 'orientation', value: 'responsive', reason: 'orientation-fixed' });
    assert.equal(issueSentence(fixedIssue), 'Ignored the orientation. The selected size has one orientation.');
    assert.equal(orientationIssue({ kind: 'preset', rotatable: true, orientation: 'portrait' }), null);
  });

  it('round-trips every state produced by labUrlStateFromGeometry back through parseLabUrlState', () => {
    for (const dev of BUILTIN_DEVICES) {
      for (const orientation of ['portrait', 'landscape']) {
        for (const mode of DEFAULT_WORKBENCH_MODES) {
          const produced = labUrlStateFromGeometry(
            { kind: 'preset', deviceId: dev.id, width: dev.width, height: dev.height, orientation, rotatable: true },
            mode,
            true
          );
          const merged = mergeLabUrlState('', produced);
          const reparsed = parseLabUrlState(merged, { deviceIds: DEVICE_IDS });
          assert.deepEqual(reparsed.issues, []);
          assert.deepEqual(reparsed.state, produced);
        }
      }
    }

    const customDevice = labUrlStateFromGeometry(
      { kind: 'preset', deviceId: 'custom-phone-1', width: 420, height: 840, orientation: 'portrait', rotatable: true },
      'guided-spa',
      false
    );
    assert.deepEqual(customDevice, { w: 420, h: 840, orientation: 'portrait', mode: 'guided-spa' });
    assert.deepEqual(
      parseLabUrlState(mergeLabUrlState('', customDevice), { deviceIds: DEVICE_IDS }),
      { state: customDevice, issues: [] }
    );

    const fullDefault = labUrlStateFromGeometry({ kind: 'full', rotatable: false }, 'explore', false);
    assert.deepEqual(fullDefault, {});
  });

  it('mergeLabUrlState writes parameters in canonical order and preserves target and display_mode', () => {
    const merged = mergeLabUrlState('?target=%2Findex.html&display_mode=light&device=pixel-8', {
      device: 'iphone-16-pro',
      orientation: 'landscape',
      mode: 'verify'
    });
    assert.equal(
      merged,
      '?target=%2Findex.html&display_mode=light&device=iphone-16-pro&orientation=landscape&mode=verify'
    );

    assert.equal(
      mergeLabUrlState('?device=iphone-16-pro&orientation=landscape&mode=verify', {}),
      ''
    );
  });
});
