/**
 * penpot-screens.mjs
 * Sprint CDO-15: Visual wireframe builders for Penpot Navigation SSOT.
 * Faithfully mirrors the actual content, layout, cards, and UI components of:
 * - LandingPage/index.html (GovTech Platform & Mission Control Overview)
 * - LandingPage/app.html (MCard Manager Cockpit & Telemetry Viewport)
 * - LandingPage/responsive-lab.html (Responsive UI Lab & Viewport Workbench)
 */

export function createRectShape({ id, name, parentId, frameId, pageId, x, y, width, height, fillColor, fillOpacity = 1, strokes = [], radius = 0 }) {
  const x1 = x;
  const y1 = y;
  const x2 = x + width;
  const y2 = y + height;
  const normalizedStrokes = strokes.map(s => ({
    'stroke-color': s.strokeColor || s['stroke-color'],
    'stroke-width': s.strokeWidth ?? s['stroke-width'] ?? 1,
    'stroke-opacity': s.strokeOpacity ?? s['stroke-opacity'] ?? 1,
    'stroke-style': s.strokeStyle || s['stroke-style'] || 'solid',
    'stroke-alignment': s.strokeAlignment || s['stroke-alignment'] || 'inner',
  }));
  const fills = fillColor ? [{ 'fill-color': fillColor, 'fill-opacity': fillOpacity }] : [];
  return {
    id,
    name,
    type: 'rect',
    'page-id': pageId,
    'parent-id': parentId,
    'frame-id': frameId,
    x,
    y,
    width,
    height,
    rotation: 0,
    selrect: { x, y, width, height, x1, y1, x2, y2 },
    points: [
      { x: x1, y: y1 },
      { x: x2, y: y1 },
      { x: x2, y: y2 },
      { x: x1, y: y2 },
    ],
    transform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    'transform-inverse': { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    strokes: normalizedStrokes,
    fills,
    ...(radius > 0 ? { r1: radius, r2: radius, r3: radius, r4: radius } : {}),
  };
}

export function createTextShape({ id, name, parentId, frameId, pageId, x, y, width, height, text, fontSize = '16', fontWeight = '400', fontFamily = 'Inter', fillColor = '#FFFFFF' }) {
  const x1 = x;
  const y1 = y;
  const x2 = x + width;
  const y2 = y + height;
  return {
    id,
    name,
    type: 'text',
    'page-id': pageId,
    'parent-id': parentId,
    'frame-id': frameId,
    x,
    y,
    width,
    height,
    rotation: 0,
    selrect: { x, y, width, height, x1, y1, x2, y2 },
    points: [
      { x: x1, y: y1 },
      { x: x2, y: y1 },
      { x: x2, y: y2 },
      { x: x1, y: y2 },
    ],
    transform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    'transform-inverse': { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    strokes: [],
    fills: [{ 'fill-color': fillColor, 'fill-opacity': 1 }],
    content: {
      type: 'root',
      children: [
        {
          type: 'paragraph-set',
          children: [
            {
              type: 'paragraph',
              fontFamily,
              fontSize: String(fontSize),
              fontWeight: String(fontWeight),
              children: [
                {
                  text,
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

// ── Screen Builders based on actual LandingPage HTML files ───────────────────

export function buildIndexHtmlShapes(r, xOffset, pageId) {
  const shapes = [];
  const p = (num) => `d7570000-0000-8000-8000-00000001${String(num).padStart(4, '0')}`;
  let seq = 1;

  // 1. Top Bar
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Top Navigation Bar',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset,
    y: 100,
    width: 1200,
    height: 56,
    fillColor: '#1E293B',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));

  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Logo Text',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 24,
    y: 118,
    width: 200,
    height: 24,
    text: '⚡ GovTech OS • Platform',
    fontSize: '15',
    fontWeight: '700',
    fillColor: '#38BDF8',
  }));

  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Faro Status Badge',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 230,
    y: 114,
    width: 130,
    height: 28,
    radius: 6,
    fillColor: '#0F172A',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Faro Status Text',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 244,
    y: 120,
    width: 110,
    height: 18,
    text: '🟢 Faro RUM Active',
    fontSize: '11',
    fontWeight: '600',
    fillColor: '#10B981',
  }));

  // Top Nav Buttons
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Nav Button Mission Control',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 380,
    y: 114,
    width: 155,
    height: 28,
    radius: 6,
    fillColor: '#2563EB',
    strokes: [{ strokeColor: '#3B82F6', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Nav Text Mission Control',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 395,
    y: 120,
    width: 130,
    height: 18,
    text: '🎛️ Mission Control',
    fontSize: '11',
    fontWeight: '600',
    fillColor: '#FFFFFF',
  }));

  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Nav Button Responsive Lab',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 550,
    y: 114,
    width: 155,
    height: 28,
    radius: 6,
    fillColor: '#2563EB',
    strokes: [{ strokeColor: '#3B82F6', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Nav Text Responsive Lab',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 565,
    y: 120,
    width: 130,
    height: 18,
    text: '📐 Responsive Lab',
    fontSize: '11',
    fontWeight: '600',
    fillColor: '#FFFFFF',
  }));

  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Button Least Action',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 720,
    y: 114,
    width: 140,
    height: 28,
    radius: 6,
    fillColor: '#0F172A',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Text Least Action',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 735,
    y: 120,
    width: 120,
    height: 18,
    text: '🧭 Least Action (ℒ)',
    fontSize: '11',
    fillColor: '#94A3B8',
  }));

  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Route Handle Chip',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 980,
    y: 114,
    width: 196,
    height: 28,
    radius: 6,
    fillColor: '#0F172A',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Route Handle Text',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 995,
    y: 120,
    width: 170,
    height: 18,
    text: r.handle,
    fontSize: '11',
    fillColor: '#64748B',
  }));

  // 2. Hero Section
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Hero Subhead Tag',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 40,
    y: 175,
    width: 500,
    height: 20,
    text: 'CONVERSATIONAL DEVELOPMENT ORCHESTRATION • PHASE 15',
    fontSize: '11',
    fontWeight: '700',
    fillColor: '#64748B',
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Hero Headline',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 40,
    y: 198,
    width: 800,
    height: 36,
    text: 'GovTech Platform Cockpit & Observability Gateway',
    fontSize: '24',
    fontWeight: '700',
    fillColor: '#F8FAFC',
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Hero Paragraph',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 40,
    y: 236,
    width: 900,
    height: 22,
    text: 'Deterministic fiber totality, least-action navigation, and verified sovereign deployment units.',
    fontSize: '13',
    fillColor: '#94A3B8',
  }));

  // 3. Card 1: Mission Control
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Card 1 Container',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 40,
    y: 270,
    width: 355,
    height: 225,
    radius: 10,
    fillColor: '#1E293B',
    strokes: [{ strokeColor: '#3B82F6', strokeWidth: 1.5, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Card 1 Title',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 60,
    y: 290,
    width: 300,
    height: 26,
    text: '🎛️ Mission Control',
    fontSize: '17',
    fontWeight: '700',
    fillColor: '#F8FAFC',
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Card 1 Description',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 60,
    y: 324,
    width: 315,
    height: 36,
    text: 'Operational cockpit for observable data, Grafana Faro Web SDK RUM telemetry, and deployment metrics.',
    fontSize: '12',
    fillColor: '#94A3B8',
  }));
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Card 1 Chip',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 60,
    y: 375,
    width: 315,
    height: 24,
    radius: 4,
    fillColor: '#0F172A',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Card 1 Chip Text',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 70,
    y: 380,
    width: 295,
    height: 16,
    text: '✓ Grafana Faro Telemetry • CORS Safe',
    fontSize: '10',
    fontWeight: '600',
    fillColor: '#38BDF8',
  }));
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Card 1 Button',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 60,
    y: 415,
    width: 240,
    height: 36,
    radius: 6,
    fillColor: '#2563EB',
    strokes: [{ strokeColor: '#3B82F6', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Card 1 Button Text',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 75,
    y: 425,
    width: 210,
    height: 18,
    text: '➔ Open Observability Cockpit',
    fontSize: '12',
    fontWeight: '600',
    fillColor: '#FFFFFF',
  }));

  // 4. Card 2: Responsive UI Lab
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Card 2 Container',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 420,
    y: 270,
    width: 355,
    height: 225,
    radius: 10,
    fillColor: '#1E293B',
    strokes: [{ strokeColor: '#3B82F6', strokeWidth: 1.5, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Card 2 Title',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 440,
    y: 290,
    width: 300,
    height: 26,
    text: '📐 Responsive UI Lab',
    fontSize: '17',
    fontWeight: '700',
    fillColor: '#F8FAFC',
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Card 2 Description',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 440,
    y: 324,
    width: 315,
    height: 36,
    text: 'Multi-viewport workbench testing layout invariants across mobile (320px), tablet (768px), and desktop (1024px+).',
    fontSize: '12',
    fillColor: '#94A3B8',
  }));
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Card 2 Chip',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 440,
    y: 375,
    width: 315,
    height: 24,
    radius: 4,
    fillColor: '#0F172A',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Card 2 Chip Text',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 450,
    y: 380,
    width: 295,
    height: 16,
    text: '✓ Multi-Viewport Grid & Flex Invariants',
    fontSize: '10',
    fontWeight: '600',
    fillColor: '#38BDF8',
  }));
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Card 2 Button',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 440,
    y: 415,
    width: 240,
    height: 36,
    radius: 6,
    fillColor: '#2563EB',
    strokes: [{ strokeColor: '#3B82F6', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Card 2 Button Text',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 455,
    y: 425,
    width: 210,
    height: 18,
    text: '➔ Open Responsive Lab',
    fontSize: '12',
    fontWeight: '600',
    fillColor: '#FFFFFF',
  }));

  // 5. Card 3: Least Action
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Card 3 Container',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 800,
    y: 270,
    width: 360,
    height: 225,
    radius: 10,
    fillColor: '#1E293B',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Card 3 Title',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 820,
    y: 290,
    width: 320,
    height: 26,
    text: '🧭 Least Action (ℒ)',
    fontSize: '17',
    fontWeight: '700',
    fillColor: '#F8FAFC',
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Card 3 Description',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 820,
    y: 324,
    width: 320,
    height: 36,
    text: 'Lagrangian mechanics path optimizer finding geodesics of user intent with minimal interaction energy.',
    fontSize: '12',
    fillColor: '#94A3B8',
  }));
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Card 3 Chip',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 820,
    y: 375,
    width: 320,
    height: 24,
    radius: 4,
    fillColor: '#0F172A',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Card 3 Chip Text',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 830,
    y: 380,
    width: 300,
    height: 16,
    text: 'δS = 0 Minimal Action Geodesic',
    fontSize: '10',
    fontWeight: '600',
    fillColor: '#10B981',
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Card 3 Status',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 820,
    y: 425,
    width: 320,
    height: 20,
    text: 'Current Action: 0.042 J • Invariant INV-CDO-14 Verified',
    fontSize: '11',
    fillColor: '#64748B',
  }));

  // 6. Card 4: MCard Studio
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Card 4 Container',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 40,
    y: 515,
    width: 540,
    height: 240,
    radius: 10,
    fillColor: '#1E293B',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Card 4 Title',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 60,
    y: 535,
    width: 480,
    height: 26,
    text: '🎨 MCard Studio & Fiber Inspector',
    fontSize: '17',
    fontWeight: '700',
    fillColor: '#F8FAFC',
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Card 4 Description',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 60,
    y: 568,
    width: 490,
    height: 36,
    text: 'Visual authoring node graph and fiber inspector with live hot-reloading and CPN Petri Net state verification.',
    fontSize: '12',
    fillColor: '#94A3B8',
  }));
  // Mini Metrics Box 1 & 2
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Card 4 Metric 1',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 60,
    y: 615,
    width: 230,
    height: 60,
    radius: 6,
    fillColor: '#0F172A',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Card 4 Metric 1 Label',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 75,
    y: 625,
    width: 200,
    height: 16,
    text: 'ACTIVE FIBERS',
    fontSize: '10',
    fontWeight: '700',
    fillColor: '#64748B',
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Card 4 Metric 1 Value',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 75,
    y: 645,
    width: 200,
    height: 22,
    text: '18 Sovereign Fibers',
    fontSize: '14',
    fontWeight: '700',
    fillColor: '#38BDF8',
  }));

  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Card 4 Metric 2',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 310,
    y: 615,
    width: 240,
    height: 60,
    radius: 6,
    fillColor: '#0F172A',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Card 4 Metric 2 Label',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 325,
    y: 625,
    width: 210,
    height: 16,
    text: 'LATTICE BASIS',
    fontSize: '10',
    fontWeight: '700',
    fillColor: '#64748B',
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Card 4 Metric 2 Value',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 325,
    y: 645,
    width: 210,
    height: 22,
    text: 'Lattice Height L0',
    fontSize: '14',
    fontWeight: '700',
    fillColor: '#10B981',
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Card 4 Status Text',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 60,
    y: 700,
    width: 480,
    height: 20,
    text: 'CPN Engine: Deterministic markings verified (INV-CDO-22)',
    fontSize: '11',
    fillColor: '#64748B',
  }));

  // 7. Card 5: Deployment Units
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Card 5 Container',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 605,
    y: 515,
    width: 555,
    height: 240,
    radius: 10,
    fillColor: '#1E293B',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Card 5 Title',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 625,
    y: 535,
    width: 500,
    height: 26,
    text: '📦 Sovereign Deployment Units',
    fontSize: '17',
    fontWeight: '700',
    fillColor: '#F8FAFC',
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Card 5 Description',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 625,
    y: 568,
    width: 510,
    height: 36,
    text: 'Sovereign boundaries with sealed witnesses at Evidence Level E2, Hoare triples, and zero-drift verification.',
    fontSize: '12',
    fillColor: '#94A3B8',
  }));
  // Mini Metrics Box 1 & 2
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Card 5 Metric 1',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 625,
    y: 615,
    width: 240,
    height: 60,
    radius: 6,
    fillColor: '#0F172A',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Card 5 Metric 1 Label',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 640,
    y: 625,
    width: 210,
    height: 16,
    text: 'EVIDENCE TIER',
    fontSize: '10',
    fontWeight: '700',
    fillColor: '#64748B',
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Card 5 Metric 1 Value',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 640,
    y: 645,
    width: 210,
    height: 22,
    text: 'Certified Level E2',
    fontSize: '14',
    fontWeight: '700',
    fillColor: '#A855F7',
  }));

  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Card 5 Metric 2',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 885,
    y: 615,
    width: 250,
    height: 60,
    radius: 6,
    fillColor: '#0F172A',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Card 5 Metric 2 Label',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 900,
    y: 625,
    width: 220,
    height: 16,
    text: 'HOARE TRIPLES',
    fontSize: '10',
    fontWeight: '700',
    fillColor: '#64748B',
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Card 5 Metric 2 Value',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 900,
    y: 645,
    width: 220,
    height: 22,
    text: '6 Triples, 0 Unwitnessed',
    fontSize: '14',
    fontWeight: '700',
    fillColor: '#10B981',
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Card 5 Status Text',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 625,
    y: 700,
    width: 500,
    height: 20,
    text: 'Witness Sealed: docs/sprints/_active/witness/cdo-15.witness.json',
    fontSize: '11',
    fillColor: '#64748B',
  }));

  return shapes;
}

export function buildAppHtmlShapes(r, xOffset, pageId) {
  const shapes = [];
  const p = (num) => `d7570000-0000-8000-8000-00000002${String(num).padStart(4, '0')}`;
  let seq = 1;

  // 1. Top Navbar
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Top Navigation Bar',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset,
    y: 100,
    width: 1200,
    height: 56,
    fillColor: '#1E293B',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));

  shapes.push(createTextShape({
    id: p(seq++),
    name: 'App Brand',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 24,
    y: 118,
    width: 280,
    height: 24,
    text: '⚡ MCard Manager • Mission Control',
    fontSize: '15',
    fontWeight: '700',
    fillColor: '#38BDF8',
  }));

  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Search Bar Container',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 320,
    y: 114,
    width: 280,
    height: 28,
    radius: 6,
    fillColor: '#0F172A',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Search Bar Text',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 335,
    y: 120,
    width: 250,
    height: 18,
    text: '🔍 Search cards, telemetry, fibers...',
    fontSize: '11',
    fillColor: '#64748B',
  }));

  // Return to Home Nav Button
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Nav Return Home Button',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 620,
    y: 114,
    width: 145,
    height: 28,
    radius: 6,
    fillColor: '#2563EB',
    strokes: [{ strokeColor: '#3B82F6', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Nav Return Home Text',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 635,
    y: 120,
    width: 120,
    height: 18,
    text: '🏠 Home Dashboard',
    fontSize: '11',
    fontWeight: '600',
    fillColor: '#FFFFFF',
  }));

  // Action Buttons
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Action Upload',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 780,
    y: 114,
    width: 80,
    height: 28,
    radius: 6,
    fillColor: '#0F172A',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Action Upload Text',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 795,
    y: 120,
    width: 60,
    height: 18,
    text: '⬆️ Upload',
    fontSize: '11',
    fillColor: '#94A3B8',
  }));

  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Action New Text',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 875,
    y: 114,
    width: 90,
    height: 28,
    radius: 6,
    fillColor: '#0F172A',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Action New Text Text',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 890,
    y: 120,
    width: 70,
    height: 18,
    text: '➕ New Text',
    fontSize: '11',
    fillColor: '#94A3B8',
  }));

  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Route Handle Chip',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 980,
    y: 114,
    width: 196,
    height: 28,
    radius: 6,
    fillColor: '#0F172A',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Route Handle Text',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 995,
    y: 120,
    width: 170,
    height: 18,
    text: r.handle,
    fontSize: '11',
    fillColor: '#64748B',
  }));

  // 2. Left Sidebar (Card Types)
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Sidebar Container',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 24,
    y: 175,
    width: 250,
    height: 595,
    radius: 8,
    fillColor: '#1E293B',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Sidebar Header',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 40,
    y: 195,
    width: 200,
    height: 20,
    text: 'CARD TYPES (12)',
    fontSize: '11',
    fontWeight: '700',
    fillColor: '#64748B',
  }));

  // Sidebar List Items
  const sidebarItems = [
    { name: '★ All MCards (12)', active: true },
    { name: '📅 Public Calendar', active: false },
    { name: '🗺️ Map View', active: false },
    { name: '🎭 3D Theater', active: false },
    { name: '🎵 Music Visualizer V5', active: false },
    { name: '📊 Observability Cockpit', active: false },
    { name: '🎲 Monopoly Game', active: false },
    { name: '♟️ Chess Game', active: false },
    { name: '⚪ Go Game', active: false },
  ];
  let sideY = 225;
  for (const item of sidebarItems) {
    if (item.active) {
      shapes.push(createRectShape({
        id: p(seq++),
        name: `Sidebar Item ${item.name} Bg`,
        parentId: r.frameId,
        frameId: r.frameId,
        pageId,
        x: xOffset + 36,
        y: sideY,
        width: 226,
        height: 32,
        radius: 6,
        fillColor: '#2563EB',
      }));
      shapes.push(createTextShape({
        id: p(seq++),
        name: `Sidebar Item ${item.name} Text`,
        parentId: r.frameId,
        frameId: r.frameId,
        pageId,
        x: xOffset + 48,
        y: sideY + 7,
        width: 200,
        height: 18,
        text: item.name,
        fontSize: '12',
        fontWeight: '600',
        fillColor: '#FFFFFF',
      }));
    } else {
      shapes.push(createTextShape({
        id: p(seq++),
        name: `Sidebar Item ${item.name} Text`,
        parentId: r.frameId,
        frameId: r.frameId,
        pageId,
        x: xOffset + 48,
        y: sideY + 7,
        width: 200,
        height: 18,
        text: item.name,
        fontSize: '12',
        fillColor: '#94A3B8',
      }));
    }
    sideY += 36;
  }

  // 3. Center Workspace Area
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Workspace Container',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 295,
    y: 175,
    width: 615,
    height: 595,
    radius: 8,
    fillColor: '#1E293B',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Workspace Title',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 315,
    y: 195,
    width: 300,
    height: 22,
    text: 'Active Card: Observability Cockpit',
    fontSize: '15',
    fontWeight: '700',
    fillColor: '#F8FAFC',
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Workspace Tabs',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 630,
    y: 195,
    width: 260,
    height: 20,
    text: '[ Preview ]  [ YAML ]  [ CPN ]  [ Telemetry ]',
    fontSize: '11',
    fillColor: '#38BDF8',
  }));

  // Inner Viewport Screen
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Inner Viewport Screen',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 315,
    y: 235,
    width: 575,
    height: 460,
    radius: 8,
    fillColor: '#0F172A',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Chart Title',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 335,
    y: 255,
    width: 400,
    height: 22,
    text: 'Real-time Grafana Faro Web SDK Telemetry',
    fontSize: '13',
    fontWeight: '700',
    fillColor: '#38BDF8',
  }));

  // 3 Web Vitals Meters
  const meters = [
    { label: 'LCP (Largest Contentful Paint)', val: '0.82s (Good)', x: xOffset + 335 },
    { label: 'FID (First Input Delay)', val: '12ms (Good)', x: xOffset + 520 },
    { label: 'CLS (Cumulative Layout Shift)', val: '0.002 (Good)', x: xOffset + 705 },
  ];
  for (const m of meters) {
    shapes.push(createRectShape({
      id: p(seq++),
      name: `Meter ${m.val} Box`,
      parentId: r.frameId,
      frameId: r.frameId,
      pageId,
      x: m.x,
      y: 285,
      width: 170,
      height: 52,
      radius: 6,
      fillColor: '#1E293B',
      strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
    }));
    shapes.push(createTextShape({
      id: p(seq++),
      name: `Meter ${m.val} Label`,
      parentId: r.frameId,
      frameId: r.frameId,
      pageId,
      x: m.x + 10,
      y: 292,
      width: 155,
      height: 14,
      text: m.label,
      fontSize: '9',
      fontWeight: '600',
      fillColor: '#64748B',
    }));
    shapes.push(createTextShape({
      id: p(seq++),
      name: `Meter ${m.val} Val`,
      parentId: r.frameId,
      frameId: r.frameId,
      pageId,
      x: m.x + 10,
      y: 312,
      width: 155,
      height: 18,
      text: m.val,
      fontSize: '13',
      fontWeight: '700',
      fillColor: '#10B981',
    }));
  }

  // Waveform graph representation
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Telemetry Waveform Box',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 335,
    y: 355,
    width: 535,
    height: 190,
    radius: 6,
    fillColor: '#1E293B',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Waveform Label',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 350,
    y: 370,
    width: 450,
    height: 16,
    text: 'Lagrangian Trajectory & Telemetry Invariant Trace (INV-CDO-17)',
    fontSize: '11',
    fontWeight: '600',
    fillColor: '#94A3B8',
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Log Line 1',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 350,
    y: 405,
    width: 500,
    height: 18,
    text: '🟢 [11:50:12] Faro Web SDK: Session initialized (CORS safe)',
    fontSize: '11',
    fillColor: '#10B981',
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Log Line 2',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 350,
    y: 435,
    width: 500,
    height: 18,
    text: '🟢 [11:50:13] Telemetry invariant INV-CDO-17 confirmed',
    fontSize: '11',
    fillColor: '#10B981',
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Log Line 3',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 350,
    y: 465,
    width: 500,
    height: 18,
    text: '🟢 [11:50:14] CPN transition fired: t_render_complete (60 FPS)',
    fontSize: '11',
    fillColor: '#10B981',
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Log Line 4',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 350,
    y: 495,
    width: 500,
    height: 18,
    text: '🟢 [11:50:15] Marking state: fiber_observed(1) • zero dropouts',
    fontSize: '11',
    fillColor: '#10B981',
  }));

  // Bottom Return Action Button
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Bottom Return Button',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 335,
    y: 565,
    width: 250,
    height: 38,
    radius: 6,
    fillColor: '#2563EB',
    strokes: [{ strokeColor: '#3B82F6', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Bottom Return Text',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 350,
    y: 575,
    width: 220,
    height: 18,
    text: '➔ Return to Home Dashboard',
    fontSize: '12',
    fontWeight: '600',
    fillColor: '#FFFFFF',
  }));

  // 4. Right Inspector Panel
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Inspector Container',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 930,
    y: 175,
    width: 246,
    height: 595,
    radius: 8,
    fillColor: '#1E293B',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Inspector Title',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 946,
    y: 195,
    width: 200,
    height: 20,
    text: 'MCARD DETAILS',
    fontSize: '11',
    fontWeight: '700',
    fillColor: '#64748B',
  }));

  const inspectorFields = [
    { label: 'Handle:', val: 'mcard:route:/app.html', color: '#38BDF8' },
    { label: 'Status:', val: '🟢 Online (Active)', color: '#10B981' },
    { label: 'Runtime:', val: 'Tri-Runtime Parity', color: '#F8FAFC' },
    { label: 'Fiber:', val: 'INV-CDO-19 Cockpit', color: '#F8FAFC' },
    { label: 'Witness:', val: 'Certified Level E2', color: '#A855F7' },
  ];
  let inspY = 230;
  for (const f of inspectorFields) {
    shapes.push(createTextShape({
      id: p(seq++),
      name: `Inspector ${f.label} Label`,
      parentId: r.frameId,
      frameId: r.frameId,
      pageId,
      x: xOffset + 946,
      y: inspY,
      width: 200,
      height: 16,
      text: f.label,
      fontSize: '10',
      fontWeight: '600',
      fillColor: '#64748B',
    }));
    shapes.push(createTextShape({
      id: p(seq++),
      name: `Inspector ${f.label} Val`,
      parentId: r.frameId,
      frameId: r.frameId,
      pageId,
      x: xOffset + 946,
      y: inspY + 18,
      width: 215,
      height: 18,
      text: f.val,
      fontSize: '12',
      fontWeight: '600',
      fillColor: f.color,
    }));
    inspY += 46;
  }

  return shapes;
}

export function buildResponsiveLabShapes(r, xOffset, pageId) {
  const shapes = [];
  const p = (num) => `d7570000-0000-8000-8000-00000003${String(num).padStart(4, '0')}`;
  let seq = 1;

  // 1. Top Navbar
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Top Navigation Bar',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset,
    y: 100,
    width: 1200,
    height: 56,
    fillColor: '#1E293B',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));

  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Lab Brand',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 24,
    y: 118,
    width: 400,
    height: 24,
    text: '📐 Responsive UI Lab • Viewport Workbench',
    fontSize: '15',
    fontWeight: '700',
    fillColor: '#38BDF8',
  }));

  // Return Home Button
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Nav Return Home Button',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 760,
    y: 114,
    width: 155,
    height: 28,
    radius: 6,
    fillColor: '#2563EB',
    strokes: [{ strokeColor: '#3B82F6', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Nav Return Home Text',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 775,
    y: 120,
    width: 130,
    height: 18,
    text: '🏠 Home Dashboard',
    fontSize: '11',
    fontWeight: '600',
    fillColor: '#FFFFFF',
  }));

  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Route Handle Chip',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 935,
    y: 114,
    width: 241,
    height: 28,
    radius: 6,
    fillColor: '#0F172A',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Route Handle Text',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 950,
    y: 120,
    width: 215,
    height: 18,
    text: r.handle,
    fontSize: '11',
    fillColor: '#64748B',
  }));

  // 2. Workbench Control Dock
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Workbench Dock Container',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 24,
    y: 175,
    width: 1152,
    height: 84,
    radius: 8,
    fillColor: '#1E293B',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));

  // Group 1: Arrangement
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Arrangement Label',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 40,
    y: 190,
    width: 200,
    height: 16,
    text: 'WORKBENCH ARRANGEMENT:',
    fontSize: '10',
    fontWeight: '700',
    fillColor: '#64748B',
  }));
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Btn Arrange Horizontal',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 40,
    y: 212,
    width: 115,
    height: 32,
    radius: 6,
    fillColor: '#2563EB',
    strokes: [{ strokeColor: '#3B82F6', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Text Arrange Horizontal',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 50,
    y: 220,
    width: 95,
    height: 16,
    text: '☲ Horizontal',
    fontSize: '11',
    fontWeight: '600',
    fillColor: '#FFFFFF',
  }));
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Btn Arrange Vertical',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 165,
    y: 212,
    width: 105,
    height: 32,
    radius: 6,
    fillColor: '#0F172A',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Text Arrange Vertical',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 175,
    y: 220,
    width: 85,
    height: 16,
    text: '☰ Vertical',
    fontSize: '11',
    fillColor: '#94A3B8',
  }));

  // Group 2: Orientation
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Orientation Label',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 300,
    y: 190,
    width: 150,
    height: 16,
    text: 'ORIENTATION:',
    fontSize: '10',
    fontWeight: '700',
    fillColor: '#64748B',
  }));
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Btn Orient Landscape',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 300,
    y: 212,
    width: 110,
    height: 32,
    radius: 6,
    fillColor: '#2563EB',
    strokes: [{ strokeColor: '#3B82F6', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Text Orient Landscape',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 310,
    y: 220,
    width: 90,
    height: 16,
    text: '↔ Landscape',
    fontSize: '11',
    fontWeight: '600',
    fillColor: '#FFFFFF',
  }));

  // Group 3: Device Presets
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Presets Label',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 450,
    y: 190,
    width: 200,
    height: 16,
    text: 'DEVICE PRESETS:',
    fontSize: '10',
    fontWeight: '700',
    fillColor: '#64748B',
  }));
  const presets = [
    { name: '📱 Mobile (390px)', active: false, w: 120 },
    { name: '📟 Tablet (768px)', active: false, w: 120 },
    { name: '🪟 Split (50%)', active: false, w: 100 },
    { name: '🖥️ Desktop (1024px)', active: true, w: 135 },
    { name: '🖥️ Wide (1440px)', active: false, w: 120 },
  ];
  let preX = xOffset + 450;
  for (const pr of presets) {
    shapes.push(createRectShape({
      id: p(seq++),
      name: `Preset ${pr.name} Bg`,
      parentId: r.frameId,
      frameId: r.frameId,
      pageId,
      x: preX,
      y: 212,
      width: pr.w,
      height: 32,
      radius: 6,
      fillColor: pr.active ? '#2563EB' : '#0F172A',
      strokes: [{ strokeColor: pr.active ? '#3B82F6' : '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
    }));
    shapes.push(createTextShape({
      id: p(seq++),
      name: `Preset ${pr.name} Text`,
      parentId: r.frameId,
      frameId: r.frameId,
      pageId,
      x: preX + 10,
      y: 220,
      width: pr.w - 20,
      height: 16,
      text: pr.name,
      fontSize: '10',
      fontWeight: pr.active ? '700' : '400',
      fillColor: pr.active ? '#FFFFFF' : '#94A3B8',
    }));
    preX += pr.w + 10;
  }

  // 3. Viewport Preview Frame (Device Chrome)
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Viewport Chrome Frame',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 24,
    y: 278,
    width: 1152,
    height: 490,
    radius: 8,
    fillColor: '#0F172A',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));

  // macOS Title bar
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Mac Title Bar',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 24,
    y: 278,
    width: 1152,
    height: 36,
    radius: 8,
    fillColor: '#1E293B',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Dot Red',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 40,
    y: 290,
    width: 12,
    height: 12,
    radius: 6,
    fillColor: '#EF4444',
  }));
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Dot Yellow',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 58,
    y: 290,
    width: 12,
    height: 12,
    radius: 6,
    fillColor: '#F59E0B',
  }));
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Dot Green',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 76,
    y: 290,
    width: 12,
    height: 12,
    radius: 6,
    fillColor: '#10B981',
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Mac Window Title',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 110,
    y: 288,
    width: 600,
    height: 18,
    text: 'Viewport Frame Preview • Desktop Preset (1024 × 768) • 1.0x DPR',
    fontSize: '12',
    fontWeight: '600',
    fillColor: '#E2E8F0',
  }));

  // Inner Mockup Preview Screen
  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Mockup Screen Canvas',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 44,
    y: 326,
    width: 1112,
    height: 384,
    radius: 6,
    fillColor: '#1E293B',
    strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));

  // Miniature LandingPage Card Grid inside Mockup Screen
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Mini Nav Title',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 64,
    y: 345,
    width: 400,
    height: 20,
    text: '⚡ GovTech OS • Preview Render (1024px Viewport)',
    fontSize: '13',
    fontWeight: '700',
    fillColor: '#38BDF8',
  }));

  const miniCards = [
    { title: '🎛️ Mission Control', desc: 'RUM Telemetry & Cockpit' },
    { title: '📐 Responsive Lab', desc: 'Viewport Invariants' },
    { title: '🧭 Least Action (ℒ)', desc: 'Lagrangian Geodesic' },
    { title: '🎨 MCard Studio', desc: '18 Active Fibers' },
    { title: '📦 Deployment Units', desc: 'Evidence Level E2' },
  ];
  let mcX = xOffset + 64;
  for (const mc of miniCards) {
    shapes.push(createRectShape({
      id: p(seq++),
      name: `Mini Card ${mc.title} Box`,
      parentId: r.frameId,
      frameId: r.frameId,
      pageId,
      x: mcX,
      y: 385,
      width: 200,
      height: 140,
      radius: 6,
      fillColor: '#0F172A',
      strokes: [{ strokeColor: '#334155', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
    }));
    shapes.push(createTextShape({
      id: p(seq++),
      name: `Mini Card ${mc.title} Title`,
      parentId: r.frameId,
      frameId: r.frameId,
      pageId,
      x: mcX + 15,
      y: 405,
      width: 170,
      height: 20,
      text: mc.title,
      fontSize: '12',
      fontWeight: '700',
      fillColor: '#F8FAFC',
    }));
    shapes.push(createTextShape({
      id: p(seq++),
      name: `Mini Card ${mc.title} Desc`,
      parentId: r.frameId,
      frameId: r.frameId,
      pageId,
      x: mcX + 15,
      y: 435,
      width: 170,
      height: 36,
      text: mc.desc,
      fontSize: '10',
      fillColor: '#94A3B8',
    }));
    shapes.push(createTextShape({
      id: p(seq++),
      name: `Mini Card ${mc.title} Invariant`,
      parentId: r.frameId,
      frameId: r.frameId,
      pageId,
      x: mcX + 15,
      y: 485,
      width: 170,
      height: 18,
      text: '✓ Invariant Verified',
      fontSize: '9',
      fontWeight: '600',
      fillColor: '#10B981',
    }));
    mcX += 215;
  }

  // Bottom Viewport Metrics Bar
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Viewport Metrics Text',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 64,
    y: 728,
    width: 600,
    height: 18,
    text: 'Active Resolution: 1024 × 768 px • Scale: 100% • Layout: Flex & CSS Grid Invariant Verified',
    fontSize: '11',
    fontWeight: '600',
    fillColor: '#38BDF8',
  }));

  shapes.push(createRectShape({
    id: p(seq++),
    name: 'Bottom Return Button',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 890,
    y: 720,
    width: 240,
    height: 34,
    radius: 6,
    fillColor: '#2563EB',
    strokes: [{ strokeColor: '#3B82F6', strokeWidth: 1, strokeOpacity: 1, strokeStyle: 'solid', strokeAlignment: 'inner' }],
  }));
  shapes.push(createTextShape({
    id: p(seq++),
    name: 'Bottom Return Text',
    parentId: r.frameId,
    frameId: r.frameId,
    pageId,
    x: xOffset + 905,
    y: 728,
    width: 210,
    height: 18,
    text: '➔ Return to Home Dashboard',
    fontSize: '11',
    fontWeight: '600',
    fillColor: '#FFFFFF',
  }));

  return shapes;
}
