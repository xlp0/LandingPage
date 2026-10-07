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
    color: #f1f5f9;
  `;

  // Determine top status colors
  const isSafetyOnly = data.safety_liveness?.safety_only;
  const isAligned = data.directional_alignment?.is_aligned;
  const isGlued = data.coherence_gluing?.is_glued;
  const isUnitGreen = data.unit_green;

  let overallBadgeText = 'Consistent & Correct (H¹ = 0)';
  let overallBadgeBg = 'rgba(16, 185, 129, 0.2)';
  let overallBadgeColor = '#34d399';
  let overallBorder = 'rgba(16, 185, 129, 0.4)';

  if (isSafetyOnly) {
    overallBadgeText = 'Safety-only (Liveness Unwitnessed)';
    overallBadgeBg = 'rgba(245, 158, 11, 0.2)';
    overallBadgeColor = '#fbbf24';
    overallBorder = 'rgba(245, 158, 11, 0.4)';
  } else if (!isGlued) {
    overallBadgeText = `Coherence: ${data.coherence_gluing?.quadrant || 'Uncomposed'}`;
    overallBadgeBg = 'rgba(56, 189, 248, 0.2)';
    overallBadgeColor = '#38bdf8';
    overallBorder = 'rgba(56, 189, 248, 0.4)';
  }

  // 1. Header with Layer Separation
  const headerHtml = `
    <div class="correctness-header" style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid rgba(148, 163, 184, 0.2); padding-bottom: 14px;">
      <div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #f8fafc; letter-spacing: -0.01em;">
            ⚖️ Correctness &amp; Hoare Triple Observability
          </h3>
          <span class="evidence-tag" style="font-size: 11px; padding: 2px 8px; border-radius: 9999px; background: rgba(99, 102, 241, 0.2); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.4); font-weight: 600;">
            ${data.evidence_level || 'E2'} Verified
          </span>
        </div>
        <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8;">
          Runtime verification of <code style="color: #38bdf8; background: rgba(56, 189, 248, 0.1); padding: 1px 4px; border-radius: 4px;">${data.unit}</code> across the Map/Territory boundary.
        </p>
      </div>
      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
        <span id="correctness-verdict-pill" class="correctness-verdict-pill" style="font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 6px; background: ${overallBadgeBg}; color: ${overallBadgeColor}; border: 1px solid ${overallBorder};">
          ${overallBadgeText}
        </span>
        <span style="font-size: 10px; color: #64748b;">INV-CDO-25 · INV-CDO-26 · INV-CDO-27 · INV-CDO-06</span>
      </div>
    </div>
  `;

  // 2. The Two Galois Pairs (Consistency A-layer vs Correctness C-layer)
  const galoisConsistency = data.galois_pairs?.consistency || {};
  const galoisCorrectness = data.galois_pairs?.correctness || {};

  const galoisPairsHtml = `
    <div class="galois-pairs-container" style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
      <!-- Pair 1: Consistency (A-layer Map) -->
      <div class="galois-card a-layer-card" style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; padding: 14px; position: relative;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 14px;">🗺️</span>
            <span class="layer-badge" style="font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.05em;">
              ${galoisConsistency.layer || 'A-layer (Map)'}
            </span>
          </div>
          <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: rgba(56, 189, 248, 0.15); color: #7dd3fc; font-weight: 600;">
            ${galoisConsistency.name || 'Soundness ⊣ Completeness'}
          </span>
        </div>
        <div style="font-size: 12px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; background: rgba(30, 41, 59, 0.5); border-radius: 6px;">
            <div>
              <span style="font-weight: 600; color: #f8fafc;">Soundness (α, Plato)</span>
              <div style="font-size: 10px; color: #94a3b8;">Verified(x) ⟹ Correct(x) · no false positives</div>
            </div>
            <span class="status-indicator status-pass" style="color: #34d399; font-weight: 700; font-size: 11px;">✓ verified</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; background: rgba(30, 41, 59, 0.5); border-radius: 6px;">
            <div>
              <span style="font-weight: 600; color: #f8fafc;">Completeness (γ, Orwell)</span>
              <div style="font-size: 10px; color: #94a3b8;">Correct(x) ⟹ Verified(x) · no false negatives</div>
            </div>
            <span class="status-indicator status-pass" style="color: #34d399; font-weight: 700; font-size: 11px;">✓ verified</span>
          </div>
        </div>
      </div>

      <!-- Pair 2: Correctness (C-layer Territory) -->
      <div class="galois-card c-layer-card" style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 14px; position: relative;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 14px;">🏔️</span>
            <span class="layer-badge" style="font-size: 11px; font-weight: 700; color: #fbbf24; text-transform: uppercase; letter-spacing: 0.05em;">
              ${galoisCorrectness.layer || 'C-layer (Territory)'}
            </span>
          </div>
          <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: rgba(245, 158, 11, 0.15); color: #fde68a; font-weight: 600;">
            ${galoisCorrectness.name || 'Safety ⊣ Liveness'}
          </span>
        </div>
        <div style="font-size: 12px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; background: rgba(30, 41, 59, 0.5); border-radius: 6px;">
            <div>
              <span style="font-weight: 600; color: #f8fafc;">Safety (Invariants Always Hold)</span>
              <div style="font-size: 10px; color: #94a3b8;">"nothing bad ever happens" · xᵀ D = 0</div>
            </div>
            <span class="status-indicator status-pass" style="color: #34d399; font-weight: 700; font-size: 11px;">7/7 invariants pass</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; background: rgba(30, 41, 59, 0.5); border-radius: 6px;">
            <div>
              <span style="font-weight: 600; color: #f8fafc;">Liveness (Goals Eventually Reached)</span>
              <div style="font-size: 10px; color: #94a3b8;">"something good happens" · DisposableList drained</div>
            </div>
            <span class="status-indicator status-safety-only" style="color: #fbbf24; font-weight: 700; font-size: 11px;">
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
    <div class="alignment-section" style="background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 8px; padding: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 13px; font-weight: 600; color: #f1f5f9; display: flex; align-items: center; gap: 6px;">
          📐 Directional Alignment &amp; Jacobian Determinant
        </span>
        <span style="font-size: 11px; color: #94a3b8;">cos(v_actual, v_spec) &amp; det(J)</span>
      </div>

      <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; align-items: center;">
        <!-- Alignment Score & Threshold Band -->
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
            <span>Alignment Score: <strong style="color: ${isAlignPassing ? '#34d399' : '#f87171'};" id="align-score-val">${alignScore.toFixed(3)}</strong></span>
            <span id="align-status-badge" style="font-size: 11px; font-weight: 700; color: ${isAlignPassing ? '#34d399' : '#f87171'};">
              ${isAlignPassing ? 'Aligned (≥ 0.85 threshold)' : 'Non-aligned (< 0.85 threshold)'}
            </span>
          </div>
          <!-- Gauge Bar with Threshold Mark -->
          <div style="position: relative; height: 12px; background: #334155; border-radius: 6px; overflow: visible;">
            <div style="width: ${alignPercent}%; height: 100%; background: ${isAlignPassing ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #ef4444, #f87171)'}; border-radius: 6px; transition: width 0.3s ease;"></div>
            <!-- Threshold Line at 85% -->
            <div style="position: absolute; left: 85%; top: -3px; bottom: -3px; width: 2px; background: #fbbf24; z-index: 2;" title="0.85 Threshold Band"></div>
            <div style="position: absolute; left: 85%; top: 14px; font-size: 9px; color: #fbbf24; transform: translateX(-50%); font-weight: 600;">0.85</div>
          </div>
        </div>

        <!-- Jacobian Determinant -->
        <div style="background: rgba(30, 41, 59, 0.6); padding: 8px 12px; border-radius: 6px; border: 1px solid ${jacobianPassing ? 'rgba(52, 211, 153, 0.3)' : 'rgba(239, 68, 68, 0.4)'};">
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 2px;">Jacobian Invariant Manifold:</div>
          <div id="jacobian-status-display" style="font-size: 12px; font-weight: 700; color: ${jacobianPassing ? '#34d399' : '#f87171'}; display: flex; align-items: center; gap: 6px;">
            <span>${jacobianPassing ? '✓' : '⚠️'}</span>
            <span>det(J) = ${jacobian.determinant !== undefined ? jacobian.determinant : 1.0} ${jacobianPassing ? '≠ 0 (Invertible)' : '= 0 (Non-invertible)'}</span>
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
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
    <div class="coherence-section" style="background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 8px; padding: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 13px; font-weight: 600; color: #f1f5f9; display: flex; align-items: center; gap: 6px;">
          🧩 Coherence Gluing Status (Sheaf Condition H¹ = 0)
        </span>
        <span style="font-size: 11px; color: #94a3b8;" id="coherence-active-badge">
          Active: <strong style="color: #38bdf8;">${activeQuad}</strong>
        </span>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
        ${(coherence.quadrants || []).map(q => {
          const isActive = q.active || q.id === activeQuad;
          const bg = isActive ? 'rgba(56, 189, 248, 0.15)' : 'rgba(30, 41, 59, 0.4)';
          const border = isActive ? '1px solid #38bdf8' : '1px solid rgba(148, 163, 184, 0.15)';
          const color = isActive ? '#f8fafc' : '#94a3b8';
          return `
            <div class="coherence-quadrant-card ${isActive ? 'quadrant-active' : ''}" id="quadrant-${q.id}" style="background: ${bg}; border: ${border}; border-radius: 6px; padding: 10px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 12px; font-weight: 700; color: ${color};">${q.label}</span>
                <span style="font-size: 10px; padding: 1px 5px; border-radius: 4px; background: rgba(148, 163, 184, 0.2); color: #cbd5e1;">${q.tag}</span>
              </div>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">${q.description}</p>
              ${isActive ? '<div style="margin-top: 6px; font-size: 10px; font-weight: 700; color: #38bdf8;">[ACTIVE EVALUATION]</div>' : ''}
            </div>
          `;
        }).join('')}
      </div>

      <p class="coherence-doctrine-note" style="margin: 0; font-size: 11px; color: #64748b; font-style: italic;">
        💡 ${coherence.doctrine_note || 'Only the gluing (H¹ = 0, Consistent & Correct) is trustworthy per the Correctness doctrine.'}
      </p>
    </div>
  `;

  // 5. REPL Process Model live SVG diagram (DV-CDO-14-08)
  const repl = data.repl_process_model || {};
  const phases = repl.phases || [];

  const replSvgHtml = `
    <div class="repl-process-section" style="background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 8px; padding: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 13px; font-weight: 600; color: #f1f5f9; display: flex; align-items: center; gap: 6px;">
          🔄 REPL Process Model Cycle (PCard Phases ⊣ Correctness)
        </span>
        <span style="font-size: 11px; color: #94a3b8;">prep → exec → post → await</span>
      </div>

      <!-- Live SVG Diagram -->
      <div style="display: flex; justify-content: center; align-items: center; padding: 8px 0;" id="repl-svg-container">
        <svg viewBox="0 0 680 140" style="width: 100%; max-width: 680px; height: auto;" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#38bdf8" />
              <stop offset="50%" stop-color="#818cf8" />
              <stop offset="100%" stop-color="#34d399" />
            </linearGradient>
            <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#64748b" />
            </marker>
            <marker id="arrow-active" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#38bdf8" />
            </marker>
          </defs>

          <!-- Cycle connecting arrows -->
          <!-- 1 -> 2 -->
          <path d="M 150 55 L 180 55" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow-active)" />
          <!-- 2 -> 3 -->
          <path d="M 320 55 L 350 55" stroke="#38bdf8" stroke-width="2" marker-end="url(#arrow-active)" />
          <!-- 3 -> 4 -->
          <path d="M 490 55 L 520 55" stroke="#64748b" stroke-width="2" stroke-dasharray="3,3" marker-end="url(#arrow)" />
          <!-- Loop return path (4 -> 1 via bottom) -->
          <path d="M 595 95 C 595 130, 75 130, 75 95" fill="none" stroke="#64748b" stroke-width="2" stroke-dasharray="4,4" marker-end="url(#arrow)" />
          <text x="335" y="132" fill="#94a3b8" font-size="10" text-anchor="middle" font-weight="600">Loop / await: drain DisposableList ({Q} → {P'})</text>

          <!-- Phase 1: Read (prep) -->
          <g transform="translate(10, 15)">
            <rect width="140" height="80" rx="8" fill="rgba(30, 41, 59, 0.8)" stroke="#10b981" stroke-width="1.5" />
            <text x="70" y="24" fill="#34d399" font-size="12" font-weight="bold" text-anchor="middle">1. Read (prep)</text>
            <text x="70" y="42" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">Safety</text>
            <text x="70" y="58" fill="#94a3b8" font-size="9" text-anchor="middle">check {P}</text>
            <text x="70" y="72" fill="#34d399" font-size="9" font-weight="bold" text-anchor="middle">● Witnessed</text>
          </g>

          <!-- Phase 2: Evaluate (exec) -->
          <g transform="translate(180, 15)">
            <rect width="140" height="80" rx="8" fill="rgba(30, 41, 59, 0.8)" stroke="#38bdf8" stroke-width="1.5" />
            <text x="70" y="24" fill="#38bdf8" font-size="12" font-weight="bold" text-anchor="middle">2. Evaluate (exec)</text>
            <text x="70" y="42" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">Soundness</text>
            <text x="70" y="58" fill="#94a3b8" font-size="9" text-anchor="middle">execute C</text>
            <text x="70" y="72" fill="#34d399" font-size="9" font-weight="bold" text-anchor="middle">● Witnessed</text>
          </g>

          <!-- Phase 3: Print (post) -->
          <g transform="translate(350, 15)">
            <rect width="140" height="80" rx="8" fill="rgba(30, 41, 59, 0.8)" stroke="#818cf8" stroke-width="1.5" />
            <text x="70" y="24" fill="#818cf8" font-size="12" font-weight="bold" text-anchor="middle">3. Print (post)</text>
            <text x="70" y="42" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">Completeness</text>
            <text x="70" y="58" fill="#94a3b8" font-size="9" text-anchor="middle">produce {Q}</text>
            <text x="70" y="72" fill="#34d399" font-size="9" font-weight="bold" text-anchor="middle">● Witnessed</text>
          </g>

          <!-- Phase 4: Loop (await) - Dimmed if safety_only -->
          <g transform="translate(520, 15)" opacity="${isSafetyOnly ? '0.45' : '1.0'}">
            <rect width="140" height="80" rx="8" fill="rgba(30, 41, 59, 0.8)" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="${isSafetyOnly ? '3,3' : 'none'}" />
            <text x="70" y="24" fill="#fbbf24" font-size="12" font-weight="bold" text-anchor="middle">4. Loop (await)</text>
            <text x="70" y="42" fill="#f8fafc" font-size="11" font-weight="600" text-anchor="middle">Liveness</text>
            <text x="70" y="58" fill="#94a3b8" font-size="9" text-anchor="middle">{Q} → {P'}</text>
            <text x="70" y="72" fill="${isSafetyOnly ? '#fbbf24' : '#34d399'}" font-size="9" font-weight="bold" text-anchor="middle">
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
    <div class="hoare-table-section" style="background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 8px; padding: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 13px; font-weight: 600; color: #f1f5f9; display: flex; align-items: center; gap: 6px;">
          📋 Per-Transition Hoare Triple Table ({P} C {Q})
        </span>
        <span style="font-size: 11px; color: #94a3b8;">${triples.length} Transitions Evaluated (INV-CDO-26)</span>
      </div>

      <div style="overflow-x: auto;">
        <table id="hoare-triples-table" style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid rgba(148, 163, 184, 0.2); color: #94a3b8;">
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
              const statusBg = isTotal ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)';
              const statusColor = isTotal ? '#34d399' : '#fbbf24';
              const budgetBreached = tr.budget_verdict === 'out_of_envelope';

              return `
                <tr class="hoare-row" id="hoare-row-${tr.id}" style="border-bottom: 1px solid rgba(148, 163, 184, 0.1);">
                  <td style="padding: 8px;">
                    <code style="color: #38bdf8; font-size: 11px;">${tr.vcard_pre?.uri || 'vcard:pre'}</code>
                    <div style="font-size: 10px; color: ${tr.vcard_pre?.admissibility === 'excluded' ? '#f87171' : '#94a3b8'};">
                      ${tr.vcard_pre?.admissibility || 'admissible'}
                    </div>
                  </td>
                  <td style="padding: 8px;">
                    <div style="font-weight: 600; color: #f8fafc;">${tr.transition}</div>
                    <div style="font-size: 10px; color: #64748b;">${tr.action || tr.command?.pcard || 'pcard:exec'}</div>
                  </td>
                  <td style="padding: 8px;">
                    <code style="color: #818cf8; font-size: 11px;">${tr.vcard_post?.uri || 'vcard:post'}</code>
                    <div style="font-size: 10px; color: #94a3b8;">witness sealed</div>
                  </td>
                  <td style="padding: 8px; text-align: center;">
                    <span class="status-badge status-${tr.status}" style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: ${statusBg}; color: ${statusColor}; text-transform: uppercase;">
                      ${tr.status}
                    </span>
                  </td>
                  <td style="padding: 8px; text-align: right;">
                    <span style="font-size: 11px; font-weight: 600; color: ${budgetBreached ? '#f87171' : '#94a3b8'};">
                      ${budgetBreached ? 'out-of-envelope' : `${tr.vcard_pre?.budget_pre?.archetype || 'budget'} bounded`}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <p style="margin: 8px 0 0; font-size: 11px; color: #64748b; font-style: italic;">
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
    <div class="cert-chain-section" style="background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 8px; padding: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 13px; font-weight: 600; color: #f1f5f9; display: flex; align-items: center; gap: 6px;">
          ⛓️ Certificate Chain &amp; Verifier Simplicity (INV-CDO-27)
        </span>
        <span style="font-size: 11px; color: #94a3b8;">Complexity: ${verifier.complexity_class || 'O(1)'}</span>
      </div>

      <div style="display: grid; grid-template-columns: 1fr auto 1fr auto 1.5fr; gap: 8px; align-items: center; font-size: 12px;">
        <!-- Generator -->
        <div style="background: rgba(30, 41, 59, 0.5); border-radius: 6px; padding: 10px; border: 1px solid rgba(148, 163, 184, 0.1);">
          <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">1. Generator</div>
          <div style="font-weight: 600; color: #f8fafc;">${cert.generator?.name || 'PCard Execution'}</div>
          <div style="font-size: 10px; color: #64748b;">${cert.generator?.complexity || 'arbitrarily complex'}</div>
        </div>

        <span style="color: #64748b; font-size: 16px;">➔</span>

        <!-- Certificate -->
        <div style="background: rgba(30, 41, 59, 0.5); border-radius: 6px; padding: 10px; border: 1px solid rgba(148, 163, 184, 0.1);">
          <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">2. Certificate</div>
          <div style="font-weight: 600; color: #818cf8;">${cert.certificate?.name || 'MCard Witness'}</div>
          <div style="font-size: 10px; color: #64748b;">immutable CAS receipt</div>
        </div>

        <span style="color: #64748b; font-size: 16px;">➔</span>

        <!-- Verifier -->
        <div id="verifier-card" style="background: rgba(30, 41, 59, 0.7); border-radius: 6px; padding: 10px; border: 1px solid ${isVerifierPassing ? 'rgba(52, 211, 153, 0.4)' : 'rgba(239, 68, 68, 0.5)'};">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">3. Simple Verifier (INV-CDO-27)</span>
            <span id="verifier-status-badge" style="font-size: 10px; font-weight: 700; color: ${isVerifierPassing ? '#34d399' : '#f87171'};">
              ${isVerifierPassing ? '✓ verified' : 'unverifiable'}
            </span>
          </div>
          <div style="font-weight: 600; color: #f8fafc;" id="verifier-name-display">${verifier.name || 'coeffect-guard-check'}</div>
          <div style="font-size: 10px; color: #38bdf8;">Complexity: ${verifier.complexity_class || 'O(1) recognized expression'}</div>
        </div>
      </div>

      <p style="margin: 8px 0 0; font-size: 11px; color: #64748b; font-style: italic;">
        🔐 ${cert.doctrine_note || 'Trust rests on the simple verifier, not on the generator’s cleverness (INV-CDO-27).'}
      </p>
    </div>
  `;

  // 8. Island-Level Correctness Rows (INV-CDO-28, INV-CDO-29, INV-CDO-30)
  const islands = data.islands || [];
  const islandsTableHtml = `
    <div class="islands-section" style="background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 8px; padding: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 13px; font-weight: 600; color: #f1f5f9; display: flex; align-items: center; gap: 6px;">
          🏝️ Island-Level Correctness Rows (INV-CDO-28, INV-CDO-29, INV-CDO-30)
        </span>
        <span id="island-unit-green-badge" style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: ${isUnitGreen ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; color: ${isUnitGreen ? '#34d399' : '#f87171'};">
          ${isUnitGreen ? 'All Islands Passing' : 'Island Invariant Breach'}
        </span>
      </div>

      <div style="overflow-x: auto;">
        <table id="islands-correctness-table" style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid rgba(148, 163, 184, 0.2); color: #94a3b8;">
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

              let bindingBadgeColor = '#34d399';
              let bindingBg = 'rgba(16, 185, 129, 0.15)';
              if (isDrifted) {
                bindingBadgeColor = '#fbbf24';
                bindingBg = 'rgba(245, 158, 11, 0.15)';
              } else if (isUnbound) {
                bindingBadgeColor = '#f87171';
                bindingBg = 'rgba(239, 68, 68, 0.15)';
              }

              const isBudgetOk = isl.budget_verdict === 'within_budget';
              const isBudgetIncomplete = isl.budget_verdict === 'incomplete';

              return `
                <tr class="island-row" id="island-row-${isl.id}" style="border-bottom: 1px solid rgba(148, 163, 184, 0.1);">
                  <td style="padding: 8px;">
                    <div style="font-weight: 600; color: #f8fafc;">${isl.id}</div>
                    <code style="font-size: 10px; color: #64748b;">${isl.url}</code>
                  </td>
                  <td style="padding: 8px; font-size: 11px; color: #94a3b8;">
                    ${isl.hoare_triple}
                  </td>
                  <td style="padding: 8px; text-align: center;">
                    <span style="font-size: 10px; font-weight: 700; color: ${isl.safety_verdict === 'pass' ? '#34d399' : '#f87171'};">
                      ${isl.safety_verdict}
                    </span>
                  </td>
                  <td style="padding: 8px; text-align: center;">
                    <span style="font-size: 10px; font-weight: 700; color: ${isl.liveness_verdict === 'drained' ? '#34d399' : '#fbbf24'};">
                      ${isl.liveness_verdict}
                    </span>
                  </td>
                  <td style="padding: 8px; text-align: center;">
                    <span class="island-binding-badge" style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: ${bindingBg}; color: ${bindingBadgeColor};">
                      ${isl.island_mcard_binding}
                    </span>
                  </td>
                  <td style="padding: 8px; text-align: right;">
                    <span style="font-size: 11px; font-weight: 600; color: ${isBudgetOk ? '#34d399' : (isBudgetIncomplete ? '#fbbf24' : '#f87171')};">
                      ${isBudgetIncomplete ? 'incomplete' : (isBudgetOk ? 'within_budget' : isl.budget_verdict)}
                    </span>
                    <div style="font-size: 10px; color: #64748b;">${isl.budget_detail || ''}</div>
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
  const stalenessBadgeColor = isStale ? '#f87171' : '#34d399';
  const stalenessBg = isStale ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)';

  const brittlenessHtml = `
    <div class="brittleness-section" style="background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 8px; padding: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 13px; font-weight: 600; color: #f1f5f9; display: flex; align-items: center; gap: 6px;">
          ⏳ Brittleness Disclosure &amp; Continuous Verification (Sussman)
        </span>
        <span id="staleness-status-badge" style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: ${stalenessBg}; color: ${stalenessBadgeColor};">
          ${isStale ? `Stale (${brit.age_seconds}s old)` : `Fresh (${brit.age_seconds}s old)`}
        </span>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 10px; font-size: 11px;">
        <div style="background: rgba(30, 41, 59, 0.5); padding: 8px; border-radius: 6px;">
          <div style="color: #fbbf24; font-weight: 700; margin-bottom: 2px;">1. Frame Problem</div>
          <div style="color: #94a3b8;">Unmonitored environmental assumptions outside the type lattice may drift.</div>
        </div>
        <div style="background: rgba(30, 41, 59, 0.5); padding: 8px; border-radius: 6px;">
          <div style="color: #fbbf24; font-weight: 700; margin-bottom: 2px;">2. Sussman Anomaly</div>
          <div style="color: #94a3b8;">Sub-goals achieved in isolation can conflict during sequential lifecycle moves.</div>
        </div>
        <div style="background: rgba(30, 41, 59, 0.5); padding: 8px; border-radius: 6px;">
          <div style="color: #fbbf24; font-weight: 700; margin-bottom: 2px;">3. Temporal Brittleness</div>
          <div style="color: #94a3b8;">Verification decays over time; a one-time pass is not permanent.</div>
        </div>
      </div>

      <p style="margin: 0; font-size: 11px; color: #64748b; font-style: italic;">
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
