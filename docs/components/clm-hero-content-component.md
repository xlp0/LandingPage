# CLM: Hero Content Component

## 🔷 Abstract Dimension (What?)

### 1.1 Core Concept
The **Hero Content Component** is the **Primary Interaction Component**. It adheres strictly to the principle of "compress the vocabulary." Its goal is to present the user with the *essential choices* required to navigate the P2P ecosystem without distraction.

### 1.2 Purpose & Narrative Role
- **Focus**: Eliminates noise. The user is presented with a clear title, subtitle, and a curated set of "one button" entry points (links).
- **Narrative Anchor**: It declares the identity of the space ("PKC Landing Page") and its philosophy ("Static-first. Modular by design.").
- **Environment Reflection**: It dynamically reflects the environment state (Env Title) to show that the system is alive and context-aware.

## 🛠️ Concrete Dimension (How?)

### 2.1 Implementation Architecture
A pure `CubicalComponent` that acts as the main stage actor.

```javascript
// js/components/HeroContentComponent.js
class HeroContentComponent extends CubicalComponent {
    mount() {
        // The "One Button" philosophy extended to a menu of distinct choices
        this.element.innerHTML = `
            <h1 ...>PKC Landing Page</h1>
            <div ... data-anime="buttons">
                <a href="...">Browse Documentation</a>
                ...
            </div>
        `;
        
        // Narrative Animation (The Playwright's Touch)
        this.initAnimations();
        
        // Environment Sensing (Observability)
        this.startEnvWatcher();
    }
}
```

### 2.2 Environment Sensing
- The component polls `/api/env` to update its title text. This is a "Sidecar" behavior embedded within the hero, constantly checking the reality of the server environment.

### 2.3 Visual Structure
- **Position**: Center Stage.
- **Motion**: Uses `anime.js` for a staggered entrance, enforcing a temporal sequence (Title -> Subtitle -> Actions) that guides the user's eye.

## ⚖️ Balanced Dimension (Why?)

### 3.1 Governance & Consistency
- **Minimalism**: Only functional links are present. No decorative fluff that doesn't serve the P2P goal.
- **Modularity**: The links point to separate modules (Tic-Tac-Toe, P2P Demo), reinforcing the "Cubical" architecture where the landing page is just a hub for other cubes.

### 3.2 Observability & Feedback
- **Hover Feedback**: Buttons scale on hover (`anime.js`), providing tactile confirmation of the user's intent.
- **Env Feedback**: Changes in the backend environment (`PKC_Title_Text`) are reflected in real-time, proving the connection between the Static Frontend and the Dynamic Backend.

### 3.3 Justification
Why this component? To provide a clear **Goal**. Without it, the Context (Auth) has no direction. It translates the user's presence into **Action**.
