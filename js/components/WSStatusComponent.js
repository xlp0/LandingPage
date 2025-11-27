import { CubicalComponent } from '../cubical-core.js';

export class WSStatusComponent extends CubicalComponent {
    constructor() {
        super('ws-status', 'fixed right-4 bottom-4 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-white/15 border border-white/30 backdrop-blur-md inline-flex items-center gap-1.5 text-white z-50');
    }

    mount() {
        this.element.setAttribute('aria-live', 'polite');
        this.element.innerHTML = `
            <span class="w-2 h-2 rounded-full bg-gray-400" id="ws-dot"></span>
            <span>WS: idle</span>
        `;
    }
}
