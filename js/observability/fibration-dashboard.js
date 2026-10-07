/**
 * Fibration Dashboard & Cross-Unit Observability Gateway (CDO-13)
 * 
 * Coordinates:
 * - Cross-unit Mission Control views (Bundle Map, Parallel Coordinates, Admissibility Cone, Unit Table)
 * - Per-unit Inspector slots (Payload Treemap, Functionality Radar, Web Vitals, Budget Bars)
 * - Multi-axis linked brushing connecting Parallel Coordinates, Treemap, and Unit Table
 * 
 * Purely presentation; loaded on-demand (INV-REF-01).
 */

import { renderFiberBundleMap, renderParallelCoordinates, renderPayloadTreemap, renderAdmissibilityCone } from './charts/d3-charts.js';
import { renderFunctionalityRadar, renderWebVitalsSeries, renderBudgetBars } from './charts/chartjs-charts.js';

export const FALLBACK_ASSESSMENT_UNITS = [
  {
    unit: 'LandingPage',
    tau: {
      platform: 'web',
      form_factor: 'desktop',
      orientation: 'portrait',
      locale: 'en-US',
      display_mode: 'dark',
      power_mode: 'balanced',
      adapter: 'semantic_tokens_css'
    },
    payload_bytes: 382573313,
    within_budget: false,
    performance_summary: {
      lcp_ms: 1200,
      residual_entropy: 0
    },
    functionality_coverage: 1.0,
    functionality_metrics: {
      invariant_coverage: 1.0,
      lattice_pass_rate: 1.0,
      adapter_coverage: 1.0,
      evidence_level_score: 0.9,
      normalized_witness_density: 0.85
    },
    S_T: 0.9178,
    H_T: 0.3000,
    lagrangian: 0.6178,
    regime: 'geodesic',
    dominant_entropy_contributor: 'budget_breach'
  },
  {
    unit: 'mcard-studio',
    tau: {
      platform: 'web',
      form_factor: 'desktop',
      orientation: 'portrait',
      locale: 'en-US',
      display_mode: 'dark',
      power_mode: 'performance',
      adapter: 'dom'
    },
    payload_bytes: 456352471,
    within_budget: false,
    performance_summary: {
      lcp_ms: 1200,
      residual_entropy: 0
    },
    functionality_coverage: 0.92,
    functionality_metrics: {
      invariant_coverage: 0.92,
      lattice_pass_rate: 0.95,
      adapter_coverage: 0.88,
      evidence_level_score: 0.85,
      normalized_witness_density: 0.80
    },
    S_T: 0.8296,
    H_T: 0.3075,
    lagrangian: 0.5221,
    regime: 'geodesic',
    dominant_entropy_contributor: 'budget_breach'
  },
  {
    unit: 'candidate-marginal-widget',
    tau: {
      platform: 'web',
      form_factor: 'desktop',
      orientation: 'portrait',
      locale: 'en-US',
      display_mode: 'light',
      power_mode: 'balanced',
      adapter: 'animejs'
    },
    payload_bytes: 8000000,
    within_budget: true,
    performance_summary: {
      lcp_ms: 2200,
      residual_entropy: 0
    },
    functionality_coverage: 0.5,
    functionality_metrics: {
      invariant_coverage: 0.50,
      lattice_pass_rate: 0.60,
      adapter_coverage: 0.40,
      evidence_level_score: 0.50,
      normalized_witness_density: null // intentional missing metric (GAP)
    },
    S_T: 0.4894,
    H_T: 0.0900,
    lagrangian: 0.3994,
    regime: 'geodesic',
    dominant_entropy_contributor: 'coupling_friction'
  },
  {
    unit: 'candidate-demonic-pruned',
    tau: {
      platform: 'web',
      form_factor: 'desktop',
      orientation: 'portrait',
      locale: 'en-US',
      display_mode: 'dark',
      power_mode: 'energy_saving',
      adapter: 'waapi'
    },
    payload_bytes: 25000000,
    within_budget: false,
    performance_summary: {
      lcp_ms: 4500,
      residual_entropy: 1
    },
    functionality_coverage: 0.3,
    functionality_metrics: {
      invariant_coverage: 0.30,
      lattice_pass_rate: 0.25,
      adapter_coverage: null, // intentional missing metric (GAP)
      evidence_level_score: 0.20,
      normalized_witness_density: 0.20
    },
    S_T: 0.2400,
    H_T: 0.7650,
    lagrangian: -0.5250,
    regime: 'pruning',
    dominant_entropy_contributor: 'budget_breach'
  }
];

export class FibrationDashboard {
  constructor(options = {}) {
    this.units = options.units || FALLBACK_ASSESSMENT_UNITS;
    this.filteredUnits = [...this.units];
    this.selectedUnit = this.units[0];
    this.slots = new Map();
  }

  async loadAssessmentData() {
    try {
      // Read the record through the registry API. The previous fetch targeted a
      // filesystem path the portal never served and fell back to a tree that has not
      // existed since the CDO program graduated — so the dashboard silently showed
      // nothing.
      const res = await fetch(
        '/api/clm/program-artifact?program=cdo&subdir=observability&file=fibration_assessment.json'
      );
      if (res.ok) {
        const data = await res.json();
        if (data.units && data.units.length > 0) {
          this.units = data.units.map(u => ({
            ...u,
            tau: u.tau || { platform: 'web', form_factor: 'desktop', orientation: 'portrait', locale: 'en-US' },
            functionality_metrics: u.functionality_metrics || {
              invariant_coverage: u.functionality_coverage ?? 1.0,
              lattice_pass_rate: 1.0,
              adapter_coverage: 1.0,
              evidence_level_score: 0.8,
              normalized_witness_density: 0.8
            }
          }));
          this.filteredUnits = [...this.units];
        }
      }
    } catch {
      // Use fallback units if fetch fails (e.g. running outside server)
    }
    return this.units;
  }

  /**
   * Mounts cross-unit views into #mc-slot-cross-unit
   */
  async mountCrossUnitSlot(container) {
    if (!container) return;
    container.innerHTML = `
      <div class="fibration-cross-unit-dashboard">
        <div class="fibration-section-header">
          <h3>Fibration Metric Observability &amp; Grothendieck Bundle Map (π: E &rarr; B)</h3>
          <p class="section-sub">Projects admitted SPAs onto Type Lattice coordinates &bull; Software Lagrangian ℒ = S_T - H_T</p>
        </div>

        <div class="fibration-chart-card">
          <div class="card-title">1. Fiber Bundle Map over Type Lattice Coordinates</div>
          <div id="fibration-bundle-mount" style="position: relative;"></div>
        </div>

        <div class="fibration-chart-card">
          <div class="card-title">2. Parallel Coordinates across 7 Lattice Dimensions + Metrics (with Interactive Brushing)</div>
          <p class="card-note">Brush any axis vertically to filter units. Linked live to Treemap and Unit Table.</p>
          <div id="parallel-coords-mount"></div>
        </div>

        <div class="fibration-chart-card">
          <div class="card-title">3. Payload Mass Treemap with Archetype Budget Overlay</div>
          <p class="card-note">Per-kind / unit byte mass distribution compared against archetype budget threshold.</p>
          <div id="fibration-treemap-mount"></div>
        </div>

        <div class="fibration-chart-card">
          <div class="card-title">4. Software Lagrangian Admissibility Cone (ℒ vs &Delta;t Plane)</div>
          <div id="admissibility-cone-mount"></div>
        </div>

        <div class="fibration-chart-card">
          <div class="card-title">5. Per-Unit Lagrangian Assessment Ranking Table</div>
          <div id="unit-table-mount"></div>
        </div>
      </div>
    `;

    const bundleMount = container.querySelector('#fibration-bundle-mount');
    const parCoordsMount = container.querySelector('#parallel-coords-mount');
    const treemapMount = container.querySelector('#fibration-treemap-mount');
    const coneMount = container.querySelector('#admissibility-cone-mount');
    const tableMount = container.querySelector('#unit-table-mount');

    await renderFiberBundleMap(bundleMount, this.units);

    const parCoords = await renderParallelCoordinates(parCoordsMount, this.units, {
      onBrushChange: (filtered) => {
        this.filteredUnits = filtered.length > 0 ? filtered : this.units;
        this.renderUnitTable(tableMount);
        this.renderCrossUnitTreemap(treemapMount);
        // Dispatch custom event for linked views
        window.dispatchEvent(new CustomEvent('fibration-filter-change', {
          detail: { filteredUnits: this.filteredUnits }
        }));
      }
    });

    this.renderCrossUnitTreemap(treemapMount);
    await renderAdmissibilityCone(coneMount, this.units);
    this.renderUnitTable(tableMount);

    return parCoords;
  }

  renderCrossUnitTreemap(container) {
    if (!container) return;
    const units = this.filteredUnits.length > 0 ? this.filteredUnits : this.units;
    const totalBytes = units.reduce((sum, u) => sum + (u.payload_bytes || 0), 0) || 5800000;
    const categories = units.map(u => ({
      name: u.unit,
      bytes: u.payload_bytes || 1200000,
      percent: Math.round(((u.payload_bytes || 1200000) / totalBytes) * 100),
      color: u.regime === 'geodesic' ? 'var(--color-success)' : (u.regime === 'pruning' ? 'var(--color-danger)' : 'var(--color-primary)')
    }));

    renderPayloadTreemap(container, {
      categories,
      total_bytes: totalBytes
    }, {
      budgetBytes: 45 * 1024 * 1024
    });
  }

  renderUnitTable(container) {
    if (!container) return;
    const sorted = [...this.filteredUnits].sort((a, b) => (b.lagrangian ?? 0) - (a.lagrangian ?? 0));

    container.innerHTML = `
      <table class="fibration-unit-table" id="fibration-unit-table" style="width: 100%; border-collapse: collapse; font-size: 12px; font-family: ui-monospace, monospace;">
        <thead>
          <tr style="border-bottom: 2px solid var(--panel-text-muted); text-align: left; color: var(--panel-text-muted);">
            <th style="padding: 6px;">Unit</th>
            <th style="padding: 6px;">Lattice Coordinate &tau;</th>
            <th style="padding: 6px;">Performance</th>
            <th style="padding: 6px;">Payload Mass</th>
            <th style="padding: 6px;">Func. Cov</th>
            <th style="padding: 6px;">S_T</th>
            <th style="padding: 6px;">H_T</th>
            <th style="padding: 6px;">Lagrangian ℒ</th>
            <th style="padding: 6px;">Regime</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map(u => {
            const isGeodesic = u.regime === 'geodesic';
            const isPruned = u.regime === 'pruning';
            const badgeColor = isGeodesic ? 'var(--color-success)' : (isPruned ? 'var(--color-danger)' : 'var(--color-warning)');
            const coord = `${u.tau?.platform || 'web'}:${u.tau?.form_factor || 'desktop'}`;
            return `
              <tr class="unit-row" data-unit="${u.unit}" style="border-bottom: 1px solid var(--color-surface-hover); cursor: pointer;">
                <td style="padding: 6px; font-weight: bold; color: var(--panel-text);">${u.unit}</td>
                <td style="padding: 6px; color: var(--color-info);"><code>${coord}</code></td>
                <td style="padding: 6px;">LCP: ${u.performance_summary?.lcp_ms || '—'}ms &bull; H_T_res: ${u.performance_summary?.residual_entropy ?? 0}</td>
                <td style="padding: 6px;">${((u.payload_bytes || 0) / (1024*1024)).toFixed(2)} MB ${u.within_budget ? '✓' : '✕'}</td>
                <td style="padding: 6px;">${Math.round((u.functionality_coverage ?? 1.0) * 100)}%</td>
                <td style="padding: 6px; color: var(--color-info);">${u.S_T}</td>
                <td style="padding: 6px; color: var(--color-warning);">${u.H_T}</td>
                <td style="padding: 6px; font-weight: bold; color: ${badgeColor};">${u.lagrangian > 0 ? '+' : ''}${u.lagrangian}</td>
                <td style="padding: 6px;"><span style="color: ${badgeColor}; font-weight: bold;">${(u.regime || 'geodesic').toUpperCase()}</span></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Mounts per-unit metric views into #insp-slot-metrics
   */
  async mountInspectorMetrics(slotElement, unitData = null, archetypeData = null) {
    if (!slotElement) return;
    slotElement.innerHTML = `
      <div class="insp-metrics-dashboard" style="margin-top: 16px;">
        <h4 style="margin: 0 0 12px; font-size: 14px; color: var(--color-info); display: flex; align-items: center; gap: 8px;">
          <span>📊 Fibration Metric Observability (CDO-13)</span>
          <span style="font-size: 11px; background: var(--badge-info-bg); padding: 2px 8px; border-radius: 4px; border: 1px solid var(--color-info);">
            Lazy-Loaded Tier
          </span>
        </h4>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
          <!-- 1. Payload Treemap -->
          <div class="metric-card" style="padding: 12px; background: var(--panel-abyss); border-radius: 8px; border: 1px solid var(--color-bg-subtle);">
            <div style="font-size: 12px; font-weight: bold; color: var(--panel-text); margin-bottom: 8px;">
              Payload Mass Treemap with Budget Threshold
            </div>
            <div id="insp-treemap-container" style="min-height: 220px;"></div>
          </div>

          <!-- 2. Functionality Radar -->
          <div class="metric-card" style="padding: 12px; background: var(--panel-abyss); border-radius: 8px; border: 1px solid var(--color-bg-subtle);">
            <div style="font-size: 12px; font-weight: bold; color: var(--panel-text); margin-bottom: 8px; display: flex; justify-content: space-between;">
              <span>Functionality Coverage Radar</span>
              <span id="radar-gap-indicator" style="font-size: 10px; color: var(--panel-text-muted);">Gaps for Missing Metrics</span>
            </div>
            <div style="position: relative; height: 220px; width: 100%;">
              <canvas id="insp-radar-canvas"></canvas>
            </div>
          </div>

          <!-- 3. Web Vitals Multi-Series Line -->
          <div class="metric-card" style="padding: 12px; background: var(--panel-abyss); border-radius: 8px; border: 1px solid var(--color-bg-subtle);">
            <div style="font-size: 12px; font-weight: bold; color: var(--panel-text); margin-bottom: 8px;">
              Web Vitals Multi-Series (LCP / INP / CLS Thresholds)
            </div>
            <div style="position: relative; height: 220px; width: 100%;">
              <canvas id="insp-vitals-canvas"></canvas>
            </div>
          </div>

          <!-- 4. Grouped Budget Bars -->
          <div class="metric-card" style="padding: 12px; background: var(--panel-abyss); border-radius: 8px; border: 1px solid var(--color-bg-subtle);">
            <div style="font-size: 12px; font-weight: bold; color: var(--panel-text); margin-bottom: 8px;">
              Grouped Budget Comparison (Unit vs Archetype Budgets)
            </div>
            <div style="position: relative; height: 220px; width: 100%;">
              <canvas id="insp-budget-canvas"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;

    const treemapContainer = slotElement.querySelector('#insp-treemap-container');
    const radarCanvas = slotElement.querySelector('#insp-radar-canvas');
    const vitalsCanvas = slotElement.querySelector('#insp-vitals-canvas');
    const budgetCanvas = slotElement.querySelector('#insp-budget-canvas');

    // 1. Render Payload Treemap
    await renderPayloadTreemap(treemapContainer, archetypeData || {
      categories: [
        { name: 'Scripts (ESM)', bytes: 890000, percent: 48, color: 'var(--color-primary)' },
        { name: 'Assets & Images', bytes: 641200, percent: 35, color: 'var(--color-success)' },
        { name: 'Markup (HTML)', bytes: 142000, percent: 8, color: 'var(--color-warning)' },
        { name: 'Styles (Tokens)', bytes: 112000, percent: 6, color: 'var(--chart-4)' },
        { name: 'Manifests', bytes: 60000, percent: 3, color: 'var(--badge-accent-text)' }
      ],
      total_bytes: archetypeData?.totalBytes || 1845200
    }, {
      budgetBytes: archetypeData?.budgetBytes || 15 * 1024 * 1024
    });

    // 2. Render Functionality Radar
    const funcMetrics = unitData?.functionality_metrics || {
      invariant_coverage: 1.0,
      lattice_pass_rate: 1.0,
      adapter_coverage: 1.0,
      evidence_level_score: 0.95,
      normalized_witness_density: 0.88
    };
    await renderFunctionalityRadar(radarCanvas, funcMetrics, {
      label: unitData?.unit || archetypeData?.name || 'LandingPage'
    });

    // 3. Render Web Vitals Series
    await renderWebVitalsSeries(vitalsCanvas, [
      { sample: 'T-4', lcp: 1450, inp: 130, cls: 0.02 },
      { sample: 'T-3', lcp: 1380, inp: 115, cls: 0.02 },
      { sample: 'T-2', lcp: 1290, inp: 95, cls: 0.01 },
      { sample: 'T-1', lcp: 1240, inp: 85, cls: 0.01 },
      { sample: 'Current (τ)', lcp: 1200, inp: 80, cls: 0.01 }
    ]);

    // 4. Render Grouped Budget Bars
    await renderBudgetBars(budgetCanvas, archetypeData?.totalBytes || 1845200);

    // Save cleanup references on slot
    slotElement.__cleanup = () => {
      if (radarCanvas?._chartInstance) radarCanvas._chartInstance.destroy();
      if (vitalsCanvas?._chartInstance) vitalsCanvas._chartInstance.destroy();
      if (budgetCanvas?._chartInstance) budgetCanvas._chartInstance.destroy();
    };
  }

  unmountInspectorMetrics(slotElement) {
    if (!slotElement) return;
    if (slotElement.__cleanup) {
      slotElement.__cleanup();
      delete slotElement.__cleanup;
    }
    slotElement.innerHTML = '';
  }
}
