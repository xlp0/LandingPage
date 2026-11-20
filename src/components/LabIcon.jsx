import { h } from 'preact';
import { ICON_PATHS } from '../../js/ui/icons.js';

export default function LabIcon({ name, size = 14, className = '' }) {
  const px = Number(size) === 16 ? 16 : 14;
  const shapes = ICON_PATHS[name] || ICON_PATHS['circle-dot'];
  const sizeClass = px === 16 ? 'lab-icon lab-icon--md' : 'lab-icon';
  const fullClass = className ? `${sizeClass} ${className}` : sizeClass;

  return (
    <svg
      className={fullClass}
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      data-icon={name}
    >
      {shapes.map(([tag, attrs], idx) => h(tag, { key: `${name}-${idx}`, ...attrs }))}
    </svg>
  );
}
