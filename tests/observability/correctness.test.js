import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, evaluateCoherence } from '../../js/observability/correctness/evaluate.js';

describe('CDO-14 Correctness and Hoare Triple Headless Evaluation', () => {
  it('DV-CDO-14-01 renders both Galois pairs labelled by layer (Map and Territory separation)', async () => {
    const report = await evaluate('LandingPage');

    assert.notEqual(report.galois_pairs, undefined);
    assert.notEqual(report.galois_pairs.consistency, undefined);
    assert.notEqual(report.galois_pairs.correctness, undefined);

    assert.ok(report.galois_pairs.consistency.layer.includes('A-layer'));
    assert.ok(report.galois_pairs.consistency.layer.includes('Map'));
    assert.ok(report.galois_pairs.correctness.layer.includes('C-layer'));
    assert.ok(report.galois_pairs.correctness.layer.includes('Territory'));

    assert.ok(report.galois_pairs.consistency.soundness.rule.includes('Verified(x) ⟹ Correct(x)'));
    assert.ok(report.galois_pairs.consistency.completeness.rule.includes('Correct(x) ⟹ Verified(x)'));
  });

  it('DV-CDO-14-06 never labels a Safety-only unit as "correct" (INV-CDO-06)', async () => {
    const report = await evaluate('LandingPage');

    assert.equal(report.safety_liveness.safety_only, true);
    assert.equal(report.safety_liveness.verdict, 'Safety-only');
    assert.equal(report.galois_pairs.correctness.verdict, 'Safety-only');
    assert.equal(report.galois_pairs.correctness.is_correct, false);
    assert.notEqual(report.safety_liveness.verdict, 'correct');
  });

  it('DV-CDO-14-02 per-transition Hoare table matches declared net transitions with partial and total labels', async () => {
    const report = await evaluate('LandingPage');
    const triples = report.hoare_triples;

    assert.equal(triples.length, 6);

    const transitionIds = triples.map((t) => t.transition);
    assert.ok(transitionIds.includes('t_resolve'));
    assert.ok(transitionIds.includes('t_load'));
    assert.ok(transitionIds.includes('t_activate'));
    assert.ok(transitionIds.includes('t_dispose'));
    assert.ok(transitionIds.includes('t_reap'));

    for (const tr of triples) {
      assert.ok(['partial', 'total'].includes(tr.status));
      assert.notEqual(tr.vcard_pre, undefined);
      assert.notEqual(tr.vcard_post, undefined);
    }

    const partialTriple = triples.find((t) => t.id === 'ht_load_requires_satisfiable_coeffects');
    assert.equal(partialTriple.status, 'partial');
    assert.equal(partialTriple.has_termination_witness, false);
  });

  it('DV-CDO-14-02 a triple lacking a termination witness cannot be labelled total (INV-CDO-26)', async () => {
    const report = await evaluate('LandingPage', {
      fixture: {
        hoare_triples: [
          {
            id: 'test_missing_witness',
            transition: 't_custom',
            status: 'total',
            has_termination_witness: false,
          },
        ],
      },
    });

    const triple = report.hoare_triples[0];
    assert.equal(triple.status, 'partial');
  });

  it('DV-CDO-14-03 resource-bounded triple detects budget breach (out-of-envelope)', async () => {
    const report = await evaluate('LandingPage', {
      fixture: {
        force_budget_breach: 'ht_dispatch_covers_by_subsumption',
      },
    });

    const breachedTriple = report.hoare_triples.find(
      (t) => t.id === 'ht_dispatch_covers_by_subsumption'
    );
    assert.equal(breachedTriple.budget_verdict, 'out_of_envelope');
  });

  it('DV-CDO-14-04 certificate chain names simple verifier and complexity class (INV-CDO-27)', async () => {
    const report = await evaluate('LandingPage');
    const chain = report.certificate_chain;

    assert.notEqual(chain.generator, undefined);
    assert.notEqual(chain.certificate, undefined);
    assert.notEqual(chain.verifier, undefined);
    assert.equal(chain.verifier.name, 'coeffect-guard-check');
    assert.ok(chain.verifier.complexity_class.includes('O(1)'));
    assert.equal(chain.verifier.status, 'verified');
  });

  it('DV-CDO-14-04 unclassified verifier renders as unverifiable (INV-CDO-27)', async () => {
    const report = await evaluate('LandingPage', {
      fixture: {
        verifier: {
          name: 'unreviewed-evaluator',
          is_classified: false,
        },
      },
    });

    assert.equal(report.certificate_chain.verifier.is_classified, false);
    assert.equal(report.certificate_chain.verifier.status, 'unverifiable');
  });

  it('DV-CDO-14-07 renders all 4 coherence quadrants and handles consistent-only and correct-only', () => {
    const consistentOnly = evaluateCoherence(true, false);
    assert.equal(consistentOnly.quadrant, 'consistent-only');
    assert.equal(consistentOnly.is_glued, false);
    assert.equal(consistentOnly.quadrants.length, 4);
    assert.ok(consistentOnly.doctrine_note.includes('H¹ = 0'));

    const correctOnly = evaluateCoherence(false, true);
    assert.equal(correctOnly.quadrant, 'correct-only');
    assert.equal(correctOnly.is_glued, false);

    const glued = evaluateCoherence(true, true);
    assert.equal(glued.quadrant, 'consistent-and-correct');
    assert.equal(glued.is_glued, true);
    assert.equal(glued.h1_cohomology, 0);

    const neither = evaluateCoherence(false, false);
    assert.equal(neither.quadrant, 'neither');
    assert.equal(neither.is_glued, false);
  });

  it('DV-CDO-14-09 brittleness disclosure flags stale evidence when age exceeds threshold', async () => {
    const freshReport = await evaluate('LandingPage', {
      fixture: { age_seconds: 1200, staleness_threshold_seconds: 3600 },
    });
    assert.equal(freshReport.brittleness.is_stale, false);
    assert.equal(freshReport.brittleness.status, 'fresh');

    const staleReport = await evaluate('LandingPage', {
      fixture: { age_seconds: 8000, staleness_threshold_seconds: 3600 },
    });
    assert.equal(staleReport.brittleness.is_stale, true);
    assert.equal(staleReport.brittleness.status, 'stale');
    assert.equal(staleReport.brittleness.sussman_risks.length, 3);
  });

  it('DV-CDO-14-10 island-level rows check drifted, unbound, and incomplete budget (INV-CDO-28..30)', async () => {
    const reportPass = await evaluate('LandingPage');
    assert.equal(reportPass.islands.length, 5);
    assert.equal(reportPass.unit_green, true);

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
            status: 'pass',
          },
        ],
      },
    });
    assert.equal(reportDrifted.islands[0].island_mcard_binding, 'drifted');
    assert.equal(reportDrifted.unit_green, false);

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
            status: 'pass',
          },
        ],
      },
    });
    assert.equal(reportUnbound.islands[0].island_mcard_binding, 'unbound');
    assert.equal(reportUnbound.unit_green, false);

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
            status: 'pass',
          },
        ],
      },
    });
    assert.equal(reportIncomplete.islands[0].budget_verdict, 'incomplete');
    assert.equal(reportIncomplete.unit_green, false);
  });
});
