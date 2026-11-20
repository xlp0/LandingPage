import { createElement } from 'preact/compat';

function createIcon(displayName, nodes) {
  function LucideShimIcon({
    size = 24,
    color = 'currentColor',
    strokeWidth = 2,
    absoluteStrokeWidth = false,
    className,
    style,
    children,
    ...rest
  } = {}) {
    const numericSize = Number(size) || 24;
    const numericStroke = Number(strokeWidth) || 2;
    const computedStroke = absoluteStrokeWidth
      ? (numericStroke * 24) / numericSize
      : numericStroke;

    return createElement(
      'svg',
      {
        xmlns: 'http://www.w3.org/2000/svg',
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: color,
        strokeWidth: computedStroke,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        className,
        style,
        ...rest
      },
      ...nodes.map(([tag, attrs], index) => createElement(tag, { key: index, ...attrs })),
      children
    );
  }

  LucideShimIcon.displayName = displayName;
  return LucideShimIcon;
}

export const Archive = createIcon('Archive', [
  ['rect', { width: '20', height: '5', x: '2', y: '3', rx: '1' }],
  ['path', { d: 'M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8' }],
  ['path', { d: 'M10 12h4' }]
]);

export const ArrowRight = createIcon('ArrowRight', [
  ['path', { d: 'M5 12h14' }],
  ['path', { d: 'm12 5 7 7-7 7' }]
]);

export const ArrowUpRight = createIcon('ArrowUpRight', [
  ['path', { d: 'M7 7h10v10' }],
  ['path', { d: 'M7 17 17 7' }]
]);

export const Bell = createIcon('Bell', [
  ['path', { d: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9' }],
  ['path', { d: 'M10.3 21a1.94 1.94 0 0 0 3.4 0' }]
]);

export const Calendar = createIcon('Calendar', [
  ['path', { d: 'M8 2v4' }],
  ['path', { d: 'M16 2v4' }],
  ['rect', { width: '18', height: '18', x: '3', y: '4', rx: '2' }],
  ['path', { d: 'M3 10h18' }]
]);

export const Check = createIcon('Check', [
  ['path', { d: 'M20 6 9 17l-5-5' }]
]);

export const ChevronDown = createIcon('ChevronDown', [
  ['path', { d: 'm6 9 6 6 6-6' }]
]);

export const ChevronRight = createIcon('ChevronRight', [
  ['path', { d: 'm9 18 6-6-6-6' }]
]);

export const Clock = createIcon('Clock', [
  ['circle', { cx: '12', cy: '12', r: '10' }],
  ['polyline', { points: '12 6 12 12 16 14' }]
]);

export const CreditCard = createIcon('CreditCard', [
  ['rect', { width: '20', height: '14', x: '2', y: '5', rx: '2' }],
  ['line', { x1: '2', x2: '22', y1: '10', y2: '10' }]
]);

export const Ellipsis = createIcon('Ellipsis', [
  ['circle', { cx: '12', cy: '12', r: '1' }],
  ['circle', { cx: '19', cy: '12', r: '1' }],
  ['circle', { cx: '5', cy: '12', r: '1' }]
]);

export const File = createIcon('File', [
  ['path', { d: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z' }],
  ['path', { d: 'M14 2v4a2 2 0 0 0 2 2h4' }]
]);

export const Globe = createIcon('Globe', [
  ['circle', { cx: '12', cy: '12', r: '10' }],
  ['path', { d: 'M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20' }],
  ['path', { d: 'M2 12h20' }]
]);

export const GripVertical = createIcon('GripVertical', [
  ['circle', { cx: '9', cy: '12', r: '1' }],
  ['circle', { cx: '9', cy: '5', r: '1' }],
  ['circle', { cx: '9', cy: '19', r: '1' }],
  ['circle', { cx: '15', cy: '12', r: '1' }],
  ['circle', { cx: '15', cy: '5', r: '1' }],
  ['circle', { cx: '15', cy: '19', r: '1' }]
]);

export const Heart = createIcon('Heart', [
  ['path', { d: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z' }]
]);

export const House = createIcon('House', [
  ['path', { d: 'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8' }],
  ['path', { d: 'M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }]
]);

export const Lock = createIcon('Lock', [
  ['rect', { width: '18', height: '11', x: '3', y: '11', rx: '2', ry: '2' }],
  ['path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' }]
]);

export const Mail = createIcon('Mail', [
  ['rect', { width: '20', height: '16', x: '2', y: '4', rx: '2' }],
  ['path', { d: 'm22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7' }]
]);

export const Pause = createIcon('Pause', [
  ['rect', { x: '14', y: '4', width: '4', height: '16', rx: '1' }],
  ['rect', { x: '6', y: '4', width: '4', height: '16', rx: '1' }]
]);

export const Play = createIcon('Play', [
  ['polygon', { points: '6 3 20 12 6 21 6 3' }]
]);

export const Plus = createIcon('Plus', [
  ['path', { d: 'M5 12h14' }],
  ['path', { d: 'M12 5v14' }]
]);

export const ScanFace = createIcon('ScanFace', [
  ['path', { d: 'M3 7V5a2 2 0 0 1 2-2h2' }],
  ['path', { d: 'M17 3h2a2 2 0 0 1 2 2v2' }],
  ['path', { d: 'M21 17v2a2 2 0 0 1-2 2h-2' }],
  ['path', { d: 'M7 21H5a2 2 0 0 1-2-2v-2' }],
  ['path', { d: 'M8 14s1.5 2 4 2 4-2 4-2' }],
  ['path', { d: 'M9 9h.01' }],
  ['path', { d: 'M15 9h.01' }]
]);

export const Search = createIcon('Search', [
  ['circle', { cx: '11', cy: '11', r: '8' }],
  ['path', { d: 'm21 21-4.3-4.3' }]
]);

export const Send = createIcon('Send', [
  ['path', { d: 'm22 2-7 20-4-9-9-4Z' }],
  ['path', { d: 'M22 2 11 13' }]
]);

export const Settings = createIcon('Settings', [
  ['path', { d: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z' }],
  ['circle', { cx: '12', cy: '12', r: '3' }]
]);

export const Star = createIcon('Star', [
  ['path', { d: 'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z' }]
]);

export const Trash2 = createIcon('Trash2', [
  ['path', { d: 'M3 6h18' }],
  ['path', { d: 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6' }],
  ['path', { d: 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2' }],
  ['line', { x1: '10', x2: '10', y1: '11', y2: '17' }],
  ['line', { x1: '14', x2: '14', y1: '11', y2: '17' }]
]);

export const User = createIcon('User', [
  ['path', { d: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2' }],
  ['circle', { cx: '12', cy: '7', r: '4' }]
]);

export const Wifi = createIcon('Wifi', [
  ['path', { d: 'M12 20h.01' }],
  ['path', { d: 'M2 8.82a15 15 0 0 1 20 0' }],
  ['path', { d: 'M5 12.859a10 10 0 0 1 14 0' }],
  ['path', { d: 'M8.5 16.429a5 5 0 0 1 7 0' }]
]);

export const X = createIcon('X', [
  ['path', { d: 'M18 6 6 18' }],
  ['path', { d: 'm6 6 12 12' }]
]);

export const Zap = createIcon('Zap', [
  ['path', { d: 'M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z' }]
]);
