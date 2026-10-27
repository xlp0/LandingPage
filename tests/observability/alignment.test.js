import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDirectionalAlignment,
  computeJacobianDeterminant,
  evaluate,
} from '../../js/observability/correctness/evaluate.js';

describe('DV-CDO-14-05 Directional Alignment and Jacobian Determinant', () => {
  it('computes directional alignment score cos(v_actual, v_spec) with >= 0.85 threshold', () => {
    const vActual = [1.0, 1.0, 1.0, 0.70, 0.95];
    const vSpec = [1.0, 1.0, 1.0, 1.0, 1.0];
    const res = computeDirectionalAlignment(vActual, vSpec, 0.85);

    assert.ok(res.cosine >= 0.85);
    assert.equal(res.is_aligned, true);
    assert.equal(res.status, 'aligned');
  });

  it('flags deliberately misaligned fixture as non-aligned (< 0.85)', () => {
    const vMisaligned = [1.0, 0.0, 0.0, 0.0, 0.0];
    const vSpec = [1.0, 1.0, 1.0, 1.0, 1.0];
    const res = computeDirectionalAlignment(vMisaligned, vSpec, 0.85);

    assert.ok(res.cosine < 0.85);
    assert.equal(res.is_aligned, false);
    assert.equal(res.status, 'non-aligned');
  });

  it('computes 2x2 Jacobian determinant and flags non-zero as invertible', () => {
    const identityMatrix = [[1, 0], [0, 1]];
    const res = computeJacobianDeterminant(identityMatrix);

    assert.equal(res.determinant, 1.0);
    assert.equal(res.is_invertible, true);
    assert.equal(res.status, 'invertible');
  });

  it('flags zero-determinant Jacobian as non-invertible / invariant not preserved', () => {
    const zeroMatrix = [[1, 1], [1, 1]];
    const res = computeJacobianDeterminant(zeroMatrix);

    assert.equal(res.determinant, 0);
    assert.equal(res.is_invertible, false);
    assert.equal(res.status, 'non-invertible / invariant not preserved');
  });

  it('evaluate integrates alignment and jacobian fixtures cleanly', async () => {
    const reportMisaligned = await evaluate('LandingPage', {
      fixture: {
        misaligned: true,
        zero_jacobian: true,
      },
    });

    assert.equal(reportMisaligned.directional_alignment.is_aligned, false);
    assert.equal(reportMisaligned.directional_alignment.status, 'non-aligned');
    assert.equal(reportMisaligned.directional_alignment.jacobian.is_invertible, false);
    assert.equal(
      reportMisaligned.directional_alignment.jacobian.status,
      'non-invertible / invariant not preserved'
    );
  });
});
