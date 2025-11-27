import { CubicalComponent } from '../cubical-core.js';

export class BasicTextComponent extends CubicalComponent {
    constructor(id, text = '', className = 'text-center text-white/80 text-sm font-mono p-4') {
        super(id, className);
        this.state = { text };
    }

    mount() {
        this.update();
    }

    update() {
        this.element.textContent = this.state.text;
    }
}
