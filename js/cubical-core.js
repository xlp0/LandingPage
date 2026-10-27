export class CubicalComponent {
    constructor(id, className = '') {
        this.id = id;
        this.className = className;
        this.element = null;
        this.state = {};
    }

    render() {
        if (!this.element) {
            this.element = document.createElement('div');
            this.element.id = this.id;
            if (this.className) {
                this.element.className = this.className;
            }
            this.mount();
        }
        return this.element;
    }

    mount() {}

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.update();
    }

    update() {}
}

export class CubicalApp {
    constructor(rootId) {
        this.root = document.getElementById(rootId);
        if (!this.root) {
            throw new Error(`Root element #${rootId} not found`);
        }
        this.components = new Map();
    }

    addComponent(component) {
        const key = component.id ?? component.hash;
        this.components.set(key, component);
        this.root.appendChild(component.render());
    }

    clear() {
        for (const component of this.components.values()) {
            if (typeof component?.destroy === 'function') {
                component.destroy();
            }
        }
        this.root.innerHTML = '';
        this.components.clear();
    }
}
