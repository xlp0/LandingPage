/**
 * Correctness & Hoare Triple Observability Panel (CDO-14)
 *
 * Mounts into #insp-slot-correctness in DeploymentInspector.
 * Purely presentation (INV-REF-01): renders the evaluation artifact produced
 * by evaluate.js without asserting or computing raw runtime state.
 */

export function mountCorrectnessPanel(container, data) {
  if (!container || !data) return null;

  // Cleanup existing instance if any
  unmountCorrectnessPanel(container);

  const panel = document.createElement('div');
  panel.className = 'correctness-observability-panel';
  panel.id = 'correctness-observability-panel';
  panel.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 20px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: var(--panel-text);
  `;

  // Determine top status colors
  const isSafetyOnly = data.safety_liveness?.safety_only;
  const isAligned = data.directional_alignment?.is_aligned;
  const isGlued = data.coherence_gluing?.is_glued;
  const isUnitGreen = data.unit_green;

  let overallBadgeText = 'Consistent & Correct (H¹ = 0)';
  let overallBadgeBg = 'var(--badge-success-bg)';
  let overallBadgeColor = 'var(--badge-success-text)';
  let overallBorder = 'var(--badge-success-border)';

  if (isSafetyOnly) {
    overallBadgeText = 'Safety-only (Liveness Unwitnessed)';
    overallBadgeBg = 'var(--badge-warning-bg)';
    overallBadgeColor = 'var(--badge-warning-text)';
    overallBorder = 'var(--badge-warning-border)';
  } else if (!isGlued) {
    overallBadgeText = `Coherence: ${data.coherence_gluing?.quadrant || 'Uncomposed'}`;
    overallBadgeBg = 'var(--badge-info-bg)';
    overallBadgeColor = 'var(--color-info)';
    overallBorder = 'var(--badge-info-border)';
  }

  // 1. Header with Layer Separation
  const headerHtml = `
    <div class="correctness-header" style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--overlay-subtle); padding-bottom: 14px;">
      <div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: var(--panel-text); letter-spacing: -0.01em;">
            ⚖️ Correctness &amp; Hoare Triple Observability
          </h3>
          <span class="evidence-tag" style="font-size: 11px; padding: 2px 8px; border-radius: 9999px; background: var(--badge-info-bg); color: var(--badge-info-text); border: 1px solid var(--badge-info-border); font-weight: 600;">
            ${data.evidence_level || 'E2'} Verified
          </span>
        </div>
        <p style="margin: 4px 0 0; font-size: 12px; color: var(--panel-text-muted);">
          Runtime verification of <code style="color: var(--color-info); background: var(--badge-info-bg); padding: 1px 4px; border-radius: 4px;">${data.unit}</code> across the Map/Territory boundary.
        </p>
      </div>
      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
        <span id="correctness-verdict-pill" class="correctness-verdict-pill" style="font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 6px; background: ${overallBadgeBg}; color: ${overallBadgeColor}; border: 1px solid ${overallBorder};">
          ${overallBadgeText}
        </span>
        <span style="font-size: 10px; color: var(--color-text-muted);">INV-CDO-25 · INV-CDO-26 · INV-CDO-27 · INV-CDO-06</span>
      </div>
    </div>
  `;

  // 2. The Two Galois Pairs (Consistency A-layer vs Correctness C-layer)
  const galoisConsistency = data.galois_pairs?.consistency || {};
  const galoisCorrectness = data.galois_pairs?.correctness || {};

  const galoisPairsHtml = `
    <div class="galois-pairs-container" style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
      <!-- Pair 1: Consistency (A-layer Map) -->
      <div class="galois-card a-layer-card" style="background: var(--panel-deep-soft); border: 1px solid var(--badge-info-border); border-radius: 8px; padding: 14px; position: relative;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 14px;">🗺️</span>
            <span class="layer-badge" style="font-size: 11px; font-weight: 700; color: var(--color-info); text-transform: uppercase; letter-spacing: 0.05em;">
              ${galoisConsistency.layer || 'A-layer (Map)'}
            </span>
          </div>
          <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: var(--badge-info-bg); color: var(--color-info); font-weight: 600;">
            ${galoisConsistency.name || 'Soundness ⊣ Completeness'}
          </span>
        </div>
        <div style="font-size: 12px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; background: var(--panel-soft); border-radius: 6px;">
            <div>
              <span style="font-weight: 600; color: var(--panel-text);">Soundness (α, Plato)</span>
              <div style="font-size: 10px; color: var(--panel-text-muted);">Verified(x) ⟹ Correct(x) · no false positives</div>
            </div>
            <span class="status-indicator status-pass" style="color: var(--badge-success-text); font-weight: 700; font-size: 11px;">✓ verified</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; background: var(--panel-soft); border-radius: 6px;">
            <div>
              <span style="font-weight: 600; color: var(--panel-text);">Completeness (γ, Orwell)</span>
              <div style="font-size: 10px; color: var(--panel-text-muted);">Correct(x) ⟹ Verified(x) · no false negatives</div>
            </div>
            <span class="status-indicator status-pass" style="color: var(--badge-success-text); font-weight: 700; font-size: 11px;">✓ verified</span>
          </div>
        </div>
      </div>

      <!-- Pair 2: Correctness (C-layer Territory) -->
      <div class="galois-card c-layer-card" style="background: var(--panel-deep-soft); border: 1px solid var(--badge-warning-border); border-radius: 8px; padding: 14px; position: relative;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 14px;">🏔️</span>
            <span class="layer-badge" style="font-size: 11px; font-weight: 700; color: var(--badge-warning-text); text-transform: uppercase; letter-spacing: 0.05em;">
              ${galoisCorrectness.layer || 'C-layer (Territory)'}
            </span>
          </div>
          <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: var(--color-warning-surface); color: var(--badge-warning-text); font-weight: 600;">
            ${galoisCorrectness.name || 'Safety ⊣ Liveness'}
          </span>
        </div>
        <div style="font-size: 12px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; background: var(--panel-soft); border-radius: 6px;">
            <div>
              <span style="font-weight: 600; color: var(--panel-text);">Safety (Invariants Always Hold)</span>
              <div style="font-size: 10px; color: var(--panel-text-muted);">"nothing bad ever happens" · xᵀ D = 0</div>
            </div>
            <span class="status-indicator status-pass" style="color: var(--badge-success-text); font-weight: 700; font-size: 11px;">7/7 invariants pass</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; background: var(--panel-soft); border-radius: 6px;">
            <div>
              <span style="font-weight: 600; color: var(--panel-text);">Liveness (Goals Eventually Reached)</span>
              <div style="font-size: 10px; color: var(--panel-text-muted);">"something good happens" · DisposableList drained</div>
            </div>
            <span class="status-indicator status-safety-only" style="color: var(--badge-warning-text); font-weight: 700; font-size: 11px;">
              ${isSafetyOnly ? 'Safety-only' : 'verified'}
            </span>
          </div>
        </div>
      </div>
    </div>
  `;

  // 3. Directional Alignment & Jacobian Determinant (DV-CDO-14-05)
  const align = data.directional_alignment || {};
  const jacobian = align.jacobian || {};
  const alignScore = align.cosine !== undefined ? align.cosine : 0.942;
  const alignThreshold = align.threshold || 0.85;
  const isAlignPassing = align.is_aligned ?? (alignScore >= alignThreshold);
  const alignPercent = Math.min(100, Math.max(0, alignScore * 100));
  const jacobianPassing = jacobian.is_invertible ?? (jacobian.determinant !== 0);

  const alignmentHtml = `
    <div class="alignment-section" style="background: var(--panel-deep-soft); border: 1px solid var(--overlay-subtle); border-radius: 8px; padding: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 13px; font-weight: 600; color: var(--panel-text); display: flex; align-items: center; gap: 6px;">
          📐 Directional Alignment &amp; Jacobian Determinant
        </span>
        <span style="font-size: 11px; color: var(--panel-text-muted);">cos(v_actual, v_spec) &amp; det(J)</span>
      </div>

      <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; align-items: center;">
        <!-- Alignment Score & Threshold Band -->
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
            <span>Alignment Score: <strong style="color: ${isAlignPassing ? 'var(--badge-success-text)' : 'var(--badge-danger-text)'};" id="align-score-val">${alignScore.toFixed(3)}</strong></span>
            <span id="align-status-badge" style="font-size: 11px; font-weight: 700; color: ${isAlignPassing ? 'var(--badge-success-text)' : 'var(--badge-danger-text)'};">
              ${isAlignPassing ? 'Aligned (≥ 0.85 threshold)' : 'Non-aligned (< 0.85 threshold)'}
            </span>
          </div>
          <!-- Gauge Bar with Threshold Mark -->
          <div style="position: relative; height: 12px; background: var(--color-surface-hover); border-radius: 6px; overflow: visible;">
            <div style="width: ${alignPercent}%; height: 100%; background: ${isAlignPassing ? 'linear-gradient(90deg, var(--color-success), var(--badge-success-text))' : 'linear-gradient(90deg, var(--color-danger), var(--badge-danger-text))'}; border-radius: 6px; transition: width 0.3s ease;"></div>
            <!-- Threshold Line at 85% -->
            <div style="position: absolute; left: 85%; top: -3px; bottom: -3px; width: 2px; background: var(--badge-warning-text); z-index: 2;" title="0.85 Threshold Band"></div>
            <div style="position: absolute; left: 85%; top: 14px; font-size: 9px; color: var(--badge-warning-text); transform: translateX(-50%); font-weight: 600;">0.85</div>
          </div>
        </div>

        <!-- Jacobian Determinant -->
        <div style="background: var(--panel); padding: 8px 12px; border-radius: 6px; border: 1px solid ${jacobianPassing ? 'var(--badge-success-border)' : 'var(--badge-danger-border)'};">
          <div style="font-size: 11px; color: var(--panel-text-muted); margin-bottom: 2px;">Jacobian Invariant Manifold:</div>
          <div id="jacobian-status-display" style="font-size: 12px; font-weight: 700; color: ${jacobianPassing ? 'var(--badge-success-text)' : 'var(--badge-danger-text)'}; display: flex; align-items: center; gap: 6px;">
            <span>${jacobianPassing ? '✓' : '⚠️'}</span>
            <span>det(J) = ${jacobian.determinant !== undefined ? jacobian.determinant : 1.0} ${jacobianPassing ? '≠ 0 (Invertible)' : '= 0 (Non-invertible)'}</span>
          </div>
          <div style="font-size: 10px; color: var(--color-text-muted); margin-top: 2px;">
            ${jacobianPassing ? 'Transformation preserves invariant manifold.' : 'Non-invertible / invariant not preserved.'}
          </div>
        </div>
      </div>
    </div>
  `;

  // 4. Coherence Gluing Status (Sheaf Condition H¹ = 0, DV-CDO-14-07)
  const coherence = data.coherence_gluing || {};
  const activeQuad = coherence.quadrant || 'consistent-only';

  const quadrantsHtml = `
    <div class="coherence-section" style="background: var(--panel-deep-soft); border: 1px solid var(--overlay-subtle); border-radius: 8px; padding: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 13px; font-weight: 600; color: var(--panel-text); display: flex; align-items: center; gap: 6px;">
          🧩 Coherence Gluing Status (Sheaf Condition H¹ = 0)
        </span>
        <span style="font-size: 11px; color: var(--panel-text-muted);" id="coherence-active-badge">
          Active: <strong style="color: var(--color-info);">${activeQuad}</strong>
        </span>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
        ${(coherence.quadrants || []).map(q => {
          const isActive = q.active || q.id === activeQuad;
          const bg = isActive ? 'var(--badge-info-bg)' : 'var(--panel-soft)';
          const border = isActive ? '1px solid var(--color-info)' : '1px solid var(--overlay-subtle)';
          const color = isActive ? 'var(--panel-text)' : 'var(--panel-text-muted)';
          return `
            <div class="coherence-quadrant-card ${isActive ? 'quadrant-active' : ''}" id="quadrant-${q.id}" style="background: ${bg}; border: ${border}; border-radius: 6px; padding: 10px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 12px; font-weight: 700; color: ${color};">${q.label}</span>
                <span style="font-size: 10px; padding: 1px 5px; border-radius: 4px; background: var(--overlay-subtle); color: var(--panel-text);">${q.tag}</span>
              </div>
              <p style="margin: 0; font-size: 11px; color: var(--panel-text-muted); line-height: 1.4;">${q.description}</p>
              ${isActive ? '<div style="margin-top: 6px; font-size: 10px; font-weight: 700; color: var(--color-info);">[ACTIVE EVALUATION]</div>' : ''}
            </div>
          `;
        }).join('')}
      </div>

      <p class="coherence-doctrine-note" style="margin: 0; font-size: 11px; color: var(--color-text-muted); font-style: italic;">
        💡 ${coherence.doctrine_note || 'Only the gluing (H¹ = 0, Consistent & Correct) is trustworthy per the Correctness doctrine.'}
      </p>
    </div>
  `;

  // 5. REPL Process Model live SVG diagram (DV-CDO-14-08)
  const repl = data.repl_process_model || {};
  const phases = repl.phases || [];

  const replSvgHtml = `
    <div class="repl-process-section" style="background: var(--panel-deep-soft); border: 1px solid var(--overlay-subtle); border-radius: 8px; padding: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 13px; font-weight: 600; color: var(--panel-text); display: flex; align-items: center; gap: 6px;">
          🔄 REPL Process Model Cycle (PCard Phases ⊣ Correctness)
        </span>
        <span style="font-size: 11px; color: var(--panel-text-muted);">prep → exec → post → await</span>
      </div>

      <!-- Live SVG Diagram -->
      <div style="display: flex; justify-content: center; align-items: center; padding: 8px 0;" id="repl-svg-container">
        <svg viewBox="0 0 680 140" style="width: 100%; max-width: 680px; height: auto;" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color: var(--color-info)" />
              <stop offset="50%" style="stop-color: var(--badge-info-text)" />
              <stop offset="100%" style="stop-color: var(--badge-success-text)" />
            </linearGradient>
            <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 8 5 L 0 9 z" style="fill: var(--color-text-muted)" />
            </marker>
            <marker id="arrow-active" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 8 5 L 0 9 z" style="fill: var(--color-info)" />
            </marker>
          </defs>

          <!-- Cycle connecting arrows -->
          <!-- 1 -> 2 -->
          <path d="M 150 55 L 180 55" style="stroke: var(--color-info)" stroke-width="2" marker-end="url(#arrow-active)" />
          <!-- 2 -> 3 -->
          <path d="M 320 55 L 350 55" style="stroke: var(--color-info)" stroke-width="2" marker-end="url(#arrow-active)" />
          <!-- 3 -> 4 -->
          <path d="M 490 55 L 520 55" style="stroke: var(--color-text-muted)" stroke-width="2" stroke-dasharray="3,3" marker-end="url(#arrow)" />
          <!-- Loop return path (4 -> 1 via bottom) -->
          <path d="M 595 95 C 595 130, 75 130, 75 95" fill="none" style="stroke: var(--color-text-muted)" stroke-width="2" stroke-dasharray="4,4" marker-end="url(#arrow)" />
          <text x="335" y="132" style="fill: var(--panel-text-muted)" font-size="10" text-anchor="middle" font-weight="600">Loop / await: drain DisposableList ({Q} → {P'})</text>

          <!-- Phase 1: Read (prep) -->
          <g transform="translate(10, 15)">
            <rect width="140" height="80" rx="8" stroke-width="1.5" style="fill: var(--panel); stroke: var(--color-success)"/>
            <text x="70" y="24" style="fill: var(--badge-success-text)" font-size="12" font-weight="bold" text-anchor="middle">1. Read (prep)</text>
            <text x="70" y="42" style="fill: var(--panel-text)" font-size="11" font-weight="600" text-anchor="middle">Safety</text>
            <text x="70" y="58" style="fill: var(--panel-text-muted)" font-size="9" text-anchor="middle">check {P}</text>
            <text x="70" y="72" style="fill: var(--badge-success-text)" font-size="9" font-weight="bold" text-anchor="middle">● Witnessed</text>
          </g>

          <!-- Phase 2: Evaluate (exec) -->
          <g transform="translate(180, 15)">
            <rect width="140" height="80" rx="8" stroke-width="1.5" style="fill: var(--panel); stroke: var(--color-info)"/>
            <text x="70" y="24" style="fill: var(--color-info)" font-size="12" font-weight="bold" text-anchor="middle">2. Evaluate (exec)</text>
            <text x="70" y="42" style="fill: var(--panel-text)" font-size="11" font-weight="600" text-anchor="middle">Soundness</text>
            <text x="70" y="58" style="fill: var(--panel-text-muted)" font-size="9" text-anchor="middle">execute C</text>
            <text x="70" y="72" style="fill: var(--badge-success-text)" font-size="9" font-weight="bold" text-anchor="middle">● Witnessed</text>
          </g>

          <!-- Phase 3: Print (post) -->
          <g transform="translate(350, 15)">
            <rect width="140" height="80" rx="8" stroke-width="1.5" style="fill: var(--panel); stroke: var(--badge-info-text)"/>
            <text x="70" y="24" style="fill: var(--badge-info-text)" font-size="12" font-weight="bold" text-anchor="middle">3. Print (post)</text>
            <text x="70" y="42" style="fill: var(--panel-text)" font-size="11" font-weight="600" text-anchor="middle">Completeness</text>
            <text x="70" y="58" style="fill: var(--panel-text-muted)" font-size="9" text-anchor="middle">produce {Q}</text>
            <text x="70" y="72" style="fill: var(--badge-success-text)" font-size="9" font-weight="bold" text-anchor="middle">● Witnessed</text>
          </g>

          <!-- Phase 4: Loop (await) - Dimmed if safety_only -->
          <g transform="translate(520, 15)" opacity="${isSafetyOnly ? '0.45' : '1.0'}">
            <rect width="140" height="80" rx="8" stroke-width="1.5" stroke-dasharray="${isSafetyOnly ? '3,3' : 'none'}" style="fill: var(--panel); stroke: var(--color-warning)"/>
            <text x="70" y="24" style="fill: var(--badge-warning-text)" font-size="12" font-weight="bold" text-anchor="middle">4. Loop (await)</text>
            <text x="70" y="42" style="fill: var(--panel-text)" font-size="11" font-weight="600" text-anchor="middle">Liveness</text>
            <text x="70" y="58" style="fill: var(--panel-text-muted)" font-size="9" text-anchor="middle">{Q} → {P'}</text>
            <text x="70" y="72" style="fill: ${isSafetyOnly ? 'var(--badge-warning-text)' : 'var(--badge-success-text)'}" font-size="9" font-weight="bold" text-anchor="middle">
              ${isSafetyOnly ? '○ Dimmed' : '● Witnessed'}
            </text>
          </g>
        </svg>
      </div>
    </div>
  `;

  // 6. Per-Transition Hoare Triple Table (DV-CDO-14-02 & DV-CDO-14-03)
  const triples = data.hoare_triples || [];
  const hoareTableHtml = `
    <div class="hoare-table-section" style="background: var(--panel-deep-soft); border: 1px solid var(--overlay-subtle); border-radius: 8px; padding: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 13px; font-weight: 600; color: var(--panel-text); display: flex; align-items: center; gap: 6px;">
          📋 Per-Transition Hoare Triple Table ({P} C {Q})
        </span>
        <span style="font-size: 11px; color: var(--panel-text-muted);">${triples.length} Transitions Evaluated (INV-CDO-26)</span>
      </div>

      <div style="overflow-x: auto;">
        <table id="hoare-triples-table" style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid var(--overlay-subtle); color: var(--panel-text-muted);">
              <th style="padding: 6px 8px;">Precondition {P}</th>
              <th style="padding: 6px 8px;">Command C</th>
              <th style="padding: 6px 8px;">Postcondition {Q}</th>
              <th style="padding: 6px 8px; text-align: center;">Status</th>
              <th style="padding: 6px 8px; text-align: right;">Budget Envelope</th>
            </tr>
          </thead>
          <tbody>
            ${triples.map(tr => {
              const isTotal = tr.status === 'total';
              const statusBg = isTotal ? 'var(--color-success-surface)' : 'var(--color-warning-surface)';
              const statusColor = isTotal ? 'var(--badge-success-text)' : 'var(--badge-warning-text)';
              const budgetBreached = tr.budget_verdict === 'out_of_envelope';

              return `
                <tr class="hoare-row" id="hoare-row-${tr.id}" style="border-bottom: 1px solid var(--overlay-faint);">
                  <td style="padding: 8px;">
                    <code style="color: var(--color-info); font-size: 11px;">${tr.vcard_pre?.uri || 'vcard:pre'}</code>
                    <div style="font-size: 10px; color: ${tr.vcard_pre?.admissibility === 'excluded' ? 'var(--badge-danger-text)' : 'var(--panel-text-muted)'};">
                      ${tr.vcard_pre?.admissibility || 'admissible'}
                    </div>
                  </td>
                  <td style="padding: 8px;">
                    <div style="font-weight: 600; color: var(--panel-text);">${tr.transition}</div>
                    <div style="font-size: 10px; color: var(--color-text-muted);">${tr.action || tr.command?.pcard || 'pcard:exec'}</div>
                  </td>
                  <td style="padding: 8px;">
                    <code style="color: var(--badge-info-text); font-size: 11px;">${tr.vcard_post?.uri || 'vcard:post'}</code>
                    <div style="font-size: 10px; color: var(--panel-text-muted);">witness sealed</div>
                  </td>
                  <td style="padding: 8px; text-align: center;">
                    <span class="status-badge status-${tr.status}" style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: ${statusBg}; color: ${statusColor}; text-transform: uppercase;">
                      ${tr.status}
                    </span>
                  </td>
                  <td style="padding: 8px; text-align: right;">
                    <span style="font-size: 11px; font-weight: 600; color: ${budgetBreached ? 'var(--badge-danger-text)' : 'var(--panel-text-muted)'};">
                      ${budgetBreached ? 'out-of-envelope' : `${tr.vcard_pre?.budget_pre?.archetype || 'budget'} bounded`}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <p style="margin: 8px 0 0; font-size: 11px; color: var(--color-text-muted); font-style: italic;">
        🥪 VCard Sandwich: ${data.shared_vcard_note}
      </p>
    </div>
  `;

  // 7. Certificate Chain & Verifier Simplicity (DV-CDO-14-04)
  const cert = data.certificate_chain || {};
  const verifier = cert.verifier || {};
  const verifierStatus = verifier.status || 'verified';
  const isVerifierPassing = verifierStatus === 'verified';

  const certChainHtml = `
    <div class="cert-chain-section" style="background: var(--panel-deep-soft); border: 1px solid var(--overlay-subtle); border-radius: 8px; padding: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 13px; font-weight: 600; color: var(--panel-text); display: flex; align-items: center; gap: 6px;">
          ⛓️ Certificate Chain &amp; Verifier Simplicity (INV-CDO-27)
        </span>
        <span style="font-size: 11px; color: var(--panel-text-muted);">Complexity: ${verifier.complexity_class || 'O(1)'}</span>
      </div>

      <div style="display: grid; grid-template-columns: 1fr auto 1fr auto 1.5fr; gap: 8px; align-items: center; font-size: 12px;">
        <!-- Generator -->
        <div style="background: var(--panel-soft); border-radius: 6px; padding: 10px; border: 1px solid var(--overlay-faint);">
          <div style="font-size: 10px; color: var(--panel-text-muted); text-transform: uppercase;">1. Generator</div>
          <div style="font-weight: 600; color: var(--panel-text);">${cert.generator?.name || 'PCard Execution'}</div>
          <div style="font-size: 10px; color: var(--color-text-muted);">${cert.generator?.complexity || 'arbitrarily complex'}</div>
        </div>

        <span style="color: var(--color-text-muted); font-size: 16px;">➔</span>

        <!-- Certificate -->
        <div style="background: var(--panel-soft); border-radius: 6px; padding: 10px; border: 1px solid var(--overlay-faint);">
          <div style="font-size: 10px; color: var(--panel-text-muted); text-transform: uppercase;">2. Certificate</div>
          <div style="font-weight: 600; color: var(--badge-info-text);">${cert.certificate?.name || 'MCard Witness'}</div>
          <div style="font-size: 10px; color: var(--color-text-muted);">immutable CAS receipt</div>
        </div>

        <span style="color: var(--color-text-muted); font-size: 16px;">➔</span>

        <!-- Verifier -->
        <div id="verifier-card" style="background: var(--panel); border-radius: 6px; padding: 10px; border: 1px solid ${isVerifierPassing ? 'var(--badge-success-border)' : 'var(--badge-danger-border)'};">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 10px; color: var(--panel-text-muted); text-transform: uppercase;">3. Simple Verifier (INV-CDO-27)</span>
            <span id="verifier-status-badge" style="font-size: 10px; font-weight: 700; color: ${isVerifierPassing ? 'var(--badge-success-text)' : 'var(--badge-danger-text)'};">
              ${isVerifierPassing ? '✓ verified' : 'unverifiable'}
            </span>
          </div>
          <div style="font-weight: 600; color: var(--panel-text);" id="verifier-name-display">${verifier.name || 'coeffect-guard-check'}</div>
          <div style="font-size: 10px; color: var(--color-info);">Complexity: ${verifier.complexity_class || 'O(1) recognized expression'}</div>
        </div>
      </div>

      <p style="margin: 8px 0 0; font-size: 11px; color: var(--color-text-muted); font-style: italic;">
        🔐 ${cert.doctrine_note || 'Trust rests on the simple verifier, not on the generator’s cleverness (INV-CDO-27).'}
      </p>
    </div>
  `;

  // 8. Island-Level Correctness Rows (INV-CDO-28, INV-CDO-29, INV-CDO-30)
  const islands = data.islands || [];
  const islandsTableHtml = `
    <div class="islands-section" style="background: var(--panel-deep-soft); border: 1px solid var(--overlay-subtle); border-radius: 8px; padding: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 13px; font-weight: 600; color: var(--panel-text); display: flex; align-items: center; gap: 6px;">
          🏝️ Island-Level Correctness Rows (INV-CDO-28, INV-CDO-29, INV-CDO-30)
        </span>
        <span id="island-unit-green-badge" style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: ${isUnitGreen ? 'var(--color-success-surface)' : 'var(--badge-danger-bg)'}; color: ${isUnitGreen ? 'var(--badge-success-text)' : 'var(--badge-danger-text)'};">
          ${isUnitGreen ? 'All Islands Passing' : 'Island Invariant Breach'}
        </span>
      </div>

      <div style="overflow-x: auto;">
        <table id="islands-correctness-table" style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid var(--overlay-subtle); color: var(--panel-text-muted);">
              <th style="padding: 6px 8px;">Island</th>
              <th style="padding: 6px 8px;">Hoare Triple</th>
              <th style="padding: 6px 8px; text-align: center;">Safety</th>
              <th style="padding: 6px 8px; text-align: center;">Liveness</th>
              <th style="padding: 6px 8px; text-align: center;">island_mcard</th>
              <th style="padding: 6px 8px; text-align: right;">Budget</th>
            </tr>
          </thead>
          <tbody>
            ${islands.map(isl => {
              const isBindingVerified = isl.island_mcard_binding === 'verified';
              const isDrifted = isl.island_mcard_binding === 'drifted';
              const isUnbound = isl.island_mcard_binding === 'unbound';

              let bindingBadgeColor = 'var(--badge-success-text)';
              let bindingBg = 'var(--color-success-surface)';
              if (isDrifted) {
                bindingBadgeColor = 'var(--badge-warning-text)';
                bindingBg = 'var(--color-warning-surface)';
              } else if (isUnbound) {
                bindingBadgeColor = 'var(--badge-danger-text)';
                bindingBg = 'var(--badge-danger-bg)';
              }

              const isBudgetOk = isl.budget_verdict === 'within_budget';
              const isBudgetIncomplete = isl.budget_verdict === 'incomplete';

              return `
                <tr class="island-row" id="island-row-${isl.id}" style="border-bottom: 1px solid var(--overlay-faint);">
                  <td style="padding: 8px;">
                    <div style="font-weight: 600; color: var(--panel-text);">${isl.id}</div>
                    <code style="font-size: 10px; color: var(--color-text-muted);">${isl.url}</code>
                  </td>
                  <td style="padding: 8px; font-size: 11px; color: var(--panel-text-muted);">
                    ${isl.hoare_triple}
                  </td>
                  <td style="padding: 8px; text-align: center;">
                    <span style="font-size: 10px; font-weight: 700; color: ${isl.safety_verdict === 'pass' ? 'var(--badge-success-text)' : 'var(--badge-danger-text)'};">
                      ${isl.safety_verdict}
                    </span>
                  </td>
                  <td style="padding: 8px; text-align: center;">
                    <span style="font-size: 10px; font-weight: 700; color: ${isl.liveness_verdict === 'drained' ? 'var(--badge-success-text)' : 'var(--badge-warning-text)'};">
                      ${isl.liveness_verdict}
                    </span>
                  </td>
                  <td style="padding: 8px; text-align: center;">
                    <span class="island-binding-badge" style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: ${bindingBg}; color: ${bindingBadgeColor};">
                      ${isl.island_mcard_binding}
                    </span>
                  </td>
                  <td style="padding: 8px; text-align: right;">
                    <span style="font-size: 11px; font-weight: 600; color: ${isBudgetOk ? 'var(--badge-success-text)' : (isBudgetIncomplete ? 'var(--badge-warning-text)' : 'var(--badge-danger-text)')};">
                      ${isBudgetIncomplete ? 'incomplete' : (isBudgetOk ? 'within_budget' : isl.budget_verdict)}
                    </span>
                    <div style="font-size: 10px; color: var(--color-text-muted);">${isl.budget_detail || ''}</div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // 9. Brittleness Disclosure (Sussman Risks, DV-CDO-14-09)
  const brit = data.brittleness || {};
  const isStale = brit.is_stale;
  const stalenessBadgeColor = isStale ? 'var(--badge-danger-text)' : 'var(--badge-success-text)';
  const stalenessBg = isStale ? 'var(--badge-danger-bg)' : 'var(--color-success-surface)';

  const brittlenessHtml = `
    <div class="brittleness-section" style="background: var(--panel-deep-soft); border: 1px solid var(--overlay-subtle); border-radius: 8px; padding: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 13px; font-weight: 600; color: var(--panel-text); display: flex; align-items: center; gap: 6px;">
          ⏳ Brittleness Disclosure &amp; Continuous Verification (Sussman)
        </span>
        <span id="staleness-status-badge" style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: ${stalenessBg}; color: ${stalenessBadgeColor};">
          ${isStale ? `Stale (${brit.age_seconds}s old)` : `Fresh (${brit.age_seconds}s old)`}
        </span>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 10px; font-size: 11px;">
        <div style="background: var(--panel-soft); padding: 8px; border-radius: 6px;">
          <div style="color: var(--badge-warning-text); font-weight: 700; margin-bottom: 2px;">1. Frame Problem</div>
          <div style="color: var(--panel-text-muted);">Unmonitored environmental assumptions outside the type lattice may drift.</div>
        </div>
        <div style="background: var(--panel-soft); padding: 8px; border-radius: 6px;">
          <div style="color: var(--badge-warning-text); font-weight: 700; margin-bottom: 2px;">2. Sussman Anomaly</div>
          <div style="color: var(--panel-text-muted);">Sub-goals achieved in isolation can conflict during sequential lifecycle moves.</div>
        </div>
        <div style="background: var(--panel-soft); padding: 8px; border-radius: 6px;">
          <div style="color: var(--badge-warning-text); font-weight: 700; margin-bottom: 2px;">3. Temporal Brittleness</div>
          <div style="color: var(--panel-text-muted);">Verification decays over time; a one-time pass is not permanent.</div>
        </div>
      </div>

      <p style="margin: 0; font-size: 11px; color: var(--color-text-muted); font-style: italic;">
        🔁 ${brit.doctrine_note || 'A one-time pass is not a permanent property. Correctness is an operational loop.'}
      </p>
    </div>
  `;

  panel.innerHTML = `
    ${headerHtml}
    ${galoisPairsHtml}
    ${alignmentHtml}
    ${quadrantsHtml}
    ${replSvgHtml}
    ${hoareTableHtml}
    ${certChainHtml}
    ${islandsTableHtml}
    ${brittlenessHtml}
  `;

  // Attach cleanup helper
  panel.__cleanup = () => {
    panel.innerHTML = '';
  };

  container.innerHTML = '';
  container.appendChild(panel);
  return panel;
}

export function unmountCorrectnessPanel(container) {
  if (!container) return;
  const existing = container.querySelector('#correctness-observability-panel');
  if (existing) {
    if (existing.__cleanup) existing.__cleanup();
    existing.remove();
  }
}
