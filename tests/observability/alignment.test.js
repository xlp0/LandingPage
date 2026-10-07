import { describe, it, expect } from 'vitest';
import { computeDirectionalAlignment, computeJacobianDeterminant, evaluate } from '../../js/observability/correctness/evaluate.js';

describe('DV-CDO-14-05: Directional Alignment and Jacobian Determinant', () => {
  it('computes directional alignment score cos(v_actual, v_spec) with >= 0.85 threshold', () => {
    // Aligned vectors: cosine should be > 0.85
    const vActual = [1.0, 1.0, 1.0, 0.70, 0.95];
    const vSpec = [1.0, 1.0, 1.0, 1.0, 1.0];
    const res = computeDirectionalAlignment(vActual, vSpec, 0.85);

    expect(res.cosine).toBeGreaterThanOrEqual(0.85);
    expect(res.is_aligned).toBe(true);
    expect(res.status).toBe('aligned');
  });

  it('flags deliberately misaligned fixture as non-aligned (< 0.85)', () => {
    // Misaligned vectors
    const vMisaligned = [1.0, 0.0, 0.0, 0.0, 0.0];
    const vSpec = [1.0, 1.0, 1.0, 1.0, 1.0];
    const res = computeDirectionalAlignment(vMisaligned, vSpec, 0.85);

    expect(res.cosine).toBeLessThan(0.85);
    expect(res.is_aligned).toBe(false);
    expect(res.status).toBe('non-aligned');
  });

  it('computes 2x2 Jacobian determinant and flags non-zero as invertible', () => {
    const identityMatrix = [[1, 0], [0, 1]];
    const res = computeJacobianDeterminant(identityMatrix);

    expect(res.determinant).toBe(1.0);
    expect(res.is_invertible).toBe(true);
    expect(res.status).toBe('invertible');
  });

  it('flags zero-determinant Jacobian as non-invertible / invariant not preserved', () => {
    // Linearly dependent rows -> det = 0
    const zeroMatrix = [[1, 1], [1, 1]];
    const res = computeJacobianDeterminant(zeroMatrix);

    expect(res.determinant).toBe(0);
    expect(res.is_invertible).toBe(false);
    expect(res.status).toBe('non-invertible / invariant not preserved');
  });

  it('evaluate integrates alignment and jacobian fixtures cleanly', async () => {
    const reportMisaligned = await evaluate('LandingPage', {
      fixture: {
        misaligned: true,
        zero_jacobian: true
      }
    });

    expect(reportMisaligned.directional_alignment.is_aligned).toBe(false);
    expect(reportMisaligned.directional_alignment.status).toBe('non-aligned');
    expect(reportMisaligned.directional_alignment.jacobian.is_invertible).toBe(false);
    expect(reportMisaligned.directional_alignment.jacobian.status).toBe('non-invertible / invariant not preserved');
  });
});
