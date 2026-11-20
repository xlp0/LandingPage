/**
 * Uniform 14px / 16px single-stroke inline SVG icon registry (SPRINT-SSG-05).
 * Pure ESM with zero external dependencies so Astro SSR, vanilla harnesses,
 * runtime scripts, and Preact islands share one icon source.
 */

export const ICON_PATHS = Object.freeze({
  'arrow-left': [
    ['line', { x1: 19, y1: 12, x2: 5, y2: 12 }],
    ['polyline', { points: '12 19 5 12 12 5' }]
  ],
  ruler: [
    ['path', { d: 'M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z' }],
    ['path', { d: 'm14.5 12.5 2-2' }],
    ['path', { d: 'm11.5 9.5 2-2' }],
    ['path', { d: 'm8.5 6.5 2-2' }],
    ['path', { d: 'm17.5 15.5 2-2' }]
  ],
  columns: [
    ['rect', { width: 18, height: 18, x: 3, y: 3, rx: 2 }],
    ['path', { d: 'M12 3v18' }]
  ],
  rows: [
    ['rect', { width: 18, height: 18, x: 3, y: 3, rx: 2 }],
    ['path', { d: 'M3 12h18' }]
  ],
  sliders: [
    ['line', { x1: 4, x2: 4, y1: 21, y2: 14 }],
    ['line', { x1: 4, x2: 4, y1: 10, y2: 3 }],
    ['line', { x1: 12, x2: 12, y1: 21, y2: 12 }],
    ['line', { x1: 12, x2: 12, y1: 8, y2: 3 }],
    ['line', { x1: 20, x2: 20, y1: 21, y2: 16 }],
    ['line', { x1: 20, x2: 20, y1: 12, y2: 3 }],
    ['line', { x1: 2, x2: 6, y1: 14, y2: 14 }],
    ['line', { x1: 10, x2: 14, y1: 8, y2: 8 }],
    ['line', { x1: 18, x2: 22, y1: 16, y2: 16 }]
  ],
  'external-link': [
    ['path', { d: 'M15 3h6v6' }],
    ['path', { d: 'M10 14 21 3' }],
    ['path', { d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' }]
  ],
  'rotate-cw': [
    ['path', { d: 'M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8' }],
    ['path', { d: 'M21 3v5h-5' }]
  ],
  settings: [
    ['path', { d: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z' }],
    ['circle', { cx: 12, cy: 12, r: 3 }]
  ],
  x: [
    ['path', { d: 'M18 6 6 18' }],
    ['path', { d: 'm6 6 12 12' }]
  ],
  'rotate-ccw': [
    ['path', { d: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' }],
    ['path', { d: 'M3 3v5h5' }]
  ],
  globe: [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['path', { d: 'M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20' }],
    ['path', { d: 'M2 12h20' }]
  ],
  link: [
    ['path', { d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' }],
    ['path', { d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' }]
  ],
  play: [
    ['polygon', { points: '6 3 20 12 6 21 6 3' }]
  ],
  pause: [
    ['rect', { x: 14, y: 4, width: 4, height: 16, rx: 1 }],
    ['rect', { x: 6, y: 4, width: 4, height: 16, rx: 1 }]
  ],
  square: [
    ['rect', { width: 14, height: 14, x: 5, y: 5, rx: 2 }]
  ],
  'circle-dot': [
    ['circle', { cx: 12, cy: 12, r: 9 }],
    ['circle', { cx: 12, cy: 12, r: 2.5 }]
  ],
  'alert-triangle': [
    ['path', { d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z' }],
    ['path', { d: 'M12 9v4' }],
    ['path', { d: 'M12 17h.01' }]
  ],
  save: [
    ['path', { d: 'M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z' }],
    ['path', { d: 'M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7' }],
    ['path', { d: 'M7 3v4a1 1 0 0 0 1 1h7' }]
  ],
  copy: [
    ['rect', { width: 14, height: 14, x: 8, y: 8, rx: 2, ry: 2 }],
    ['path', { d: 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' }]
  ],
  check: [
    ['path', { d: 'M20 6 9 17l-5-5' }]
  ],
  download: [
    ['path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }],
    ['polyline', { points: '7 10 12 15 17 10' }],
    ['line', { x1: 12, x2: 12, y1: 15, y2: 3 }]
  ],
  trash: [
    ['path', { d: 'M3 6h18' }],
    ['path', { d: 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6' }],
    ['path', { d: 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2' }]
  ],
  lock: [
    ['rect', { width: 18, height: 11, x: 3, y: 11, rx: 2, ry: 2 }],
    ['path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' }]
  ],
  maximize: [
    ['path', { d: 'M8 3H5a2 2 0 0 0-2 2v3' }],
    ['path', { d: 'M21 8V5a2 2 0 0 0-2-2h-3' }],
    ['path', { d: 'M3 16v3a2 2 0 0 0 2 2h3' }],
    ['path', { d: 'M16 21h3a2 2 0 0 0 2-2v-3' }]
  ],
  smartphone: [
    ['rect', { width: 14, height: 20, x: 5, y: 2, rx: 2, ry: 2 }],
    ['path', { d: 'M12 18h.01' }]
  ],
  monitor: [
    ['rect', { width: 20, height: 14, x: 2, y: 3, rx: 2 }],
    ['line', { x1: 8, x2: 16, y1: 21, y2: 21 }],
    ['line', { x1: 12, x2: 12, y1: 17, y2: 21 }]
  ],
  sun: [
    ['circle', { cx: 12, cy: 12, r: 4 }],
    ['path', { d: 'M12 2v2' }],
    ['path', { d: 'M12 20v2' }],
    ['path', { d: 'm4.93 4.93 1.41 1.41' }],
    ['path', { d: 'm17.66 17.66 1.41 1.41' }],
    ['path', { d: 'M2 12h2' }],
    ['path', { d: 'M20 12h2' }],
    ['path', { d: 'm6.34 17.66-1.41 1.41' }],
    ['path', { d: 'm19.07 4.93-1.41 1.41' }]
  ],
  moon: [
    ['path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }]
  ],
  eye: [
    ['path', { d: 'M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0' }],
    ['circle', { cx: 12, cy: 12, r: 3 }]
  ],
  zap: [
    ['path', { d: 'M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z' }]
  ],
  battery: [
    ['path', { d: 'M4 7h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2ZM22 11v2M6 12h4' }]
  ],
  compass: [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['polygon', { points: '16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76' }]
  ],
  layers: [
    ['path', { d: 'm12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z' }],
    ['path', { d: 'm22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65' }],
    ['path', { d: 'm22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65' }]
  ],
  'check-circle': [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['path', { d: 'm9 12 2 2 4-4' }]
  ],
  'x-circle': [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['path', { d: 'm15 9-6 6' }],
    ['path', { d: 'm9 9 6 6' }]
  ],
  'minus-circle': [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['path', { d: 'M8 12h8' }]
  ],
  activity: [
    ['path', { d: 'M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2' }]
  ],
  'shield-check': [
    ['path', { d: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z' }],
    ['path', { d: 'm9 12 2 2 4-4' }]
  ],
  terminal: [
    ['polyline', { points: '4 17 10 11 4 5' }],
    ['line', { x1: 12, x2: 20, y1: 19, y2: 19 }]
  ],
  'minimize-2': [
    ['polyline', { points: '4 14 10 14 10 20' }],
    ['polyline', { points: '20 10 14 10 14 4' }],
    ['line', { x1: 14, x2: 21, y1: 10, y2: 3 }],
    ['line', { x1: 3, x2: 10, y1: 21, y2: 14 }]
  ],
  'refresh-cw': [
    ['path', { d: 'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8' }],
    ['path', { d: 'M21 3v5h-5' }],
    ['path', { d: 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16' }],
    ['path', { d: 'M8 16H3v5' }]
  ]
});

function escapeAttr(val) {
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function resolveSize(size) {
  return Number(size) === 16 ? 16 : 14;
}

export function iconMarkup(name, { size = 14, className = '' } = {}) {
  const px = resolveSize(size);
  const shapes = ICON_PATHS[name] || ICON_PATHS['circle-dot'];
  const sizeClass = px === 16 ? 'lab-icon lab-icon--md' : 'lab-icon';
  const fullClass = className ? `${sizeClass} ${className}` : sizeClass;
  const children = shapes
    .map(([tag, attrs]) => {
      const attrText = Object.entries(attrs)
        .map(([k, v]) => `${k}="${escapeAttr(v)}"`)
        .join(' ');
      return `<${tag} ${attrText} />`;
    })
    .join('');

  return `<svg class="${escapeAttr(fullClass)}" width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-icon="${escapeAttr(name)}">${children}</svg>`;
}

export function createIconElement(name, { size = 14, className = '' } = {}) {
  if (typeof document === 'undefined') return null;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const px = resolveSize(size);
  const shapes = ICON_PATHS[name] || ICON_PATHS['circle-dot'];
  const sizeClass = px === 16 ? 'lab-icon lab-icon--md' : 'lab-icon';
  const fullClass = className ? `${sizeClass} ${className}` : sizeClass;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', fullClass);
  svg.setAttribute('width', String(px));
  svg.setAttribute('height', String(px));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('data-icon', name);

  for (const [tag, attrs] of shapes) {
    const child = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      child.setAttribute(k, String(v));
    }
    svg.appendChild(child);
  }
  return svg;
}

export function setIcon(el, name, opts = {}) {
  if (!el) return null;
  if (el.dataset) {
    el.dataset.icon = name;
  }
  const svg = createIconElement(name, opts);
  if (svg && typeof el.replaceChildren === 'function') {
    el.replaceChildren(svg);
  }
  return svg;
}
