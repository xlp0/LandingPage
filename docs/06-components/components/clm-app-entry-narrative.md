# CLM: App Entry (The Playwright)

## 🔷 Abstract Dimension (What?)

### 1.1 Core Concept
**App Entry** (`js/app-entry.js`) is **The Narrative Component**. It is the "Playwright Script" described in the Cubical HTML philosophy.

### 1.2 Purpose & Narrative Role
- **Orchestration**: It dictates the flow of time and logic. It decides *what* appears and *when*.
- **Meta-Narrative**: It enforces the "prologue of spacetime." It ensures that Context (Auth) is established before Reality (Stage) is constructed, and Logic (Engine) is booted in parallel.
- **Director**: It initializes the `CubicalApp` (the stage) and directs the actors (Components).

## 🛠️ Concrete Dimension (How?)

### 2.1 Implementation Architecture
A linear, async script that manages the lifecycle of the application.

```javascript
// js/app-entry.js
class AppEntry {
    async init() {
        // 1. Narrate the beginning
        this.loader.setState({ text: 'Establishing identity context...' });
        
        // 2. Establish Context
        await this.authManager.init();
        
        // 3. Construct Reality (The Stage)
        this.setupStage();
        
        // 4. Boot Logic (The Engine)
        await this.startEngine();
    }
}
```

### 2.2 Flow Control
1.  **Loader**: Immediate feedback.
2.  **Auth**: Security boundary check.
3.  **Stage**: Visual construction (Welcome, Hero, Status).
4.  **Engine**: PKC logic injection (P2P, Networking).

## ⚖️ Balanced Dimension (Why?)

### 3.1 Governance & Consistency
- **Control**: By centralizing the flow in one file, we avoid "spaghetti code" where components load randomly. The sequence is deterministic and tested.
- **Cubical Logic**: It connects the **Abstract** (Logic/Auth) with the **Concrete** (DOM Components) to create a **Balanced** experience (The App).

### 3.2 Observability & Feedback
- **Narrated Boot**: It explicitly uses the `BasicTextComponent` to tell the user what is happening.
- **Error Handling**: It catches engine failures and displays them, ensuring that even catastrophe is observable.

### 3.3 Justification
Why this component? Because a play needs a **Script**. Without it, the components are just static props. The App Entry brings them to life in a meaningful order.
