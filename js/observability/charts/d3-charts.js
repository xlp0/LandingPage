/**
 * d3.js Fibration & Lagrangian Visualizations (CDO-13 DV-CDO-13-03, DV-CDO-13-04, DV-CDO-13-05)
 * 
 * Implements:
 * 1. Fiber Bundle Map (π: E -> B) over Type Lattice base coordinates
 * 2. Parallel Coordinates across 7 lattice dimensions + 4 metric axes with multi-axis brushing
 * 3. Payload Treemap of per-kind bytes with archetype budget threshold boundary
 * 4. Lagrangian Admissibility Cone on the ℒ-vs-Δt plane with imaginary boundary and pruning region
 * 
 * Loaded lazily via dynamic import(); presentation-only (INV-REF-01).
 */

let _d3 = null;

export async function getD3() {
  if (_d3) return _d3;
  if (typeof window !== 'undefined' && window.d3) {
    _d3 = window.d3;
    return _d3;
  }
  try {
    _d3 = await import('/public/js/vendor/d3.bundle.js');
  } catch {
    try {
      _d3 = await import('../../public/js/vendor/d3.bundle.js');
    } catch {
      _d3 = await import('../../../public/js/vendor/d3.bundle.js');
    }
  }
  return _d3;
}

/**
 * DV-CDO-13-03: Fiber Bundle Map (π: E -> B)
 */
export async function renderFiberBundleMap(container, units = [], options = {}) {
  const d3 = await getD3();
  if (!container) return;
  container.innerHTML = '';

  const width = options.width || container.clientWidth || 700;
  const height = options.height || 260;
  const margin = { top: 30, right: 30, bottom: 50, left: 60 };

  const svg = d3.select(container)
    .append('svg')
    .attr('id', 'fibration-bundle-svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('width', '100%')
    .attr('height', height)
    .style('background', 'var(--surface-primary, var(--color-bg))')
    .style('border-radius', '8px')
    .style('font-family', 'ui-monospace, monospace');

  // Tooltip container
  const tooltip = d3.select(container)
    .append('div')
    .attr('class', 'bundle-tooltip')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('background', 'var(--panel-deep-strong)')
    .style('border', '1px solid var(--color-info)')
    .style('border-radius', '6px')
    .style('padding', '8px 12px')
    .style('font-size', '12px')
    .style('color', 'var(--panel-text)')
    .style('pointer-events', 'none')
    .style('z-index', '100');

  // Base coordinates B (discrete Type Lattice coordinates)
  const baseCoordinates = Array.from(new Set(units.map(u => 
    `${u.tau?.platform || 'web'}:${u.tau?.form_factor || 'desktop'}`
  )));

  const xScale = d3.scalePoint()
    .domain(baseCoordinates)
    .range([margin.left, width - margin.right])
    .padding(0.5);

  const yScale = d3.scaleLinear()
    .domain([0, 1.2]) // S_T or Lagrangian magnitude
    .range([height - margin.bottom, margin.top]);

  // Base manifold line (Base Space B)
  svg.append('line')
    .attr('x1', margin.left - 20)
    .attr('x2', width - margin.right + 20)
    .attr('y1', height - margin.bottom)
    .attr('y2', height - margin.bottom)
    .style('stroke', 'var(--color-text-muted)')
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '4 4');

  svg.append('text')
    .attr('x', width - margin.right)
    .attr('y', height - margin.bottom + 25)
    .style('fill', 'var(--panel-text-muted)')
    .attr('text-anchor', 'end')
    .attr('font-size', '11px')
    .text('Base Space B (Type Lattice τ Coordinates)');

  // Draw Base Points
  baseCoordinates.forEach(coord => {
    const x = xScale(coord);
    svg.append('circle')
      .attr('cx', x)
      .attr('cy', height - margin.bottom)
      .attr('r', 5)
      .style('fill', 'var(--color-info)');

    svg.append('text')
      .attr('x', x)
      .attr('y', height - margin.bottom + 18)
      .style('fill', 'var(--panel-text)')
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .text(coord);
  });

  // Draw per-unit fibers (vertical hairs over base coordinates)
  units.forEach((u, i) => {
    const coord = `${u.tau?.platform || 'web'}:${u.tau?.form_factor || 'desktop'}`;
    const baseX = xScale(coord) + (i % 2 === 0 ? -12 : 12) * Math.floor(i / 1 + 1) * 0.7;
    const fiberHeight = yScale(Math.max(0.1, u.S_T || 0.5));
    const isGeodesic = u.regime === 'geodesic';
    const isPruned = u.regime === 'pruning';
    const fiberColor = isGeodesic ? 'var(--color-success)' : (isPruned ? 'var(--color-danger)' : 'var(--color-warning)');
    // Fiber thickness encodes metric magnitude (payload or S_T)
    const thickness = Math.max(3, Math.min(10, (u.S_T || 0.5) * 8));

    // Fiber hair
    const fiber = svg.append('line')
      .attr('class', `fiber-line fiber-${u.unit}`)
      .attr('x1', baseX)
      .attr('x2', baseX)
      .attr('y1', height - margin.bottom)
      .attr('y2', fiberHeight)
      .attr('stroke', fiberColor)
      .attr('stroke-width', thickness)
      .attr('stroke-linecap', 'round')
      .style('cursor', 'pointer')
      .style('opacity', 0.85);

    // Top fiber tip node
    const tip = svg.append('circle')
      .attr('cx', baseX)
      .attr('cy', fiberHeight)
      .attr('r', thickness / 1.5 + 2)
      .attr('fill', fiberColor)
      .style('stroke', 'var(--panel-text)')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer');

    // Label
    svg.append('text')
      .attr('x', baseX)
      .attr('y', fiberHeight - 8)
      .attr('fill', fiberColor)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .text(u.unit);

    // Hover interaction
    const handleMouseOver = (event) => {
      fiber.style('opacity', 1.0).attr('stroke-width', thickness + 3);
      tip.attr('r', thickness / 1.5 + 4);
      tooltip.style('visibility', 'visible')
        .html(`
          <div style="font-weight:bold; margin-bottom:4px; color:${fiberColor};">
            ${u.unit} (${u.regime.toUpperCase()})
          </div>
          <div>Lattice τ: <code>${coord}</code></div>
          <div>Epiplexity (S_T): <b>${u.S_T}</b></div>
          <div>Axiomatic Entropy (H_T): <b>${u.H_T}</b></div>
          <div>Lagrangian (ℒ): <b>${u.lagrangian}</b></div>
          <div>Payload: <b>${((u.payload_bytes || 0) / (1024*1024)).toFixed(2)} MB</b></div>
          <div>LCP: <b>${u.performance_summary?.lcp_ms || '—'} ms</b></div>
          <div>Residual Entropy: <b>${u.performance_summary?.residual_entropy ?? 0}</b></div>
        `);
    };

    const handleMouseMove = (event) => {
      const bounds = container.getBoundingClientRect();
      tooltip.style('top', `${event.clientY - bounds.top - 10}px`)
        .style('left', `${event.clientX - bounds.left + 15}px`);
    };

    const handleMouseOut = () => {
      fiber.style('opacity', 0.85).attr('stroke-width', thickness);
      tip.attr('r', thickness / 1.5 + 2);
      tooltip.style('visibility', 'hidden');
    };

    fiber.on('mouseover', handleMouseOver)
      .on('mousemove', handleMouseMove)
      .on('mouseout', handleMouseOut);

    tip.on('mouseover', handleMouseOver)
      .on('mousemove', handleMouseMove)
      .on('mouseout', handleMouseOut);
  });

  return svg.node();
}

/**
 * DV-CDO-13-04: Parallel Coordinates across 7 lattice dimensions + 4 metric axes with brushing
 */
export async function renderParallelCoordinates(container, units = [], options = {}) {
  const d3 = await getD3();
  if (!container) return;
  container.innerHTML = '';

  const width = options.width || container.clientWidth || 900;
  const height = options.height || 340;
  const margin = { top: 40, right: 30, bottom: 40, left: 30 };

  // Declared 7 lattice dimensions + 4 metric axes
  const dimensions = [
    { key: 'platform', label: '1. Platform', values: ['pwa', 'tauri', 'desktop_web', 'mobile_hybrid', 'web'] },
    { key: 'form_factor', label: '2. Form Factor', values: ['compact_mobile', 'large_mobile', 'tablet', 'desktop_standard', 'ultrawide', 'desktop'] },
    { key: 'orientation', label: '3. Orientation', values: ['portrait', 'landscape'] },
    { key: 'locale', label: '4. Locale', values: ['en-US', 'ar-EG', 'de-DE', 'zh-Hans'] },
    { key: 'display_mode', label: '5. Display', values: ['dark', 'light', 'high_contrast'] },
    { key: 'power_mode', label: '6. Power', values: ['performance', 'balanced', 'energy_saving'] },
    { key: 'adapter', label: '7. Adapter', values: ['semantic_tokens_css', 'waapi', 'animejs', 'dom'] },
    { key: 'lcp_ms', label: 'LCP (ms)', type: 'numeric', domain: [500, 5000] },
    { key: 'payload_mb', label: 'Payload (MB)', type: 'numeric', domain: [0, 500] },
    { key: 'functionality_pct', label: 'Func (%)', type: 'numeric', domain: [0, 100] },
    { key: 'lagrangian', label: 'Lagrangian ℒ', type: 'numeric', domain: [-1.0, 1.0] }
  ];

  // Map units to flat row format
  const rows = units.map(u => ({
    raw: u,
    unit: u.unit,
    regime: u.regime,
    platform: u.tau?.platform || 'web',
    form_factor: u.tau?.form_factor || 'desktop',
    orientation: u.tau?.orientation || 'portrait',
    locale: u.tau?.locale || 'en-US',
    display_mode: u.tau?.display_mode || 'dark',
    power_mode: u.tau?.power_mode || 'balanced',
    adapter: u.tau?.adapter || 'semantic_tokens_css',
    lcp_ms: u.performance_summary?.lcp_ms || 1200,
    payload_mb: Number(((u.payload_bytes || 0) / (1024 * 1024)).toFixed(1)),
    functionality_pct: Math.round((u.functionality_coverage ?? 1.0) * 100),
    lagrangian: u.lagrangian ?? 0.0
  }));

  const svg = d3.select(container)
    .append('svg')
    .attr('id', 'parallel-coords-svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('width', '100%')
    .attr('height', height)
    .style('background', 'var(--surface-primary, var(--color-bg))')
    .style('border-radius', '8px')
    .style('font-family', 'ui-monospace, monospace');

  const x = d3.scalePoint()
    .domain(dimensions.map(d => d.key))
    .range([margin.left, width - margin.right])
    .padding(0.2);

  const y = {};
  dimensions.forEach(dim => {
    if (dim.type === 'numeric') {
      y[dim.key] = d3.scaleLinear()
        .domain(dim.domain)
        .range([height - margin.bottom, margin.top]);
    } else {
      y[dim.key] = d3.scalePoint()
        .domain(dim.values)
        .range([height - margin.bottom, margin.top])
        .padding(0.2);
    }
  });

  const activeBrushes = {};

  function path(d) {
    return d3.line()(dimensions.map(dim => {
      const val = d[dim.key];
      const scale = y[dim.key];
      const yPos = scale(val !== undefined && scale.domain().includes(val) ? val : scale.domain()[0]);
      return [x(dim.key), yPos];
    }));
  }

  // Draw lines
  const lineGroup = svg.append('g').attr('class', 'parallel-lines');
  const lines = lineGroup.selectAll('path')
    .data(rows)
    .enter()
    .append('path')
    .attr('d', path)
    .attr('class', d => `par-line par-line-${d.unit}`)
    .style('fill', 'none')
    .attr('stroke', d => d.regime === 'geodesic' ? 'var(--color-success)' : (d.regime === 'pruning' ? 'var(--color-danger)' : 'var(--color-warning)'))
    .attr('stroke-width', 2.5)
    .attr('stroke-opacity', 0.85);

  function isRowSelected(d) {
    for (const [key, range] of Object.entries(activeBrushes)) {
      if (!range) continue;
      const scale = y[key];
      const val = d[key];
      const pos = scale(val !== undefined ? val : scale.domain()[0]);
      if (pos < range[0] || pos > range[1]) {
        return false;
      }
    }
    return true;
  }

  function applyBrush() {
    let filteredUnits = [];
    lines.each(function(d) {
      const selected = isRowSelected(d);
      d3.select(this)
        .attr('stroke-opacity', selected ? 0.95 : 0.08)
        .attr('stroke-width', selected ? 3.5 : 1);
      if (selected) {
        filteredUnits.push(d.raw);
      }
    });

    if (options.onBrushChange) {
      options.onBrushChange(filteredUnits);
    }
  }

  // Draw axes
  const axes = svg.selectAll('.axis')
    .data(dimensions)
    .enter()
    .append('g')
    .attr('class', 'dimension-axis')
    .attr('transform', d => `translate(${x(d.key)}, 0)`);

  axes.each(function(dim) {
    const scale = y[dim.key];
    const axisGenerator = dim.type === 'numeric'
      ? d3.axisLeft(scale).ticks(5)
      : d3.axisLeft(scale);
    d3.select(this).call(axisGenerator);
  });

  axes.selectAll('text')
    .style('fill', 'var(--panel-text-muted)')
    .attr('font-size', '9px');

  axes.selectAll('path, line')
    .style('stroke', 'var(--panel-text-muted)');

  // Axis Titles
  axes.append('text')
    .attr('y', margin.top - 12)
    .attr('text-anchor', 'middle')
    .style('fill', 'var(--color-info)')
    .attr('font-size', '10px')
    .attr('font-weight', 'bold')
    .text(d => d.label);

  // Attach d3.brushY to each axis for brushing
  axes.append('g')
    .attr('class', 'brush')
    .each(function(dim) {
      d3.select(this).call(
        d3.brushY()
          .extent([[-12, margin.top], [12, height - margin.bottom]])
          .on('brush end', function(event) {
            if (event.selection) {
              activeBrushes[dim.key] = event.selection;
            } else {
              delete activeBrushes[dim.key];
            }
            applyBrush();
          })
      );
    });

  return {
    node: svg.node(),
    filterUnits: (unitsToHighlight) => {
      const names = new Set(unitsToHighlight.map(u => u.unit));
      lines.attr('stroke-opacity', d => names.has(d.unit) ? 0.95 : 0.1)
        .attr('stroke-width', d => names.has(d.unit) ? 3.5 : 1.5);
    }
  };
}

/**
 * DV-CDO-13-04: Payload Treemap of per-kind bytes with archetype budget overlay
 */
export async function renderPayloadTreemap(container, payloadData, options = {}) {
  const d3 = await getD3();
  if (!container) return;
  container.innerHTML = '';

  const width = options.width || container.clientWidth || 500;
  const height = options.height || 260;
  const budgetBytes = options.budgetBytes || 15 * 1024 * 1024; // 15MB default

  // Format categories
  let categories = payloadData?.categories || [];
  if (categories.length === 0 && payloadData?.per_kind) {
    const total = payloadData.total_bytes || 1;
    categories = Object.entries(payloadData.per_kind).map(([ext, size]) => ({
      name: ext,
      bytes: size,
      percent: Math.round((size / total) * 100),
      color: ext.includes('js') ? 'var(--color-primary)' : (ext.includes('html') ? 'var(--color-warning)' : 'var(--color-success)')
    }));
  }

  const totalBytes = categories.reduce((sum, c) => sum + (c.bytes || 0), 0) || payloadData?.total_bytes || 0;
  const withinBudget = totalBytes <= budgetBytes;
  const utilization = ((totalBytes / budgetBytes) * 100).toFixed(1);

  // Header and Budget Threshold Overlay
  const header = d3.select(container)
    .append('div')
    .attr('class', 'treemap-header-overlay')
    .style('display', 'flex')
    .style('justify-content', 'space-between')
    .style('align-items', 'center')
    .style('margin-bottom', '8px')
    .style('padding', '6px 10px')
    .style('background', 'var(--panel)')
    .style('border-radius', '6px')
    .style('border', `1px solid ${withinBudget ? 'var(--color-success)' : 'var(--color-danger)'}`);

  header.append('div')
    .style('font-size', '12px')
    .style('font-weight', '600')
    .style('color', 'var(--panel-text)')
    .html(`<span>Payload Mass Treemap: <b>${(totalBytes / (1024*1024)).toFixed(2)} MB</b></span>`);

  header.append('div')
    .style('font-size', '11px')
    .style('color', withinBudget ? 'var(--color-success)' : 'var(--color-danger)')
    .style('font-weight', 'bold')
    .text(`Archetype Budget: ${(budgetBytes / (1024*1024)).toFixed(0)} MB (${utilization}% - ${withinBudget ? '✓ Within Budget' : '✕ Breach'})`);

  const rootData = {
    name: 'root',
    children: categories.map(c => ({
      name: c.name,
      value: c.bytes,
      percent: c.percent,
      color: c.color || 'var(--color-info)'
    }))
  };

  const root = d3.hierarchy(rootData)
    .sum(d => d.value)
    .sort((a, b) => b.value - a.value);

  d3.treemap()
    .size([width, height - 40])
    .padding(2)
    (root);

  const svg = d3.select(container)
    .append('svg')
    .attr('id', 'payload-treemap-svg')
    .attr('viewBox', `0 0 ${width} ${height - 40}`)
    .attr('width', '100%')
    .attr('height', height - 40)
    .style('border-radius', '6px')
    .style('background', 'var(--panel-abyss)');

  const cell = svg.selectAll('g')
    .data(root.leaves())
    .enter()
    .append('g')
    .attr('transform', d => `translate(${d.x0},${d.y0})`);

  cell.append('rect')
    .attr('width', d => Math.max(0, d.x1 - d.x0))
    .attr('height', d => Math.max(0, d.y1 - d.y0))
    .attr('fill', d => d.data.color)
    .attr('rx', 3)
    .attr('opacity', 0.85);

  cell.append('text')
    .attr('x', 6)
    .attr('y', 16)
    .style('fill', 'var(--panel-text)')
    .attr('font-size', '11px')
    .attr('font-weight', 'bold')
    .text(d => (d.x1 - d.x0 > 50) ? d.data.name : '');

  cell.append('text')
    .attr('x', 6)
    .attr('y', 30)
    .style('fill', 'var(--color-surface)')
    .attr('font-size', '10px')
    .text(d => (d.x1 - d.x0 > 60 && d.y1 - d.y0 > 35) ? `${(d.data.value / 1024).toFixed(0)} KB (${d.data.percent}%)` : '');

  return svg.node();
}

/**
 * DV-CDO-13-05: Lagrangian Admissibility Cone (ℒ vs Δt plane)
 */
export async function renderAdmissibilityCone(container, units = [], options = {}) {
  const d3 = await getD3();
  if (!container) return;
  container.innerHTML = '';

  const width = options.width || container.clientWidth || 700;
  const height = options.height || 320;
  const margin = { top: 40, right: 40, bottom: 50, left: 60 };

  const svg = d3.select(container)
    .append('svg')
    .attr('id', 'admissibility-cone-svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('width', '100%')
    .attr('height', height)
    .style('background', 'var(--surface-primary, var(--color-bg))')
    .style('border-radius', '8px')
    .style('font-family', 'ui-monospace, monospace');

  // X scale: Δt (render/load latency in ms: 0 to 5000)
  const xScale = d3.scaleLinear()
    .domain([0, 5000])
    .range([margin.left, width - margin.right]);

  // Y scale: ℒ (Software Lagrangian: -1.0 to +1.0)
  const yScale = d3.scaleLinear()
    .domain([-1.0, 1.0])
    .range([height - margin.bottom, margin.top]);

  const yZero = yScale(0);

  // Shading Admissible Cone (ℒ > 0)
  svg.append('rect')
    .attr('id', 'admissible-cone-region')
    .attr('x', margin.left)
    .attr('y', margin.top)
    .attr('width', width - margin.left - margin.right)
    .attr('height', yZero - margin.top)
    .style('fill', 'var(--color-success-surface)');

  // Shading Demonic Pruning Region (ℒ <= 0)
  svg.append('rect')
    .attr('id', 'demonic-pruning-region')
    .attr('x', margin.left)
    .attr('y', yZero)
    .attr('width', width - margin.left - margin.right)
    .attr('height', height - margin.bottom - yZero)
    .style('fill', 'var(--badge-danger-bg)');

  // Imaginary-Metric Boundary (ℒ = 0)
  svg.append('line')
    .attr('id', 'imaginary-metric-boundary')
    .attr('x1', margin.left)
    .attr('x2', width - margin.right)
    .attr('y1', yZero)
    .attr('y2', yZero)
    .style('stroke', 'var(--color-warning)')
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '6 4');

  // Region Labels
  svg.append('text')
    .attr('x', width - margin.right - 10)
    .attr('y', margin.top + 22)
    .attr('text-anchor', 'end')
    .style('fill', 'var(--color-success)')
    .attr('font-size', '12px')
    .attr('font-weight', 'bold')
    .text('Admissible Cone (ℒ > 0, ds ∈ ℝ⁺ Stationary Geodesic)');

  svg.append('text')
    .attr('x', width - margin.right - 10)
    .attr('y', yZero - 8)
    .attr('text-anchor', 'end')
    .style('fill', 'var(--color-warning)')
    .attr('font-size', '11px')
    .attr('font-style', 'italic')
    .text('Imaginary Boundary (ℒ = 0, ds = 0)');

  svg.append('text')
    .attr('x', width - margin.right - 10)
    .attr('y', height - margin.bottom - 15)
    .attr('text-anchor', 'end')
    .style('fill', 'var(--color-danger)')
    .attr('font-size', '12px')
    .attr('font-weight', 'bold')
    .text('Demonic Pruning Region (ℒ ≤ 0, ds ∈ iℝ Imaginary Debt)');

  // Axes
  const xAxis = d3.axisBottom(xScale).ticks(6).tickFormat(d => `${d}ms`);
  const yAxis = d3.axisLeft(yScale).ticks(8).tickFormat(d => `${d > 0 ? '+' : ''}${d}`);

  svg.append('g')
    .attr('transform', `translate(0, ${height - margin.bottom})`)
    .call(xAxis)
    .selectAll('text').style('fill', 'var(--panel-text-muted)');

  svg.append('g')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(yAxis)
    .selectAll('text').style('fill', 'var(--panel-text-muted)');

  svg.selectAll('.domain, line').style('stroke', 'var(--panel-text-muted)');

  // Axis Labels
  svg.append('text')
    .attr('x', (width + margin.left) / 2)
    .attr('y', height - 10)
    .attr('text-anchor', 'middle')
    .style('fill', 'var(--panel-text)')
    .attr('font-size', '11px')
    .text('Execution Latency / Time Metric Δt (ms)');

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -(height / 2))
    .attr('y', 18)
    .attr('text-anchor', 'middle')
    .style('fill', 'var(--panel-text)')
    .attr('font-size', '11px')
    .text('Software Lagrangian ℒ = S_T - H_T');

  // Candidate units plotted
  units.forEach(u => {
    const deltaT = u.performance_summary?.lcp_ms || (u.regime === 'pruning' ? 4500 : 1200);
    const L = u.lagrangian !== undefined ? u.lagrangian : (u.S_T - u.H_T);
    const cx = xScale(deltaT);
    const cy = yScale(L);
    const isPruned = L <= 0;
    const color = isPruned ? 'var(--color-danger)' : 'var(--color-success)';

    // Node glyph
    svg.append('circle')
      .attr('class', `unit-point unit-point-${u.unit}`)
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('r', 7)
      .attr('fill', color)
      .style('stroke', 'var(--panel-text)')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer');

    // Label with dominant H_T contributor if pruned (AC E2 requirement)
    let labelText = `${u.unit} (ℒ = ${L > 0 ? '+' : ''}${L.toFixed(3)})`;
    if (isPruned) {
      const dominant = u.dominant_entropy_contributor || 'budget_breach';
      labelText += ` [Pruned: Dominant H_T = ${dominant}]`;
    }

    svg.append('text')
      .attr('class', `unit-label unit-label-${u.unit}`)
      .attr('x', cx + 12)
      .attr('y', isPruned ? cy + 16 : cy - 8)
      .attr('fill', color)
      .attr('font-size', '11px')
      .attr('font-weight', isPruned ? 'bold' : 'normal')
      .text(labelText);
  });

  return svg.node();
}
