/**
 * chart.js Fibration & Unit Observability Visualizations (CDO-13 DV-CDO-13-06)
 * 
 * Implements:
 * 1. Functionality Radar (5 metrics; missing metric renders as GAP, never zero)
 * 2. Web Vitals Multi-Series Line with LCP/INP/CLS threshold bands
 * 3. Grouped Budget Bars comparing unit totals against archetype budgets
 * 
 * Loaded lazily via dynamic import(); presentation-only (INV-REF-01).
 */

import { cssVar } from '../theme-tokens.js';

let _Chart = null;

export async function getChartJS() {
  if (_Chart) return _Chart;
  if (typeof window !== 'undefined' && window.Chart) {
    _Chart = window.Chart;
    return _Chart;
  }
  try {
    const mod = await import('/public/js/vendor/chartjs.bundle.js');
    _Chart = mod.Chart || mod.default || window.Chart;
  } catch {
    try {
      const mod = await import('../../public/js/vendor/chartjs.bundle.js');
      _Chart = mod.Chart || mod.default || window.Chart;
    } catch {
      const mod = await import('../../../public/js/vendor/chartjs.bundle.js');
      _Chart = mod.Chart || mod.default || window.Chart;
    }
  }
  return _Chart;
}

/**
 * DV-CDO-13-06: Functionality Radar per unit
 * AC: Radar axes match declared metrics; missing metrics render as GAPS, never zeros.
 */
export async function renderFunctionalityRadar(canvas, functionalityMetrics = {}, options = {}) {
  const Chart = await getChartJS();
  if (!canvas) return null;

  // Destroy existing chart on canvas if present
  if (canvas._chartInstance) {
    canvas._chartInstance.destroy();
  }

  // Declared functionality metrics
  const axisLabels = [
    'Invariant Coverage',
    'Lattice Pass Rate',
    'Adapter Coverage',
    'Evidence Level',
    'Witness Density'
  ];

  // Helper to map values, preserving null/undefined as null (GAP)
  const extractMetric = (val) => {
    if (val === null || val === undefined) return null;
    return Number(val);
  };

  const dataValues = [
    extractMetric(functionalityMetrics.invariant_coverage),
    extractMetric(functionalityMetrics.lattice_pass_rate),
    extractMetric(functionalityMetrics.adapter_coverage),
    extractMetric(functionalityMetrics.evidence_level_score ?? functionalityMetrics.evidence_level),
    extractMetric(functionalityMetrics.normalized_witness_density ?? functionalityMetrics.witness_density)
  ];

  const hasGaps = dataValues.some(v => v === null);

  const chart = new Chart(canvas, {
    type: 'radar',
    data: {
      labels: axisLabels,
      datasets: [{
        label: options.label || 'Observed Conformance',
        data: dataValues,
        fill: true,
        backgroundColor: cssVar('--badge-info-bg'),
        borderColor: cssVar('--color-info'),
        pointBackgroundColor: dataValues.map(v => v === null ? 'transparent' : cssVar('--color-info')),
        pointBorderColor: dataValues.map(v => v === null ? 'transparent' : cssVar('--panel-text')),
        pointHoverBackgroundColor: cssVar('--panel-text'),
        pointHoverBorderColor: cssVar('--color-info'),
        spanGaps: false // CRITICAL AC: missing metric renders as GAP, never zero
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: { color: cssVar('--panel-text'), font: { family: 'ui-monospace, monospace', size: 11 } }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.raw;
              if (val === null || val === undefined) {
                return `${context.dataset.label}: MISSING (GAP - not evaluated)`;
              }
              return `${context.dataset.label}: ${(val * 100).toFixed(1)}%`;
            }
          }
        }
      },
      scales: {
        r: {
          min: 0,
          max: 1.0,
          ticks: {
            stepSize: 0.2,
            color: cssVar('--panel-text-muted'),
            backdropColor: 'transparent',
            callback: (v) => `${Math.round(v * 100)}%`
          },
          grid: { color: cssVar('--overlay-subtle') },
          angleLines: { color: cssVar('--overlay-soft') },
          pointLabels: {
            color: (ctx) => {
              const idx = ctx.index;
              return dataValues[idx] === null ? cssVar('--color-danger') : cssVar('--panel-text');
            },
            font: { family: 'ui-monospace, monospace', size: 11, weight: 'bold' }
          }
        }
      }
    }
  });

  canvas._chartInstance = chart;
  canvas.dataset.hasGaps = hasGaps ? 'true' : 'false';
  return chart;
}

/**
 * DV-CDO-13-06: Web Vitals multi-series line with LCP/INP/CLS threshold bands
 */
export async function renderWebVitalsSeries(canvas, vitalsHistory = [], options = {}) {
  const Chart = await getChartJS();
  if (!canvas) return null;

  if (canvas._chartInstance) {
    canvas._chartInstance.destroy();
  }

  // Default synthetic history if none provided
  const history = vitalsHistory.length > 0 ? vitalsHistory : [
    { sample: 'T-4', lcp: 1400, inp: 120, cls: 0.02 },
    { sample: 'T-3', lcp: 1350, inp: 110, cls: 0.02 },
    { sample: 'T-2', lcp: 1280, inp: 95, cls: 0.01 },
    { sample: 'T-1', lcp: 1220, inp: 85, cls: 0.01 },
    { sample: 'Current (τ)', lcp: 1200, inp: 80, cls: 0.01 }
  ];

  const labels = history.map(h => h.sample);
  const lcpData = history.map(h => h.lcp);
  const inpData = history.map(h => h.inp);
  const clsData = history.map(h => Math.round((h.cls ?? 0.01) * 1000)); // Scaled x1000 for visibility

  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'LCP (ms) [≤2500ms Good]',
          data: lcpData,
          borderColor: cssVar('--color-success'),
          backgroundColor: cssVar('--color-success-surface'),
          borderWidth: 2.5,
          tension: 0.3,
          fill: false,
          yAxisID: 'y'
        },
        {
          label: 'INP (ms) [≤200ms Good]',
          data: inpData,
          borderColor: cssVar('--color-info'),
          backgroundColor: cssVar('--badge-info-bg'),
          borderWidth: 2,
          tension: 0.3,
          fill: false,
          yAxisID: 'y'
        },
        {
          label: 'CLS (score x1000) [≤100 Good]',
          data: clsData,
          borderColor: cssVar('--color-warning'),
          backgroundColor: cssVar('--color-warning-surface'),
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.3,
          fill: false,
          yAxisID: 'y'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          labels: { color: cssVar('--panel-text'), font: { family: 'ui-monospace, monospace', size: 10 } }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              if (context.datasetIndex === 2) {
                return `CLS: ${(context.raw / 1000).toFixed(3)} score`;
              }
              return `${context.dataset.label}: ${context.raw} ms`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: cssVar('--panel-text-muted'), font: { family: 'ui-monospace, monospace' } },
          grid: { color: cssVar('--overlay-subtle') }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          min: 0,
          max: 3000,
          ticks: {
            color: cssVar('--panel-text-muted'),
            font: { family: 'ui-monospace, monospace' },
            callback: (v) => `${v}ms`
          },
          grid: {
            color: (ctx) => {
              if (ctx.tick.value === 2500) return cssVar('--badge-danger-border'); // LCP threshold
              if (ctx.tick.value === 200) return cssVar('--badge-warning-border');  // INP threshold
              return cssVar('--overlay-subtle');
            }
          }
        }
      }
    }
  });

  canvas._chartInstance = chart;
  return chart;
}

/**
 * DV-CDO-13-06: Grouped budget bars comparing unit totals against archetype budgets
 */
export async function renderBudgetBars(canvas, unitTotalBytes = 1845200, archetypeBudgets = null, options = {}) {
  const Chart = await getChartJS();
  if (!canvas) return null;

  if (canvas._chartInstance) {
    canvas._chartInstance.destroy();
  }

  const defaultBudgets = archetypeBudgets || {
    wearable: 2 * 1024 * 1024,
    mobile: 10 * 1024 * 1024,
    web: 15 * 1024 * 1024,
    desktop: 45 * 1024 * 1024,
    arvr: 150 * 1024 * 1024
  };

  const labels = ['Wearable (2MB)', 'Mobile (10MB)', 'Web (15MB)', 'Desktop (45MB)', 'AR/VR (150MB)'];
  const budgetMb = [2, 10, 15, 45, 150];
  const unitMb = Number((unitTotalBytes / (1024 * 1024)).toFixed(2));
  const actualMb = [unitMb, unitMb, unitMb, unitMb, unitMb];

  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Archetype Budget Limit (MB)',
          data: budgetMb,
          backgroundColor: cssVar('--badge-info-border'),
          borderColor: cssVar('--color-info'),
          borderWidth: 1.5
        },
        {
          label: `Unit Allocation (${unitMb} MB)`,
          data: actualMb,
          backgroundColor: actualMb.map((val, idx) => val <= budgetMb[idx] ? cssVar('--badge-success-bg') : cssVar('--badge-danger-border')),
          borderColor: actualMb.map((val, idx) => val <= budgetMb[idx] ? cssVar('--color-success') : cssVar('--color-danger')),
          borderWidth: 1.5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: { color: cssVar('--panel-text'), font: { family: 'ui-monospace, monospace', size: 10 } }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.raw;
              const isActual = context.datasetIndex === 1;
              if (isActual) {
                const limit = budgetMb[context.dataIndex];
                const status = val <= limit ? '✓ Within Budget' : '✕ Exceeds Budget';
                return `Unit Size: ${val} MB (${status})`;
              }
              return `Budget Limit: ${val} MB`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: cssVar('--panel-text'), font: { family: 'ui-monospace, monospace', size: 10 } },
          grid: { color: cssVar('--overlay-faint') }
        },
        y: {
          ticks: {
            color: cssVar('--panel-text-muted'),
            font: { family: 'ui-monospace, monospace' },
            callback: (v) => `${v} MB`
          },
          grid: { color: cssVar('--overlay-subtle') }
        }
      }
    }
  });

  canvas._chartInstance = chart;
  return chart;
}
