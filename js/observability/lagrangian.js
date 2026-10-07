/**
 * Software Lagrangian Scorer (CDO-13 DV-CDO-13-02, DV-CDO-13-05)
 *
 * Implements the Software Lagrangian Variational Principle:
 *   ℒ(u, τ) = S_T(u, τ) - H_T(u, τ)
 *
 * where:
 *   S_T = Epiplexity (learnable structural invariants, capability)
 *   H_T = Axiomatic Entropy (coupling friction, residual entropy, debt)
 *
 * Configurable via `assessment.lagrangian_weights` from mcard.yaml.
 */
import fs from 'fs';
import path from 'path';

export const DEFAULT_WEIGHTS = {
  epiplexity: {
    w1_invariant_coverage: 0.25,
    w2_lattice_pass_rate: 0.25,
    w3_adapter_coverage: 0.20,
    w4_witness_count: 0.15,
    w5_evidence_level: 0.15
  },
  entropy: {
    v1_budget_breach_ratio: 0.30,
    v2_residual_entropy: 0.30,
    v3_uncovered_lattice_fraction: 0.15,
    v4_visual_drift_ratio: 0.15,
    v5_adapter_overhead: 0.10
  }
};

export function computeLagrangian(metrics, weights = DEFAULT_WEIGHTS) {
  const ep = weights?.epiplexity || DEFAULT_WEIGHTS.epiplexity;
  const en = weights?.entropy || DEFAULT_WEIGHTS.entropy;

  const invCov = metrics.functionality?.invariant_coverage ?? 1.0;
  const latPass = metrics.functionality?.lattice_pass_rate ?? 1.0;
  const adCov = metrics.functionality?.adapter_coverage ?? 1.0;
  const witCount = metrics.functionality?.witness_count ?? 6;
  const evScore = metrics.functionality?.evidence_level_score ?? 0.75;

  const normalizedWitness = Math.min(1.0, Math.log2(1 + witCount) / 4);

  const S_T = (
    ep.w1_invariant_coverage * invCov +
    ep.w2_lattice_pass_rate * latPass +
    ep.w3_adapter_coverage * adCov +
    ep.w4_witness_count * normalizedWitness +
    ep.w5_evidence_level * evScore
  );

  const breachRatio = Math.min(1.0, metrics.payload?.budget_breach_ratio ?? 0.0);
  const resEntropy = Math.min(1.0, metrics.performance?.residual_entropy ?? 0.0);
  const uncovLat = 1.0 - latPass;
  const visDrift = Math.min(1.0, metrics.visual?.drift_ratio ?? 0.0);
  const adOverhead = Math.min(1.0, (metrics.performance?.adapter_overhead_kb ?? 0.0) / 100);

  const H_T = (
    en.v1_budget_breach_ratio * breachRatio +
    en.v2_residual_entropy * resEntropy +
    en.v3_uncovered_lattice_fraction * uncovLat +
    en.v4_visual_drift_ratio * visDrift +
    en.v5_adapter_overhead * adOverhead
  );

  const L = S_T - H_T;

  let regime = 'marginal';
  if (L > 0.05) {
    regime = 'geodesic';
  } else if (L < -0.05) {
    regime = 'pruning';
  }

  return {
    S_T: Number(S_T.toFixed(4)),
    H_T: Number(H_T.toFixed(4)),
    lagrangian: Number(L.toFixed(4)),
    regime,
    is_real_action: L > 0,
    dominant_entropy_contributor: breachRatio > 0 ? 'budget_breach' : (resEntropy > 0 ? 'residual_entropy' : 'coupling_friction')
  };
}

export function generateAssessmentArtifact(units = [], outputPath = null) {
  const assessedUnits = units.map(u => {
    const score = computeLagrangian(u.metrics, u.weights);
    return {
      unit: u.name,
      tau: u.tau || { platform: 'web', form_factor: 'desktop', orientation: 'portrait', locale: 'en-US' },
      payload_bytes: u.metrics.payload?.total_bytes ?? 0,
      within_budget: u.metrics.payload?.within_budget ?? true,
      performance_summary: {
        lcp_ms: u.metrics.performance?.lcp_ms ?? 0,
        residual_entropy: u.metrics.performance?.residual_entropy ?? 0
      },
      functionality_coverage: u.metrics.functionality?.invariant_coverage ?? 1.0,
      S_T: score.S_T,
      H_T: score.H_T,
      lagrangian: score.lagrangian,
      regime: score.regime,
      dominant_entropy_contributor: score.dominant_entropy_contributor
    };
  });

  assessedUnits.sort((a, b) => b.lagrangian - a.lagrangian);

  const artifact = {
    schema_version: '1.0.0',
    generated_at: new Date().toISOString(),
    harness: 'clm-fibration-lagrangian-assessment',
    units: assessedUnits,
    summary: {
      total_units: assessedUnits.length,
      geodesic_count: assessedUnits.filter(u => u.regime === 'geodesic').length,
      pruned_count: assessedUnits.filter(u => u.regime === 'pruning').length
    }
  };

  if (outputPath) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2));
  }

  return artifact;
}
