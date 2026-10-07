import { describe, it, expect } from 'vitest';
import { evaluate, evaluateCoherence } from '../../js/observability/correctness/evaluate.js';

describe('CDO-14: Correctness and Hoare Triple Headless Evaluation', () => {
  it('DV-CDO-14-01: renders both Galois pairs labelled by layer (Map/Territory separation)', async () => {
    const report = await evaluate('LandingPage');

    expect(report.galois_pairs).toBeDefined();
    expect(report.galois_pairs.consistency).toBeDefined();
    expect(report.galois_pairs.correctness).toBeDefined();

    // Map/Territory separation
    expect(report.galois_pairs.consistency.layer).toContain('A-layer');
    expect(report.galois_pairs.consistency.layer).toContain('Map');
    expect(report.galois_pairs.correctness.layer).toContain('C-layer');
    expect(report.galois_pairs.correctness.layer).toContain('Territory');

    // Correctness properties
    expect(report.galois_pairs.consistency.soundness.rule).toContain('Verified(x) ⟹ Correct(x)');
    expect(report.galois_pairs.consistency.completeness.rule).toContain('Correct(x) ⟹ Verified(x)');
  });

  it('DV-CDO-14-06: never labels a Safety-only unit as "correct" (INV-CDO-06)', async () => {
    const report = await evaluate('LandingPage');

    expect(report.safety_liveness.safety_only).toBe(true);
    expect(report.safety_liveness.verdict).toBe('Safety-only');
    expect(report.galois_pairs.correctness.verdict).toBe('Safety-only');
    expect(report.galois_pairs.correctness.is_correct).toBe(false);
    expect(report.safety_liveness.verdict).not.toBe('correct');
  });

  it('DV-CDO-14-02: per-transition Hoare table matches declared net transitions with partial/total labels', async () => {
    const report = await evaluate('LandingPage');
    const triples = report.hoare_triples;

    expect(triples.length).toBe(6);

    const transitionIds = triples.map(t => t.transition);
    expect(transitionIds).toContain('t_resolve');
    expect(transitionIds).toContain('t_load');
    expect(transitionIds).toContain('t_activate');
    expect(transitionIds).toContain('t_dispose');
    expect(transitionIds).toContain('t_reap');

    // Check status is partial or total
    for (const tr of triples) {
      expect(['partial', 'total']).toContain(tr.status);
      expect(tr.vcard_pre).toBeDefined();
      expect(tr.vcard_post).toBeDefined();
    }

    // Partial triple without termination witness
    const partialTriple = triples.find(t => t.id === 'ht_load_requires_satisfiable_coeffects');
    expect(partialTriple.status).toBe('partial');
    expect(partialTriple.has_termination_witness).toBe(false);
  });

  it('DV-CDO-14-02: a triple lacking a termination witness cannot be labelled total (INV-CDO-26)', async () => {
    const report = await evaluate('LandingPage', {
      fixture: {
        hoare_triples: [
          {
            id: 'test_missing_witness',
            transition: 't_custom',
            status: 'total', // Claims total
            has_termination_witness: false // But has no witness
          }
        ]
      }
    });

    const triple = report.hoare_triples[0];
    expect(triple.status).toBe('partial'); // Forced to partial
  });

  it('DV-CDO-14-03: resource-bounded triple detects budget breach (out-of-envelope)', async () => {
    const report = await evaluate('LandingPage', {
      fixture: {
        force_budget_breach: 'ht_dispatch_covers_by_subsumption'
      }
    });

    const breachedTriple = report.hoare_triples.find(t => t.id === 'ht_dispatch_covers_by_subsumption');
    expect(breachedTriple.budget_verdict).toBe('out_of_envelope');
  });

  it('DV-CDO-14-04: certificate chain names simple verifier and complexity class (INV-CDO-27)', async () => {
    const report = await evaluate('LandingPage');
    const chain = report.certificate_chain;

    expect(chain.generator).toBeDefined();
    expect(chain.certificate).toBeDefined();
    expect(chain.verifier).toBeDefined();
    expect(chain.verifier.name).toBe('coeffect-guard-check');
    expect(chain.verifier.complexity_class).toContain('O(1)');
    expect(chain.verifier.status).toBe('verified');
  });

  it('DV-CDO-14-04: unclassified verifier renders as unverifiable (INV-CDO-27)', async () => {
    const report = await evaluate('LandingPage', {
      fixture: {
        verifier: {
          name: 'unreviewed-evaluator',
          is_classified: false
        }
      }
    });

    expect(report.certificate_chain.verifier.is_classified).toBe(false);
    expect(report.certificate_chain.verifier.status).toBe('unverifiable');
  });

  it('DV-CDO-14-07: renders all 4 coherence quadrants and handles consistent-only / correct-only', () => {
    // 1. Consistent-only
    const consistentOnly = evaluateCoherence(true, false);
    expect(consistentOnly.quadrant).toBe('consistent-only');
    expect(consistentOnly.is_glued).toBe(false);
    expect(consistentOnly.quadrants.length).toBe(4);
    expect(consistentOnly.doctrine_note).toContain('H¹ = 0');

    // 2. Correct-only
    const correctOnly = evaluateCoherence(false, true);
    expect(correctOnly.quadrant).toBe('correct-only');
    expect(correctOnly.is_glued).toBe(false);

    // 3. Consistent & Correct (H¹ = 0)
    const glued = evaluateCoherence(true, true);
    expect(glued.quadrant).toBe('consistent-and-correct');
    expect(glued.is_glued).toBe(true);
    expect(glued.h1_cohomology).toBe(0);

    // 4. Neither
    const neither = evaluateCoherence(false, false);
    expect(neither.quadrant).toBe('neither');
    expect(neither.is_glued).toBe(false);
  });

  it('DV-CDO-14-09: brittleness disclosure flags stale evidence when age exceeds threshold', async () => {
    const freshReport = await evaluate('LandingPage', { fixture: { age_seconds: 1200, staleness_threshold_seconds: 3600 } });
    expect(freshReport.brittleness.is_stale).toBe(false);
    expect(freshReport.brittleness.status).toBe('fresh');

    const staleReport = await evaluate('LandingPage', { fixture: { age_seconds: 8000, staleness_threshold_seconds: 3600 } });
    expect(staleReport.brittleness.is_stale).toBe(true);
    expect(staleReport.brittleness.status).toBe('stale');
    expect(staleReport.brittleness.sussman_risks.length).toBe(3);
  });

  it('DV-CDO-14-10: island-level rows check drifted, unbound, and incomplete budget (INV-CDO-28..30)', async () => {
    // Default passing islands
    const reportPass = await evaluate('LandingPage');
    expect(reportPass.islands.length).toBe(5);
    expect(reportPass.unit_green).toBe(true);

    // Drifted island
    const reportDrifted = await evaluate('LandingPage', {
      fixture: {
        islands: [
          {
            id: 'drifted-island',
            url: '/drift',
            hoare_triple: '{P} C {Q}',
            safety_verdict: 'pass',
            liveness_verdict: 'drained',
            island_mcard_binding: 'drifted',
            budget_verdict: 'within_budget',
            status: 'pass'
          }
        ]
      }
    });
    expect(reportDrifted.islands[0].island_mcard_binding).toBe('drifted');
    expect(reportDrifted.unit_green).toBe(false);

    // Unbound island
    const reportUnbound = await evaluate('LandingPage', {
      fixture: {
        islands: [
          {
            id: 'unbound-island',
            url: '/unbound',
            hoare_triple: '{P} C {Q}',
            safety_verdict: 'pass',
            liveness_verdict: 'drained',
            island_mcard_binding: 'unbound',
            budget_verdict: 'within_budget',
            status: 'pass'
          }
        ]
      }
    });
    expect(reportUnbound.islands[0].island_mcard_binding).toBe('unbound');
    expect(reportUnbound.unit_green).toBe(false);

    // Incomplete budget
    const reportIncomplete = await evaluate('LandingPage', {
      fixture: {
        islands: [
          {
            id: 'missing-budget-island',
            url: '/incomplete',
            hoare_triple: '{P} C {Q}',
            safety_verdict: 'pass',
            liveness_verdict: 'drained',
            island_mcard_binding: 'verified',
            budget_verdict: 'incomplete',
            status: 'pass'
          }
        ]
      }
    });
    expect(reportIncomplete.islands[0].budget_verdict).toBe('incomplete');
    expect(reportIncomplete.unit_green).toBe(false);
  });
});
