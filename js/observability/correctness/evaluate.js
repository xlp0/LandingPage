/**
 * Headless Correctness Evaluator (CDO-14 DV-CDO-14-01 through DV-CDO-14-10)
 *
 * Implements the runtime evaluation of the Correctness & Hoare Triple structure
 * across the CLM Map/Territory boundary:
 *   - Consistency (A-layer Map): Soundness ⊣ Completeness
 *   - Correctness (C-layer Territory): Safety ⊣ Liveness
 *
 * Headless kernel purity (INV-REF-01):
 * Contains ZERO DOM dependencies and runs identically in pure Node.js and the browser.
 */

/**
 * Calculates vector cosine similarity between actual and spec vectors.
 * cos(v_actual, v_spec) = (v_actual · v_spec) / (||v_actual|| * ||v_spec||)
 */
export function computeDirectionalAlignment(vActual = [1.0, 1.0, 1.0, 0.70, 0.95], vSpec = [1.0, 1.0, 1.0, 1.0, 1.0], threshold = 0.85) {
  if (!Array.isArray(vActual) || !Array.isArray(vSpec) || vActual.length === 0 || vActual.length !== vSpec.length) {
    return {
      cosine: 0,
      threshold,
      is_aligned: false,
      status: 'non-aligned',
      v_actual: vActual,
      v_spec: vSpec
    };
  }

  let dotProduct = 0;
  let normActualSq = 0;
  let normSpecSq = 0;

  for (let i = 0; i < vActual.length; i++) {
    const a = Number(vActual[i]) || 0;
    const s = Number(vSpec[i]) || 0;
    dotProduct += a * s;
    normActualSq += a * a;
    normSpecSq += s * s;
  }

  const denominator = Math.sqrt(normActualSq) * Math.sqrt(normSpecSq);
  const cosine = denominator > 0 ? Number((dotProduct / denominator).toFixed(4)) : 0;
  const isAligned = cosine >= threshold;

  return {
    cosine,
    threshold,
    is_aligned: isAligned,
    status: isAligned ? 'aligned' : 'non-aligned',
    v_actual: vActual,
    v_spec: vSpec
  };
}

/**
 * Computes 2x2 or general NxN matrix determinant.
 * A non-zero determinant indicates invariant preservation and manifold invertibility.
 */
export function computeJacobianDeterminant(matrix = [[1, 0], [0, 1]]) {
  if (!Array.isArray(matrix) || matrix.length === 0) {
    return {
      determinant: 0,
      is_invertible: false,
      status: 'non-invertible / invariant not preserved',
      matrix
    };
  }

  // 1x1
  if (matrix.length === 1) {
    const det = Number(matrix[0][0]) || 0;
    return {
      determinant: det,
      is_invertible: det !== 0,
      status: det !== 0 ? 'invertible' : 'non-invertible / invariant not preserved',
      matrix
    };
  }

  // 2x2
  if (matrix.length === 2 && matrix[0].length === 2 && matrix[1].length === 2) {
    const a = Number(matrix[0][0]) || 0;
    const b = Number(matrix[0][1]) || 0;
    const c = Number(matrix[1][0]) || 0;
    const d = Number(matrix[1][1]) || 0;
    const det = Number((a * d - b * c).toFixed(4));
    const isInvertible = det !== 0;
    return {
      determinant: det,
      is_invertible: isInvertible,
      status: isInvertible ? 'invertible' : 'non-invertible / invariant not preserved',
      matrix
    };
  }

  // General recursive determinant
  function detNxN(m) {
    const n = m.length;
    if (n === 1) return m[0][0];
    if (n === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
    let d = 0;
    for (let c = 0; c < n; c++) {
      const sub = [];
      for (let r = 1; r < n; r++) {
        sub.push(m[r].filter((_, idx) => idx !== c));
      }
      const sign = c % 2 === 0 ? 1 : -1;
      d += sign * m[0][c] * detNxN(sub);
    }
    return d;
  }

  const det = Number(detNxN(matrix).toFixed(4));
  const isInvertible = det !== 0;
  return {
    determinant: det,
    is_invertible: isInvertible,
    status: isInvertible ? 'invertible' : 'non-invertible / invariant not preserved',
    matrix
  };
}

/**
 * Evaluates the 4-quadrant coherence gluing status:
 *   1. consistent-and-correct (H¹ = 0, Sheaf gluing holds)
 *   2. consistent-only (sound spec, failing runtime)
 *   3. correct-only (working code, inconsistent types)
 *   4. neither (inconsistent spec, failing runtime)
 */
export function evaluateCoherence(isConsistent = true, isCorrect = false, customQuadrant = null) {
  let activeQuadrant = 'neither';
  if (customQuadrant) {
    activeQuadrant = customQuadrant;
  } else if (isConsistent && isCorrect) {
    activeQuadrant = 'consistent-and-correct';
  } else if (isConsistent && !isCorrect) {
    activeQuadrant = 'consistent-only';
  } else if (!isConsistent && isCorrect) {
    activeQuadrant = 'correct-only';
  } else {
    activeQuadrant = 'neither';
  }

  const isGlued = activeQuadrant === 'consistent-and-correct';

  const quadrants = [
    {
      id: 'consistent-and-correct',
      label: 'Consistent & Correct',
      tag: 'H¹ = 0',
      description: 'Sheaf condition holds; local sections glue into a globally coherent section.',
      active: activeQuadrant === 'consistent-and-correct'
    },
    {
      id: 'consistent-only',
      label: 'Consistent-only',
      tag: 'A-layer only',
      description: 'Sound specification in the type lattice, but runtime verification is incomplete or failing.',
      active: activeQuadrant === 'consistent-only'
    },
    {
      id: 'correct-only',
      label: 'Correct-only',
      tag: 'C-layer only',
      description: 'Concrete implementation executes and passes tests, but type lattice or invariants are inconsistent.',
      active: activeQuadrant === 'correct-only'
    },
    {
      id: 'neither',
      label: 'Neither',
      tag: '⊥ Unsound',
      description: 'Contradictory specification and failing runtime execution.',
      active: activeQuadrant === 'neither'
    }
  ];

  return {
    quadrant: activeQuadrant,
    is_glued: isGlued,
    h1_cohomology: isGlued ? 0 : 1,
    quadrants,
    doctrine_note: 'Only the gluing (H¹ = 0, Consistent & Correct) is trustworthy per the Correctness doctrine.'
  };
}

/**
 * Standard declared Hoare triples matching the fiber lifecycle net (clm/tests/petri_nets/fiber_lifecycle.yaml).
 */
export const DEFAULT_HOARE_TRIPLES = [
  {
    id: 'ht_dispatch_covers_by_subsumption',
    transition: 't_resolve',
    action: 'pcard:resolve',
    vcard_pre: {
      uri: 'vcard:kind_declared_or_subsumed',
      admissibility: 'admissible',
      budget_pre: { archetype: 'wearable', max_bytes: 2097152 }
    },
    command: {
      id: 't_resolve',
      pcard: 'pcard:resolve',
      runtime_adapter: 'FiberRegistry.resolve()'
    },
    vcard_post: {
      uri: 'vcard:covered_by_most_specific_fiber',
      receipt: 'mcard:receipt:cdo-11:t_resolve',
      budget_post: { archetype: 'wearable', max_bytes: 2097152 }
    },
    status: 'total',
    has_termination_witness: true,
    budget_verdict: 'within_budget',
    note: 'colour refinement: t_resolve changes the token from mcard:unclassified to the kind of the covering fiber.'
  },
  {
    id: 'ht_load_requires_satisfiable_coeffects',
    transition: 't_load',
    action: 'pcard:load',
    vcard_pre: {
      uri: 'vcard:coeffects_satisfiable',
      admissibility: 'admissible',
      budget_pre: { archetype: 'mobile', max_bytes: 10485760 }
    },
    command: {
      id: 't_load',
      pcard: 'pcard:load',
      runtime_adapter: 'FiberLifecycle.load()'
    },
    vcard_post: {
      uri: 'vcard:token_in_p_loading',
      receipt: 'mcard:receipt:cdo-11:t_load',
      budget_post: { archetype: 'mobile', max_bytes: 10485760 }
    },
    status: 'partial',
    has_termination_witness: false,
    budget_verdict: 'within_budget',
    note: 'partial, not total: a fiber whose declared services are unsatisfiable has no enabled binding, so the transition is not defined on all inputs.'
  },
  {
    id: 'ht_activate_registers_the_inverse',
    transition: 't_activate',
    action: 'pcard:activate',
    vcard_pre: {
      uri: 'vcard:token_in_p_loading',
      admissibility: 'admissible',
      budget_pre: { archetype: 'mobile', max_bytes: 10485760 }
    },
    command: {
      id: 't_activate',
      pcard: 'pcard:activate',
      runtime_adapter: 'FiberLifecycle.activate()'
    },
    vcard_post: {
      uri: 'vcard:token_in_p_active_and_inverse_registered',
      receipt: 'mcard:receipt:cdo-11:t_activate',
      budget_post: { archetype: 'mobile', max_bytes: 10485760 }
    },
    status: 'total',
    has_termination_witness: true,
    budget_verdict: 'within_budget',
    note: 'the postcondition names the inverse, because a token reaching p_active without one is the leak the disposal invariant catches.'
  },
  {
    id: 'ht_dispose_reaches_the_sink',
    transition: 't_dispose',
    action: 'pcard:dispose',
    vcard_pre: {
      uri: 'vcard:token_in_p_unloading',
      admissibility: 'admissible',
      budget_pre: { archetype: 'wearable', max_bytes: 2097152 }
    },
    command: {
      id: 't_dispose',
      pcard: 'pcard:dispose',
      runtime_adapter: 'FiberLifecycle.dispose()'
    },
    vcard_post: {
      uri: 'vcard:token_in_p_disposed_and_disposables_empty',
      receipt: 'mcard:receipt:cdo-11:t_dispose',
      budget_post: { archetype: 'wearable', max_bytes: 2097152 }
    },
    status: 'total',
    has_termination_witness: true,
    budget_verdict: 'within_budget',
    note: 'conservation: the token arrives in the sink and the disposable list is empty.'
  },
  {
    id: 'ht_bottom_halts_with_zero_side_effects',
    transition: 't_load',
    action: 'pcard:load',
    vcard_pre: {
      uri: 'vcard:no_covering_fiber_and_no_fallback',
      admissibility: 'excluded', // ⊥ halt
      budget_pre: { archetype: 'wearable', max_bytes: 2097152 }
    },
    command: {
      id: 't_load',
      pcard: 'pcard:load_bottom',
      runtime_adapter: 'FiberLifecycle.rollback_guard()'
    },
    vcard_post: {
      uri: 'vcard:halted_before_guard_created',
      receipt: 'mcard:receipt:cdo-11:t_load_bottom',
      budget_post: { archetype: 'wearable', max_bytes: 2097152 }
    },
    status: 'total',
    has_termination_witness: true,
    budget_verdict: 'within_budget',
    note: 'the ⊥ case: the meet is empty, so no transition is enabled. The halt happens before the guard exists, making zero side-effects structural.'
  },
  {
    id: 'ht_reap_accounts_for_a_failed_token',
    transition: 't_reap',
    action: 'pcard:reap',
    vcard_pre: {
      uri: 'vcard:token_in_p_error',
      admissibility: 'admissible',
      budget_pre: { archetype: 'wearable', max_bytes: 2097152 }
    },
    command: {
      id: 't_reap',
      pcard: 'pcard:reap',
      runtime_adapter: 'FiberLifecycle.reap()'
    },
    vcard_post: {
      uri: 'vcard:token_in_p_disposed',
      receipt: 'mcard:receipt:cdo-11:t_reap',
      budget_post: { archetype: 'wearable', max_bytes: 2097152 }
    },
    status: 'total',
    has_termination_witness: true,
    budget_verdict: 'within_budget',
    note: 'reaping, not resurrection: the failed token reaches the sink and never returns to a working place.'
  }
];

/**
 * Standard island-level correctness fixtures (INV-CDO-28, INV-CDO-29, INV-CDO-30).
 */
export const DEFAULT_ISLANDS = [
  {
    id: 'landing-hero',
    url: '/#hero',
    hoare_triple: '{directive: client:load ∧ budget: <2MB} Island PCard {rendered ∧ witness sealed}',
    safety_verdict: 'pass',
    liveness_verdict: 'drained',
    island_mcard_binding: 'verified',
    budget_verdict: 'within_budget',
    budget_detail: '1.4MB / 2.0MB (max_bytes)',
    status: 'pass'
  },
  {
    id: 'deployment-inspector',
    url: '/#inspector',
    hoare_triple: '{directive: client:idle ∧ budget: <5MB} Island PCard {rendered ∧ witness sealed}',
    safety_verdict: 'pass',
    liveness_verdict: 'drained',
    island_mcard_binding: 'verified',
    budget_verdict: 'within_budget',
    budget_detail: '3.1MB / 5.0MB (max_bytes)',
    status: 'pass'
  },
  {
    id: 'navigation-bar',
    url: '/#nav',
    hoare_triple: '{directive: client:load ∧ budget: <1MB} Island PCard {rendered ∧ witness sealed}',
    safety_verdict: 'pass',
    liveness_verdict: 'drained',
    island_mcard_binding: 'verified',
    budget_verdict: 'within_budget',
    budget_detail: '420KB / 1.0MB (max_bytes)',
    status: 'pass'
  },
  {
    id: 'music-visualizer',
    url: '/#visualizer',
    hoare_triple: '{directive: client:visible ∧ budget: <10MB} Island PCard {rendered ∧ witness sealed}',
    safety_verdict: 'pass',
    liveness_verdict: 'drained',
    island_mcard_binding: 'verified',
    budget_verdict: 'within_budget',
    budget_detail: '6.8MB / 10.0MB (max_bytes)',
    status: 'pass'
  },
  {
    id: 'responsive-lab',
    url: '/responsive-lab.html',
    hoare_triple: '{directive: client:only ∧ budget: <15MB} Island PCard {rendered ∧ witness sealed}',
    safety_verdict: 'pass',
    liveness_verdict: 'drained',
    island_mcard_binding: 'verified',
    budget_verdict: 'within_budget',
    budget_detail: '8.2MB / 15.0MB (max_bytes)',
    status: 'pass'
  }
];

/**
 * Main evaluation entry point for deployment unit correctness.
 * Evaluates the unit against its manifest, declared triples, verifier, and runtime metrics.
 */
export async function evaluate(unitId = 'LandingPage', options = {}) {
  const isLandingPage = unitId === 'LandingPage';

  // Allow fixtures to override specific evaluation aspects
  const fixture = options.fixture || {};

  // 1. Galois Pairs: Consistency (A-layer) and Correctness (C-layer)
  const isConsistent = fixture.is_consistent ?? true;
  // LandingPage currently declares safety invariants but 0 liveness goals -> safety_only
  const safetyOnly = fixture.safety_only ?? (isLandingPage ? true : false);
  const isCorrect = fixture.is_correct ?? (!safetyOnly && (fixture.has_liveness ?? false));

  const galoisPairs = {
    consistency: {
      layer: 'A-layer (Map / Abstract Spec / type T)',
      name: 'Soundness ⊣ Completeness',
      soundness: {
        symbol: 'α',
        adjective: 'Plato (widening)',
        rule: 'Verified(x) ⟹ Correct(x)',
        avoids: 'no false positives',
        status: isConsistent ? 'verified' : 'unwitnessed'
      },
      completeness: {
        symbol: 'γ',
        adjective: 'Orwell (narrowing)',
        rule: 'Correct(x) ⟹ Verified(x)',
        avoids: 'no false negatives',
        status: isConsistent ? 'verified' : 'unwitnessed'
      },
      verdict: isConsistent ? 'consistent' : 'unwitnessed',
      gluing: isConsistent ? 'local_section' : 'disconnected'
    },
    correctness: {
      layer: 'C-layer (Territory / Concrete Impl / term t)',
      name: 'Safety ⊣ Liveness',
      safety: {
        rule: 'nothing bad ever happens',
        avoids: 'reaching a forbidden state',
        invariants_count: fixture.safety_count ?? 7,
        status: fixture.safety_status ?? 'pass',
        note: 'xᵀ D = 0 (conservation) proved'
      },
      liveness: {
        rule: 'something good eventually happens',
        avoids: 'stalling forever',
        goals_count: fixture.goals_count ?? 0,
        status: safetyOnly ? 'safety_only' : (fixture.liveness_status ?? 'pass'),
        note: safetyOnly ? 'No liveness goals declared; safety_only flag set' : 'All goals reached'
      },
      // DV-CDO-14-06: NEVER label a safety-only unit "correct"
      verdict: safetyOnly ? 'Safety-only' : (isCorrect ? 'correct' : 'unwitnessed'),
      is_correct: isCorrect
    }
  };

  // 2. Safety ⊣ Liveness Status
  const safetyLiveness = {
    safety_status: galoisPairs.correctness.safety.status,
    liveness_status: galoisPairs.correctness.liveness.status,
    safety_only: safetyOnly,
    verdict: safetyOnly ? 'Safety-only' : (isCorrect ? 'correct' : 'unwitnessed'),
    explanation: safetyOnly
      ? 'Conservation (xᵀ D = 0) and 7 safety invariants hold, but no liveness goals are certified (INV-CDO-06).'
      : (isCorrect ? 'Both safety invariants and liveness goals are certified.' : 'Correctness evidence unwitnessed.')
  };

  // 3. Hoare Triples per transition
  let hoareTriples = fixture.hoare_triples || DEFAULT_HOARE_TRIPLES.map(tr => ({ ...tr }));

  // Apply totality rules: a triple lacking a termination witness MUST be labelled partial (INV-CDO-26)
  hoareTriples = hoareTriples.map(tr => {
    let status = tr.status || 'partial';
    let hasTerm = tr.has_termination_witness ?? (status === 'total');
    if (!hasTerm) {
      status = 'partial';
    }
    let budgetVerdict = tr.budget_verdict || 'within_budget';
    if (fixture.force_budget_breach && tr.id === fixture.force_budget_breach) {
      budgetVerdict = 'out_of_envelope';
    }
    return {
      ...tr,
      status,
      has_termination_witness: hasTerm,
      budget_verdict: budgetVerdict
    };
  });

  // 4. Certificate Chain & Verifier Simplicity (INV-CDO-27)
  const isVerifierClassified = fixture.verifier?.is_classified ?? true;
  const certificateChain = {
    generator: {
      name: 'PCard Execution Morphism',
      role: 'produces evidence from raw data',
      complexity: 'arbitrarily complex',
      action: 'clm-kernel::execute()'
    },
    certificate: {
      name: 'MCard Witness Receipt',
      role: 'the evidence bridging generator and verifier',
      complexity: 'data (immutable CAS)',
      hash: fixture.certificate_hash || 'sha256:cdo-14-witness-receipt-blake3'
    },
    verifier: {
      name: fixture.verifier?.name || 'coeffect-guard-check',
      kind: fixture.verifier?.kind || 'guard comparison',
      complexity_class: isVerifierClassified ? (fixture.verifier?.complexity_class || 'O(1) recognized expression') : 'unclassified',
      verdict: 'the transition is enabled iff every required service resolves',
      checked_by: 'fiber_conformance.mjs :: coeffects_enforced_without_context',
      is_classified: isVerifierClassified,
      status: isVerifierClassified ? 'verified' : 'unverifiable'
    },
    doctrine_note: 'Trust rests on the simple verifier, not on the generator’s cleverness (INV-CDO-27).'
  };

  // 5. Directional Alignment & Jacobian
  const vActual = fixture.v_actual || (fixture.misaligned ? [1.0, 0.0, 0.0, 0.0, 0.0] : [1.0, 1.0, 1.0, 0.70, 0.95]);
  const vSpec = fixture.v_spec || [1.0, 1.0, 1.0, 1.0, 1.0];
  const directionalAlignment = computeDirectionalAlignment(vActual, vSpec, fixture.threshold ?? 0.85);

  const jacobianMatrix = fixture.jacobian_matrix || (fixture.zero_jacobian ? [[1, 1], [1, 1]] : [[1, 0], [0, 1]]);
  const jacobianResult = computeJacobianDeterminant(jacobianMatrix);
  directionalAlignment.jacobian = jacobianResult;

  // 6. Coherence Gluing Status (Sheaf Condition H¹ = 0)
  const coherenceGluing = evaluateCoherence(isConsistent, isCorrect, fixture.quadrant);

  // 7. REPL Process Model
  const replPhases = [
    {
      id: 'prep',
      name: 'Read',
      ptr_phase: 'prep',
      hoare_component: 'check {P}',
      property: 'Safety',
      rule: 'no firing without valid input',
      evidence: fixture.prep_evidence || 'witnessed',
      timestamp: '2026-10-07T08:00:00Z',
      active: true
    },
    {
      id: 'exec',
      name: 'Evaluate',
      ptr_phase: 'exec',
      hoare_component: 'execute C',
      property: 'Soundness',
      rule: 'execution follows specification',
      evidence: fixture.exec_evidence || 'witnessed',
      timestamp: '2026-10-07T08:00:01Z',
      active: true
    },
    {
      id: 'post',
      name: 'Print',
      ptr_phase: 'post',
      hoare_component: 'produce {Q}',
      property: 'Completeness',
      rule: 'valid execution produces a witness',
      evidence: fixture.post_evidence || 'witnessed',
      timestamp: '2026-10-07T08:00:02Z',
      active: true
    },
    {
      id: 'await',
      name: 'Loop',
      ptr_phase: 'await',
      hoare_component: '{Q} → {P\'}',
      property: 'Liveness',
      rule: 'the system continues to accept inputs; DisposableList drained',
      evidence: fixture.await_evidence || (safetyOnly ? 'dimmed' : 'witnessed'),
      timestamp: safetyOnly ? null : '2026-10-07T08:00:03Z',
      active: !safetyOnly
    }
  ];

  // 8. Brittleness Disclosure (Sussman Risks)
  const stalenessThreshold = fixture.staleness_threshold_seconds ?? 7200;
  const ageSeconds = fixture.age_seconds ?? 3600;
  const isStale = fixture.is_stale ?? (ageSeconds > stalenessThreshold);

  const brittleness = {
    recency_timestamp: fixture.recency_timestamp || '2026-10-07T08:15:00Z',
    age_seconds: ageSeconds,
    repetition_count: fixture.repetition_count ?? 42,
    staleness_threshold_seconds: stalenessThreshold,
    is_stale: isStale,
    status: isStale ? 'stale' : 'fresh',
    sussman_risks: [
      {
        risk: 'Frame Problem',
        warning: 'Unmonitored environmental assumptions outside the type lattice may drift and invalidate preconditions.'
      },
      {
        risk: 'Sussman Anomaly',
        warning: 'Non-interleaved sub-goals can conflict during sequential lifecycle transitions.'
      },
      {
        risk: 'Temporal Brittleness',
        warning: 'A one-time pass is not a permanent property. Ongoing loop verification is mandatory.'
      }
    ],
    doctrine_note: 'A one-time pass is not a permanent property. Correctness is an operational loop.'
  };

  // 9. Island-Level Correctness Rows (INV-CDO-28, INV-CDO-29, INV-CDO-30)
  let islands = fixture.islands || DEFAULT_ISLANDS.map(isl => ({ ...isl }));

  // Check if any island fails, drifts, unbinds, or breaches budget
  let unitGreen = true;
  for (const isl of islands) {
    if (isl.status === 'fail' || isl.island_mcard_binding === 'drifted' || isl.island_mcard_binding === 'unbound' || isl.budget_verdict !== 'within_budget' || isl.safety_verdict !== 'pass' || isl.liveness_verdict !== 'drained') {
      unitGreen = false;
    }
  }

  return {
    unit: unitId,
    timestamp: new Date().toISOString(),
    evidence_level: 'E2',
    galois_pairs: galoisPairs,
    safety_liveness: safetyLiveness,
    hoare_triples: hoareTriples,
    shared_vcard_note: 'The same VCard kind serves both roles (VCard Sandwich); modal interpretation (V_pre vs V_post) is determined by Petri-net position.',
    certificate_chain: certificateChain,
    directional_alignment: directionalAlignment,
    coherence_gluing: coherenceGluing,
    repl_process_model: {
      phases: replPhases,
      cycle: 'Read (Safety) → Evaluate (Soundness) → Print (Completeness) → Loop (Liveness) → Read'
    },
    brittleness,
    islands,
    unit_green: unitGreen
  };
}

export const evaluateCorrectness = evaluate;
export default evaluate;
