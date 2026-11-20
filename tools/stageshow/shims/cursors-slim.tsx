export function MacPointer() {
  return (
    <svg height="24" width="24" viewBox="0 0 32 32" fill="none">
      <g transform="translate(10 7)">
        <path d="m6.148 18.473 1.863-1.003 1.615-.839-2.568-4.816h4.332l-11.379-11.408v16.015l3.316-3.221z" fill="#fff" />
        <path d="m6.431 17 1.765-.941-2.775-5.202h3.604l-8.025-8.043v11.188l2.53-2.442z" fill="#000" />
      </g>
    </svg>
  );
}

export function MacPointingHand() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
      <path
        d="M10.6 6a1.7 1.7 0 0 1 3.4 0v6.6a1.3 1.3 0 0 1 2.6 0v.7a1.3 1.3 0 0 1 2.6 0v.7a1.3 1.3 0 0 1 2.6 0V19c0 3.1-2 5.6-5 5.6h-2.6c-2 0-3.3-.9-4.4-2.4l-3.1-4.1c-.6-.9-.4-2 .5-2.5.8-.4 1.7-.2 2.3.5l1.1 1.4V6Z"
        fill="#fff"
        stroke="#000"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path d="M14 12.6v3.6M16.6 13.3v3M19.2 14v2.6" stroke="#000" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export const MacIbeam = MacPointer;
export const MacCrosshair = MacPointer;
export const MacOpenHand = MacPointer;
export const MacGrab = MacPointer;
export const MacWait = MacPointer;
export const MacResizeNS = MacPointer;
export const MacResizeEW = MacPointer;
export const MacResizeNWSE = MacPointer;
export const MacResizeNESW = MacPointer;
