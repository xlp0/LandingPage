# CLM: Welcome Component

## 🔷 Abstract Dimension (What?)

### 1.1 Core Concept
The **Welcome Component** acts as the **Prologue** of the Landing Page narrative. It sets the tone and welcomes the entity (user) into the digital space.

### 1.2 Purpose & Narrative Role
- **Greeting**: Acknowledges the user's arrival.
- **Atmosphere**: Uses styling (gold text, uppercase, wide tracking) to establish a sense of importance and premium quality ("PKC Gold").
- **Temporal Marker**: It appears first (top of the flow), marking the beginning of the visual journey.

## 🛠️ Concrete Dimension (How?)

### 2.1 Implementation Architecture
A stylistic `CubicalComponent` injected at the start of the stage.

```javascript
// js/components/WelcomeComponent.js
class WelcomeComponent extends CubicalComponent {
    mount() {
        this.element.innerHTML = `
            <h2 class="... text-pkc-gold ...">
                Welcome to PKC Landing Page
            </h2>
        `;
        
        // Entrance Animation
        anime({ ... opacity: [0, 1] ... });
    }
}
```

### 2.2 Visual Structure
- **Typography**: Distinct from the Hero content. Uses `text-pkc-gold` to signal value.
- **Animation**: Fades in, creating a "curtain raise" effect.

## ⚖️ Balanced Dimension (Why?)

### 3.1 Governance & Consistency
- **Separation of Concerns**: By keeping the greeting separate from the Hero functionality, we maintain a clean "Focus" for the Hero component (actions) vs. the Welcome component (emotion/atmosphere).

### 3.2 Observability & Feedback
- **User Acknowledgement**: The animation triggers only after the page load, confirming to the user that the render cycle has completed successfully.

### 3.3 Justification
Why this component? To add **Humanity**. A system should be polite. It bridges the gap between the cold logic of the P2P mesh and the human user entering the space.
