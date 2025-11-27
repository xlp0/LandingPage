/**
 * Cubical Core
 * A minimal component system based on "Divs as Components"
 */

export class CubicalComponent {
    constructor(id, className = '') {
        this.id = id;
        this.className = className;
        this.element = null;
        this.state = {};
    }

    /**
     * Renders the component as a DIV
     * @returns {HTMLElement} The component's root DIV
     */
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

    /**
     * Logic to execute when the component is mounted (content injection)
     * Override this in subclasses
     */
    mount() {
        // Default implementation: do nothing
    }

    /**
     * Update the component's state and optionally re-render specific parts
     * @param {Object} newState 
     */
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.update();
    }

    /**
     * Update logic - override to update DOM based on state
     */
    update() {
        // Default implementation
    }
}

export class CubicalApp {
    constructor(rootId) {
        this.root = document.getElementById(rootId);
        if (!this.root) {
            throw new Error(`Root element #${rootId} not found`);
        }
        this.components = new Map();
    }

    /**
     * Add a component to the single container
     * @param {CubicalComponent} component 
     */
    addComponent(component) {
        this.components.set(component.id, component);
        this.root.appendChild(component.render());
    }

    /**
     * Clear the container
     */
    clear() {
        this.root.innerHTML = '';
        this.components.clear();
    }
}
