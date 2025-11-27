import { CubicalComponent } from '../cubical-core.js';

export class P2PStatusComponent extends CubicalComponent {
    constructor() {
        super('p2p-panel', 'fixed left-4 bottom-4 w-72 max-h-[40vh] flex flex-col bg-black/25 border border-white/25 rounded-xl text-white backdrop-blur-md overflow-hidden z-50');
    }

    mount() {
        this.element.setAttribute('aria-live', 'polite');
        this.element.innerHTML = `
            <div class="px-3 py-2 border-b border-white/15 font-semibold flex justify-between items-center gap-2">
                <span>P2P</span>
                <div class="flex gap-2 text-xs">
                    <span>Clients: <span id="client-count">0</span></span>
                    <span>Peers: <span id="peer-count">0</span></span>
                </div>
            </div>
            <div class="px-3 py-2 overflow-auto text-sm">
                <div id="p2p-status" class="opacity-90">idle</div>
                <div id="p2p-messages" class="mt-2 max-h-52 overflow-y-auto whitespace-pre-wrap break-words break-all font-mono text-xs leading-snug space-y-1"></div>
            </div>
        `;
    }
}
