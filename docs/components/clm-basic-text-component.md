# CLM: Basic Text Component

## 🔷 Abstract Dimension (What?)

### 1.1 Core Concept
The **Basic Text Component** represents the **Atomic Vocabulary** of the system. It is the raw material of communication—simple, unadorned text.

### 1.2 Purpose & Narrative Role
- **System Voice**: Used primarily for the **Loader** sequence ("System initializing...", "Constructing reality..."). It is the voice of the machine speaking directly to the user during state transitions.
- **Transient Communication**: Unlike the permanent Hero or Status components, this component is often ephemeral, appearing to convey a message and then vanishing.

## 🛠️ Concrete Dimension (How?)

### 2.1 Implementation Architecture
A generic, reusable `CubicalComponent` designed for dynamic content updates.

```javascript
// js/components/BasicTextComponent.js
class BasicTextComponent extends CubicalComponent {
    constructor(id, text, className) {
        super(id, className);
        this.state = { text };
    }

    update() {
        this.element.textContent = this.state.text;
    }
}
```

### 2.2 Interaction
- **State-Driven**: It reacts immediately to `setState({ text: ... })`.
- **Used By**: `AppEntry` uses this to narrate the boot sequence.

## ⚖️ Balanced Dimension (Why?)

### 3.1 Governance & Consistency
- **Purity**: It has no internal logic other than displaying what it is told. It is a pure "View" component.
- **Flexibility**: It can be repurposed for alerts, footers, or debug messages, adhering to the principle of "compressing the vocabulary" (don't make 10 text components when 1 will do).

### 3.2 Observability & Feedback
- **Boot Transparency**: By narrating the initialization steps ("Auth init", "Engine start"), it makes the hidden boot process *observable*. The user knows exactly what the system is doing at every step of the loading capability.

### 3.3 Justification
Why this component? To provide **Articulation**. The system needs a way to speak simple truths without the overhead of complex UI structures.
