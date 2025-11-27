# CLM: Auth Status Component

## 🔷 Abstract Dimension (What?)

### 1.1 Core Concept
The **Auth Status Component** serves as the **Context and Goal** module of the Landing Page. It is responsible for establishing the user's identity boundary within the "prologue of spacetime meta-narrative." By defining *who* is present (User Identity) and *when* they are present (Session Context), it collapses the infinite possibilities of the landing page into a personalized, secure session.

### 1.2 Purpose & Narrative Role
- **Context Establishment**: Upon login, the page gains a time context (IP, session token). This component manages that boundary.
- **Goal Guidance**: By revealing the user's state (Anonymous vs. Authenticated), it subtly guides the user towards the primary goal: establishing identity to participate in the P2P mesh.
- **Vocabulary Compression**: Reduces the complex OAuth dance to a single, binary state indicator: "Login" or "Logout".

## 🛠️ Concrete Dimension (How?)

### 2.1 Implementation Architecture
The component follows the **Div as Module** pattern. It is a self-contained `CubicalComponent` that manages its own DOM lifecycle and reacts to global state changes via the `AuthManager`.

```javascript
// js/components/AuthStatusComponent.js
class AuthStatusComponent extends CubicalComponent {
    mount() {
        // Single "Div Module" structure
        this.element.innerHTML = `...`;
        
        // Binds to the global narrative script (window.app)
        btn.addEventListener('click', () => window.app.login());
    }
    
    updateUser(user) {
        // Reacts to state changes (Observability Loop)
    }
}
```

### 2.2 Interaction Model
- **Input**: Click events on the primary button.
- **Process**: Triggers `AuthManager` (Redux/OAuth logic).
- **Output**: Updates the DOM to reflect `isAuthenticated` state (Visual Feedback).

### 2.3 Visual Structure
- **Position**: Fixed Top-Right (High Visibility, Contextual Anchor).
- **Appearance**: Glassmorphism (`backdrop-blur`), minimal text, distinct action button.

## ⚖️ Balanced Dimension (Why?)

### 3.1 Governance & Consistency
- **Single Source of Truth**: Relies entirely on the Redux `AuthSlice` for state, ensuring no internal state drift.
- **Cubical Logic**: The component balances the **Abstract** need for security with the **Concrete** need for one-click access.

### 3.2 Observability & Feedback
- **Feedback Loop**: Immediate visual update upon authentication state change.
- **Self-Reflection**: The component acts as a mirror; when a user logs in, they see *themselves* (their name/email), confirming their presence in the system.
- **Metric Potential**: Login events are trackable "activities" that purchase the user's freedom in the system by accounting for their presence.

### 3.3 Justification
Why this component? Because without **Context**, the **Narrative** cannot begin. It is the gatekeeper of the Cubical Experience.
