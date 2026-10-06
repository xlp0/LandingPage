/**
 * Least Action & Directionality Navigator
 * 
 * Incorporates the Software Lagrangian Variational Principle:
 *   L_software = S_T - H_T
 * 
 * where:
 * - S_T = Epiplexity (computable, learnable structural invariants extracted by bounded observers)
 * - H_T = Axiomatic Entropy (coupling friction, information noise I = -log2(P), Landauer dissipation)
 * - ds = sqrt(2 * (S_T - H_T)) * ||dx|| (Knowledge Manifold line element)
 * 
 * Governs directionality (道) toward the Single Source of Truth (SSOT, 一)
 * by evaluating candidate development sprint trajectories along the stationary action geodesic (δS = 0).
 */

export const CANDIDATE_SPRINT_DIRECTIONS = {
  'cdo-11': {
    id: 'cdo-11',
    sprintNumber: 'Sprint CDO-11',
    name: 'CDO-11: Multi-Target Native Packaging & Zero-Copy Substrate',
    type: 'STATIONARY_GEODESIC',
    badge: 'Stationary Action Geodesic (δS = 0)',
    recommended: true,
    angleDeg: 22.5,
    vector: { x: 0.92, y: 0.38 },
    epiplexity_St: 94.5,
    entropy_Ht: 12.2,
    netLagrangian_L: 82.3,
    metricDistance_ds: 12.83,
    isRealAction: true,
    leinsterDiversity_Dq: 7,
    subsystemSnr: 0.95,
    systemSnr: 0.9999992,
    suhAxiom1Coupling: 'Uncoupled (Diagonal [A])',
    informationAxiomBits_I: 1.8,
    description: 'Crystallizes multi-platform native packaging (Tauri/WASM) into unified G-Set SQLite containers with zero-copy VFS univalence witnesses. Maximizes Epiplexity while maintaining strictly uncoupled design parameters.',
    invariantsPreserved: ['INV-REF-01', 'INV-REF-03', 'INV-CDO-01', 'INV-CDO-18', 'INV-CDO-19'],
    matrix: [
      ['1.0', '0.0', '0.0'],
      ['0.0', '1.0', '0.0'],
      ['0.0', '0.0', '1.0']
    ],
    frList: ['FR1: Multi-OS Native Binary', 'FR2: Zero-Copy SQLite VFS', 'FR3: 7D Lattice Binding'],
    dpList: ['DP1: Tauri IPC Bridge', 'DP2: Memory-Mapped CAS', 'DP3: Token Functors']
  },
  'cdo-12': {
    id: 'cdo-12',
    sprintNumber: 'Sprint CDO-12',
    name: 'Cryptographic Mesh & Hardware Enclave Invariants',
    type: 'VIABLE_ALTERNATIVE',
    badge: 'Viable Positive Action (L > 0)',
    recommended: false,
    angleDeg: 55.0,
    vector: { x: 0.57, y: 0.82 },
    epiplexity_St: 76.8,
    entropy_Ht: 34.2,
    netLagrangian_L: 42.6,
    metricDistance_ds: 9.23,
    isRealAction: true,
    leinsterDiversity_Dq: 4,
    subsystemSnr: 0.92,
    systemSnr: 0.99994,
    suhAxiom1Coupling: 'Decoupled (Triangular [A])',
    informationAxiomBits_I: 3.2,
    description: 'Integrates secure hardware enclave attestation and cryptographic token mesh. High security invariants but exhibits moderate initial device driver coupling.',
    invariantsPreserved: ['INV-REF-01', 'INV-CDO-05', 'INV-CDO-19'],
    matrix: [
      ['1.0', '0.0', '0.0'],
      ['0.3', '1.0', '0.0'],
      ['0.1', '0.4', '1.0']
    ],
    frList: ['FR1: Enclave Attestation', 'FR2: Mesh Token Signing', 'FR3: Zero-Trust Gateway'],
    dpList: ['DP1: TPM/SE Driver Hook', 'DP2: Ed25519 Signatures', 'DP3: WireGuard Protocol']
  },
  'anti-monolith': {
    id: 'anti-monolith',
    sprintNumber: 'Anti-Pattern A',
    name: 'Ad-Hoc Monolithic Feature Sprawl (Vibe Coding)',
    type: 'DEMONIC_PRUNE',
    badge: 'Demonic Prune (ds ∈ iℝ, ΔH_T = 0)',
    recommended: false,
    angleDeg: 125.0,
    vector: { x: -0.57, y: 0.82 },
    epiplexity_St: 24.0,
    entropy_Ht: 86.5,
    netLagrangian_L: -62.5,
    metricDistance_ds: 11.18,
    isRealAction: false,
    leinsterDiversity_Dq: 1,
    subsystemSnr: 0.65,
    systemSnr: 0.65,
    suhAxiom1Coupling: 'Coupled (Full Cross-Talk)',
    informationAxiomBits_I: 6.4,
    description: 'Expands ad-hoc UI features and direct inline scripts without type lattice or VCard bounds. Massive coupling friction ripples across codebase; pruned in Transaction-Free Zone.',
    invariantsPreserved: [],
    matrix: [
      ['1.0', '0.8', '0.9'],
      ['0.7', '1.0', '0.6'],
      ['0.9', '0.7', '1.0']
    ],
    frList: ['FR1: Fast UI Additions', 'FR2: Ad-Hoc Scripting', 'FR3: Direct DB Access'],
    dpList: ['DP1: Hardcoded State', 'DP2: Global Variables', 'DP3: Shared Mutability']
  },
  'anti-docs': {
    id: 'anti-docs',
    sprintNumber: 'Anti-Pattern B',
    name: 'Passive Prose Specs without Executable Witnesses',
    type: 'DEMONIC_PRUNE',
    badge: 'Demonic Prune (ds ∈ iℝ, ΔH_T = 0)',
    recommended: false,
    angleDeg: 215.0,
    vector: { x: -0.82, y: -0.57 },
    epiplexity_St: 18.0,
    entropy_Ht: 48.0,
    netLagrangian_L: -30.0,
    metricDistance_ds: 7.75,
    isRealAction: false,
    leinsterDiversity_Dq: 1,
    subsystemSnr: 0.70,
    systemSnr: 0.70,
    suhAxiom1Coupling: 'Unwitnessed Prose Drift',
    informationAxiomBits_I: 4.8,
    description: 'Authors extensive prose documentation without machine-verifiable univalence witnesses. Documentation drifts rapidly from code reality, accumulating high epistemic noise.',
    invariantsPreserved: [],
    matrix: [
      ['1.0', '0.0', '0.0'],
      ['0.4', '1.0', '0.0'],
      ['0.0', '0.5', '1.0']
    ],
    frList: ['FR1: Architecture Narrative', 'FR2: Developer Guidelines', 'FR3: Release Notes'],
    dpList: ['DP1: Static Markdown', 'DP2: Manual Checklists', 'DP3: Unverified Claims']
  }
};

export class LeastActionNavigator {
  constructor() {
    this.currentDirection = 'cdo-11';
    this.container = null;
    this.isOpen = false;
  }

  mount(rootElement) {
    if (this.container) return;

    const modal = document.createElement('div');
    modal.id = 'least-action-modal';
    modal.className = 'least-action-modal-backdrop';
    modal.style.display = 'none';

    modal.innerHTML = `
      <div class="least-action-modal-window">
        <div class="least-action-header">
          <div class="header-title-group">
            <span class="header-icon">🧭</span>
            <div>
              <h2 id="least-action-title">Least Action & Directionality Navigator</h2>
              <p class="header-sub">Software Lagrangian Variational Principle: <code>ℒ = S_T - H_T</code> • Directionality (道) to SSOT (一)</p>
            </div>
          </div>
          <button class="close-btn" id="least-action-close-btn" title="Close Navigator">✕</button>
        </div>

        <div class="direction-tabs" id="direction-tabs-bar">
          ${Object.values(CANDIDATE_SPRINT_DIRECTIONS).map(dir => `
            <button class="direction-tab ${dir.id === this.currentDirection ? 'active' : ''} ${dir.isRealAction ? 'real-geodesic' : 'pruned-path'}" 
                    data-direction="${dir.id}" id="dir-tab-${dir.id}">
              <span class="tab-indicator">${dir.isRealAction ? '⚡' : '⛔'}</span>
              <span class="tab-sprint">${dir.sprintNumber}</span>
              ${dir.recommended ? '<span class="tab-optimal-tag">δS=0 Optimal</span>' : ''}
            </button>
          `).join('')}
        </div>

        <div class="least-action-body" id="least-action-content">
          <!-- Dynamic rendering -->
        </div>

        <div class="least-action-footer">
          <div class="footer-theory-note">
            <span>Euler-Lagrange: <code>δ∫(S_T - H_T)dt = 0</code></span>
            <span>• Suh Axiom 1 & 2: <code>{FR} = [A]{DP}</code>, <code>I = -log₂(P)</code></span>
            <span>• Leinster SNR: <code>1 - (1-s)^D_q</code></span>
          </div>
          <button class="action-commit-btn" id="lock-direction-btn">
            Lock Direction (Geodesic Geometer)
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.container = modal;

    // Attach listeners
    modal.querySelector('#least-action-close-btn')?.addEventListener('click', () => this.close());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.close();
    });

    const tabs = modal.querySelectorAll('.direction-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const dirId = tab.getAttribute('data-direction');
        if (dirId) this.setDirection(dirId);
      });
    });

    modal.querySelector('#lock-direction-btn')?.addEventListener('click', () => {
      this.lockCurrentDirection();
    });

    this.render();
  }

  setDirection(directionId) {
    if (!CANDIDATE_SPRINT_DIRECTIONS[directionId]) return;
    this.currentDirection = directionId;

    const tabs = this.container?.querySelectorAll('.direction-tab');
    tabs?.forEach(tab => {
      if (tab.getAttribute('data-direction') === directionId) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    this.render();
  }

  render() {
    const dir = CANDIDATE_SPRINT_DIRECTIONS[this.currentDirection];
    const contentEl = document.getElementById('least-action-content');
    if (!contentEl || !dir) return;

    const statusColor = dir.isRealAction ? (dir.recommended ? '#10b981' : '#3b82f6') : '#ef4444';
    const statusBg = dir.isRealAction ? (dir.recommended ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)') : 'rgba(239, 68, 68, 0.15)';
    const dsText = dir.isRealAction ? `${dir.metricDistance_ds.toFixed(2)} ∈ ℝ⁺ (Physical Geodesic)` : `${dir.metricDistance_ds.toFixed(2)} i ∈ iℝ (Imaginary Action)`;

    contentEl.innerHTML = `
      <div class="navigator-top-split">
        <!-- Left: Geodesic Vector Compass -->
        <div class="compass-panel">
          <div class="panel-header">
            <span>Directionality Vector Compass (道向)</span>
            <span class="compass-coord-badge">∇S Gradient Field</span>
          </div>
          <div class="compass-canvas-container" id="compass-container">
            ${this.renderCompassSVG(dir)}
          </div>
          <div class="compass-caption">
            <span>Tangent Vector: <code>v⃗ = (${dir.vector.x}, ${dir.vector.y})</code></span>
            <span>Trajectory Angle: <code>${dir.angleDeg}°</code></span>
          </div>
        </div>

        <!-- Right: Lagrangian Action Evaluation -->
        <div class="lagrangian-summary-panel">
          <div class="direction-header-row">
            <div>
              <span class="direction-badge" style="background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusColor};">
                ${dir.badge}
              </span>
              <h3 class="direction-name" id="current-direction-name">${dir.name}</h3>
            </div>
          </div>

          <p class="direction-desc">${dir.description}</p>

          <div class="lagrangian-metrics-row">
            <div class="lag-metric-card">
              <span class="lag-label">Epiplexity (S_T)</span>
              <span class="lag-val epiplexity-val" id="metric-epiplexity">${dir.epiplexity_St}</span>
              <span class="lag-sub">Learnable Invariants</span>
            </div>
            <div class="lag-metric-card">
              <span class="lag-label">Axiomatic Entropy (H_T)</span>
              <span class="lag-val entropy-val" id="metric-entropy">${dir.entropy_Ht}</span>
              <span class="lag-sub">Coupling & Noise</span>
            </div>
            <div class="lag-metric-card highlight-card">
              <span class="lag-label">Software Lagrangian (ℒ)</span>
              <span class="lag-val lagrangian-val" id="metric-lagrangian" style="color: ${statusColor};">
                ${dir.netLagrangian_L > 0 ? '+' : ''}${dir.netLagrangian_L}
              </span>
              <span class="lag-sub">ℒ = S_T - H_T</span>
            </div>
          </div>

          <!-- Energy Balance Bar -->
          <div class="energy-balance-box">
            <div class="energy-balance-header">
              <span>Lagrangian Energy Decomposition</span>
              <span>Net Yield: ${dir.netLagrangian_L > 0 ? '+' : ''}${dir.netLagrangian_L}</span>
            </div>
            <div class="energy-track">
              <div class="energy-fill-st" style="width: ${Math.min(dir.epiplexity_St, 100)}%;" title="Epiplexity S_T: ${dir.epiplexity_St}"></div>
              <div class="energy-fill-ht" style="width: ${Math.min(dir.entropy_Ht, 100)}%;" title="Dissipative Entropy H_T: ${dir.entropy_Ht}"></div>
            </div>
            <div class="energy-legend">
              <span><span class="dot st-dot"></span> S_T Kinetic Epiplexity</span>
              <span><span class="dot ht-dot"></span> H_T Landauer Dissipation</span>
            </div>
          </div>

          <!-- Metric Line Element -->
          <div class="metric-line-box">
            <span class="line-box-label">Knowledge Manifold Line Element <code>ds = √(2(S_T - H_T)) · ‖dx‖</code></span>
            <code class="line-box-val" id="metric-distance-display" style="color: ${statusColor};">${dsText}</code>
          </div>
        </div>
      </div>

      <!-- Bottom Split: Axiomatic Design & Direction Recommendation -->
      <div class="navigator-bottom-split">
        <!-- Axiomatic Design Matrix -->
        <div class="axiomatic-matrix-panel">
          <div class="panel-header">
            <span>Axiomatic Design Matrix: <code>{FR} = [A] {DP}</code></span>
            <span class="matrix-status-tag">${dir.suhAxiom1Coupling}</span>
          </div>
          <div class="matrix-grid-display">
            <div class="matrix-box">
              <div class="matrix-row">
                <span class="mat-cell ${dir.matrix[0][0] !== '0.0' ? 'active-cell' : 'zero-cell'}">${dir.matrix[0][0]}</span>
                <span class="mat-cell ${dir.matrix[0][1] !== '0.0' ? 'active-cell' : 'zero-cell'}">${dir.matrix[0][1]}</span>
                <span class="mat-cell ${dir.matrix[0][2] !== '0.0' ? 'active-cell' : 'zero-cell'}">${dir.matrix[0][2]}</span>
              </div>
              <div class="matrix-row">
                <span class="mat-cell ${dir.matrix[1][0] !== '0.0' ? 'active-cell' : 'zero-cell'}">${dir.matrix[1][0]}</span>
                <span class="mat-cell ${dir.matrix[1][1] !== '0.0' ? 'active-cell' : 'zero-cell'}">${dir.matrix[1][1]}</span>
                <span class="mat-cell ${dir.matrix[1][2] !== '0.0' ? 'active-cell' : 'zero-cell'}">${dir.matrix[1][2]}</span>
              </div>
              <div class="matrix-row">
                <span class="mat-cell ${dir.matrix[2][0] !== '0.0' ? 'active-cell' : 'zero-cell'}">${dir.matrix[2][0]}</span>
                <span class="mat-cell ${dir.matrix[2][1] !== '0.0' ? 'active-cell' : 'zero-cell'}">${dir.matrix[2][1]}</span>
                <span class="mat-cell ${dir.matrix[2][2] !== '0.0' ? 'active-cell' : 'zero-cell'}">${dir.matrix[2][2]}</span>
              </div>
            </div>
            <div class="matrix-legend">
              <div class="legend-row">
                <span class="prop-label">Axiom 1 (Independence):</span>
                <span class="prop-val">${dir.suhAxiom1Coupling}</span>
              </div>
              <div class="legend-row">
                <span class="prop-label">Axiom 2 Information Content (I):</span>
                <span class="prop-val">${dir.informationAxiomBits_I} bits</span>
              </div>
              <div class="legend-row">
                <span class="prop-label">Leinster Diversity (D_q):</span>
                <span class="prop-val">${dir.leinsterDiversity_Dq} independent verification paths</span>
              </div>
              <div class="legend-row">
                <span class="prop-label">Degeneracy System SNR:</span>
                <span class="prop-val" style="color: #10b981; font-weight: 600;">${(dir.systemSnr * 100).toFixed(4)}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Next Direction Recommendation -->
        <div class="recommendation-panel">
          <div class="panel-header">
            <span>Least Action Geodesic Decision (SSOT Protocol)</span>
            <span class="rec-badge" style="color: ${dir.recommended ? '#10b981' : '#f59e0b'};">
              ${dir.recommended ? '✓ RECOMMENDED DIRECTION' : (dir.isRealAction ? '△ VIABLE PATH' : '✕ FORBIDDEN PATH')}
            </span>
          </div>
          <div class="rec-card-body">
            <h4 class="rec-title">${dir.recommended ? 'Optimal Stationary Action Trajectory' : (dir.isRealAction ? 'Alternative Action Path' : 'Demonic Pruning in TFZ')}</h4>
            <p class="rec-text">
              ${dir.recommended 
                ? `Navigating along <strong>${dir.sprintNumber}</strong> maximizes Epiplexity ($S_T = ${dir.epiplexity_St}$) while preserving uncoupled design independence ($H_T = ${dir.entropy_Ht}$). This satisfies the Principle of Least Action ($\\delta S = 0$), advancing directly along the directionality gradient toward the Single Source of Truth.`
                : (dir.isRealAction 
                    ? `Sprint ${dir.sprintNumber} has net positive Lagrangian ($ℒ = +${dir.netLagrangian_L}$), but introduces triangular coupling ($H_T = ${dir.entropy_Ht}$). Recommended as secondary phase after CDO-11.`
                    : `Trajectory produces imaginary action distance ($ds = ${dir.metricDistance_ds.toFixed(2)} i \\in i\\mathbb{R}$) due to excessive coupling ($H_T = ${dir.entropy_Ht} > S_T = ${dir.epiplexity_St}$). Instantly pruned by Maxwell's Demon with zero Landauer bit-erasure dissipation ($\\Delta H_T = 0$).`
                  )
              }
            </p>
            <div class="invariants-list-row">
              <span class="inv-label">Invariants Attested:</span>
              ${dir.invariantsPreserved.length > 0 
                ? dir.invariantsPreserved.map(inv => `<span class="inv-pill">${inv}</span>`).join('') 
                : '<span class="inv-pill void-pill">None (Violates Invariance)</span>'
              }
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderCompassSVG(currentDir) {
    const cx = 130;
    const cy = 130;
    const r = 100;

    // Convert vector to coordinates
    const toCoords = (angleDeg, len) => {
      const rad = (angleDeg * Math.PI) / 180;
      return {
        x: cx + len * Math.cos(rad),
        y: cy - len * Math.sin(rad)
      };
    };

    return `
      <svg viewBox="0 0 260 260" class="compass-svg" id="compass-svg-element">
        <defs>
          <radialGradient id="compass-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="rgba(59, 130, 246, 0.15)"/>
            <stop offset="100%" stop-color="rgba(15, 23, 42, 0.4)"/>
          </radialGradient>
          <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
          </marker>
          <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#3b82f6" />
          </marker>
          <marker id="arrow-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444" />
          </marker>
        </defs>

        <!-- Background Radar Circles -->
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#compass-glow)" stroke="rgba(255, 255, 255, 0.1)" stroke-width="1.5" />
        <circle cx="${cx}" cy="${cy}" r="${r * 0.66}" fill="none" stroke="rgba(255, 255, 255, 0.07)" stroke-width="1" stroke-dasharray="3,3" />
        <circle cx="${cx}" cy="${cy}" r="${r * 0.33}" fill="none" stroke="rgba(255, 255, 255, 0.07)" stroke-width="1" stroke-dasharray="2,2" />

        <!-- Axis Lines -->
        <line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="rgba(255, 255, 255, 0.1)" stroke-width="1" />
        <line x1="${cx}" y1="${cy - r}" x2="${cx}" y2="${cy + r}" stroke="rgba(255, 255, 255, 0.1)" stroke-width="1" />

        <!-- SSOT Target Gradient Axis (道生一) -->
        <line x1="${cx}" y1="${cy}" x2="${cx + 95}" y2="${cy - 40}" stroke="#60a5fa" stroke-width="2" stroke-dasharray="4,2" />
        <text x="${cx + 100}" y="${cy - 45}" fill="#60a5fa" font-size="10" font-weight="600" text-anchor="start">∇S (SSOT)</text>

        <!-- Candidate Vectors -->
        ${Object.values(CANDIDATE_SPRINT_DIRECTIONS).map(d => {
          const isSelected = d.id === currentDir.id;
          const coords = toCoords(d.angleDeg, d.isRealAction ? 85 : 65);
          const color = d.isRealAction ? (d.recommended ? '#10b981' : '#3b82f6') : '#ef4444';
          const marker = d.isRealAction ? (d.recommended ? 'url(#arrow-green)' : 'url(#arrow-blue)') : 'url(#arrow-red)';
          const strokeWidth = isSelected ? 3.5 : 1.5;
          const strokeDash = d.isRealAction ? 'none' : '4,3';

          return `
            <g class="vector-group ${isSelected ? 'selected-vector' : ''}" style="cursor: pointer;" onclick="window.__least_action_navigator.setDirection('${d.id}')">
              <line x1="${cx}" y1="${cy}" x2="${coords.x}" y2="${coords.y}" stroke="${color}" stroke-width="${strokeWidth}" 
                    stroke-dasharray="${strokeDash}" marker-end="${marker}" />
              <circle cx="${coords.x}" cy="${coords.y}" r="${isSelected ? 4 : 2.5}" fill="${color}" />
              <text x="${coords.x + (d.vector.x >= 0 ? 8 : -8)}" y="${coords.y + (d.vector.y >= 0 ? -6 : 12)}" 
                    fill="${color}" font-size="${isSelected ? '10' : '9'}" font-weight="${isSelected ? '700' : '500'}"
                    text-anchor="${d.vector.x >= 0 ? 'start' : 'end'}">
                ${d.sprintNumber.split(':')[0]}
              </text>
            </g>
          `;
        }).join('')}

        <!-- Origin Node (Current Sprint CDO-10) -->
        <circle cx="${cx}" cy="${cy}" r="6" fill="#a78bfa" stroke="#fff" stroke-width="2" />
        <text x="${cx}" y="${cy + 18}" fill="#c4b5fd" font-size="9" text-anchor="middle" font-weight="600">CDO-10 (Now)</text>
      </svg>
    `;
  }

  lockCurrentDirection() {
    const dir = CANDIDATE_SPRINT_DIRECTIONS[this.currentDirection];
    if (!dir) return;

    if (!dir.isRealAction) {
      alert(`Cannot lock ${dir.sprintNumber}: Imaginary action metric (ds ∈ iℝ) violates Least Action Principle. Pruned at Maxwell Gate.`);
      return;
    }

    console.log(`[LeastActionNavigator] Locked next sprint direction: ${dir.sprintNumber} (${dir.name})`);
    
    // Broadcast direction lock if BroadcastChannel available
    if (window.BroadcastChannel) {
      const channel = new BroadcastChannel('govtech-sprint-directionality');
      channel.postMessage({
        type: 'SPRINT_DIRECTION_LOCKED',
        sprint: dir.sprintNumber,
        name: dir.name,
        lagrangian: dir.netLagrangian_L,
        metricDistance: dir.metricDistance_ds,
        timestamp: Date.now()
      });
    }

    const btn = document.getElementById('lock-direction-btn');
    if (btn) {
      btn.textContent = `✓ Locked to ${dir.sprintNumber}`;
      btn.style.backgroundColor = '#10b981';
      setTimeout(() => {
        btn.textContent = 'Lock Direction (Geodesic Geometer)';
        btn.style.backgroundColor = '';
      }, 2500);
    }
  }

  open(directionId) {
    if (directionId) this.setDirection(directionId);
    if (this.container) {
      this.container.style.display = 'flex';
      this.isOpen = true;
    }
  }

  close() {
    if (this.container) {
      this.container.style.display = 'none';
      this.isOpen = false;
    }
  }
}

/**
 * The fiber bundle map, driven by the registry (CDO-13 DV-03).
 *
 * The bundle is pi: E -> B, where B is the kind lattice CDO-10 declares. Earlier
 * versions of this navigator plotted fibers without their *lattice height*, which
 * meant there was no potential-energy term to plot at all: Type Lattice states that
 * "the Software Lagrangian L_soft = T_kin - V_pot uses height on the Type Lattice as
 * its potential energy metric V_pot".
 *
 * Height is therefore not decoration. A fiber declared at *shape* level (a `text`
 * fiber covering six leaf kinds) sits high on the lattice: it is abstract, it covers
 * much, and its potential is large. A leaf fiber (`text/plain`) sits at the bottom:
 * specific, covering one kind, low potential. The geodesic from ambiguity to a
 * verified type is the path that resolves the most ambiguity for the least work.
 *
 * Read from `fibers[]` and the ordering rather than from a hardcoded list, so a fiber
 * added by data alone appears in the map.
 *
 * @param {Array} fibers   the registry's `fibers[]`
 * @param {object} ordering kind -> supertypes, the full lattice order
 */
export function fiberBundleMap(fibers = [], ordering = {}) {
  const edges = new Map(Object.entries(ordering));
  for (const f of fibers) if (f.supertypes) edges.set(f.kind, f.supertypes);

  /**
   * Depth from the top: how many refinements separate a node from its maximal
   * ancestor. A node with no supertypes is maximal — nearest top, maximum ambiguity.
   *
   * Note this is *depth*, not height, and the distinction is not cosmetic: potential
   * energy is high near the top and low near the bottom, so V_pot is the complement
   * of depth. Getting this backwards would put the most abstract fiber at zero
   * potential and the most specific at maximum, which inverts the geodesic.
   */
  const depthFromTop = (node, seen = new Set()) => {
    if (seen.has(node)) return 0; // a cycle cannot raise height; the gate forbids them
    const supers = edges.get(node) ?? [];
    if (!supers.length) return 0; // maximal in its branch: nearest the top
    return 1 + Math.max(...supers.map((s) => depthFromTop(s, new Set([...seen, node]))));
  };

  const declared = new Set(fibers.map((f) => f.kind));
  const nodes = new Set([...edges.keys(), ...[...edges.values()].flat()]);
  const maxDepth = Math.max(0, ...[...nodes].map((n) => depthFromTop(n)));

  const entries = fibers.map((f) => {
    const depth = depthFromTop(f.kind);
    // Subsumed kinds: the leaves this fiber covers that have no fiber of their own.
    const covers = [...nodes].filter(
      (n) => n !== f.kind && depthFromTop(n) > depth && (edges.get(n) ?? []).includes(f.kind),
    );
    return {
      kind: f.kind,
      depthFromTop: depth,
      // V_pot is high near the top (maximum ambiguity) and low near the bottom (a
      // verified, specific type), so it is the *complement* of depth.
      V_pot: maxDepth === 0 ? 0 : 1 - depth / maxDepth,
      covers,
      // a fiber that covers more resolves more ambiguity per mount, so its geodesic
      // contribution is larger
      coverage: 1 + covers.length,
      exercised: Boolean(f.exercised),
    };
  });

  return {
    base: [...nodes].filter((n) => !declared.has(n)), // the shapes: intermediate nodes
    fibers: entries,
    maxDepthFromTop: maxDepth,
    // the geodesic is the minimum-action path: highest potential first
    geodesic: [...entries].sort((a, b) => b.V_pot - a.V_pot).map((e) => e.kind),
    note: 'V_pot is normalised lattice height; the geodesic orders by potential descending',
  };
}
